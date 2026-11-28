/* EVOLUTION X self-contained offline shell. No private data cached. */
'use strict';
const CACHE='yugatneo-evolution-x-v10',PREFIX='yugatneo-evolution-x-';
const ASSETS=['./','./index.html','./engine.js','./game.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url),base=new URL(self.registration.scope);
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;
 const allowed=new Set(ASSETS.map(path=>new URL(path,base).href));
 if(!allowed.has(new URL(u.pathname,u.origin).href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate'){
   try{const response=await fetch(event.request);
    if(response.ok)await cache.put(event.request,response.clone());
    return response;
   }catch(_){return (await cache.match(event.request))||Response.error();}
  }
  const cached=await cache.match(event.request);
  if(cached)return cached;
  const response=await fetch(event.request);
  if(response.ok)await cache.put(event.request,response.clone());
  return response;
 })());
});
