'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../symbiont-city/social-organism.js');
const H=require('../symbiont-city/adult-health.js');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../symbiont-city');
test('social organism has plural civic strategies, not a forced political answer',()=>{
 assert.equal(S.scenarios.length,3);
 for(const sc of S.scenarios){
  assert.ok(sc.title&&sc.question&&sc.facts.length>=2);
  assert.ok(sc.options.length>=3);
  for(const o of sc.options){assert.ok(o.text.length>15&&o.why.length>25);assert.equal(o.effect.length,4);}
 }
 assert.match(S.interpretation,/метафора/i);
 assert.match(S.interpretation,/не нейробиологический факт/i);
});
test('social systems choices show shared public consequences without accumulating repeated rewards',()=>{
 const game=S.init();
 assert.deepEqual(S.metrics(game),S.BASE);
 for(const sc of S.scenarios)S.choose(game,sc.id,1);
 assert.equal(Object.keys(game.decisions).length,3);
 const before=S.metrics(game);
 for(let i=0;i<30;i++)S.choose(game,S.scenarios[0].id,1);
 assert.deepEqual(S.metrics(game),before);
 S.choose(game,S.scenarios[0].id,0);
 assert.notDeepEqual(S.metrics(game),before);
 S.choose(game,S.scenarios[0].id,1);
 assert.deepEqual(S.metrics(game),before);
});
test('social game keeps metric values bounded and accepts only valid options',()=>{
 const s=S.init();
 assert.equal(S.choose(s,'invalid',0),null);
 assert.equal(S.choose(s,'water',999),null);
 assert.equal(S.choose(s,'water',1.5),null);
 for(const scenario of S.scenarios){
  S.choose(s,scenario.id,2);
 }
 for(const v of Object.values(S.metrics(s)))assert.ok(v>=0&&v<=100);
});
test('social decisions restore only expected fields and ignore unrecognized records',()=>{
 const s=S.restore({version:1,decisions:{water:2,feedback:1,network:0,secret:123,privateNotes:'x'}});
 assert.deepEqual(s.decisions,{water:2,feedback:1,network:0});
 assert.deepEqual(S.restore(null),S.init());
 assert.deepEqual(S.restore({version:2,decisions:{water:1}}),S.init());
});
test('adult health module is unavailable at all ages below 18',()=>{
 for(let age=0;age<18;age++){
  assert.equal(H.isAdult(age),false);
  for(const l of H.lessons)assert.equal(H.inspect(H.create(),l.id,l.answer,age),null);
 }
 for(const age of [18,25,48,80,110])assert.equal(H.isAdult(age),true);
 assert.equal(H.isAdult(111),false);
});
test('health education covers pregnancy alcohol, smoking, phone attention, family support',()=>{
 assert.equal(H.lessons.length,4);
 for(const l of H.lessons){
  assert.ok(l.title&&l.situation&&l.options.length===3);
  assert.ok(l.explanation.length>40&&l.reflection.length>12);
  assert.ok(l.source.startsWith('https://'));
  assert.ok(l.answer>=0&&l.answer<3);
 }
 assert.match(H.lessons[0].explanation,/не установлен безопасный уровень/i);
 assert.match(H.lessons[1].explanation,/дым/);
 assert.match(H.lessons[2].explanation,/не означает.*обязательно/i);
});
test('adult lessons never collect or store substance intake or medical histories',()=>{
 const s=H.create();
 const wrong=H.inspect(s,'alcohol',0,25);
 assert.equal(wrong.helpful,false);
 assert.deepEqual(s.completed,{});
 const good=H.inspect(s,'alcohol',1,25);
 assert.equal(good.helpful,true);assert.deepEqual(s.completed,{alcohol:true});
 const cached=H.restore(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(cached,s);
 assert.equal(H.inspect(s,'invalid',0,25),null);
 assert.equal(H.inspect(s,'alcohol',100,25),null);
});
test('adult save migration discards unknown health fields and invalid completion flags',()=>{
 const r=H.restore({version:1,completed:{alcohol:true,tobacco:'yes',secret:'private',screens:true}});
 assert.deepEqual(r.completed,{alcohol:true,screens:true});
 assert.deepEqual(H.restore({version:9,completed:{alcohol:true}}),H.create());
});
test('public HTML includes accessible civic and age-gated health modules and PWA assets',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const id of ['socialSection','socialCards','socialMeters','socialCount',
  'adultHealthSection','adultHealthCards','adultHealthCount','systemsOverlay','systemsBody','systemsNext']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(html.includes('id="adultHealthSection"')&&html.includes('hidden'));
 for(const file of ['social-organism.js','adult-health.js','social-health-ui.js','social-health.css']){
  assert.ok(html.includes('./'+file));assert.ok(sw.includes("'./"+file+"'"));
 }
 assert.ok(sw.includes('yugatneo-symbiont-city-v7'));
 const ui=fs.readFileSync(path.join(root,'social-health-ui.js'),'utf8');
 assert.ok(!ui.includes('initDataUnsafe'));
 assert.ok(!ui.includes('fetch('));
 assert.ok(ui.includes("if(kind==='health'&&!adult())return"));
});

test('civic story language adapts to children without requiring an ideological belief',()=>{
 assert.equal(S.view('water',2),null);
 assert.equal(S.view('water',111),null);
 for(let age=3;age<=110;age++){
  const v=S.view('feedback',age);
  assert.ok(v&&v.agePrompt);
  assert.equal(v.options.length,3);
  if(age<=8)assert.match(v.description,/школы|дорожка/);
  else assert.match(v.description,/учреждение|учреждени/);
 }
 assert.match(S.view('network',6).description,/школа|клиника/i);
 assert.match(S.interpretation,/не нейробиологический факт/);
});
