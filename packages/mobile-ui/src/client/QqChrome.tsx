import { IconChevronLeftOutlineRegular, IconDataOutlineRegular, IconSettingsOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { QQ_ASSETS } from './qq-assets.ts'

export function QqTitlebar({ onBack }: { onBack?: () => void } = {}) {
  return <div data-qq="titlebar">{onBack && <button type="button" data-qq="back" aria-label="返回会话列表" onClick={onBack}><IconChevronLeftOutlineRegular size={20} /></button>}<img src={QQ_ASSETS.penguin} alt="" /><strong>DSH</strong><span>经典版</span></div>
}

export function QqFooter({ onHome, onSettings, active = 'conversations' }: { onHome: () => void; onSettings: () => void; active?: 'conversations' | 'works' | 'usage' }) {
  return <nav data-qq="footer" aria-label="主要功能">
    <button type="button" onClick={onHome} data-active={active === 'conversations' || undefined} aria-current={active === 'conversations' ? 'page' : undefined}><img src={QQ_ASSETS.penguin} alt="" /><span>对话</span></button>
    <a href="/projects" data-active={active === 'works' || undefined}><img src={QQ_ASSETS.file} alt="" /><span>项目</span></a>
    <a href="/usage" data-active={active === 'usage' || undefined}><IconDataOutlineRegular size={24} /><span>用量</span></a>
    <button type="button" onClick={onSettings}><IconSettingsOutlineRegular size={24} /><span>设置</span></button>
  </nav>
}
