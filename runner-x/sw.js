/* Optional standalone offline shell. Never caches Telegram user data. */
'use strict';
const NAME='yugatneo-matrix-runner-x-v1', PREFIX='yugatneo-matrix-runner-x-';
const ASSETS=['./','./index.html','./engine.js','./render.js','./app.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const c=await caches.open(NAME);await c.addAll(ASSETS);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==NAME).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET')return;
 const target=new URL(r.url),scope=new URL(self.registration.scope);
 if(target.origin!==scope.origin||!target.pathname.startsWith(scope.pathname))return;
 const allowed=new Set(ASSETS.map(p=>new URL(p,scope).pathname));
 if(!allowed.has(target.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(NAME);
  if(r.mode==='navigate'){
   try{const res=await fetch(r);if(res.ok)await cache.put(r,res.clone());return res;}
   catch{return(await cache.match(r))||Response.error();}
  }
  const old=await cache.match(r);if(old)return old;
  const res=await fetch(r);if(res.ok)await cache.put(r,res.clone());return res;
 })());
});