import { createAuthorizer } from './authorization.js';
import { installProjectWorkspace } from './projects.js';

import {defineTool} from '@deepseek-ai/dsh-tools';

import { installPhoneControl } from './phone-control.js';

import fs from 'node:fs';
import os from 'node:os';



import path from 'node:path';



import { fileURLToPath } from 'node:url';



import { createCloudMeter } from './cloud-meter.js';



import { installArtifacts } from './artifacts.js';







export const name = 'dsh-usage-sync';



export const inject = ['webServer','sessions','tools','fs','llm','sessionQuery','workspaceController','connection'];



const ROOT = path.dirname(fileURLToPath(import.meta.url));



const MAX = 512 * 1024 + 100;



const MIME = {'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};



export function apply(ctx, config = {}) {



  const directory = config.dataDirectory || path.join(os.homedir(), '.dsh', 'usage-sync');



  const gate = config.gateState || path.join(os.homedir(), '.dsh', 'lan-gate-state.json');



  fs.mkdirSync(directory, { recursive:true, mode:0o700 });



  const latest = path.join(directory, 'latest.json');



  const clients = new Map();



  let snapshot = null;



  let desktop = null, meter = null, revision = 0;



  const refresh = (notify=false) => {



    const cloud = meter?.snapshot();



    snapshot = {...(desktop || {schema:1,daily:[],models:[],apps:[],source_daily:[]}),



      desktop_available:!!desktop,dsh_cloud:cloud,



      snapshot_id:(desktop?.snapshot_id||'no-computer')+':dsh:'+revision+':'+(cloud?.today||'')};



    if(notify)for (const [res, client] of clients) {



      if (authorized(client.req)) send(res, snapshot); else res.end();



    }



  };



  const read = () => {



    try {



      if (fs.statSync(latest).size > MAX) return null;



      const next = JSON.parse(fs.readFileSync(latest, 'utf8'));



      if (next.schema !== 1 || typeof next.snapshot_id !== 'string' || !Array.isArray(next.daily) || !Array.isArray(next.models)) return null;



      return next;



    } catch { return null; }



  };



  const authorized = createAuthorizer(ctx.connection, gate);



  const send = (res, data) => {



    if (res.destroyed || res.writableEnded) { clients.delete(res); return; }



    const client = clients.get(res);



    if (!client) return;



    if (client.blocked) { client.pending = true; return; }



    if (!res.write('event: snapshot\ndata: ' + JSON.stringify(data) + '\n\n')) {



      // A normal 150 KiB snapshot exceeds Node's stream high-water mark.



      // Wait for drain; only genuinely stalled clients are disconnected.



      client.blocked = true;



      client.timer = setTimeout(() => res.end(), 15000); client.timer.unref();



      res.once('drain', () => {



        clearTimeout(client.timer); client.blocked = false;



        if (client.pending) { client.pending = false; send(res, snapshot); }



      });



    }



  };



  const removePhoneControl=installPhoneControl(ctx,{gateState:gate});

  const projectWorkspace=installProjectWorkspace(ctx,{directory:config.projectDirectory||path.join(os.homedir(), '.dsh', 'project-workspace'),authorized,defineTool});



  const removeArtifacts=installArtifacts(ctx,{directory:config.artifactDirectory||path.join(path.dirname(directory),'artifacts'),authorized});



  desktop = read();



  meter = createCloudMeter(ctx,{directory,sessionRoot:config.sessionRoot,onChange:()=>{revision++;refresh(true);}});



  refresh();



  const watcher = fs.watch(directory, (_, filename) => {



    if (filename !== 'latest.json') return;



    const next = read();



    if (!next || next.snapshot_id === desktop?.snapshot_id) return;



    desktop = next;refresh(true);



  });



  const heartbeat = setInterval(() => {



    for (const [res, client] of clients) {



      if (!authorized(client.req)) res.end();



      else if (!client.blocked) res.write(': keepalive\n\n');



    }



  }, 30000);



  heartbeat.unref();



  const route = ctx.webServer.register({kind:'prefix',path:'/usage',handler:(req,res) => {
    if (!authorized(req)) { res.writeHead(403,{'Cache-Control':'no-store'}); res.end(); return; }



    let pathname;



    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400);res.end();return; }



    const assets = {'/usage/app.js':'app.js','/usage/usage-view.js':'usage-view.js','/usage/style.css':'style.css','/usage/entry.js':'entry.js',"/usage/onboarding/e32334c2d3bc79a11503f0827386d806158025a04a8bfca163cb0962a81c13f4.png":"onboarding/e32334c2d3bc79a11503f0827386d806158025a04a8bfca163cb0962a81c13f4.png","/usage/onboarding/09eeea3d19c00a109a55a5a961f22e5f4a7349f3c3d5d73de219646f3c8612e1.png":"onboarding/09eeea3d19c00a109a55a5a961f22e5f4a7349f3c3d5d73de219646f3c8612e1.png","/usage/onboarding/a04416e5636f4b54cc229c8ea1362b0b3bf177df913d97b13d8c08f3b0884dff.png":"onboarding/a04416e5636f4b54cc229c8ea1362b0b3bf177df913d97b13d8c08f3b0884dff.png","/usage/onboarding/06e69ce3a3cce38ce2f5fb84cb5deb752ae81c88b538d2b8c7b1eba9b7d36f50.png":"onboarding/06e69ce3a3cce38ce2f5fb84cb5deb752ae81c88b538d2b8c7b1eba9b7d36f50.png","/usage/onboarding/019cdf08456bd7b9e535838970665e5bad32ad07b545bba9bba33bd7ea74440b.png":"onboarding/019cdf08456bd7b9e535838970665e5bad32ad07b545bba9bba33bd7ea74440b.png","/usage/onboarding/4911e0598dcce52542308ad466606eea1c7023f264cd2ed23994b46961eb7b79.png":"onboarding/4911e0598dcce52542308ad466606eea1c7023f264cd2ed23994b46961eb7b79.png","/usage/onboarding/d903f6d2cbf0569122bb7012fe3e313293eb6d100d20efdabb893ee26d7cff2c.png":"onboarding/d903f6d2cbf0569122bb7012fe3e313293eb6d100d20efdabb893ee26d7cff2c.png","/usage/onboarding/442d361e4c44c0e0d387e3b4cddad9a869fcc2a097943e0d4a65af7bb16a8e71.png":"onboarding/442d361e4c44c0e0d387e3b4cddad9a869fcc2a097943e0d4a65af7bb16a8e71.png"};



    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return; }



    const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};



    if (pathname === '/usage/events') {



      if (!authorized(req)) { res.writeHead(403,headers);res.end();return; }



      if (req.method === 'HEAD') { res.writeHead(200,headers);res.end();return; }



      if (clients.size >= 8) { res.writeHead(503,headers);res.end();return; }



      res.writeHead(200,{...headers,'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});



      res.flushHeaders(); clients.set(res, {req,blocked:false,pending:false,timer:null});



      const close = () => {clearTimeout(clients.get(res)?.timer);clients.delete(res);};



      res.on('close',close);res.on('error',close);



      res.write('retry: 5000\n\n');



      refresh();



      const alreadyRendered = new URL(req.url,'http://localhost').searchParams.get('last');



      if (!snapshot || alreadyRendered !== snapshot.snapshot_id) send(res,snapshot);



      return;



    }



    if (pathname === '/usage' || pathname === '/usage/') {



      refresh();



      const state = JSON.stringify(snapshot).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');



      const body = fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace('<!--SNAPSHOT-->',state).replace('<html ',new URL(req.url,'http://localhost').searchParams.get('embedded')==='1'?'<html data-embedded="" ':'<html ').replace(/<nav class="bottom-nav"[\s\S]*?<\/nav>/,markup=>new URL(req.url,'http://localhost').searchParams.get('embedded')==='1'?'':markup);



      res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'",'Content-Length':Buffer.byteLength(body)});



      res.end(req.method === 'HEAD' ? undefined : body);return;



    }



    if (assets[pathname]) {



      const body=fs.readFileSync(path.join(ROOT,assets[pathname]));



      res.writeHead(200,{...headers,...(pathname.startsWith('/usage/onboarding/')?{'Cache-Control':'private, max-age=31536000, immutable'}:{}),'Content-Type':MIME[path.extname(pathname)],'Content-Length':body.length});



      res.end(req.method === 'HEAD' ? undefined : body);return;



    }



    res.writeHead(404,headers);res.end();



  }});



  const off = ctx.on('webserver/index-inject', table => {



    table.push({kind:'script-src',placement:'head',src:'/usage/entry.js?rev=20261011-navigation-2'});



    table.push({kind:'style',text:'[data-usage-entry]{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;gap:4px;padding:7px 9px;margin:0 6px;color:inherit;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:9px;text-decoration:none;font:inherit;font-size:12px;white-space:nowrap}[data-usage-entry]:focus-visible{outline:2px solid #458aff;outline-offset:2px}'});



  });



  ctx.effect(() => () => {



    projectWorkspace.dispose();meter.dispose();off?.();route();removeArtifacts();removePhoneControl();watcher.close();clearInterval(heartbeat);



    for(const res of clients.keys())res.end();clients.clear();



  },'usage-sync: cleanup');



  console.info('[usage-sync] computer pushes and native cloud accounting ready; no client polling');



}



