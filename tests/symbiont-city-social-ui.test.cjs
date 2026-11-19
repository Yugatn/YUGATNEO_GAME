'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const paths=['game.js','lab-ui.js','workshops-ui.js','help-route-ui.js',
 'academy-ui.js','spiral-runner-ui.js','social-ui.js'];
const scripts=paths.map(path=>fs.readFileSync(path?require('node:path').join(root,path):'', 'utf8'));
const C=require('../symbiont-city/content.js'),E=require('../symbiont-city/engine.js');
const L=require('../symbiont-city/decisions.js'),W=require('../symbiont-city/workshops.js');
const R=require('../symbiont-city/help-route.js'),A=require('../symbiont-city/academy.js');
const S=require('../symbiont-city/spiral-runner.js'),G=require('../symbiont-city/common-good.js');
const H=require('../symbiont-city/adult-care.js');
function context(){return {setTransform(){},fillRect(){},strokeRect(){},fillText(){},strokeText(){},
 beginPath(){},arc(){},ellipse(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},save(){},restore(){},
 translate(){},scale(){},createLinearGradient:()=>({addColorStop(){}})};}
function setup(){
 const dom=new JSDOM(html,{pretendToBeVisual:true,runScripts:'outside-only',url:'https://example.test/symbiont-city/'});
 const w=dom.window,errors=[];
 Object.assign(w,{SymbiontCityContent:C,SymbiontCityEngine:E,SymbiontCityLab:L,
  SymbiontWorkshops:W,SymbiontHelpRoute:R,SymbiontAcademy:A,
  SymbiontSpiralRunner:S,SymbiontCommonGood:G,SymbiontAdultCare:H});
 w.HTMLCanvasElement.prototype.getContext=()=>context();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  x:0,y:0,width:360,height:420,left:0,top:0,right:360,bottom:420});
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.matchMedia=()=>({matches:false});
 w.addEventListener('error',e=>errors.push(e.message));
 for(const script of scripts)w.eval(script);
 return {w,errors};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,id);return x;}
function click(w,selector){const b=w.document.querySelector(selector);assert.ok(b,selector);b.click();}
function age(w,n){el(w,'age').value=String(n);el(w,'age').dispatchEvent(new w.Event('change'));}
test('all three resource episodes and civic comparisons are interactive from the city',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(w.document.querySelectorAll('[data-social-scene]').length,3);
  assert.equal(w.document.querySelectorAll('[data-civic-id]').length,3);
  click(w,'[data-social-scene="water"]');
  assert.equal(el(w,'socialOverlay').hidden,false);
  assert.equal(w.document.querySelectorAll('[data-repair-id]').length,7);
  assert.match(el(w,'socialBody').textContent,/Ресурсных действий: 4/);
  click(w,'[data-repair-id="water"]');
  assert.match(el(w,'socialBody').textContent,/Ресурсных действий: 3/);
  click(w,'#socialFinish');
  assert.match(el(w,'socialRecord').textContent,/1 попыток/);
  assert.match(el(w,'socialBody').textContent,/Средний показатель/);
  click(w,'#socialFinish');assert.equal(el(w,'socialOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('resources do not stack rewards after repeated return or restart',()=>{
 const {w,errors}=setup();
 try{
  click(w,'[data-social-scene="signal"]');click(w,'#socialFinish');
  const first=JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.common-good.v1')).played;
  click(w,'#socialFinish');click(w,'[data-social-scene="signal"]');
  assert.match(el(w,'socialBody').textContent,/Ресурсных действий: 4/);
  assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.common-good.v1')).played,first);
  click(w,'#socialRestart');assert.match(el(w,'socialBody').textContent,/Ресурсных действий: 4/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('civic material offers multiple peaceful choices with tradeoffs, no political score',()=>{
 const {w,errors}=setup();
 try{
  click(w,'[data-civic-id="metaphor"]');
  assert.equal(w.document.querySelectorAll('[data-civic-choice]').length,3);
  click(w,'[data-civic-choice="2"]');
  assert.match(el(w,'socialBody').textContent,/Ограничения:/);
  assert.match(el(w,'socialBody').textContent,/метафора/);
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.common-good.v1'),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('ages 0–2 receive physical play guidance instead of on-screen game choices',()=>{
 const {w,errors}=setup();
 try{
  age(w,1);click(w,'[data-social-scene="water"]');
  assert.match(el(w,'socialBody').textContent,/кубиков/);
  assert.equal(w.document.querySelectorAll('[data-repair-id]').length,0);
  click(w,'#socialFinish');
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.common-good.v1'),null);
  click(w,'[data-civic-id="rights"]');
  assert.equal(w.document.querySelectorAll('[data-civic-choice]').length,0);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('adult-only academy is locked below 18 and can render validated health information at 18+',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(el(w,'adultCards').hidden,true);
  assert.equal(el(w,'adultLocked').hidden,false);
  age(w,17);assert.equal(el(w,'adultCards').hidden,true);
  age(w,18);assert.equal(el(w,'adultCards').hidden,false);
  assert.equal(w.document.querySelectorAll('[data-adult-id]').length,5);
  click(w,'[data-adult-id="phone"]');
  assert.match(el(w,'socialBody').textContent,/уведомления/);
  click(w,'[data-adult-choice="1"]');
  assert.match(el(w,'socialBody').textContent,/отношения/);
  assert.deepEqual(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.adult-care.v1')).completed,{phone:true});
  age(w,12);assert.equal(el(w,'socialOverlay').hidden,true);
  assert.equal(el(w,'adultCards').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('family modules export only aggregated results; global clear wipes both',()=>{
 const {w,errors}=setup();
 try{
  age(w,35);
  click(w,'[data-adult-id="smoke"]');click(w,'[data-adult-choice="1"]');
  click(w,'#socialClose');
  click(w,'[data-social-scene="transport"]');
  click(w,'#socialFinish');
  const data={};
  w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail:data}));
  assert.deepEqual(JSON.parse(JSON.stringify(data.adultCare.completed)),['smoke']);
  assert.equal(data.commonGood.played,1);
  assert.equal('alcoholHistory' in data.adultCare,false);
  w.document.dispatchEvent(new w.Event('symbiont-city:cleared'));
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.adult-care.v1'),null);
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.common-good.v1'),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
