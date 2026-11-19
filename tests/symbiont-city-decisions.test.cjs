'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const L=require('../symbiont-city/decisions.js');
const dir=path.resolve(__dirname,'../symbiont-city');
test('five distinct city events, four consistent indicators and original skill themes',()=>{
 assert.equal(L.scenarios.length,5);
 assert.deepEqual(new Set(L.scenarios.map(x=>x.id)).size,5);
 assert.deepEqual(L.METRICS,['safety','trust','energy','time']);
 for(const sc of L.scenarios){
  assert.equal(sc.options.length,3,sc.id);
  assert.equal(sc.evidence.length,2);
  assert.ok(sc.reflect.length>15);
  for(const o of sc.options){
   assert.equal(o.effects.length,4);
   assert.ok(o.effects.some(n=>n<0)&&o.effects.some(n=>n>0),
    sc.id+' must teach actual trade-offs');
   assert.ok(o.reason.length>30&&o.follow.length>15);
  }
 }
});
test('age profiles protect age 0–2, offer simpler cooperative play and richer older scenarios',()=>{
 for(let a=0;a<=110;a++){
  const view=L.view('generator',a);
  assert.ok(view);
  assert.equal(view.caregiver,a<=2);
  assert.equal(view.cooperative,a>=3&&a<=8);
  assert.equal(view.options.length,a<=2?0:a<=8?2:3);
 }
 assert.match(L.view('generator',5).intro,/генератор/);
 assert.match(L.view('generator',12).intro,/больница/);
 assert.match(L.view('generator',35).intro,/энергосети/);
 const rumor=L.view('rumor',7);
 assert.deepEqual(rumor.options.map(o=>o.index),[0,2],
  'younger players must see a practical fact-checking choice');
});
test('all city scenarios have independently visible consequences and reproducible results',()=>{
 const s=L.initial();
 assert.deepEqual(L.metrics(s),{safety:60,trust:60,energy:60,time:60});
 for(const sc of L.scenarios){
  const response=L.choice(s,sc.id,1);
  assert.ok(response.first);
  assert.equal(response.option,1);
  assert.ok(Object.values(response.delta).some(v=>v!==0));
  assert.deepEqual(response.after,L.metrics(s));
 }
 assert.equal(L.progress(s).done,5);
 assert.equal(L.progress(s).total,5);
});
test('changing an earlier decision replaces its outcome, never farms points or stacks deltas',()=>{
 const s=L.initial(),a=L.choice(s,'generator',0);
 assert.equal(a.first,true);
 const base=L.metrics(s);
 const same=L.choice(s,'generator',0);
 assert.equal(same.first,false);assert.equal(same.revised,false);
 assert.deepEqual(same.delta,{safety:0,trust:0,energy:0,time:0});
 assert.deepEqual(L.metrics(s),base);
 const other=L.choice(s,'generator',2);
 assert.equal(other.revised,true);assert.equal(L.progress(s).done,1);
 const restored=L.choice(s,'generator',0);
 assert.deepEqual(L.metrics(s),base);
 assert.equal(restored.revised,true);
});
test('completion order is deterministic, bounded and independent of number of revisions',()=>{
 const a=L.initial(),b=L.initial();
 const choices={generator:2,rumor:2,bridge:1,dialogue:1,garden:1};
 for(const id of Object.keys(choices))L.choice(a,id,choices[id]);
 for(const id of Object.keys(choices).reverse())L.choice(b,id,choices[id]);
 assert.deepEqual(L.metrics(a),L.metrics(b));
 for(let i=0;i<100;i++)L.choice(a,'rumor',i%3);
 assert.equal(L.progress(a).done,5);
 for(const v of Object.values(L.metrics(a)))assert.ok(v>=0&&v<=100);
});
test('invalid options cannot affect state, resource values or unlock progress',()=>{
 const s=L.initial();
 const before=JSON.stringify(s);
 for(const [id,i] of [['unknown',0],['garden',-1],['rumor',1.2],['bridge',3],['generator',NaN]]){
  assert.equal(L.choice(s,id,i),null);
 }
 assert.equal(JSON.stringify(s),before);
});
test('restore accepts only known scenarios and valid choices, not corrupted saves',()=>{
 const s=L.initial();L.choice(s,'rumor',2);
 const restored=L.restore(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.choices.rumor,2);
 assert.deepEqual(L.metrics(restored),L.metrics(s));
 for(const bad of [null,{},[],{version:2,choices:{}},{version:1,choices:[]},
  {version:1,choices:{other:0}},{version:1,choices:{bridge:99}}]){
  assert.deepEqual(L.restore(bad),L.initial());
 }
});
test('old main-game progress is untouched; lab uses a distinct storage key',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const ui=fs.readFileSync(path.join(dir,'lab-ui.js'),'utf8');
 const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(html.includes('src="./game.js"'));
 assert.ok(html.includes('src="./decisions.js"'));
 assert.ok(html.includes('src="./lab-ui.js"'));
 assert.ok(ui.includes('yugatneo.symbiont-city.lab.v1'));
 assert.ok(game.includes('yugatneo.symbiont-city.progress.v1'));
 assert.ok(!ui.includes('initDataUnsafe'));
 assert.ok(!ui.includes('fetch('));
});
test('decision lab is included in PWA and existing export and reset actions',()=>{
 const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
 const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
 assert.ok(sw.includes('yugatneo-symbiont-city-v6'));
 for(const file of ['decisions.js','lab-ui.js','lab.css'])
  assert.ok(sw.includes("'./"+file+"'"));
 assert.ok(game.includes("symbiont-city:cleared"));
 assert.ok(game.includes("symbiont-city:export"));
});
