'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const E=require('../maze-x/engine.js');
const root=path.resolve(__dirname,'../maze-x');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
function context(){
 const gradient=()=>({addColorStop(){}});
 return {setTransform(){},fillRect(){},strokeRect(){},beginPath(){},arc(){},
  ellipse(){},fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},fillText(){},
  save(){},restore(){},translate(){},scale(){},createLinearGradient:gradient,createRadialGradient:gradient};
}
function prepare(saved,width=390,height=844){
 const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,
  url:'https://example.test/maze-x/'});
 const w=dom.window,frames=[],errors=[];
 w.LabyrinthX=E;
 w.HTMLCanvasElement.prototype.getContext=()=>context();
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  left:0,top:0,width,height,right:width,bottom:height,x:0,y:0,toJSON(){}
 });
 w.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
 if(saved)w.localStorage.setItem('yugatneo.maze-x.campaign.v1',JSON.stringify(saved));
 w.addEventListener('error',e=>errors.push(e.message));
 w.eval(controller);
 return {w,frames,errors};
}
function el(w,id){const n=w.document.getElementById(id);assert.ok(n,id);return n;}
function stepFrame(frames,time){
 const fn=frames.shift();assert.ok(fn,'animation callback exists');fn(time);
}
test('mobile intro offers four difficulty modes and starts the complete maze scene',()=>{
 const {w,frames,errors}=prepare(null,320,640);
 try{
  assert.equal(el(w,'intro').hidden,false);
  assert.equal(el(w,'mode').options.length,4);
  el(w,'mode').value='explorer';
  el(w,'start').click();
  assert.equal(el(w,'intro').hidden,true);
  assert.match(el(w,'floor').textContent,/1\/2/);
  assert.doesNotThrow(()=>stepFrame(frames,1100));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('touch directions, pause/resume and browser pagehide preserve offline campaign',()=>{
 const {w,frames,errors}=prepare();
 try{
  el(w,'mode').value='navigator';el(w,'start').click();
  el(w,'right').dispatchEvent(new w.MouseEvent('pointerdown',
   {bubbles:true,cancelable:true}));
  assert.doesNotThrow(()=>stepFrame(frames,1100));
  el(w,'pause').click();assert.equal(el(w,'paused').hidden,false);
  el(w,'resume').click();assert.equal(el(w,'paused').hidden,true);
  w.dispatchEvent(new w.Event('pagehide'));
  const saved=JSON.parse(w.localStorage.getItem('yugatneo.maze-x.campaign.v1'));
  assert.equal(saved.mode,'navigator');assert.equal(saved.floors.length,3);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('valid saved game allows Continue and displays the same floor and score',()=>{
 const saved=E.create('architect',888);E.start(saved);saved.floor=2;
 saved.player={x:1,y:1,facing:'right'};saved.score=460;
 const {w,frames,errors}=prepare(saved,390,844);
 try{
  assert.equal(el(w,'continue').hidden,false);
  el(w,'continue').click();
  assert.equal(el(w,'intro').hidden,true);
  assert.match(el(w,'floor').textContent,/3\/4/);
  assert.equal(el(w,'score').textContent,'460');
  assert.doesNotThrow(()=>stepFrame(frames,1200));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('fork riddle UI opens three answers; correct solve returns safely to maze',()=>{
 const saved=E.create('explorer',402);E.start(saved);
 const f=saved.floors[0];let fork=null;
 for(let y=1;y<f.size&&!fork;y++)for(let x=1;x<f.size;x++){
  if(E.openDirs(f,x,y).length>=3){fork={x,y,facing:'right'};break;}
 }
 assert.ok(fork);
 saved.player=fork;
 const offered=E.riddleOffer(saved);
 assert.ok(offered);
 const right=E.RIDDLES[offered.index].correct;
 const {w,frames,errors}=prepare(saved,390,844);
 try{
  el(w,'continue').click();
  assert.equal(el(w,'junction').classList.contains('visible'),true);
  el(w,'junction').click();
  assert.equal(el(w,'riddle').hidden,false);
  assert.equal(el(w,'answers').children.length,3);
  el(w,'answers').children[right].click();
  assert.equal(el(w,'riddle').hidden,true);
  assert.ok(Number(el(w,'score').textContent.replace(/\s/g,''))>=140);
  assert.doesNotThrow(()=>stepFrame(frames,1300));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('saved Matrix state allows arming a phase wall jump without a server',()=>{
 const saved=E.create('explorer',61);E.start(saved);
 saved.matrix=true;saved.charges=3;saved.score=100;
 const {w,frames,errors}=prepare(saved);
 try{
  el(w,'continue').click();
  assert.equal(el(w,'phase').disabled,false);
  el(w,'phase').click();
  assert.match(el(w,'charges').textContent,/НАПРАВЛЕНИЕ/);
  assert.doesNotThrow(()=>stepFrame(frames,1350));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});

test('memory-map overlay only shows explored corridors and freezes the timer',()=>{
 const {w,frames,errors}=prepare();
 try{
  el(w,'mode').value='explorer';el(w,'start').click();
  el(w,'mapButton').click();
  assert.equal(el(w,'mapOverlay').hidden,false);
  assert.match(el(w,'mapStats').textContent,/Открыто/);
  assert.match(el(w,'mapStats').textContent,/Пройдено новых клеток/);
  w.dispatchEvent(new w.Event('pagehide'));
  const save=JSON.parse(w.localStorage.getItem('yugatneo.maze-x.campaign.v1'));
  assert.equal(save.phase,'map','open map saves state safely');
  const previous=save.elapsed;
  stepFrame(frames,1400);stepFrame(frames,1450);
  assert.equal(el(w,'timer').textContent,'0:00','time frozen while reading map');
  el(w,'closeMap').click();
  assert.equal(el(w,'mapOverlay').hidden,true);
  w.dispatchEvent(new w.Event('pagehide'));
  const after=JSON.parse(w.localStorage.getItem('yugatneo.maze-x.campaign.v1'));
  assert.equal(after.phase,'playing');
  assert.equal(after.elapsed,previous);
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('legacy v1 saved game restores earlier points and gains the map feature',()=>{
 const old=E.create('explorer',245);
 E.start(old);old.score=438;old.steps=50;old.bonus=38;
 delete old.uniqueSteps;delete old.legacyPoints;
 for(const f of old.floors)delete f.walked;
 const {w,frames,errors}=prepare(old);
 try{
  assert.equal(el(w,'continue').hidden,false);
  el(w,'continue').click();
  assert.equal(el(w,'score').textContent,'438');
  el(w,'mapButton').click();
  assert.equal(el(w,'mapOverlay').hidden,false);
  assert.doesNotThrow(()=>stepFrame(frames,1800));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
test('the map never renders unknown walls, explored-only visual rule is explicit',()=>{
 const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
 assert.ok(source.includes('if(!f.seen[k])continue'),'unknown cells must not appear on map');
 assert.ok(source.includes('E.openMap(s)'));
 assert.ok(source.includes('E.closeMap(s)'));
 assert.ok(source.includes('E.upgradeSave(raw)'));
});

test('corrupted legacy save is ignored without breaking a new game',()=>{
 const broken=E.create('explorer',700);E.start(broken);
 delete broken.floors[0].start;
 const {w,frames,errors}=prepare(broken);
 try{
  assert.equal(el(w,'continue').hidden,true,'no Resume for an invalid save');
  el(w,'start').click();
  assert.equal(el(w,'intro').hidden,true);
  assert.doesNotThrow(()=>stepFrame(frames,1300));
  assert.deepEqual(errors,[]);
 }finally{w.close();}
});
