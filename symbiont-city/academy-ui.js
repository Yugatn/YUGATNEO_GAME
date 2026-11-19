/* SYMBIONT CITY Academy: accessible educational mission cards. No sensitive answers stored. */
(function(){
'use strict';
const A=window.SymbiontAcademy;if(!A)return;
const $=id=>document.getElementById(id),KEY='yugatneo.symbiont-city.academy.v1';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;
try{state=A.restore(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){state=A.initial();}
let current=null,step='brief',answer=null,opener=null;
let deckTarget='friend',deckIndex=0;
function updateDeck(){
 $('academyDeckQuestion').textContent=A.question(deckTarget,age(),deckIndex);
 for(const b of document.querySelectorAll('[data-deck-target]'))
  b.setAttribute('aria-pressed',String(b.dataset.deckTarget===deckTarget));
}
function age(){const n=Number($('age').value);return Number.isInteger(n)&&n>=0&&n<=110?n:8;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
function update(){
 const complete=Object.keys(state.completed).filter(id=>A.ids.includes(id)).length;
 $('academyCount').textContent=complete+' / '+A.ids.length+' заданий';
 $('academyCards').innerHTML=A.TRACKS.map(track=>{
  const n=track.scenarios.filter(sc=>state.completed[sc.id]).length;
  return '<article class="academy-track"><div class="academy-track-head"><span class="academy-symbol">'+safe(track.icon)+'</span>'+
   '<div><h3>'+safe(track.title)+'</h3><small>'+safe(track.label)+' · '+n+'/3</small></div></div>'+
   '<p>'+safe(track.framing)+'</p><div class="academy-missions">'+track.scenarios.map(sc=>
    '<button type="button" data-academy-id="'+safe(sc.id)+'" class="academy-card">'+
    '<span>'+safe(sc.title)+'</span><b>'+(state.completed[sc.id]?'✓ Разобрано':'▶ Играть')+'</b></button>').join('')+
   '</div></article>';
 }).join('');
}
function open(id,target){
 current=A.view(id,age());if(!current)return;
 opener=target||null;answer=null;step='brief';$('academyOverlay').hidden=false;
 render();$('academyClose').focus();
}
function close(){current=null;$('academyOverlay').hidden=true;
 if(opener?.focus)opener.focus();update();}
function render(){
 if(!current)return;
 const v=current;
 $('academyArea').textContent=v.trackTitle+' · '+(v.track==='philosophy'?'Философская задача':v.track==='health'?'Возрастное просвещение':'Миссия навыка');
 $('academyTitle').textContent=v.icon+' '+v.title;
 const body=$('academyBody');let html='';
 if(v.caregiver){
  html='<p class="academy-notice">Для детей 0–2 лет занятия проходят только с близким взрослым вне экрана.</p>'+
  '<p>Разыграйте простую сценку с игрушками: кто хочет помочь, кто устал, кто нуждается в уважении границ? Называйте чувства и следуйте реакции ребёнка.</p>'+
  '<p>Игра не задаёт вопросов младенцу и не выставляет оценок.</p>';
 }else if(step==='brief'){
  html='<div class="academy-notice">'+safe(v.framing)+'</div>'+
   '<p class="academy-situation">'+safe(v.situation)+'</p>'+
   '<p class="academy-guidance">'+safe(v.agePrompt)+'</p>';
 }else if(step==='choice'){
  html='<h3>Как ты поступишь?</h3><div class="academy-options">'+v.choices.map((x,i)=>
   '<button type="button" data-academy-answer="'+i+'" class="academy-answer">'+
    '<span class="academy-choice-no">'+(i+1)+'</span><span>'+safe(x)+'</span></button>').join('')+'</div>'+
   '<p class="fine">Можно отвечать без спешки, обсуждать, выбирать другой вариант и менять мнение.</p>';
 }else if(step==='result'){
  html='<div class="academy-feedback"><strong>'+(answer.helpful?'Подход бережно учитывает ситуацию':'Есть важный момент для размышления')+'</strong>'+
   '<p>'+safe(answer.lesson)+'</p><p><strong>Вопрос для обсуждения:</strong> '+safe(answer.question)+'</p>'+
   '<a href="'+safe(answer.source)+'" target="_blank" rel="noopener noreferrer">Первоисточник и методическая основа</a></div>'+
   '<p class="fine">Это образовательная ситуация, не психотерапия, не диагностика и не медицинская рекомендация. Никакие личные ответы не сохраняются.</p>';
 }
 body.innerHTML=html;
 $('academyStep').textContent=v.caregiver?'Совместное занятие':step==='brief'?'1 / 3 · Ситуация':step==='choice'?'2 / 3 · Выбор':'3 / 3 · Разбор';
 $('academyBack').hidden=v.caregiver||step==='brief';
 $('academyNext').hidden=step==='choice';
 $('academyNext').textContent=v.caregiver||step==='result'?'Закончить':'Продолжить →';
}
$('academyCards').addEventListener('click',e=>{
 const btn=e.target.closest('[data-academy-id]');if(btn)open(btn.dataset.academyId,btn);
});
$('academyBody').addEventListener('click',e=>{
 const btn=e.target.closest('[data-academy-answer]');if(!btn||!current||step!=='choice')return;
 const index=Number(btn.dataset.academyAnswer);
 answer=A.result(state,current.id,age(),index);
 if(!answer)return;
 if(answer.helpful)save();
 step='result';render();update();
});
$('academyNext').addEventListener('click',()=>{
 if(!current)return;
 if(current.caregiver||step==='result'){close();return;}
 if(step==='brief'){step='choice';render();}
});
$('academyBack').addEventListener('click',()=>{if(!current)return;
 step=step==='result'?'choice':'brief';render();
});
$('academyClose').addEventListener('click',close);
document.querySelector('.academy-deck-picker').addEventListener('click',e=>{
 const b=e.target.closest('[data-deck-target]');
 if(!b||!A.QUESTION_DECK[b.dataset.deckTarget])return;
 deckTarget=b.dataset.deckTarget;deckIndex=0;updateDeck();
});
$('academyDeckNext').addEventListener('click',()=>{
 deckIndex++;updateDeck();
});
$('age').addEventListener('change',updateDeck);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('academyOverlay').hidden){
  e.preventDefault();e.stopImmediatePropagation();close();
 }
},true);
document.addEventListener('symbiont-city:cleared',()=>{
 state=A.initial();
 try{localStorage.removeItem(KEY);}catch(_){}
 if(current)close();update();
});
document.addEventListener('symbiont-city:export',e=>{
 if(e.detail)e.detail.academy={completed:Object.keys(state.completed).filter(id=>A.ids.includes(id)),total:A.ids.length};
});
update();updateDeck();
})();
