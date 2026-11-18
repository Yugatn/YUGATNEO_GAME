'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const Engine=require('../matrix-jet/engine.js');
const root=path.resolve(__dirname,'../matrix-jet');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
function context(){
 const gradient=()=>({addColorStop(){}});
 return {
  createLinearGradient:gradient,createRadialGradient:gradient,
  setTransform(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},
  lineTo(){},closePath(){},fill(){},stroke(){},ellipse(){},fillText(){},
  save(){},restore(){},translate(){},scale(){},arc(){},rotate(){}
 };
}
function setup(width=390,height=844){
 const d=new JSDOM(html,{url:'https://example.invalid/matrix-jet/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=d.window,frames=[],errors=[];
 w.HTMLCanvasElement.prototype.getContext=()=>context();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  width,height,left:0,top:0,right:width,bottom:height,x:0,y:0,toJSON(){}
 });
 w.requestAnimationFrame=(fn)=>{frames.push(fn);return frames.length;};
 w.MatrixJetEngine=Engine;
 w.addEventListener('error',e=>errors.push(e.message));
 w.eval(controller);
 return {w,frames,errors};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,id);return x;}
function press(w,id){
 el(w,id).dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));
}
test('intro, start, altitude changing and pause/resume work in simulated Telegram WebView',()=>{
 const {w,frames,errors}=setup();
 assert.equal(el(w,'intro').hidden,false);
 assert.match(w.document.title,/MATRIX JET/);
 el(w,'start').click();
 assert.equal(el(w,'intro').hidden,true);
 assert.match(el(w,'altitude').textContent,/СРЕДНЕ/);
 press(w,'up');
 assert.match(el(w,'altitude').textContent,/ВЫСОКО/);
 assert.doesNotThrow(()=>{
  const one=frames.shift();one(w.performance.now()+20);
  const two=frames.shift();two(w.performance.now()+35);
 },'top-down sky and original jet should draw');
 el(w,'pause').click();
 assert.equal(el(w,'paused').hidden,false);
 el(w,'resume').click();
 assert.equal(el(w,'paused').hidden,true);
 assert.deepEqual(errors,[]);
 w.close();
});
test('touch dragging and keyboard inputs do not crash at narrow phone width',()=>{
 const {w,frames,errors}=setup(320,640);
 el(w,'start').click();
 const c=el(w,'sky');
 function pointer(kind,x,y){
  const e=new w.MouseEvent(kind,{bubbles:true,cancelable:true,clientX:x,clientY:y});
  Object.defineProperty(e,'pointerId',{value:1});
  c.dispatchEvent(e);
 }
 pointer('pointerdown',150,370);
 pointer('pointermove',250,370);
 pointer('pointerup',250,370);
 w.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,code:'ArrowUp'}));
 w.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,code:'ArrowLeft'}));
 assert.doesNotThrow(()=>frames.shift()(w.performance.now()+60));
 assert.deepEqual(errors,[]);
 w.close();
});
test('background tab pauses a running flight without hiding controls',()=>{
 const {w}=setup();
 el(w,'start').click();
 w.dispatchEvent(new w.Event('blur'));
 assert.equal(el(w,'paused').hidden,false);
 el(w,'resume').click();
 assert.equal(el(w,'paused').hidden,true);
 w.close();
});
test('Mini App stores only a numerical local record without a Telegram identity',()=>{
 const content=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(content.includes('localStorage.setItem(BEST_KEY'));
 assert.ok(!content.includes('initDataUnsafe'));
 assert.ok(!content.includes('fetch('));
 assert.ok(content.includes('s.smoothAltitude*.22'));
 assert.ok(content.includes('Engine.aim'));
 assert.ok(content.includes('Engine.changeAltitude'));
 assert.ok(content.includes('Engine.special'));
});
