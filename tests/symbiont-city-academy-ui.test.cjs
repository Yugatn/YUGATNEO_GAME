'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=['game.js','lab-ui.js','workshops-ui.js','help-route-ui.js','academy-ui.js','spiral-runner-ui.js']
 .map(f=>fs.readFileSync(path.join(root,f),'utf8'));
const C=require('../symbiont-city/content.js'),E=require('../symbiont-city/engine.js');
const L=require('../symbiont-city/decisions.js'),W=require('../symbiont-city/workshops.js');
const H=require('../symbiont-city/help-route.js'),A=require('../symbiont-city/academy.js');
const S=require('../symbiont-city/spiral-runner.js');
function ctx(){return {setTransform(){},fillRect(){},strokeRect(){},fillText(){},strokeText(){},
 beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},
 save(){},restore(){},translate(){},scale(){},createLinearGradient:()=>({addColorStop(){}})};}
function setup(){
 const d=new JSDOM(html,{url:'https://example.test/symbiont-city/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=d.window,errors=[];
 w.SymbiontCityContent=C;w.SymbiontCityEngine=E;w.SymbiontCityLab=L;
 w.SymbiontWorkshops=W;w.SymbiontHelpRoute=H;w.SymbiontAcademy=A;w.SymbiontSpiralRunner=S;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:330,height:420,left:0,top:0,right:330,bottom:420});
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.matchMedia=()=>({matches:false});
 w.addEventListener('error',e=>errors.push(e.message));
 for(const s of scripts)w.eval(s);
 return {w,errors};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,id);return x;}
function click(w,selector){const x=w.document.querySelector(selector);assert.ok(x,selector);x.click();}
function age(w,n){el(w,'age').value=String(n);el(w,'age').dispatchEvent(new w.Event('change'));}
test('12 philosophy, coaching and safety academy cards are visible on City home',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(w.document.querySelectorAll('[data-academy-id]').length,12);
  assert.equal(w.document.querySelectorAll('.academy-track').length,4);
  assert.match(el(w,'academyCount').textContent,/0 \/ 12/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('a supportive question grants only an anonymous completion marker',()=>{
 const {w,errors}=setup();
 try{
  age(w,10);
  click(w,'[data-academy-id="friend"]');assert.equal(el(w,'academyOverlay').hidden,false);
  click(w,'#academyNext');assert.equal(w.document.querySelectorAll('[data-academy-answer]').length,3);
  click(w,'[data-academy-answer="1"]');
  assert.match(el(w,'academyBody').textContent,/разрешени|слушай/);
  assert.match(el(w,'academyCount').textContent,/1 \/ 12/);
  const stored=JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.academy.v1'));
  assert.deepEqual(stored.completed,{friend:true});
  click(w,'#academyNext');assert.equal(el(w,'academyOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('incorrect choice is explained without penalizing or marking completion',()=>{
 const {w,errors}=setup();
 try{
  click(w,'[data-academy-id="rumor"]');click(w,'#academyNext');
  click(w,'[data-academy-answer="0"]');
  assert.match(el(w,'academyBody').textContent,/важный момент/i);
  assert.match(el(w,'academyCount').textContent,/0 \/ 12/);
  click(w,'#academyBack');click(w,'[data-academy-answer="1"]');
  assert.match(el(w,'academyCount').textContent,/1 \/ 12/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('age 1 is caregiver-only; age 7 health quest never contains STI; teen has older topic',()=>{
 const {w,errors}=setup();
 try{
  age(w,1);click(w,'[data-academy-id="prevention"]');
  assert.match(el(w,'academyBody').textContent,/вне экрана/);
  assert.equal(w.document.querySelectorAll('[data-academy-answer]').length,0);
  click(w,'#academyNext');
  age(w,7);click(w,'[data-academy-id="prevention"]');
  assert.doesNotMatch(el(w,'academyBody').textContent,/презерватив|контрацепц|ИППП/i);
  click(w,'#academyClose');
  age(w,16);click(w,'[data-academy-id="prevention"]');
  assert.match(el(w,'academyBody').textContent,/ИППП/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('runner launches inside city with moving camera and three input controls zones',()=>{
 const {w,errors}=setup();
 try{
  age(w,11);click(w,'#spiralStart');
  assert.equal(el(w,'spiralOverlay').hidden,false);
  assert.equal(el(w,'spiralCanvas').hidden,false);
  assert.equal(w.document.querySelectorAll('[data-spiral-direction]').length,4);
  assert.match(el(w,'spiralFloor').textContent,/1\/3/);
  click(w,'#spiralHint');assert.match(el(w,'spiralStatus').textContent,/Подсказка/);
  click(w,'#spiralDone');assert.equal(el(w,'spiralOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('runner for 0-2 is only offline activity and does not register child performance',()=>{
 const {w,errors}=setup();
 try{
  age(w,2);click(w,'#spiralStart');
  assert.equal(el(w,'spiralCanvas').hidden,true);
  assert.equal(el(w,'spiralControls').hidden,true);
  assert.match(el(w,'spiralIntro').textContent,/настоящий лабиринт/);
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.spiral-runner.v1'),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('export includes aggregate Academy and Runner achievements and clear removes both',()=>{
 const {w,errors}=setup();
 try{
  click(w,'[data-academy-id="small-plus"]');
  click(w,'#academyNext');click(w,'[data-academy-answer="0"]');
  const payload={};
  w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail:payload}));
  assert.deepEqual(Array.from(payload.academy.completed),['small-plus']);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.spiralRunner)),{best:0,wins:0});
  w.document.dispatchEvent(new w.Event('symbiont-city:cleared'));
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.academy.v1'),null);
  assert.match(el(w,'academyCount').textContent,/0 \/ 12/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
