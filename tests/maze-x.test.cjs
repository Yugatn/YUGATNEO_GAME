'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../maze-x/engine.js');
const modes=Object.keys(E.MODES);
function newGame(mode='explorer',seed=42){const s=E.create(mode,seed);assert.ok(E.start(s));return s;}
function dir(a,b){
 return E.DIRECTIONS.find(d=>a.x+d.dx===b.x&&a.y+d.dy===b.y)?.id;
}
function emptyAgents(s){for(const floor of s.floors)floor.agents=[];}
function navigateTo(s,target){
 const f=s.floors[s.floor],route=E.search(f,s.player,target);
 assert.ok(route,'goal must be reachable');
 for(const dest of route.path.slice(1)){
  const moveDir=dir(s.player,dest);
  assert.ok(moveDir,'path must contain cardinal neighbors');
  s.moveCooldown=0;
  assert.ok(E.move(s,moveDir),'walk must follow valid carved edge');
 }
 return route.path;
}
function fork(s){
 const f=s.floors[s.floor];
 for(let y=0;y<f.size;y++)for(let x=0;x<f.size;x++){
  if(E.openDirs(f,x,y).length>=3)return {x,y};
 }
 throw Error('maze lacks a logic fork');
}
test('four difficulty profiles have increasingly large multi-layer labyrinths',()=>{
 const expected=[[25,2],[37,3],[49,4],[65,5]];
 modes.forEach((name,i)=>{
  const s=E.create(name,1618);
  const cfg=E.MODES[name];
  assert.deepEqual([cfg.size,cfg.levels],expected[i]);
  assert.equal(s.floors.length,cfg.levels);
  s.floors.forEach((f,floorIndex)=>{
   assert.equal(f.walls.length,cfg.size**2);
   assert.equal(f.seen.length,cfg.size**2);
   if(floorIndex===0)assert.ok(f.visited>0,'starting area is revealed');
   else assert.equal(f.visited,0,'future spiral floors stay unexplored');
   assert.ok(f.visited<cfg.size*cfg.size,'only nearby tiles initially visible');
  });
 });
});
test('all maze cells reachable; wall connections reciprocal; outer border stays solid',()=>{
 for(const mode of modes){
  const s=E.create(mode,2765);
  for(const f of s.floors){
   const total=f.size*f.size;
   assert.equal(E.search(f,f.start).reachable,total,'no isolated chambers');
   for(let y=0;y<f.size;y++)for(let x=0;x<f.size;x++){
    const mask=f.walls[E.ix(x,y,f.size)];
    for(const d of E.DIRECTIONS){
     const nx=x+d.dx,ny=y+d.dy;
     if(!E.within(nx,ny,f.size)){
      assert.ok(mask&d.bit,'outside borders must remain closed');
     }else{
      const other=f.walls[E.ix(nx,ny,f.size)];
      assert.equal(Boolean(mask&d.bit),Boolean(other&d.reverse),
       'each wall must match its neighbor');
     }
    }
   }
  }
 }
});
test('identical seeds generate the same floor topology and stair path',()=>{
 const a=E.create('navigator',122),b=E.create('navigator',122);
 assert.deepEqual(a.floors.map(x=>x.walls),b.floors.map(x=>x.walls));
 assert.deepEqual(a.floors.map(x=>x.stair),b.floors.map(x=>x.stair));
 assert.deepEqual(a.floors.map(x=>x.portals),b.floors.map(x=>x.portals));
});
test('walk the carved shortest route through every vertical spiral and exit for all modes',()=>{
 for(const mode of modes){
  const s=newGame(mode,8846);emptyAgents(s);
  const cfg=E.MODES[mode];
  for(let floor=0;floor<cfg.levels;floor++){
   assert.equal(s.floor,floor);
   const f=s.floors[floor],end=f.stair||f.exit;
   navigateTo(s,end);
  }
  assert.equal(s.phase,'completed');
  assert.equal(s.floor,cfg.levels-1);
  assert.ok(s.timeBonus>0,'finishing promptly earns time bonus');
  assert.ok(s.score>=1200*cfg.mult);
  assert.ok(s.portals>=cfg.levels,'a route to the exit crosses floor portals');
 }
});
test('walls block movement; phase jump crosses exactly one neighboring wall and costs a charge',()=>{
 const s=newGame('explorer');emptyAgents(s);
 const f=s.floors[0],p=s.player;
 const d=E.DIRECTIONS.find(d=>E.within(p.x+d.dx,p.y+d.dy,f.size)&&
   (f.walls[E.ix(p.x,p.y,f.size)]&d.bit));
 assert.ok(d,'the start must have at least one inside wall');
 assert.equal(E.move(s,d.id),false);
 const before={...s.player};
 s.matrix=true;s.charges=2;
 assert.ok(E.armPhase(s));
 assert.equal(s.phaseArmed,true);
 assert.ok(E.move(s,d.id));
 assert.equal(s.charges,1);assert.equal(s.wallJumps,1);
 assert.deepEqual({x:s.player.x,y:s.player.y},{x:before.x+d.dx,y:before.y+d.dy});
 assert.equal(s.phaseArmed,false);
 assert.ok(s.safeTimer>0);
});
test('a phase jump cannot pass the boundary, cannot run without portal energy',()=>{
 const s=newGame('explorer');emptyAgents(s);
 s.player={x:0,y:0,facing:'left'};s.matrix=true;s.charges=1;
 assert.equal(E.phaseThrough(s,'left'),false);
 assert.equal(s.charges,1);
 s.matrix=false;assert.equal(E.armPhase(s),false);
 assert.equal(E.phaseThrough(s,'right'),false);
});
test('a portal on the guaranteed route activates Matrix code and replenishes energy',()=>{
 const s=newGame('explorer',1749);emptyAgents(s);
 const f=s.floors[0],target=f.portals[0];
 assert.ok(target);
 navigateTo(s,target);
 assert.equal(s.matrix,true);
 assert.equal(s.portals,1);
 assert.equal(s.charges,2);
 assert.ok(f.portals[0].taken);
 assert.equal(s.score>=230,true);
});
test('correct logical answer gives limited shortest-path hint and points',()=>{
 const s=newGame('navigator',158);emptyAgents(s);
 s.player={...fork(s),facing:'right'};
 const offered=E.riddleOffer(s);assert.ok(offered);
 const question=E.RIDDLES[offered.index],before=s.score;
 assert.ok(E.askRiddle(s));assert.equal(s.phase,'riddle');
 const elapsed=s.elapsed;
 assert.deepEqual(E.step(s,100),[]);assert.equal(s.elapsed,elapsed);
 const result=E.answerRiddle(s,question.correct);
 assert.equal(result.correct,true);assert.ok(result.hint.length>1);
 assert.ok(result.reward>0);assert.ok(s.score>before);
 assert.equal(s.phase,'playing');
 assert.equal(E.riddleOffer(s),null,'answered fork cannot be farmed repeatedly');
});
test('wrong puzzle answer and optional skip do not reveal the correct direction',()=>{
 const s=newGame('explorer',190);emptyAgents(s);
 const point=fork(s);s.player={...point,facing:'up'};
 let offer=E.askRiddle(s);assert.ok(offer);
 const wrong=(E.RIDDLES[offer.index].correct+1)%3;
 const response=E.answerRiddle(s,wrong);
 assert.equal(response.correct,false);assert.deepEqual(response.hint,[]);
 assert.equal(s.phase,'playing');assert.equal(s.riddlesSolved,0);
 s.player={...fork(E.create('explorer',199)),facing:'right'};
 // Use a new clean game to exercise the skip separately.
 const next=newGame('explorer',190);next.player={...point,facing:'left'};
 assert.ok(E.askRiddle(next));assert.ok(E.skipRiddle(next));
 assert.equal(next.phase,'playing');
 assert.equal(E.riddleOffer(next),null);
});
test('an adjacent agent navigates a real corridor, catches player and respawns safely',()=>{
 const s=newGame('explorer',11),f=s.floors[0];
 const d=E.openDirs(f,s.player.x,s.player.y)[0];
 f.agents=[{id:'test',x:s.player.x+d.dx,y:s.player.y+d.dy,clock:.001}];
 s.safeTimer=0;s.nearAgent=true;
 const ev=E.step(s,.033);
 assert.ok(ev.includes('hit'),'agent pathfinding must reach player');
 assert.equal(s.lives,2);assert.equal(s.safeTimer>0,true);
 assert.equal(s.phase,'playing');
});
test('three unprotected agent catches fail the attempt and prevent further movement',()=>{
 const s=newGame('explorer',11),f=s.floors[0];
 for(let i=0;i<3;i++){
  const d=E.openDirs(f,s.player.x,s.player.y)[0];
  f.agents=[{id:'test'+i,x:s.player.x+d.dx,y:s.player.y+d.dy,clock:.001}];
  s.safeTimer=0;E.step(s,.033);
 }
 assert.equal(s.phase,'failed');assert.equal(s.lives,0);
 assert.equal(E.move(s,'right'),false);assert.equal(E.start(s),false);
});
test('time bonus rewards faster solutions on the same seeded layout',()=>{
 const fast=newGame('explorer',901),slow=newGame('explorer',901);
 for(const s of [fast,slow])emptyAgents(s);
 slow.elapsed=E.MODES.explorer.bonusTime+100;
 for(const s of [fast,slow]){
  for(let i=0;i<E.MODES.explorer.levels;i++){
   const f=s.floors[i];navigateTo(s,f.stair||f.exit);
  }
 }
 assert.ok(fast.timeBonus>slow.timeBonus);
 assert.ok(fast.score>slow.score);
});
test('riddles, scores and phases require legitimate in-game actions',()=>{
 const s=E.create();
 assert.equal(E.move(s,'up'),false);
 assert.equal(E.askRiddle(s),null);
 assert.equal(E.answerRiddle(s,0),null);
 assert.equal(E.skipRiddle(s),false);
 assert.deepEqual(E.step(s,4),[]);
 assert.equal(E.armPhase(s),false);
 assert.equal(E.phaseThrough(s,'right'),false);
 assert.equal(E.start(s),true);assert.equal(E.pause(s),true);
 assert.deepEqual(E.step(s,5),[]);
});
test('Telegram Mini App files include all controls and no personal-data dependencies',()=>{
 const dir=path.resolve(__dirname,'../maze-x');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 const ids=['scene','intro','mode','start','continue','pause','resume','junction',
  'riddle','question','answers','skip','end','again','up','down','left','right',
  'phase','score','timer','floor','lives','matrix','progress'];
 for(const id of ids)assert.ok(html.includes('id="'+id+'"'),'missing UI '+id);
 const htmlIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(a=>a[1]);
 assert.equal(htmlIds.length,new Set(htmlIds).size);
 assert.ok(html.includes('telegram-web-app.js'));
 assert.ok(html.includes('src="./engine.js"'));
 assert.ok(html.includes('src="./game.js"'));
 assert.ok(js.includes('localStorage.setItem(SAVE'));
 assert.ok(js.includes('E.riddleOffer(s)'));
 assert.ok(!js.includes('initDataUnsafe'));
 for(const file of ['engine.js','game.js','index.html','sw.js','icon.svg','manifest.webmanifest']){
  assert.ok(fs.existsSync(path.join(dir,file)),file);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');
});
