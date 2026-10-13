import { useEffect, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { QQ_ASSETS } from './qq-assets.ts'

export function QqInputTools({ useInput, inputActions }: PropsRuntime<'conversation.input.left'>) {
  const draft = useInput(s => s.draft)
  const [faces, setFaces] = useState(false)
  const [options, setOptions] = useState(false)
  const tools = useRef<HTMLDivElement>(null)
  const composer = () => tools.current?.closest<HTMLElement>('[data-slot="conversation.composer.bar"]')
  useEffect(() => {
    const root = composer()
    if (root) root.dataset.qqControlsExpanded = String(options)
    return () => { if (root) delete root.dataset.qqControlsExpanded }
  }, [options])
  useEffect(() => {
    if (!faces) return
    const close = (e: PointerEvent) => { if (e.target instanceof Node && !tools.current?.contains(e.target)) setFaces(false) }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setFaces(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [faces])
  return <div data-qq="input-tools" ref={tools}>
    <button type="button" aria-label="插入表情" aria-expanded={faces} onClick={() => setFaces(v => !v)}><img src={QQ_ASSETS.face} alt="" /><span>表情</span></button>
    <button type="button" data-qq="upload" aria-label="上传文件或图片" onClick={() => { setFaces(false); composer()?.querySelector<HTMLInputElement>('input[type="file"]')?.click() }}><img src={QQ_ASSETS.file} alt="" /><span>上传</span></button>
    <button type="button" data-qq="options" aria-label="展开或收起聊天选项" aria-expanded={options} onClick={() => { setFaces(false); setOptions(v => !v) }}>{options ? '收起选项' : '选项'}</button>
    {faces && <div data-qq="faces" role="group" aria-label="选择表情">{['微笑', '谢谢', '收到', '赞'].map((name, i) => <button key={name} type="button" aria-label={name} onClick={() => { inputActions.setDraft(draft + ['🙂', '🙏', '👌', '👍'][i]); setFaces(false) }}>{['🙂', '🙏', '👌', '👍'][i]}</button>)}</div>}
  </div>
}
