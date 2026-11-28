/* Scoped offline shell; no user data caching. */
const PREFIX="yugatna-life-quest-shell-";
const CACHE=PREFIX+"v0.18";
const ROOT=new URL(self.registration.scope);
const PAGE=new URL("index.html",ROOT).href;
function isGameNavigation(request){
 if(request.method!=="GET"||request.mode!=="navigate")return false;
 const url=new URL(request.url);
 return url.origin===ROOT.origin&&(url.pathname===ROOT.pathname||url.pathname===new URL(PAGE).pathname);
}
self.addEventListener("install",event=>{
 event.waitUntil((async()=>{const cache=await caches.open(CACHE);const response=await fetch(PAGE,{cache:"reload"});if(!response.ok||!response.headers.get("content-type")?.includes("text/html"))throw Error("Offline shell unavailable");await cache.put(PAGE,response);await self.skipWaiting()})());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim()})());
});
self.addEventListener("fetch",event=>{
 if(!isGameNavigation(event.request))return;
 event.respondWith((async()=>{try{return await fetch(event.request)}catch(error){const cache=await caches.open(CACHE);const response=await cache.match(PAGE);if(response)return response;throw error}})());
});
