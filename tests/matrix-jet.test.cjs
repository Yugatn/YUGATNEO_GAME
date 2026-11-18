'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../matrix-jet/engine.js');
function fly(seed=7){
 const s=E.create(seed);assert.equal(E.start(s),true);
 s.spawnIn=999;s.nextPortalAt=Infinity;
 return s;
}
function tick(s,count=1){let ev=[];for(let i=0;i<count;i++)ev.push(...E.step(s,1/60));return ev;}
function put(s,kind,x=s.x,alt=s.altitude,y=E.C.PLAYER_Y-.003){
 const e={id:++s.nextId,kind,x,altitude:alt,y,r:kind==='cloud'?.08:.065,resolved:false,hit:false};
 s.entities.push(e);return e;
}
test('launch, pause and invalid time do not advance idle flight',()=>{
 const s=E.create();assert.equal(s.phase,'ready');assert.deepEqual(E.step(s,1),[]);
 assert.equal(E.start(s),true);tick(s,10);const d=s.distance;
 assert.ok(d>0);assert.equal(E.pause(s),true);
 assert.deepEqual(E.step(s,30),[]);assert.equal(s.distance,d);
 assert.equal(E.start(s),true);assert.deepEqual(E.step(s,-1),[]);
 assert.equal(E.start(s),false);
});
test('steering is responsive but clamped inside playable air corridor',()=>{
 const s=fly();
 assert.ok(E.aim(s,-5));assert.equal(s.targetX,E.C.MIN_X);
 assert.ok(E.aim(s,5));assert.equal(s.targetX,E.C.MAX_X);
 assert.equal(E.aim(s,NaN),false);
 assert.equal(E.steer(s,0),false);
 const before=s.x;tick(s,8);
 assert.ok(s.x>before);assert.ok(s.x<=E.C.MAX_X);
 assert.ok(E.steer(s,-1));assert.ok(s.targetX<E.C.MAX_X);
});
test('three symbolic flight levels with cooldown and unmistakable scale',()=>{
 const s=fly();
 assert.equal(s.altitude,1);
 assert.equal(E.planeScale(0)>E.planeScale(1),true);
 assert.equal(E.planeScale(1)>E.planeScale(2),true);
 assert.ok(E.planeScale(0)/E.planeScale(2)>1.4,'height change must be visually obvious');
 assert.equal(E.changeAltitude(s,1),true);
 assert.equal(s.altitude,2);
 assert.equal(E.changeAltitude(s,-1),false,'cannot spam altitude controls');
 tick(s,25);assert.ok(E.changeAltitude(s,-1));assert.equal(s.altitude,1);
 tick(s,25);assert.ok(E.changeAltitude(s,-1));assert.equal(s.altitude,0);
 tick(s,25);assert.equal(E.changeAltitude(s,-1),false,'low level clamps');
 assert.ok(s.smoothAltitude<1,'smoothed plane scale visibly responds');
});
test('cloud and bird collisions only damage the jet on its selected level',()=>{
 for(const kind of ['cloud','birds']){
  const s=fly();put(s,kind);const events=tick(s);
  assert.ok(events.includes('hit'),kind);
  assert.equal(s.lives,2);assert.equal(s.hits,1);
  const other=fly();put(other,kind,other.x,2);
  assert.ok(!tick(other).includes('hit'));
  assert.equal(other.lives,3);
 }
});
test('normalized vertical hitbox accounts for tall portrait screen',()=>{
 const s=fly();
 s.aspect=.5;
 const e=put(s,'cloud',s.x,s.altitude,E.C.PLAYER_Y+.08);
 assert.equal(E.collide(s,e),false,'hazard this far from the rendered sprite must not hit');
 e.y=E.C.PLAYER_Y+.016;
 assert.equal(E.collide(s,e),true);
});
test('single hazard gives only one hit even during invulnerability',()=>{
 const s=fly();put(s,'birds');tick(s);
 assert.equal(s.hits,1);
 tick(s,5);assert.equal(s.hits,1);
 put(s,'cloud');const ev=tick(s);
 assert.ok(ev.includes('protected'));assert.equal(s.lives,2);
});
test('three collisions terminate a run, without reviving by pressing start',()=>{
 const s=fly();
 for(let i=0;i<3;i++){
  s.invulnerable=0;
  put(s,i%2?'birds':'cloud');
  tick(s);
 }
 assert.equal(s.phase,'gameover');assert.equal(s.lives,0);
 const old=s.distance;
 assert.deepEqual(E.step(s,1),[]);
 assert.equal(s.distance,old);assert.equal(E.start(s),false);
});
test('avoiding and narrowly passing hazards earns points and streak bonuses',()=>{
 const s=fly();let o=put(s,'birds',.85,s.altitude,E.C.PLAYER_Y+.2);
 assert.ok(tick(s).includes('avoided'));assert.equal(s.avoided,1);
 assert.ok(s.score>0);
 o=put(s,'cloud',s.x+.17,s.altitude,E.C.PLAYER_Y+.20);
 assert.ok(tick(s).includes('nearMiss'));
 assert.equal(s.nearMisses,1);
 assert.ok(s.combo>=2);
});
test('collectable portal unlocks persistent Matrix world and recharges phase',()=>{
 const s=fly();put(s,'portal');
 assert.ok(tick(s).includes('portal'));
 assert.equal(s.matrix,true);assert.equal(s.portals,1);
 assert.equal(s.charges,2);assert.ok(s.invulnerable>0);
 assert.ok(E.special(s));assert.equal(s.charges,1);
 assert.equal(E.special(s),false,'cannot activate concurrently');
 assert.ok(s.phaseTime>0);
 s.phaseTime=0;put(s,'portal');tick(s);
 assert.equal(s.portals,2);assert.equal(s.charges,3);
});
test('super ability phases through both clouds and birds, with no life loss',()=>{
 const s=fly();s.matrix=true;s.charges=1;
 assert.equal(E.special(s),true);
 const old=s.lives;
 for(const kind of ['birds','cloud']){
  put(s,kind);assert.ok(tick(s).includes('phased'));
 }
 assert.equal(s.passedThrough,2);assert.equal(s.lives,old);
 assert.equal(s.charges,0);assert.equal(E.special(s),false);
});
test('uncollected portal is optional and does not harm the plane',()=>{
 const s=fly();put(s,'portal',.8,2,E.C.PLAYER_Y+.3);
 tick(s);assert.equal(s.matrix,false);assert.equal(s.lives,3);
});
test('speed rises to bounded maximum and spawns both obstacle kinds and portals',()=>{
 const s=E.create(211);E.start(s);
 for(let i=0;i<180*30;i++){s.invulnerable=2;E.step(s,1/30);}
 assert.ok(s.speed<=E.C.MAX_SPEED);
 assert.ok(s.speed>E.C.START_SPEED);
 assert.ok(s.nextId>12);
 const inspect=E.create(198);E.start(inspect);
 for(let i=0;i<11*60;i++)E.step(inspect,1/60);
 assert.ok(inspect.entities.some(o=>o.kind==='portal')||inspect.portals>0||inspect.nextPortalAt>E.C.PORTAL_FIRST);
 assert.ok(inspect.score>=0);
});
test('portrait Mini App contains offline shell, Telegram SDK and the complete control set',()=>{
 const root=path.resolve(__dirname,'../matrix-jet');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const id of ['sky','intro','paused','over','start','again','pause','resume','left','right','up','down','phase','score','best','altitude','lives']){
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 }
 assert.ok(html.includes('telegram-web-app.js'));
 assert.ok(html.includes('src="./engine.js"'));
 assert.ok(html.includes('src="./game.js"'));
 assert.ok(html.includes('viewport-fit=cover'));
 assert.ok(!html.includes('onclick='));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const file of ['index.html','engine.js','game.js','icon.svg','sw.js','manifest.webmanifest']){
  assert.ok(fs.existsSync(path.join(root,file)),file);
 }
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(m.start_url,'./index.html');assert.equal(m.scope,'./');
});
