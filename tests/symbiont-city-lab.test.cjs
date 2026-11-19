'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const L=require('../symbiont-city/decisions.js');
const D=require('../symbiont-city/content.js');
const E=require('../symbiont-city/engine.js');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
const labUI=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
const label=fs.readFileSync(path.join(root,'lab.css'),'utf8');
function canvasContext(){
 const gradient=()=>({addColorStop(){}});
 return {createLinearGradient:gradient,setTransform(){},fillRect(){},strokeRect(){},
 fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},
 moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},
 fill(){},stroke(){},closePath(){},save(){},restore(){},translate(){},scale(){}};
}
function setup(saved){
 const d=new JSDOM(html,{url:'https://example.test/symbiont-city/',pretendToBeVisual:true,
  runScripts:'outside-only'});
 const w=d.window,frames=[],errors=[];
 w.SymbiontCityContent=D;w.SymbiontCityEngine=E;w.SymbiontCityLab=L;
 w.HTMLCanvasElement.prototype.getContext=()=>canvasContext();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  width:720,height:549,left:0,top:0,right:720,bottom:549,x:0,y:0,toJSON(){}
 });
 w.matchMedia=()=>({matches:false});
 w.requestAnimationFrame=cb=>{frames.push(cb);return frames.length};
 w.addEventListener('error',e=>errors.push(e.message));
 if(saved)w.localStorage.setItem('yugatneo.symbiont-city.lab.v1',JSON.stringify(saved));
 w.eval(controller);w.eval(labUI);
 return {w,errors,frames};
}
function el(w,id){const node=w.document.getElementById(id);assert.ok(node,'missing '+id);return node;}
function enter(w,id){
 const btn=w.document.querySelector('[data-lab-id="'+id+'"]');
 assert.ok(btn,'missing scenario button '+id);btn.click();
}
function next(w){el(w,'labNext').click();}
function choice(w,index){
 const btn=w.document.querySelector('[data-lab-option="'+index+'"]');
 assert.ok(btn,'option '+index+' missing');btn.click();
}
function setupDecision(w,id){
 enter(w,id);next(w);next(w);
 assert.equal(el(w,'labOverlay').hidden,false);
}
test('all ages 0–110 are defined; toddler mode is offline with zero choice buttons',()=>{
 const prompts=new Set();
 for(let a=0;a<=110;a++){
  assert.ok(['caregiver','young','school','teen','adult'].includes(L.ageBand(a)),a);
  const v=L.view('generator',a);
  assert.ok(v.intro&&v.lens);
  if(a<=2){assert.equal(v.caregiver,true);assert.equal(v.options.length,0);}
  else assert.ok(v.options.length>=2);
  if(a>=6&&a<=17)prompts.add(v.lens);
 }
 assert.equal(prompts.size,12,'a distinct scaffold for each age 6–17');
 for(const sc of L.scenarios){
  const toddler=L.view(sc.id,2),preschool=L.view(sc.id,4),adult=L.view(sc.id,35);
  assert.equal(toddler.options.length,0,sc.id);
  assert.equal(preschool.options.length,2,sc.id);
  assert.equal(adult.options.length,3,sc.id);
  assert.equal(preschool.options.some(o=>o.effects.trust>0||o.effects.safety>0),true,
   'young players must have a constructive choice available '+sc.id);
 }
});
test('all scenario solutions affect multiple resources without score or moral diagnostics',()=>{
 const st=L.initial();
 assert.equal(L.progress(st).done,0);
 for(const sc of L.scenarios){
  const view=L.view(sc.id,15);
  assert.equal(view.options.length,3);
  const answer=L.choice(st,sc.id,2,15);
  assert.ok(answer&&answer.reason.length>10);
  assert.equal(answer.first,true);
  assert.ok(answer.after.safety>=0&&answer.after.safety<=100);
  assert.ok(Object.keys(answer.delta).length===4);
 }
 assert.equal(L.progress(st).done,5);
 const before=L.metrics(st),same=L.choice(st,'generator',2,15);
 assert.equal(same.first,false);
 assert.deepEqual(L.metrics(st),before,'replays cannot accumulate extra points');
 L.choice(st,'generator',0,15);
 assert.notDeepEqual(L.metrics(st),before,'revisions replace the old consequences');
 L.choice(st,'generator',2,15);
 assert.deepEqual(L.metrics(st),before,'changing back restores the same totals');
});
test('invalid scenario answers, premature toddler choices and corrupted saves are rejected',()=>{
 const st=L.initial();
 assert.equal(L.choice(st,'bad',0,20),null);
 assert.equal(L.choice(st,'garden',-1,20),null);
 assert.equal(L.choice(st,'garden',100,20),null);
 assert.equal(L.choice(st,'garden',0,1),null);
 assert.equal(L.choice(st,'generator',1,5),null,'cannot choose hidden options in preschool mode');
 assert.equal(L.progress(st).done,0);
 assert.deepEqual(L.restore({version:1,choices:{generator:900}}),L.initial());
 assert.deepEqual(L.restore({version:1,choices:{unknown:1}}),L.initial());
 assert.deepEqual(L.restore(null),L.initial());
});
test('solo player plays full evidence → option → consequence → reflection loop',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(el(w,'labCards').querySelectorAll('[data-lab-id]').length,5);
  setupDecision(w,'generator');
  assert.equal(el(w,'labBody').querySelectorAll('[data-lab-option]').length,2);
  choice(w,2);
  assert.match(el(w,'labBody').textContent,/Игровые последствия/);
  assert.match(el(w,'labBody').textContent,/Следующий вопрос/);
  assert.match(el(w,'labCount').textContent,/1 \/ 5/);
  next(w);
  assert.match(el(w,'labBody').textContent,/Рефлексия/);
  next(w);
  assert.equal(el(w,'labOverlay').hidden,true);
  assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1')).choices.generator,2);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('age 3–5 forces family mode with two votes and a joint choice, no timer pressure',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='4';el(w,'age').dispatchEvent(new w.Event('change'));
  assert.equal(el(w,'labTogether').checked,true);
  assert.equal(el(w,'labTogether').disabled,true);
  setupDecision(w,'bridge');
  assert.match(el(w,'labBody').textContent,/Первый участник/);
  choice(w,0);assert.match(el(w,'labBody').textContent,/Второй участник/);
  choice(w,1);assert.match(el(w,'labBody').textContent,/Сравните два выбора/);
  choice(w,1);assert.match(el(w,'labBody').textContent,/Игровые последствия/);
  assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1')).choices.bridge,1);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('ages 0–2 can read caregiver tips but cannot save a mission decision',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='1';el(w,'age').dispatchEvent(new w.Event('change'));
  enter(w,'garden');
  assert.match(el(w,'labBody').textContent,/Младенцу не нужна экранная игра/);
  assert.equal(el(w,'labBody').querySelectorAll('[data-lab-option]').length,0);
  next(w);assert.equal(el(w,'labOverlay').hidden,true);
  assert.match(el(w,'labCount').textContent,/0 \/ 5/);
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('revisiting completed scenario never doubles simulated impact',()=>{
 const saved=L.initial();L.choice(saved,'rumor',2,18);
 const {w,errors}=setup(saved);
 try{
  const before=el(w,'labMeters').textContent;
  setupDecision(w,'rumor');choice(w,2);
  assert.equal(el(w,'labMeters').textContent,before);
  assert.match(el(w,'labCount').textContent,/1 \/ 5/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('export and confirmed clear of base campaign also export and clear lab state',()=>{
 const {w,errors}=setup();
 try{
  setupDecision(w,'generator');choice(w,2);
  const payload={};
  w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail:payload}));
  assert.equal(payload.lab.completed,1);
  assert.equal(payload.lab.choices.generator,2);
  w.confirm=()=>false;
  el(w,'clear').click();
  assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1')).choices.generator,2,
   'cancelled erase must retain lab');
  w.confirm=()=>true;el(w,'clear').click();
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'),null);
  assert.match(el(w,'labCount').textContent,/0 \/ 5/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('new lab assets integrate without remote gameplay service or collecting private responses',()=>{
 const source=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const id of ['labSection','labTogether','labCards','labOverlay','labTitle',
  'labBody','labBack','labNext','labCity','labMeters']){
  assert.ok(index.includes('id="'+id+'"'),id);
 }
 assert.ok(index.includes('src="./decisions.js"'));
 assert.ok(index.includes('src="./lab-ui.js"'));
 assert.ok(index.includes('href="./lab.css"'));
 assert.ok(label.includes('@media(max-width:640px)'));
 assert.ok(source.includes('localStorage.setItem(STORE'));
 assert.equal(source.includes('initDataUnsafe'),false);
 assert.equal(source.includes('fetch('),false);
 for(const name of ['decisions.js','lab-ui.js','lab.css'])assert.ok(sw.includes(name),name);
});
