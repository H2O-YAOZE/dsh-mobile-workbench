import type { ClientContext } from '../compat/types.ts';
type EventEntry = {
    type: string;
    event: {
        type: string;
        data?: Record<string, unknown>;
    };
};
/** Only the latest completed, zero-output turn is actionable here. */
export declare function latestInterruptedReply(entries: readonly EventEntry[]): boolean;
/** Show an explicit recovery message for a server-interrupted turn with no reply. */
export declare function installInterruptedReplyNotice(ctx: ClientContext): void;
export {};
//# sourceMappingURL=interrupted-reply.d.ts.map