/* YUGATNEO MATRIX JET · Telegram-friendly Canvas top-down renderer.
   Projected plane scale follows flight level. No remote game server or identity.
 */
(function(){
'use strict';
const Engine=window.MatrixJetEngine;
if(!Engine)throw Error('MatrixJetEngine missing');
const $=id=>document.getElementById(id),canvas=$('sky');
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){$('intro').querySelector('p').textContent='Canvas недоступен в этом браузере.';return;}
let s=Engine.create(),w=390,h=780,dpr=1,last=0,lastHud=0,noteEnd=0,noteText='';
let best=readBest(),pointer=null;
const BEST_KEY='yugatneo.matrix-jet.best.v1';
const columns=Array.from({length:46},(_,i)=>({
 x:((i*73+19)%101)/101, offset:(i*131)%1000,
 speed:70+(i*21)%95, length:12+(i%4)*11
}));
const app=(()=>{try{
 const t=window.Telegram?.WebApp;
 if(t){t.ready();t.expand();t.setHeaderColor?.('#020808');
 t.setBackgroundColor?.('#020808');t.disableVerticalSwipes?.();}
 return t||null;
}catch(_){return null;}})();
function feel(kind='light'){try{app?.HapticFeedback?.impactOccurred(kind);}catch(_){}}
function readBest(){try{
 const n=Number(localStorage.getItem('yugatneo.matrix-jet.best.v1'));
 return Number.isSafeInteger(n)&&n>=0&&n<1e10?n:0;
}catch(_){return 0;}}
function writeBest(){
 if(s.score>best){
  best=s.score;
  try{localStorage.setItem(BEST_KEY,String(best));}catch(_){}
 }
}
function size(){
 const r=canvas.getBoundingClientRect();
 w=Math.max(280,r.width||window.innerWidth);h=Math.max(400,r.height||window.innerHeight);
 s.aspect=w/h;
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
size();window.addEventListener('resize',size,{passive:true});
window.visualViewport?.addEventListener('resize',size,{passive:true});
function overlay(name){
 for(const id of ['intro','paused','over'])$(id).hidden=id!==name;
}
function note(message,ms=1250){noteText=message;noteEnd=performance.now()+ms;}
function reset(){
 s=Engine.create((Date.now()^Math.floor(Math.random()*1000000))>>>0);
 s.aspect=w/h;
 Engine.start(s);last=performance.now();
 overlay(null);note('УКЛОНЯЙСЯ И МЕНЯЙ ВЫСОТУ',1600);
 hud();feel('light');
 try{canvas.focus({preventScroll:true});}catch(_){}
}
function home(){
 s=Engine.create();overlay('intro');hud();
}
function pause(){
 if(Engine.pause(s)){overlay('paused');hud();}
}
function resume(){
 if(Engine.start(s)){overlay(null);last=performance.now();hud();}
}
function action(type){
 if(s.phase!=='running')return;
 let ok=false;
 if(type==='left')ok=Engine.steer(s,-1);
 if(type==='right')ok=Engine.steer(s,1);
 if(type==='up')ok=Engine.changeAltitude(s,1);
 if(type==='down')ok=Engine.changeAltitude(s,-1);
 if(type==='phase')ok=Engine.special(s);
 if(ok){feel(type==='phase'?'medium':'light');
  if(type==='up'||type==='down')note('ВЫСОТА: '+Engine.ALTITUDES[s.altitude].toUpperCase(),520);
  if(type==='phase')note('ФАЗОВЫЙ ПРОХОД: 3 СЕКУНДЫ',1000);
  hud();
 }
}
$('start').addEventListener('click',reset);
$('again').addEventListener('click',reset);
$('pause').addEventListener('click',()=>s.phase==='paused'?resume():pause());
$('resume').addEventListener('click',resume);
$('pauseHome').addEventListener('click',home);
$('overHome').addEventListener('click',home);
for(const id of ['left','right','up','down'])$(id).addEventListener('pointerdown',e=>{
 e.preventDefault();action(id);
});
$('phase').addEventListener('pointerdown',e=>{e.preventDefault();action('phase');});
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
 ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'phase',KeyF:'phase'};
window.addEventListener('keydown',e=>{
 if(keyMap[e.code]||['Escape','KeyP','Enter'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(keyMap[e.code])action(keyMap[e.code]);
 else if(e.code==='Escape'||e.code==='KeyP')s.phase==='paused'?resume():pause();
 else if(e.code==='Enter'&&s.phase==='ready')reset();
});
canvas.addEventListener('pointerdown',e=>{
 if(s.phase!=='running')return;
 e.preventDefault();
 const r=canvas.getBoundingClientRect();
 pointer={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};
 try{canvas.setPointerCapture(e.pointerId);}catch(_){}
 Engine.aim(s,(e.clientX-r.left)/r.width);
});
canvas.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId||s.phase!=='running')return;
 e.preventDefault();
 const r=canvas.getBoundingClientRect();
 Engine.aim(s,(e.clientX-r.left)/r.width);
});
function release(e){
 if(!pointer||pointer.id!==e.pointerId)return;
 const r=canvas.getBoundingClientRect();
 const dy=e.clientY-r.top-pointer.y;
 if(Math.abs(dy)>40)action(dy<0?'up':'down');
 pointer=null;
}
canvas.addEventListener('pointerup',release);
canvas.addEventListener('pointercancel',()=>{pointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',()=>{if(s.phase==='running')pause();});
function hud(){
 $('score').textContent=s.score.toLocaleString('ru-RU');
 $('best').textContent=Math.max(best,s.score).toLocaleString('ru-RU');
 $('altitude').textContent='◈ '+Engine.ALTITUDES[s.altitude].toUpperCase();
 $('lives').textContent='♥ '.repeat(s.lives).trim()||'—';
 $('codeChip').classList.toggle('visible',s.matrix);
 $('charges').textContent=s.charges;
 $('phase').classList.toggle('visible',s.matrix&&s.phase==='running');
 $('phase').disabled=s.charges<1||s.phaseTime>0;
 const visible=performance.now()<noteEnd&&s.phase==='running';
 $('note').textContent=visible?noteText:'';
 $('note').classList.toggle('visible',visible);
}
function end(){
 writeBest();
 $('reason').textContent=s.reason;
 $('result').textContent=s.score.toLocaleString('ru-RU')+' ОЧКОВ · '+
 Math.floor(s.distance)+' М · '+s.avoided+' ОБХОДОВ · '+s.portals+' ПОРТАЛОВ';
 overlay('over');feel('heavy');hud();
}
function eventHandler(events){
 for(const e of events){
  if(e==='portal'){note('МАТРИЦА АКТИВИРОВАНА · ПРОХОД СКВОЗЬ ПРЕГРАДЫ',2200);feel('heavy');}
  else if(e==='hit'){note('ОПАСНОСТЬ! ОСТАЛОСЬ '+s.lives+' ЖИЗНЕЙ',950);feel('medium');}
  else if(e==='nearMiss'){note('НА ГРАНИ! +45',440);}
  else if(e==='phased'){note('ПРЕГРАДА ПРОЙДЕНА НАСКВОЗЬ',680);}
  else if(e==='portalAhead'){note('СВЕТОВОЙ ПОРТАЛ ВПЕРЕДИ',1300);}
  else if(e==='gameover'){end();}
 }
}
function background(){
 const g=ctx.createLinearGradient(0,0,0,h);
 if(s.matrix){g.addColorStop(0,'#010703');g.addColorStop(1,'#031c0e');}
 else{g.addColorStop(0,'#010608');g.addColorStop(1,'#071a21');}
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const spacing=Math.max(34,w/8);
 ctx.lineWidth=.8;
 ctx.strokeStyle=s.matrix?'#1d5b33a0':'#16404497';
 const scroll=(s.distance*.19)%spacing;
 for(let x=0;x<w+spacing;x+=spacing){
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
 }
 for(let y=-spacing+scroll;y<h;y+=spacing){
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
 }
 ctx.lineWidth=1.5;ctx.strokeStyle=s.matrix?'#4efdbb3d':'#5ddad13a';
 ctx.strokeRect(w*.06,0,w*.88,h);
 ctx.save();
 ctx.globalAlpha=s.matrix?.37:.26;
 for(const c of columns){
  let y=(s.elapsed*c.speed+c.offset)%(h+160)-80;
  const x=c.x*w;
  if(s.matrix){
   ctx.font='12px monospace';ctx.textAlign='center';ctx.fillStyle='#78ff91';
   for(let j=0;j<4;j++){
    const glyph=((c.offset+j+Math.floor(s.elapsed*9))%3===0?'1':'0');
    ctx.fillText(glyph,x,y-j*18);
   }
  }else{
   ctx.strokeStyle='#9deed0';ctx.lineWidth=c.x%2?1:1.7;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-c.length*s.speed);ctx.stroke();
  }
 }
 ctx.restore();
 ctx.fillStyle=s.matrix?'#66ffab':'#a9e6e1';ctx.font='bold 10px monospace';ctx.textAlign='center';
 ctx.globalAlpha=.65;ctx.fillText('FLIGHT ALTITUDE · '+(s.altitude+1)+'/3',w/2,h*.19);ctx.globalAlpha=1;
}
function ellipse(x,y,rx,ry,fill,stroke,thick=1){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,2*Math.PI);
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.lineWidth=thick;ctx.strokeStyle=stroke;ctx.stroke();}
}
function cloud(e,px,py,scale){
 const radius=e.r*w*1.2*scale;
 ctx.save();ctx.translate(px,py);
 ctx.globalAlpha=e.altitude===s.altitude?1:.46;
 ctx.shadowBlur=13;ctx.shadowColor='#f9bea3';
 for(const [dx,dy,rz] of [[-.52,.12,.48],[-.17,-.23,.57],[.32,-.16,.62],[.61,.17,.41],[0,.28,.63]]){
  ellipse(dx*radius,dy*radius,rz*radius,rz*radius*.72,
   s.matrix?'#3d7353':'#8aa4a6',s.matrix?'#8dffa6':'#d7e6db',.9);
 }
 ctx.shadowBlur=0;ctx.fillStyle='#ffdfba';ctx.textAlign='center';
 ctx.font='bold 10px monospace';ctx.fillText('☁ '+(e.altitude+1),0,radius*.66);
 ctx.restore();
}
function birds(e,px,py,scale){
 const radius=e.r*w*1.55*scale;
 ctx.save();ctx.translate(px,py);ctx.globalAlpha=e.altitude===s.altitude?1:.4;
 ctx.strokeStyle=s.matrix?'#d6ffd0':'#f3bb98';ctx.lineCap='round';ctx.lineWidth=2.5;
 for(let i=0;i<7;i++){
  const dx=((i%3)-1)*radius*.6;
  const dy=(Math.floor(i/3)-1)*radius*.44;
  const flap=Math.sin(s.elapsed*19+i*1.5)*radius*.09;
  ctx.beginPath();
  ctx.moveTo(dx-radius*.23,dy-flap);
  ctx.lineTo(dx,dy+radius*.16);
  ctx.lineTo(dx+radius*.23,dy-flap);
  ctx.stroke();
 }
 ctx.fillStyle='#ffdfba';ctx.font='bold 10px monospace';ctx.textAlign='center';
 ctx.fillText('∧ '+(e.altitude+1),0,radius*.9);
 ctx.restore();
}
function portal(e,px,py,scale){
 const radius=e.r*w*1.4*scale;
 ctx.save();ctx.translate(px,py);ctx.shadowColor='#69ffc0';ctx.shadowBlur=25;
 ctx.lineWidth=5;ctx.strokeStyle='#88ffcf';
 ctx.beginPath();ctx.ellipse(0,0,radius*.72,radius*1.15,0,0,2*Math.PI);ctx.stroke();
 ctx.lineWidth=1.5;ctx.strokeStyle='#d5ffe4';
 ctx.beginPath();ctx.ellipse(0,0,radius*.43,radius*.82,0,0,2*Math.PI);ctx.stroke();
 ctx.shadowBlur=0;ctx.font='bold 14px monospace';ctx.fillStyle='#cbffcf';ctx.textAlign='center';
 ctx.fillText('01',0,5);ctx.font='bold 10px monospace';ctx.fillText('H'+(e.altitude+1),0,radius*1.5);
 ctx.restore();
}
function plane(){
 const px=s.x*w,py=Engine.C.PLAYER_Y*h;
 const pScale=1.22-s.smoothAltitude*.22; // Lower = larger; higher = smaller.
 const base=Math.min(70,w*.155)*pScale;
 ctx.save();
 ellipse(px+7,py+base*.45,base*.80,base*.30,'#010a0b99');
 ctx.translate(px,py);
 ctx.scale(base/58,base/58);
 if(s.phaseTime>0){
  ctx.shadowBlur=28;ctx.shadowColor='#5bffac';
  ellipse(0,0,85,88,'#4affb013','#aaffba',3);
 }
 ctx.lineJoin='round';ctx.lineCap='round';
 ctx.fillStyle=s.matrix?'#53c989':'#afd5cb';
 ctx.strokeStyle=s.matrix?'#d1ffe0':'#e8fff5';ctx.lineWidth=3;
 ctx.beginPath();
 ctx.moveTo(0,-80);ctx.lineTo(12,-46);ctx.lineTo(17,-18);
 ctx.lineTo(63,12);ctx.lineTo(66,31);
 ctx.lineTo(19,16);ctx.lineTo(15,50);
 ctx.lineTo(32,64);ctx.lineTo(32,71);ctx.lineTo(0,62);
 ctx.lineTo(-32,71);ctx.lineTo(-32,64);ctx.lineTo(-15,50);
 ctx.lineTo(-19,16);ctx.lineTo(-66,31);ctx.lineTo(-63,12);
 ctx.lineTo(-17,-18);ctx.lineTo(-12,-46);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;
 ctx.fillStyle='#062326';
 ctx.beginPath();ctx.moveTo(0,-63);ctx.lineTo(9,-29);ctx.lineTo(10,2);ctx.lineTo(0,18);
 ctx.lineTo(-10,2);ctx.lineTo(-9,-29);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#b8ffdb';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle=s.matrix?'#b4ffca':'#4c8b88';
 ctx.beginPath();ctx.moveTo(-43,16);ctx.lineTo(-16,6);ctx.lineTo(-11,30);
 ctx.lineTo(-55,29);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(43,16);ctx.lineTo(16,6);ctx.lineTo(11,30);
 ctx.lineTo(55,29);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c6ffba';
 ellipse(-9,64,5,12,'#80ffc1');ellipse(9,64,5,12,'#80ffc1');
 ctx.restore();
 if(Math.abs(s.smoothAltitude-s.altitude)>.04){
  ellipse(px,py,base*.9,base*.92,null,'#73ffe3aa',2);
 }
 ctx.textAlign='center';ctx.font='bold 11px monospace';ctx.fillStyle='#dbffea';
 ctx.fillText(Engine.ALTITUDES[s.altitude].toUpperCase(),px,py+base*1.18+18);
}
function render(){
 background();
 const entities=s.entities.filter(e=>e.y>-.22&&e.y<1.16).sort((a,b)=>a.altitude-b.altitude);
 for(const e of entities){
  const x=e.x*w,y=e.y*h;
  const scaled=1.22-e.altitude*.22;
  if(e.kind==='portal')portal(e,x,y,scaled);
  else if(e.kind==='cloud')cloud(e,x,y,scaled);
  else birds(e,x,y,scaled);
 }
 plane();
 if(s.matrix){
  ctx.fillStyle='#a4ffc6';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText(s.phaseTime>0?'ФАЗОВАЯ НЕУЯЗВИМОСТЬ':'ЗАРЯДЫ: '+s.charges+' · F / КНОПКА',w/2,h*.26);
 }
}
function loop(now){
 const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
 if(s.phase==='running'){
  const count=Math.max(1,Math.ceil(dt/(1/60)));
  for(let i=0;i<count;i++){
   const events=Engine.step(s,dt/count);
   if(events.length)eventHandler(events);
   if(s.phase==='gameover')break;
  }
  if(now-lastHud>95){hud();lastHud=now;}
 }
 render();requestAnimationFrame(loop);
}
hud();requestAnimationFrame(loop);
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
