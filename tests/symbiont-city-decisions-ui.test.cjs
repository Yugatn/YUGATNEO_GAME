'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../symbiont-city');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const labUI=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
const C=require('../symbiont-city/content.js'),E=require('../symbiont-city/engine.js');
const L=require('../symbiont-city/decisions.js');
function ctx(){
 return {createLinearGradient:()=>({addColorStop(){}}),setTransform(){},fillRect(){},
 strokeRect(){},fillText(){},strokeText(){},beginPath(){},ellipse(){},arc(){},
 moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},fill(){},stroke(){},
 closePath(){},save(){},restore(){},translate(){},scale(){}};
}
function setup(saved,lab){
 const dom=new JSDOM(html,{url:'https://test.example/symbiont-city/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,frames=[],errors=[];
 w.SymbiontCityContent=C;w.SymbiontCityEngine=E;w.SymbiontCityLab=L;
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:720,height:549,left:0,top:0,right:720,bottom:549,x:0,y:0,toJSON(){}});
 w.matchMedia=()=>({matches:false});
 w.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
 w.confirm=()=>true;
 if(saved)w.localStorage.setItem('yugatneo.symbiont-city.progress.v1',JSON.stringify(saved));
 if(lab)w.localStorage.setItem('yugatneo.symbiont-city.lab.v1',JSON.stringify(lab));
 w.addEventListener('error',e=>errors.push(e.message));
 w.eval(game);w.eval(labUI);
 return {w,frames,errors};
}
const el=(w,id)=>{const x=w.document.getElementById(id);assert.ok(x,id);return x;};
const press=(w,s)=>{const x=w.document.querySelector(s);assert.ok(x,'missing '+s);x.click();};
const chooseAge=(w,age)=>{el(w,'age').value=String(age);el(w,'age').dispatchEvent(new w.Event('change'));};
const open=(w,id)=>press(w,'[data-lab-id="'+id+'"]');
const save=(w)=>JSON.parse(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'));
function choices(w){return w.document.querySelectorAll('[data-lab-option]');}
test('one integrated laboratory: five missions, existing 14 and seven regions',()=>{
 const {w,frames,errors}=setup();
 try{
  assert.equal(el(w,'labCards').querySelectorAll('[data-lab-id]').length,5);
  assert.equal(el(w,'districtList').querySelectorAll('[data-district]').length,7);
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.equal(el(w,'labCount').textContent,'0 / 5 историй');
  assert.equal(el(w,'labMeters').querySelectorAll('.lab-meter').length,4);
  assert.doesNotThrow(()=>frames.shift()(1000));
  const ids=[...w.document.querySelectorAll('[id]')].map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length,'HTML identifiers must be unique');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('solo: briefing, evidence, decision, consequences, reflection, persistence',()=>{
 const {w,errors}=setup();
 try{
  open(w,'generator');
  assert.equal(el(w,'labOverlay').hidden,false);
  press(w,'#labNext');
  assert.match(el(w,'labBody').textContent,/оборудован/);
  press(w,'#labNext');
  assert.equal(choices(w).length,2,'8-year-old has two options');
  press(w,'[data-lab-option="2"]');
  assert.equal(el(w,'labCount').textContent,'1 / 5 историй');
  assert.match(el(w,'labBody').textContent,/Игровые последствия/);
  assert.equal(save(w).choices.generator,2);
  press(w,'#labNext');
  assert.match(el(w,'labBody').textContent,/Рефлексия/);
  press(w,'#labNext');
  assert.equal(el(w,'labOverlay').hidden,true);
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('cooperative mode: two individual votes then collective final decision',()=>{
 const {w,errors}=setup();
 try{
  chooseAge(w,5);
  assert.equal(el(w,'labTogether').checked,true);
  assert.equal(el(w,'labTogether').disabled,true);
  open(w,'bridge');press(w,'#labNext');press(w,'#labNext');
  press(w,'[data-lab-option="0"]');
  assert.equal(save(w),null,'single vote is not yet an approved shared decision');
  assert.match(el(w,'labBody').textContent,/Второй участник/);
  press(w,'[data-lab-option="1"]');
  assert.match(el(w,'labBody').textContent,/общее решение/);
  press(w,'[data-lab-option="1"]');
  assert.equal(save(w).choices.bridge,1);
  assert.equal(el(w,'labCount').textContent,'1 / 5 историй');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('infant guidance does not offer interactive assessment or points',()=>{
 const {w,errors}=setup();
 try{
  chooseAge(w,2);
  open(w,'rumor');
  assert.match(el(w,'labBody').textContent,/Младенцу не нужна экранная игра/);
  assert.equal(choices(w).length,0);
  press(w,'#labNext');
  assert.equal(el(w,'labOverlay').hidden,true);
  assert.equal(el(w,'labCount').textContent,'0 / 5 историй');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('adult receives three alternatives; changing one replaces effects, not rewards',()=>{
 const main=E.initial(35),lab=L.initial();L.choice(lab,'rumor',2);
 const {w,errors}=setup(main,lab);
 try{
  assert.equal(el(w,'labCount').textContent,'1 / 5 историй');
  open(w,'generator');
  assert.match(el(w,'labBody').textContent,/энергосети/,'adult scenario uses adult-specific briefing');
  press(w,'#labNext');press(w,'#labNext');
  assert.equal(choices(w).length,3);
  press(w,'[data-lab-option="0"]');
  const first=save(w);assert.equal(first.choices.generator,0);
  press(w,'#labClose');
  open(w,'generator');press(w,'#labNext');press(w,'#labNext');
  press(w,'[data-lab-option="2"]');
  const second=save(w);assert.equal(second.choices.generator,2);
  assert.equal(L.progress(second).done,2);
  assert.notDeepEqual(L.metrics(first),L.metrics(second));
  assert.match(el(w,'cityLevel').textContent,/0 \/ 14/);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('confirmed clear removes both campaigns and reverts city meters',()=>{
 const lab=L.initial();L.choice(lab,'garden',1);
 const {w,errors}=setup(null,lab);
 try{
  assert.match(el(w,'labCount').textContent,/1 \/ 5/);
  press(w,'#clear');
  assert.equal(el(w,'labCount').textContent,'0 / 5 историй');
  assert.equal(w.localStorage.getItem('yugatneo.symbiont-city.lab.v1'),null);
  assert.equal(el(w,'points').textContent,'0');
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('export includes chosen strategies but never free-text reflection',()=>{
 const lab=L.initial();L.choice(lab,'dialogue',1);
 const {w,errors}=setup(null,lab);
 try{
  const detail={};w.document.dispatchEvent(new w.CustomEvent('symbiont-city:export',{detail}));
  assert.equal(detail.lab.choices.dialogue,1);
  assert.equal(detail.lab.completed,1);
  assert.ok(!Object.keys(detail.lab).includes('reflections'));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
