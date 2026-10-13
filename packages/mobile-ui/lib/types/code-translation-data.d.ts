/** Pure, bounded extraction. Only completed tools and assistant code blocks; never reads paths. */
export interface TranslationEvent {
    type: string;
    data?: unknown;
}
export interface TranslationCode {
    path: string;
    code: string;
    evidence: string;
}
export declare const sensitivePath: (path: string) => boolean;
export declare function redactTranslation(text: string): string;
export declare function record(value: unknown): Record<string, unknown>;
export declare function translationCodes(events: readonly TranslationEvent[]): TranslationCode[];
//# sourceMappingURL=code-translation-data.d.ts.map