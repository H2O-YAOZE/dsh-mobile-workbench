import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { CodeSource } from './code-explanation.ts';
type Props = PropsRuntime<'conversation.view'> & {
    codeSource: CodeSource | undefined;
    translationSessionId: string;
};
export declare function CodeExplanationView({ codeSource, translationSessionId }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=CodeExplanationView.d.ts.map