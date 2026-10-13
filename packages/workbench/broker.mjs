import {randomBytes, timingSafeEqual, createHash} from 'node:crypto';

export const OPERATIONS = ['status','read','tap','long_press','type','back','home','open_app','stop'];
const PACKAGE=/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const SESSION=/^[A-Za-z0-9:_~-]{1,256}$/;
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export class PhoneBroker {
 constructor({now=Date.now}={}){this.now=now;this.devices=new Map();}
 prune(){for(const [id,d] of this.devices)if(d.expiresAt<=this.now()){d.pending=null;this.devices.delete(id);} }
 owner(token){return createHash('sha256').update(token).digest('hex').slice(0,24);}
 start(owner,body){
  this.prune();if(!SESSION.test(body.sessionId)||!/^[a-f0-9]{64}$/.test(body.key)||!Array.isArray(body.apps)||!body.apps.length||body.apps.length>20)throw Error('Invalid phone grant');
  const apps=body.apps.map(a=>{if(!a||!PACKAGE.test(a.package)||typeof a.label!=='string'||a.label.length>100)throw Error('Invalid app');return {package:a.package,label:a.label};});
  if(this.devices.size>=4&&!this.devices.has(owner))throw Error('Too many phone sessions');
  const d={owner,sessionId:body.sessionId,key:body.key,apps,expiresAt:this.now()+600000,lastSeen:this.now(),pending:null,commands:0};
  this.devices.set(owner,d);return {deviceId:owner,expiresAt:d.expiresAt,ttlMs:600000};
 }
 native(owner,key){this.prune();const d=this.devices.get(owner);if(!d||!same(d.key,key))throw Error('Phone session is off');return d;}
 stop(owner,key){this.native(owner,key);this.devices.delete(owner);return {ok:true};}
 poll(owner,key){
  const d=this.native(owner,key);d.lastSeen=this.now();const p=d.pending;
  if(!p||p.delivered||p.deadline<=this.now())return {command:null,remainingMs:d.expiresAt-this.now()};
  // At-most-once delivery: a lost response is never redelivered automatically.
  p.delivered=true;return {command:{id:p.id,...p.args,remainingMs:p.deadline-this.now()},remainingMs:d.expiresAt-this.now()};
 }
 result(owner,key,body){
  const d=this.native(owner,key),p=d.pending;
  const digest=createHash('sha256').update(JSON.stringify(body.result)).digest('hex');
  if(d.lastResult?.id===body.id&&d.lastResult.digest===digest)return {ok:true};
  if(!p||!p.delivered||p.id!==body.id||p.deadline<=this.now()||p.result!==undefined)throw Error('No outstanding command');
  if(!body.result||typeof body.result!=='object'||Array.isArray(body.result)||Buffer.byteLength(JSON.stringify(body.result))>49152)throw Error('Result exceeds 48 KiB');
  p.result=body.result;d.lastResult={id:body.id,digest};d.lastSeen=this.now();return {ok:true};
 }
 status(sessionId){this.prune();return [...this.devices.values()].filter(d=>d.sessionId===sessionId).map(d=>({deviceId:d.owner,apps:d.apps,remainingSeconds:Math.max(0,Math.floor((d.expiresAt-this.now())/1000)),online:this.now()-d.lastSeen<12000,commandsUsed:d.commands}));}
 validate(args,d){
  if(!OPERATIONS.includes(args.operation)||args.operation==='status')throw Error('Unknown operation');
  if(args.operation==='open_app'&&!d.apps.some(a=>a.package===args.package))throw Error('App was not granted on the phone');
  if(['tap','long_press','type'].includes(args.operation)&&!/^[-A-Za-z0-9]{1,64}$/.test(args.screen_id||''))throw Error('Read the screen first; provide its screen_id');
  if(['tap','long_press'].includes(args.operation)&&!(Number.isSafeInteger(args.node_id)&&args.node_id>=0&&args.node_id<180)&&!(Number.isFinite(args.x)&&args.x>=0&&args.x<=1&&Number.isFinite(args.y)&&args.y>=0&&args.y<=1))throw Error('Specify a node_id or normalized x/y');
  if(args.operation==='swipe'&&['x','y','x2','y2'].some(k=>!Number.isFinite(args[k])||args[k]<0||args[k]>1))throw Error('Swipe coordinates must be 0..1');
  if(args.operation==='type'&&(typeof args.text!=='string'||args.text.length>1000))throw Error('Text must be at most 1000 characters');
 }
 async execute(sessionId,args,signal){
  this.prune();if(!sessionId)throw Error('Open a DSH chat first');
  if(args.operation==='status')return {devices:this.status(sessionId),instructions:'APK 1.5: More → 手机操控, grant apps, enable accessibility and start the 10-minute session. Grants apply only to this chat.'};
  const available=[...this.devices.values()].filter(d=>d.sessionId===sessionId&&(!args.device_id||d.owner===args.device_id));
  if(available.length!==1)throw Error('No unique phone granted to this chat. Enable phone control in this chat first.');
  const d=available[0];this.validate(args,d);
  if(args.operation==='stop'){this.devices.delete(d.owner);return {ok:true,stopped:true};}
  if(this.now()-d.lastSeen>=12000)throw Error('Phone is offline. No command queued.');
  if(d.pending)throw Error('A phone command is already outstanding');
  if(d.commands>=60)throw Error('Session reached 60 commands; restart on the phone');
  if(signal?.aborted)throw Error('Phone command cancelled');
  const allowed=['operation','screen_id','node_id','x','y','x2','y2','text','package'];const clean={};for(const k of allowed)if(args[k]!==undefined)clean[k]=args[k];
  const p={id:randomBytes(16).toString('hex'),args:clean,deadline:Math.min(this.now()+45000,d.expiresAt),delivered:false};d.pending=p;d.commands++;
  try{
   while(this.now()<p.deadline){
    if(signal?.aborted)throw Error('Phone command cancelled; it will not be retried');
    if(this.devices.get(d.owner)!==d)throw Error('Phone control was stopped');
    if(p.result!==undefined)return p.result;
    await new Promise(resolve=>{const timer=setTimeout(resolve,150);timer.unref?.();});
   }
   throw Error('Phone result timed out; action is NOT retried. Read the screen to verify.');
  }finally{if(d.pending===p)d.pending=null;}
 }
 dispose(){this.devices.clear();}
}
