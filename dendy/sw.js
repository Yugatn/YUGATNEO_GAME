"use strict";
const CACHE="yugatneo-dendy-v2.1",CORE="https://cdn.jsdelivr.net/npm/jsnes@2.1.0/dist/jsnes.min.js",BASE=self.registration.scope;
const SHELL=new URL("index.html",BASE).href;
self.addEventListener("install",e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll([new Request(SHELL,{cache:"reload"}),new Request(CORE,{mode:"cors",cache:"reload"}),new Request(new URL("manifest.webmanifest",BASE),{cache:"reload"}),new Request(new URL("icon.svg",BASE),{cache:"reload"})]);await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("yugatneo-dendy-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const url=new URL(r.url);if(r.url===CORE){e.respondWith((async()=>{const c=await caches.open(CACHE);return await c.match(CORE)||await fetch(r)})());return}
if(r.mode==="navigate"&&url.origin===self.location.origin&&(url.pathname===new URL(BASE).pathname||url.pathname===new URL(SHELL).pathname)){e.respondWith((async()=>{const c=await caches.open(CACHE);try{const res=await fetch(r);if(res.ok)await c.put(SHELL,res.clone());return res}catch{return await c.match(SHELL)||Response.error()}})());return}
if([new URL("manifest.webmanifest",BASE).href,new URL("icon.svg",BASE).href].includes(r.url))e.respondWith((async()=>{const c=await caches.open(CACHE);return await c.match(r)||await fetch(r)})())});
