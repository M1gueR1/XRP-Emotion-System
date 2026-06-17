import EditorMgr from '@/managers/editormgr';
import TerminalMgr from '@/managers/terminalmgr';
import { EditorType } from './types';

/**
 * Simplified context loader for XRP Code Buddy
 * Only handles gathering dynamic context (editor/terminal) since documentation is loaded at backend startup
 */
export class GeminiContextLoader {
    constructor() {
        // No longer needs GeminiClient since backend handles all uploads
    }

    /**
     * Get the current terminal context from XRP Shell
     * This provides recent terminal output and command history
     */
    getCurrentTerminalContext(): string {
        const terminalContents = TerminalMgr.getLiveTerminalContents();
        
        if (terminalContents.length === 0) {
            return '';
        }

        const contextSections: string[] = [];
        contextSections.push('The following is the recent terminal output from the XRP Shell:');
        
        for (const terminal of terminalContents) {
            contextSections.push(`\n### Terminal: ${terminal.id}`);
            contextSections.push(`**Lines:** ${terminal.lines} total lines`);
            contextSections.push(`**Last Updated:** ${terminal.lastUpdated.toISOString()}`);
            contextSections.push('**Description:** This shows recent commands executed and their output from the XRP robot terminal session.');
            contextSections.push('**Recent Terminal Output:**');
            contextSections.push('```');
            contextSections.push(terminal.content);
            contextSections.push('```');
        }
        
        return contextSections.join('\n');
    }

    /**
     * Get the current code context from all open editors
     * This provides real-time content that includes any unsaved changes
     */
    getCurrentEditorContext(): string {
        const liveEditors = EditorMgr.getInstance().getLiveEditorContents();
        const activeEditorId = EditorMgr.getInstance().getActiveEditorId();
        
        if (liveEditors.length === 0) {
            return '';
        }

        const contextSections: string[] = [];
        contextSections.push('The following are the code files currently open in the user\'s development environment:');
        
        for (const editor of liveEditors) {
            const isActive = editor.id === activeEditorId;
            const isBlockly = editor.type === EditorType.BLOCKLY;
            
            contextSections.push(
                `\n### File: ${editor.id}${isActive ? ' (CURRENTLY ACTIVE)' : ''}`
            );
            contextSections.push(`**Path:** ${editor.path}`);
            contextSections.push(`**Type:** ${isBlockly ? 'Blockly Visual Programming' : 'Python Code'}`);
            
            if (isBlockly) {
                // For Blockly files, editor.content contains the JSON workspace definition
                contextSections.push('**Description:** This is a visual programming file created with Blockly blocks. The user has dragged and connected visual blocks to create their program logic.');
                contextSections.push('**Blockly Workspace Structure:**');
                contextSections.push('```json');
                try {
                    // Pretty print the JSON for better readability
                    const blocklyJson = JSON.parse(editor.content);
                    contextSections.push(JSON.stringify(blocklyJson, null, 2));
                } 
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                catch (_) {
                    // If parsing fails, use raw content
                    contextSections.push(editor.content);
                }
                contextSections.push('```');
                
                // Also try to get the generated Python code if available from session
                const session = EditorMgr.getInstance().getEditorSession(editor.id);
                if (session && session.content) {
                    contextSections.push('\n**Python Code Generated from Blocks:**');
                    contextSections.push('```python');
                    contextSections.push(session.content);
                    contextSections.push('```');
                }
            } else {
                // For Python files, editor.content contains the actual Python code
                contextSections.push('**Description:** This is a Python code file that the user has written or is editing.');
                contextSections.push('**User\'s Python Code:**');
                contextSections.push('```python');
                contextSections.push(editor.content);
                contextSections.push('```');
            }
        }
        
        return contextSections.join('\n');
    }
}

/**
 * Create a context loader instance
 * Note: No longer requires GeminiClient parameter since backend handles uploads
 */
export function createContextLoader(): GeminiContextLoader {
    return new GeminiContextLoader();
}