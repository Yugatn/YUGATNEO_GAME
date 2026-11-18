/* LABYRINTH X: isolated offline shell. No Telegram identity cached. */
'use strict';
const CACHE='yugatneo-maze-x-v2',PREFIX='yugatneo-maze-x-';
const ASSETS=['./','./index.html','./engine.js','./game.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(ASSETS);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url),base=new URL(self.registration.scope);
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return;
 const allowed=new Set(ASSETS.map(p=>new URL(p,base).href));
 if(!allowed.has(new URL(u.pathname,u.origin).href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate'){
   try{const res=await fetch(event.request);
    if(res.ok)await cache.put(event.request,res.clone());
    return res;
   }catch(_){return (await cache.match(event.request))||Response.error();}
  }
  const cached=await cache.match(event.request);
  if(cached)return cached;
  const response=await fetch(event.request);
  if(response.ok)await cache.put(event.request,response.clone());
  return response;
 })());
});
