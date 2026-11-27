"use strict";
const CACHE="yugatneo-station-v1.7",BASE=self.registration.scope,CDN="https://cdn.emulatorjs.org/4.2.3/data/";
const SHELL=["index.html","display.js","display.css","mobile.css","controls.js","study.js","journal.html","player.html","nes-local.html","recovery.html","jsnes-local.js","jsnes-LICENSE.txt","manifest.webmanifest","icon.svg","roms/2048.b64","roms/pixel-viper.b64","roms/robotfindskitten.b64","roms/rhde.b64","roms/gba-pong.b64","roms/gba-rkanoid.b64","roms/gba-cascade7.b64","roms/LICENSES.md"].map(x=>new URL(x,BASE).href);
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})));await self.skipWaiting()})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("yugatneo-station-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET"||r.headers.has("Range"))return;const u=new URL(r.url);
const isLocal=u.origin===self.location.origin&&u.pathname.startsWith(new URL(BASE).pathname);const isCore=r.url.startsWith(CDN);
if(!isLocal&&!isCore)return;
if(isLocal){const canonical=u.pathname===new URL(BASE).pathname?SHELL[0]:u.origin+u.pathname;if(!SHELL.includes(canonical))return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const res=await fetch(r);if(res.ok){await c.put(canonical,res.clone());return res}return await c.match(canonical)||res}catch{return await c.match(canonical)||Response.error()}})());return}
e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==="opaque")try{await c.put(r,res.clone())}catch{}return res})())});
