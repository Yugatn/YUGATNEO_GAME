'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Evolution=require('../evolution-x/engine.js');
const root=path.resolve(__dirname,'../evolution-x');
function started(seed=14){const s=Evolution.create(seed);assert.ok(Evolution.start(s));return s;}
function advance(s,seconds){
 for(let i=0;i<Math.ceil(seconds*60);i++)Evolution.step(s,1/60);
}
function divideAll(s){
 let attempts=0;
 while(s.phase==='cells'){
  const pos=Evolution.cellPositions(s).find(c=>c.active);
  assert.ok(pos,'must always have an available original-generation cell');
  assert.ok(Evolution.divide(s,pos.x,pos.y),'each active cell should divide');
  attempts++;
  if(attempts>Evolution.CELL_GOAL)throw Error('mitosis did not terminate');
 }
 return attempts;
}
test('the first tap replaces one cell with two and activates the next wave',()=>{
 const s=started();
 const [first]=Evolution.cellPositions(s);
 assert.equal(first.active,true);
 assert.ok(Evolution.divide(s,first.x,first.y));
 assert.equal(s.cells.length,2);
 assert.equal(s.wave,1);
 assert.equal(s.waveRemaining,2);
 assert.equal(s.divisions,1);
 assert.equal(Evolution.scoreProgress(s)>0,true);
});
test('every daughter cell must be tapped once before its own daughters divide',()=>{
 const s=started();
 assert.ok(Evolution.divide(s,.5,.5));
 const pos=Evolution.cellPositions(s);
 assert.ok(Evolution.divide(s,pos[0].x,pos[0].y));
 assert.equal(s.cells.length,3);
 assert.equal(s.wave,1);
 assert.equal(s.waveRemaining,1);
 const locked=Evolution.cellPositions(s).find(c=>!c.active);
 assert.ok(locked);
 const before=s.divisions;
 assert.equal(Evolution.divide(s,locked.x,locked.y),false);
 assert.equal(s.divisions,before);
 const last=Evolution.cellPositions(s).find(c=>c.active);
 assert.ok(Evolution.divide(s,last.x,last.y));
 assert.equal(s.cells.length,4);
 assert.equal(s.wave,2);
 assert.equal(s.waveRemaining,4);
});
test('256-cell population triggers an automatic human scene after 255 deliberate splits',()=>{
 const s=started();
 const attempts=divideAll(s);
 assert.equal(attempts,255);
 assert.equal(s.divisions,255);
 assert.equal(s.cells.length,256);
 assert.equal(s.phase,'emergence');
 assert.equal(Evolution.scoreProgress(s),25);
 advance(s,2.5);
 assert.equal(s.phase,'runner');
 assert.equal(s.runner.lane,0);
 assert.ok(s.runner.entities.length>10);
 assert.ok(s.runner.distance>=0&&s.runner.distance<20,'runner advances after the transition ends');
});
test('invalid cell clicks never create new cells or extra points',()=>{
 const s=started(),points=s.score;
 assert.equal(Evolution.divide(s,1.3,.5),false);
 assert.equal(Evolution.divide(s,-.1,.5),false);
 assert.equal(Evolution.divide(s,NaN,.5),false);
 assert.equal(s.cells.length,1);
 assert.equal(s.score,points);
});
test('runner lanes clamp and a single jump cannot be stacked',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 assert.ok(Evolution.steer(s,-1));assert.equal(s.runner.lane,-1);
 assert.equal(Evolution.steer(s,-1),false);
 assert.ok(Evolution.steer(s,1));assert.equal(s.runner.lane,0);
 assert.ok(Evolution.jump(s));assert.equal(Evolution.jump(s),false);
 advance(s,1.1);
 assert.equal(s.runner.jump,0);
 assert.equal(Evolution.jump(s),true);
});
test('a correctly collected portal activates Matrix code, shield and pulse',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 const portal=s.runner.entities.find(x=>x.type==='portal');
 assert.ok(portal);
 s.runner.distance=portal.at-.05;s.runner.lane=portal.lane;
 const events=Evolution.step(s,1/60);
 assert.ok(events.includes('portal'));
 assert.equal(s.runner.matrix,true);
 assert.equal(s.runner.shield,1);
 assert.equal(s.runner.pulse,2);
 const next=s.runner.entities.find(o=>!o.done&&o.type==='block'&&o.at>s.runner.distance&&o.at<s.runner.distance+300);
 assert.ok(next);
 s.runner.distance=next.at-20;s.runner.lane=next.lane;
 const before=s.score;
 assert.ok(Evolution.ability(s));
 assert.equal(s.runner.pulse,1);
 assert.ok(s.score>before);
 assert.equal(Evolution.ability(s),true);
 assert.equal(Evolution.ability(s),false,'cannot fire after charges run out');
});
test('runner hazards are avoidable by switching lanes or jumping',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 const hazard=s.runner.entities.find(x=>x.type==='block');
 s.runner.distance=hazard.at-.05;
 s.runner.lane=hazard.lane===1?0:hazard.lane+1;
 const ev=Evolution.step(s,1/60);
 assert.ok(ev.includes('avoided'));
 assert.equal(s.runner.hits,0);
 const second=s.runner.entities.find(x=>!x.done&&x.type==='block'&&x.at>hazard.at);
 s.runner.distance=second.at-.05;s.runner.lane=second.lane;
 s.runner.jump=2.2;s.runner.velocity=0;
 assert.ok(Evolution.step(s,1/60).includes('avoided'));
 assert.equal(s.runner.hits,0);
});
test('rocket starts an asteroid navigation flight and ship has an active boost',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 s.runner.distance=Evolution.RUN_GOAL-.03;
 const events=Evolution.step(s,1/60);
 assert.ok(events.includes('rocket'));
 assert.equal(s.phase,'launch');
 advance(s,2.9);
 assert.equal(s.phase,'space');
 assert.ok(s.space.asteroids.length>=15);
 assert.equal(s.space.hull,3);
 assert.ok(Evolution.ability(s));
 assert.equal(s.space.boostCharges,2);
 assert.ok(s.space.invulnerable>0);
});
test('asteroids damage ship without softlock; switching lane avoids impact',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 s.phase='launch';s.transition=.01;advance(s,.05);
 const a=s.space.asteroids[0];
 s.space.distance=a.at-.05;s.space.lane=a.lane;s.space.invulnerable=0;
 assert.ok(Evolution.step(s,1/60).includes('asteroidHit'));
 assert.equal(s.space.hull,2);
 const b=s.space.asteroids[1];
 s.space.distance=b.at-.05;s.space.lane=b.lane===1?0:b.lane+1;
 s.space.invulnerable=0;
 assert.ok(Evolution.step(s,1/60).includes('asteroidAvoided'));
 assert.equal(s.phase,'space');
});
test('landing on a new planet restarts cell division while preserving score and planet number',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 s.phase='launch';s.transition=.01;advance(s,.05);
 s.space.distance=Evolution.SPACE_GOAL-.05;
 assert.ok(Evolution.step(s,1/60).includes('planetReached'));
 assert.equal(s.phase,'landing');
 const before=s.score;
 advance(s,3);
 assert.equal(s.phase,'cells');
 assert.equal(s.planet,1);
 assert.equal(s.cells.length,1);
 assert.equal(s.waveRemaining,1);
 assert.ok(s.score>=before);
 assert.equal(Evolution.scoreProgress(s),0,'new cycle progress resets');
 const p=Evolution.cellPositions(s)[0];
 assert.ok(Evolution.divide(s,p.x,p.y),'second planet can divide');
 assert.equal(s.cells.length,2);
});
test('invalid time, idle phase and invalid ability do not advance simulation',()=>{
 const s=Evolution.create(1);
 assert.deepEqual(Evolution.step(s,-5),[]);
 assert.equal(s.time,0);
 assert.equal(Evolution.ability(s),false);
 assert.equal(Evolution.jump(s),false);
 assert.equal(Evolution.steer(s,0),false);
});
test('browser shell has all touch, keyboard, pause and Telegram activation hooks',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=fs.readFileSync(path.join(root,'game.js'),'utf8');
 for(const id of ['canvas','intro','paused','start','pause','resume','restart',
  'left','center','right','action','mission','planet','score','fill','best']){
  assert.ok(html.includes('id="'+id+'"'),'missing element '+id);
 }
 assert.ok(html.includes('telegram-web-app.js'));
 assert.ok(html.includes('src="./engine.js"'));
 assert.ok(html.includes('src="./game.js"'));
 assert.ok(script.includes('localStorage'));
 assert.ok(script.includes('Core.divide'));
 assert.ok(script.includes('Core.ability'));
 assert.ok(script.includes('Core.steer'));
 assert.ok(script.includes("visibilitychange"));
 assert.ok(!script.includes('initDataUnsafe'));
 const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(allIds.length,new Set(allIds).size,'IDs are unique');
});
test('PWA assets are complete and independently scoped',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(m.scope,'./');
 assert.equal(m.start_url,'./index.html');
 for(const filename of ['engine.js','game.js','index.html','icon.svg','sw.js','manifest.webmanifest']){
  assert.ok(fs.existsSync(path.join(root,filename)),filename);
 }
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(sw.includes('evolution-x-v6'));
});

test('accessible division requires exactly 255 actions and cannot skip waves',()=>{
 const s=started();let count=0;
 while(Evolution.divideNext(s)){count++;assert.ok(count<=255);}
 assert.equal(count,255);assert.equal(s.phase,'emergence');
 assert.equal(Evolution.divideNext(s),false);
});
test('distance scoring does not reward traversing a checkpoint twice',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 const r=s.runner;r.entities=[];r.distance=100;r.furthest=100;
 advance(s,1);const score=s.score,total=s.totalDistance,furthest=r.furthest;
 r.distance=furthest-30;advance(s,.5);
 assert.equal(r.furthest,furthest);assert.equal(s.score,score);assert.equal(s.totalDistance,total);
});
test('each generated portal has a clear entry on its own lane',()=>{
 for(let seed=0;seed<15;seed++){
  const s=started(seed);divideAll(s);advance(s,2.5);
  const portals=s.runner.entities.filter(o=>o.type==='portal');
  assert.equal(portals.length,3);
  for(const p of portals)assert.ok(!s.runner.entities.some(o=>o.type!=='portal'&&o.type!=='rocket'&&o.lane===p.lane&&Math.abs(o.at-p.at)<14));
 }
});

test('world profiles change jump physics, speed, cell rewards and boost capacity',()=>{
 const make=planet=>{const s=started();s.planet=planet;divideAll(s);advance(s,2.2);s.runner.entities=[];return s;};
 const cold=make(1),hot=make(3);
 assert.ok(hot.score>cold.score);
 const coldStart=cold.runner.distance,hotStart=hot.runner.distance;
 Evolution.jump(cold);Evolution.jump(hot);advance(cold,.4);advance(hot,.4);
 assert.ok(cold.runner.jump>hot.runner.jump);
 assert.ok(hot.runner.distance-hotStart>cold.runner.distance-coldStart);
 const aurora=make(2);aurora.phase='launch';aurora.transition=.01;advance(aurora,.05);
 assert.equal(aurora.space.boostCharges,4);
 assert.equal(aurora.space.boostCapacity,4);
 assert.equal(Evolution.profile(5).name,Evolution.profile(0).name);
});
test('landing creates one chronicle record, three medals and bonus; legacy saves migrate',()=>{
 const s=started();divideAll(s);advance(s,2.5);
 s.runner.portals=3;s.runner.hits=0;
 s.phase='launch';s.transition=.01;advance(s,.05);
 s.space.asteroids=[];s.space.hits=0;s.space.distance=Evolution.SPACE_GOAL-.05;
 delete s.chronicle;
 Evolution.step(s,1/60);
 assert.equal(s.phase,'landing');assert.equal(s.chronicle.length,1);
 assert.equal(s.chronicle[0].bonus,450);assert.equal(s.chronicle[0].medals.length,3);
 const stored=JSON.parse(JSON.stringify(s));advance(stored,3);
 assert.equal(stored.chronicle.length,1);assert.equal(stored.planet,1);
});

test('specialization unlocks at 32 cells, is optional and can be selected only once per world',()=>{
 const s=started();
 assert.equal(Evolution.chooseSpecialization(s,'motor'),false);
 while(s.cells.length<32)assert.ok(Evolution.divideNext(s));
 assert.ok(s.events.includes('specializationUnlocked'));
 assert.equal(Evolution.chooseSpecialization(s,'unknown'),false);
 assert.ok(Evolution.chooseSpecialization(s,'adaptation'));
 assert.equal(Evolution.chooseSpecialization(s,'navigation'),false);
 divideAll(s);advance(s,2.5);
 assert.equal(s.runner.shield,1);
 assert.equal(Evolution.chooseSpecialization(s,'motor'),false);
});
test('motor and navigation grant respective bonuses, recorded in chronicle and reset on landing',()=>{
 function selected(id){const s=started();while(s.cells.length<32)Evolution.divideNext(s);Evolution.chooseSpecialization(s,id);divideAll(s);advance(s,2.5);return s;}
 const motor=selected('motor');Evolution.jump(motor);assert.equal(motor.runner.velocity,12.5*1.15);
 const nav=selected('navigation');nav.phase='launch';nav.transition=.01;advance(nav,.05);
 assert.equal(nav.space.boostCharges,4);assert.equal(nav.space.boostCapacity,4);
 nav.space.distance=Evolution.SPACE_GOAL-.05;Evolution.step(nav,1/60);
 assert.equal(nav.chronicle[0].specialization,'Навигация');
 advance(nav,3);assert.equal(nav.specialization,null);
});

test('local division does not move or resize any unrelated cell, through all 255 divisions',()=>{
 const s=started();
 while(s.phase==='cells'){
  const old=Evolution.cellPositions(s),p=old.filter(c=>c.active).at(-1);
  assert.ok(p);assert.ok(Evolution.divide(s,p.x,p.y));
  const next=Evolution.cellPositions(s),byId=new Map(next.map(c=>[c.id,c]));
  for(const c of old)if(c.id!==p.id){
   const v=byId.get(c.id);assert.ok(v);
   assert.equal(v.x,c.x);assert.equal(v.y,c.y);assert.equal(v.r,c.r);
  }
  const children=next.filter(c=>c.id===s.nextId||c.id===s.nextId-1);
  assert.equal(children.length,2);
  for(const c of children)assert.ok(Math.hypot(c.x-p.x,c.y-p.y)<.4);
 }
 assert.equal(s.cells.length,256);
 const pos=Evolution.cellPositions(s);
 for(let i=0;i<pos.length;i++)for(let j=i+1;j<pos.length;j++){
  const a=pos[i],b=pos[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>1.08*(a.r+b.r),'membranes must not overlap');
 }
});
test('cell hit testing rejects empty space and inactive cells, and layout survives legacy JSON',()=>{
 const s=started();assert.equal(Evolution.divide(s,.02,.02),false);
 while(s.cells.length<73){const p=Evolution.cellPositions(s).filter(c=>c.active).at(-1);assert.ok(Evolution.divide(s,p.x,p.y));}
 const pos=Evolution.cellPositions(s),copy=JSON.parse(JSON.stringify(s));
 assert.deepEqual(Evolution.cellPositions(copy),pos);
 for(const p of pos)assert.equal(Evolution.cellAt(s,p.x,p.y).id,p.id);
 assert.equal(Evolution.divide(s,.01,.01),false);
 const inactive=pos.find(c=>!c.active);assert.ok(inactive);
 assert.equal(Evolution.divide(s,inactive.x,inactive.y),false);
 assert.ok(Evolution.divideNext(copy));
});
