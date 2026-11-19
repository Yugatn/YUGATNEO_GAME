'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../symbiont-city/engine.js');
const D=require('../symbiont-city/content.js');
const ages=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,25,39,40,59,60,74,75,90,110];
function solve(view){
 const c=E.newChallenge(view);
 if(view.kind==='dialogue'){
  let bad=view.choices.findIndex(x=>x.quality<2);
  if(bad>=0){const res=E.answerChoice(c,view,bad);assert.equal(res.complete,false);}
  const good=view.choices.findIndex(x=>x.quality>=2);
  assert.ok(good>=0);E.answerChoice(c,view,good);
 }
 if(view.kind==='evidence'){
  const bad=view.sources.findIndex(x=>!x.reliable);
  if(bad>=0)E.answerChoice(c,view,bad);
  E.answerChoice(c,view,view.sources.findIndex(x=>x.reliable));
 }
 if(view.kind==='sequence'){
  for(let i=0;i<view.steps.length;i++){
   const r=E.chooseSequence(c,view,i);
   if(i===view.steps.length-1)assert.equal(r.complete,true);
  }
 }
 if(view.kind==='focus'){
  for(const icon of view.symbols)E.focusTap(c,view,icon);
 }
 if(view.kind==='design'||view.kind==='perspectives'){
  const list=view.kind==='design'?view.parts:view.perspectives;
  const good=list.map((item,i)=>({i,ok:view.kind==='design'?item.suitable:item.useful}))
    .filter(x=>x.ok).map(x=>x.i);
  assert.ok(good.length>=2,'two constructive choices present for all ages');
  E.togglePart(c,view,good[0]);E.togglePart(c,view,good[1]);
  assert.equal(E.checkParts(c,view).complete,true);
 }
 if(view.kind==='resources'){
  for(let i=0;i<3;i++)
   for(let n=0;n<view.minimums[i];n++)assert.equal(E.adjustResources(c,view,i,1),true);
  while(c.allocation.reduce((a,b)=>a+b,0)<view.total)E.adjustResources(c,view,0,1);
  assert.equal(E.checkResources(c,view).complete,true);
 }
 assert.equal(c.done,true,'solvable '+view.id+' at age '+view.age.age);
 return c;
}
test('lifespan profiles 0..110 always work; 6-17 remain distinct annual profiles',()=>{
 for(let a=0;a<=110;a++){
  const profile=E.ageProfile(a),state=E.initial(a);
  assert.equal(profile.age,a);assert.ok(profile.profile.label);
  assert.ok(profile.profile.options>=2);
  assert.equal(state.age,a);
  assert.equal(E.isValidState(state),true);
  assert.equal(profile.coPlayOnly,a<=2);
 }
 const profiles=Array.from({length:12},(_,i)=>E.ageProfile(i+6).profile.label);
 assert.equal(new Set(profiles).size,12,'every age 6-17 has a dedicated profile');
 assert.equal(E.ageProfile(20).stage,'adult');
 assert.equal(E.ageProfile(60).stage,'senior');
 assert.equal(E.ageProfile(110).age,110);
 assert.equal(E.ageProfile(111).age,110);
 assert.equal(E.ageProfile(-5).age,0);
});
test('all 14 original missions are completable at every child, teen, adult and older-adult profile',()=>{
 for(const age of ages.filter(x=>x>=3)){
  const state=E.initial(age);
  for(const mission of D.missions){
   const view=E.missionView(state,mission),c=solve(view);
   const receipt=E.complete(state,view,c);
   assert.ok(receipt&&receipt.points>0,'earned receipt at age '+age);
   assert.equal(E.complete(state,view,c),false,'no repeated rewards');
  }
  const p=E.progress(state);
  assert.equal(p.done,14);assert.equal(p.percent,100);
  assert.equal(p.districts,7);
  assert.equal(p.points,state.points);
  assert.ok(state.points>14*40);
 }
});
test('6 to 11 have separate situation wording and progressive interactive complexity',()=>{
 const mission=D.missions.find(m=>m.id==='garden-1');
 const texts=[];
 for(let age=6;age<=11;age++){
  const state=E.initial(age);
  const view=E.missionView(state,mission);
  texts.push(view.situation);
  assert.ok(view.choices.length>=2);
 }
 assert.equal(new Set(texts).size,6);
 const maze=D.missions.find(m=>m.id==='tower-1');
 assert.ok(E.missionView(E.initial(6),maze).steps.length<
  E.missionView(E.initial(11),maze).steps.length);
 const focus=D.missions.find(m=>m.id==='tower-2');
 assert.ok(E.missionView(E.initial(6),focus).symbols.length<
  E.missionView(E.initial(11),focus).symbols.length);
});
test('teen, adult and 60+ scenarios are contextually different, without automatic ageist skill downgrade',()=>{
 const mission=D.missions.find(m=>m.id==='dialogue-1');
 const young=E.missionView(E.initial(6),mission).situation;
 const teen=E.missionView(E.initial(15),mission).situation;
 const adult=E.missionView(E.initial(35),mission).situation;
 const senior=E.missionView(E.initial(76),mission).situation;
 assert.equal(new Set([young,teen,adult,senior]).size,4);
 assert.equal(E.ageProfile(35).profile.memory,E.ageProfile(76).profile.memory);
});
test('0–2 mode is explicitly caregiver-only; early play can include a supportive adult',()=>{
 for(let age=0;age<=2;age++){
  const profile=E.ageProfile(age);
  assert.equal(profile.coPlayOnly,true);
  assert.match(profile.profile.scaffold,/взросл|Взросл/);
 }
 for(let age=3;age<=5;age++){
  const profile=E.ageProfile(age);assert.equal(profile.coPlay,true);
 }
});
test('challenge level is independently selectable and never alters chronological age',()=>{
 const state=E.initial(9);
 E.setChallenge(state,'gentle');let p=E.ageProfile(state.age,state.challenge);
 assert.equal(p.age,9);assert.equal(p.effective,8);
 E.setChallenge(state,'stretch');p=E.ageProfile(state.age,state.challenge);
 assert.equal(p.age,9);assert.equal(p.effective,10);
 assert.equal(E.setChallenge(state,'invalid'),false);
 assert.equal(state.challenge,'stretch');
});
test('evidence requires checking a verifiable source, not clicking any answer',()=>{
 const state=E.initial(16),view=E.missionView(state,D.missions.find(x=>x.id==='library-1')),c=E.newChallenge(view);
 const bad=view.sources.findIndex(x=>!x.reliable),good=view.sources.findIndex(x=>x.reliable);
 assert.equal(E.answerChoice(c,view,bad).complete,false);
 assert.equal(c.done,false);
 assert.equal(E.answerChoice(c,view,good).complete,true);
});
test('dismissive dialogue response asks for reconsideration, rather than unlocking progress',()=>{
 const view=E.missionView(E.initial(6),D.missions.find(x=>x.id==='dialogue-1')),c=E.newChallenge(view);
 assert.equal(E.answerChoice(c,view,0).complete,false);
 assert.match(c.feedback,/попробовать/);
 assert.equal(c.done,false);
 assert.equal(E.answerChoice(c,view,1).complete,true);
 assert.equal(c.quality,2,'retry can succeed without being ascribed perfect first choice');
});
test('resource puzzles require complete allocation respecting critical minimums',()=>{
 const view=E.missionView(E.initial(8),D.missions.find(x=>x.id==='bridge-2')),c=E.newChallenge(view);
 assert.ok(view.total>=view.minimums.reduce((a,b)=>a+b));
 assert.equal(E.checkResources(c,view).complete,false);
 assert.equal(E.adjustResources(c,view,0,-1),false);
 for(let i=0;i<view.minimums.length;i++)
  for(let n=0;n<view.minimums[i];n++)E.adjustResources(c,view,i,1);
 while(c.allocation.reduce((a,b)=>a+b,0)<view.total)E.adjustResources(c,view,0,1);
 assert.equal(E.checkResources(c,view).complete,true);
 assert.equal(E.adjustResources(c,view,0,1),false);
});
test('memory sequence resets after a mismatch but has no time penalty',()=>{
 const view=E.missionView(E.initial(11),D.missions.find(m=>m.id==='tower-2')),c=E.newChallenge(view);
 const wrong=view.options.find(x=>x!==view.symbols[0]);
 assert.equal(E.focusTap(c,view,wrong).complete,false);
 assert.equal(c.focusInput.length,0);
 for(const icon of view.symbols)E.focusTap(c,view,icon);
 assert.equal(c.done,true);
});
test('ordered-action puzzles cannot be skipped or have steps chosen twice',()=>{
 const view=E.missionView(E.initial(10),D.missions.find(x=>x.id==='tower-1')),c=E.newChallenge(view);
 assert.equal(E.chooseSequence(c,view,2).complete,false);
 assert.equal(c.sequence.length,0);
 E.chooseSequence(c,view,0);
 assert.equal(E.chooseSequence(c,view,0),null);
 for(let i=1;i<view.steps.length;i++)E.chooseSequence(c,view,i);
 assert.equal(c.done,true);
});
test('restore recomputes trustworthy progress, drops unauthorized records and refuses invalid data',()=>{
 const state=E.initial(37);
 const m=D.missions.find(m=>m.id==='garden-1');
 const c=solve(E.missionView(state,m));E.complete(state,E.missionView(state,m),c);
 const serialized=JSON.parse(JSON.stringify(state));
 serialized.points=999999;serialized.skillPoints['Саморегуляция']=999999;
 const restored=E.restore(serialized);
 assert.equal(restored.points,state.points);
 assert.equal(restored.skillPoints['Саморегуляция'],state.skillPoints['Саморегуляция']);
 assert.equal(E.restore({...serialized,age:-1}),null);
 assert.equal(E.restore({...serialized,age:112}),null);
 assert.equal(E.restore({...serialized,completed:{'bogus':{points:5}}}),null);
});
test('all missions have distinct ids, age-specific text, safe and inspectable outcomes',()=>{
 assert.equal(D.districts.length,7);
 assert.equal(D.missions.length,14);
 assert.equal(new Set(D.missions.map(m=>m.id)).size,14);
 for(const m of D.missions){
  assert.ok(D.districts.some(d=>d.id===m.district));
  assert.equal(m.situation.length,6);
  assert.ok(m.reflect.length>10&&m.takeaway.length>10);
  assert.ok(D.lifeContexts[m.id].teen&&D.lifeContexts[m.id].adult&&D.lifeContexts[m.id].senior);
 }
});
