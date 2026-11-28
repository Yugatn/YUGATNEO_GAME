'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const Core=require('../evolution-x/engine.js');
const root=path.resolve(__dirname,'../evolution-x');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'game.js'),'utf8');
function fakeContext(labels=[]){
 const gradient=()=>({addColorStop(){}});
 const ctx={
  fillRect(){},strokeRect(){},fillText(text){labels.push(text);},beginPath(){},ellipse(){},arc(){},
  fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},rect(){},clip(){},save(){},restore(){},
  translate(){},rotate(){},setTransform(){},
  createLinearGradient:gradient,createRadialGradient:gradient
 };
 return ctx;
}
function setup(saved,reduce=false){
 const dom=new JSDOM(html,{url:'https://game.example.test/evolution-x/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.devicePixelRatio=1;
 const labels=[];
 w.matchMedia=()=>({matches:reduce});
 w.HTMLCanvasElement.prototype.getContext=()=>fakeContext(labels);
 w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({
  left:0,top:0,width:390,height:780,right:390,bottom:780,x:0,y:0,toJSON(){}
 });
 const callbacks=[];
 w.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};
 w.StoryXEvolution=Core;
 w.confirm=()=>true;
 if(saved)w.localStorage.setItem('yugatneo.evolution-x.state.v1',JSON.stringify(saved));
 w.eval(script);
 return {w,callbacks,labels};
}
function element(w,id){return w.document.getElementById(id);}
function touch(w,x,y){
 const e=new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true,clientX:x,clientY:y});
 element(w,'canvas').dispatchEvent(e);
}
function cycleTick(callbacks,timestamp){
 const next=callbacks.shift();
 assert.ok(next,'next animation frame should be scheduled');
 next(timestamp);
}
test('intro with original title starts and draws the first cell',()=>{
 const {w,callbacks}=setup();
 assert.equal(element(w,'intro').hidden,false);
 assert.match(w.document.title,/EVOLUTION X/);
 element(w,'start').click();
 assert.equal(element(w,'intro').hidden,true);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 1\/256/);
 assert.equal(element(w,'controls').style.display,'none');
 assert.doesNotThrow(()=>cycleTick(callbacks,1000),'cell canvas should render safely');
 w.close();
});
test('touch on the cell splits it; inactive daughter does not split before the next wave',()=>{
 const {w,callbacks}=setup();
 element(w,'start').click();
 touch(w,195,400);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 assert.match(element(w,'mission').textContent,/ПОКОЛЕНИЕ 2/);
 touch(w,105,400);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 3\/256/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1020));
 w.close();
});
test('stored campaign restores at the running stage and touch changes steering lane',()=>{
 const saved=Core.create(13);Core.start(saved);
 while(saved.phase==='cells'){
  const pos=Core.cellPositions(saved).find(x=>x.active);
  Core.divide(saved,pos.x,pos.y);
 }
 for(let i=0;i<150;i++)Core.step(saved,1/60);
 assert.equal(saved.phase,'runner');
 const {w,callbacks}=setup(saved);
 assert.match(element(w,'start').textContent,/ПРОДОЛЖИТЬ/);
 element(w,'start').click();
 assert.match(element(w,'mission').textContent,/БЕГ/);
 element(w,'left').click();
 w.dispatchEvent(new w.Event('pagehide'));
 const stored=JSON.parse(w.localStorage.getItem('yugatneo.evolution-x.state.v1'));
 assert.equal(stored.runner.lane,-1);
 assert.doesNotThrow(()=>cycleTick(callbacks,1200),'runner Canvas scene should draw');
 w.close();
});
test('space scene HUD changes to flight controls and survives a render',()=>{
 const saved=Core.create(3);Core.start(saved);
 saved.phase='launch';saved.runner={distance:Core.RUN_GOAL,entities:[],matrix:true,portals:2,shield:1,pulse:2};
 saved.transition=.01;Core.step(saved,1/30);
 assert.equal(saved.phase,'space');
 const {w,callbacks}=setup(saved);
 element(w,'start').click();
 assert.match(element(w,'mission').textContent,/КОСМОС/);
 assert.match(element(w,'center').textContent,/УСКОРЕНИЕ/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1000));
 element(w,'center').click();
 w.dispatchEvent(new w.Event('pagehide'));
 const stored=JSON.parse(w.localStorage.getItem('yugatneo.evolution-x.state.v1'));
 assert.equal(stored.space.boostCharges,2);
 w.close();
});

test('restored running game is frozen until player explicitly continues',()=>{
 const saved=Core.create(13);Core.start(saved);
 while(Core.divideNext(saved)){}
 for(let i=0;i<150;i++)Core.step(saved,1/60);
 const {w,callbacks}=setup(saved);
 cycleTick(callbacks,1000);cycleTick(callbacks,1030);
 w.dispatchEvent(new w.Event('pagehide'));
 const stored=JSON.parse(w.localStorage.getItem('yugatneo.evolution-x.state.v1'));
 assert.equal(stored.runner.distance,saved.runner.distance);
 element(w,'start').click();cycleTick(callbacks,1060);
 w.dispatchEvent(new w.Event('pagehide'));
 assert.ok(JSON.parse(w.localStorage.getItem('yugatneo.evolution-x.state.v1')).runner.distance>saved.runner.distance);
 w.close();
});
test('cell alternative control, generation notification and sound preference',()=>{
 const {w}=setup();
 element(w,'soundIntro').click();
 assert.equal(element(w,'soundIntro').getAttribute('aria-pressed'),'true');
 assert.equal(w.localStorage.getItem('yugatneo.evolution-x.sound.v1'),'1');
 element(w,'start').click();
 element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 assert.match(element(w,'message').textContent,/НОВОЕ ДЕЛЕНИЕ/);
 w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 3\/256/);
 element(w,'pause').click();
 assert.equal(element(w,'soundPause').getAttribute('aria-pressed'),'true');
 w.close();
});

test('world brief and chronicle render on pause, old state remains readable',()=>{
 const saved=Core.create(3);Core.start(saved);saved.planet=2;
 saved.chronicle=[{planet:1,name:'Криос',portals:3,runHits:0,spaceHits:0,medals:['Звёздный пилот'],bonus:150}];
 const {w}=setup(saved);element(w,'start').click();
 assert.match(element(w,'worldTrait').textContent,/четыре ускорения/);
 element(w,'pause').click();
 assert.match(element(w,'pauseWorld').textContent,/Аврора/);
 assert.match(element(w,'journal').textContent,/Криос/);
 assert.match(element(w,'journal').textContent,/Звёздный пилот/);
 w.close();
});

test('specialization selection on pause persists and is locked for the current world',()=>{
 const saved=Core.create(3);Core.start(saved);while(saved.cells.length<32)Core.divideNext(saved);
 const {w}=setup(saved);element(w,'start').click();element(w,'pause').click();
 assert.equal(element(w,'spec-motor').disabled,false);
 element(w,'spec-motor').click();
 assert.equal(element(w,'spec-motor').getAttribute('aria-pressed'),'true');
 assert.equal(element(w,'spec-navigation').disabled,true);
 assert.equal(JSON.parse(w.localStorage.getItem('yugatneo.evolution-x.state.v1')).specialization,'motor');
 w.close();
});

test('cell division has staged visual feedback and immediate logical progress',()=>{
 const {w,callbacks,labels}=setup();element(w,'start').click();touch(w,195,400);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 cycleTick(callbacks,1000);
 assert.ok(labels.includes('Интерфаза · рост'));
 for(let i=1;i<=8;i++)cycleTick(callbacks,1000+i*30);
 assert.ok(labels.includes('Интерфаза · удвоение ДНК'));
 assert.ok(labels.includes('Профаза и прометафаза'));
 for(let i=9;i<=19;i++)cycleTick(callbacks,1000+i*30);
 assert.ok(labels.includes('Метафаза'));
 assert.ok(labels.includes('Анафаза'));
 for(let i=20;i<=30;i++)cycleTick(callbacks,1000+i*30);
 assert.ok(labels.includes('Две дочерние клетки'));
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 w.close();
});
test('rapid successive division, dense field and reduced motion remain playable',()=>{
 const {w,callbacks}=setup();element(w,'start').click();
 for(let i=0;i<254;i++)element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 255\/256/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1000));
 element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 256\/256/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1030));
 w.close();
 const reduced=setup(undefined,true);element(reduced.w,'start').click();touch(reduced.w,195,400);
 cycleTick(reduced.callbacks,1000);
 assert.ok(!reduced.labels.includes('Интерфаза · рост'));
 assert.match(element(reduced.w,'mission').textContent,/КЛЕТКИ 2\/256/);
 reduced.w.close();
});

test('empty microscope field cannot divide a cell; visible daughter targets remain clickable',()=>{
 const {w,callbacks}=setup();element(w,'start').click();
 touch(w,22,227);assert.match(element(w,'mission').textContent,/КЛЕТКИ 1\/256/);
 touch(w,195,400);cycleTick(callbacks,1000);
 touch(w,105,400);assert.match(element(w,'mission').textContent,/КЛЕТКИ 3\/256/);
 touch(w,105,310);assert.match(element(w,'mission').textContent,/КЛЕТКИ 3\/256/);
 touch(w,285,400);assert.match(element(w,'mission').textContent,/КЛЕТКИ 4\/256/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1030));w.close();
});

test('microscope zoom, focus and pan mode do not change cell count; mapped touch divides',()=>{
 const {w,callbacks}=setup();element(w,'start').click();
 element(w,'zoomIn').click();assert.equal(element(w,'zoomLabel').textContent,'×2');
 element(w,'zoomIn').click();assert.equal(element(w,'zoomLabel').textContent,'×3');
 assert.equal(element(w,'zoomIn').disabled,true);
 element(w,'panMode').click();touch(w,195,400);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 1\/256/);
 element(w,'panMode').click();touch(w,195,400);
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 element(w,'zoomFocus').click();cycleTick(callbacks,1000);
 // First daughter x=.25, zoom=3, focus exactly .25 => center of viewport.
 touch(w,195,400);assert.match(element(w,'mission').textContent,/КЛЕТКИ 3\/256/);
 element(w,'zoomOut').click();element(w,'zoomOut').click();
 assert.equal(element(w,'zoomLabel').textContent,'×1');
 assert.equal(element(w,'panMode').disabled,true);
 w.close();
});
test('dense colony microscope renders during rapid division and reset',()=>{
 const saved=Core.create(5);Core.start(saved);while(saved.cells.length<180)Core.divideNext(saved);
 const {w,callbacks}=setup(saved);element(w,'start').click();
 element(w,'zoomIn').click();element(w,'zoomIn').click();
 for(let i=0;i<12;i++)element(w,'divideNext').click();
 for(let i=0;i<20;i++)assert.doesNotThrow(()=>cycleTick(callbacks,1000+30*i));
 element(w,'pause').click();element(w,'restart').click();
 assert.equal(element(w,'zoomLabel').textContent,'×1');
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 1\/256/);w.close();
});

test('dense tissue contours draw at microscope scale without moving cell targets',()=>{
 const saved=Core.create(8);Core.start(saved);while(saved.cells.length<128)Core.divideNext(saved);
 const {w,callbacks}=setup(saved);element(w,'start').click();
 cycleTick(callbacks,1000);element(w,'zoomIn').click();element(w,'zoomFocus').click();
 assert.doesNotThrow(()=>cycleTick(callbacks,1030));
 element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 129\/256/);
 assert.doesNotThrow(()=>cycleTick(callbacks,1060));
 w.close();
});

test('optional detailed cell cycle persists and shows all stages without delaying logical progress',()=>{
 const {w,callbacks,labels}=setup();element(w,'start').click();element(w,'pause').click();
 element(w,'cycleMode').click();assert.equal(element(w,'cycleMode').getAttribute('aria-pressed'),'true');
 assert.equal(w.localStorage.getItem('yugatneo.evolution-x.cycle-guide.v1'),'1');
 element(w,'resume').click();element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 2\/256/);
 for(let i=0;i<70;i++)cycleTick(callbacks,1000+i*30);
 for(const name of ['Интерфаза · рост','Интерфаза · удвоение ДНК','Профаза и прометафаза','Метафаза','Анафаза','Телофаза и цитокинез','Две дочерние клетки'])assert.ok(labels.includes(name),name);
 element(w,'divideNext').click();element(w,'divideNext').click();
 assert.match(element(w,'mission').textContent,/КЛЕТКИ 4\/256/);
 w.close();
});
