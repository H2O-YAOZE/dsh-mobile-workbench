import {spawn} from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)
const own = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)))
// ESM resolution reads the package.json one level above lib.
const roots = new Set([path.dirname(own)])
for(const name of ['pdf-parse','mammoth','xlsx']) {
  let directory = fs.realpathSync(path.dirname(require.resolve(name+'/package.json')))
  while(path.dirname(directory) !== directory && path.basename(directory) !== 'node_modules') directory = path.dirname(directory)
  if(path.basename(directory) !== 'node_modules') throw new Error('Cannot locate parser dependencies')
  roots.add(directory)
}
// Node checks both the lexical import path and its resolved symlink target.
// Permit aliases only when they resolve to a dependency directory already allowed.
for(let directory=path.dirname(own);path.dirname(directory)!==directory;directory=path.dirname(directory)){
  const candidate=path.join(directory,'node_modules')
  try {if(roots.has(fs.realpathSync(candidate))) roots.add(candidate)} catch {}
}
let active = false

/** One on-demand parser; bounded time/output/heap, no private credentials or write permission. */
export async function readWindowInWorker(bytes,options,signal) {
  if(active) throw new Error('已有一个文档正在解析，请完成后再读取下一个。')
  if(signal?.aborted) throw new Error('文档读取已取消。')
  active = true
  try {
    return await new Promise((resolve,reject) => {
      const args=['--experimental-permission','--no-warnings','--max-old-space-size=96',
        ...[...roots].map(root=>'--allow-fs-read='+root),path.join(own,'parse-worker.js')]
      const child=spawn(process.execPath,args,{stdio:['pipe','pipe','ignore'],
        env:{PATH:process.env.PATH||'',LANG:'C.UTF-8',TZ:process.env.TZ||'Asia/Shanghai'}})
      let ended=false,size=0;const chunks=[]
      const finish=(error,value) => {
        if(ended)return;ended=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel)
        child.kill('SIGKILL');error?reject(error):resolve(value)
      }
      const cancel=()=>finish(new Error('文档读取已取消。'))
      const timer=setTimeout(()=>finish(new Error('文档解析超过 15 秒，请缩小文件后重试。')),15000)
      timer.unref();signal?.addEventListener('abort',cancel,{once:true})
      child.on('error',()=>finish(new Error('无法启动文档解析进程。')))
      child.stdin.on('error',()=>{})
      child.stdout.on('data',chunk=>{
        size+=chunk.length
        if(size>4*1024*1024)finish(new Error('文档返回内容超过上限，请减少读取行数。'))
        else chunks.push(chunk)
      })
      child.on('close',code=>{
        if(ended)return
        if(code!==0){finish(new Error('文档解析失败或超过资源限制，请缩小文件后重试。'));return}
        try {
          const value=JSON.parse(Buffer.concat(chunks).toString('utf8'))
          if(!Array.isArray(value.lines)||!Number.isSafeInteger(value.totalLines))throw new Error()
          finish(null,value)
        } catch {finish(new Error('文档解析结果不可读。'))}
      })
      child.stdin.write(JSON.stringify(options)+'\n')
      child.stdin.end(bytes)
      if(signal?.aborted)cancel()
    })
  } finally {active=false}
}
