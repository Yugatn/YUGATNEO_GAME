/* SYMBIONT CITY · Spiral Runner UI. Camera reveals 11 tiles, never entire level. */
(function(){
'use strict';
const E=window.SymbiontSpiralRunner;if(!E)return;
const $=id=>document.getElementById(id),KEY='yugatneo.symbiont-city.spiral-runner.v1';
let record={version:1,best:0,wins:0};
try{
 const data=JSON.parse(localStorage.getItem(KEY)||'null');
 if(data?.version===1&&Number.isSafeInteger(data.best)&&data.best>=0&&
 Number.isSafeInteger(data.wins)&&data.wins>=0){record=data;}
}catch(_){}
let s=null,prev=0,raf=0,note='',activeDir=null,repeatAt=0,opener=null;
const canvas=$('spiralCanvas'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)return;
function age(){const a=Number($('age').value);return Number.isInteger(a)&&a>=0&&a<=110?a:8;}
function label(){return {up:'вверх',down:'вниз',left:'влево',right:'вправо'};}
function save(){try{localStorage.setItem(KEY,JSON.stringify(record));}catch(_){}}
function draw(){
 if(!s)return;
 const box=canvas.getBoundingClientRect(),w=box.width||330,h=box.height||420;
 const dpr=Math.min(2,devicePixelRatio||1);
 const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle=s.matrix?'#01180d':'#0b1e29';ctx.fillRect(0,0,w,h);
 if(s.phase==='caregiver')return;
 const f=s.floors[s.floor],n=f.size,t=Math.min(w/9.7,h/11.6,42);
 const x0=Math.max(0,s.player.x-7),x1=Math.min(n-1,s.player.x+7),
  y0=Math.max(0,s.player.y-7),y1=Math.min(n-1,s.player.y+7);
 const px=x=>(x-s.player.x)*t+w/2,py=y=>(y-s.player.y)*t+h/2;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const i=y*n+x,dist=Math.hypot(x-s.player.x,y-s.player.y);
  if(dist>7.3)continue;
  const seen=f.seen[i],cx=px(x),cy=py(y),a=dist>5.8?.40:1;
  ctx.globalAlpha=a;ctx.fillStyle=seen?(s.matrix?'#16432b':'#193844'):'#07131a';
  ctx.fillRect(cx-t/2,cy-t/2,t,t);
  if(!seen){ctx.globalAlpha=1;continue;}
  if(f.walked[i]){ctx.fillStyle=s.matrix?'#64f6a540':'#7bcab333';
   ctx.fillRect(cx-t*.13,cy-t*.13,t*.26,t*.26);}
  ctx.strokeStyle=s.matrix?'#a5ffc5':'#b4ded6';ctx.lineWidth=Math.max(2,t*.07);
  const mask=f.walls[i];ctx.beginPath();
  if(mask&1){ctx.moveTo(cx-t/2,cy-t/2);ctx.lineTo(cx+t/2,cy-t/2);}
  if(mask&2){ctx.moveTo(cx+t/2,cy-t/2);ctx.lineTo(cx+t/2,cy+t/2);}
  if(mask&4){ctx.moveTo(cx-t/2,cy+t/2);ctx.lineTo(cx+t/2,cy+t/2);}
  if(mask&8){ctx.moveTo(cx-t/2,cy-t/2);ctx.lineTo(cx-t/2,cy+t/2);}
  ctx.stroke();
  if(f.portal&&!f.portalTaken&&x===f.portal.x&&y===f.portal.y){
   ctx.strokeStyle='#8bffcb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,t*.31,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#c4ffe4';ctx.font='bold '+Math.round(t*.29)+'px monospace';ctx.textAlign='center';ctx.fillText('01',cx,cy+4);
  }
  if(x===f.exit.x&&y===f.exit.y){
   ctx.fillStyle='#ffeba3';ctx.font=Math.round(t*.60)+'px sans-serif';ctx.textAlign='center';ctx.fillText('✦',cx,cy+t*.2);
  }
  ctx.globalAlpha=1;
 }
 for(const a of f.agents){
  if(Math.hypot(a.x-s.player.x,a.y-s.player.y)>6.5)continue;
  const x=px(a.x),y=py(a.y);
  ctx.fillStyle='#101820';ctx.beginPath();ctx.arc(x,y,t*.30,0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#ff9fb3';ctx.fillRect(x-t*.18,y-t*.07,t*.36,t*.07);
  ctx.strokeStyle='#f4aabb';ctx.strokeRect(x-t*.3,y-t*.3,t*.6,t*.6);
 }
 // Original little runner with round sunglasses, running legs and a coat.
 const x=w/2,y=h/2,wiggle=Math.sin(s.seconds*22)*t*.09;
 ctx.save();ctx.translate(x,y);
 if(s.arm||s.invul>.5){ctx.strokeStyle=s.arm?'#ffe89e':'#93ffc2';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,t*.43,0,Math.PI*2);ctx.stroke();}
 ctx.strokeStyle='#64dfad';ctx.lineWidth=t*.14;ctx.lineCap='round';ctx.beginPath();
 ctx.moveTo(-t*.12,t*.15);ctx.lineTo(-t*.18,t*.35+wiggle);
 ctx.moveTo(t*.12,t*.15);ctx.lineTo(t*.18,t*.35-wiggle);ctx.stroke();
 ctx.fillStyle='#268b77';ctx.beginPath();ctx.ellipse(0,0,t*.22,t*.31,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e4bc94';ctx.beginPath();ctx.arc(0,-t*.25,t*.22,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#15282f';ctx.beginPath();ctx.arc(0,-t*.35,t*.2,Math.PI,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#eefff9';ctx.fillStyle='#051721';ctx.lineWidth=1.3;
 for(const dx of [-t*.1,t*.1]){ctx.beginPath();ctx.arc(dx,-t*.25,t*.085,0,Math.PI*2);ctx.fill();ctx.stroke();}
 ctx.restore();
 if(s.matrix){
  ctx.globalAlpha=.19;ctx.fillStyle='#a8ffb2';ctx.font='12px monospace';
  for(let i=0;i<18;i++)ctx.fillText((i+Math.floor(s.seconds*4))%2?'1':'0',
    (i*97)%w,((i*49+s.seconds*34)%(h+20))-10);
  ctx.globalAlpha=1;
 }
 ctx.fillStyle='#ebfff3';ctx.font='bold 12px system-ui';ctx.textAlign='center';
 ctx.fillText(s.floor+1+' / '+s.floors.length+' СПИРАЛЬНЫХ ВИТКОВ',w/2,22);
}
function hud(){
 if(!s)return;
 $('spiralFloor').textContent=s.phase==='caregiver'?'ВМЕСТЕ СО ВЗРОСЛЫМ':'ВИТОК '+(s.floor+1)+'/'+s.floors.length;
 $('spiralLives').textContent=s.phase==='caregiver'?'БЕЗ ОЧКОВ':'♥'.repeat(s.lives);
 $('spiralScore').textContent='ОЧКИ '+s.score;
 $('spiralCharges').textContent=s.charges+' зарядов';
 $('spiralPhase').disabled=s.phase!=='playing'||!s.charges;
 $('spiralHint').disabled=s.phase!=='playing';
 $('spiralStatus').textContent=note||s.message||
  (s.matrix?'Матричный код активирован. Используй фазовый прыжок.':
    'Изучай коридоры. Агентов можно обходить через другие проходы.');
}
function advance(dir){
 if(!s||s.phase!=='playing')return;
 const out=E.move(s,dir);
 if(out?.kind==='wall')note='Стена! Ищи другой проход или используй заряд после портала.';
 else if(out?.kind==='portal')note='Портал активирован! Теперь можно пройти сквозь стену.';
 else if(out?.kind==='stair')note='Новый виток открыт. Не спеши.';
 else if(out?.kind==='complete'){
  note='Все уровни пройдены! Обсуди, какой маршрут был самым интересным.';
  record.best=Math.max(record.best,s.score);record.wins++;save();
 }else if(out?.kind==='failed')note='Агент догнал тебя. Можно начать заново.';
 else note='';
 hud();draw();
}
function frame(now){
 if(!s)return;
 const dt=prev?Math.min(.05,(now-prev)/1000):0;prev=now;
 if(s.phase==='playing'){
  for(const event of E.tick(s,dt)){
   if(event==='failed')note='Агенты догнали тебя. Попробуй снова.';
   if(event==='hit')note='Агент близко! Потеряна одна жизнь.';
  }
  if(activeDir&&now>=repeatAt){advance(activeDir);repeatAt=now+155;}
 }
 draw();hud();raf=requestAnimationFrame(frame);
}
function start(){
 s=E.create(age(),(Date.now()^Math.floor(Math.random()*999999))>>>0);
 note='';activeDir=null;prev=0;
 if(s.phase!=='caregiver')E.start(s);
 $('spiralIntro').hidden=s.phase!=='caregiver';
 if(s.phase==='caregiver')$('spiralIntro').textContent='Для возраста 0–2 лет: устройте дома настоящий лабиринт из мягких безопасных предметов и проведите игрушку к цели вместе. Экранная игра и оценка младенцу не нужны.';
 $('spiralCanvas').hidden=s.phase==='caregiver';
 $('spiralControls').hidden=s.phase==='caregiver';
 $('spiralPhase').hidden=s.phase==='caregiver';
 $('spiralHint').hidden=s.phase==='caregiver';
 hud();draw();
}
function open(){
 opener=document.activeElement;
 $('spiralOverlay').hidden=false;start();
 if(raf)cancelAnimationFrame(raf);
 raf=requestAnimationFrame(frame);$('spiralClose').focus();
}
function close(){
 if(raf)cancelAnimationFrame(raf);
 raf=0;activeDir=null;s=null;
 $('spiralOverlay').hidden=true;
 opener?.focus?.();
}
$('spiralStart').addEventListener('click',open);
$('spiralClose').addEventListener('click',close);
$('spiralAgain').addEventListener('click',start);
$('spiralPhase').addEventListener('click',()=>{
 if(!s)return;
 if(E.phase(s)){note=s.arm?'Фаза готова: выбери направление сквозь одну стену.':'Фазовый проход отменён.';hud();}
});
$('spiralHint').addEventListener('click',()=>{
 if(!s)return;
 const dir=E.hint(s);note=dir?'Подсказка: попробуй '+label()[dir]+'.':'Ты уже рядом с переходом.';hud();
});
$('spiralControls').addEventListener('pointerdown',e=>{
 const btn=e.target.closest('[data-spiral-direction]');if(!btn)return;
 e.preventDefault();activeDir=btn.dataset.spiralDirection;advance(activeDir);
 repeatAt=performance.now()+230;
 try{btn.setPointerCapture(e.pointerId);}catch(_){}
});
for(const event of ['pointerup','pointercancel','lostpointercapture']){
 $('spiralControls').addEventListener(event,()=>{activeDir=null;});
}
$('spiralControls').addEventListener('click',e=>{
 if(e.detail!==0)return;
 const b=e.target.closest('[data-spiral-direction]');if(b)advance(b.dataset.spiralDirection);
});
document.addEventListener('keydown',e=>{
 if($('spiralOverlay').hidden)return;
 const keys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
  ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
 if(keys[e.code]){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)advance(keys[e.code]);}
 if((e.code==='Space'||e.code==='KeyF')&&!e.repeat){e.preventDefault();$('spiralPhase').click();}
},true);
document.addEventListener('visibilitychange',()=>{
 if(s&&document.hidden)E.pause(s);
 else if(s&&s.phase==='paused'){E.start(s);prev=0;}
});
document.addEventListener('symbiont-city:cleared',()=>{
 record={version:1,best:0,wins:0};try{localStorage.removeItem(KEY);}catch(_){}
 if(s)close();$('spiralRecord').textContent='Рекорд пока не установлен';
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail)e.detail.spiralRunner={best:record.best,wins:record.wins};
});
$('spiralRecord').textContent=record.wins?'Прохождений '+record.wins+' · рекорд '+record.best:'Рекорд пока не установлен';
})();
