/* SYMBIONT CITY — in-game decisions laboratory UI.
 * Separate local progress; all texts are original, no identity, telemetry or chats.
 */
(function(){
'use strict';
const Lab=window.SymbiontCityLab;
if(!Lab)throw Error('Decision laboratory module not loaded');
const $=id=>document.getElementById(id);
const KEY='yugatneo.symbiont-city.lab.v1';
const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state;
try{state=Lab.restore(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){state=Lab.initial();}
let active=null,step='intro',investigated=false,focusReturn=null,feedback=null;
const age=()=>{const a=Number($('age').value);return Number.isInteger(a)&&a>=0&&a<=110?a:8;};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){$('labStatus').textContent='Не удалось сохранить результаты на этом устройстве.';}}
function titleFor(k){return {safety:'Безопасность',trust:'Доверие',energy:'Ресурсы',time:'Запас времени'}[k];}
function drawDashboard(){
 const p=Lab.progress(state);
 $('labDone').textContent=p.done+' / '+p.total+' ситуаций';
 $('labMeter').setAttribute('aria-valuenow',String(p.done*20));
 $('labFill').style.width=(p.done*20)+'%';
 $('labStats').innerHTML=Lab.METRICS.map(k=>'<div class="city-stat"><div><strong>'+
  safe(titleFor(k))+'</strong><span>'+p.metrics[k]+'/100</span></div>'+
  '<div class="track"><i style="width:'+p.metrics[k]+'%"></i></div></div>').join('');
 $('labCards').innerHTML=Lab.scenarios.map(sc=>{
  const done=Number.isInteger(state.choices[sc.id]);
  return '<button type="button" class="lab-card '+(done?'done':'')+'" data-lab="'+safe(sc.id)+'">'+
   '<span class="lab-emoji">'+safe(sc.icon)+'</span><span><strong>'+safe(sc.title)+'</strong>'+
   '<small>'+safe(sc.skill)+' · '+safe(sc.area)+'</small></span>'+
   '<span class="lab-pill">'+(done?'✓ ИЗУЧЕНО':'ИГРАТЬ')+'</span></button>';
 }).join('');
 $('labStatus').textContent=p.done===5?'Пять ситуаций исследованы. Изменяй решения и сравнивай последствия.':
  'Выбирай сценарий: это модель возможных последствий, а не оценка личности.';
}
function details(){
 if(!active)return;
 const current=Lab.view(active,age());
 if(!current)return;
 const overlay=$('labOverlay');
 $('labTitle').textContent=current.title;
 $('labSubtitle').textContent=current.area+' · '+current.skill;
 const box=$('labBody');
 const prevChoice=state.choices[current.id];
 if(current.caregiver){
  box.innerHTML='<div class="lab-story"><p>Этот режим предназначен только для взрослого: для возраста 0–2 года не предлагается самостоятельная экранная игра.</p>'+
   '<p>Вне экрана можно вместе посмотреть на игрушки, назвать чувства персонажей и обсудить, как кому-то помочь.</p></div>';
  $('labStep').textContent='СОВМЕСТНАЯ ИГРА ВНЕ ЭКРАНА';
  $('labAction').hidden=true;
  return;
 }
 $('labAction').hidden=false;
 if(step==='intro'){
  $('labStep').textContent='ШАГ 1 · СИТУАЦИЯ';
  box.innerHTML='<p class="lab-story">'+safe(current.intro)+'</p>'+
   '<p class="help">'+(current.cooperative?'Обсуди ситуацию со взрослым. ':
    'Подумай, какие сведения помогут выбрать действие. ')+
   'Каждый вариант имеет преимущества, ограничения и возможные последствия.</p>'+
   (prevChoice!==undefined?'<p class="lab-note">Эту ситуацию ты уже исследовал. Можно попробовать другой вариант: прежние изменения будут заменены.</p>':'');
  $('labAction').textContent='ИССЛЕДОВАТЬ СИТУАЦИЮ →';
 }else if(step==='inspect'){
  $('labStep').textContent='ШАГ 2 · ПРОВЕРКА СВЕДЕНИЙ';
  box.innerHTML='<p class="lab-story">'+safe(current.intro)+'</p>'+
   '<button type="button" class="small-button" id="labInspect" aria-expanded="'+(investigated?'true':'false')+'">'+
    (investigated?'✓ СВЕДЕНИЯ ОТКРЫТЫ':'🔎 ПРОВЕРИТЬ ДОПОЛНИТЕЛЬНЫЕ СВЕДЕНИЯ')+'</button>'+
   (investigated?'<div class="lab-evidence">'+current.evidence.map(t=>'<p>'+safe(t)+'</p>').join('')+'</div>':'')+
   '<p class="help">Проверка сведений необязательна, но помогает понять ограничения каждого варианта.</p>';
  $('labAction').textContent='ВЫБРАТЬ ДЕЙСТВИЕ →';
 }else if(step==='choose'){
  $('labStep').textContent='ШАГ 3 · ВЫБОР РЕШЕНИЯ';
  box.innerHTML='<p class="lab-story">'+safe(current.intro)+'</p>'+
   '<div class="lab-choice-grid">'+current.options.map(o=>
    '<button type="button" class="lab-choice '+(prevChoice===o.index?'chosen':'')+
    '" data-lab-choice="'+o.index+'"><span>'+safe(o.text)+'</span>'+
    (prevChoice===o.index?'<small>Предыдущее решение</small>':'')+'</button>').join('')+'</div>'+
   '<p class="help">Нажми на решение и посмотри, что изменится. Универсально правильного ответа нет: учись замечать компромиссы.</p>';
  $('labAction').hidden=true;
 }else if(step==='outcome'&&feedback){
  $('labStep').textContent='ШАГ 4 · ПОСЛЕДСТВИЯ И РЕФЛЕКСИЯ';
  const diff=Lab.METRICS.map(k=>{
   const value=feedback.delta[k];
   return '<div class="lab-delta"><span>'+safe(titleFor(k))+'</span><strong class="'+
    (value>0?'positive':value<0?'negative':'neutral')+'">'+(value>0?'+':'')+value+'</strong></div>';
  }).join('');
  box.innerHTML='<div class="lab-story"><strong>Что произошло?</strong><p>'+safe(feedback.reason)+'</p></div>'+
   '<div class="lab-deltas">'+diff+'</div>'+
   '<p class="lab-note">'+safe(feedback.follow)+'</p>'+
   '<div class="reflection"><strong>Вопрос для размышления</strong><p>'+safe(current.reflect)+'</p>'+
    '<p class="help">Можно обсудить ответ вслух. Мы не записываем твои размышления.</p></div>'+
   (feedback.revised?'<p class="help">Предыдущее решение заменено. Изменения не суммируются.</p>':'');
  $('labAction').hidden=false;$('labAction').textContent='ВЕРНУТЬСЯ В ГОРОД';
 }
 overlay.hidden=false;
}
function open(id,button){
 if(!Lab.scenarios.some(sc=>sc.id===id))return;
 focusReturn=button||document.activeElement;
 active=id;step='intro';feedback=null;investigated=false;
 details();$('labClose').focus();
}
function close(){
 $('labOverlay').hidden=true;active=null;feedback=null;
 if(focusReturn&&typeof focusReturn.focus==='function'&&focusReturn.isConnected)focusReturn.focus();
 else $('labCards').querySelector('button')?.focus();
}
function next(){
 if(step==='intro'){step='inspect';details();}
 else if(step==='inspect'){step='choose';details();}
 else if(step==='outcome')close();
}
$('labCards').addEventListener('click',e=>{
 const b=e.target.closest('[data-lab]');if(b)open(b.dataset.lab,b);
});
$('labBody').addEventListener('click',e=>{
 const inspect=e.target.closest('#labInspect');
 if(inspect){investigated=!investigated;details();return;}
 const b=e.target.closest('[data-lab-choice]');
 if(!b||!active)return;
 const index=Number(b.dataset.labChoice);
 const v=Lab.view(active,age());
 if(!Number.isInteger(index)||!v||!v.options.some(o=>o.index===index))return;
 feedback=Lab.choice(state,active,index);
 if(!feedback)return;
 persist();drawDashboard();step='outcome';details();
 try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');}catch(_){}
});
$('labAction').addEventListener('click',next);
$('labClose').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('labOverlay').hidden){e.preventDefault();close();}});
document.addEventListener('symbiont-city:cleared',()=>{
 state=Lab.initial();try{localStorage.removeItem(KEY);}catch(_){}
 close();drawDashboard();
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail&&typeof e.detail==='object')e.detail.decisionLab={
  version:state.version,choices:{...state.choices},progress:Lab.progress(state)};
});
drawDashboard();
})();
