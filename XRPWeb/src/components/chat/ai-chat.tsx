import { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatStatus } from '@/utils/types';
import { GeminiClient } from '@/utils/gemini-client';
import { GeminiContextLoader, createContextLoader } from '@/utils/gemini-context-loader';
import ChatMessageComponent from './chat-message';
import { IoSend, IoSparkles, IoDocument, IoStop } from 'react-icons/io5';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

export default function AIChat() {
    const { t, i18n } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<ChatStatus>(ChatStatus.IDLE);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const [contextStatus, setContextStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    const [textQueue, setTextQueue] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>('');
    const [showHeader, setShowHeader] = useState<boolean>(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const geminiClient = useRef<GeminiClient | null>(null);
    const contextLoader = useRef<GeminiContextLoader | null>(null);
    const abortController = useRef<AbortController | null>(null);

    // Initialize client, context loader, and session on component mount
    useEffect(() => {
        geminiClient.current = new GeminiClient();
        contextLoader.current = createContextLoader();

        // Generate a unique session ID for this chat session
        const newSessionId = uuidv4();
        setSessionId(newSessionId);

        // Ensure documentation is loaded via backend when chat opens
        const initDocs = async () => {
            if (!geminiClient.current || !newSessionId) return;
            
            try {
                setContextStatus('loading');
                
                // STEP 1: Perform the handshake first!
                await geminiClient.current.performHandshake();
                
                // STEP 2: Now that we have the cookie and token, check docs
                const status = await geminiClient.current.getDocsStatus(newSessionId);
                if (!status.loaded) {
                    const res = await geminiClient.current.loadDocs(newSessionId);
                    setContextStatus(res.success ? 'loaded' : 'error');
                } else {
                    setContextStatus('loaded');
                }
            } catch (err) {
                console.error("Handshake/Init failed", err);
                setContextStatus('error');
            }
        };
        initDocs();

        // Cleanup function when component unmounts (user closes chat or leaves IDE)
        return () => {
            if (geminiClient.current && newSessionId) {
                geminiClient.current.cleanupSession(newSessionId);
            }
        };
    }, []);

    // Cleanup session when user closes browser tab or navigates away
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (sessionId) {
                // Use sendBeacon for more reliable cleanup on page unload (uses POST)
                const url = `/api/session/${sessionId}`;
                navigator.sendBeacon(url);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [sessionId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingMessage]);

    // Smooth text animation effect
    useEffect(() => {
        if (!textQueue || !streamingMessage) return;
        
        let currentLength = streamingMessage.content.length;
        
        const timer = setInterval(() => {
            if (currentLength >= textQueue.length) {
                // Animation complete - finalize message
                if (status === ChatStatus.IDLE) {
                    setMessages(msgs => [...msgs, { ...streamingMessage, content: textQueue }]);
                    setStreamingMessage(null);
                    setTextQueue('');
                }
                return;
            }
            
            currentLength = Math.min(currentLength + 2, textQueue.length); // 2 chars per frame
            const newText = textQueue.slice(0, currentLength);
            setStreamingMessage(msg => msg ? { ...msg, content: newText } : null);
        }, 3);  // 3ms = ~300 chars/sec (delay to roll out response)
        
        return () => clearInterval(timer);
    }, [textQueue, streamingMessage, status]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const sendMessage = async () => {
        if (!inputValue.trim() || status === ChatStatus.LOADING || status === ChatStatus.STREAMING || !geminiClient.current) {
            return;
        }

        // If this is the first message, hide the header
        if (messages.length === 0) {
            setShowHeader(false);
        }

        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setStatus(ChatStatus.STREAMING);
        setTextQueue('');

        // Create abort controller for this request
        abortController.current = new AbortController();

        // Get model name asynchronously since it now comes from backend
        const modelName = await geminiClient.current.getModelName();
        
        // Create initial assistant message for streaming
        const assistantMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            model: modelName,
        };

        setStreamingMessage(assistantMessage);

        try {
            // Get current editor and terminal contexts (documentation now loaded via backend)
            const editorContext = contextLoader.current?.getCurrentEditorContext() || '';
            const terminalContext = contextLoader.current?.getCurrentTerminalContext() || '';
            
            // Use the new simplified chat API - all teaching guidelines are now in backend
            const currentLanguage = i18n.language || 'en';
            await geminiClient.current.chatWithContext(
                sessionId,
                userMessage.content,
                messages, // Conversation history
                editorContext,
                terminalContext,
                currentLanguage, // User's selected language
                (content: string) => {
                    // Check if generation was aborted
                    if (abortController.current?.signal.aborted) {
                        return;
                    }
                    setTextQueue(content);
                },
                abortController.current.signal
            );

            // Only complete if not aborted
            if (!abortController.current?.signal.aborted) {
                setStatus(ChatStatus.IDLE);
                abortController.current = null;
                // Let animation handle message finalization
            }
        } catch (error) {
            // Handle abort gracefully
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Generation was stopped by user'); // Keep this for user feedback on abort
                return;
            }

            console.error('Error sending message:', error);
            
            const errorMessage: ChatMessage = {
                id: uuidv4(),
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
                timestamp: new Date(),
                model: modelName || 'XRPCode Buddy',
            };

            setMessages(prev => [...prev, errorMessage]);
            setStreamingMessage(null);
            setStatus(ChatStatus.ERROR);
            abortController.current = null;
            
            // Reset to idle after 3 seconds
            setTimeout(() => setStatus(ChatStatus.IDLE), 3000);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };



    const stopGeneration = () => {
        if (abortController.current) {
            abortController.current.abort();
        }
        
        // Complete the current streaming message if it exists
        if (streamingMessage) {
            const finalMessage: ChatMessage = {
                ...streamingMessage,
                content: streamingMessage.content + '\n\n*[Response stopped by user]*'
            };
            setMessages(prev => [...prev, finalMessage]);
        }
        
        setStreamingMessage(null);
        setStatus(ChatStatus.IDLE);
        abortController.current = null;
    };



    return (
        <div className="flex flex-col h-full bg-white dark:bg-mountain-mist-950">
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b border-mountain-mist-200 dark:border-mountain-mist-700 transition-opacity duration-500 ease-in-out ${showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}>
                <div className="flex items-center gap-3">
                    {/* Model Display */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-mountain-mist-900 border border-mountain-mist-300 dark:border-mountain-mist-600">
                        <IoSparkles size={16} className="text-curious-blue-600" />
                        <div className="flex flex-col items-start min-w-0">
                            <span className="text-sm font-medium text-mountain-mist-700 dark:text-mountain-mist-300">{t('aiChat.buddyName')}</span>
                            <span className="text-xs text-mountain-mist-500 dark:text-mountain-mist-400">
                                {t('aiChat.poweredBy')}
                            </span>
                        </div>
                    </div>
                    
                    {/* Context Status Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-mountain-mist-100 dark:bg-mountain-mist-800 text-sm">
                        <IoDocument size={14} className={
                            contextStatus === 'loaded' ? 'text-green-600' :
                            contextStatus === 'loading' ? 'text-yellow-600' :
                            contextStatus === 'error' ? 'text-red-600' :
                            'text-mountain-mist-400'
                        } />
                        <span className="text-mountain-mist-600 dark:text-mountain-mist-300">
                            {contextStatus === 'loaded' ? t('aiChat.docsLoaded') :
                            contextStatus === 'loading' ? t('aiChat.loadingDocs') :
                            contextStatus === 'error' ? t('aiChat.failedToLoadDocs') :
                            t('aiChat.noContext')}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingMessage && (
                    <div className="flex items-center justify-center h-full text-center">
                        <div className="max-w-md">
                            <IoSparkles size={48} className="mx-auto text-mountain-mist-400 mb-4" />
                            <h3 className="text-lg font-semibold text-mountain-mist-700 dark:text-mountain-mist-300 mb-2">
                                {t('aiChat.startConversation')}
                            </h3>
                            <p className="text-mountain-mist-500 dark:text-mountain-mist-400">
                                {t('aiChat.startConversationHelper')}
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <ChatMessageComponent key={message.id} message={message} />
                ))}

                {streamingMessage && (
                    <ChatMessageComponent 
                        message={streamingMessage} 
                    />
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-mountain-mist-200 dark:border-mountain-mist-700 p-4">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={t('aiChat.placeholder')}
                            disabled={status === ChatStatus.STREAMING}
                            className="w-full px-4 py-3 border border-mountain-mist-300 dark:border-mountain-mist-600 rounded-xl bg-white dark:bg-mountain-mist-900 text-mountain-mist-900 dark:text-mountain-mist-100 placeholder-mountain-mist-500 dark:placeholder-mountain-mist-400 focus:ring-2 focus:ring-curious-blue-500 focus:border-curious-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none min-h-[52px] max-h-32"
                            rows={1}
                        />
                    </div>
                    
                    <button
                        onClick={status === ChatStatus.STREAMING ? stopGeneration : sendMessage}
                        disabled={status === ChatStatus.STREAMING ? false : !inputValue.trim()}
                        className="p-3 bg-curious-blue-600 hover:bg-curious-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
                        title={status === ChatStatus.STREAMING ? t('aiChat.stopGeneration') : t('aiChat.sendMessage')}
                    >
                        {status === ChatStatus.STREAMING ? (
                            <IoStop size={16} />
                        ) : (
                            <IoSend size={16} />
                        )}
                    </button>
                </div>

                {status === ChatStatus.STREAMING && (
                    <div className="mt-2 text-xs text-mountain-mist-500 dark:text-mountain-mist-400 text-center">
                        {t('aiChat.buddyTyping')}
                    </div>
                )}
            </div>
        </div>
    );
}
