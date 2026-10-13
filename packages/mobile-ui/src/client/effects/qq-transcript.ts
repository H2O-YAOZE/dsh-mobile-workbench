import type { Context } from '@deepseek-ai/cordis'

/** Add QQ nickname/time lines beside the host-owned renderer; never read private React state. */
export function installQqTranscript(ctx: Context) {
  ctx.effect(() => {
    const media = window.matchMedia('(max-width:767px)')
    const selector = '[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"], [data-chat-flow-kind="assistant-step"][data-chat-group-part="response"]'
    const syncRow = (row: HTMLElement) => {
      if (!media.matches || !row.matches(selector)) return
      const assistant = row.dataset.chatFlowKind === 'assistant-step'
      let clock = row.querySelector('[class$="_timeStart"]')?.textContent ?? ''
      if (assistant) {
        const turn = row.dataset.chatTurn
        if (turn !== undefined && /^\d+$/.test(turn)) {
          const tail = row.closest('[data-chat-flow]')?.querySelector(`[data-chat-flow-kind="turn-tail"][data-chat-turn="${turn}"]`)
          clock = tail?.querySelector('[class$="_timeEnd"]')?.textContent ?? ''
        }
      }
      const time = clock.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] ?? ''
      let label = row.querySelector<HTMLElement>(':scope > [data-qq="transcript-label"]')
      if (label === null) {
        label = document.createElement('div'); label.dataset.qq = 'transcript-label'; label.dataset.speaker = assistant ? 'assistant' : 'user'
        const name = document.createElement('strong'); name.textContent = assistant ? 'DeepSeek 助手' : 'Jerry'
        label.append(name, document.createElement('time')); row.prepend(label)
      }
      const node = label.querySelector('time')!
      if (node.textContent !== time) node.textContent = time
    }
    const syncAll = () => {
      if (!media.matches) document.querySelectorAll('[data-qq="transcript-label"]').forEach(e => e.remove())
      else document.querySelectorAll<HTMLElement>(selector).forEach(syncRow)
    }
    const observer = new MutationObserver(records => {
      if (!media.matches) return
      const rows = new Set<HTMLElement>()
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement
        if (target?.closest('[data-qq="transcript-label"]')) continue
        const parent = target?.closest<HTMLElement>('[data-chat-flow-kind]')
        if (parent) rows.add(parent)
        for (const node of record.addedNodes) if (node instanceof HTMLElement) {
          if (node.matches(selector)) rows.add(node)
          node.querySelectorAll<HTMLElement>(selector).forEach(row => rows.add(row))
        }
      }
      for (const row of rows) {
        if (row.dataset.chatFlowKind === 'turn-tail') {
          const turn = row.dataset.chatTurn
          if (turn && /^\d+$/.test(turn)) row.closest('[data-chat-flow]')?.querySelectorAll<HTMLElement>(`[data-chat-flow-kind="assistant-step"][data-chat-turn="${turn}"][data-chat-group-part="response"]`).forEach(syncRow)
        } else syncRow(row)
      }
    })
    observer.observe(document.body, { childList:true, subtree:true, characterData:true })
    media.addEventListener('change', syncAll); syncAll()
    return () => { observer.disconnect(); media.removeEventListener('change', syncAll); document.querySelectorAll('[data-qq="transcript-label"]').forEach(e => e.remove()) }
  }, 'QQ phone transcript labels')
}
