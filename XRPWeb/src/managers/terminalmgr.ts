/**
 * Live terminal content tracking
 */
export type LiveTerminalContent = {
    id: string;
    content: string;
    lastUpdated: Date;
    lines: number;
};

/**
 * TerminalMgr class - manages terminal content similar to EditorMgr
 */
export default class TerminalMgr {
    private static instance: TerminalMgr;
    private static liveTerminalContent = new Map<string, LiveTerminalContent>();

    /**
     * Constructor
     */
    private constructor() {}

    public static getInstance(): TerminalMgr {
        if (!TerminalMgr.instance) {
            TerminalMgr.instance = new TerminalMgr();
        }
        return TerminalMgr.instance;
    }

    /**
     * Update live terminal content
     */
    public static updateLiveTerminalContent(id: string, content: string, lineCount: number): void {
        TerminalMgr.liveTerminalContent.set(id, {
            id,
            content,
            lines: lineCount,
            lastUpdated: new Date()
        });
    }

    /**
     * Get live terminal contents
     */
    public static getLiveTerminalContents(): LiveTerminalContent[] {
        return Array.from(TerminalMgr.liveTerminalContent.values());
    }

    /**
     * Remove live terminal content when terminal is closed
     */
    public static removeLiveTerminalContent(id: string): void {
        TerminalMgr.liveTerminalContent.delete(id);
    }

    /**
     * Clear all terminal content
     */
    public static clearAllTerminalContent(): void {
        TerminalMgr.liveTerminalContent.clear();
    }
} 