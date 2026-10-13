import { useEffect, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CodeSource } from './code-explanation.ts'
type Item = { path: string; code: string; evidence: string; chinese: string; status: string }
type State = { items: Item[]; chat: {role:string;text:string}[]; busy: boolean; tokens: number; model: string; notice: string }
type Props = PropsRuntime<'conversation.view'> & { codeSource: CodeSource | undefined; translationSessionId: string }
export function CodeExplanationView({ codeSource, translationSessionId }: Props) {
  const [state,setState] = useState<State>({items:[],chat:[],busy:false,tokens:0,model:'',notice:''})
  const [question,setQuestion] = useState(''), [error,setError] = useState(''), [sending,setSending] = useState(false)
  const [file,setFile] = useState('')
  const url = '/_dsh/mobile-nav/code-translation?session=' + encodeURIComponent(translationSessionId)
  useEffect(() => {
    let stopped = false, timer: ReturnType<typeof setTimeout>, debounce: ReturnType<typeof setTimeout>, busy = false, etag = '', processing = true
    const controller = new AbortController()
    setState({items:[],chat:[],busy:false,tokens:0,model:'',notice:''}); setError(''); setQuestion('');setFile('')
    async function request(sync: boolean) {
      if (stopped || busy) return
      busy = true
      try {
        const r = await fetch(url,{ method:sync?'POST':'GET', credentials:'same-origin', ...(sync?{headers:{'Content-Type':'application/json'},body:'{}'}:etag?{headers:{'If-None-Match':etag}}:{}),signal:controller.signal })
        if(r.status===304)return
        const data = await r.json()
        if (!r.ok && r.status !== 409) throw Error(data.error || '无法读取中文翻译，请稍后重试。')
        if (!stopped && data.ok) { setState(data); setError(''); etag=r.headers.get('ETag')||''; processing=data.busy }
      } catch(e) { if (!stopped) setError(e instanceof Error?e.message:'连接失败。') }
      finally { busy = false }
    }
    const poll = async () => { await request(false); if(!stopped) timer=setTimeout(poll,processing?3500:20000) }
    void request(true).then(() => { if(!stopped) timer=setTimeout(poll,1200) })
    const off = codeSource?.subscribe(() => { clearTimeout(debounce); debounce=setTimeout(() => { void request(true) },2500) })
    return () => { stopped=true; controller.abort(); clearTimeout(timer); clearTimeout(debounce); off?.() }
  }, [url,codeSource])
  async function submit(questionText?: string) {
    setSending(true);setError('')
    try {
      const r = await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(questionText?{question:questionText,...(file?{file}:{})}:{retry:true})})
      const data=await r.json();if(!r.ok)throw Error(data.error||'发送失败。')
      setState(data);if(questionText)setQuestion('')
    } catch(e){setError(e instanceof Error?e.message:'发送失败。')}finally{setSending(false)}
  }
  return <section data-code-explanation="view" aria-label="独立中文代码翻译">
    <h2>代码 → 中文</h2>
    <p>本页自动翻译本会话中的代码片段，结果保存在这里。这里的内容和追问都不会发到主对话。</p>
    <small>新代码翻译会消耗模型 Token；相同片段读取缓存。{state.model && `模型：${state.model}。`}已报告用量：{state.tokens.toLocaleString()} Token（未报告的调用不计入）。</small>
    <p role="status">{error || state.notice || (state.busy ? '正在自动翻译，可随时切回对话…' : state.items.length ? '中文翻译已同步。' : '正在读取本会话的代码片段…')}</p>
    {state.items.map(item => <article key={item.path}>
      <h3>{item.path.split(/[/\\]/).pop()}</h3><p data-code-explanation="path">{item.path}</p><small>{item.evidence}</small>
      <div data-code-explanation="answer"><h4>对应的中文意思</h4><p>{item.chinese || '等待自动翻译…'}</p></div>
      <details><summary>对照原代码</summary><pre>{item.code.split('\n').map((line,i)=>`${i+1}: ${line}`).join('\n')}</pre></details>
    </article>)}
    {state.items.some(i=>i.status==='error') && <button type="button" disabled={state.busy||sending} onClick={()=>void submit()}>重试未完成的翻译</button>}
    <div data-code-translation="chat" aria-label="代码翻译独立对话">
      {state.chat.map((m,i)=><article key={i}><small>{m.role==='user'?'我的代码问题':'中文翻译'}</small><p>{m.text}</p></article>)}
      <form onSubmit={e=>{e.preventDefault();if(question.trim())void submit(question.trim())}}>
        <label htmlFor="code-translation-question">只在这里追问代码的意思</label>
        <select aria-label="选择要追问的代码" value={file} onChange={e=>setFile(e.target.value)}><option value="">最近翻译的代码</option>{state.items.filter(i=>i.status==='done').map(i=><option key={i.path} value={i.path}>{i.path}</option>)}</select>
        <textarea id="code-translation-question" value={question} maxLength={1500} rows={3} placeholder="例如：第12行用日常中文怎么说？" onChange={e=>setQuestion(e.target.value)} />
        <button type="submit" disabled={!question.trim()||state.busy||sending||!state.items.some(i=>i.status==='done')}>发送到中文翻译</button>
      </form>
    </div>
  </section>
}
