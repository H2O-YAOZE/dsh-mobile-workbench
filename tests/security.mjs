import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {apply} from '../packages/workbench/index.js';
import {PhoneBroker} from '../packages/workbench/broker.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dsh-release-test-'));
const gate=path.join(dir,'gate.json');
const token='synthetic-device-token';
await fs.writeFile(gate,JSON.stringify({devices:{one:{token,role:'web'}}}));
const routes=[],cleanup=[];
const ctx={connection:{admit(req){return req.headers['x-fixture-denied']?{rejection:{}}:{};}},sessions:{list(){return [];}},webServer:{register(route){routes.push(route);return()=>{};}},tools:{register(){return()=>{};}},on(){return()=>{};},effect(f){cleanup.push(f());}};
apply(ctx,{dataDirectory:path.join(dir,'usage'),gateState:gate,projectDirectory:path.join(dir,'projects'),sessionRoot:path.join(dir,'sessions')});
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const route=routes.filter(r=>pathname.startsWith(r.path)).sort((a,b)=>b.path.length-a.path.length)[0];if(route)Promise.resolve(route.handler(req,res)).catch(()=>{res.writeHead(500);res.end();});else{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
try{
  for(const route of ['/usage','/usage/','/usage/events','/artifacts','/projects/api/catalog']){
    for(const headers of [{},{'x-forwarded-for':'127.0.0.1'},{cookie:'lg_device=invalid'},{cookie:'lg_device='+token,'x-fixture-denied':'1'}]){
      const response=await fetch(origin+route,{headers});assert.equal(response.status,403,route);await response.text();
    }
  }
  const headers={cookie:'lg_device='+token};
  const usage=await fetch(origin+'/usage',{headers});assert.equal(usage.status,200);assert((await usage.text()).includes('snapshot'));
  const catalog=await fetch(origin+'/projects/api/catalog',{headers});assert.equal(catalog.status,200);assert.deepEqual((await catalog.json()).projects,[]);
  await fs.writeFile(gate,JSON.stringify({devices:{one:{token,role:'desktop-client'}}}));assert.equal((await fetch(origin+'/usage',{headers})).status,403);
  await fs.writeFile(gate,JSON.stringify({devices:{}}));assert.equal((await fetch(origin+'/usage',{headers})).status,403);
  const broker=new PhoneBroker();for(const end of [0.5,0.9])assert.throws(()=>broker.validate({operation:'swipe',screen_id:'fresh',x:0.5,y:0.5,x2:end,y2:end},{apps:[]}));
  const handlers={},writes=[],deleted=[];
  let offline=false,policy='no-store';
  const cache={match:async()=>undefined,put:async(req)=>{writes.push(req.url);}};
  const context={URL,Response,Promise,console,caches:{open:async()=>cache,keys:async()=>['dsh-mobile-pwa-runtime-v3','dsh-mobile-pwa-shell-v3','unrelated-app'],delete:async k=>deleted.push(k)},fetch:async()=>{if(offline)throw Error('offline');return new Response('private-fixture',{headers:{'cache-control':policy,'content-type':'application/json'}});},self:{location:{origin:'https://example.invalid'},skipWaiting(){},clients:{claim:async()=>{}},addEventListener(type,fn){handlers[type]=fn;}}};
  vm.runInNewContext(await fs.readFile(new URL('../packages/mobile-ui/pwa/sw.js',import.meta.url),'utf8'),context);
  async function request(route,mode='cors'){let response;handlers.fetch({request:{url:'https://example.invalid'+route,method:'GET',mode},respondWith(p){response=p;}});return response;}
  for(const route of ['/projects/api/source','/projects/api/mail-download','/usage','/artifacts/fixture'])assert.equal(await (await request(route)).text(),'private-fixture');
  await request('/usage','navigate');await request('/pwa/manifest.json');assert.equal(writes.length,0);
  policy='public,max-age=60';await request('/pwa/manifest.json');assert.equal(writes.length,1);
  offline=true;await assert.rejects(request('/projects/api/source'));const fallback=await request('/usage','navigate');assert.equal(fallback.status,503);assert(!(await fallback.text()).includes('private-fixture'));
  let activated;handlers.activate({waitUntil(p){activated=p;}});await activated;assert.deepEqual(deleted,['dsh-mobile-pwa-runtime-v3','dsh-mobile-pwa-shell-v3']);
  console.log('Release security passed: actual HTTP routes, empty-state boot, role/revocation, swipe rejection, private cache isolation');
}finally{for(const fn of cleanup)fn?.();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
