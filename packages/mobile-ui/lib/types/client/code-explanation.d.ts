/** Read only the current Session's already loaded event window. No file scans or model calls. */
export interface CodeEvent {
    type: string;
    data?: unknown;
}
export interface CodeWindow {
    entries: readonly {
        type: string;
        event: CodeEvent;
    }[];
    hasMore?: boolean;
}
export interface CodeSource {
    getSnapshot(): CodeWindow;
    subscribe(fn: () => void): () => void;
}
export interface CodeFile {
    path: string;
    category: string;
    operation: string;
    snippet: string;
    calls: number;
}
export interface Explanation {
    file: string;
    summary: string;
    role: string;
    flow: string;
    changes: string;
    evidence: string;
}
export declare const EMPTY_CODE_WINDOW: CodeWindow;
export declare const EMPTY_CODE_SOURCE: CodeSource;
export declare function safeCodeText(value: string): string;
export declare function collectCodeFiles(window: CodeWindow): CodeFile[];
export declare function collectExplanations(window: CodeWindow): Explanation[];
export declare function explanationPrompt(file: CodeFile): string;
//# sourceMappingURL=code-explanation.d.ts.map