import type { ClientContext } from '../compat/types.ts'
import { mainSessionIdOf } from '../compat/types.ts'

type EventEntry = { type: string; event: { type: string; data?: Record<string, unknown> } }
type EventSource = {
  getSnapshot(): { entries: readonly EventEntry[] }
  subscribe(fn: () => void): () => void
}

/** Only the latest completed, zero-output turn is actionable here. */
export function latestInterruptedReply(entries: readonly EventEntry[]): boolean {
  let end: Record<string, unknown> | undefined
  let user = false
  let output = false
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (entry?.type !== 'event') continue
    const { type, data } = entry.event
    if (type === 'turn/start') {
      return end?.reason !== undefined
        && (end.reason as { kind?: unknown }).kind === 'interrupted'
        && end.turn === data?.turn && user && !output
    }
    if (type === 'turn/end' && end === undefined) end = data
    if (type === 'user/message') user = true
    if (type === 'assistant/message' || type === 'assistant/chunk' || type === 'assistant/attempt' || type === 'tool/call') output = true
  }
  return false
}

/** Show an explicit recovery message for a server-interrupted turn with no reply. */
export function installInterruptedReplyNotice(ctx: ClientContext): void {
  ctx.effect(() => {
    const notice = document.createElement('div')
    notice.dataset.mobileNav = 'interrupted-reply'
    notice.setAttribute('role', 'status')
    notice.textContent = '这次任务已中断，模型没有生成回复。请确认任务结果，再重新发送上一条消息。'
    let currentSource: EventSource | undefined
    let offEvents: (() => void) | undefined
    let scheduled = false

    const render = (): void => {
      const id = mainSessionIdOf(ctx.sessions.list.getSnapshot().byId)
      const binding = id === undefined ? undefined : ctx.sessions.binding(id)
      const source = (binding as { eventSource?: EventSource } | undefined)?.eventSource
      if (source !== currentSource) {
        offEvents?.()
        currentSource = source
        offEvents = source?.subscribe(schedule)
      }
      const running = id !== undefined && ctx.sessions.list.getSnapshot().byId[id]?.running === true
      const flow = document.querySelector('[data-mobile-nav="frame"] [data-chat-flow]')
      const show = window.matchMedia('(max-width: 767px)').matches
        && !running && source !== undefined
        && latestInterruptedReply(source.getSnapshot().entries)
        && flow !== null
      if (show) {
        // Keep the notice after the final chat row, inside the transcript's
        // scroll area. React can replace the flow on reconnect, so reattach.
        if (notice.previousElementSibling !== flow) flow.after(notice)
      } else notice.remove()
    }
    const schedule = (): void => {
      if (scheduled) return
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        render()
      })
    }
    const observer = new MutationObserver((changes) => {
      if (changes.some((change) => [...change.addedNodes, ...change.removedNodes]
        .some((node) => node !== notice && node !== notice.firstChild))) schedule()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const offList = ctx.sessions.list.subscribe(schedule)
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      offEvents?.()
      offList()
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      notice.remove()
    }
  }, 'dsh-mobile-nav: interrupted reply notice')
}
