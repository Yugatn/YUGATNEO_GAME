'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('../symbiont-city/workshops.js');
const root=path.resolve(__dirname,'../symbiont-city');
test('profiles cover the entire lifespan; ages 0–2 never receive an interactive screen task',()=>{
 for(let age=0;age<=110;age++){
  const p=G.settings(age);
  assert.ok(['caregiver','preschool','junior','school','teen','adult'].includes(p.band));
  for(const type of G.TYPES){
   const s=G.newGame(type,age,'auto',age+17);
   assert.ok(s,'a profile must exist at '+age);
   if(age<=2){
    assert.equal(s.status,'caregiver');
    assert.equal(s.total,0);
    assert.equal(G.memoryPick(s,0),null);
    assert.equal(G.attentionPick(s,0),null);
    assert.equal(G.bridgePick(s,'survey'),null);
   }else assert.equal(s.status,'playing');
  }
 }
});
test('gentle and stretch modes change challenges, without reducing older adults to children',()=>{
 for(const age of [4,6,8,10,12,15,24,40,65,88,110]){
  const low=G.settings(age,'gentle'),normal=G.settings(age),high=G.settings(age,'stretch');
  assert.ok(low.pairs<=normal.pairs&&normal.pairs<=high.pairs);
  assert.ok(low.cells<=normal.cells&&normal.cells<=high.cells);
  assert.ok(low.rounds<=normal.rounds&&normal.rounds<=high.rounds);
  assert.ok(low.pairs>=2&&high.pairs<=8);
 }
 assert.equal(G.settings(4).cooperative,true);
 assert.equal(G.settings(6).cooperative,false);
 assert.equal(G.settings(75).band,'adult');
});
test('fixed seed reproduces memory decks and attention targets',()=>{
 for(const type of G.TYPES){
  const x=G.newGame(type,10,'auto',139),y=G.newGame(type,10,'auto',139);
  assert.deepEqual(x.board,y.board);
  assert.deepEqual(x.rounds,y.rounds);
 }
});
test('memory cards cannot match themselves and wrong pairs remain visible until manual closure',()=>{
 const s=G.newGame('memory',7,'auto',9);
 const a=s.board.findIndex(x=>x.pair===s.board[0].pair&&x.id!==s.board[0].id);
 const b=s.board.findIndex(x=>x.pair!==s.board[0].pair);
 assert.equal(G.memoryPick(s,0).kind,'first');
 assert.equal(G.memoryPick(s,0),null);
 assert.equal(G.memoryPick(s,b).kind,'mismatch');
 assert.equal(s.waiting,true);assert.equal(s.mistakes,1);
 assert.equal(G.memoryPick(s,a),null);
 assert.equal(G.closePair(s),true);assert.equal(G.closePair(s),false);
 assert.equal(G.memoryPick(s,0).kind,'first');
 assert.equal(G.memoryPick(s,a).kind,'matched');
 assert.equal(s.found,1);
});
test('every memory deck can be completed fairly without a timer',()=>{
 for(const age of [3,5,6,8,11,17,28,72]){
  const s=G.newGame('memory',age,'stretch',1000+age);
  const groups=new Map();
  s.board.forEach((c,i)=>groups.set(c.pair,[...(groups.get(c.pair)||[]),i]));
  for(const pair of groups.values()){
   G.memoryPick(s,pair[0]);G.memoryPick(s,pair[1]);
  }
  assert.equal(s.status,'complete');
  assert.equal(s.found,s.total);
  assert.equal(s.mistakes,0);
  assert.equal(G.rating(s),3);
  assert.equal(G.memoryPick(s,0),null);
 }
});
test('attention tasks always include one unique target and advance only on correct choice',()=>{
 for(const age of [3,6,10,15,30,80]){
  const s=G.newGame('attention',age,'auto',2026+age);
  for(let round=0;round<s.total;round++){
   const x=s.rounds[round];const idx=x.items.indexOf(x.target);
   assert.ok(idx>=0,'the target must be findable');
   assert.equal(x.items.filter(item=>item===x.target).length,1);
   const wrong=x.items.findIndex(item=>item!==x.target);
   const before=s.index;
   assert.equal(G.attentionPick(s,wrong).kind,'try');
   assert.equal(s.index,before);
   assert.equal(G.attentionPick(s,idx).kind,'found');
  }
  assert.equal(s.status,'complete');
  assert.equal(s.mistakes,s.total);
 }
});
test('bridge construction enforces safe dependency order and explains mistakes',()=>{
 const s=G.newGame('bridge',8,'auto',99);
 assert.equal(G.bridgePick(s,'test').kind,'try');
 assert.equal(s.index,0);
 assert.ok(G.bridgePick(s,'test').hint.includes('Проверка'));
 for(const part of G.BUILD){
  const r=G.bridgePick(s,part.id);
  assert.equal(r.kind,'built');
 }
 assert.equal(s.status,'complete');
 assert.equal(s.index,4);
 assert.equal(G.bridgePick(s,'survey'),null);
});
test('three completed activities restore the game village, with best stars only',()=>{
 const state=G.initial();
 for(const type of G.TYPES){
  const s=G.newGame(type,8,'auto',4);
  s.status='complete';s.mistakes=2;
  assert.ok(G.reward(state,s));
 }
 const first=G.summary(state);
 assert.deepEqual(first,{done:3,total:3,stars:6});
 for(let i=0;i<100;i++){
  const s=G.newGame('memory',8,'auto',i);
  s.status='complete';s.mistakes=i%2?100:0;
  G.reward(state,s);
 }
 assert.equal(G.summary(state).done,3);
 assert.equal(state.best.memory,3);
 assert.equal(G.reward(state,G.newGame('memory',8)),false);
 const restored=G.restore(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(G.summary(restored),{done:3,total:3,stars:7});
});
test('malformed progress and invalid actions cannot unlock achievements',()=>{
 for(const raw of [null,[],{version:4,best:{},completed:[]},{version:1,best:{memory:999},completed:[]},
  {version:1,best:{unknown:3},completed:['unknown']}])
  assert.deepEqual(G.restore(raw),G.initial());
 assert.equal(G.newGame('weapons',8),null);
 const m=G.newGame('memory',8);
 assert.equal(G.memoryPick(m,NaN),null);
 assert.equal(G.memoryPick(m,-2),null);
 assert.equal(G.memoryPick(m,999),null);
 const a=G.newGame('attention',8);
 assert.equal(G.attentionPick(a,8888),null);
 const b=G.newGame('bridge',8);
 assert.equal(G.bridgePick(b,'hacked'),null);
});
test('PWA lists workshop scripts and HTML includes all controls and no private data access',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const ui=fs.readFileSync(path.join(root,'workshops-ui.js'),'utf8');
 for(const id of ['workshopsSection','workshopCards','workshopVillage','workshopOverlay','workshopBody',
  'workshopRestart','workshopDone'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const file of ['workshops.js','workshops-ui.js','workshops.css']){
  assert.ok(html.includes('./'+file));
  assert.ok(sw.includes("'./"+file+"'"));
 }
 assert.ok(sw.includes('yugatneo-symbiont-city-v5'));
 assert.ok(ui.includes("symbiont-city:export"));
 assert.ok(ui.includes("symbiont-city:cleared"));
 assert.ok(!ui.includes('initDataUnsafe'));
 assert.ok(!ui.includes('fetch('));
});
