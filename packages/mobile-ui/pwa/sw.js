/* DSH Mobile Workbench: cache only public, fixed static shell files. */
'use strict'
const SHELL_CACHE = 'dsh-mobile-pwa-shell-v4-private-safe';
const SHELL_PATHS = new Set(['/pwa/manifest.json','/pwa/icons/icon-192.png','/pwa/icons/icon-512.png','/pwa/icons/icon-maskable-512.png']);
const T = {pushTitle:'DSH 任务完成',pushBody:'任务状态已更新。'};
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dsh-mobile-pwa-') && k !== SHELL_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request, url=new URL(req.url);
  if(url.origin!==self.location.origin || req.method!=='GET')return;
  if(SHELL_PATHS.has(url.pathname) && !url.search){event.respondWith(publicShell(req));return;}
  if(req.mode==='navigate')event.respondWith(fetch(req).catch(() => new Response('<!doctype html><meta charset="utf-8"><title>DSH 离线</title><p>无法连接服务器，请联网后重新打开。</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
  else event.respondWith(fetch(req));
});
async function publicShell(req){
  const cache=await caches.open(SHELL_CACHE);
  try {
    const res=await fetch(req);
    const policy=res.headers.get('cache-control')||'';
    const type=res.headers.get('content-type')||'';
    if(res.ok && !res.redirected && !/no-store|private/i.test(policy) && !/text\/html/i.test(type))await cache.put(req,res.clone());
    return res;
  } catch(error){const saved=await cache.match(req);if(saved)return saved;throw error;}
}
// ---- push (agent-done) notifications ------------------------------------
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { /* ignore */ }
  const title = data.title || T.pushTitle
  const options = {
    body: data.body || T.pushBody,
    icon: '/pwa/icons/icon-192.png',
    badge: '/pwa/icons/icon-192.png',
    tag: data.tag || 'dsh-agent-done',
    renotify: true,
    data: data.data || {}
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(target); return client.focus() }
      }
      return self.clients.openWindow(target)
    })
  )
})
