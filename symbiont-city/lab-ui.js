/* SYMBIONT CITY · family Decision Lab. No server, no saved personal answers. */
(function(){
'use strict';
const L=window.SymbiontCityLab;
if(!L)return;
const $=id=>document.getElementById(id);
const STORE='yugatneo.symbiont-city.lab.v1';
const LABELS={safety:'Безопасность',trust:'Доверие',energy:'Ресурсы',time:'Время'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
let state;
try{state=L.restore(JSON.parse(localStorage.getItem(STORE)||'null'));}
catch(_){state=L.initial();}
let round=null,opener=null;
function age(){
 const n=Number($('age').value);
 return Number.isInteger(n)&&n>=0&&n<=110?n:8;
}
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(state));}
 catch(_){$('labCityCaption').textContent='Сохранение недоступно: результат останется до закрытия страницы.';}
}
function progress(){
 const p=L.progress(state);
 $('labCount').textContent=p.done+' / '+p.total+' историй';
 $('labCityCaption').textContent=p.done===p.total?
  'Все районы испытаны. Сравни свои решения, попробуй альтернативы и обсуди их.':
  'Открыто '+p.done+' из '+p.total+' историй. Здания меняются после решений.';
 $('labCity').innerHTML=L.scenarios.map((s,i)=>
  '<div class="lab-building '+(state.choices[s.id]!==undefined?'restored':'')+
  '" style="--h:'+(70+(i*23)%68)+'px" title="'+esc(s.title)+
  '" aria-label="'+esc(s.title)+(state.choices[s.id]!==undefined?', решение принято':', ожидает решения')+
  '"><span aria-hidden="true">'+esc(s.icon)+'</span></div>').join('');
 $('labMeters').innerHTML=L.METRICS.map(k=>
  '<div class="lab-meter"><label>'+LABELS[k]+'</label><div class="bar" role="progressbar" aria-label="'+LABELS[k]+
  '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+p.metrics[k]+'"><i style="width:'+p.metrics[k]+
  '%"></i></div><output>'+p.metrics[k]+'</output></div>').join('')+
  '<p class="lab-meter-caption">Условная шкала 0–100. В игре рост одного показателя может потребовать дополнительных ресурсов или времени.</p>';
 $('labCards').innerHTML=L.scenarios.map(s=>{
  const done=state.choices[s.id]!==undefined;
  return '<button type="button" class="lab-card '+(done?'done':'')+
   '" data-lab-id="'+s.id+'" aria-label="'+esc(s.title+(done?', повторить и изменить решение':', начать'))+'">'+
   '<span class="lab-card-icon" aria-hidden="true">'+esc(s.icon)+'</span>'+
   '<strong>'+esc(s.title)+'</strong><small>'+esc(s.skill)+'</small>'+
   '<span class="lab-state">'+(done?'✓ Решение принято · Изменить':'▶ Исследовать')+'</span></button>';
 }).join('');
}
function syncAge(){
 const a=age(),field=$('labTogether');
 if(a>=3&&a<=5){field.checked=true;field.disabled=true;}
 else if(a<=2){field.checked=false;field.disabled=true;}
 else field.disabled=false;
}
function together(){return age()>=3&&age()<=5||$('labTogether').checked;}
function open(id,from){
 const view=L.view(id,age());
 if(!view)return;
 opener=from||$('labCards');
 round={view,step:view.caregiver?'caregiver':'brief',votes:[],selected:null,coPlay:together()};
 $('labArea').textContent=esc(view.area)+' · '+view.skill;
 $('labTitle').textContent=view.icon+' '+view.title;
 $('labOverlay').hidden=false;
 $('labClose').focus();
 renderRound();
}
function close(){
 if(!round)return;
 $('labOverlay').hidden=true;round=null;
 if(opener&&typeof opener.focus==='function')opener.focus();
 progress();
}
function optionButton(option,chosen){
 return '<button type="button" class="lab-option'+(chosen?' selected':'')+
  '" data-lab-option="'+option.index+'" aria-pressed="'+(chosen?'true':'false')+'">'+
  '<span class="lab-option-no">'+String(option.index+1)+'</span>'+
  '<span>'+esc(option.text)+'</span></button>';
}
function renderRound(){
 if(!round)return;
 const r=round,v=r.view;
 const dots=['brief','evidence','decision','result','reflect'];
 const dotIndex=dots.indexOf(r.step);
 $('labStep').textContent=r.step==='caregiver'?'Совместная игра вне экрана':
  ({brief:'1. Ситуация',evidence:'2. Выясни обстоятельства',decision:'3. Сделай выбор',
    result:'4. Посмотри последствия',reflect:'5. Обсуди вывод'})[r.step]||'Миссия';
 $('labDots').innerHTML=Array.from({length:5},(_,i)=>'<i class="'+(i<=dotIndex?'on':'')+'"></i>').join('');
 const back=$('labBack'),next=$('labNext');
 back.textContent=r.step==='result'?'← Пересмотреть решение':'← Назад';
 back.hidden=r.step==='caregiver';
 next.hidden=r.step==='decision';
 next.disabled=false;
 next.textContent=r.step==='reflect'||r.step==='caregiver'?'Завершить':'Продолжить →';
 const foot=$('labBody');let html='';
 if(r.step==='caregiver'){
  html='<div class="lab-tag">0–2 года · для взрослых</div>'+
    '<div class="lab-caregiver"><p>Младенцу не нужна экранная игра. Эта ситуация — идея для живой совместной игры:</p>'+
    '<ol><li>Возьмите две игрушки и разыграйте простое желание или просьбу о помощи.</li>'+
    '<li>Назовите чувства и действия словами, позволяя ребёнку отвечать взглядом, жестом и звуками.</li>'+
    '<li>Повторяйте без спешки, следуя интересу ребёнка.</li></ol></div>'+
    '<p class="help">Никаких баллов, задач на скорость и отметок о ребёнке.</p>';
 }else if(r.step==='brief'){
  html='<div class="lab-tag">'+(r.coPlay?'Игра вдвоём':'Личное исследование')+
   ' · '+esc(v.skill)+'</div><p class="lab-body-intro">'+esc(v.intro)+'</p>'+
   '<div class="lab-body-guide"><strong>Попробуй представить ситуацию.</strong> '+esc(v.lens)+
   (v.cooperative?' Прочитайте текст вдвоём и покажите друг другу разные варианты.':'')+'</div>';
 }else if(r.step==='evidence'){
  html='<h3>Прежде чем действовать — проверь, что известно</h3>'+
   '<ul class="lab-facts">'+v.evidence.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>'+
   '<div class="lab-body-guide">Ты можешь вернуться назад и изменить своё мнение. Риск и последствия здесь условные, а в реальной жизни информации бывает больше.</div>';
 }else if(r.step==='decision'){
  let prompt=r.coPlay?(r.votes.length===0?'Первый участник выбирает вариант':
   r.votes.length===1?'Второй участник выбирает вариант':
   'Сравните два выбора и вместе выберите итог'): 'Как поступишь?';
  html='<h3>'+prompt+'</h3>'+
   '<div class="lab-option-grid">'+v.options.map(x=>optionButton(x,false)).join('')+'</div>'+
   (r.votes.length?'<div class="lab-votes">'+r.votes.map((index,i)=>
    (i===0?'Первый':'Второй')+' участник: '+esc(v.options.find(x=>x.index===index)?.text||'')+
    '<br>').join('')+(r.votes.length===2?'Обсудите, почему ваши ответы совпали или различаются. Затем выберите общее решение.':'')+'</div>':'');
 }else if(r.step==='result'){
  const res=r.result,existing=v.options.find(x=>x.index===res.option);
  html='<div class="lab-tag">Игровые последствия</div><p class="lab-body-intro">'+esc(existing.text)+'</p>'+
   '<div class="lab-feedback">'+esc(res.reason)+'</div><div class="lab-impact">'+
   L.METRICS.map(k=>{const d=res.delta[k],cl=d>0?'up':d<0?'down':'same';
    return '<div>'+LABELS[k]+'<b class="'+cl+'">'+(d>0?'+':'')+d+'</b></div>';
   }).join('')+'</div>'+
   '<div class="lab-body-guide"><strong>Следующий вопрос:</strong> '+esc(res.follow)+'</div>'+
   '<p class="help">Показанные изменения — предположения внутри игровой модели. Они не означают, что другие варианты всегда ошибочны.</p>';
 }else if(r.step==='reflect'){
  html='<div class="lab-tag">Рефлексия · без записи ответов</div>'+
   '<p class="lab-reflect">'+esc(v.reflect)+'</p>'+
   '<p class="lab-body-guide">'+esc(v.lens)+' '+(r.coPlay?
     'Обсудите вдвоём, что нового вы узнали друг о друге.':'Какие новые сведения заставили бы пересмотреть решение?')+'</p>'+
   '<p class="help">Готово! Район на карте изменился. Позже можно вернуться и попробовать другой вариант, не набирая бесконечные очки.</p>';
 }
 foot.innerHTML=html;
 foot.scrollTop=0;
}
function commit(index){
 const r=round;
 if(!r||r.view.caregiver)return;
 const result=L.choice(state,r.view.id,index,age());
 if(!result)return;
 r.result=result;r.step='result';save();progress();renderRound();
 try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');}catch(_){}
}
$('labCards').addEventListener('click',e=>{
 const button=e.target.closest('[data-lab-id]');
 if(button)open(button.dataset.labId,button);
});
$('labBody').addEventListener('click',e=>{
 if(!round||round.step!=='decision')return;
 const button=e.target.closest('[data-lab-option]');
 if(!button)return;
 const idx=Number(button.dataset.labOption);
 if(!round.view.options.some(o=>o.index===idx))return;
 if(round.coPlay&&round.votes.length<2){
  round.votes.push(idx);renderRound();return;
 }
 commit(idx);
});
$('labNext').addEventListener('click',()=>{
 if(!round)return;
 const r=round;
 if(r.step==='caregiver'||r.step==='reflect'){close();return;}
 const next={brief:'evidence',evidence:'decision',result:'reflect'};
 if(next[r.step]){r.step=next[r.step];renderRound();}
});
$('labBack').addEventListener('click',()=>{
 if(!round)return;
 const r=round,prev={brief:null,evidence:'brief',decision:'evidence',result:'decision',reflect:'result'};
 if(r.step==='brief'){close();return;}
 if(r.step==='result'){r.votes=[];r.result=null;}
 if(prev[r.step]){r.step=prev[r.step];renderRound();}
});
$('labClose').addEventListener('click',close);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('labOverlay').hidden){close();e.stopPropagation();}
});
$('age').addEventListener('change',syncAge);
$('labTogether').addEventListener('change',()=>{});
function reset(){
 state=L.initial();
 try{localStorage.removeItem(STORE);}catch(_){}
 if(round)close();progress();
}
function exportData(){return {version:1,choices:{...state.choices},metrics:L.metrics(state),completed:L.progress(state).done};}
window.SymbiontCityLabUI={reset,exportData,progress,open};
document.addEventListener('symbiont-city:cleared',reset);
document.addEventListener('symbiont-city:export',e=>{if(e.detail)e.detail.lab=exportData();});
syncAge();progress();
})();
