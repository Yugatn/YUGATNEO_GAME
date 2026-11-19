/* YUGATNEO / SYMBIONT CITY · age-adaptive offline educational adventure.
 * All scores stay in localStorage, no login, analytics, user-generated texts or chat.
 */
(function(){
'use strict';
const E=window.SymbiontCityEngine,D=window.SymbiontCityContent;
if(!E||!D)throw Error('City content/engine unavailable');
const $=id=>document.getElementById(id);
const STORE='yugatneo.symbiont-city.progress.v1';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
let state;
try{state=E.restore(JSON.parse(localStorage.getItem(STORE)||'null'))||E.initial(8);}
catch(_){state=E.initial(8);}
let active=null,selectedDistrict='dialogue',toastTimer=0,focusVisible=false;
let avatar={x:.48,y:.48},target={x:.48,y:.48},lastDraw=0;
const canvas=$('cityCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const tg=(()=>{try{
 const app=window.Telegram?.WebApp;
 if(app){app.ready();app.expand();app.setHeaderColor?.('#081923');app.setBackgroundColor?.('#081923');}
 return app||null;
}catch(_){return null;}})();
function haptic(t='light'){try{tg?.HapticFeedback?.impactOccurred(t);}catch(_){}}
function save(){
 try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){notify('Не удалось сохранить результат в этом браузере.');}
}
function notify(value){
 const node=$('toast');
 node.textContent=value;node.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2600);
}
function portrait(){
 const a=E.ageProfile(state.age,state.challenge);
 $('age').value=String(state.age);$('challenge').value=state.challenge;
 $('ageDescription').textContent=a.profile.label+'. '+a.profile.scaffold+' '+a.profile.focus+
  (a.effective!==state.age?' Сложность заданий: ориентир '+a.effective+' лет.':'');
}
function districtStory(id){
 const d=D.districts.find(x=>x.id===id)||D.districts[4];
 const n=D.byDistrict[d.id].filter(m=>state.completed[m.id]).length;
 return n===2?d.unlock+'. Район восстановлен.':n===1?
  'Здесь уже стало лучше. Ещё одна задача поможет району.':
  'В районе «'+d.title+'» тебя встретит '+d.npc+'. '+d.desc+'.';
}
function refresh(){
 const p=E.progress(state);
 $('points').textContent=state.points.toLocaleString('ru-RU');
 $('cityLevel').textContent=p.done+' / '+p.total+' миссий';
 $('districtProgress').textContent=p.districts+' / '+D.districts.length;
 $('cityFill').style.width=p.percent+'%';
 $('cityMeter').setAttribute('aria-valuenow',String(p.percent));
 $('cityStory').textContent=p.done===p.total?
  'Город восстановлен! Возвращайся к заданиям, пробуй другие решения и обсуждай их с близкими.':districtStory(selectedDistrict);
 $('districtList').innerHTML=D.districts.map(d=>{
  const n=D.byDistrict[d.id].filter(m=>state.completed[m.id]).length;
  return '<button type="button" class="district-card '+(n===2?'done':'')+'" data-district="'+d.id+
   '" aria-label="'+escapeHTML(d.title+', выполнено '+n+' из двух миссий')+'">'+
   '<span class="district-icon" style="color:'+d.accent+'">'+escapeHTML(d.symbol)+'</span>'+
   '<span><strong>'+escapeHTML(d.title)+'</strong><small>'+escapeHTML(d.desc)+'</small></span>'+
   '<span class="stat">'+(n===2?'✓':n+'/2')+'</span></button>';
 }).join('');
 $('skillBars').innerHTML=D.districts.map(d=>{
  const n=D.byDistrict[d.id].filter(m=>state.completed[m.id]).length;
  return '<div class="skill-row"><strong>'+escapeHTML(d.skill)+'</strong>'+
   '<span class="track"><i style="width:'+(n*50)+'%"></i></span>'+
   '<span class="amount">'+n+'/2</span></div>';
 }).join('');
 const rewards=[{label:'Первое решение',icon:'✧',ok:p.done>=1},
  {label:'Три района',icon:'✿',ok:p.districts>=3},
  {label:'Семь заданий',icon:'◈',ok:p.done>=7},
  {label:'Город решений',icon:'✦',ok:p.done===14}];
 $('achievements').innerHTML=rewards.map(r=>'<span class="achievement '+(r.ok?'':'locked')+
  '" aria-label="'+escapeHTML(r.label+(r.ok?', достигнуто':', не открыто'))+'"><b>'+r.icon+'</b>'+
   escapeHTML(r.label)+'</span>').join('');
 portrait();
}
function drawCity(t){
 if(!ctx)return;
 const w=800,h=610,rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const cw=Math.max(1,Math.round(rect.width*dpr)),ch=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 ctx.setTransform(cw/w,0,0,ch/h,0,0);
 let bg=ctx.createLinearGradient(0,0,800,610);
 bg.addColorStop(0,'#113246');bg.addColorStop(.5,'#165049');bg.addColorStop(1,'#0d293c');
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 for(let i=0;i<22;i++){
  const x=(i*131+39)%w,y=(i*79+53)%h;
  ctx.fillStyle='#dbffd008';
  ctx.beginPath();ctx.arc(x,y,26+i%5*11,0,Math.PI*2);ctx.fill();
 }
 ctx.lineCap='round';
 ctx.strokeStyle='#59c2ce71';ctx.lineWidth=52;
 ctx.beginPath();ctx.moveTo(-50,380);ctx.bezierCurveTo(150,290,245,460,405,376);
 ctx.bezierCurveTo(565,300,710,405,850,284);ctx.stroke();
 ctx.strokeStyle='#9ad5c97e';ctx.lineWidth=22;ctx.stroke();
 for(let i=0;i<16;i++){
  ctx.strokeStyle='#b4eac61b';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(i*54,0);ctx.lineTo(i*54+180,610);ctx.stroke();
 }
 const middle=D.districts.find(d=>d.id==='dialogue');
 for(const d of D.districts){
  if(d.id==='dialogue')continue;
  const x=d.pos[0]*w,y=d.pos[1]*h,cx=middle.pos[0]*w,cy=middle.pos[1]*h;
  ctx.strokeStyle='#082734';ctx.lineWidth=27;ctx.beginPath();ctx.moveTo(cx,cy);
  ctx.quadraticCurveTo((cx+x)/2-20,(cy+y)/2-20,x,y);ctx.stroke();
  ctx.strokeStyle='#95e3c084';ctx.lineWidth=5;ctx.stroke();
 }
 for(const d of D.districts){
  const x=d.pos[0]*w,y=d.pos[1]*h;
  const count=D.byDistrict[d.id].filter(m=>state.completed[m.id]).length;
  const z=count===2?58:count===1?51:45;
  ctx.save();ctx.translate(x,y);
  ctx.shadowColor=d.accent;ctx.shadowBlur=count*19;
  ctx.fillStyle='#062432';ctx.beginPath();ctx.ellipse(0,17,z*.84,z*.33,0,0,2*Math.PI);ctx.fill();
  ctx.shadowBlur=0;
  const g=ctx.createLinearGradient(-z,-z,z,z);
  g.addColorStop(0,count?'#398879':'#335069');
  g.addColorStop(1,count===2?'#1a735b':'#132f42');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(-z*.75,12);ctx.lineTo(-z*.75,-z*.42);
  ctx.lineTo(0,-z*.96);ctx.lineTo(z*.75,-z*.42);
  ctx.lineTo(z*.75,12);ctx.lineTo(0,z*.45);ctx.closePath();
  ctx.fill();ctx.strokeStyle=d.accent;ctx.lineWidth=count===2?4:2;ctx.stroke();
  ctx.fillStyle='#f4fff8';ctx.textAlign='center';ctx.font='bold 33px system-ui';
  ctx.fillText(d.symbol,0,-z*.12);
  ctx.font='900 14px system-ui';ctx.fillStyle='#b9ffcf';ctx.fillText(count+'/2',0,z*.34);
  ctx.restore();
  if(count===2){
   ctx.fillStyle='#ddffae';ctx.font='bold 23px system-ui';ctx.textAlign='center';
   ctx.fillText('✦',x+z*.7,y-z*.85);
  }
  ctx.textAlign='center';ctx.font='bold 15px system-ui';
  ctx.lineWidth=4;ctx.strokeStyle='#092831';ctx.fillStyle='#f8fff6';
  ctx.strokeText(d.title,x,y+z*.9);ctx.fillText(d.title,x,y+z*.9);
 }
 if(reduced){avatar.x=target.x;avatar.y=target.y;}
 else{avatar.x+=(target.x-avatar.x)*.065;avatar.y+=(target.y-avatar.y)*.065;}
 const x=avatar.x*w,y=avatar.y*h-50+(reduced?0:Math.sin(t*.002)*3);
 ctx.save();ctx.translate(x,y);
 ctx.shadowColor='#baffb1';ctx.shadowBlur=15;
 ctx.fillStyle='#f9e5bb';ctx.beginPath();ctx.arc(0,-8,12,0,2*Math.PI);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle='#1e796a';ctx.beginPath();ctx.ellipse(0,14,14,18,0,0,2*Math.PI);ctx.fill();
 ctx.fillStyle='#0c2432';ctx.strokeStyle='#f4fff2';ctx.lineWidth=1.8;
 for(const dx of [-5,5]){
  ctx.beginPath();ctx.arc(dx,-7,5,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 ctx.restore();
}
function animate(t){
 if(t-lastDraw>48){drawCity(t);lastDraw=t;}
 requestAnimationFrame(animate);
}
function taskInstructions(view){
 const kind=view.kind;
 if(kind==='dialogue')return 'Выбери способ ответить. Потом обсуди последствия.';
 if(kind==='evidence')return 'Выбери источник, который лучше помогает проверить информацию.';
 if(kind==='sequence')return 'Выбери действия в правильном порядке — от первого до последнего.';
 if(kind==='focus')return 'Запомни знаки, затем восстанови порядок по памяти. Можно повторять.';
 if(kind==='design')return 'Выбери два полезных элемента для совместного решения.';
 if(kind==='perspectives')return 'Выбери два вопроса, которые помогают услышать других.';
 if(kind==='resources')return 'Распредели все единицы энергии; соблюди минимумы для каждого района.';
 return 'Обдумай ситуацию и сделай выбор.';
}
function optionsHTML(items,challenge,asSource=false){
 return '<div class="option-grid">'+items.map((item,i)=>{
  const label=asSource?item.label:item.label;
  const done=challenge?.chosen===i;
  return '<button class="choice '+(done?'selected':'')+'" type="button" data-choice="'+i+'">'+
   '<span class="choice-icon">'+String.fromCharCode(65+i)+'.</span><span>'+escapeHTML(label)+'</span></button>';
 }).join('')+'</div>';
}
function sequenceHTML(v,c){
 const completed=c.sequence;
 const items=c.order.filter(i=>!completed.includes(i));
 return '<p class="help">Собрано шагов: '+completed.length+' / '+v.steps.length+'</p>'+
  '<div class="order-list">'+completed.map((i,k)=>'<div class="order-item"><span class="num">'+(k+1)+'</span>'+
   escapeHTML(v.steps[i])+' ✓</div>').join('')+'</div>'+
  '<h3>Выбери следующий шаг</h3><div class="option-grid">'+items.map(i=>
   '<button class="choice" data-sequence="'+i+'" type="button">'+escapeHTML(v.steps[i])+'</button>').join('')+'</div>';
}
function partsHTML(v,c){
 const items=v.kind==='design'?v.parts:v.perspectives;
 return '<div class="option-grid">'+items.map((item,i)=>
  '<button class="choice '+(c.selected.includes(i)?'selected':'')+'" type="button" data-part="'+i+
  '" aria-pressed="'+c.selected.includes(i)+'"><span class="choice-icon">'+(c.selected.includes(i)?'✓':'○')+
  '</span><span>'+escapeHTML(item.label)+'</span></button>').join('')+'</div>'+
  '<p class="help">Выбрано: '+c.selected.length+' из 2.</p>'+
  '<button class="button ghost" id="checkParts" type="button"'+(c.selected.length!==2?' disabled':'')+'>Проверить решение</button>';
}
function resourcesHTML(v,c){
 const used=c.allocation.reduce((a,b)=>a+b,0);
 return '<div class="budget-grid">'+v.labels.map((name,i)=>
  '<div class="budget-row"><div><strong>'+escapeHTML(name)+'</strong>'+
  '<small>Нужно хотя бы '+v.minimums[i]+' ед.</small></div>'+
  '<div class="stepper"><button type="button" data-budget="'+i+'" data-delta="-1" aria-label="Уменьшить '+escapeHTML(name)+'">−</button>'+
  '<output aria-label="Выделено">'+c.allocation[i]+'</output>'+
  '<button type="button" data-budget="'+i+'" data-delta="1" aria-label="Увеличить '+escapeHTML(name)+'">+</button></div></div>'
 ).join('')+'</div><p class="help">Распределено: '+used+' из '+v.total+' энергетических единиц.</p>'+
 '<button class="button ghost" type="button" id="checkResources">Проверить баланс</button>';
}
function memoryHTML(v,c){
 const showing=focusVisible;
 return '<div class="memory-sequence">'+(showing?
   v.symbols.map(ch=>'<span class="glyph">'+escapeHTML(ch)+'</span>').join(''):
   v.symbols.map((ch,i)=>'<span class="hidden-symbol">'+(c.focusInput[i]?escapeHTML(c.focusInput[i]):'✧')+'</span>').join(''))+
  '</div>'+(showing?
  '<p class="help">Посмотри на порядок, затем нажми «Я запомнил». Время не ограничено.</p>':
  '<div class="memory-options">'+v.options.map(ch=>'<button type="button" data-symbol="'+escapeHTML(ch)+'" aria-label="Выбрать '+escapeHTML(ch)+'">'+escapeHTML(ch)+'</button>').join('')+'</div>');
}
function taskHTML(){
 const v=active.view,c=active.challenge;
 let body='<p class="story">'+escapeHTML(v.situation)+'</p>'+
  '<p class="help">'+escapeHTML(taskInstructions(v))+'</p>';
 if(v.kind==='dialogue')body+=optionsHTML(v.choices,c);
 if(v.kind==='evidence')body+=optionsHTML(v.sources,c,true);
 if(v.kind==='sequence')body+=sequenceHTML(v,c);
 if(v.kind==='design'||v.kind==='perspectives')body+=partsHTML(v,c);
 if(v.kind==='resources')body+=resourcesHTML(v,c);
 if(v.kind==='focus')body+=memoryHTML(v,c);
 if(c.feedback)body+='<div class="feedback '+(c.done?'':'warn')+'">'+escapeHTML(c.feedback)+'</div>';
 if(active.repeat)body+='<p class="tip">Повторная попытка: дополнительные баллы за уже выполненное задание не начисляются.</p>';
 return body;
}
function renderMission(){
 if(!active)return;
 const body=$('missionBody'),next=$('missionNext'),back=$('missionBack'),label=$('missionStepLabel');
 const stage=active.stage;
 for(let i=1;i<=3;i++)$('dot'+i).classList.toggle('on',
  stage==='brief'?i<=1:stage==='task'?i<=2:i<=3);
 next.disabled=false;back.textContent='← Вернуться в город';next.hidden=false;
 if(stage==='caregiver'){
  label.textContent='Офлайн-игра вместе со взрослым';
  body.innerHTML='<div class="story"><strong>Для ребёнка 0–2 лет экранная игра не предназначена.</strong>'+
   '<p>Лучше общаться с ребёнком, читать вслух, рассматривать предметы и играть без экрана. Этот раздел предлагает идею взрослому.</p></div>'+
   '<h3>'+escapeHTML(active.district.title)+'</h3>'+
   '<p>Выберите одну знакомую ситуацию. Называйте чувства, отвечайте на жесты ребёнка и показывайте доброжелательное взаимодействие.</p>'+
   '<div class="reflection"><strong>Вопрос взрослому:</strong><p>Какие сигналы ребёнка я заметил, и как поддержал его инициативу?</p></div>'+
   '<p class="help">Никаких баллов, заданий на скорость и экранных упражнений для младенцев и малышей.</p>';
  next.textContent='Вернуться к городу';return;
 }
 const v=active.view,c=active.challenge;
 if(stage==='brief'){
  label.textContent='1. Жизненная ситуация';
  body.innerHTML='<p class="story">'+escapeHTML(v.situation)+'</p>'+
    '<h3>'+escapeHTML(active.district.skill)+'</h3>'+
    '<p>'+escapeHTML(taskInstructions(v))+'</p>'+
    (v.age.coPlay?'<div class="tip">Для дошкольников рекомендуем совместную игру с взрослым, короткими эпизодами и обсуждением.</div>':'')+
    '<p class="help">Нет таймера, обязательных покупок и проигрыша. Можно возвращаться к вопросам.</p>';
  next.textContent='Начать задание →';
 }else if(stage==='task'){
  label.textContent='2. Действие и выбор';
  body.innerHTML=taskHTML();
  if(v.kind==='focus'&&focusVisible){
   next.disabled=false;next.textContent='Я запомнил →';
  }else{
   next.disabled=!c.done;
   next.textContent=c.done?'Обдумать результат →':'Выполни задание';
  }
 }else if(stage==='reflection'){
  label.textContent='3. Рефлексия';
  body.innerHTML='<div class="feedback">'+escapeHTML(c.feedback||'Ты нашёл решение!')+'</div>'+
   '<h3>Вопрос для размышления</h3><div class="reflection">'+escapeHTML(v.reflect)+'</div>'+
   '<p>Обсуди этот вопрос с близким человеком либо подумай самостоятельно. Ответ не нужно вводить или сохранять.</p>'+
   '<p class="help">'+escapeHTML(v.takeaway)+'</p>';
  next.textContent='Завершить миссию →';
 }else if(stage==='result'){
  label.textContent='Новый опыт';
  body.innerHTML='<div class="eyebrow">МИССИЯ ЗАВЕРШЕНА</div>'+
   '<h3>'+escapeHTML(v.title)+'</h3>'+
   '<p class="reward">'+(active.earned?'+ '+active.earned.points+' игровых очков':'Ты повторил задание')+'</p>'+
   '<div class="feedback">'+escapeHTML(v.takeaway)+'</div>'+
   '<p class="help">Попробуй применить один из приёмов в реальном разговоре, игре или совместном деле. Успех здесь не означает оценку личности.</p>';
  next.textContent='Вернуться в город';
 }
}
function closeMission(){
 if(!active)return;
 active=null;$('missionOverlay').hidden=true;
 $('districtList').querySelector('[data-district="'+selectedDistrict+'"]')?.focus();
}
function advance(){
 if(!active)return;
 if(active.stage==='caregiver'||active.stage==='result'){closeMission();return;}
 if(active.stage==='brief'){
  active.stage='task';focusVisible=active.view.kind==='focus';
 }else if(active.stage==='task'){
  if(active.view.kind==='focus'&&focusVisible){focusVisible=false;renderMission();return;}
  if(!active.challenge.done)return;
  active.stage='reflection';
 }else if(active.stage==='reflection'){
  const receipt=E.complete(state,active.view,active.challenge);
  active.earned=receipt||null;
  active.stage='result';save();refresh();haptic('medium');
  if(receipt)notify('Район изменился! +'+receipt.points+' игровых очков');
 }
 renderMission();
}
function taskClick(e){
 if(!active||active.stage!=='task')return;
 const v=active.view,c=active.challenge;
 const targetButton=e.target.closest('button');
 if(!targetButton)return;
 let result=null,mutated=false;
 if(targetButton.hasAttribute('data-choice')){
  result=E.answerChoice(c,v,Number(targetButton.dataset.choice));mutated=!!result;
 }else if(targetButton.hasAttribute('data-sequence')){
  result=E.chooseSequence(c,v,Number(targetButton.dataset.sequence));mutated=!!result;
 }else if(targetButton.hasAttribute('data-part')){
  mutated=E.togglePart(c,v,Number(targetButton.dataset.part));
 }else if(targetButton.id==='checkParts'){
  result=E.checkParts(c,v);mutated=!!result;
 }else if(targetButton.hasAttribute('data-budget')){
  mutated=E.adjustResources(c,v,Number(targetButton.dataset.budget),Number(targetButton.dataset.delta));
 }else if(targetButton.id==='checkResources'){
  result=E.checkResources(c,v);mutated=!!result;
 }else if(targetButton.hasAttribute('data-symbol')){
  result=E.focusTap(c,v,targetButton.dataset.symbol);mutated=!!result;
  if(result?.reset)focusVisible=true;
 }
 if(mutated){haptic(c.done?'medium':'light');renderMission();}
}
function selectDistrict(id){
 const district=D.districts.find(d=>d.id===id);
 if(!district)return;
 selectedDistrict=id;
 target={x:district.pos[0],y:district.pos[1]};
 refresh();haptic();
 const age=E.ageProfile(state.age,state.challenge);
 if(age.coPlayOnly){
  active={stage:'caregiver',district};
  $('missionDistrict').textContent='ДЛЯ ВЗРОСЛОГО С МАЛЫШОМ';
  $('missionTitle').textContent=district.title;
  $('missionOverlay').hidden=false;
  renderMission();$('missionClose').focus();return;
 }
 const mission=E.currentMission(state,id);
 const view=E.missionView(state,mission);
 active={stage:'brief',district,view,challenge:E.newChallenge(view),
  repeat:!!state.completed[mission.id],earned:null};
 $('missionDistrict').textContent=district.title+' · '+district.skill;
 $('missionTitle').textContent=view.title;
 $('missionOverlay').hidden=false;renderMission();
 $('missionClose').focus();
}
$('age').addEventListener('change',()=>{
 const numeric=Number($('age').value);
 if(!Number.isInteger(numeric)||numeric<0||numeric>110){
  $('age').value=String(state.age);notify('Укажи возраст от 0 до 110 лет.');return;
 }
 // Native number inputs can fire an additional change on blur. Avoid
 // rebuilding the district buttons between pointerdown and pointerup:
 // otherwise the first user tap on a mission is silently discarded.
 if(numeric===state.age)return;
 E.setAge(state,numeric);save();refresh();
 notify(numeric<=2?'Для этого возраста — только офлайн-идеи взрослому.':
  'Возрастной профиль обновлён, прогресс сохранён.');
});
$('challenge').addEventListener('change',()=>{
 if(E.setChallenge(state,$('challenge').value)){save();refresh();}
});
$('districtList').addEventListener('click',e=>{
 const btn=e.target.closest('[data-district]');if(btn)selectDistrict(btn.dataset.district);
});
canvas.addEventListener('click',e=>{
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
 const found=D.districts.map(d=>({id:d.id,distance:Math.hypot((d.pos[0]-x)*1.3,d.pos[1]-y)}))
 .sort((a,b)=>a.distance-b.distance)[0];
 if(found&&found.distance<.17)selectDistrict(found.id);
 else notify('Нажми на один из семи районов или выбери его в списке.');
});
canvas.addEventListener('keydown',e=>{
 if(e.code==='Enter'||e.code==='Space'){e.preventDefault();selectDistrict(selectedDistrict);}
});
$('missionBody').addEventListener('click',taskClick);
$('missionNext').addEventListener('click',advance);
$('missionBack').addEventListener('click',closeMission);
$('missionClose').addEventListener('click',closeMission);
$('aboutBtn').addEventListener('click',()=>{$('infoOverlay').hidden=false;$('infoClose').focus();});
$('sourceInfo').addEventListener('click',()=>{$('infoOverlay').hidden=false;$('infoClose').focus();});
function closeInfo(){$('infoOverlay').hidden=true;$('aboutBtn').focus();}
$('infoClose').addEventListener('click',closeInfo);
$('infoDone').addEventListener('click',closeInfo);
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(!$('infoOverlay').hidden)closeInfo();
 else if(!$('missionOverlay').hidden)closeMission();
});
$('clear').addEventListener('click',()=>{
 if(window.confirm('Удалить местный прогресс города и очки? Это действие необратимо.')){
  const age=state.age,challenge=state.challenge;
  state=E.initial(age);E.setChallenge(state,challenge);save();refresh();
  document.dispatchEvent(new Event('symbiont-city:cleared'));
  notify('Местный игровой прогресс очищен.');
 }
});
$('export').addEventListener('click',()=>{
 const data={game:'SYMBIONT CITY',version:1,exportedAt:new Date().toISOString(),
  age:state.age,challenge:state.challenge,progress:E.progress(state),
  completed:state.completed,skillPoints:state.skillPoints};
 document.dispatchEvent(new CustomEvent('symbiont-city:export',{detail:data}));
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='symbiont-city-progress.json';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
refresh();requestAnimationFrame(animate);
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
