/* YUGATNEO MATRIX CHESS offline shell: no personal data or chat messages cached. */
'use strict';
const CACHE='yugatneo-matrix-chess-v2';
const PREFIX='yugatneo-matrix-chess-';
const FILES=['./','./index.html','./board-layout.css','./puzzles.js','./manifest.webmanifest','./icon.svg'];
const ENGINE='https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(FILES);
 try{const response=await fetch(ENGINE,{mode:'cors'});if(response.ok)await cache.put(ENGINE,response.clone());}catch(_){}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const u=new URL(event.request.url);
 const base=new URL(self.registration.scope);
 const allowed=new Set(FILES.map(x=>new URL(x,base).href));
 if(u.origin===base.origin&&!u.pathname.startsWith(base.pathname))return;
 if(u.href!==ENGINE&&!allowed.has(new URL(u.pathname,u.origin).href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate'){
   try{const response=await fetch(event.request);
    if(response.ok)await cache.put(event.request,response.clone());
    return response;
   }catch(_){return (await cache.match(event.request))||Response.error();}
  }
  const hit=await cache.match(event.request);
  if(hit)return hit;
  const response=await fetch(event.request);
  if(response.ok)await cache.put(event.request,response.clone());
  return response;
 })());
});
