'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const base=fs.readFileSync(path.join(root,'game.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
const workshops=fs.readFileSync(path.join(root,'workshops-ui.js'),'utf8');
const route=fs.readFileSync(path.join(root,'help-route-ui.js'),'utf8');
const C=require('../symbiont-city/content.js');
const E=require('../symbiont-city/engine.js');
const L=require('../symbiont-city/decisions.js');
const W=require('../symbiont-city/workshops.js');
const G=require('../symbiont-city/help-route.js');
const STORE='yugatneo.symbiont-city.help-route.v1';
function ctx(){return {createLinearGradient:()=>({addColorStop(){}}),setTransform(){},fillRect(){},
 strokeRect(){},fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},moveTo(){},lineTo(){},
 bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},closePath(){},save(){},restore(){},
 translate(){},scale(){}};}
function setup(saved){
 const d=new JSDOM(html,{pretendToBeVisual:true,runScripts:'outside-only',url:'https://example.test/symbiont-city/'});
 const w=d.window,errors=[];
 w.SymbiontCityContent=C;w.SymbiontCityEngine=E;w.SymbiontCityLab=L;
 w.SymbiontWorkshops=W;w.SymbiontHelpRoute=G;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:720,height:549,left:0,top:0,right:720,bottom:549});
 w.requestAnimationFrame=()=>1;w.matchMedia=()=>({matches:false});
 w.addEventListener('error',e=>errors.push(e.message));
 if(saved)w.localStorage.setItem(STORE,JSON.stringify(saved));
 w.eval(base);w.eval(lab);w.eval(workshops);w.eval(route);
 return {w,errors};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,id);return x;}
function tap(w,selector){const node=w.document.querySelector(selector);assert.ok(node,'Missing '+selector);node.click();}
function changeAge(w,n){el(w,'age').value=String(n);el(w,'age').dispatchEvent(new w.Event('change'));}
test('new independent help-route opens and renders touch controls without altering 14 original missions',()=>{
 const {w,errors}=setup();
 try{
  assert.equal(el(w,'routeOverlay').hidden,true);
  tap(w,'#routeStart');
  assert.equal(el(w,'routeOverlay').hidden,false);
  assert.ok(el(w,'routeBody').querySelectorAll('.route-cell').length>=25);
  assert.equal(el(w,'routeBody').querySelectorAll('[data-route-dir]').length,4);
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  tap(w,'#routeClose');
  assert.equal(el(w,'routeOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('hint, restart and disabled timer retain state without personal information',()=>{
 const {w,errors}=setup();
 try{
  tap(w,'#routeStart');
  const before=el(w,'routeSupplies').textContent;
  tap(w,'#routeHint');
  assert.match(el(w,'routeBody').textContent,/Совет:/);
  assert.equal(el(w,'routeSupplies').textContent,before);
  tap(w,'#routeAgain');
  assert.match(el(w,'routeSteps').textContent,/Шаги: 0/);
  assert.equal(w.localStorage.getItem(STORE),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('0–2 remains exclusively caregiver offline guidance without scoring',()=>{
 const {w,errors}=setup();
 try{
  changeAge(w,1);tap(w,'#routeStart');
  assert.match(el(w,'routeBody').textContent,/Маршрут помощи без экрана/);
  assert.equal(el(w,'routeBody').querySelectorAll('[data-route-dir]').length,0);
  assert.equal(el(w,'routeAgain').hidden,true);
  tap(w,'#routeDone');
  assert.equal(w.localStorage.getItem(STORE),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('keyboard arrows move, and pressing escape closes the overlay cleanly',()=>{
 const {w,errors}=setup();
 try{
  tap(w,'#routeStart');
  const start=el(w,'routeSteps').textContent;
  for(const dir of ['ArrowRight','ArrowDown','ArrowUp','ArrowLeft']){
   w.document.dispatchEvent(new w.KeyboardEvent('keydown',{code:dir,key:dir,bubbles:true,cancelable:true}));
  }
  const moved=el(w,'routeSteps').textContent;
  assert.ok(moved!==start,'at least one open direction from the start');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
  assert.equal(el(w,'routeOverlay').hidden,true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('previous completion remains visible; export and confirmed clear work across all modules',()=>{
 const saved={version:1,best:3,completed:6};
 const {w,errors}=setup(saved);
 try{
  assert.match(el(w,'routeProgress').textContent,/6 раз/);
  const data={};w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail:data}));
  assert.equal(data.helpRoute.best,3);
  assert.equal(data.helpRoute.completed,6);
  w.confirm=()=>false;tap(w,'#clear');
  assert.equal(JSON.parse(w.localStorage.getItem(STORE)).completed,6);
  w.confirm=()=>true;tap(w,'#clear');
  assert.equal(w.localStorage.getItem(STORE),null);
  assert.match(el(w,'routeProgress').textContent,/Ещё не проходили/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
