/* SYMBIONT CITY · UI for three skill workshops.
 * Only completed activities (not child answers or identifiable data) are saved.
 */
(function(){
'use strict';
const G=window.SymbiontWorkshops;
if(!G)return;
const $=id=>document.getElementById(id);
const STORE='yugatneo.symbiont-city.workshops.v1';
const TYPES={
 memory:{name:'Лабиринт памяти',icon:'◈',place:'Сад памяти',
  desc:'Переворачивай карточки, запоминай символы и собирай пары.'},
 attention:{name:'Обсерватория внимания',icon:'✦',place:'Обсерватория',
  desc:'Находи нужный знак среди других. Усложнение подстраивается под возраст.'},
 bridge:{name:'Мост сотрудничества',icon:'▰',place:'Мост города',
  desc:'Выстрой безопасную последовательность действий и дострой мост.'}
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let progress;
try{progress=G.restore(JSON.parse(localStorage.getItem(STORE)||'null'));}
catch(_){progress=G.initial();}
let run=null,opener=null,lastMessage='',saveSerial=0;
function age(){
 const n=Number($('age').value);
 return Number.isInteger(n)&&n>=0&&n<=110?n:8;
}
function challenge(){return $('challenge').value;}
function seed(){return (Date.now()^(++saveSerial*2654435761))>>>0;}
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(progress));}
 catch(_){/* playing without storage is still possible */}
}
function paintCity(){
 const record=G.summary(progress);
 $('workshopsProgress').textContent=record.done+' / '+record.total+' · '+record.stars+' ★';
 $('workshopVillage').innerHTML=G.TYPES.map(type=>{
  const completed=progress.completed.includes(type),info=TYPES[type];
  return '<div class="workshop-place'+(completed?' complete':'')+'">'+
    '<span class="workshop-place-icon" aria-hidden="true">'+info.icon+'</span><div>'+
    '<strong>'+esc(info.place)+'</strong><small>'+(completed?'Восстановлено · '+progress.best[type]+' ★':
    'Пока ожидает исследователей')+'</small></div></div>';
 }).join('');
 $('workshopCards').innerHTML=G.TYPES.map(type=>{
  const info=TYPES[type],stars=progress.best[type]||0;
  return '<button type="button" class="workshop-card" data-workshop="'+type+
   '" aria-label="'+esc(info.name)+(stars?', уже пройдено; можно повторить':'')+'">'+
   '<span class="workshop-emoji" aria-hidden="true">'+info.icon+'</span>'+
   '<strong>'+esc(info.name)+'</strong><p>'+esc(info.desc)+'</p>'+
   '<span class="workshop-state">'+(stars?'★'.repeat(stars)+' · Повторить':'▶ Начать игру')+'</span></button>';
 }).join('');
}
function open(type,element){
 if(!G.TYPES.includes(type))return;
 opener=element||$('workshopCards');
 run=G.newGame(type,age(),challenge(),seed());
 lastMessage='';
 $('workshopOverlay').hidden=false;
 $('workshopTitle').textContent=TYPES[type].name;
 $('workshopEyebrow').textContent=run.status==='caregiver'?'0–2 ГОДА · СОВМЕСТНО СО ВЗРОСЛЫМ':
  run.profile.cooperative?'ИГРАЕМ СО ВЗРОСЛЫМ':'ИГРАЕМ И ИССЛЕДУЕМ';
 render();$('workshopClose').focus();
}
function close(){
 $('workshopOverlay').hidden=true;run=null;lastMessage='';
 if(opener?.focus)opener.focus();
 paintCity();
}
function complete(){
 if(run?.status!=='complete'||run.recorded)return;
 G.reward(progress,run);run.recorded=true;save();paintCity();
 try{window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');}catch(_){}
}
function status(){
 if(!run)return;
 $('workshopSteps').textContent=run.status==='caregiver'?'Игра без экрана':
  'Этап '+run.found+' / '+run.total;
 $('workshopErrors').textContent=run.status==='caregiver'?'Без оценок':
  run.mistakes===0?'Можно пробовать без спешки':'Дополнительных попыток: '+run.mistakes;
 $('workshopRestart').hidden=run.status==='caregiver';
 $('workshopDone').textContent=run.status==='complete'||run.status==='caregiver'?
  'В город →':'Закрыть игру';
}
function wrapper(){
 return '<div class="workshop-progressbar" role="progressbar" aria-label="Прогресс текущей мини-игры"'+
  ' aria-valuemin="0" aria-valuemax="'+run.total+'" aria-valuenow="'+run.found+'">'+
  '<span style="width:'+(run.total?Math.round(run.found/run.total*100):0)+'%"></span></div>';
}
function caregiver(){
 const suggestions={
  memory:'Положите две игрушки на стол, накройте тканью одну и вместе вспомните, какая исчезла. Следуйте интересу малыша.',
  attention:'Назовите знакомый предмет вокруг: «Где мяч?» Дайте малышу время посмотреть и показать без спешки.',
  bridge:'Постройте вместе дорожку из больших безопасных кубиков. Взрослый показывает, как ставить их устойчиво.'
 };
 return '<div class="workshop-complete"><h3>Игра с взрослым, а не с экраном</h3>'+
  '<p>'+esc(suggestions[run.type])+'</p>'+
  '<p class="workshop-help">Для детей младше трёх лет очки и самостоятельные экранные задания не предусмотрены.</p></div>';
}
function memory(){
 const visible=new Set(run.selected);
 const cards=run.board.map((card,i)=>{
  const matched=run.matched.includes(card.pair),face=matched||visible.has(i);
  return '<button type="button" class="workshop-tile '+(matched?'is-matched':face?'':'is-hidden')+
    '" data-memory="'+i+'" aria-label="'+(face?'Символ '+esc(card.symbol):'Закрытая карточка '+(i+1))+
    '" '+(matched||run.waiting?'disabled':'')+'>'+
    (face?card.symbol:'?')+'</button>';
 }).join('');
 return '<p class="workshop-intro">Запоминай места символов и находи одинаковые пары.</p>'+wrapper()+
  '<div class="workshop-cards-grid">'+cards+'</div>'+
  (run.waiting?'<button class="workshop-action" type="button" id="workshopHide">Закрыть две карточки</button>':'')+
  '<div class="workshop-message" role="status">'+esc(lastMessage||
   'Открой две карточки. Если не совпали — посмотри и закрой их самостоятельно.')+'</div>';
}
function attention(){
 const round=run.rounds[run.index];
 if(!round)return '';
 return '<p class="workshop-intro">Среди похожих символов найди указанный знак.</p>'+wrapper()+
  '<div class="workshop-target">Найди <strong>'+esc(round.target)+'</strong></div>'+
  '<div class="workshop-attention-grid">'+round.items.map((x,i)=>
   '<button class="workshop-tile" type="button" data-attention="'+i+
   '" aria-label="Символ '+esc(x)+'">'+esc(x)+'</button>').join('')+'</div>'+
  '<div class="workshop-message" role="status">'+esc(lastMessage||
   'Сравни знак вверху с каждым знаком на поле. Можно искать столько, сколько нужно.')+'</div>';
}
function bridge(){
 const progress=run.index;
 const parts=run.board.map(x=>
  '<button type="button" data-build="'+x.id+'" '+(G.BUILD.findIndex(y=>y.id===x.id)<progress?'disabled':'')+
  '>'+esc(x.symbol)+' '+esc(x.name)+'</button>').join('');
 return '<p class="workshop-intro">Построй переправу. Что нужно сделать сначала, а что — потом?</p>'+wrapper()+
  '<div class="workshop-bridge" role="img" aria-label="Мост на этапе '+progress+' из четырёх">'+
  '<div class="workshop-bank"></div><div class="workshop-bank"></div>'+
  (progress>=2?'<div class="workshop-support"></div><div class="workshop-support second"></div>':'')+
  (progress>=3?'<div class="workshop-deck"></div>':'')+
  (progress>=4?'<div class="workshop-check">✓</div>':'')+'</div>'+
  '<div class="workshop-list">'+parts+'</div>'+
  '<div class="workshop-message" role="status">'+esc(lastMessage||'Выбирай следующий шаг строительства.')+'</div>';
}
function completed(){
 const n=G.rating(run);
 return '<div class="workshop-complete"><h3>Мастерская восстановлена!</h3>'+
  '<div class="workshop-stars" aria-label="'+n+' игровые звезды">'+'★'.repeat(n)+'☆'.repeat(3-n)+'</div>'+
  '<p>Успех — это пройденное задание. Звёзды отражают лишь количество дополнительных попыток в этой мини-игре, а не интеллект или личность.</p>'+
  '<p class="workshop-help">Обсудите, какая стратегия помогла и где её можно попробовать вне игры. Можно переиграть и улучшить результат.</p></div>';
}
function render(){
 if(!run)return;
 status();
 const body=$('workshopBody');
 body.innerHTML=run.status==='caregiver'?caregiver():run.status==='complete'?completed():
  (run.type==='memory'?memory():run.type==='attention'?attention():bridge());
 body.scrollTop=0;
 if(run.status==='complete')complete();
}
function pick(e){
 if(!run||run.status!=='playing')return;
 let r=null,button=e.target.closest('button');if(!button)return;
 if(button.id==='workshopHide'){
  if(G.closePair(run)){lastMessage='Карточки закрыты. Продолжай искать пары.';render();}
  return;
 }
 if(button.hasAttribute('data-memory'))r=G.memoryPick(run,Number(button.dataset.memory));
 else if(button.hasAttribute('data-attention'))r=G.attentionPick(run,Number(button.dataset.attention));
 else if(button.hasAttribute('data-build'))r=G.bridgePick(run,button.dataset.build);
 if(!r)return;
 lastMessage=r.kind==='mismatch'||r.kind==='try'?r.message:
  r.kind==='built'?r.why:r.kind==='matched'?'Пара найдена!':
  r.kind==='found'?'Знак найден! Продолжай.':'Запомни этот символ и найди его пару.';
 render();
}
$('workshopCards').addEventListener('click',e=>{
 const b=e.target.closest('[data-workshop]');if(b)open(b.dataset.workshop,b);
});
$('workshopBody').addEventListener('click',pick);
$('workshopClose').addEventListener('click',close);
$('workshopDone').addEventListener('click',close);
$('workshopRestart').addEventListener('click',()=>{
 if(!run)return;
 const type=run.type;run=G.newGame(type,age(),challenge(),seed());lastMessage='';render();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('workshopOverlay').hidden){
  e.preventDefault();e.stopImmediatePropagation();close();
 }
},true);
$('age').addEventListener('change',paintCity);
$('challenge').addEventListener('change',paintCity);
document.addEventListener('symbiont-city:cleared',()=>{
 progress=G.initial();try{localStorage.removeItem(STORE);}catch(_){}
 if(run)close();paintCity();
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail)e.detail.workshops={...G.summary(progress),best:{...progress.best},
  completed:progress.completed.slice()};
});
window.SymbiontWorkshopsUI={open,close,refresh:paintCity};
paintCity();
})();
