'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const dir=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const ui=fs.readFileSync(path.join(dir,'decisions-ui.js'),'utf8');
const C=require('../symbiont-city/content.js'),E=require('../symbiont-city/engine.js');
const Lab=require('../symbiont-city/decisions.js');
function ctx(){return {createLinearGradient:()=>({addColorStop(){}}),setTransform(){},fillRect(){},
 strokeRect(){},fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},
 moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},
 closePath(){},save(){},restore(){},translate(){},scale(){}};}
function setup(saved,labSaved){
 const dom=new JSDOM(html,{url:'https://test.example/symbiont-city/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,frames=[],errors=[];
 w.SymbiontCityContent=C;w.SymbiontCityEngine=E;w.SymbiontCityLab=Lab;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:720,height:549,left:0,top:0,right:720,bottom:549,x:0,y:0,toJSON(){}});
 w.matchMedia=()=>({matches:false});
 w.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
 w.confirm=()=>true;
 if(saved)w.localStorage.setItem('yugatneo.symbiont-city.progress.v1',JSON.stringify(saved));
 if(labSaved)w.localStorage.setItem('yugatneo.symbiont-city.lab.v1',JSON.stringify(labSaved));
 w.addEventListener('error',ev=>errors.push(ev.message));
 w.eval(game);w.eval(ui);
 return {w,frames,errors};
}
const el=(w,id)=>{const n=w.document.getElementById(id);assert.ok(n,id);return n;};
function open(w,id){const card=w.document.querySelector('[data-lab="'+id+'"]');assert.ok(card);card.click();}
test('city and laboratory coexist without changing the original 14 missions',()=>{
 const {w,frames,errors}=setup();
 try{
  assert.equal(el(w,'labCards').children.length,5);
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.match(el(w,'labDone').textContent,/0 \/ 5/);
  assert.match(el(w,'labStats').textContent,/60\/100/);
  assert.doesNotThrow(()=>frames.shift()(1000));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('research clue, choose trade-off, view consequence and persist a single decision',()=>{
 const {w,errors}=setup();
 try{
  open(w,'generator');
  assert.equal(el(w,'labOverlay').hidden,false);
  el(w,'labAction').click();
  assert.match(el(w,'labStep').textContent,/ШАГ 2/);
  el(w,'labInspect').click();
  assert.match(el(w,'labBody').textContent,/оборудование/);
  el(w,'labAction').click();
  assert.match(el(w,'labStep').textContent,/ШАГ 3/);
  assert.equal(el(w,'labBody').querySelectorAll('[data-lab-choice]').length,2,'age 8 is simplified');
  el(w,'labBody').querySelector('[data-lab-choice="2"]').click();
  assert.match(el(w,'labStep').textContent,/ШАГ 4/);
  assert.match(el(w,'labBody').textContent,/Вопрос для размышления/);
  assert.match(el(w,'labDone').textContent,/1 \/ 5/);
  const saved=JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'));
  assert.equal(saved.choices.generator,2);
  assert.equal(el(w,'cityLevel').textContent.includes('14'),true);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('revising a completed event replaces old city indicators, without increasing completion',()=>{
 const {w,errors}=setup();
 try{
  open(w,'bridge');el(w,'labAction').click();el(w,'labAction').click();
  el(w,'labBody').querySelector('[data-lab-choice="0"]').click();
  const first=JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'));
  el(w,'labClose').click();
  open(w,'bridge');el(w,'labAction').click();el(w,'labAction').click();
  el(w,'labBody').querySelector('[data-lab-choice="1"]').click();
  const revised=JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'));
  assert.equal(revised.choices.bridge,1);
  assert.equal(Lab.progress(revised).done,1);
  assert.notDeepEqual(Lab.metrics(revised),Lab.metrics(first));
  assert.match(el(w,'labDone').textContent,/1 \/ 5/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('very young profiles display only caregiver guidance, not a scored challenge',()=>{
 const {w,errors}=setup();
 try{
  el(w,'age').value='1';
  el(w,'age').dispatchEvent(new w.Event('change'));
  open(w,'rumor');
  assert.match(el(w,'labBody').textContent,/взрослого/);
  assert.equal(el(w,'labAction').hidden,true);
  assert.equal(el(w,'labBody').querySelectorAll('[data-lab-choice]').length,0);
  assert.equal(el(w,'labDone').textContent,'0 / 5 ситуаций');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('adult receives three nuanced choices and original campaign points remain untouched',()=>{
 const main=E.initial(35),lab=Lab.initial();Lab.choice(lab,'rumor',2);
 const {w,errors}=setup(main,lab);
 try{
  assert.match(el(w,'labDone').textContent,/1 \/ 5/);
  assert.equal(el(w,'points').textContent,'0');
  open(w,'generator');el(w,'labAction').click();el(w,'labAction').click();
  assert.match(el(w,'labBody').textContent,/энергосети/);
  assert.equal(el(w,'labBody').querySelectorAll('[data-lab-choice]').length,3);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('confirming clear resets original city and lab progress together',()=>{
 const lab=Lab.initial();Lab.choice(lab,'rumor',2);
 const {w,errors}=setup(null,lab);
 try{
  assert.match(el(w,'labDone').textContent,/1 \/ 5/);
  el(w,'clear').click();
  assert.match(el(w,'labDone').textContent,/0 \/ 5/);
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'),null);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('export event adds only decisions and indicators, without private reflection text',()=>{
 const lab=Lab.initial();Lab.choice(lab,'dialogue',1);
 const {w,errors}=setup(null,lab);
 try{
  const detail={};w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail}));
  assert.equal(detail.decisionLab.choices.dialogue,1);
  assert.equal(detail.decisionLab.progress.done,1);
  assert.ok(!Object.keys(detail.decisionLab).includes('reflections'));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
