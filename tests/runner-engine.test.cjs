'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Core=require('../runner/engine.js');
const C=Core.CONFIG;
const T=1/60;

function running(){
  const state=Core.newGame();
  Core.start(state);
  return state;
}
function advance(s,seconds){
  for(let t=0;t<seconds;t+=T)Core.step(s,T,()=>0.5);
}
assert.equal(Core.newGame().phase,'ready');
const initial=Core.newGame();
assert.equal(Core.jump(initial),true,'First jump should start the game');
assert.equal(initial.phase,'running');
assert.ok(initial.player.vy<0);
assert.equal(Core.jump(initial),false,'No double jump without boost');
advance(initial,1);
assert.equal(Core.grounded(initial),true,'Normal jump should land');
assert.equal(initial.player.extraJumps,0);

const boosted=running();
boosted.boost=8;
assert.equal(Core.jump(boosted),true);
assert.equal(Core.jump(boosted),true,'Matrix mode grants one aerial jump');
assert.equal(Core.jump(boosted),false,'No infinite extra jumps');
assert.equal(boosted.player.extraJumps,1);
assert.ok(boosted.player.vy<C.JUMP,'Matrix aerial jump should be energetic');

function peak(boost) {
  const s=running();
  s.boost=boost;
  Core.jump(s);
  let min=s.player.y;
  for(let i=0;i<46;i++){Core.step(s,T,()=>0.6);min=Math.min(min,s.player.y);}
  return C.FLOOR-C.PLAYER_H-min;
}
assert.ok(peak(8)>peak(0)*1.45,'Boost should noticeably increase jump height');

const portal=running();
portal.player.y=261;
portal.player.vy=-150;
portal.portals=[{x:C.PLAYER_X,y:C.FLOOR-113,rx:31,ry:49}];
const collected=Core.step(portal,T,()=>0.5);
assert.ok(collected.includes('portal'),'Aerial portal entry should activate Matrix mode');
assert.ok(portal.boost>7.9);
assert.equal(portal.portals.length,0);
assert.equal(portal.bonus,175);
const pointsBefore=portal.score;
Core.step(portal,T,()=>0.5);
assert.ok(portal.score>=pointsBefore,'Portal points must not freeze or decrease');

const groundPortal=running();
groundPortal.portals=[{x:C.PLAYER_X,y:C.FLOOR-113,rx:31,ry:49}];
Core.step(groundPortal,T,()=>0.5);
assert.equal(groundPortal.boost,0,'Ground runner must jump into portal');

const hit=running();
hit.obstacles=[{x:C.PLAYER_X-5,w:42,h:58,type:'pillar'}];
const hitEvents=Core.step(hit,T,()=>0.5);
assert.ok(hitEvents.includes('hit'));
assert.equal(hit.phase,'gameover');
const scoreAfterHit=hit.score;
assert.deepEqual(Core.step(hit,T,()=>0.5),[]);
assert.equal(hit.score,scoreAfterHit);
assert.equal(Core.jump(hit),false);

const pausing=running();
assert.equal(Core.pause(pausing),true);
const pausedTime=pausing.time;
assert.deepEqual(Core.step(pausing,0.5,()=>0.5),[]);
assert.equal(pausing.time,pausedTime);
assert.equal(Core.start(pausing),true);
Core.step(pausing,1,()=>0.5);
assert.ok(pausing.time<=1/30+1e-6,'Cap large frame gaps');

const expiration=running();
expiration.boost=0.005;
assert.ok(Core.step(expiration,T,()=>0.5).includes('boost-ended'));
assert.equal(expiration.boost,0);
assert.equal(Core.jump(expiration),true);
assert.equal(expiration.player.vy,C.JUMP,'Normal jump returns after bonus');

const html=fs.readFileSync(path.join(__dirname,'../runner/index.html'),'utf8');
assert.match(html,/width=device-width/);
assert.match(html,/viewport-fit=cover/);
assert.match(html,/id="game"/);
assert.match(html,/id="jump"/);
assert.match(html,/src="\.\/engine\.js"/);
assert.match(html,/src="\.\/game\.js"/);
assert.ok(!html.includes('onclick='),'Do not use inline event handlers');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'No duplicate HTML element IDs');

const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../runner/manifest.webmanifest'),'utf8'));
assert.equal(manifest.start_url,'./index.html');
assert.equal(manifest.scope,'./');
assert.equal(manifest.display,'standalone');
for(const p of ['engine.js','game.js','manifest.webmanifest','sw.js','icon.svg']){
 assert.ok(fs.existsSync(path.join(__dirname,'../runner',p)),p);
}
console.log('Runner physics, portal bonuses, collisions, pause, HTML and PWA smoke checks passed');
