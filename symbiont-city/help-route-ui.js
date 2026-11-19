/* SYMBIONT CITY · Route of Help UI — standalone optional mini-adventure.
 * Only local aggregate achievements are stored; no personal data, notes or telemetry.
 */
(function(){
'use strict';
const G=window.SymbiontHelpRoute;
if(!G)return;
const $=id=>document.getElementById(id);
const KEY='yugatneo.symbiont-city.help-route.v1';
let record;
try{record=G.restore(JSON.parse(localStorage.getItem(KEY)||'null'));}
catch(_){record=G.initial();}
let run=null,seedOffset=0,message='',opener=null,lastHint=null;
const buttons={up:'↑',down:'↓',left:'←',right:'→'};
function age(){const n=Number($('age').value);return Number.isInteger(n)&&n>=0&&n<=110?n:8;}
function challenge(){return $('challenge').value;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(record));}catch(_){}}
function refresh(){
 $('routeProgress').textContent=record.completed?
  'Пройдено '+record.completed+' раз · лучший результат '+record.best+' ★':
  'Ещё не проходили · Выберите уровень и начните';
 $('routeRecord').textContent=record.best?'Рекорд: '+record.best+' ★':'Рекорд: —';
}
function start(){
 run=G.create(age(),challenge(),(Date.now()+(++seedOffset*2654435761))>>>0);
 message='Выбери направление и составь маршрут. Спешить не нужно.';
 lastHint=null;draw();
}
function open(){
 opener=document.activeElement;
 $('routeOverlay').hidden=false;start();
 $('routeClose').focus();
}
function close(){
 $('routeOverlay').hidden=true;
 run=null;
 if(opener?.focus)opener.focus();
 refresh();
}
function direction(dir){
 if(!run||run.status!=='playing')return;
 const result=G.move(run,dir);
 if(!result)return;
 message=result.message||'';
 lastHint=null;
 if(result.kind==='complete'&&G.reward(record,run)){
  save();refresh();
  try{window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');}catch(_){}
 }
 draw();
}
function hint(){
 if(!run||run.status!=='playing')return;
 const h=G.hint(run);
 if(!h)return;
 lastHint=h.direction;
 message=h.message;
 draw();
}
function makeBoard(){
 const n=run.size;
 const cells=run.walls.map((mask,i)=>{
  const x=i%n,y=Math.floor(i/n),
   hero=run.player.x===x&&run.player.y===y,
   destination=run.destination.x===x&&run.destination.y===y,
   supply=run.supplies.find(p=>p.x===x&&p.y===y&&!run.collected.includes(p.id));
  const visited=run.seen[i];
  let contents='·',title='Коридор';
  if(hero){contents='🧍';title='Игрок';}
  else if(supply){contents='📦';title='Необходимые припасы';}
  else if(destination){contents='🏠';title='Пункт помощи';}
  else if(visited){contents='•';title='Изученный коридор';}
  const className=['route-cell',visited?'visited':'',destination?'is-target':'',hero?'is-hero':''].join(' ');
  const thick=Math.max(1.5,Math.min(3.3,32/n));
  const edges=[
   mask&1?'--top:'+thick+'px':'',
   mask&2?'--right:'+thick+'px':'',
   mask&4?'--bottom:'+thick+'px':'',
   mask&8?'--left:'+thick+'px':''
  ].filter(Boolean).join(';');
  return '<div class="'+className+'" style="'+edges+'" role="img" aria-label="'+title+
   ', строка '+(y+1)+', столбец '+(x+1)+'"><span aria-hidden="true">'+contents+'</span></div>';
 }).join('');
 return '<div class="route-board" style="--grid:'+n+'" role="group" aria-label="Лабиринт '+n+' на '+n+
  ' клеток: собери припасы и доберись до пункта помощи">'+cells+'</div>';
}
function draw(){
 if(!run)return;
 $('routeSupplies').textContent=run.size?'Припасы '+run.collected.length+'/'+run.supplies.length:'Без баллов';
 $('routeSteps').textContent=run.size?'Шаги: '+run.moves:'Игра со взрослым';
 $('routeHint').hidden=run.status!=='playing';
 $('routeAgain').hidden=run.status==='caregiver';
 $('routeRecord').textContent=record.best?'Рекорд: '+record.best+' ★':'Рекорд: —';
 if(run.status==='caregiver'){
  $('routeBody').innerHTML='<div class="route-parent"><h3>Маршрут помощи без экрана</h3>'+
   '<p>Для малышей от 0 до 2 лет предложи живую игру с крупными безопасными игрушками:</p>'+
   '<ol><li>Положи мягкую игрушку на небольшом расстоянии.</li>'+
   '<li>Покажи, как принести её другому персонажу, произнося простые слова.</li>'+
   '<li>Следуй интересу ребёнка, позволяй ему участвовать жестами или взглядом.</li></ol>'+
   '<p>Игра проходит со взрослым. В приложении нет заданий или оценок для малыша.</p></div>';
  return;
 }
 if(run.status==='complete'){
  const stars=G.stars(run);
  $('routeBody').innerHTML='<div class="route-finale"><h3>🏡 Помощь доставлена!</h3>'+
    '<div class="route-stars" aria-label="'+stars+' игровых звезды">'+'★'.repeat(stars)+'☆'.repeat(3-stars)+'</div>'+
    '<p>Припасы собраны, маршрут найден за '+run.moves+' шагов. '+
    'Можно повторить попытку или выбрать другую сложность.</p>'+
    '<p><strong>Вопрос для обсуждения:</strong> какие повороты запомнились? Как ты выбирал путь, когда встречал стену?</p>'+
    '<p>Звёзды — только игровой результат; они не оценивают интеллект или характер.</p></div>';
  return;
 }
 $('routeBody').innerHTML='<p class="route-intro">Собери припасы 📦 и доставь их к дому 🏠. '+
  'Если пришёл раньше, вернись за недостающими предметами. Можно играть вдвоём: один планирует, другой ведёт героя.</p>'+
  makeBoard()+
  '<div class="route-controls" aria-label="Управление движением">'+
   Object.keys(buttons).map(id=>'<button type="button" class="route-arrow" data-route-dir="'+id+
    '" aria-label="'+({up:'Вверх',down:'Вниз',left:'Влево',right:'Вправо'}[id])+'">'+buttons[id]+'</button>').join('')+
   '</div><div class="route-message" role="status" aria-live="polite">'+
   String(message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+
   (lastHint?' · '+buttons[lastHint]:'')+'</div>';
}
$('routeStart').addEventListener('click',open);
$('routeClose').addEventListener('click',close);
$('routeDone').addEventListener('click',close);
$('routeAgain').addEventListener('click',()=>{if(run)start();});
$('routeHint').addEventListener('click',hint);
$('routeBody').addEventListener('click',e=>{
 const b=e.target.closest('[data-route-dir]');if(b)direction(b.dataset.routeDir);
});
document.addEventListener('keydown',e=>{
 if($('routeOverlay').hidden)return;
 const dirs={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
  ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 if(e.key==='Escape'){
  e.preventDefault();e.stopImmediatePropagation();close();return;
 }
 if(e.repeat)return;
 if(dirs[e.code]){e.preventDefault();e.stopImmediatePropagation();direction(dirs[e.code]);}
},true);
document.addEventListener('symbiont-city:cleared',()=>{
 record=G.initial();try{localStorage.removeItem(KEY);}catch(_){}
 if(run)close();refresh();
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail)e.detail.helpRoute={best:record.best,completed:record.completed};
});
window.SymbiontHelpRouteUI={open,close,refresh};
refresh();
})();
