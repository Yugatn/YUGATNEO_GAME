'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const base=fs.readFileSync(path.join(root,'game.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
const workshop=fs.readFileSync(path.join(root,'workshops-ui.js'),'utf8');
const C=require('../symbiont-city/content.js'),E=require('../symbiont-city/engine.js');
const L=require('../symbiont-city/decisions.js'),G=require('../symbiont-city/workshops.js');
const STORE='yugatneo.symbiont-city.workshops.v1';
function ctx(){return {createLinearGradient:()=>({addColorStop(){}}),setTransform(){},fillRect(){},
 strokeRect(){},fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},moveTo(){},lineTo(){},
 bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},closePath(){},save(){},restore(){},translate(){},scale(){}};}
function setup(saved){
 const d=new JSDOM(html,{pretendToBeVisual:true,runScripts:'outside-only',url:'https://test.example/symbiont-city/'});
 const w=d.window,errors=[],frames=[];
 w.SymbiontCityEngine=E;w.SymbiontCityContent=C;w.SymbiontCityLab=L;w.SymbiontWorkshops=G;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:720,height:549,left:0,top:0,right:720,bottom:549});
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 w.matchMedia=()=>({matches:false});
 w.addEventListener('error',e=>errors.push(e.message));
 if(saved)w.localStorage.setItem(STORE,JSON.stringify(saved));
 w.eval(base);w.eval(lab);w.eval(workshop);
 return {w,errors,frames};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,id);return x;}
function tap(w,selector){const x=w.document.querySelector(selector);assert.ok(x,selector);x.click();return x;}
function age(w,n){el(w,'age').value=String(n);el(w,'age').dispatchEvent(new w.Event('change'));}
test('three new playable workshops coexist with seven districts and original fourteen missions',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(w.document.querySelectorAll('[data-workshop]').length,3);
  assert.equal(w.document.querySelectorAll('[data-district]').length,7);
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.match(el(w,'workshopsProgress').textContent,/0 \/ 3/);
  tap(w,'[data-workshop="memory"]');
  assert.equal(el(w,'workshopOverlay').hidden,false);
  assert.ok(el(w,'workshopBody').querySelectorAll('[data-memory]').length>=6);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('attention target can be found across all rounds, then village restoration persists',()=>{
 const {w,errors}=setup();
 try{
  tap(w,'[data-workshop="attention"]');
  for(let round=0;round<3;round++){
   const target=w.document.querySelector('.workshop-target strong').textContent;
   const tiles=[...el(w,'workshopBody').querySelectorAll('[data-attention]')];
   assert.ok(tiles.length>=4);
   const matching=tiles.find(x=>x.textContent===target);
   assert.ok(matching);
   matching.click();
  }
  assert.match(el(w,'workshopBody').textContent,/Мастерская восстановлена/);
  assert.match(el(w,'workshopsProgress').textContent,/1 \/ 3/);
  assert.equal(JSON.parse(w.localStorage.getItem(STORE)).completed[0],'attention');
  tap(w,'#workshopDone');
  assert.equal(el(w,'workshopOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('bridge construction shows order dependencies and creates a building only when finished',()=>{
 const {w,errors}=setup();
 try{
  tap(w,'[data-workshop="bridge"]');
  tap(w,'[data-build="test"]');
  assert.match(el(w,'workshopBody').textContent,/Сейчас нужен другой этап/);
  assert.match(el(w,'workshopsProgress').textContent,/0 \/ 3/);
  for(const id of ['survey','supports','deck','test'])tap(w,'[data-build="'+id+'"]');
  assert.match(el(w,'workshopBody').textContent,/Мастерская восстановлена/);
  assert.match(el(w,'workshopsProgress').textContent,/1 \/ 3/);
  assert.equal(JSON.parse(w.localStorage.getItem(STORE)).best.bridge,2);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('memory mismatch stays visible until a deliberate close with no time pressure',()=>{
 const {w,errors}=setup();
 try{
  tap(w,'[data-workshop="memory"]');
  tap(w,'[data-memory="0"]');
  assert.equal(el(w,'workshopBody').querySelectorAll('.is-hidden').length,
   el(w,'workshopBody').querySelectorAll('[data-memory]').length-1);
  tap(w,'[data-memory="1"]');
  if(el(w,'workshopHide').isConnected){
   const faces=[...el(w,'workshopBody').querySelectorAll('.workshop-tile')]
    .filter(x=>!x.classList.contains('is-hidden'));
   assert.equal(faces.length,2);
   tap(w,'#workshopHide');
   assert.equal(el(w,'workshopBody').querySelectorAll('.is-hidden').length,
    el(w,'workshopBody').querySelectorAll('[data-memory]').length);
  }
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('0–2 is offline only; ages 3–5 show adult-assisted framing and age 70 may choose complexity',()=>{
 const {w,errors}=setup();
 try{
  age(w,1);tap(w,'[data-workshop="memory"]');
  assert.match(el(w,'workshopBody').textContent,/Игра с взрослым, а не с экраном/);
  assert.equal(el(w,'workshopBody').querySelectorAll('[data-memory]').length,0);
  tap(w,'#workshopDone');
  assert.equal(w.localStorage.getItem(STORE),null);
  age(w,4);tap(w,'[data-workshop="memory"]');
  assert.match(el(w,'workshopEyebrow').textContent,/ВЗРОСЛЫМ/);
  tap(w,'#workshopDone');
  age(w,70);el(w,'challenge').value='stretch';
  el(w,'challenge').dispatchEvent(new w.Event('change'));
  tap(w,'[data-workshop="memory"]');
  assert.equal(el(w,'workshopBody').querySelectorAll('[data-memory]').length,12);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('saved village can be reloaded; confirmed clear deletes only local game progress',()=>{
 const p=G.initial();p.best.memory=3;p.completed=['memory'];
 const {w,errors}=setup(p);
 try{
  assert.match(el(w,'workshopsProgress').textContent,/1 \/ 3/);
  let payload={};
  w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail:payload}));
  assert.deepEqual(payload.workshops.completed,['memory']);
  w.confirm=()=>false;tap(w,'#clear');
  assert.ok(w.localStorage.getItem(STORE));
  w.confirm=()=>true;tap(w,'#clear');
  assert.equal(w.localStorage.getItem(STORE),null);
  assert.match(el(w,'workshopsProgress').textContent,/0 \/ 3/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
