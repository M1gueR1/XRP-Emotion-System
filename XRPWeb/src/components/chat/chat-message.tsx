import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../utils/types';
import MarkdownIt from 'markdown-it';

// You need to ts ignore these plugins because they don't have built-in type definitions
// @ts-expect-error: markdown-it-footnote does not have built-in type definitions
import markdownItFootnote from 'markdown-it-footnote';
// @ts-expect-error: markdown-it-deflist does not have built-in type definitions
import markdownItDeflist from 'markdown-it-deflist';
// @ts-expect-error: markdown-it-abbr does not have built-in type definitions
import markdownItAbbr from 'markdown-it-abbr';

interface ChatMessageProps {
  message: ChatMessage;
}

const md = new MarkdownIt({
  html: false, // Disables raw HTML in source markdown for XSS protection
  linkify: true,
  typographer: true,
  breaks: true,
})
  .use(markdownItFootnote)
  .use(markdownItDeflist)
  .use(markdownItAbbr);

// Custom renderer for code blocks to add copy functionality
md.renderer.rules.code_block = md.renderer.rules.fence = function (tokens, idx) {
  const token = tokens[idx];
  const code = token.content.trim();
  const langName = token.info ? token.info.split(' ')[0] : '';
  
  return `<div class="code-block-wrapper relative group border border-mountain-mist-200 rounded-lg shadow-sm overflow-hidden my-4">
    <div class="code-block-header flex justify-between items-center px-4 py-2 bg-mountain-mist-100 border-b border-mountain-mist-200">
      <span class="text-xs font-medium text-mountain-mist-600">${langName || 'code'}</span>
      <button 
        class="copy-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded text-mountain-mist-500 hover:text-curious-blue-600 hover:bg-mountain-mist-200" 
        data-code="${code.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
        title="Copy code"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
      </button>
    </div>
    <pre class="code-block-content m-0 bg-mountain-mist-50 text-mountain-mist-900 p-4 font-mono text-sm leading-relaxed overflow-auto"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
};

// Custom renderer for links to open in a new tab
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};
md.renderer.rules.link_open = function (tokens, idx, options, _env, self) {
  // If already has target, don't duplicate
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']); // add new attribute
  } else if (tokens[idx].attrs) {
    tokens[idx].attrs[aIndex][1] = '_blank'; // replace value
  }
  // Add rel="noopener noreferrer" for security
  const relIndex = tokens[idx].attrIndex('rel');
  if (relIndex < 0) {
    tokens[idx].attrPush(['rel', 'noopener noreferrer']);
  } else if (tokens[idx].attrs) {
    tokens[idx].attrs[relIndex][1] = 'noopener noreferrer';
  }
  return defaultRender(tokens, idx, options, _env, self);
};

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Add click handlers to copy buttons
      const copyButtons = contentRef.current.querySelectorAll('.copy-btn');
      const listeners: Array<{button: Element, handler: () => void}> = [];
      
      copyButtons.forEach((button) => {
        const handleCopy = async () => {
          const el = button as HTMLElement;
          const code = el.getAttribute('data-code');
          if (code) {
            try {
              // Decode HTML entities
              const decodedCode = code
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
              
              await navigator.clipboard.writeText(decodedCode);
              
              // Visual feedback
              const originalHTML = el.innerHTML;
              el.innerHTML = `<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>`;
              
              setTimeout(() => {
                el.innerHTML = originalHTML;
              }, 2000);
            } catch (err) {
              console.error('Failed to copy code:', err);
            }
          }
        };
        button.addEventListener('click', handleCopy);
        listeners.push({button: button as Element, handler: handleCopy});
      });
      // Cleanup all listeners
      return () => {
        listeners.forEach(({button, handler}) => {
          button.removeEventListener('click', handler);
        });
      };
    }
  }, [message.content]);

  return (
    <div className={`mb-4 ${message.role === 'user' ? 'ml-8' : 'mr-8'}`}>
      {/* Message Header */}
      <div className={`flex items-center mb-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex items-center gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            message.role === 'user' 
              ? 'bg-curious-blue-500 text-white' 
              : 'bg-mountain-mist-200 text-mountain-mist-800'
          }`}>
            {message.role === 'user' ? 'U' : 'XRP'}
          </div>
          <span className="text-xs font-medium text-mountain-mist-600">
            {message.role === 'user' ? 'You' : 'XRP Code Buddy'}
          </span>
        </div>
      </div>
      
      {/* Message Content */}
      <div className={`${message.role === 'user' ? 'text-right' : 'text-left'}`}>
        <div className="inline-block max-w-full rounded-xl px-3 py-2 bg-mountain-mist-50 border border-mountain-mist-200">
          <div 
            ref={contentRef}
            className="prose prose-sm max-w-none dark:prose-invert
              prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2
              prose-h1:text-curious-blue-600 prose-h1:text-lg prose-h1:mt-0 prose-h1:mb-2
              prose-h2:text-curious-blue-700 prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-curious-blue-800 prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-mountain-mist-800 prose-p:leading-relaxed prose-p:my-2 prose-p:text-sm
              prose-a:text-curious-blue-600 prose-a:no-underline hover:prose-a:text-curious-blue-700 hover:prose-a:underline
              prose-strong:text-mountain-mist-900 prose-strong:font-semibold
              prose-em:text-mountain-mist-700
              prose-code:text-curious-blue-700 prose-code:bg-mountain-mist-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-medium prose-code:border prose-code:border-mountain-mist-200
              prose-blockquote:border-l-curious-blue-300 prose-blockquote:bg-curious-blue-50 prose-blockquote:text-curious-blue-900 prose-blockquote:rounded-r prose-blockquote:shadow-sm prose-blockquote:my-3 prose-blockquote:py-2 prose-blockquote:px-3
              prose-ul:my-3 prose-ol:my-3 prose-ul:pl-4 prose-ol:pl-4
              prose-li:text-mountain-mist-800 prose-li:my-0.5 prose-li:text-sm
              prose-table:border prose-table:border-mountain-mist-300 prose-table:rounded-lg prose-table:overflow-hidden prose-table:my-3 prose-table:shadow-sm
              prose-th:bg-curious-blue-100 prose-th:text-curious-blue-900 prose-th:font-semibold prose-th:border-b prose-th:border-curious-blue-300 prose-th:px-3 prose-th:py-2 prose-th:text-xs
              prose-td:bg-white prose-td:text-mountain-mist-800 prose-td:border-b prose-td:border-mountain-mist-200 prose-td:px-3 prose-td:py-2 prose-td:text-xs
              prose-hr:border-mountain-mist-300 prose-hr:my-4
              [&_.code-block-wrapper]:my-4
              [&_.code-block-content]:bg-mountain-mist-50 [&_.code-block-content]:text-mountain-mist-900 [&_.code-block-content]:border [&_.code-block-content]:border-mountain-mist-200 [&_.code-block-content]:rounded-b-lg [&_.code-block-content]:shadow-sm [&_.code-block-content]:p-4 [&_.code-block-content]:font-mono [&_.code-block-content]:text-sm [&_.code-block-content]:leading-relaxed [&_.code-block-content]:overflow-auto"
            dangerouslySetInnerHTML={{ __html: md.render(message.content) }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatMessageComponent; 