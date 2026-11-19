'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const G=require('../symbiont-city/help-route.js');
const root=path.resolve(__dirname,'../symbiont-city');
function dir(a,b){
 return G.DIRS.find(d=>a.x+d.dx===b.x&&a.y+d.dy===b.y)?.id;
}
function walk(s,target){
 const r=G.search(s,s.player,target);assert.ok(r,'every target is reachable');
 for(const p of r.path.slice(1)){
  const d=dir(s.player,p);assert.ok(d);
  const result=G.move(s,d);assert.ok(result,'valid corridor step');
 }
}
test('all ages 0–110 supported; toddlers receive caregiver guidance without screen tasks',()=>{
 for(let age=0;age<=110;age++){
  const s=G.create(age,'auto',age+2026);
  assert.ok(s);
  if(age<=2){
   assert.equal(s.status,'caregiver');assert.equal(s.size,0);
   assert.equal(G.move(s,'right'),null);
   assert.equal(G.hint(s),null);
  }else{
   assert.ok(s.size>=5&&s.size<=13);
   assert.equal(s.walls.length,s.size*s.size);
   assert.equal(s.status,'playing');
  }
 }
 assert.equal(G.create(111),null);
 assert.equal(G.create(-1),null);
 assert.equal(G.create(NaN),null);
});
test('support and challenge adjust grid size without taking away older players dignity',()=>{
 for(const age of [3,5,6,8,9,12,15,20,40,70,90,110]){
  const easy=G.sizeFor(age,'gentle');
  const normal=G.sizeFor(age,'auto');
  const hard=G.sizeFor(age,'stretch');
  assert.ok(easy<=normal&&normal<=hard);
  assert.ok(easy>=5&&hard<=13);
 }
 assert.ok(G.sizeFor(8)<G.sizeFor(15));
 assert.ok(G.sizeFor(80)>=9);
});
test('all 5–13 grids are connected with reciprocal walls and solid boundaries',()=>{
 for(const age of [3,6,10,16,35,89]){
  for(const seed of [1,11,92,777]){
   const s=G.create(age,'auto',seed),n=s.size;
   const graph=G.search(s,{x:0,y:0});
   assert.equal(graph.reachable,n*n);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const mask=s.walls[y*n+x];
    for(const d of G.DIRS){
     const nx=x+d.dx,ny=y+d.dy;
     if(nx<0||ny<0||nx>=n||ny>=n)assert.ok(mask&d.bit);
     else assert.equal(Boolean(mask&d.bit),Boolean(s.walls[ny*n+nx]&d.opp));
    }
   }
  }
 }
});
test('same seed gives same route, items and destination; different seed changes topology',()=>{
 const a=G.create(10,'auto',44),b=G.create(10,'auto',44),c=G.create(10,'auto',45);
 assert.deepEqual(a.walls,b.walls);
 assert.deepEqual(a.supplies,b.supplies);
 assert.deepEqual(a.destination,b.destination);
 assert.notDeepEqual(a.walls,c.walls);
});
test('route cannot finish before collecting supplies; afterwards goal completes',()=>{
 for(const age of [3,6,10,15,30,75]){
  const s=G.create(age,'auto',2027+age);
  assert.ok(s.supplies.length>=2);
  // Regular puzzles put supplies along the shortest route.
  // Move one supply to a still-reachable side corridor to check the
  // "return for supplies" branch without changing the playable default.
  const end=s.destination;
  const direct=G.search(s,s.player,end).path;
  const directKeys=new Set(direct.map(p=>p.x+','+p.y));
  let side=null;
  for(let y=0;y<s.size&&!side;y++)for(let x=0;x<s.size;x++)
    if(!directKeys.has(x+','+y)){side={x,y};break;}
  assert.ok(side,'there must be a side corridor');
  s.supplies[0]={...s.supplies[0],x:side.x,y:side.y};
  walk(s,end);
  assert.equal(s.status,'playing','goal alone cannot finish unless supplies collected');
  for(const p of s.supplies.filter(p=>!s.collected.includes(p.id)))walk(s,p);
  walk(s,end);
  assert.equal(s.status,'complete');
  assert.equal(s.collected.length,s.supplies.length);
  assert.equal(G.move(s,'up'),null);
  assert.ok(G.stars(s)>=1);
 }
});
test('walk along minimum guaranteed route collects all supplies and wins with top rating',()=>{
 const s=G.create(12,'auto',2204);
 const shortest=G.search(s,s.player,s.destination).path;
 for(const point of shortest.slice(1)){
  const r=G.move(s,dir(s.player,point));assert.ok(r);
 }
 assert.equal(s.status,'complete');
 assert.equal(s.moves,s.optimal);
 assert.equal(G.stars(s),3);
 assert.equal(s.hints,0);
});
test('wall, invalid move and repeated actions after victory do not change score',()=>{
 const s=G.create(8,'auto',923);
 assert.equal(G.move(s,'xyz'),null);
 const forbidden=G.DIRS.find(d=>s.walls[0]&d.bit);
 assert.ok(forbidden);
 assert.equal(G.move(s,forbidden.id).kind,'wall');
 assert.equal(s.moves,0);
 assert.equal(G.stars(s),0);
 assert.equal(G.hint({status:'caregiver'}),null);
});
test('optional BFS hint suggests valid direction and does not complete automatically',()=>{
 const s=G.create(7,'gentle',644);
 const h=G.hint(s);
 assert.ok(G.DIRS.some(d=>d.id===h.direction));
 const old=s.moves;
 assert.equal(G.move(s,h.direction).kind!=='wall',true);
 assert.equal(s.moves,old+1);
 assert.equal(s.hints,1);
});
test('only aggregate achievements persist; success cannot be farmed by the same result',()=>{
 const saved=G.initial(),s=G.create(8,'auto',26);
 for(const p of G.search(s,s.player,s.destination).path.slice(1))G.move(s,dir(s.player,p));
 assert.equal(s.status,'complete');
 assert.equal(G.reward(saved,s),true);
 assert.equal(G.reward(saved,s),false);
 assert.equal(saved.completed,1);
 assert.equal(saved.best,3);
 assert.deepEqual(G.restore(JSON.parse(JSON.stringify(saved))),saved);
 for(const raw of [null,{},[],{version:2,best:3,completed:1},
  {version:1,best:9,completed:0},{version:1,best:0,completed:-9}]){
  assert.deepEqual(G.restore(raw),G.initial());
 }
});
test('game is wired into Telegram Mini App and PWA with no user account access',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'help-route-ui.js'),'utf8');
 for(const id of ['routeStart','routeOverlay','routeBody','routeSupplies','routeSteps',
   'routeHint','routeAgain','routeDone','routeClose','routeRecord']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const name of ['help-route.js','help-route-ui.js','help-route.css']){
  assert.ok(html.includes('./'+name));
  assert.ok(sw.includes("'./"+name+"'"));
 }
 assert.ok(sw.includes('yugatneo-symbiont-city-v5'));
 assert.ok(ui.includes('symbiont-city:export'));
 assert.ok(ui.includes('symbiont-city:cleared'));
 assert.ok(!ui.includes('initDataUnsafe'));
 assert.ok(!ui.includes('fetch('));
});
