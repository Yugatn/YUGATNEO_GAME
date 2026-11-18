/* STORY X · EVOLUTION X / Telegram Mini App visual layer.
 * Local-only score and progress. No Telegram user identifiers or backend.
 */
(function(){
'use strict';
const Core=window.StoryXEvolution;
if(!Core)throw Error('Evolution game core failed to load');
const $=id=>document.getElementById(id);
const canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false});
let W=390,H=780,scale=1,frameLast=0,hudLast=0,lastSave=0,noticeUntil=0;
let noticeText='',pausedFrom=null;
const KEY='yugatneo.evolution-x.state.v1',BEST='yugatneo.evolution-x.best.v1';
const validPhases=new Set(['cells','emergence','runner','launch','space','landing']);
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST))||0);}catch(_){return 0;}}
let best=readBest();
function restore(){
 try{
  const item=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!item||item.version!==1||!validPhases.has(item.phase))return null;
  if(!Array.isArray(item.cells)||item.cells.length>Core.CELL_GOAL)return null;
  if((item.phase==='runner'||item.phase==='launch')&&!item.runner)return null;
  if((item.phase==='space'||item.phase==='landing')&&!item.space)return null;
  if((item.phase==='cells'||item.phase==='emergence')&&!item.cells.length)return null;
  if(!Number.isFinite(item.score)||item.score<0||!Number.isInteger(item.planet)||item.planet<0||item.planet>1000)return null;
  return item;
 }catch(_){return null;}
}
let state=restore()||Core.create();
function telegram(){
 try{
  const app=window.Telegram?.WebApp;
  if(!app)return null;
  app.ready();app.expand();
  app.setBackgroundColor?.('#060e1c');app.setHeaderColor?.('#060e1c');
  app.disableVerticalSwipes?.();
  return app;
 }catch(_){return null;}
}
const tg=telegram();
function feel(type){
 try{tg?.HapticFeedback?.impactOccurred(type||'light');}catch(_){}
}
function resize(){
 const r=canvas.getBoundingClientRect();
 W=r.width||innerWidth;H=r.height||innerHeight;
 scale=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.max(1,Math.round(W*scale));
 canvas.height=Math.max(1,Math.round(H*scale));
 ctx.setTransform(scale,0,0,scale,0,0);
}
window.addEventListener('resize',resize,{passive:true});
window.visualViewport?.addEventListener('resize',resize,{passive:true});
resize();
function message(text,ms=1300){noticeText=text;noticeUntil=performance.now()+ms;}
function save(force){
 const now=performance.now();
 if(!force&&now-lastSave<900)return;
 lastSave=now;
 if(state.phase==='intro')return;
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
 if(state.score>best){
  best=Math.round(state.score);
  try{localStorage.setItem(BEST,String(best));}catch(_){}
 }
}
function newGame(){
 state=Core.create(Date.now()>>>0);
 Core.start(state);
 $('intro').hidden=true;$('paused').hidden=true;pausedFrom=null;
 message('КОСНИСЬ ПЕРВОЙ КЛЕТКИ',1800);
 save(true);feel('light');
 updateHUD();
}
function start(){
 if(state.phase==='intro')newGame();
 else{$('intro').hidden=true;$('paused').hidden=true;pausedFrom=null;updateHUD();}
}
if(state.phase!=='intro')$('start').textContent='▶ ПРОДОЛЖИТЬ ПУТЬ';
function pause(){
 if(pausedFrom||state.phase==='intro')return;
 pausedFrom=state.phase;
 $('paused').hidden=false;
 save(true);
}
function resume(){
 if(!pausedFrom)return;
 pausedFrom=null;$('paused').hidden=true;
 frameLast=performance.now();
}
function control(command){
 if(pausedFrom||state.phase==='intro')return;
 if(command==='left'){if(Core.steer(state,-1))feel('light');}
 if(command==='right'){if(Core.steer(state,1))feel('light');}
 if(command==='center'){
  if(state.phase==='runner'&&Core.jump(state))feel('light');
  else if(state.phase==='space'&&Core.ability(state))feel('medium');
 }
 if(command==='ability'&&Core.ability(state)){feel('medium');message(state.phase==='space'?'СВЕТОВОЙ УСКОРИТЕЛЬ':'ИМПУЛЬС МАТРИЦЫ',800);}
 updateHUD();
}
$('start').addEventListener('click',start);
$('pause').addEventListener('click',()=>pausedFrom?resume():pause());
$('resume').addEventListener('click',resume);
$('restart').addEventListener('click',()=>{
 if(!confirm('Начать новый путь с первой клетки? Текущий цикл будет перезаписан.'))return;
 try{localStorage.removeItem(KEY);}catch(_){}
 newGame();
});
for(const id of ['left','right'])$(id).addEventListener('click',()=>control(id));
$('center').addEventListener('click',()=>control('center'));
$('action').addEventListener('click',()=>control('ability'));
function cellBoard(){
 const available=Math.min(W-30,H-255);
 const size=Math.max(130,available);
 return {x:(W-size)/2,y:(H-size)/2+10,w:size,h:size};
}
canvas.addEventListener('pointerdown',ev=>{
 if(pausedFrom||state.phase==='intro')return;
 ev.preventDefault();
 const r=canvas.getBoundingClientRect();
 const x=ev.clientX-r.left,y=ev.clientY-r.top;
 if(state.phase==='cells'){
  const b=cellBoard(),nx=(x-b.x)/b.w,ny=(y-b.y)/b.h;
  if(Core.divide(state,nx,ny)){
   feel('light');save();
   if(state.phase==='emergence')message('256 КЛЕТОК · РОЖДЕНИЕ НОВОГО ЭТАПА',2100);
  }
 }else if(state.phase==='runner'||state.phase==='space'){
  control(x<W*.29?'left':x>W*.71?'right':'center');
 }
 updateHUD();
});
window.addEventListener('keydown',ev=>{
 if(ev.repeat)return;
 if(['Space','ArrowUp','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyF','Escape'].includes(ev.code))ev.preventDefault();
 if(ev.code==='Escape'){pausedFrom?resume():pause();return;}
 if(['ArrowLeft','KeyA'].includes(ev.code))control('left');
 if(['ArrowRight','KeyD'].includes(ev.code))control('right');
 if(['ArrowUp','KeyW','Space'].includes(ev.code))control('center');
 if(ev.code==='KeyF')control('ability');
 if(ev.code==='Enter'&&state.phase==='intro')start();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>save(true));
function updateHUD(){
 $('score').textContent=Math.floor(state.score).toLocaleString('ru-RU');
 $('best').textContent=Math.max(best,Math.floor(state.score)).toLocaleString('ru-RU');
 $('planet').textContent='МИР · '+(state.planet+1);
 $('fill').style.width=Core.scoreProgress(state).toFixed(1)+'%';
 const cellStage=state.phase==='cells'||state.phase==='emergence';
 $('controls').style.display=cellStage?'none':'grid';
 $('pause').style.display=state.phase==='intro'?'none':'block';
 $('cellNote').style.display=state.phase==='cells'?'block':'none';
 const runner=state.runner,space=state.space;
 if(cellStage){
  $('mission').textContent='КЛЕТКИ '+state.cells.length+'/'+Core.CELL_GOAL+
   ' · ПОКОЛЕНИЕ '+(state.wave+1)+' · осталось '+state.waveRemaining;
 }else if(state.phase==='runner'||state.phase==='launch'){
  $('mission').textContent=(runner.matrix?'МАТРИЦА · ':'БЕГ · ')+
   Math.round(runner.distance)+'/'+Core.RUN_GOAL+' м · '+runner.portals+' портал(ов)'+
   (runner.matrix?' · щит '+runner.shield:'');
 }else if(state.phase==='space'||state.phase==='landing'){
  $('mission').textContent='КОСМОС '+Math.round(space.distance)+'/'+Core.SPACE_GOAL+
   ' · корпус '+space.hull+'/3';
 }
 const active=state.phase==='runner'||state.phase==='space';
 $('center').textContent='';
 $('center').append(document.createTextNode(state.phase==='space'?'↑ УСКОРЕНИЕ':'↑ ПРЫЖОК'));
 const sm=document.createElement('small');
 sm.textContent=state.phase==='space'?'ЗАЩИТА ОТ АСТЕРОИДОВ':'ЦЕНТР ЭКРАНА';
 $('center').append(sm);
 const showAction=state.phase==='runner'&&runner.matrix;
 $('action').classList.toggle('visible',!!showAction);
 $('action').disabled=!showAction||runner.pulse<1;
 $('action').textContent=showAction?'✦ ИМПУЛЬС · '+runner.pulse:'';
 $('controls').style.display=active?'grid':'none';
 const visible=performance.now()<noticeUntil&&!pausedFrom;
 $('message').textContent=visible?noticeText:'';
 $('message').classList.toggle('show',visible);
}
function gradient(top,bottom){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,top);g.addColorStop(1,bottom);
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function strokePath(points,color,width=2,close=false){
 ctx.beginPath();
 points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
 if(close)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function ellipse(x,y,rx,ry,fill,stroke){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}
}
const stars=Array.from({length:110},(_,i)=>({
 x:((i*37+19)%101)/101,y:((i*71+7)%103)/103,size:1+(i%3)*.6,
 phase:(i%11)*.34
}));
function drawStars(speed=0,color='#a8d5d8'){
 for(const star of stars){
  const x=star.x*W,y=((star.y*H+state.time*speed*(1+(star.size*.08)))%(H+4));
  ctx.fillStyle=color;ctx.globalAlpha=.3+.5*Math.abs(Math.sin(state.time*.7+star.phase));
  ctx.fillRect(x,y,star.size,star.size);
 }
 ctx.globalAlpha=1;
}
function drawCells(){
 gradient(state.planet%2?'#0b1530':'#0b2630','#04101b');
 drawStars(3);
 const b=cellBoard();
 ctx.fillStyle='#092330dd';ctx.strokeStyle='#397c76';
 ctx.lineWidth=2;ctx.fillRect(b.x-8,b.y-8,b.w+16,b.h+16);
 ctx.strokeRect(b.x-8,b.y-8,b.w+16,b.h+16);
 const positions=Core.cellPositions(state),n=positions.length;
 const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 const radius=Math.min(b.w/cols,b.h/rows)*.40;
 for(const c of positions){
  const x=b.x+c.x*b.w,y=b.y+c.y*b.h;
  const pulse=1+.065*Math.sin(state.time*4+c.id*.34);
  const r=radius*pulse;
  ctx.save();
  ctx.shadowBlur=c.active?15:4;ctx.shadowColor='#83ffb9';
  const shade=ctx.createRadialGradient(x-r*.24,y-r*.20,r*.2,x,y,r*1.1);
  shade.addColorStop(0,c.active?'#d5ffb1':'#5fa6aa');
  shade.addColorStop(.6,c.active?'#45b99c':'#235969');
  shade.addColorStop(1,c.active?'#126c65':'#173c56');
  ellipse(x,y,r,r,shade,c.active?'#a5ffb3':'#336b76');
  ctx.restore();
  if(r>5)ellipse(x-r*.14,y-r*.03,r*.28,r*.24,c.active?'#073e40':'#143f4a');
 }
 ctx.textAlign='center';ctx.fillStyle='#bcffe3';ctx.font='bold 12px system-ui';
 ctx.fillText('ДЕЛЕНИЕ · '+state.divisions+' касаний',W/2,b.y-22);
 if(n>=32){
  ctx.fillStyle='#82b7b0';ctx.font='11px system-ui';
  ctx.fillText('ЯРКИЕ КЛЕТКИ АКТИВНЫ • ТЁМНЫЕ ЖДУТ СВОЕЙ ОЧЕРЕДИ',W/2,b.y+b.h+26);
 }
}
function matrixRain(){
 ctx.save();ctx.font='13px monospace';ctx.textAlign='center';
 for(let i=0;i<37;i++){
  const x=((i*37)%101)/101*W;
  for(let j=0;j<5;j++){
   const y=((state.time*(55+i%9*8)+i*33-j*24)%(H+90))-20;
   ctx.globalAlpha=j===0?.37:.1;ctx.fillStyle='#77ff9e';
   ctx.fillText(((i+j+Math.floor(state.time*6))%3===0?'1':'0'),x,y);
  }
 }
 ctx.restore();
}
function roadGeometry(){
 const roadWidth=Math.min(W*.78,420);
 return {left:W/2-roadWidth/2,width:roadWidth,centerY:H*.72,
  pitch:Math.max(1.9,Math.min(3.6,H/230))};
}
function xForLane(l,road){return W/2+l*road.width/3;}
function drawHuman(x,y,sz,form='runner'){
 ctx.save();
 const k=Math.max(17,sz),t=state.time;
 const wobble=Math.sin(t*13)*3;
 ellipse(x,y+8,k*.38,k*.13,'#0008');
 ctx.strokeStyle='#9affe0';ctx.lineWidth=k*.13;ctx.lineCap='round';
 strokePath([[x-k*.17,y-k*.15],[x-k*.27,y+k*.37+wobble]],'#8ef4c1',k*.15);
 strokePath([[x+k*.17,y-k*.15],[x+k*.29,y+k*.37-wobble]],'#8ef4c1',k*.15);
 ellipse(x,y-k*.20,k*.32,k*.39,'#2f8b7f','#9fffd0');
 strokePath([[x-k*.29,y-k*.4],[x-k*.52,y-k*.07-wobble]],'#caffd7',k*.13);
 strokePath([[x+k*.29,y-k*.4],[x+k*.52,y-k*.07+wobble]],'#caffd7',k*.13);
 ellipse(x,y-k*.75,k*.35,k*.35,'#c7b696','#d0ffdb');
 ctx.fillStyle='#1a3033';ctx.beginPath();ctx.arc(x,y-k*.83,k*.33,Math.PI,Math.PI*2);ctx.fill();
 for(const delta of [-.15,.15]){
  ellipse(x+delta*k,y-k*.72,k*.115,k*.115,'#07141c','#f3ffe2');
 }
 ctx.restore();
}
function drawPortal(x,y,width){
 ctx.save();ctx.shadowColor='#75ffb6';ctx.shadowBlur=20;
 ctx.strokeStyle='#78ffd0';ctx.lineWidth=Math.max(3,width*.09);
 ctx.beginPath();ctx.ellipse(x,y,width*.42,width*.9,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#c1ffce';ctx.font='bold 12px monospace';ctx.textAlign='center';
 ctx.fillText('01',x,y+4);ctx.restore();
}
function drawRunner(){
 const r=state.runner;
 gradient(r.matrix?'#071d17':'#0b1731',r.matrix?'#042920':'#10273a');
 if(r.matrix)matrixRain();else drawStars(13,'#8dcce7');
 const road=roadGeometry(),left=road.left,right=left+road.width;
 ctx.fillStyle=r.matrix?'#0a352b':'#142d3f';
 ctx.fillRect(left,-30,road.width,H+60);
 for(let i=0;i<4;i++){
  const x=left+i*road.width/3;
  ctx.beginPath();ctx.moveTo(x,-40);ctx.lineTo(x,H+40);
  ctx.strokeStyle=(i===0||i===3)?(r.matrix?'#86ffaf':'#89d9e0'):'#4b8c8d';
  ctx.lineWidth=i===0||i===3?3:1;ctx.stroke();
 }
 const offset=r.distance%14*road.pitch;
 ctx.fillStyle=r.matrix?'#245d48':'#2a5774';
 for(let y=-25+offset;y<H;y+=14*road.pitch){
  for(let j=1;j<3;j++){
   const x=left+j*road.width/3;
   ctx.fillRect(x-1,y,2,Math.min(17,road.pitch*5));
  }
 }
 const visible=r.entities.filter(o=>!o.done&&o.at>=r.distance-12&&o.at<r.distance+200)
  .sort((a,b)=>b.at-a.at);
 for(const o of visible){
  const y=road.centerY-(o.at-r.distance)*road.pitch,x=xForLane(o.lane,road);
  if(y<-80||y>H+90)continue;
  if(o.type==='portal'){drawPortal(x,y-18,35);continue;}
  if(o.type==='rocket'){
   drawRocket(x,y,35);continue;
  }
  const typeColor=o.type==='agent'?'#fa82a9':o.type==='step'?'#ffd895':'#ffa38a';
  ctx.fillStyle=typeColor;ctx.strokeStyle='#eaffef';ctx.lineWidth=2;
  const bw=road.width/3*.58;
  if(o.type==='bar'){
   ctx.fillRect(x-bw/2,y-17,bw,15);ctx.strokeRect(x-bw/2,y-17,bw,15);
  }else if(o.type==='agent'){
   ellipse(x,y-14,15,15,'#3c233f','#ff86b0');
   ellipse(x-5,y-17,3,3,'#ff6d97');ellipse(x+5,y-17,3,3,'#ff6d97');
  }else{
   ctx.fillRect(x-bw/2,y-24,bw,o.type==='step'?18:27);
   ctx.strokeRect(x-bw/2,y-24,bw,o.type==='step'?18:27);
  }
 }
 const px=xForLane(r.lane,road),py=road.centerY-r.jump*24;
 drawHuman(px,py,43);
 if(r.matrix){
  ctx.fillStyle='#b6ffbc';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText('ПОРТАЛЫ '+r.portals+'  •  ЩИТ '+r.shield+'  •  ИМПУЛЬС '+r.pulse,W/2,H*.18);
 }
}
function drawRocket(x,y,sz){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#e5f4ef';ctx.strokeStyle='#afffcf';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(0,-sz*1.7);ctx.lineTo(sz*.4,-sz*.15);
 ctx.lineTo(sz*.36,sz*.9);ctx.lineTo(-sz*.36,sz*.9);
 ctx.lineTo(-sz*.4,-sz*.15);ctx.closePath();ctx.fill();ctx.stroke();
 ellipse(0,-sz*.4,sz*.14,sz*.16,'#265973');
 ctx.fillStyle='#ffbf71';ctx.beginPath();ctx.moveTo(-sz*.18,sz*.9);
 ctx.lineTo(0,sz*1.7);ctx.lineTo(sz*.18,sz*.9);ctx.fill();
 ctx.restore();
}
function drawSpace(){
 const p=state.space;
 gradient('#020817','#081829');drawStars(72,'#fff');
 if(p.distance>SPACE_GOAL-250){
  const size=Math.max(20,Math.min(100,(p.distance-(SPACE_GOAL-250))*.37));
  const pg=ctx.createRadialGradient(W*.54,H*.17,8,W*.54,H*.17,size);
  pg.addColorStop(0,'#6ef2a1');pg.addColorStop(.7,'#1d7b8d');pg.addColorStop(1,'#174452');
  ellipse(W*.54,H*.17,size,size,pg,'#94ffcb');
 }
 const road=roadGeometry(),pitch=road.pitch;
 for(const a of p.asteroids.filter(x=>!x.done&&x.at>p.distance-18&&x.at<p.distance+190).sort((a,b)=>b.at-a.at)){
  const x=xForLane(a.lane,road),y=H*.73-(a.at-p.distance)*pitch;
  const r=Math.max(12,17*a.size);
  ctx.save();ctx.translate(x,y);ctx.rotate(a.at*.017+state.time*.6);
  ctx.fillStyle='#836f77';ctx.strokeStyle='#c4b1a3';ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<9;i++){const t=i/9*Math.PI*2,rr=r*(.76+.16*Math.cos(i*19));
   if(i===0)ctx.moveTo(Math.cos(t)*rr,Math.sin(t)*rr);
   else ctx.lineTo(Math.cos(t)*rr,Math.sin(t)*rr);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  ellipse(-r*.25,-r*.12,r*.23,r*.19,'#4b4553');
  ellipse(r*.22,r*.27,r*.14,r*.10,'#4b4553');ctx.restore();
 }
 const sx=xForLane(p.lane,road),sy=H*.73;
 drawRocket(sx,sy,36);
 if(p.boostTime>0){
  ctx.save();ctx.shadowColor='#9affa7';ctx.shadowBlur=26;
  ellipse(sx,sy+60,8,28,'#b9ff92');ctx.restore();
 }
 ctx.fillStyle='#c1ffda';ctx.textAlign='center';ctx.font='bold 12px monospace';
 ctx.fillText('КОРАБЛЬ · КОРПУС '+p.hull+'/3  · УСКОРЕНИЯ '+p.boostCharges,W/2,H*.19);
}
function transitionScreen(phase){
 const emerging=phase==='emergence',launch=phase==='launch';
 gradient(emerging?'#123d44':launch?'#08172b':'#072b34','#02101d');
 drawStars(launch?50:12);
 const cx=W/2,cy=H*.45;
 if(emerging){
  for(let i=0;i<Math.min(64,state.cells.length);i++){
   const a=i*Math.PI*2/64,t=1+Math.sin(state.time*3+i)*.08;
   ellipse(cx+Math.cos(a)*W*.27*t,cy+Math.sin(a)*W*.27*t,5,5,'#61e4b9');
  }
  drawHuman(cx,cy+65,72);
 }else if(launch){drawRocket(cx,cy+60,80);}
 else{
  ellipse(cx,cy,96,96,'#257c92','#9cffe2');
  ellipse(cx+20,cy-10,51,37,'#4fd5a1');
 }
 ctx.fillStyle='#dcffee';ctx.textAlign='center';ctx.font='bold 20px system-ui';
 ctx.fillText(emerging?'ЧЕЛОВЕК · НОВЫЙ УРОВЕНЬ':launch?'ПОЛЁТ К НОВОЙ ПЛАНЕТЕ':'НОВЫЙ МИР · НОВЫЙ ЦИКЛ',cx,H*.78);
}
function render(){
 if(state.phase==='intro'){gradient('#061629','#020713');drawStars(14);return;}
 if(state.phase==='cells')drawCells();
 else if(['emergence','launch','landing'].includes(state.phase))transitionScreen(state.phase);
 else if(state.phase==='runner')drawRunner();
 else if(state.phase==='space')drawSpace();
}
function reactions(events){
 for(const e of events){
  if(e==='newwave'){message('ПОКОЛЕНИЕ '+(state.wave+1)+' · НОВОЕ ДЕЛЕНИЕ',1050);feel('medium');}
  if(e==='emergence'){feel('heavy');}
  if(e==='human'){message('ЧЕЛОВЕК · БЕГИ К ПОРТАЛУ',2300);feel('heavy');}
  if(e==='portal'){message('КОД МАТРИЦЫ · ЩИТ И ИМПУЛЬС АКТИВИРОВАНЫ',2200);feel('heavy');}
  if(e==='shield'){message('ЩИТ ПОГЛОТИЛ УДАР',900);feel('medium');}
  if(e==='collision'){message('ПРЕПЯТСТВИЕ! ПРОБУЙ ДРУГУЮ ПОЛОСУ',850);feel('medium');}
  if(e==='rocket'){message('РАКЕТА · ВЗЛЁТ!',2500);feel('heavy');save(true);}
  if(e==='space'){message('ОБЛЕТАЙ АСТЕРОИДЫ · ЦЕНТР ДАЁТ УСКОРЕНИЕ',2400);feel('heavy');}
  if(e==='asteroidHit'){message('УДАР АСТЕРОИДА · МАНЕВРИРУЙ',1000);feel('medium');}
  if(e==='checkpoint'){message('ВОССТАНОВЛЕН КОРАБЛЬ · ПРОДОЛЖАЙ',1250);}
  if(e==='planetReached'){message('ДОСТИГНУТА НОВАЯ ПЛАНЕТА!',2600);feel('heavy');save(true);}
  if(e==='newPlanet'){message('НОВАЯ ПЛАНЕТА · СНОВА ОДНА КЛЕТКА',2600);feel('heavy');save(true);}
 }
}
function frame(now){
 const dt=frameLast?Math.min(.045,(now-frameLast)/1000):0;
 frameLast=now;
 if(!pausedFrom&&state.phase!=='intro'){
  // Accumulate substeps: no skipped hazards during low frame rate.
  const steps=Math.ceil(dt/(1/60))||1;
  for(let i=0;i<steps;i++){
   const events=Core.step(state,dt/steps);
   if(events.length)reactions(events);
  }
 }
 render();
 if(now-hudLast>115){updateHUD();hudLast=now;save(false);}
 requestAnimationFrame(frame);
}
updateHUD();
requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();