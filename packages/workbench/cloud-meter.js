import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';

export const metrics = ['input','output','cache_read','cache_write','reasoning','total','requests','split_missing'];
const zero = () => Object.fromEntries(metrics.map(k => [k,0]));
const safe = v => Number.isSafeInteger(v) && v >= 0;
const dayOf = time => new Date(time + 8*3600000).toISOString().slice(0,10);
export function normalizeUsage(u) {
  if (!u || typeof u !== 'object') return null;
  const fields = ['inputTokens','outputTokens','cacheReadTokens','cacheWriteTokens','reasoningTokens','totalTokens'];
  if (fields.some(k => u[k] !== undefined && !safe(u[k]))) return null;
  if (!fields.some(k => safe(u[k]))) return null;
  const v = {input:u.inputTokens||0,output:u.outputTokens||0,cache_read:u.cacheReadTokens||0,
    cache_write:u.cacheWriteTokens||0,reasoning:u.reasoningTokens||0,requests:1,
    split_missing:!safe(u.inputTokens)||!safe(u.outputTokens)?1:0};
  // Native DSH input is uncached input; cache buckets are disjoint. Reasoning is within output.
  v.total = u.totalTokens ?? (v.input+v.output+v.cache_read+v.cache_write);
  return v;
}
export const emptySession = (seed=0) => ({cursor:-1,seed,id:null,model:'未报告模型',rows:{},last:null,updated:null,observed:null,auxiliary:0,unmetered:0,invalid:0});
export function settledUsage(data) {
  if(data.usage)return data.usage;
  let latest=null;
  for(const record of Array.isArray(data.stream)?data.stream:[]){
    if(record.type==='chunk'&&record.chunk?.type==='usage')latest=record.chunk.usage;
  }
  return latest;
}
export function fold(state,event) {
  if (!safe(event.seq) || event.seq <= state.cursor) return false;
  state.cursor=event.seq;
  const d=event.data||{};
  if(event.type==='request/context') {state.model=typeof d.model==='string'?d.model.slice(0,160):'未报告模型';return false;}
  if(event.seq<state.seed) return false; // Forked history belongs to the parent, not the child.
  if(safe(event.time))state.observed=Math.max(state.observed||0,event.time);
  if(event.type==='llm/retry-started') {state.last=null;return false;}
  const auxiliary=['web/deepseek-search-llm-request','session/title-llm-request'].includes(event.type);
  const settlement=['assistant/message','assistant/attempt'].includes(event.type);
  if(auxiliary)state.auxiliary++;
  const raw=settlement?settledUsage(d):auxiliary?d.usage:event.type==='assistant/chunk'&&d.chunk?.type==='usage'?d.chunk.usage:null;
  if(!raw){if(settlement)state.unmetered++;return auxiliary||settlement;}
  const values=normalizeUsage(raw);
  if(!values || !safe(event.time)){state.invalid++;return false;}
  // Each durable 0.2 attempt is a distinct request, even within the same turn/step.
  // Legacy usage chunks and their final 0.1 message still replace one another.
  const native=Array.isArray(d.stream)||event.type==='assistant/attempt'||auxiliary;
  const identity=native?'seq:'+event.seq:JSON.stringify([d.turn??null,d.step??null,...(d.turn==null||d.step==null?[event.seq]:[])]);
  const previous=state.last?.identity===identity?state.last:null;
  const purpose=event.type==='assistant/attempt'?'attempt':event.type==='session/title-llm-request'?'title':event.type==='web/deepseek-search-llm-request'?'search':'reply';
  const model=auxiliary&&typeof d.model==='string'?d.model.slice(0,160):state.model;
  const key=JSON.stringify([dayOf(event.time),model,purpose]);
  if(previous)for(const k of metrics)state.rows[previous.key][k]-=previous.values[k];
  if(!state.rows[key])state.rows[key]={day:dayOf(event.time),model,purpose,...zero()};
  for(const k of metrics)state.rows[key][k]+=values[k];
  state.last={identity,key,values};
  state.updated=Math.max(state.updated||0,event.time);
  return true;
}

// Concatenated zstd frames must all be read. Node's sync decoder on this host only reads the header frame.
// Stream one low-priority decoder at a time; cap the decoder window and each line's working buffer.
async function scanFile(file,signal) {
  const compressed=file.endsWith('.zstd');
  const child=compressed?spawn('nice',['-n','10','zstd','-dc','-M32MB','--',file],{stdio:['ignore','pipe','ignore']}):null;
  const stream=child?child.stdout:fs.createReadStream(file);
  let childError=null;
  const completed=child?new Promise(resolve=>{child.on('error',e=>{childError=e;resolve(-1);});child.on('close',resolve);}):null;
  const stop=()=>{stream.destroy();child?.kill();};signal?.addEventListener('abort',stop,{once:true});
  let state=emptySession(),id=null,pending='',discard=false;
  const consume=line=>{
    if(!line)return;
    let e;try{e=JSON.parse(line);}catch{state.invalid++;return;}
    if(e.type==='session'){id=e.id;state.id=id;state.seed=e.seedLength||0;return;}
    fold(state,e);
  };
  try {
    stream.setEncoding('utf8');
    for await(const chunk of stream){
      if(signal?.aborted)throw new Error('aborted');
      for(const [i,part] of chunk.split('\n').entries()){
        if(i){if(!discard)consume(pending);pending='';discard=false;}
        if(!discard){pending+=part;if(pending.length>2*1024*1024){pending='';discard=true;state.invalid++;}}
      }
    }
    if(pending&&!discard)consume(pending);
    if(child&&(await completed)!==0)throw childError||new Error('zstd scan failed');
    if(!id)throw new Error('missing session header');
    return {id,state};
  }finally{signal?.removeEventListener('abort',stop);stop();}
}
async function* filesUnder(root) {
  for(const item of await fs.promises.readdir(root,{withFileTypes:true})){
    const file=path.join(root,item.name);
    if(item.isDirectory())yield*filesUnder(file);
    else if(item.isFile()&&['session.jsonl','session.jsonl.zstd'].includes(item.name))yield file;
  }
}
export function createCloudMeter(ctx,{directory,sessionRoot=path.join(os.homedir(),'.dsh','sessions'),onChange=()=>{}}) {
  const filename=path.join(directory,'dsh-cloud-meter.json');
  let store={version:2,sessions:{},status:'loading',files:0,failures:0,scanned_at:null};
  try{const loaded=JSON.parse(fs.readFileSync(filename,'utf8'));if(loaded.version===2&&loaded.sessions)store=loaded;}catch{}
  const abort=new AbortController();let timer=null,disposed=false;
  const digest=id=>createHash('sha256').update(id).digest('hex');
  const persist=()=>{
    timer=null;if(disposed)return;
    try{const tmp=filename+'.tmp';fs.writeFileSync(tmp,JSON.stringify(store),{mode:0o600});fs.chmodSync(tmp,0o600);fs.renameSync(tmp,filename);onChange();}
    catch{console.error('[usage-sync] cloud meter persistence failed');}
  };
  const changed=()=>{if(!disposed&&!timer){timer=setTimeout(persist,500);timer.unref();}};
  const live=session=>{
    if(disposed)return;
    const key=digest(session.id);
    const state=store.sessions[key] ||= emptySession(session.inheritedEventCount||0);
    state.id=session.id;
    let updated=false;
    for(let seq=state.cursor+1;seq<session.seq;seq++){const e=session.eventAt(seq);if(e)updated=fold(state,e)||updated;}
    if(updated)changed();
  };
  const offEvent=ctx.on('session/event',session=>live(session));
  const offCreated=ctx.on('session/created',session=>live(session));
  const offFlush=ctx.on('session/flush',()=>{if(timer){clearTimeout(timer);persist();}});
  for(const session of ctx.sessions?.list()||[])live(session);
  store.status='loading';changed();
  const ready=(async()=>{
    let count=0,failures=0;
    try{
      for await(const file of filesUnder(sessionRoot)){
        if(disposed)return;
        count++;
        try{
          const {id,state}=await scanFile(file,abort.signal),key=digest(id);
          // A live session has already replayed its complete native log; never overwrite its newer tail.
          if(!store.sessions[key]||store.sessions[key].cursor<=state.cursor)store.sessions[key]=state;
        }catch{if(disposed)return;failures++;}
        changed();
        await new Promise(resolve=>setImmediate(resolve));
      }
    }catch{if(!disposed)failures++;}
    if(disposed)return;
    store.files=count;store.failures=failures;store.status=failures?'partial':'ready';store.scanned_at=new Date().toISOString();
    if(timer)clearTimeout(timer);persist();
    console.info(`[usage-sync] cloud usage history ready: ${count} files, ${failures} failures`);
  })();
  return {
    ready,
    snapshot(){
      const groups=new Map(),taskRows=[];let updated=0,auxiliary=0,unmetered=0,invalid=0;
      for(const state of Object.values(store.sessions)){
        updated=Math.max(updated,state.updated||0);auxiliary+=state.auxiliary;invalid+=state.invalid;unmetered+=state.unmetered||0;
        if(state.id&&(Object.keys(state.rows).length||state.unmetered))taskRows.push({id:state.id,updated:state.observed||state.updated,unmetered:state.unmetered||0,rows:Object.values(state.rows).filter(r=>r.requests>0)});
        for(const row of Object.values(state.rows)){
          const key=JSON.stringify([row.day,row.model,row.purpose]);if(!groups.has(key))groups.set(key,{app:'dsh',source:'deepseek_cloud',day:row.day,model:row.model,purpose:row.purpose,...zero()});
          for(const k of metrics)groups.get(key)[k]+=row[k];
        }
      }
      const models=[...groups.values()].filter(r=>r.requests>0).sort((a,b)=>a.day.localeCompare(b.day)||a.model.localeCompare(b.model)),daily=new Map();
      for(const row of models){if(!daily.has(row.day))daily.set(row.day,{app:'dsh',source:'deepseek_cloud',day:row.day,...zero()});for(const k of metrics)daily.get(row.day)[k]+=row[k];}
      return {today:dayOf(Date.now()),captured_at:updated?new Date(updated).toISOString():null,scanned_at:store.scanned_at,
        status:store.status==='loading'?'loading':store.failures||invalid?'partial':'ready',files:store.files,failures:store.failures,invalid,auxiliary,unmetered,
        tasks:taskRows.sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,400),task_count:taskRows.length,
        daily:[...daily.values()],models,source_daily:[...daily.values()],apps:[{id:'dsh',status:store.status==='loading'?'loading':'connected'}]};
    },
    dispose(){if(timer){clearTimeout(timer);persist();}disposed=true;abort.abort();offEvent?.();offCreated?.();offFlush?.();}
  };
}
