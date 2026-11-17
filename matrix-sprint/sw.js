/* Scoped offline shell for YUGATNEO SPIRAL RUN: no personal data cached. */
'use strict';
const CACHE='yugatneo-spiral-run-v1';
const ROOT='yugatneo-spiral-run-';
const FILES=['./','./index.html','./engine.js','./game.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',ev=>ev.waitUntil((async()=>{
 const c=await caches.open(CACHE);
 await c.addAll(FILES);
 await self.skipWaiting();
})()));
self.addEventListener('activate',ev=>ev.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(ROOT)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',ev=>{
 if(ev.request.method!=='GET')return;
 const u=new URL(ev.request.url),base=new URL(self.registration.scope);
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;
 const allowed=new Set(FILES.map(p=>new URL(p,base).href));
 if(!allowed.has(new URL(u.pathname,u.origin).href))return;
 ev.respondWith((async()=>{
  const c=await caches.open(CACHE);
  if(ev.request.mode==='navigate'){
   try{
    const response=await fetch(ev.request);
    if(response.ok)await c.put(ev.request,response.clone());
    return response;
   }catch(_){return (await c.match(ev.request))||Response.error();}
  }
  const cached=await c.match(ev.request);
  if(cached)return cached;
  const response=await fetch(ev.request);
  if(response.ok)await c.put(ev.request,response.clone());
  return response;
 })());
});
