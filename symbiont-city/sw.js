/* SIMBIONT CITY offline assets only; isolates PWA from all other games. */
'use strict';
const CACHE='yugatneo-symbiont-city-v6',PREFIX='yugatneo-symbiont-city-';
const ASSETS=['./','./index.html','./style.css','./lab.css','./workshops.css','./content.js','./engine.js','./game.js','./decisions.js','./lab-ui.js','./workshops.js','./workshops-ui.js','./help-route.js','./help-route-ui.js','./help-route.css','./academy.js','./academy-ui.js','./academy.css','./spiral-runner.js','./spiral-runner-ui.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(ASSETS);
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const uri=new URL(e.request.url),base=new URL(self.registration.scope);
 if(uri.origin!==base.origin||!uri.pathname.startsWith(base.pathname))return;
 const permitted=new Set(ASSETS.map(p=>new URL(p,base).href));
 if(!permitted.has(new URL(uri.pathname,uri.origin).href))return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(e.request.mode==='navigate'){
   try{const fresh=await fetch(e.request);
    if(fresh.ok)await cache.put(e.request,fresh.clone());return fresh;
   }catch(_){return (await cache.match(e.request))||Response.error();}
  }
  const stored=await cache.match(e.request);
  if(stored)return stored;
  const response=await fetch(e.request);
  if(response.ok)await cache.put(e.request,response.clone());
  return response;
 })());
});
