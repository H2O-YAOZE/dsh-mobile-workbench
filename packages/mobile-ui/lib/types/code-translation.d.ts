import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const TRANSLATION_ROUTE = "/_dsh/mobile-nav/code-translation";
type Admission = {
    peer: unknown;
} | {
    rejection: 401 | 403;
};
/** Bounded, serial auxiliary calls. No Agent creation, Session.append or arbitrary file access. */
export declare function createTranslationService(ctx: Context, directory?: string): {
    handle: (req: IncomingMessage, res: ServerResponse, admit: (req: IncomingMessage) => Admission) => Promise<void>;
    onEvent(id: string, type: string): void;
    dispose(): void;
    settled: () => Promise<void>;
};
export {};
//# sourceMappingURL=code-translation.d.ts.map