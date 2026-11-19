/* SYMBIONT City v7 — two opt-in game modules.
 * Civic education is pluralistic and nonviolent; family health is adult-only.
 * No user beliefs, health histories, free text or children's responses are stored.
 */
(function(){
'use strict';
const G=window.SymbiontCommonGood,H=window.SymbiontAdultCare;
if(!G||!H)return;
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CIVIC_KEY='yugatneo.symbiont-city.common-good.v1';
const ADULT_KEY='yugatneo.symbiont-city.adult-care.v1';
let record=G.initial(),adult=H.initial();
try{record=G.restore(JSON.parse(localStorage.getItem(CIVIC_KEY)||'null'));}
catch(_){}
try{adult=H.restore(JSON.parse(localStorage.getItem(ADULT_KEY)||'null'));}
catch(_){}
let active=null,opener=null;
let lastAge=null;
function age(){
 const a=Number($('age').value);
 return Number.isInteger(a)&&a>=0&&a<=110?a:8;
}
function persist(key,data){
 try{localStorage.setItem(key,JSON.stringify(data));}catch(_){
  $('socialRecord').textContent='Сохранение в браузере недоступно';
 }
}
function refresh(){
 $('socialRecord').textContent=record.played?
  record.played+' попыток · лучший средний показатель '+record.best+'/100':'Новый город · 3 ситуации';
 const adultMode=age()>=18;
 $('adultLocked').hidden=adultMode;
 $('adultCards').hidden=!adultMode;
 $('adultCount').textContent=adultMode?Object.keys(adult.completed).length+' / '+H.ids.length+' историй':'Только для 18+';
 $('adultCards').innerHTML=adultMode?H.EPISODES.map(e=>
  '<button type="button" data-adult-id="'+e.id+'" class="social-card adult-card">'+
   '<span class="social-icon">'+safe(e.icon)+'</span><strong>'+safe(e.title)+'</strong>'+
   '<small>'+safe(e.category)+'</small><span class="social-cta">'+
   (adult.completed[e.id]?'✓ Разобрано · Повторить':'▶ Исследовать ситуацию')+'</span></button>').join(''):'';
}
function cards(){
 $('socialScenes').innerHTML=G.SCENES.map(s=>
  '<button type="button" class="social-card" data-social-scene="'+s.id+'">'+
  '<span class="social-icon">⚙️</span><strong>'+safe(s.title)+'</strong>'+
  '<small>'+safe(s.description)+'</small><span class="social-cta">▶ Помочь службам</span></button>').join('');
 $('socialCivic').innerHTML='<h3>Совет города · Мирные способы перемен</h3>'+
  '<p>Сравни способы обратной связи, проверки информации, защиты прав и взаимопомощи. Здесь нет политически «правильного» ответа.</p>'+
  '<div class="social-civic-grid">'+G.CIVIC.map(s=>
   '<button type="button" class="social-card social-civic" data-civic-id="'+s.id+'">'+
   '<span class="social-icon">'+safe(s.icon)+'</span><strong>'+safe(s.title)+'</strong>'+
   '<span class="social-cta">▶ Сравнить подходы</span></button>').join('')+'</div>';
}
function open(type,id,trigger){
 if(type==='adult'&&age()<18)return;
 const state=type==='network'?G.make(id,age()):type==='civic'?G.civicView(id,age()):H.view(id,age());
 if(!state||state.locked)return;
 active={type,id,state,selected:null};
 opener=trigger||null;
 $('socialOverlay').hidden=false;render();
 $('socialClose').focus();
}
function close(){
 $('socialOverlay').hidden=true;active=null;
 if(opener?.focus)opener.focus();
 refresh();
}
function status(type,title,text){
 $('socialKicker').textContent=type;
 $('socialTitle').textContent=title;
 $('socialText').textContent=text;
}
function network(){
 const game=active.state,template=G.scene(active.id);
 status('ИГРА · ВЗАИМОСВЯЗАННАЯ ИНФРАСТРУКТУРА',template.title,template.description);
 $('socialRestart').hidden=false;
 $('socialFinish').textContent=game.phase==='complete'||game.phase==='caregiver'?'Вернуться в город':'Завершить восстановление';
 if(game.phase==='caregiver'){
  $('socialBody').innerHTML='<div class="social-guidance"><strong>Для взрослого с малышом:</strong> Постройте город из крупных безопасных кубиков. Покажите, как дорога помогает добраться до больницы, а вода нужна семье. Обсуждайте это словами, без экрана и баллов.</div>';
  return;
 }
 const m=G.metrics(game),isDone=game.phase==='complete';
 const explanation='<p class="social-guidance">Это модель, а не объективная оценка государства или общества. Состояние соседних служб влияет на итоговый показатель каждой точки.</p>';
 $('socialBody').innerHTML=
  '<div class="social-statline"><span>Ресурсных действий: <b>'+game.funds+'</b></span>'+
  '<span>Средний показатель: <b>'+m.average+'/100</b></span>'+
  '<span>Самый уязвимый район: <b>'+m.minimum+'/100</b></span></div>'+
  '<div class="social-node-grid">'+G.INFRA.map(n=>{
   const health=m.effective[n.id],before=m.values[n.id];
   return '<div class="social-node"><div class="social-node-title">'+safe(n.icon)+' '+safe(n.name)+'</div>'+
    '<div class="social-progress" role="progressbar" aria-label="'+safe(n.name)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+health+
    '"><i style="width:'+health+'%"></i></div>'+
    '<div class="social-node-bottom"><small>Доступность '+health+'/100</small>'+
    (isDone?'':('<button type="button" data-repair-id="'+n.id+'" '+(game.funds<=0||before>=100?'disabled':'')+
     '>+ Поддержать</button>'))+'</div>'+
    '<small>Связано: '+n.links.map(id=>safe(G.INFRA.find(x=>x.id===id).name)).join(', ')+'</small></div>';
  }).join('')+'</div>'+explanation+
  '<div class="social-feedback">'+safe(m.commentary)+
  (isDone?'<p>Попробуй другой порядок помощи. Обсуди, почему один слабый район влияет на другие.</p>':
  '<p>Выбирай службы, которые стоит поддержать. Ресурсы ограничены, и единственного верного плана нет.</p>')+'</div>';
}
function civic(){
 const v=active.state;status('ГРАЖДАНСКАЯ ГРАМОТНОСТЬ · БЕЗ АГИТАЦИИ',v.icon+' '+v.title,v.prompt);
 $('socialRestart').hidden=true;$('socialFinish').textContent='Вернуться в город';
 if(v.caregiver){
  $('socialBody').innerHTML='<div class="social-guidance">Вместе со взрослым разыграйте с помощью игрушек, как соседи просят помощи и делятся ресурсами. Для возраста 0–2 лет нет экранного задания.</div>';
  return;
 }
 const f=active.selected===null?'':G.consider(active.id,age(),active.selected);
 $('socialBody').innerHTML='<div class="social-options">'+v.approaches.map((x,i)=>
  '<button type="button" data-civic-choice="'+i+'" class="social-option" aria-pressed="'+(i===active.selected)+'">'+
  '<span class="social-option-index">'+(i+1)+'</span>'+safe(x.text)+'</button>').join('')+'</div>'+
  (f?'<div class="social-feedback"><strong>Возможная польза:</strong> '+safe(f.plus)+
   '<p><strong>Ограничения:</strong> '+safe(f.limit)+'</p>'+
   '<p><strong>Вопрос:</strong> '+safe(f.question)+'</p></div>':
   '<p class="social-guidance">Выбери любой подход для обсуждения. Все три являются вариантами мирного общественного участия, а не предписанием.</p>')+
  '<p class="social-footnote">'+safe(v.note)+' Права других людей и безопасность важны при любом общественном изменении.</p>';
}
function adultGame(){
 const v=active.state;status('18+ · ОТВЕТСТВЕННОЕ РОДИТЕЛЬСТВО',v.icon+' '+v.title,v.prompt);
 $('socialRestart').hidden=true;$('socialFinish').textContent='Вернуться в город';
 const feedback=active.selected===null?null:H.choose(active.id,age(),active.selected);
 $('socialBody').innerHTML=
  '<p class="social-guidance">Выбирай подход, рассматривай последствия и возвращайся к нему в своём темпе. Личные привычки и история здоровья не запрашиваются.</p>'+
  '<div class="social-options">'+v.choices.map((x,i)=>
   '<button type="button" data-adult-choice="'+i+'" class="social-option" aria-pressed="'+(i===active.selected)+'">'+
   '<span class="social-option-index">'+(i+1)+'</span>'+safe(x.text)+'</button>').join('')+'</div>'+
  (feedback?'<div class="social-feedback"><strong>Разбор:</strong> '+safe(feedback.feedback)+
  '<p><strong>Вопрос для размышления:</strong> '+safe(feedback.question)+'</p>'+
  '<p>'+safe(feedback.caveat)+'</p><a href="'+safe(feedback.source)+'" target="_blank" rel="noopener noreferrer">Научный или клинический первоисточник</a></div>':'');
}
function render(){
 if(!active)return;
 if(active.type==='network')network();
 else if(active.type==='civic')civic();
 else adultGame();
}
$('socialScenes').addEventListener('click',e=>{
 const b=e.target.closest('[data-social-scene]');if(b)open('network',b.dataset.socialScene,b);
});
$('socialCivic').addEventListener('click',e=>{
 const b=e.target.closest('[data-civic-id]');if(b)open('civic',b.dataset.civicId,b);
});
$('adultCards').addEventListener('click',e=>{
 const b=e.target.closest('[data-adult-id]');if(b)open('adult',b.dataset.adultId,b);
});
$('socialBody').addEventListener('click',e=>{
 if(!active)return;
 const repair=e.target.closest('[data-repair-id]');
 if(repair&&active.type==='network'){
  G.repair(active.state,repair.dataset.repairId);render();return;
 }
 const civic=e.target.closest('[data-civic-choice]');
 if(civic&&active.type==='civic'){
  active.selected=Number(civic.dataset.civicChoice);render();return;
 }
 const adultChoice=e.target.closest('[data-adult-choice]');
 if(adultChoice&&active.type==='adult'&&age()>=18){
  active.selected=Number(adultChoice.dataset.adultChoice);
  if(H.record(adult,active.id,age(),active.selected))persist(ADULT_KEY,adult);
  render();refresh();
 }
});
$('socialFinish').addEventListener('click',()=>{
 if(!active)return;
 if(active.type==='network'&&active.state.phase==='playing'){
  G.finish(active.state);
  if(G.record(record,active.state))persist(CIVIC_KEY,record);
  render();refresh();return;
 }
 close();
});
$('socialRestart').addEventListener('click',()=>{
 if(!active)return;
 if(active.type==='network'){
  active.state=G.make(active.id,age());render();
 }else{active.selected=null;render();}
});
$('socialClose').addEventListener('click',close);
$('age').addEventListener('change',()=>{
 const next=age();
 // Native number fields can emit an extra change on blur during pointerdown.
 // Do not rebuild the card that is about to receive pointerup/click.
 if(next===lastAge)return;
 lastAge=next;
 refresh();
 if(active&&active.type==='adult'&&next<18)close();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('socialOverlay').hidden){
  e.preventDefault();e.stopImmediatePropagation();close();
 }
},true);
document.addEventListener('symbiont-city:cleared',()=>{
 record=G.initial();adult=H.initial();
 try{localStorage.removeItem(CIVIC_KEY);localStorage.removeItem(ADULT_KEY);}catch(_){}
 if(active)close();refresh();
});
document.addEventListener('symbiont-city:export',e=>{
 if(!e.detail)return;
 e.detail.commonGood={best:record.best,played:record.played};
 e.detail.adultCare={completed:H.ids.filter(id=>adult.completed[id]),total:H.ids.length};
});
window.SymbiontSocialUI={open,close,refresh};
lastAge=age();cards();refresh();
})();
