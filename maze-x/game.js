/* YUGATNEO · LABYRINTH X — Telegram Mini App Canvas renderer.
 * Viewport follows the runner; no full map is shown and no account data is read.
 */
(function(){
'use strict';
const E=window.LabyrinthX;
if(!E)throw Error('LabyrinthX game engine not loaded');
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){$('intro').querySelector('p').textContent='Этот браузер не поддерживает Canvas.';return;}
const SAVE='yugatneo.maze-x.campaign.v1',RECORDS='yugatneo.maze-x.records.v1';
let W=390,H=844,dpr=1,saved=null,records={},s,camX=1.5,camY=1.5,camFloor=0;
let prev=0,lastHUD=0,lastSave=0,hold=null,holdAt=0,pointerStart=null;
let noteEnd=0,noteText='',swirlUntil=0,finishShown=false;
function loadJSON(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
function validate(raw){
 if(!raw||raw.version!==1||!E.MODES[raw.mode]||!Array.isArray(raw.floors))return null;
 const cfg=E.MODES[raw.mode],n=cfg.size;
 if(raw.floors.length!==cfg.levels||!Number.isFinite(raw.elapsed)||raw.elapsed<0)return null;
 if(!raw.player||!E.within(raw.player.x,raw.player.y,n)||!Number.isInteger(raw.floor)||raw.floor<0||raw.floor>=cfg.levels)return null;
 for(const f of raw.floors){
  if(!f||f.size!==n||!Array.isArray(f.walls)||f.walls.length!==n*n||
   !Array.isArray(f.seen)||f.seen.length!==n*n||!Array.isArray(f.agents)||!Array.isArray(f.portals))return null;
 }
 if(!['playing','paused','riddle','map'].includes(raw.phase))return null;
 raw=E.upgradeSave(raw);
 raw.phase='paused';raw.riddle=null;raw.events=[];raw.hintPath=[];
 return raw;
}
saved=validate(loadJSON(SAVE));
records=loadJSON(RECORDS)||{};
s=E.create('navigator',2026);
try{
 const tg=window.Telegram?.WebApp;
 if(tg){tg.ready();tg.expand();tg.setHeaderColor?.('#020a0b');tg.setBackgroundColor?.('#020a0b');
 tg.disableVerticalSwipes?.();}
}catch(_){}
const tg=window.Telegram?.WebApp;
function feel(kind='light'){try{tg?.HapticFeedback?.impactOccurred(kind);}catch(_){}}
function save(force=false){
 if(!['playing','paused','riddle','map'].includes(s.phase))return;
 const now=performance.now();if(!force&&now-lastSave<6000)return;
 lastSave=now;
 try{localStorage.setItem(SAVE,JSON.stringify(s));}catch(_){}
}
function clearSave(){try{localStorage.removeItem(SAVE);}catch(_){}}
function storeRecord(){
 const entry=records[s.mode]||{best:0,bestTime:null,completed:0};
 entry.best=Math.max(entry.best,s.score);
 if(s.phase==='completed'){
  entry.completed++;
  entry.bestTime=entry.bestTime===null?s.elapsed:Math.min(entry.bestTime,s.elapsed);
 }
 records[s.mode]=entry;
 try{localStorage.setItem(RECORDS,JSON.stringify(records));}catch(_){}
}
function resize(){
 const r=canvas.getBoundingClientRect();
 W=Math.max(280,r.width||innerWidth);H=Math.max(400,r.height||innerHeight);
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();window.addEventListener('resize',resize,{passive:true});
window.visualViewport?.addEventListener('resize',resize,{passive:true});
function overlays(name){
 for(const id of ['intro','paused','riddle','end','mapOverlay'])$(id).hidden=(id!==name);
}
function announce(text,ms=1450){noteText=text;noteEnd=performance.now()+ms;}
function mtime(sec){return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');}
function startGame(mode){
 s=E.create(mode,(Date.now()^Math.floor(Math.random()*1e8))>>>0);
 E.start(s);camX=s.player.x+.5;camY=s.player.y+.5;camFloor=0;
 finishShown=false;lastSave=0;prev=performance.now();hold=null;clearSave();
 overlays(null);announce('ИЩИ ПОРТАЛ И ВИНТОВУЮ БАШНЮ',2100);
 feel('medium');updateHUD();save(true);
 try{canvas.focus({preventScroll:true});}catch(_){}
}
function resumeSaved(){
 if(!saved)return;
 s=saved;saved=null;finishShown=false;
 E.start(s);camX=s.player.x+.5;camY=s.player.y+.5;camFloor=s.floor;
 overlays(null);hold=null;prev=performance.now();
 announce('ПУТЬ ВОССТАНОВЛЕН',1300);updateHUD();
}
function menu(){
 if(s.phase==='playing')E.pause(s);
 save(true);saved=validate(loadJSON(SAVE));
 overlays('intro');hold=null;
 $('continue').hidden=!saved;
 $('mode').value=saved?.mode||s.mode;
}
function pause(){
 if(E.pause(s)){hold=null;overlays('paused');save(true);updateHUD();}
}
function openMemoryMap(){
 if(!E.openMap(s))return false;
 hold=null;pointerStart=null;
 overlays('mapOverlay');renderMemoryMap();save(true);updateHUD();
 feel('light');return true;
}
function closeMemoryMap(){
 if(!E.closeMap(s))return false;
 overlays(null);prev=performance.now();save(true);updateHUD();
 return true;
}
function resume(){
 if(E.start(s)){overlays(null);prev=performance.now();updateHUD();}
}
function finish(){
 if(finishShown)return;
 finishShown=true;hold=null;storeRecord();clearSave();
 $('endKicker').textContent=s.phase==='completed'?'МАРШРУТ НАЙДЕН':'ЗАДАНИЕ НЕ ЗАВЕРШЕНО';
 $('endTitle').textContent=s.phase==='completed'?'ЛАБИРИНТ ПРОЙДЕН':'НОВЫЙ ВИТОК';
 $('reason').textContent=s.phase==='completed'?
  'Ты прошёл все спиральные этажи и достиг выхода. Верная логика и внимание ведут дальше.':s.reason;
 $('timeResult').textContent=s.score.toLocaleString('ru-RU')+' очков · '+mtime(s.elapsed)+
  ' · '+s.steps+' шагов · '+s.uniqueSteps+' новых клеток · '+s.riddlesSolved+' загадок · '+s.portals+' порталов'+
  (s.phase==='completed'?' · БОНУС ЗА СКОРОСТЬ +'+s.timeBonus:'');
 overlays('end');feel('heavy');updateHUD();
}
function handleEvents(events){
 for(const ev of events){
  if(ev==='portal'){announce('МАТРИЦА · +2 ФАЗОВЫХ ПРЫЖКА',1800);feel('heavy');save(true);}
  if(ev==='phaseWall'){announce('СТЕНА ПРЕОДОЛЕНА · +55',950);feel('medium');}
  if(ev==='stair'){camFloor=s.floor;camX=s.player.x+.5;camY=s.player.y+.5;
   swirlUntil=performance.now()+1800;announce('НОВЫЙ СПИРАЛЬНЫЙ ВИТОК · '+(s.floor+1),2200);feel('heavy');save(true);}
  if(ev==='hit'){announce('АГЕНТ! ОСТАЛОСЬ ЖИЗНЕЙ: '+s.lives,1400);feel('medium');save(true);}
  if(ev==='escape')announce('УШЁЛ ОТ АГЕНТА · БОНУС',800);
  if(ev==='correct')announce('ВЕРНО! ЗЕЛЁНЫЙ МАРШРУТ +140',1600);
  if(ev==='wrong')announce('ОТВЕТ НЕВЕРЕН · ИССЛЕДУЙ САМОСТОЯТЕЛЬНО',1700);
  if(ev==='complete'||ev==='failed')finish();
 }
}
function inputMove(direction){
 if(s.phase!=='playing')return;
 const success=E.move(s,direction),events=s.events.slice();
 if(events.includes('wall')&&s.phaseArmed)announce('ФАЗА ГОТОВА: НАЖМИ НА СТЕНУ',500);
 if(success)feel(events.includes('phaseWall')?'medium':'light');
 if(events.length)handleEvents(events);
 updateHUD();
}
function touchAction(id){
 if(id==='phase'){
  if(E.armPhase(s)){feel('medium');announce(s.phaseArmed?'ВЫБЕРИ НАПРАВЛЕНИЕ СКВОЗЬ СТЕНУ':'ФАЗА ОТМЕНЕНА',900);updateHUD();}
 }else inputMove(id);
}
for(const id of ['up','down','left','right']){
 const btn=$(id);
 btn.addEventListener('pointerdown',e=>{
  if(s.phase!=='playing')return;
  e.preventDefault();hold=id;holdAt=performance.now()+175;
  touchAction(id);
  try{btn.setPointerCapture(e.pointerId);}catch(_){}
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])
  btn.addEventListener(type,()=>{if(hold===id)hold=null;});
 btn.addEventListener('click',e=>{if(e.detail===0)touchAction(id);});
}
$('phase').addEventListener('click',()=>touchAction('phase'));
$('mapButton').addEventListener('click',openMemoryMap);
$('closeMap').addEventListener('click',closeMemoryMap);
$('start').addEventListener('click',()=>startGame($('mode').value));
$('continue').addEventListener('click',resumeSaved);
$('pause').addEventListener('click',()=>s.phase==='paused'?resume():pause());
$('resume').addEventListener('click',resume);
$('menu').addEventListener('click',menu);
$('again').addEventListener('click',()=>startGame(s.mode));
$('endMenu').addEventListener('click',menu);
$('junction').addEventListener('click',()=>{
 if(s.phase!=='playing')return;
 const item=E.askRiddle(s);if(!item)return;
 hold=null;overlays('riddle');save(true);
 $('question').textContent=item.question;
 $('explanation').textContent='';
 const list=$('answers');list.textContent='';
 item.answers.forEach((choice,index)=>{
  const button=document.createElement('button');button.type='button';
  button.textContent=String.fromCharCode(65+index)+'. '+choice;
  button.addEventListener('click',()=>{
   const result=E.answerRiddle(s,index);
   if(!result)return;
   $('explanation').textContent=result.explanation;
   overlays(null);
   handleEvents(s.events.slice());
   announce((result.correct?'ВЕРНО! ':'ПОЧЕМУ НЕВЕРНО: ')+result.explanation,3400);
   updateHUD();save(true);
  });
  list.appendChild(button);
 });
});
$('skip').addEventListener('click',()=>{if(E.skipRiddle(s)){overlays(null);updateHUD();save(true);}});
const keyDirs={ArrowUp:'up',KeyW:'up',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left'};
window.addEventListener('keydown',e=>{
 if(keyDirs[e.code]||['Space','KeyF','Escape','KeyP','Enter','KeyM'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(keyDirs[e.code]&&s.phase==='playing'){
  hold=keyDirs[e.code];holdAt=performance.now()+160;inputMove(hold);
 }else if(e.code==='Space'||e.code==='KeyF'){touchAction('phase');}
 else if(e.code==='KeyM'){s.phase==='map'?closeMemoryMap():openMemoryMap();}
 else if(e.code==='Escape'||e.code==='KeyP'){
  if(s.phase==='map')closeMemoryMap();
  else s.phase==='paused'?resume():pause();
 }
 else if(e.code==='Enter'&&s.phase==='ready')startGame($('mode').value);
});
window.addEventListener('keyup',e=>{if(hold===keyDirs[e.code])hold=null;});
canvas.addEventListener('pointerdown',e=>{
 if(s.phase!=='playing')return;
 e.preventDefault();pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointerup',e=>{
 if(!pointerStart||pointerStart.id!==e.pointerId||s.phase!=='playing')return;
 const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;pointerStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<19)return;
 inputMove(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>save(true));
function updateHUD(){
 $('score').textContent=s.score.toLocaleString('ru-RU');
 $('timer').textContent=mtime(s.elapsed);
 $('floor').textContent='ВИТОК '+(s.floor+1)+'/'+E.MODES[s.mode].levels;
 $('lives').textContent='♥ '.repeat(s.lives).trim()||'—';
 const f=s.floors[s.floor];$('progress').textContent='ИЗУЧЕНО '+Math.floor(f.visited/(f.size*f.size)*100)+'%';
 $('mapButton').disabled=s.phase!=='playing';
 $('matrix').classList.toggle('on',s.matrix);
 $('phase').disabled=!s.matrix||s.charges<=0||s.phase!=='playing';
 $('phase').style.borderColor=s.phaseArmed?'#ffe9a0':'';
 $('charges').textContent=s.matrix?(s.phaseArmed?'НАПРАВЛЕНИЕ?':'ЗАРЯДОВ '+s.charges):'ПОСЛЕ ПОРТАЛА';
 $('junction').classList.toggle('visible',!!E.riddleOffer(s));
 const visible=performance.now()<noteEnd&&s.phase==='playing';
 $('hint').textContent=visible?noteText:'';
 $('hint').classList.toggle('visible',visible);
}
function renderMemoryMap(){
 const mcanvas=$('mapCanvas'),mc=mcanvas.getContext('2d');
 if(!mc)return;
 const rect=mcanvas.getBoundingClientRect();
 const side=Math.max(180,Math.min(430,rect.width||Math.min(W-42,430)));
 const pixelRatio=Math.min(2,window.devicePixelRatio||1);
 mcanvas.width=Math.round(side*pixelRatio);
 mcanvas.height=Math.round(side*pixelRatio);
 mc.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 mc.fillStyle='#020e14';mc.fillRect(0,0,side,side);
 const f=s.floors[s.floor],n=f.size,margin=11,cell=(side-margin*2)/n;
 const pad=(x,y)=>({x:margin+x*cell,y:margin+y*cell});
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const k=E.ix(x,y,n);
  if(!f.seen[k])continue; // No spoilers: undiscovered tiles and walls remain unknown.
  const p=pad(x,y);
  mc.fillStyle=f.walked?.[k]?'#1f8a6c':'#24545e';
  mc.fillRect(p.x,p.y,Math.max(1,cell),Math.max(1,cell));
  const mask=f.walls[k],edge='#a1d7c1';
  mc.strokeStyle=edge;mc.lineWidth=Math.max(.65,cell*.14);
  mc.beginPath();
  if(mask&1){mc.moveTo(p.x,p.y);mc.lineTo(p.x+cell,p.y);}
  if(mask&2){mc.moveTo(p.x+cell,p.y);mc.lineTo(p.x+cell,p.y+cell);}
  if(mask&4){mc.moveTo(p.x,p.y+cell);mc.lineTo(p.x+cell,p.y+cell);}
  if(mask&8){mc.moveTo(p.x,p.y);mc.lineTo(p.x,p.y+cell);}
  mc.stroke();
 }
 for(const p of f.portals){
  if(p.taken||!f.seen[E.ix(p.x,p.y,n)])continue;
  const c=pad(p.x+.5,p.y+.5);
  mc.fillStyle='#8df7c0';mc.beginPath();mc.arc(c.x,c.y,Math.max(2,cell*.4),0,Math.PI*2);mc.fill();
 }
 const dest=f.stair||f.exit;
 if(dest&&f.seen[E.ix(dest.x,dest.y,n)]){
  const c=pad(dest.x+.5,dest.y+.5);
  mc.fillStyle='#ffdb8b';mc.beginPath();
  mc.arc(c.x,c.y,Math.max(2.5,cell*.52),0,Math.PI*2);mc.fill();
 }
 // Agent positions become visible on the memory map only when already close.
 for(const a of f.agents){
  if(Math.abs(a.x-s.player.x)+Math.abs(a.y-s.player.y)>3)continue;
  if(!f.seen[E.ix(a.x,a.y,n)])continue;
  const c=pad(a.x+.5,a.y+.5);
  mc.fillStyle='#ff839c';mc.beginPath();mc.arc(c.x,c.y,Math.max(2.2,cell*.48),0,Math.PI*2);mc.fill();
 }
 const player=pad(s.player.x+.5,s.player.y+.5);
 mc.fillStyle='#ffe29f';mc.beginPath();mc.arc(player.x,player.y,Math.max(3,cell*.65),0,Math.PI*2);mc.fill();
 mc.strokeStyle='#fff9d6';mc.lineWidth=1.5;mc.stroke();
 const percent=Math.floor(f.visited/(n*n)*100);
 $('mapStats').textContent='ВИТОК '+(s.floor+1)+'/'+E.MODES[s.mode].levels+
  ' · Открыто '+f.visited+' из '+(n*n)+' клеток ('+percent+'%)'+
  ' · Пройдено новых клеток: '+s.uniqueSteps;
}
function fill(top,bottom){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function tileSize(){return Math.max(25,Math.min(48,W/11.3,H/17.7));}
function pixel(x,y,t){return {x:W*.5+(x+.5-camX)*t,y:H*.52+(y+.5-camY)*t};}
function tileColor(level,near,seen){
 if(!seen&&near>6.0)return '#01070b';
 if(!seen)return s.matrix?'#06150e':'#06121b';
 return s.matrix?(level%2?'#0b291c':'#082117'):(level%2?'#11232d':'#122a33');
}
function drawStair(x,y,t,isExit){
 ctx.save();ctx.translate(x,y);
 const r=t*.34;
 ctx.shadowBlur=16;ctx.shadowColor=isExit?'#ffdb92':'#89ffba';
 for(let i=0;i<3;i++){
  ctx.strokeStyle=isExit?'#fce4a8':'#7cffc6';
  ctx.lineWidth=Math.max(1,3-i);
  ctx.beginPath();ctx.arc(0,0,r*(1-i*.22),s.elapsed*1.7+i*1.9,s.elapsed*1.7+i*1.9+Math.PI*1.55);ctx.stroke();
 }
 ctx.shadowBlur=0;ctx.fillStyle='#fff4c1';ctx.font='bold '+Math.max(10,t*.27)+'px monospace';
 ctx.textAlign='center';ctx.fillText(isExit?'★':'↟',0,5);ctx.restore();
}
function drawPortal(x,y,t){
 ctx.save();ctx.translate(x,y);ctx.shadowBlur=19;ctx.shadowColor='#91ffb1';
 ctx.strokeStyle='#8effd1';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,t*.33,t*.43,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#c1ffdd';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,t*.19,t*.27,0,0,Math.PI*2);ctx.stroke();
 ctx.font='bold '+(t*.22)+'px monospace';ctx.fillStyle='#deffe0';
 ctx.textAlign='center';ctx.fillText('01',0,t*.07);ctx.restore();
}
function runner(x,y,t){
 const k=t*.52,wiggle=Math.sin(s.elapsed*18)*k*.13;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(2,k*.30,k*.33,k*.13,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#76edc1';ctx.lineWidth=k*.23;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-k*.20,k*.05);ctx.lineTo(-k*.30,k*.46+wiggle);
 ctx.moveTo(k*.2,k*.05);ctx.lineTo(k*.3,k*.46-wiggle);ctx.stroke();
 ctx.fillStyle='#319e86';ctx.beginPath();ctx.ellipse(0,-k*.15,k*.39,k*.49,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d7c09a';ctx.beginPath();ctx.arc(0,-k*.65,k*.38,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#11262b';ctx.beginPath();ctx.arc(0,-k*.81,k*.33,Math.PI,2*Math.PI);ctx.fill();
 ctx.fillStyle='#071921';ctx.strokeStyle='#eaffee';ctx.lineWidth=1.4;
 for(const v of [-.19,.19]){
  ctx.beginPath();ctx.arc(k*v,-k*.61,k*.15,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 if(s.safeTimer>0){ctx.strokeStyle='#a3ffbba9';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,-k*.06,k*.86,0,Math.PI*2);ctx.stroke();}
 if(s.phaseArmed){ctx.shadowColor='#f9e782';ctx.shadowBlur=15;ctx.strokeStyle='#fff2a1';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,k*.98,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
function agent(a,x,y,t){
 const k=t*.35;ctx.save();ctx.translate(x,y);
 ctx.shadowColor='#fa5577';ctx.shadowBlur=8;
 ctx.fillStyle='#18212b';ctx.fillRect(-k*.42,-k*.10,k*.84,k*.8);
 ctx.fillStyle='#eed4ca';ctx.beginPath();ctx.arc(0,-k*.42,k*.39,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fc6388';ctx.fillRect(-k*.30,-k*.46,k*.22,k*.12);
 ctx.fillRect(k*.07,-k*.46,k*.22,k*.12);ctx.restore();
}
function draw(){
 fill(s.matrix?'#010c08':'#030d17',s.matrix?'#01180d':'#061824');
 const f=s.floors[s.floor],n=f.size,t=tileSize();
 if(camFloor!==s.floor){camFloor=s.floor;camX=s.player.x+.5;camY=s.player.y+.5;}
 camX+=(s.player.x+.5-camX)*Math.min(1,.20);
 camY+=(s.player.y+.5-camY)*Math.min(1,.20);
 const lowX=Math.max(0,Math.floor(camX-W/(2*t))-2),highX=Math.min(n-1,Math.ceil(camX+W/(2*t))+2);
 const lowY=Math.max(0,Math.floor(camY-H/(2*t))-2),highY=Math.min(n-1,Math.ceil(camY+H/(2*t))+2);
 ctx.save();
 for(let y=lowY;y<=highY;y++)for(let x=lowX;x<=highX;x++){
  const near=Math.hypot(x-s.player.x,y-s.player.y);
  if(near>8.7)continue;
  const i=y*n+x,p=pixel(x,y,t),seen=!!f.seen[i],mask=f.walls[i];
  ctx.globalAlpha=near>6.5?Math.max(0,.9-(near-6.5)*.37):1;
  ctx.fillStyle=tileColor(s.floor,near,seen);
  ctx.fillRect(p.x-t*.5,p.y-t*.5,t+.7,t+.7);
  if(seen&&f.walked&&f.walked[i]&&near>.8&&near<6.2){
   ctx.fillStyle=s.matrix?'#72ffab77':'#72c9b888';
   ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.8,t*.075),0,Math.PI*2);ctx.fill();
  }
  if(near>7.3){ctx.globalAlpha=1;continue;}
  if(s.matrix&&seen&&((x*7+y*11)%6===0)){
   ctx.fillStyle='#43b98733';ctx.textAlign='center';ctx.font='bold '+Math.max(9,t*.31)+'px monospace';
   ctx.fillText((x+y)%2?'0':'1',p.x,p.y+t*.10);
  }
  const edge=s.matrix?'#5efab5':'#80c8d5';
  ctx.strokeStyle=seen?edge:'#38646b';
  ctx.globalAlpha=(near>5.1?.32:seen?.85:.34);
  ctx.lineWidth=seen?Math.max(2,t*.071):1.2;
  ctx.lineCap='round';ctx.beginPath();
  const left=p.x-t*.5,right=p.x+t*.5,top=p.y-t*.5,bottom=p.y+t*.5;
  if(mask&1){ctx.moveTo(left,top);ctx.lineTo(right,top);}
  if(mask&2){ctx.moveTo(right,top);ctx.lineTo(right,bottom);}
  if(mask&4){ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);}
  if(mask&8){ctx.moveTo(left,top);ctx.lineTo(left,bottom);}
  ctx.stroke();ctx.globalAlpha=1;
  if(near<=6.7){
   if(f.stair&&f.stair.x===x&&f.stair.y===y)drawStair(p.x,p.y,t,false);
   if(f.exit&&f.exit.x===x&&f.exit.y===y)drawStair(p.x,p.y,t,true);
   for(const portal of f.portals)
    if(!portal.taken&&portal.x===x&&portal.y===y)drawPortal(p.x,p.y,t);
  }
 }
 ctx.restore();
 if(s.hintUntil>s.elapsed){
  ctx.save();ctx.shadowBlur=8;ctx.shadowColor='#b6ff9d';
  for(const p of s.hintPath){
   if(Math.hypot(p.x-s.player.x,p.y-s.player.y)>7)continue;
   const xy=pixel(p.x,p.y,t);ctx.fillStyle='#aaff8799';
   ctx.beginPath();ctx.arc(xy.x,xy.y,t*.125,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 }
 for(const a of f.agents){
  if(Math.hypot(a.x-s.player.x,a.y-s.player.y)>6.7)continue;
  const p=pixel(a.x,a.y,t);agent(a,p.x,p.y,t);
 }
 const pl=pixel(s.player.x,s.player.y,t);runner(pl.x,pl.y,t);
 const r=Math.min(W,H)*.45;const grd=ctx.createRadialGradient(W*.5,H*.52,r*.15,W*.5,H*.52,r*1.8);
 grd.addColorStop(0,'#0000');grd.addColorStop(.8,'#0005');grd.addColorStop(1,'#000e');
 ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 if(s.matrix){
  ctx.save();ctx.font='12px monospace';ctx.fillStyle='#7affaa24';
  for(let i=0;i<24;i++){
   const x=((i*61)%101)/101*W,y=((s.elapsed*84+i*53)%(H+80))-40;
   ctx.fillText((i+Math.floor(s.elapsed*3))%2?'1':'0',x,y);
  }
  ctx.restore();
 }
 if(performance.now()<swirlUntil){
  const rem=(swirlUntil-performance.now())/1800;
  ctx.save();ctx.strokeStyle='rgba(131,255,191,'+(rem*.85)+')';
  ctx.lineWidth=3;ctx.translate(W/2,H*.5);
  for(let i=0;i<5;i++){
   const rr=t*(1+i*.8)*(2-rem);
   ctx.beginPath();ctx.arc(0,0,rr,s.elapsed*2+i*.7,s.elapsed*2+i*.7+Math.PI*1.4);ctx.stroke();
  }
  ctx.fillStyle='#ecffdf';ctx.font='bold 22px system-ui';ctx.textAlign='center';
  ctx.fillText('СПИРАЛЬНЫЙ ВИТОК '+(s.floor+1),0,t*3);ctx.restore();
 }
}
function frame(now){
 const dt=prev?Math.min(.045,(now-prev)/1000):0;prev=now;
 if(s.phase==='playing'){
  if(hold&&now>=holdAt){inputMove(hold);holdAt=now+126;}
  const count=Math.max(1,Math.ceil(dt/(1/60)));
  for(let i=0;i<count;i++){
   const events=E.step(s,dt/count);
   if(events.length)handleEvents(events.slice());
   if(s.phase!=='playing')break;
  }
  if(now-lastHUD>110){updateHUD();lastHUD=now;save();}
 }
 draw();requestAnimationFrame(frame);
}
$('continue').hidden=!saved;
$('mode').value=saved?.mode||'navigator';
updateHUD();requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
