import { ChatMessage } from './types';

/**
 * Simplified Gemini client for XRP Code Buddy
 * All AI configuration and teaching guidelines are now handled by the backend
 */
export class GeminiClient {
    private backendUrl: string;
    private handshakeToken: string | null = null; // Store the token here

    constructor() {
        this.backendUrl = import.meta.env.GOOGLE_CHATAPI_PROXY_TARGET + '/api';
    }

    // NEW METHOD: Must be called before anything else
    async performHandshake(): Promise<string> {
        try {
            const response = await fetch(`${this.backendUrl}/handshake`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`Handshake failed: ${response.statusText}`);
            }
            const data = await response.json();
            this.handshakeToken = data.handshake_token;
            return data.handshake_token;
        } catch (error) {
            console.error("Error during AI backend handshake:", error);
            throw error;
        }
    }

    /**
     * Check if combined documentation has been loaded on the backend for this session
     */
    async getDocsStatus(sessionId: string): Promise<{ loaded: boolean; uri?: string }> {
        try {
            const response = await fetch(`${this.backendUrl}/docs/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Handshake-Token': this.handshakeToken || '', // SEND THE TOKEN
                },
                body: JSON.stringify({ session_id: sessionId }),
                credentials: 'include' // Include cookies in cross-origin requests
            });
            if (!response.ok) {
                throw new Error(`Failed to get docs status: ${response.statusText}`);
            }
            const data = await response.json();
            return { loaded: !!data.loaded, uri: data.uri };
        } catch (error) {
            console.error('Failed to fetch docs status from backend:', error);
            return { loaded: false };
        }
    }

    /**
     * Request backend to load combined documentation into model context for this session
     */
    async loadDocs(sessionId: string): Promise<{ success: boolean; status: string; uri?: string }> {
        try {
            const response = await fetch(`${this.backendUrl}/docs/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Handshake-Token': this.handshakeToken || '', // SEND THE TOKEN
                },
                body: JSON.stringify({ session_id: sessionId }),
                credentials: 'include' // Include cookies in cross-origin requests
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.detail || response.statusText);
            }
            const data = await response.json();
            return { success: !!data.success, status: data.status, uri: data.uri };
        } catch (error) {
            console.error('Failed to load docs on backend:', error);
            return { success: false, status: 'error' };
        }
    }

    /**
     * Get the model name for display purposes
     * Note: This now fetches from backend to maintain single source of truth
     */
    async getModelName(): Promise<string> {
        try {
            const response = await fetch(`${this.backendUrl}/model-info`, {
                headers: {
                    'X-Handshake-Token': this.handshakeToken || '', // SEND THE TOKEN
                },
                credentials: 'include' // Include cookies in cross-origin requests
            });
            if (response.ok) {
                const data = await response.json();
                return data.model_name || 'XRPCode Buddy';
            }
        } catch (error) {
            console.error('Failed to fetch model name from backend:', error);
        }
        return 'XRPCode Buddy'; // Fallback
    }

    /**
     * Clean up a session on the backend
     */
    async cleanupSession(sessionId: string): Promise<void> {
        try {
            const response = await fetch(`${this.backendUrl}/session/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'X-Handshake-Token': this.handshakeToken || '', // SEND THE TOKEN
                },
                credentials: 'include' // Include cookies in cross-origin requests
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Session cleaned up successfully:', data);
            } else {
                console.error(`Failed to cleanup session ${sessionId.substring(0, 8)}...`);
            }
        } catch (error) {
            console.error('Failed to cleanup session on backend:', error);
        }
    }

    /**
     * Send a simplified chat request with user message and context
     */
    async chatWithContext(
        sessionId: string,
        userMessage: string,
        conversationHistory: ChatMessage[] = [],
        editorContext: string = '',
        terminalContext: string = '',
        language: string = 'en',
        onStream?: (content: string) => void,
        signal?: AbortSignal
    ): Promise<string> {
        try {
            // Check if already aborted
            if (signal?.aborted) {
                throw new DOMException('Request was aborted', 'AbortError');
            }

            // Prepare simplified request payload
            const payload = {
                session_id: sessionId,
                user_message: userMessage,
                conversation_history: conversationHistory.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : msg.role,
                    content: msg.content
                })),
                editor_context: editorContext,
                terminal_context: terminalContext,
                language: language
            };

            const response = await fetch(`${this.backendUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Handshake-Token': this.handshakeToken || '', // SEND THE TOKEN
                },
                body: JSON.stringify(payload),
                signal: signal,
                credentials: 'include' // Include cookies in cross-origin requests
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Chat request failed: ${errorData.detail || response.statusText}`);
            }

            if (onStream) {
                // Handle streaming response
                return await this.handleStreamingResponse(response, onStream, signal);
            } else {
                // Handle non-streaming response (though streaming is preferred)
                return await this.handleNonStreamingResponse(response);
            }
        } catch (error) {
            // Re-throw abort errors as-is
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            
            console.error('Chat completion error:', error);
            throw new Error(`Failed to get response from backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Handle streaming response from the simplified chat endpoint
     */
    private async handleStreamingResponse(
        response: Response,
        onStream: (content: string) => void,
        signal?: AbortSignal
    ): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body available');
        }

        let fullContent = '';
        const decoder = new TextDecoder();

        try {
            while (true) {
                // Check for abortion
                if (signal?.aborted) {
                    throw new DOMException('Request was aborted', 'AbortError');
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'content') {
                                fullContent += data.content;
                                onStream(fullContent);
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error('Failed to parse streaming data:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return fullContent;
    }

    /**
     * Handle non-streaming response (fallback)
     */
    private async handleNonStreamingResponse(response: Response): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body available');
        }

        let fullContent = '';
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'content') {
                                fullContent += data.content;
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error('Failed to parse streaming data:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return fullContent;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use chatWithContext instead
     */
    async chatCompletion(
        messages: ChatMessage[],
        onStream?: (content: string) => void,
        _contextFile?: unknown, // Ignored - context now handled by backend
        signal?: AbortSignal
    ): Promise<string> {
        if (messages.length === 0) {
            throw new Error('No messages provided');
        }

        // Generate a temporary session ID for legacy calls
        const randomArray = new Uint32Array(2);
        void (typeof window !== 'undefined' && window.crypto
            ? window.crypto.getRandomValues(randomArray)
            : (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
                ? crypto.getRandomValues(randomArray)
                : (() => { throw new Error('No secure random generator available'); })()
            )
        );
        const randomString = Array.from(randomArray).map(n => n.toString(36)).join('').substr(0, 9);
        const tempSessionId = `legacy-${Date.now()}-${randomString}`;
        const userMessage = messages[messages.length - 1].content;
        const conversationHistory = messages.slice(0, -1);

        return this.chatWithContext(
            tempSessionId,
            userMessage,
            conversationHistory,
            '', // No editor context in legacy mode
            '', // No terminal context in legacy mode
            'en', // Default language for legacy mode
            onStream,
            signal
        );
    }
}