'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
const engine=require('../symbiont-city/engine.js');
const content=require('../symbiont-city/content.js');
function ctx(){
 return {createLinearGradient:()=>({addColorStop(){}}),setTransform(){},fillRect(){},
  strokeRect(){},fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},
  moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},
  closePath(){},save(){},restore(){},translate(){},scale(){}};
}
function setup(saved){
 const dom=new JSDOM(html,{url:'https://test.example/symbiont-city/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,frames=[],errors=[];
 w.SymbiontCityContent=content;w.SymbiontCityEngine=engine;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  width:720,height:549,left:0,top:0,right:720,bottom:549,x:0,y:0,toJSON(){}
 });
 w.matchMedia=()=>({matches:false});
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
 if(saved)w.localStorage.setItem('yugatneo.symbiont-city.progress.v1',JSON.stringify(saved));
 w.addEventListener('error',e=>errors.push(e.message));
 w.eval(controller);
 return {w,frames,errors};
}
function el(w,id){const x=w.document.getElementById(id);assert.ok(x,'id '+id);return x;}
function tap(w,selector){
 const x=w.document.querySelector(selector);assert.ok(x,selector);x.click();return x;
}
test('game boots, draws city, seven districts, score and exact age selector',()=>{
 const {w,frames,errors}=setup();
 try{
  assert.equal(el(w,'districtList').querySelectorAll('[data-district]').length,7);
  assert.equal(el(w,'age').getAttribute('max'),'110');
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.doesNotThrow(()=>frames.shift()(1000));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('age 2 uses only adult-guided off-screen activities with no scored challenges',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='2';el(w,'age').dispatchEvent(new w.Event('change'));
  tap(w,'[data-district="garden"]');
  assert.equal(el(w,'missionOverlay').hidden,false);
  assert.match(el(w,'missionBody').textContent,/экранная игра не предназначена/);
  assert.equal(el(w,'missionBody').querySelectorAll('[data-choice]').length,0);
  tap(w,'#missionNext');
  assert.equal(el(w,'missionOverlay').hidden,true);
  assert.equal(el(w,'points').textContent,'0');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('every exact age 6–11 can be selected independently without resetting progress',()=>{
 const {w,errors}=setup();
 try{
  for(let age=6;age<=11;age++){
   el(w,'age').value=String(age);el(w,'age').dispatchEvent(new w.Event('change'));
   assert.equal(el(w,'age').value,String(age));
   assert.ok(el(w,'ageDescription').textContent.length>25);
  }
  assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.progress.v1')).age,11);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('one actual dialogue mission progresses from story to action, reflection and city improvement',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='10';el(w,'age').dispatchEvent(new w.Event('change'));
  tap(w,'[data-district="garden"]');
  assert.match(el(w,'missionTitle').textContent,/Тревога/);
  tap(w,'#missionNext');
  assert.ok(el(w,'missionBody').querySelectorAll('[data-choice]').length>=3);
  tap(w,'[data-choice="0"]');
  assert.match(el(w,'missionBody').textContent,/Можно попробовать другой ответ/);
  assert.equal(el(w,'missionNext').disabled,true);
  tap(w,'[data-choice="1"]');
  assert.equal(el(w,'missionNext').disabled,false);
  tap(w,'#missionNext');
  assert.match(el(w,'missionBody').textContent,/Вопрос для размышления/);
  tap(w,'#missionNext');
  assert.match(el(w,'missionBody').textContent,/миссия завершена/i);
  assert.ok(Number(el(w,'points').textContent.replace(/\s/g,''))>0);
  tap(w,'#missionNext');
  assert.equal(el(w,'missionOverlay').hidden,true);
  assert.ok(el(w,'districtList').querySelector('[data-district="garden"]').textContent.includes('1/2'));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('teen and adult profile shows relevant text rather than a six-year-old scenario',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='30';el(w,'age').dispatchEvent(new w.Event('change'));
  tap(w,'[data-district="dialogue"]');
  assert.match(el(w,'missionBody').textContent,/отдел|переговорн|помещени/i);
  el(w,'missionClose').click();
  el(w,'age').value='15';el(w,'age').dispatchEvent(new w.Event('change'));
  tap(w,'[data-district="dialogue"]');
  assert.match(el(w,'missionBody').textContent,/команды|спортивн/i);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('mission completion remains saved across reload; no score farming from old missions',()=>{
 const state=engine.initial(35);
 const v=engine.missionView(state,content.missions[0]),c=engine.newChallenge(v);
 engine.answerChoice(c,v,1);
 const award=engine.complete(state,v,c);
 assert.ok(award);
 const {w,errors}=setup(state);
 try{
  assert.ok(Number(el(w,'points').textContent.replace(/\s/g,''))>=award.points);
  tap(w,'[data-district="garden"]');
  assert.match(el(w,'missionTitle').textContent,/Пауза/,'second mission is next');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('browser shell does not request personal Telegram data or transmit progress',()=>{
 const src=fs.readFileSync(path.join(root,'game.js'),'utf8');
 const htmlSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(src.includes('localStorage.setItem(STORE'));
 assert.ok(!src.includes('initDataUnsafe'));
 assert.ok(!src.includes('fetch('));
 assert.ok(htmlSource.includes('src="./content.js"'));
 assert.ok(htmlSource.includes('src="./engine.js"'));
 assert.ok(htmlSource.includes('src="./game.js"'));
 for(const filename of ['index.html','content.js','engine.js','style.css','game.js','icon.svg','manifest.webmanifest','sw.js']){
  assert.ok(fs.existsSync(path.join(root,filename)),filename);
 }
});
