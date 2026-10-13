/** Pure, bounded extraction. Only completed tools and assistant code blocks; never reads paths. */
export interface TranslationEvent { type: string; data?: unknown }
export interface TranslationCode { path: string; code: string; evidence: string }
export const sensitivePath = (path: string) => /(?:^|[/\\])(?:\.env(?:\..*)?|lan-gate-state\.json|[^/\\]*(?:credential|secret|id_rsa|private[-_]?key)[^/\\]*)$/i.test(path)
export function redactTranslation(text: string): string {
  return text.replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, '[私钥已隐藏]')
    .replace(/(?:sk-|Bearer\s+)[A-Za-z0-9_.-]{16,}/g, '[凭据已隐藏]')
    .replace(/((?:api[_-]?key|password|secret|authorization|(?:access|device|relay|refresh)[_-]?token)["']?\s*[=:]\s*)[^\r\n]+/gi, '$1[凭据已隐藏]')
}
export function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
const string = (v: unknown) => typeof v === 'string' ? v : ''
function content(value: unknown): string {
  return Array.isArray(value) ? value.map(v => string(record(v).text)).join('\n') : string(value)
}
export function translationCodes(events: readonly TranslationEvent[]): TranslationCode[] {
  const calls = new Map<string, { path: string; code: string; name: string }>()
  const files = new Map<string, TranslationCode>()
  const put = (path: string, code: string, evidence: string) => {
    if (!code.trim() || sensitivePath(path) || path.length > 600) return
    // Partial snippets are labelled; no claims about complete files or whole projects.
    const clipped = code.length > 12000
    files.delete(path); files.set(path, { path, code: redactTranslation(code).slice(0,12000), evidence: evidence + (clipped ? '；片段已截取前12000字符' : '') })
    if (files.size > 80) files.delete(files.keys().next().value!)
  }
  for (const e of events) {
    const d = record(e.data)
    if (e.type === 'tool/call') {
      let a: Record<string, unknown> = {}
      try { a = record(typeof d.arguments === 'string' ? JSON.parse(d.arguments) : d.arguments) } catch { continue }
      const name = string(d.name), path = string(a.file_path ?? a.path ?? a.file)
      if (/read|write|edit|patch/i.test(name) && path && /\.(?:[cm]?[jt]sx?|py|html?|css|scss|vue|svelte|go|rs|java|kt|cs|sql|prisma|json|ya?ml|sh|toml)$/i.test(path)) {
        calls.set(string(d.callId), { path, name, code: string(a.content ?? a.new_string ?? a.patch) })
        if (calls.size > 200) calls.delete(calls.keys().next().value!)
      }
    }
    if (e.type === 'tool/result') {
      const m = record(d.message), call = calls.get(string(m.toolCallId))
      if (!call) continue
      calls.delete(string(m.toolCallId))
      if (m.isError) continue
      put(call.path, /read/i.test(call.name) ? content(m.content) : call.code, /read/i.test(call.name) ? '会话中读取工具返回的片段，可能带行号' : '成功修改调用所提供的代码片段，非整个文件')
    }
    if (e.type === 'assistant/message') {
      let n = 0
      for (const m of content(record(d.message).content).matchAll(/```([\w+-]+)\s*\n([\s\S]*?)\n```/g)) {
        if (!/^(?:javascript|typescript|js|ts|tsx|jsx|python|py|html|css|sql|vue|svelte|go|rust|java|kotlin|json|yaml|bash|sh)$/i.test(m[1]!)) continue
        put(`对话代码/${String(record(d.message).id || files.size)}-${++n}.${m[1]}`, m[2]!, '助手在对话中给出的代码；未确认写入或运行')
      }
    }
  }
  return [...files.values()].reverse()
}
