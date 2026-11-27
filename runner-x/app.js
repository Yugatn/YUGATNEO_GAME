/* Telegram Mini App host + game controls. No Telegram authentication or bot token. */
(function(){
'use strict';
const Core=window.MatrixRunnerXCore,Renderer=window.MatrixRunnerXRenderer;
const $=id=>document.getElementById(id);
const canvas=$('scene'),renderer=new Renderer(canvas);
let state=Core.newGame();let last=0,best=readBest('standard');let lastPhase='ready';let telegram=null,accumulator=0;
const labels={training:'ОБУЧЕНИЕ',standard:'СТАНДАРТ',expert:'ЭКСПЕРТ'};
const storageKey=d=>'yugatneo.matrixRunnerX.best.v1'+(d==='standard'?'':'.'+d);
const nf=new Intl.NumberFormat('ru-RU');
function readBest(d){try{const s=Number(localStorage.getItem(storageKey(d)));return Number.isSafeInteger(s)&&s>0&&s<1000000000?s:0;}catch{return 0;}}
function saveBest(){if(state.score<=best)return;best=state.score;try{localStorage.setItem(storageKey(state.difficulty),String(best));}catch{}}
function setupTelegram(){try{telegram=window.Telegram&&window.Telegram.WebApp;
  if(!telegram)return;
  telegram.ready();telegram.expand();
  telegram.setHeaderColor?.('#07131b');telegram.setBackgroundColor?.('#07131b');
  telegram.disableVerticalSwipes?.();
  $('source').textContent='TELEGRAM · MINI APP';
 }catch(_){telegram=null;}}
function haptic(type='light'){try{telegram?.HapticFeedback?.impactOccurred(type);}catch{}}
function showOverlay(kind){const ready=kind==='ready',paused=kind==='paused';
  $('overlay').hidden=false;$('difficulty').hidden=paused;
  $('overlay-kicker').textContent=ready?'ВНИМАНИЕ · РЕАКЦИЯ · ДВИЖЕНИЕ':paused?'ПАУЗА · ТВОЙ ТЕМП':'ПУТЬ ЗАВЕРШЁН · ПОВТОРИ';
  $('overlay-title').innerHTML=ready?'MATRIX<br><em>RUNNER X</em>':paused?'ПАУЗА<br><em>ВРЕМЕНИ</em>':'ИГРА<br><em>ОКОНЧЕНА</em>';
  if(ready){$('overlay-description').innerHTML='Беги сквозь спиральный мир. <span class="highlight">Прыгай по центру</span>, поворачивай касанием краёв, поднимайся на новые уровни. Портал открывает импульс. Собери пять голубых фрагментов кода, чтобы получить щит от одного столкновения.';}
  else if(paused){$('overlay-description').textContent='Забег остановлен. Вернись в игру, когда будет удобно. Никаких штрафов за перерыв.';}
  else {$('overlay-description').textContent='Очки: '+nf.format(state.score)+' · Путь: '+Math.floor(state.progress)+' м · Обойдено: '+state.avoided+' · Поворотов: '+state.turnsMade+' · Код: '+state.data+'. '+({hit:'Столкновение с препятствием.',agent:'Агент догнал тебя.', 'missed-turn':'Поворот был пропущен.','missed-step':'Для следующего уровня нужно прыгнуть.'}[state.reason]||'');}
  $('overlay-tips').textContent=ready?'Свайп или клавиши: влево / вправо / вверх. Центр экрана — прыжок.':paused?'КЛАВИШИ: ПРОБЕЛ, ←, →, F, V, P':'ПРОБУЙ ДРУГОЙ ПУТЬ И СОБИРАЙ ОЧКИ';
  $('start').textContent=ready?'▶ НАЧАТЬ':paused?'▶ ПРОДОЛЖИТЬ':'↻ ЕЩЁ РАЗ';
}
function begin(){if(state.phase==='gameover'||state.phase==='ready'){state=Core.newGame((Math.random()*4294967296)>>>0,$('difficulty').value);best=readBest(state.difficulty);renderer.yaw=0;}
  accumulator=0;Core.start(state);$('overlay').hidden=true;last=performance.now();lastPhase='running';haptic('light');canvas.focus({preventScroll:true});}
function pause(){if(state.phase==='running'){saveBest();Core.pause(state);showOverlay('paused');lastPhase='paused';}
 else if(state.phase==='paused')begin();}
function action(name){if(state.phase!=='running')return;
  const result=name==='jump'?Core.jump(state):name==='left'||name==='right'?Core.turn(state,name):
    name==='fire'?Core.pulse(state):name==='camera'?Core.camera(state):false;
  if(result)haptic(name==='fire'?'medium':'light');}
$('start').addEventListener('click',begin);
$('left').addEventListener('pointerdown',e=>{e.preventDefault();action('left');});
$('right').addEventListener('pointerdown',e=>{e.preventDefault();action('right');});
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();action('jump');});
$('fire').addEventListener('pointerdown',e=>{e.preventDefault();action('fire');});
$('camera').addEventListener('click',()=>{if(state.phase==='running'){Core.camera(state);haptic();}});
$('pause').addEventListener('click',pause);
let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||state.phase!=='running')return;e.preventDefault();gesture={id:e.pointerId,x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch{}},{passive:false});
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
  if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy))action(dx<0?'left':'right');
  else if(dy<-25)action('jump');
  else if(Math.abs(dy)<25&&Math.abs(dx)<30){const rect=canvas.getBoundingClientRect(),u=(e.clientX-rect.left)/rect.width;action(u<.27?'left':u>.73?'right':'jump');}
},{passive:false});
canvas.addEventListener('pointercancel',()=>{gesture=null;});
for(const id of ['left','right','jump','fire'])$(id).addEventListener('click',e=>{if(e.detail===0)action(id);});
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowLeft','ArrowRight','KeyW','KeyA','KeyD'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')action('jump');
  if(e.code==='ArrowLeft'||e.code==='KeyA')action('left');
  if(e.code==='ArrowRight'||e.code==='KeyD')action('right');
  if(e.code==='KeyF')action('fire');
  if(e.code==='KeyV'&&state.phase==='running')Core.camera(state);
  if(e.code==='KeyP'||e.code==='Escape')pause();
  if(e.code==='Enter'&&state.phase!=='running')begin();
},{passive:false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='running')pause();});
window.addEventListener('blur',()=>{if(state.phase==='running')pause();});
if(window.ResizeObserver)new ResizeObserver(()=>renderer.resize()).observe(canvas);
window.addEventListener('resize',()=>renderer.resize(),{passive:true});
let hudTime=0;
function updateHud(dt){hudTime+=dt;if(hudTime<.09)return;hudTime=0;
  $('score').textContent=nf.format(state.score);$('best').textContent=nf.format(Math.max(best,state.score));
  $('level').textContent=String(state.tier+1);
  $('data-status').textContent='КОД: '+state.data+' · ЩИТ: '+(state.shield?'ГОТОВ':state.charge+'/5');
  $('difficulty-status').textContent=labels[state.difficulty];
  $('mode').textContent=state.matrix>0?'КОД '+Math.ceil(state.matrix)+'с':'РЕАЛЬНОСТЬ';
  const hint=Core.nextHint(state),distance=Math.max(0,Math.round(hint.distance));
  const eta=distance/state.speed,window=hint.kind==='turn'?state.rules.turn:48;
  const now=hint.kind!=='turn'&&eta<=.43;
  $('hint').textContent=distance<=window?hint.text+' · '+(now?'СЕЙЧАС':distance+' м'):'ПУТЬ '+Math.floor(state.progress)+' м · ОБОЙДЕНО '+state.avoided;
  $('hint').classList.toggle('urgent',distance<=window);
  $('fire').disabled=state.matrix<=0||state.pulseCooldown>0||state.phase!=='running';
  $('camera').textContent=state.view==='top'?'◉ ВИД СЗАДИ':'◉ ВИД СВЕРХУ';
}
function tick(now){const dt=last?Math.max(0,(now-last)/1000):1/60;last=now;
  if(state.phase==='running'){
    accumulator=Math.min(.20,accumulator+dt);
    while(accumulator>=1/60&&state.phase==='running'){
    accumulator-=1/60;
    const events=Core.step(state,1/60);
    for(const ev of events){
      if(ev==='portal'||ev==='climb'||ev==='agent-neutralized'||ev==='shield-ready'||ev==='shield-used')haptic('heavy');
      if(ev==='gameover'){saveBest();showOverlay('over');lastPhase='gameover';haptic('heavy');}
    }
    }
    if(state.phase==='running')saveBest();
  }
  renderer.scene(state,Math.min(.05,dt));updateHud(dt);
  requestAnimationFrame(tick);
}
showOverlay('ready');updateHud(.2);requestAnimationFrame(tick);
window.addEventListener('load',setupTelegram);
setupTelegram();
if('serviceWorker' in navigator&&location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
}
})();