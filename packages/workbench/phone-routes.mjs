import fs from 'node:fs';
export function makePhoneHandler(broker,{gateState,entry}){
 const owner=req=>{
  const cookie=/(?:^|;\s*)lg_device=([^;]+)/.exec(req.headers.cookie||'')?.[1];if(!cookie||cookie.length>256)return null;
  try{const s=JSON.parse(fs.readFileSync(gateState,'utf8'));const d=Object.values(s.devices||{}).find(d=>d?.token===cookie&&(d.role||'web')==='web');if(!d)broker.devices.delete(broker.owner(cookie));return d?broker.owner(cookie):null;}catch{return null;}
 };
 return async(req,res)=>{
  const json=(status,value)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(value));};
  const id=owner(req);if(!id){json(403,{error:'Pair this APK first'});return;}
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/phone-control/entry.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(entry);return;}
  if(pathname==='/phone-control/native'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"});res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><p>手机操控需要 DSH APK 1.5。请在新版 APK 的对话中点击“更多 → 手机操控”。</p>');return;}
  if(!['/phone-control/start','/phone-control/poll','/phone-control/result','/phone-control/stop'].includes(pathname)){json(404,{error:'Not found'});return;}
  if(req.method!=='POST'){json(405,{error:'POST required'});return;}
  if(req.headers['x-dsh-native']!=='1'||req.headers['sec-fetch-site']==='cross-site'){json(403,{error:'Native request required'});return;}
  // The gateway rewrites Origin for host APIs. Native HttpURLConnection
  // sends none, so reject EVERY Origin here rather than mistaking the
  // rewritten loopback Origin for trusted browser ingress.
  if(req.headers.origin){json(403,{error:'Native transport only'});return;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(415,{error:'JSON required'});return;}
  let body;
  try{
   let bytes=0;const chunks=[];await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Body timeout')),5000);timer.unref();req.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){reject(Error('Body too large'));req.destroy();}else chunks.push(chunk);});req.on('end',()=>{clearTimeout(timer);resolve();});req.on('error',e=>{clearTimeout(timer);reject(e);});});
   body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();
  }catch{json(400,{error:'Invalid or oversized JSON'});return;}
  try{
   const key=req.headers['x-dsh-phone'];let result;
   if(pathname.endsWith('/start')){if(typeof key!=='string'||key!==body.key)throw Error('Native key missing');result=broker.start(id,body);}
   else if(pathname.endsWith('/poll'))result=broker.poll(id,key);
   else if(pathname.endsWith('/result'))result=broker.result(id,key,body);
   else result=broker.stop(id,key);
   json(200,result);
  }catch(e){json(409,{error:e.message});}
 };
}
