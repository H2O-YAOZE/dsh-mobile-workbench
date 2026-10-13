import { QQ_PAGE_CSS, QQ_BRAND, QQ_WORKS_FOOTER, QQ_FILE_ICON } from './qq-chrome.js';



import fs from 'node:fs';



import path from 'node:path';



import {randomBytes,createHash} from 'node:crypto';



import {defineTool} from '@deepseek-ai/dsh-tools';







const MAX_FILE=1024*1024,MAX_TOTAL=32*1024*1024,MAX_COUNT=100;



const ID=/^[a-f0-9]{32}$/;



const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));



const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};







export function installArtifacts(ctx,{directory,authorized}){



  fs.mkdirSync(directory,{recursive:true,mode:0o700});



  const list=()=>fs.readdirSync(directory).filter(n=>/^[a-f0-9]{32}\.json$/.test(n)).map(n=>{



    try{const p=path.join(directory,n);if(fs.lstatSync(p).isSymbolicLink()||fs.statSync(p).size>4096)return null;



      const v=JSON.parse(fs.readFileSync(p,'utf8'));return ID.test(v.id)&&v.id+'.json'===n&&['html','svg'].includes(v.format)&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=MAX_FILE&&typeof v.title==='string'&&v.title.length<=80&&typeof v.created_at==='string'&&/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v.created_at)&&/^[a-f0-9]{64}$/.test(v.sha256)?v:null;



    }catch{return null;}



  }).filter(Boolean).sort((a,b)=>b.created_at.localeCompare(a.created_at));



  const tool=ctx.tools.register(defineTool({



    name:'publish_interactive_artifact',



    description:'Publish a completed self-contained HTML or SVG from the current workspace to the private phone works page. Inline SVG/CSS/JS only; no external resources. Max 1 MiB/file. Does not render or encode video.',



    parameters:{file_path:{type:'string',required:true,description:'Workspace path of an existing .html or .svg file'},title:{type:'string',required:true,description:'Short display title'}},



    output:{schema:{type:'object',additionalProperties:false,properties:{id:{type:'string',required:true},url:{type:'string',required:true},bytes:{type:'integer',required:true},sha256:{type:'string',required:true}}},render:(_args,value)=>[{type:'text',text:JSON.stringify(value)}]},



    isConcurrencySafe:()=>false,



    async execute(args,exec){



      if(typeof args.file_path!=='string'||args.file_path.length>4096||typeof args.title!=='string'||!args.title.trim()||args.title.length>80)throw new Error('Provide a file path and a title up to 80 characters');



      const format=path.extname(args.file_path).slice(1).toLowerCase();if(!['html','svg'].includes(format))throw new Error('Only HTML or SVG can be published');



      const entries=list();if(entries.length>=MAX_COUNT)throw new Error('Works storage is full; archive existing works before publishing');



      const cwd=exec.agent?.session.header.cwd;



      const target=await ctx.fs.resolve(args.file_path,{...(typeof cwd==='string'?{cwd}:{}),signal:exec.signal});



      const info=await ctx.fs.stat(target,exec.signal);if(info?.type!=='file')throw new Error('The artifact must be a regular file');



      const bytes=await ctx.fs.readBytes(target,exec.signal,MAX_FILE);



      if(!bytes.length||bytes.length>MAX_FILE)throw new Error('Artifact must be nonempty and at most 1 MiB');



      if(entries.reduce((n,e)=>n+e.bytes,0)+bytes.length>MAX_TOTAL)throw new Error('Works storage exceeds 32 MiB; archive existing works');



      if(exec.signal?.aborted)throw new Error('Publication cancelled');



      const id=randomBytes(16).toString('hex'),sha256=createHash('sha256').update(bytes).digest('hex');



      const content=path.join(directory,id+'.'+format),meta=path.join(directory,id+'.json');



      const record={id,format,title:args.title.trim(),bytes:bytes.length,sha256,created_at:new Date().toISOString(),source_path:typeof target==='string'?target:args.file_path,session_id:exec.agent?.session.id};



      fs.writeFileSync(content,bytes,{flag:'wx',mode:0o600});



      try{fs.writeFileSync(meta,JSON.stringify(record),{flag:'wx',mode:0o600});}



      catch(error){fs.unlinkSync(content);throw error;}



      ctx.emit('fs/observed',target,{kind:'present',version:info.version},exec);



      return {id,url:'/artifacts/'+id,bytes:bytes.length,sha256};



    },



    presentCall:args=>({card:'generic',title:'发布交互作品 '+args.title,kind:'write',locations:[{path:args.file_path}]})



  }));



  const route=ctx.webServer.register({kind:'prefix',path:'/artifacts',handler:(req,res)=>{



    const respond=(status,headers,body='')=>{res.writeHead(status,{...common,...headers});res.end(req.method==='HEAD'?undefined:body);};



    if(req.method!=='GET'&&req.method!=='HEAD'){respond(405,{'Allow':'GET, HEAD'});return;}



    if(!authorized(req)){respond(403,{});return;}



    let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{respond(400,{});return;}



    if(pathname==='/artifacts'||pathname==='/artifacts/'){

      respond(302,{'Location':'/projects'});return;





      const items=list();const body='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>作品 · DSH</title><style>'+QQ_PAGE_CSS+'</style><div class="works-page">'+QQ_BRAND+'<h1 class="qq-heading">作品</h1><main class="works-content">'+

        (items.length?'<table class="works-table"><thead><tr><th>名称</th><th>类型</th></tr></thead><tbody>'+items.map(v=>'<tr><td><div class="works-name"><img src="'+QQ_FILE_ICON+'" alt=""><a href="/artifacts/'+v.id+'">'+escape(v.title)+'</a></div></td><td>'+v.format.toUpperCase()+'</td></tr>').join('')+'</tbody></table>':'<div class="works-empty">还没有发布的作品。<br>这里收录已发布的动画和交互页面。<br>在对话中生成后，说“保存到作品”即可。</div>')+

        '<p class="works-footnote">支持 HTML／SVG，单个作品最大 1 MB。</p></main>'+QQ_WORKS_FOOTER+'</div></html>';

      respond(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"},body);return;



    }



    const match=/^\/artifacts\/([a-f0-9]{32})$/.exec(pathname);if(!match){respond(404,{});return;}



    const record=list().find(v=>v.id===match[1]);if(!record){respond(404,{});return;}



    try{



      const file=path.join(directory,record.id+'.'+record.format);



      if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>MAX_FILE)throw new Error();



      const body=fs.readFileSync(file);if(createHash('sha256').update(body).digest('hex')!==record.sha256)throw new Error();



      respond(200,{'Content-Type':record.format==='html'?'text/html; charset=utf-8':'image/svg+xml',



        'Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",'Content-Length':body.length},body);



    }catch{respond(404,{});}



  }});



  return ()=>{route();if(typeof tool==='function')tool();};



}



