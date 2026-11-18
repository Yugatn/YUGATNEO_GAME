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
 assert.equal(s.runner.distance,0);
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
 assert.ok(sw.includes('evolution-x-v1'));
});
