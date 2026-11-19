/* SYMBIONT CITY · Social Systems + Adult Health — client-only gameplay. */
(function(){
'use strict';
const S=window.SymbiontSocialOrganism,H=window.SymbiontAdultHealth;
if(!S||!H)return;
const $=id=>document.getElementById(id);
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOCIAL_KEY='yugatneo.symbiont-city.social-v1';
const HEALTH_KEY='yugatneo.symbiont-city.adult-health-v1';
const labels={wellbeing:'Благополучие',trust:'Доверие',participation:'Участие',resources:'Ресурсы'};
function read(key,fn){try{return fn(JSON.parse(localStorage.getItem(key)||'null'));}catch(_){return fn(null);}}
let social=read(SOCIAL_KEY,S.restore),health=read(HEALTH_KEY,H.restore);
let mode=null,id=null,stage='brief',choice=null,lastFocus=null;
const age=()=>Number($('age').value);
const adult=()=>H.isAdult(age());
function persist(key,data){try{localStorage.setItem(key,JSON.stringify(data));}catch(_){}}
function progress(){
 $('socialSection').hidden=Number.isInteger(age())&&age()<=2;
 $('socialCount').textContent=Object.keys(social.decisions).length+' / '+S.scenarios.length+' проектов';
 const m=S.metrics(social);
 $('socialMeters').innerHTML=S.axes.map(k=>
  '<div class="systems-meter"><div><strong>'+labels[k]+'</strong><span>'+m[k]+'/100</span></div>'+
  '<div class="systems-track" role="progressbar" aria-label="'+labels[k]+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+m[k]+'"><i style="width:'+m[k]+'%"></i></div></div>').join('');
 $('socialCards').innerHTML=S.scenarios.map(x=>'<button type="button" data-system-id="'+x.id+
  '" class="systems-card"><span class="systems-emoji">'+x.icon+'</span><strong>'+escape(x.title)+'</strong>'+
  '<small>'+(Number.isInteger(social.decisions[x.id])?'↻ Сравнить и пересмотреть':'▶ Исследовать')+'</small></button>').join('');
 $('adultHealthSection').hidden=!adult();
 if(adult()){
  $('adultHealthCount').textContent=Object.keys(health.completed).length+' / '+H.lessons.length+' тем';
  $('adultHealthCards').innerHTML=H.lessons.map(x=>
   '<button type="button" class="systems-card" data-health-id="'+x.id+'"><span class="systems-emoji">'+x.icon+
   '</span><strong>'+escape(x.title)+'</strong><small>'+(health.completed[x.id]?'✓ Разобрано':'▶ Исследовать')+'</small></button>').join('');
 }else{
  $('adultHealthCards').textContent='';
  $('adultHealthCount').textContent='Только 18+';
  if(mode==='health')close();
 }
}
function open(kind,selected,button){
 if(kind==='health'&&!adult())return;
 const obj=kind==='social'?S.view(selected,age()):H.lessons.find(l=>l.id===selected);
 if(!obj)return;
 mode=kind;id=selected;stage='brief';choice=null;lastFocus=button;
 $('systemsOverlay').hidden=false;
 $('systemsTitle').textContent=obj.icon+' '+obj.title;
 $('systemsSubtitle').textContent=kind==='social'?'Модель общества · исследование разных стратегий':
  'Образовательный тренажёр · только для взрослых';
 show();$('systemsClose').focus();
}
function close(){
 $('systemsOverlay').hidden=true;mode=null;id=null;choice=null;
 if(lastFocus?.focus)lastFocus.focus();
 progress();
}
function show(){
 if(!mode)return;
 const obj=mode==='social'?S.view(id,age()):H.lessons.find(l=>l.id===id);
 if(!obj){close();return;}
 const body=$('systemsBody'),back=$('systemsBack'),next=$('systemsNext');
 back.hidden=stage==='brief';next.hidden=stage==='choose';
 next.textContent=stage==='review'?'Вернуться в город':'Продолжить →';
 $('systemsStep').textContent=stage==='brief'?'1 / 3 · Ситуация':stage==='choose'?'2 / 3 · Выбор':'3 / 3 · Последствия';
 if(stage==='brief'){
  body.innerHTML='<p class="systems-story">'+escape(obj.description||obj.situation)+'</p>'+
   (mode==='social'?'<ul class="systems-facts">'+obj.facts.map(f=>'<li>'+escape(f)+'</li>').join('')+'</ul>':
    '<p class="systems-notice">Модуль предназначен совершеннолетним. Он не собирает сведения об употреблении веществ, состоянии здоровья или беременности.</p>')+
   (mode==='social'?'<p class="systems-notice">'+escape(obj.agePrompt)+' '+escape(S.interpretation)+'</p>':'');
 }else if(stage==='choose'){
  body.innerHTML='<h3>Какое решение ты выберешь?</h3><div class="systems-options">'+obj.options.map((o,i)=>
   '<button type="button" class="systems-choice" data-systems-choice="'+i+'"><b>'+(i+1)+'</b><span>'+escape(o.text||o)+'</span></button>').join('')+
   '</div><p class="fine">Подумай о последствиях. Нет таймера; можно вернуться и изменить решение.</p>';
 }else{
  if(mode==='social'){
   const effect=choice.chosen,met=choice.after;
   body.innerHTML='<p class="systems-story">'+escape(effect.why)+'</p>'+
    '<div class="systems-impacts">'+S.axes.map(k=>'<div><strong>'+labels[k]+'</strong><b>'+met[k]+'/100</b></div>').join('')+'</div>'+
    '<p class="systems-question">'+escape(obj.question)+'</p>'+
    '<p class="systems-notice">Все числа условные, а стратегия не является объективной политической оценкой. Сравни альтернативы, используя кнопку «Назад».</p>';
  }else{
   body.innerHTML='<p class="systems-story">'+(choice.helpful?'Подход соответствует приведённым рекомендациям.':'Рассмотрим дополнительную информацию.')+'</p>'+
    '<p>'+escape(choice.explanation)+'</p><p class="systems-question">'+escape(choice.reflection)+'</p>'+
    '<p><a href="'+escape(choice.source)+'" target="_blank" rel="noopener noreferrer">Научный или медицинский источник</a></p>'+
    '<p class="systems-notice">Общие образовательные сведения, не индивидуальный медицинский совет. При зависимости, беременности или вопросах о лечении обратитесь к врачу.</p>';
  }
 }
}
$('socialCards').addEventListener('click',e=>{
 const b=e.target.closest('[data-system-id]');if(b)open('social',b.dataset.systemId,b);
});
$('adultHealthCards').addEventListener('click',e=>{
 const b=e.target.closest('[data-health-id]');if(b)open('health',b.dataset.healthId,b);
});
$('systemsBody').addEventListener('click',e=>{
 const b=e.target.closest('[data-systems-choice]');if(!b||stage!=='choose')return;
 const index=Number(b.dataset.systemsChoice);
 const result=mode==='social'?S.choose(social,id,index):H.inspect(health,id,index,age());
 if(!result)return;
 choice=result;stage='review';
 if(mode==='social')persist(SOCIAL_KEY,social);
 else if(choice.helpful)persist(HEALTH_KEY,health);
 show();progress();
});
$('systemsNext').addEventListener('click',()=>{
 if(!mode)return;
 if(stage==='brief'){stage='choose';show();}
 else if(stage==='review')close();
});
$('systemsBack').addEventListener('click',()=>{
 if(!mode)return;
 stage=stage==='review'?'choose':'brief';show();
});
$('systemsClose').addEventListener('click',close);
$('age').addEventListener('change',progress);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('systemsOverlay').hidden){
  e.preventDefault();e.stopImmediatePropagation();close();
 }
},true);
document.addEventListener('symbiont-city:cleared',()=>{
 social=S.init();health=H.create();
 try{localStorage.removeItem(SOCIAL_KEY);localStorage.removeItem(HEALTH_KEY);}catch(_){}
 if(mode)close();progress();
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail){
  e.detail.socialProjects={...social.decisions};
  e.detail.adultHealth={completed:Object.keys(health.completed)};
 }
});
progress();
})();
