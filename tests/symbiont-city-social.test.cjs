'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const G=require('../symbiont-city/common-good.js');
const H=require('../symbiont-city/adult-care.js');
const dir=path.resolve(__dirname,'../symbiont-city');
test('civic game models 7 interdependent services and 3 distinct city events',()=>{
 assert.equal(G.INFRA.length,7);
 assert.equal(new Set(G.INFRA.map(n=>n.id)).size,7);
 assert.equal(G.SCENES.length,3);
 for(const n of G.INFRA)for(const link of n.links)
  assert.ok(G.INFRA.some(x=>x.id===link),'all links resolve');
 for(const sc of G.SCENES){
  const state=G.make(sc.id,9);assert.equal(state.phase,'playing');
  assert.equal(G.metrics(state).effective.water<=100,true);
  assert.equal(state.funds,3);
 }
});
test('repairing a shared network node affects service delivery to other nodes',()=>{
 const state=G.make('water',12),before=G.metrics(state);
 const action=G.repair(state,'water');
 assert.equal(action.remaining,2);
 const after=G.metrics(state);
 assert.ok(after.effective.water>before.effective.water);
 assert.ok(after.effective.clinic>before.effective.clinic);
 assert.ok(after.effective.homes>before.effective.homes);
 assert.ok(after.average>before.average);
});
test('budget is finite; invalid actions and repeat rewards cannot farm a score',()=>{
 const game=G.make('signal',7),record=G.initial();
 assert.equal(game.funds,4,'younger players get one more aid turn');
 assert.equal(G.repair(game,'unknown'),null);
 for(let i=0;i<4;i++)assert.ok(G.repair(game,['signal','water','school','clinic'][i]));
 assert.equal(game.funds,0);
 assert.equal(G.repair(game,'homes'),null);
 const result=G.finish(game);
 assert.ok(result.average>0&&result.minimum>=0);
 assert.equal(G.repair(game,'homes'),null);
 assert.ok(G.record(record,game));
 assert.equal(G.record(record,game),false);
 assert.equal(record.played,1);
});
test('a slower or less optimal city repair still completes without a time penalty',()=>{
 for(const sc of G.SCENES){
  const game=G.make(sc.id,18);
  assert.equal(G.finish(game).average,G.metrics(game).average);
  assert.equal(game.phase,'complete');
  assert.ok(G.record(G.initial(),game));
 }
});
test('civic material compares three peaceful options without rewarding a political stance',()=>{
 for(let a=3;a<=110;a++){
  for(const v of G.CIVIC){
   const c=G.civicView(v.id,a);
   assert.ok(c&&c.approaches.length===3);
   for(let i=0;i<3;i++){
    const answer=G.consider(v.id,a,i);
    assert.ok(answer.plus&&answer.limit&&answer.question);
    assert.equal('correct' in answer,false);
   }
  }
 }
 const infant=G.civicView('feedback',1);
 assert.equal(infant.caregiver,true);assert.deepEqual(infant.approaches,[]);
 assert.match(G.civicView('metaphor',25).note,/авторская метафора/);
 assert.match(G.civicView('metaphor',25).prompt,/революцию/);
 assert.doesNotMatch(G.civicView('metaphor',12).prompt,/революц/i);
 assert.equal(G.consider('feedback',2,1),null);
});
test('service records save only anonymous aggregates and reject corrupt data',()=>{
 const r={version:1,best:67,played:14};
 assert.deepEqual(G.restore(r),r);
 assert.deepEqual(G.restore({version:1,best:155,played:10}),G.initial());
 assert.deepEqual(G.restore(null),G.initial());
 assert.equal(G.make('water',-1),null);
 assert.equal(G.make('invalid',15),null);
 assert.equal(G.make('water',1).phase,'caregiver');
});
test('adult health academy has five evidence-linked cases and refuses age below 18',()=>{
 assert.equal(H.EPISODES.length,5);
 assert.equal(new Set(H.ids).size,5);
 for(const episode of H.EPISODES){
  assert.equal(H.view(episode.id,17).locked,true);
  const adult=H.view(episode.id,18);
  assert.ok(!adult.locked);
  assert.equal(adult.choices.length,3);
  assert.ok(adult.sourceUrl.startsWith('https://'));
  for(let i=0;i<3;i++)assert.ok(H.choose(episode.id,35,i).feedback.length>45);
  assert.equal(H.choose(episode.id,16,0),null);
 }
});
test('pregnancy alcohol safety and parent smartphone lessons do not exaggerate evidence',()=>{
 const plan=H.choose('plan',30,1);
 assert.match(plan.feedback,/безопасный уровень.*не установлен/);
 const smoke=H.choose('smoke',30,1);
 assert.match(smoke.feedback,/пассивное курение/);
 const phone=H.choose('phone',30,0);
 assert.match(phone.feedback,/ассоциации/);
 assert.match(phone.feedback,/не доказывают/);
 assert.match(H.choose('example',30,0).feedback,/не означает.*обязательно/);
 assert.match(H.choose('support',30,1).feedback,/наблюдения бывает опасным/);
});
test('no personal alcohol, pregnancy or phone history is saved, only completion flags',()=>{
 const state=H.initial();
 assert.equal(H.record(state,'phone',17,1),false);
 assert.equal(H.record(state,'phone',32,99),false);
 assert.equal(H.record(state,'phone',32,1),true);
 assert.deepEqual(state.completed,{phone:true});
 assert.deepEqual(H.restore(JSON.parse(JSON.stringify(state))),state);
 assert.deepEqual(H.restore({version:1,completed:{secret:'user info',phone:true,plan:123}}),
  {version:1,completed:{phone:true}});
 assert.equal(H.choose('invalid',40,0),null);
});
test('offline web application connects both interactive modules without tracking',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),
  sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8'),
  ui=fs.readFileSync(path.join(dir,'social-ui.js'),'utf8');
 for(const name of ['common-good.js','adult-care.js','social-ui.js','social.css']){
  assert.ok(html.includes('./'+name),name);
  assert.ok(sw.includes("'./"+name+"'"),name);
 }
 for(const id of ['socialSection','socialScenes','socialCivic','socialOverlay',
   'socialBody','socialFinish','adultSection','adultCards','adultLocked']){
  assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 }
 assert.ok(sw.includes('yugatneo-symbiont-city-v7'));
 assert.ok(ui.includes('symbiont-city:cleared')&&ui.includes('symbiont-city:export'));
 assert.equal(ui.includes('initDataUnsafe'),false);
 assert.equal(ui.includes('fetch('),false);
});
