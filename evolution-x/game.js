/* STORY X · EVOLUTION X / Telegram Mini App visual layer.
 * Local-only score and progress. No Telegram user identifiers or backend.
 */
(function(){
'use strict';
const Core=window.StoryXEvolution;
if(!Core)throw Error('Evolution game core failed to load');
const $=id=>document.getElementById(id);
const canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false});
let W=390,H=780,scale=1,frameLast=0,hudLast=0,lastSave=0,noticeUntil=0;
let noticeText='',pausedFrom=null;
let divisionEffects=[];
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const KEY='yugatneo.evolution-x.state.v1',BEST='yugatneo.evolution-x.best.v1';
const SOUND_KEY='yugatneo.evolution-x.sound.v1';
const worlds=[
 {name:'Исток',cell:'#0b2630',run:'#0b1731',road:'#142d3f',sky:'#020817',planet:'#6ef2a1',rim:'#94ffcb'},
 {name:'Криос',cell:'#102c49',run:'#182c51',road:'#233f59',sky:'#081527',planet:'#bcecff',rim:'#8ddcff'},
 {name:'Аврора',cell:'#362040',run:'#302044',road:'#332d50',sky:'#160c2b',planet:'#efb2ff',rim:'#e5aaff'},
 {name:'Гелиос',cell:'#493020',run:'#36252b',road:'#50372f',sky:'#21101d',planet:'#ffd58a',rim:'#ffc77d'},
 {name:'Элизиум',cell:'#153b2c',run:'#10362e',road:'#20443c',sky:'#041b20',planet:'#9cffe2',rim:'#b7ffaf'}
];
function world(offset=0){return worlds[(state.planet+offset)%worlds.length];}
function boostCapacity(){return state.space?.boostCapacity||Math.max(3,state.space?.boostCharges||0);}
function renderSpecializations(){
 const chosen=Core.specialization(state),eligible=state.phase==='cells'&&state.cells.length>=32&&!chosen;
 $('specializationStatus').textContent=chosen?chosen.name+' · '+chosen.desc:eligible?'Выберите один путь развития. Выбор действует до конца мира.':state.phase==='cells'?'Откроется при достижении 32 клеток.':'Специализация в этом мире не выбрана.';
 for(const spec of Core.SPECIALIZATIONS){const btn=$('spec-'+spec.id);btn.disabled=!eligible;btn.setAttribute('aria-pressed',String(chosen?.id===spec.id));}
}
function worldBrief(){const p=Core.profile(state.planet);return p.trait+' · гравитация ×'+String(p.gravity).replace('.',',');}
function renderJournal(){
 const list=$('journal');list.textContent='';
 const entries=Array.isArray(state.chronicle)?state.chronicle.slice(-5).reverse():[];
 if(!entries.length){list.textContent='Первые результаты появятся после посадки на следующей планете.';return;}
 for(const entry of entries){
  const row=document.createElement('li');
  row.textContent='Мир '+(entry.planet+1)+' · '+entry.name+' — порталы '+entry.portals+'/3, удары '+entry.runHits+'/'+entry.spaceHits+'; '+(entry.specialization?entry.specialization+' · ':'')+(entry.medals.length?entry.medals.join(', ')+' · +'+entry.bonus:'цикл пройден');
  list.append(row);
 }
}
let soundOn=false,audio=null;
try{soundOn=localStorage.getItem(SOUND_KEY)==='1';}catch(_){}
function unlockAudio(){
 if(!soundOn)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  if(!audio)audio=new Audio();
  if(audio.state==='suspended')audio.resume().catch(()=>{});
 }catch(_){}
}
function tone(type){
 if(!soundOn||!audio||audio.state!=='running')return;
 try{const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  const f=type==='heavy'?330:type==='medium'?520:780;
  osc.type='sine';osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(f*1.45,now+.09);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.055,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.13);
  osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.14);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }catch(_){}
}
function updateSound(){for(const id of ['soundIntro','soundPause']){
 const el=$(id);el.textContent=soundOn?'♪ Звук включён':'♪ Звук выключен';el.setAttribute('aria-pressed',String(soundOn));
}}
function toggleSound(){soundOn=!soundOn;try{localStorage.setItem(SOUND_KEY,soundOn?'1':'0');}catch(_){}unlockAudio();updateSound();if(soundOn)tone('medium');}
const validPhases=new Set(['cells','emergence','runner','launch','space','landing']);
function readBest(){try{return Math.max(0,Number(localStorage.getItem(BEST))||0);}catch(_){return 0;}}
let best=readBest();
function restore(){
 try{
  const item=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!item||item.version!==1||!validPhases.has(item.phase))return null;
  if(!Array.isArray(item.cells)||item.cells.length>Core.CELL_GOAL)return null;
  if((item.phase==='runner'||item.phase==='launch')&&!item.runner)return null;
  if((item.phase==='space'||item.phase==='landing')&&!item.space)return null;
  if((item.phase==='cells'||item.phase==='emergence')&&!item.cells.length)return null;
  if(!Number.isFinite(item.score)||item.score<0||!Number.isInteger(item.planet)||item.planet<0||item.planet>1000)return null;
  if(!Array.isArray(item.chronicle))item.chronicle=[];
  item.chronicle=item.chronicle.filter(x=>x&&Number.isInteger(x.planet)&&Array.isArray(x.medals)&&typeof x.name==='string').slice(-30);
  return item;
 }catch(_){return null;}
}
let state=restore()||Core.create();
function telegram(){
 try{
  const app=window.Telegram?.WebApp;
  if(!app)return null;
  app.ready();app.expand();
  app.setBackgroundColor?.('#060e1c');app.setHeaderColor?.('#060e1c');
  app.disableVerticalSwipes?.();
  return app;
 }catch(_){return null;}
}
const tg=telegram();
function feel(type){
 tone(type);
 try{tg?.HapticFeedback?.impactOccurred(type||'light');}catch(_){}
}
function resize(){
 const r=canvas.getBoundingClientRect();
 W=r.width||innerWidth;H=r.height||innerHeight;
 scale=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.max(1,Math.round(W*scale));
 canvas.height=Math.max(1,Math.round(H*scale));
 ctx.setTransform(scale,0,0,scale,0,0);
}
window.addEventListener('resize',resize,{passive:true});
window.visualViewport?.addEventListener('resize',resize,{passive:true});
resize();
function message(text,ms=1300){noticeText=text;noticeUntil=performance.now()+ms;}
function save(force){
 const now=performance.now();
 if(!force&&now-lastSave<900)return;
 lastSave=now;
 if(state.phase==='intro')return;
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
 if(state.score>best){
  best=Math.round(state.score);
  try{localStorage.setItem(BEST,String(best));}catch(_){}
 }
}
function newGame(){
 divisionEffects=[];
 state=Core.create(Date.now()>>>0);
 Core.start(state);
 $('intro').hidden=true;$('paused').hidden=true;pausedFrom=null;
 message('ИСТОК · '+worldBrief(),2200);
 save(true);feel('light');
 updateHUD();
}
function start(){
 unlockAudio();
 if(state.phase==='intro')newGame();
 else{$('intro').hidden=true;$('paused').hidden=true;pausedFrom=null;updateHUD();}
}
if(state.phase!=='intro')$('start').textContent='▶ ПРОДОЛЖИТЬ ПУТЬ';
function pause(){
 if(pausedFrom||state.phase==='intro'||!$('intro').hidden)return;
 pausedFrom=state.phase;
 $('paused').hidden=false;
 $('pauseWorld').textContent=world().name+' · '+worldBrief();renderJournal();renderSpecializations();
 save(true);
}
function resume(){
 if(!pausedFrom)return;
 unlockAudio();
 pausedFrom=null;$('paused').hidden=true;
 frameLast=performance.now();
}
function control(command){
 if(pausedFrom||state.phase==='intro'||!$('intro').hidden)return;
 unlockAudio();
 if(command==='left'){if(Core.steer(state,-1))feel('light');}
 if(command==='right'){if(Core.steer(state,1))feel('light');}
 if(command==='center'){
  if(state.phase==='runner'&&Core.jump(state))feel('light');
  else if(state.phase==='space'&&Core.ability(state))feel('medium');
 }
 if(command==='ability'&&Core.ability(state)){feel('medium');message(state.phase==='space'?'СВЕТОВОЙ УСКОРИТЕЛЬ':'ИМПУЛЬС МАТРИЦЫ',800);}
 updateHUD();
}
$('start').addEventListener('click',start);
for(const id of ['soundIntro','soundPause'])$(id).addEventListener('click',toggleSound);
updateSound();
// The core still commits exactly one split immediately. Animation is visual only.
function performDivision(nx,ny){
 if(state.phase!=='cells')return false;
 const before=Core.cellPositions(state);
 const ok=nx===undefined?Core.divideNext(state):Core.divide(state,nx,ny);
 if(!ok)return false;
 if(!reducedMotion?.matches){
  const after=Core.cellPositions(state),ids=new Set(after.map(c=>c.id));
  const parent=before.find(c=>!ids.has(c.id));
  const children=after.filter(c=>c.id===state.nextId||c.id===state.nextId-1);
  if(parent&&children.length===2){
   // Cancel an older effect if a daughter has already been divided again.
   divisionEffects=divisionEffects.filter(e=>e.ids.every(id=>ids.has(id))&&state.time-e.start<e.duration);
   divisionEffects.push({parent,ids:children.map(c=>c.id),start:state.time,duration:after.length<=8?.88:after.length<=32?.58:.28});
   divisionEffects=divisionEffects.slice(-8);
  }
 }
 afterDivision();return true;
}
function afterDivision(){
 const events=state.events.slice();
 feel('light');reactions(events);save(state.phase==='emergence'||events.includes('newwave'));
 if(state.phase==='emergence')message('256 КЛЕТОК · РОЖДЕНИЕ НОВОГО ЭТАПА',2100);
 updateHUD();
}
$('divideNext').addEventListener('click',()=>{
 if(pausedFrom||!$('intro').hidden)return;
 unlockAudio();performDivision();
});
$('pause').addEventListener('click',()=>pausedFrom?resume():pause());
$('resume').addEventListener('click',resume);
for(const spec of Core.SPECIALIZATIONS)$('spec-'+spec.id).addEventListener('click',()=>{
 if(!pausedFrom||!Core.chooseSpecialization(state,spec.id))return;
 feel('medium');renderSpecializations();save(true);updateHUD();
});
$('restart').addEventListener('click',()=>{
 if(!confirm('Начать новый путь с первой клетки? Текущий цикл будет перезаписан.'))return;
 try{localStorage.removeItem(KEY);}catch(_){}
 newGame();
});
for(const id of ['left','right'])$(id).addEventListener('click',()=>control(id));
$('center').addEventListener('click',()=>control('center'));
$('action').addEventListener('click',()=>control('ability'));
function cellBoard(){
 const available=Math.min(W-30,H-255);
 const size=Math.max(130,available);
 return {x:(W-size)/2,y:(H-size)/2+10,w:size,h:size};
}
canvas.addEventListener('pointerdown',ev=>{
 if(pausedFrom||state.phase==='intro'||!$('intro').hidden)return;
 unlockAudio();ev.preventDefault();
 const r=canvas.getBoundingClientRect();
 const x=ev.clientX-r.left,y=ev.clientY-r.top;
 if(state.phase==='cells'){
  const b=cellBoard(),nx=(x-b.x)/b.w,ny=(y-b.y)/b.h;
  performDivision(nx,ny);
 }else if(state.phase==='runner'||state.phase==='space'){
  control(x<W*.29?'left':x>W*.71?'right':'center');
 }
 updateHUD();
});
window.addEventListener('keydown',ev=>{
 if(ev.repeat)return;
 if(ev.target?.tagName==='BUTTON'&&['Space','Enter'].includes(ev.code))return;
 if(['Space','ArrowUp','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyF','Escape'].includes(ev.code))ev.preventDefault();
 if(ev.code==='Escape'){pausedFrom?resume():pause();return;}
 if(!pausedFrom&&$('intro').hidden&&state.phase==='cells'&&['Space','Enter'].includes(ev.code)){
  ev.preventDefault();unlockAudio();performDivision();return;
 }
 if(['ArrowLeft','KeyA'].includes(ev.code))control('left');
 if(['ArrowRight','KeyD'].includes(ev.code))control('right');
 if(['ArrowUp','KeyW','Space'].includes(ev.code))control('center');
 if(ev.code==='KeyF')control('ability');
 if(ev.code==='Enter'&&!$('intro').hidden)start();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>save(true));
function updateHUD(){
 $('score').textContent=Math.floor(state.score).toLocaleString('ru-RU');
 $('best').textContent=Math.max(best,Math.floor(state.score)).toLocaleString('ru-RU');
 $('planet').textContent='МИР '+(state.planet+1)+' · '+world().name;
 $('worldTrait').textContent=state.phase==='space'||state.phase==='landing'?'Цель: '+world(1).name+' · '+Core.profile(state.planet+1).trait:worldBrief();
 $('divideNext').hidden=state.phase!=='cells'||!$('intro').hidden||!!pausedFrom;
 $('fill').style.width=Core.scoreProgress(state).toFixed(1)+'%';
 const cellStage=state.phase==='cells'||state.phase==='emergence';
 $('controls').style.display=cellStage?'none':'grid';
 $('pause').style.display=state.phase==='intro'?'none':'block';
 $('cellNote').style.display=state.phase==='cells'?'block':'none';
 const selected=Core.specialization(state);
 $('cellNote').textContent=selected?'Специализация: '+selected.name+'. Продолжайте деление.':state.cells.length>=32?'Специализация доступна в меню паузы. Выберите путь или продолжите деление.':'Касайтесь ярких клеток или светлых контуров. Пробел — альтернативное управление.'+(Core.profile(state.planet).cellBonus?' Бонус среды: +'+Core.profile(state.planet).cellBonus+' за деление.':'');
 const runner=state.runner,space=state.space;
 if(cellStage){
  $('mission').textContent='КЛЕТКИ '+state.cells.length+'/'+Core.CELL_GOAL+
   ' · ПОКОЛЕНИЕ '+(state.wave+1)+' · осталось '+state.waveRemaining;
 }else if(state.phase==='runner'||state.phase==='launch'){
  $('mission').textContent=(runner.matrix?'МАТРИЦА · ':'БЕГ · ')+
   Math.round(runner.distance)+'/'+Core.RUN_GOAL+' м · '+runner.portals+' портал(ов)'+
   (runner.shield>0||runner.matrix?' · щит '+runner.shield:'');
 }else if(state.phase==='space'||state.phase==='landing'){
  $('mission').textContent='КОСМОС '+Math.round(space.distance)+'/'+Core.SPACE_GOAL+
   ' · корпус '+space.hull+'/3';
 }
 const active=state.phase==='runner'||state.phase==='space';
 $('center').textContent='';
 $('center').append(document.createTextNode(state.phase==='space'?'↑ УСКОРЕНИЕ':'↑ ПРЫЖОК'));
 $('center').disabled=state.phase==='space'&&space.boostCharges<1;
 const sm=document.createElement('small');
 sm.textContent=state.phase==='space'?'ЗАРЯДЫ: '+space.boostCharges+'/'+boostCapacity():'ЦЕНТР ЭКРАНА';
 $('center').append(sm);
 const showAction=state.phase==='runner'&&runner.matrix;
 $('action').classList.toggle('visible',!!showAction);
 $('action').disabled=!showAction||runner.pulse<1;
 $('action').textContent=showAction?'✦ ИМПУЛЬС · '+runner.pulse:'';
 $('controls').style.display=active?'grid':'none';
 const visible=performance.now()<noticeUntil&&!pausedFrom;
 $('message').textContent=visible?noticeText:'';
 $('message').classList.toggle('show',visible);
}
function gradient(top,bottom){
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,top);g.addColorStop(1,bottom);
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function strokePath(points,color,width=2,close=false){
 ctx.beginPath();
 points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
 if(close)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function ellipse(x,y,rx,ry,fill,stroke){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}
}
const stars=Array.from({length:110},(_,i)=>({
 x:((i*37+19)%101)/101,y:((i*71+7)%103)/103,size:1+(i%3)*.6,
 phase:(i%11)*.34
}));
function drawStars(speed=0,color='#a8d5d8'){
 for(const star of stars){
  const x=star.x*W,y=((star.y*H+state.time*speed*(1+(star.size*.08)))%(H+4));
  ctx.fillStyle=color;ctx.globalAlpha=.3+.5*Math.abs(Math.sin(state.time*.7+star.phase));
  ctx.fillRect(x,y,star.size,star.size);
 }
 ctx.globalAlpha=1;
}
// Organic contour with deterministic variation per cell; no random frame flicker.
function membrane(x,y,rx,ry,id,t,pinch=0){
 const count=32;ctx.beginPath();
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
  const irregular=1+.042*Math.sin(a*3+id*.71+t*1.5)+.027*Math.cos(a*5-id*.37);
  const px=x+c*rx*irregular,py=y+s*ry*irregular*(1-pinch*Math.pow(1-Math.abs(c),2));
  if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
 }
 ctx.closePath();
}
function nucleus(x,y,r,active){
 const g=ctx.createRadialGradient(x-r*.25,y-r*.3,r*.08,x,y,r);
 g.addColorStop(0,active?'#9c8dd4':'#706d9e');g.addColorStop(.55,'#534878');g.addColorStop(1,'#282a50');
 ellipse(x,y,r,r*.89,g,active?'#c0b1ed':'#7f87ab');
 if(r>4)ellipse(x-r*.16,y+r*.1,r*.29,r*.25,'#d9c0ef','#a596c5');
}
function organelle(x,y,r,angle){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 ellipse(0,0,r,r*.43,'#b59d62','#ecd79a');
 if(r>2.5)strokePath([[-r*.6,0],[-r*.3,-r*.22],[0,r*.22],[r*.3,-r*.22],[r*.6,0]],'#705e57',Math.max(.6,r*.11));
 ctx.restore();
}
function cellBody(x,y,r,id,active,t,detail=true){
 const outline=active?'#a6f6d1':'#587c92';
 const fill=ctx.createRadialGradient(x-r*.23,y-r*.26,r*.06,x,y,r*1.08);
 fill.addColorStop(0,active?'#b1debd':'#638b9a');
 fill.addColorStop(.48,active?'#4cae9c':'#345e73');
 fill.addColorStop(1,active?'#144f56':'#20394e');
 if(detail&&r>22){ctx.shadowBlur=12;ctx.shadowColor=outline;}
 membrane(x,y,r,r*.92,id,t);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=outline;ctx.lineWidth=Math.max(.8,Math.min(3,r*.055));ctx.stroke();ctx.shadowBlur=0;
 if(detail&&r>13){
  membrane(x,y,r*.91,r*.84,id,t);ctx.strokeStyle=active?'#d2ffdb77':'#9ab3c455';ctx.lineWidth=Math.max(.8,r*.024);ctx.stroke();
  for(let i=0;i<3;i++){const a=id*.79+i*2.1;organelle(x+Math.cos(a)*r*.57,y+Math.sin(a)*r*.52,r*.16,a+.4);}
  for(let i=0;i<(r>40?15:6);i++){const a=i*2.399+id*.4,d=r*(.43+.29*((i*7)%11)/10);
   ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(.65,r*.024),Math.max(.65,r*.021),active?'#dbf9c688':'#a4c8d477');
  }
 }
 nucleus(x-r*.08,y+r*.045,Math.max(1.7,r*.30),active);
}
function lerp(a,b,t){return a+(b-a)*t;}
function smooth(t){return t*t*(3-2*t);}
function cellRadius(c,b){return Math.min(b.w,b.h)*c.r*1.05;}
function chromosome(x,y,r,a){
 const dx=Math.cos(a)*r,dy=Math.sin(a)*r;
 strokePath([[x-dx,y-dy],[x+dx,y+dy]],'#e6c7ff',Math.max(1,r*.32));
 strokePath([[x+dy,y-dx],[x-dy,y+dx]],'#d8aef7',Math.max(1,r*.32));
}
function drawDivision(e,children,b){
 const p=Math.max(0,Math.min(1,(state.time-e.start)/e.duration));
 const parent=e.parent,oldR=cellRadius(parent,b),r=cellRadius(children[0],b);
 const ax=b.x+children[0].x*b.w,ay=b.y+children[0].y*b.h,bx=b.x+children[1].x*b.w,by=b.y+children[1].y*b.h;
 const cx=lerp(b.x+parent.x*b.w,(ax+bx)/2,smooth(p)),cy=lerp(b.y+parent.y*b.h,(ay+by)/2,smooth(p));
 const angle=Math.atan2(by-ay,bx-ax);
 const detailed=oldR>=18;
 // Target rings preserve spatial feedback while accepting another tap immediately.
 for(const c of children)if(c.active){
  ctx.save();ctx.globalAlpha=.55;ellipse(b.x+c.x*b.w,b.y+c.y*b.h,r,r*.93,null,'#bbffe1');ctx.restore();
 }
 if(p<.69){
  const k=smooth(p/.69),rx=lerp(oldR,2*r,k),ry=lerp(oldR*.92,r*.92,k);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
  const grad=ctx.createRadialGradient(-rx*.2,-ry*.2,1,0,0,Math.max(rx,ry)*1.05);
  grad.addColorStop(0,'#b4e6c4');grad.addColorStop(.55,'#4cae9c');grad.addColorStop(1,'#17545d');
  membrane(0,0,rx,ry,parent.id,state.time,.94*smooth(Math.max(0,(p-.25)/.44)));
  ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='#baffde';ctx.lineWidth=Math.max(1,Math.min(3,r*.045));ctx.stroke();
  const nr=Math.max(1.8,ry*.29);
  if(p<.16)nucleus(0,0,nr,true);
  else if(p<.48&&detailed){
   const split=smooth(Math.max(0,(p-.22)/.26))*rx*.46;
   for(let i=0;i<3;i++){
    const y=(i-1)*nr*.58;
    chromosome(-split,y,nr*.27,i*.65+.2);
    chromosome(split,y,nr*.27,-i*.65-.2);
   }
  }else{
   const separation=rx*.49*smooth(Math.min(1,(p-.15)/.4));
   nucleus(-separation,0,nr,true);nucleus(separation,0,nr,true);
  }
  ctx.restore();
 }else{
  const k=smooth((p-.69)/.31),dx=Math.cos(angle)*r*.92,dy=Math.sin(angle)*r*.92;
  cellBody(lerp(cx-dx,ax,k),lerp(cy-dy,ay,k),r,children[0].id,children[0].active,state.time,detailed);
  cellBody(lerp(cx+dx,bx,k),lerp(cy+dy,by,k),r,children[1].id,children[1].active,state.time,detailed);
 }
 return p;
}
function drawCells(){
 gradient(world().cell,'#04101b');
 drawStars(reducedMotion?.matches?0:2);
 const b=cellBoard();
 // Microscope-like field, with gentle illumination rather than a solid grid.
 const field=ctx.createRadialGradient(W/2,b.y+b.h/2,b.w*.08,W/2,b.y+b.h/2,b.w*.72);
 field.addColorStop(0,'#174447');field.addColorStop(.7,'#0c292f');field.addColorStop(1,'#071a26');
 ctx.fillStyle=field;ctx.strokeStyle='#397c76';ctx.lineWidth=1.5;
 ctx.fillRect(b.x-8,b.y-8,b.w+16,b.h+16);ctx.strokeRect(b.x-8,b.y-8,b.w+16,b.h+16);
 const positions=Core.cellPositions(state),n=positions.length,byId=new Map(positions.map(c=>[c.id,c]));
 divisionEffects=reducedMotion?.matches?[]:divisionEffects.filter(e=>state.time-e.start<e.duration&&e.ids.every(id=>byId.has(id)));
 const animated=new Set(divisionEffects.flatMap(e=>e.ids));
 for(const c of positions){
  if(animated.has(c.id))continue;
  const x=b.x+c.x*b.w,y=b.y+c.y*b.h;
  const pulse=reducedMotion?.matches?1:1+.025*Math.sin(state.time*3+c.id*.34);
  cellBody(x,y,cellRadius(c,b)*pulse,c.id,c.active,reducedMotion?.matches?0:state.time,n<=64);
 }
 let stage='';
 for(const e of divisionEffects){
  const p=drawDivision(e,e.ids.map(id=>byId.get(id)),b);
  if(n<=32)stage=p<.16?'Подготовка к делению':p<.48?'Разделение хромосом':p<.69?'Перетяжка мембраны':'Две дочерние клетки';
 }
 ctx.textAlign='center';ctx.fillStyle='#bcffe3';ctx.font='bold 12px system-ui';
 ctx.fillText('ДЕЛЕНИЕ · '+state.divisions+' касаний',W/2,b.y-22);
 ctx.fillStyle='#b6e3d6';ctx.font='11px system-ui';
 ctx.fillText(stage||'Касайтесь ярких клеток и их контуров',W/2,b.y+b.h+26);
}
function matrixRain(){
 ctx.save();ctx.font='13px monospace';ctx.textAlign='center';
 for(let i=0;i<37;i++){
  const x=((i*37)%101)/101*W;
  for(let j=0;j<5;j++){
   const y=((state.time*(55+i%9*8)+i*33-j*24)%(H+90))-20;
   ctx.globalAlpha=j===0?.37:.1;ctx.fillStyle='#77ff9e';
   ctx.fillText(((i+j+Math.floor(state.time*6))%3===0?'1':'0'),x,y);
  }
 }
 ctx.restore();
}
function roadGeometry(){
 const roadWidth=Math.min(W*.78,420);
 return {left:W/2-roadWidth/2,width:roadWidth,centerY:H*.72,
  pitch:Math.max(1.9,Math.min(3.6,H/230))};
}
function xForLane(l,road){return W/2+l*road.width/3;}
function drawHuman(x,y,sz,form='runner'){
 ctx.save();
 const k=Math.max(17,sz),t=state.time;
 const wobble=Math.sin(t*13)*3;
 ellipse(x,y+8,k*.38,k*.13,'#0008');
 ctx.strokeStyle='#9affe0';ctx.lineWidth=k*.13;ctx.lineCap='round';
 strokePath([[x-k*.17,y-k*.15],[x-k*.27,y+k*.37+wobble]],'#8ef4c1',k*.15);
 strokePath([[x+k*.17,y-k*.15],[x+k*.29,y+k*.37-wobble]],'#8ef4c1',k*.15);
 ellipse(x,y-k*.20,k*.32,k*.39,'#2f8b7f','#9fffd0');
 strokePath([[x-k*.29,y-k*.4],[x-k*.52,y-k*.07-wobble]],'#caffd7',k*.13);
 strokePath([[x+k*.29,y-k*.4],[x+k*.52,y-k*.07+wobble]],'#caffd7',k*.13);
 ellipse(x,y-k*.75,k*.35,k*.35,'#c7b696','#d0ffdb');
 ctx.fillStyle='#1a3033';ctx.beginPath();ctx.arc(x,y-k*.83,k*.33,Math.PI,Math.PI*2);ctx.fill();
 for(const delta of [-.15,.15]){
  ellipse(x+delta*k,y-k*.72,k*.115,k*.115,'#07141c','#f3ffe2');
 }
 ctx.restore();
}
function drawPortal(x,y,width){
 ctx.save();ctx.shadowColor='#75ffb6';ctx.shadowBlur=20;
 ctx.strokeStyle='#78ffd0';ctx.lineWidth=Math.max(3,width*.09);
 ctx.beginPath();ctx.ellipse(x,y,width*.42,width*.9,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#c1ffce';ctx.font='bold 12px monospace';ctx.textAlign='center';
 ctx.fillText('01',x,y+4);ctx.restore();
}
function drawRunner(){
 const r=state.runner;
 gradient(r.matrix?'#071d17':world().run,r.matrix?'#042920':'#10273a');
 if(r.matrix)matrixRain();else drawStars(13,'#8dcce7');
 const road=roadGeometry(),left=road.left,right=left+road.width;
 ctx.fillStyle=r.matrix?'#0a352b':world().road;
 ctx.fillRect(left,-30,road.width,H+60);
 for(let i=0;i<4;i++){
  const x=left+i*road.width/3;
  ctx.beginPath();ctx.moveTo(x,-40);ctx.lineTo(x,H+40);
  ctx.strokeStyle=(i===0||i===3)?(r.matrix?'#86ffaf':'#89d9e0'):'#4b8c8d';
  ctx.lineWidth=i===0||i===3?3:1;ctx.stroke();
 }
 const offset=r.distance%14*road.pitch;
 ctx.fillStyle=r.matrix?'#245d48':'#2a5774';
 for(let y=-25+offset;y<H;y+=14*road.pitch){
  for(let j=1;j<3;j++){
   const x=left+j*road.width/3;
   ctx.fillRect(x-1,y,2,Math.min(17,road.pitch*5));
  }
 }
 const visible=r.entities.filter(o=>!o.done&&o.at>=r.distance-12&&o.at<r.distance+200)
  .sort((a,b)=>b.at-a.at);
 for(const o of visible){
  const y=road.centerY-(o.at-r.distance)*road.pitch,x=xForLane(o.lane,road);
  if(y<-80||y>H+90)continue;
  if(o.type==='portal'){drawPortal(x,y-18,35);continue;}
  if(o.type==='rocket'){
   drawRocket(x,y,35);continue;
  }
  const typeColor=o.type==='agent'?'#fa82a9':o.type==='step'?'#ffd895':'#ffa38a';
  ctx.fillStyle=typeColor;ctx.strokeStyle='#eaffef';ctx.lineWidth=2;
  const bw=road.width/3*.58;
  if(o.type==='bar'){
   ctx.fillRect(x-bw/2,y-17,bw,15);ctx.strokeRect(x-bw/2,y-17,bw,15);
  }else if(o.type==='agent'){
   ellipse(x,y-14,15,15,'#3c233f','#ff86b0');
   ellipse(x-5,y-17,3,3,'#ff6d97');ellipse(x+5,y-17,3,3,'#ff6d97');
  }else{
   ctx.fillRect(x-bw/2,y-24,bw,o.type==='step'?18:27);
   ctx.strokeRect(x-bw/2,y-24,bw,o.type==='step'?18:27);
  }
 }
 const px=xForLane(r.lane,road),py=road.centerY-r.jump*24;
 drawHuman(px,py,43);
 if(r.shield>0||r.invulnerable>0){
  ctx.save();ctx.globalAlpha=.45+.2*Math.sin(state.time*8);ellipse(px,py-15,34,50,null,r.shield>0?'#96ffd4':'#ffe0a0');ctx.restore();
 }
 if(r.matrix){
  ctx.fillStyle='#b6ffbc';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText('ПОРТАЛЫ '+r.portals+'  •  ЩИТ '+r.shield+'  •  ИМПУЛЬС '+r.pulse,W/2,H*.18);
 }
}
function drawRocket(x,y,sz){
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#e5f4ef';ctx.strokeStyle='#afffcf';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(0,-sz*1.7);ctx.lineTo(sz*.4,-sz*.15);
 ctx.lineTo(sz*.36,sz*.9);ctx.lineTo(-sz*.36,sz*.9);
 ctx.lineTo(-sz*.4,-sz*.15);ctx.closePath();ctx.fill();ctx.stroke();
 ellipse(0,-sz*.4,sz*.14,sz*.16,'#265973');
 ctx.fillStyle='#ffbf71';ctx.beginPath();ctx.moveTo(-sz*.18,sz*.9);
 ctx.lineTo(0,sz*1.7);ctx.lineTo(sz*.18,sz*.9);ctx.fill();
 ctx.restore();
}
function drawSpace(){
 const p=state.space;
 gradient(world().sky,'#081829');drawStars(p.boostTime>0?155:72,'#fff');
 if(p.distance>Core.SPACE_GOAL-250){
  const size=Math.max(20,Math.min(100,(p.distance-(Core.SPACE_GOAL-250))*.37));
  const pg=ctx.createRadialGradient(W*.54,H*.17,8,W*.54,H*.17,size);
  pg.addColorStop(0,world(1).planet);pg.addColorStop(.7,'#1d7b8d');pg.addColorStop(1,'#174452');
  ellipse(W*.54,H*.17,size,size,pg,world(1).rim);
 }
 const road=roadGeometry(),pitch=road.pitch;
 for(const a of p.asteroids.filter(x=>!x.done&&x.at>p.distance-18&&x.at<p.distance+190).sort((a,b)=>b.at-a.at)){
  const x=xForLane(a.lane,road),y=H*.73-(a.at-p.distance)*pitch;
  const r=Math.max(12,17*a.size);
  ctx.save();ctx.translate(x,y);ctx.rotate(a.at*.017+state.time*.6);
  ctx.fillStyle='#836f77';ctx.strokeStyle='#c4b1a3';ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<9;i++){const t=i/9*Math.PI*2,rr=r*(.76+.16*Math.cos(i*19));
   if(i===0)ctx.moveTo(Math.cos(t)*rr,Math.sin(t)*rr);
   else ctx.lineTo(Math.cos(t)*rr,Math.sin(t)*rr);
  }
  ctx.closePath();ctx.fill();ctx.stroke();
  ellipse(-r*.25,-r*.12,r*.23,r*.19,'#4b4553');
  ellipse(r*.22,r*.27,r*.14,r*.10,'#4b4553');ctx.restore();
 }
 const sx=xForLane(p.lane,road),sy=H*.73;
 drawRocket(sx,sy,36);
 if(p.invulnerable>0){ctx.save();ctx.globalAlpha=.55;ellipse(sx,sy-10,29,70,null,'#90e8ff');ctx.restore();}
 if(p.boostTime>0){
  ctx.save();ctx.shadowColor='#9affa7';ctx.shadowBlur=26;
  ellipse(sx,sy+60,8,28,'#b9ff92');ctx.restore();
 }
 ctx.fillStyle='#c1ffda';ctx.textAlign='center';ctx.font='bold 12px monospace';
 ctx.fillText('КОРАБЛЬ · КОРПУС '+p.hull+'/3  · УСКОРЕНИЯ '+p.boostCharges,W/2,H*.19);
}
function transitionScreen(phase){
 const emerging=phase==='emergence',launch=phase==='launch';
 gradient(emerging?'#123d44':launch?'#08172b':'#072b34','#02101d');
 drawStars(launch?50:12);
 const cx=W/2,cy=H*.45;
 if(emerging){
  for(let i=0;i<Math.min(64,state.cells.length);i++){
   const a=i*Math.PI*2/64,t=1+Math.sin(state.time*3+i)*.08;
   ellipse(cx+Math.cos(a)*W*.27*t,cy+Math.sin(a)*W*.27*t,5,5,'#61e4b9');
  }
  drawHuman(cx,cy+65,72);
 }else if(launch){drawRocket(cx,cy+60,80);}
 else{
  const radius=Math.min(96,W*.26,H*.20),pg=ctx.createRadialGradient(cx-radius*.3,cy-radius*.3,2,cx,cy,radius);
  pg.addColorStop(0,world(1).planet);pg.addColorStop(1,'#173a55');
  ellipse(cx,cy,radius,radius,pg,world(1).rim);
  ctx.save();ctx.globalAlpha=.45;ellipse(cx+radius*.2,cy-radius*.1,radius*.51,radius*.37,world(1).rim);ctx.restore();
 }
 ctx.fillStyle='#dcffee';ctx.textAlign='center';ctx.font='bold 20px system-ui';
 ctx.fillText(emerging?'ЧЕЛОВЕК · НОВЫЙ УРОВЕНЬ':launch?'ПОЛЁТ К НОВОЙ ПЛАНЕТЕ':world(1).name.toUpperCase()+' · НОВЫЙ ЦИКЛ',cx,H*.78);
 if(phase==='landing'){
  const last=state.chronicle?.[state.chronicle.length-1];
  if(last?.planet===state.planet){ctx.font='bold 13px system-ui';ctx.fillText('ЦИКЛ ЗАВЕРШЁН · БОНУС +'+last.bonus,cx,H*.82);}
 }
}
function render(){
 if(state.phase==='intro'){gradient('#061629','#020713');drawStars(14);return;}
 if(state.phase==='cells'||(state.phase==='emergence'&&divisionEffects.some(e=>state.time-e.start<e.duration)))drawCells();
 else if(['emergence','launch','landing'].includes(state.phase))transitionScreen(state.phase);
 else if(state.phase==='runner')drawRunner();
 else if(state.phase==='space')drawSpace();
}
function reactions(events){
 for(const e of events){
  if(e==='newwave'){message('ПОКОЛЕНИЕ '+(state.wave+1)+' · НОВОЕ ДЕЛЕНИЕ',1050);feel('medium');}
  if(e==='specializationUnlocked'){message('32 КЛЕТКИ · ВЫБЕРИТЕ СПЕЦИАЛИЗАЦИЮ В ПАУЗЕ',2600);feel('medium');}
  if(e==='emergence'){feel('heavy');}
  if(e==='human'){message('ЧЕЛОВЕК · БЕГИ К ПОРТАЛУ',2300);feel('heavy');}
  if(e==='portal'){message('КОД МАТРИЦЫ · ЩИТ И ИМПУЛЬС АКТИВИРОВАНЫ',2200);feel('heavy');}
  if(e==='shield'){message('ЩИТ ПОГЛОТИЛ УДАР',900);feel('medium');}
  if(e==='collision'){message('ПРЕПЯТСТВИЕ! ПРОБУЙ ДРУГУЮ ПОЛОСУ',850);feel('medium');}
  if(e==='rocket'){message('РАКЕТА · ВЗЛЁТ!',2500);feel('heavy');save(true);}
  if(e==='space'){message('ОБЛЕТАЙ АСТЕРОИДЫ · ЦЕНТР ДАЁТ УСКОРЕНИЕ',2400);feel('heavy');}
  if(e==='asteroidHit'){message('УДАР АСТЕРОИДА · МАНЕВРИРУЙ',1000);feel('medium');}
  if(e==='checkpoint'){message('ВОССТАНОВЛЕН КОРАБЛЬ · ПРОДОЛЖАЙ',1250);}
  if(e==='planetReached'){message('ПОСАДКА · '+world(1).name.toUpperCase(),2600);feel('heavy');save(true);}
  if(e==='newPlanet'){message(world().name.toUpperCase()+' · '+worldBrief(),3000);feel('heavy');save(true);}
 }
}
function frame(now){
 const dt=frameLast?Math.min(.045,(now-frameLast)/1000):0;
 frameLast=now;
 if(!pausedFrom&&$('intro').hidden&&state.phase!=='intro'){
  // Accumulate substeps: no skipped hazards during low frame rate.
  const steps=Math.ceil(dt/(1/60))||1;
  for(let i=0;i<steps;i++){
   const events=Core.step(state,dt/steps);
   if(events.length)reactions(events);
  }
 }
 render();
 if(now-hudLast>115){updateHUD();hudLast=now;save(false);}
 requestAnimationFrame(frame);
}
updateHUD();
requestAnimationFrame(frame);
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();