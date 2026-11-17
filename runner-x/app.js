/* Telegram Mini App host + game controls. No Telegram authentication or bot token. */
(function(){
'use strict';
const Core=window.MatrixRunnerXCore,Renderer=window.MatrixRunnerXRenderer;
const $=id=>document.getElementById(id);
const canvas=$('scene'),renderer=new Renderer(canvas);
let state=Core.newGame();let last=0,best=readBest();let lastPhase='ready';let telegram=null;
const nf=new Intl.NumberFormat('ru-RU');
function readBest(){try{const s=Number(localStorage.getItem('yugatneo.matrixRunnerX.best.v1'));return Number.isSafeInteger(s)&&s>0&&s<1000000000?s:0;}catch{return 0;}}
function saveBest(){if(state.score<=best)return;best=state.score;try{localStorage.setItem('yugatneo.matrixRunnerX.best.v1',String(best));}catch{}}
function setupTelegram(){try{telegram=window.Telegram&&window.Telegram.WebApp;
  if(!telegram)return;
  telegram.ready();telegram.expand();
  telegram.setHeaderColor?.('#07131b');telegram.setBackgroundColor?.('#07131b');
  telegram.disableVerticalSwipes?.();
  $('source').textContent='TELEGRAM · MINI APP';
 }catch(_){telegram=null;}}
function haptic(type='light'){try{telegram?.HapticFeedback?.impactOccurred(type);}catch{}}
function showOverlay(kind){const ready=kind==='ready',paused=kind==='paused';
  $('overlay').hidden=false;
  $('overlay-kicker').textContent=ready?'ВНИМАНИЕ · РЕАКЦИЯ · ДВИЖЕНИЕ':paused?'ПАУЗА · ТВОЙ ТЕМП':'ПУТЬ ЗАВЕРШЁН · ПОВТОРИ';
  $('overlay-title').innerHTML=ready?'MATRIX<br><em>RUNNER X</em>':paused?'ПАУЗА<br><em>ВРЕМЕНИ</em>':'ИГРА<br><em>ОКОНЧЕНА</em>';
  if(ready){$('overlay-description').innerHTML='Беги сквозь спиральный мир. <span class="highlight">Прыгай по центру</span>, поворачивай касанием краёв, поднимайся на новые уровни. Портал открывает код Матрицы и суперспособность.';}
  else if(paused){$('overlay-description').textContent='Забег остановлен. Вернись в игру, когда будет удобно. Никаких штрафов за перерыв.';}
  else {$('overlay-description').textContent='Очки: '+nf.format(state.score)+' · Путь: '+Math.floor(state.progress)+' м · Обойдено: '+state.avoided+' · Поворотов: '+state.turnsMade+'. '+({hit:'Столкновение с препятствием.',agent:'Агент догнал тебя.', 'missed-turn':'Поворот был пропущен.','missed-step':'Для следующего уровня нужно прыгнуть.'}[state.reason]||'');}
  $('overlay-tips').textContent=ready?'◁ КРАЙ — ЛЕВО · ЦЕНТР — ПРЫЖОК · ПРАВЫЙ КРАЙ — ПРАВО ▷':paused?'КЛАВИШИ: ПРОБЕЛ, ←, →, F, V, P':'ПРОБУЙ ДРУГОЙ ПУТЬ И СОБИРАЙ ОЧКИ';
  $('start').textContent=ready?'▶ НАЧАТЬ':paused?'▶ ПРОДОЛЖИТЬ':'↻ ЕЩЁ РАЗ';
}
function begin(){if(state.phase==='gameover'){state=Core.newGame();renderer.yaw=0;}
  Core.start(state);$('overlay').hidden=true;last=performance.now();lastPhase='running';haptic('light');canvas.focus({preventScroll:true});}
function pause(){if(state.phase==='running'){Core.pause(state);showOverlay('paused');lastPhase='paused';}
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
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect();const u=(e.clientX-rect.left)/rect.width;
  if(u<.27)action('left');else if(u>.73)action('right');else action('jump');},{passive:false});
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
  $('mode').textContent=state.matrix>0?'КОД '+Math.ceil(state.matrix)+'с':'РЕАЛЬНОСТЬ';
  const hint=Core.nextHint(state),distance=Math.max(0,Math.round(hint.distance));
  $('hint').textContent=distance<48?hint.text+' · '+distance+' м':'ПУТЬ '+Math.floor(state.progress)+' м · ОБОЙДЕНО '+state.avoided;
  $('hint').classList.toggle('urgent',distance<45);
  $('fire').disabled=state.matrix<=0||state.pulseCooldown>0||state.phase!=='running';
  $('camera').textContent=state.view==='top'?'◉ ВИД СЗАДИ':'◉ ВИД СВЕРХУ';
}
function tick(now){const dt=last?Math.max(0,(now-last)/1000):1/60;last=now;
  if(state.phase==='running'){
    const events=Core.step(state,dt);
    for(const ev of events){
      if(ev==='portal'||ev==='climb'||ev==='agent-neutralized')haptic('heavy');
      if(ev==='gameover'){saveBest();showOverlay('over');lastPhase='gameover';haptic('heavy');}
    }
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