import {spawn} from 'node:child_process'
const collector=()=>{
 let data=Buffer.alloc(0),total=0
 return {push(chunk){total+=chunk.length;data=Buffer.concat([data,chunk]);if(data.length>131072)data=data.subarray(data.length-131072)},
 readFrom(offset){const start=total-data.length;return {text:offset<start?'':data.subarray(Math.max(0,offset-start)).toString('utf8'),nextOffset:total,lossy:offset<start}}}
}
/** A persistent network gateway belongs to the host, not a one-shot tool scope. */
export function spawnPersistentGateway({nodePath,serverFile,cwd,env}){
 const stdout=collector(),stderr=collector()
 const child=spawn(nodePath,[serverFile],{cwd,env,stdio:['ignore','pipe','pipe'],shell:false})
 child.stdout.on('data',chunk=>stdout.push(chunk));child.stderr.on('data',chunk=>stderr.push(chunk))
 let killTimer
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(exitCode,signal)=>{clearTimeout(killTimer);resolve({exitCode,signal})})})
 return {done,collected:{stdout,stderr},terminate(){
  if(child.exitCode!==null||child.signalCode!==null)return
  child.kill('SIGTERM');killTimer=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL')},3000);killTimer.unref()
 }}
}
