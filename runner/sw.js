/* Scope is /runner/ only. No private data is stored in Cache Storage. */
'use strict';
const CACHE='yugatneo-matrix-runner-v1';
const PREFIX='yugatneo-matrix-runner-';
const SHELL=['./','./index.html','./engine.js','./game.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const base=new URL(self.registration.scope);
  if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
  const allowed=new Set(SHELL.map(p=>new URL(p,base).href));
  const key=new URL(url.pathname,url.origin).href;
  if(!allowed.has(key))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(req.mode==='navigate'){
      try{
        const res=await fetch(req);
        if(res.ok)await cache.put(key,res.clone());
        return res;
      }catch(_){
        return (await cache.match(key)) || Response.error();
      }
    }
    const old=await cache.match(key);
    if(old)return old;
    const res=await fetch(req);
    if(res.ok)await cache.put(key,res.clone());
    return res;
  })());
});
