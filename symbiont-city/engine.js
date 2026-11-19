/* SYMBIONT · City of Decisions, pure state engine.
 * Optional local educational game, no assessment or human labeling.
 */
(function(root){
'use strict';
const DATA=(typeof module!=='undefined'&&module.exports)?require('./content.js'):root.SymbiontCityContent;
if(!DATA)throw Error('SymbiontCityContent not loaded');
const MIN_AGE=0,MAX_AGE=110;
const keyOrder=['garden','bridge','library','workshop','dialogue','tower','cave'];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function ageProfile(age,challenge='auto'){
 const requested=Number(age);
 const clean=Number.isInteger(requested)?clamp(requested,MIN_AGE,MAX_AGE):8;
 const delta=challenge==='gentle'?-1:challenge==='stretch'?1:0;
 // Adapt task complexity, but never use toddler guidance for a preschooler
 // or teen examples for an adult merely because support was selected.
 const bounds=clean<=2?[0,2]:clean<=5?[3,5]:
  clean<=11?[6,11]:clean<=17?[12,17]:[18,110];
 const effective=clamp(clean+delta,bounds[0],bounds[1]);
 const stage=clean<=5?'early':clean<=11?'school':clean<=17?'teen':clean<60?'adult':'senior';
 let source;
 if(effective<=5)source=DATA.earlyProfiles[effective];
 else if(effective<=11)source=DATA.ages[effective];
 else if(effective<=17)source=DATA.teenProfiles[effective];
 else{
  const band=DATA.adultProfiles.find(p=>clean>=p.min&&clean<=p.max)||
   DATA.adultProfiles[DATA.adultProfiles.length-1];
  source={label:band.label,sentences:4,
   options:challenge==='gentle'?3:4,
   sequence:challenge==='gentle'?3:5,
   memory:challenge==='gentle'?4:challenge==='stretch'?6:5,
   budget:challenge==='gentle'?7:challenge==='stretch'?10:8,
   voices:2,scaffold:'Выбирай решения в своём темпе. Трудность можно менять независимо от возраста.',
   focus:band.focus};
 }
 return {age:clean,effective,challenge,stage,
  coPlayOnly:clean<=2,coPlay:clean>=3&&clean<=5,profile:source};
}
function initial(age=8){
 const a=ageProfile(age);
 return {version:1,age:a.age,challenge:'auto',completed:{},best:{},
  points:0,skillPoints:Object.fromEntries(DATA.districts.map(x=>[x.skill,0])),
  locations:[],current:null,attempts:0,createdAt:0,revision:1};
}
function isValidState(state){
 if(!state||state.version!==1||typeof state.completed!=='object'||!state.completed||Array.isArray(state.completed))return false;
 if(!Number.isInteger(state.age)||state.age<MIN_AGE||state.age>MAX_AGE)return false;
 if(!['auto','gentle','stretch'].includes(state.challenge))return false;
 if(!Number.isFinite(state.points)||state.points<0||state.points>1000000)return false;
 if(!state.skillPoints||typeof state.skillPoints!=='object')return false;
 if(!state.locations||!Array.isArray(state.locations))return false;
 for(const [id,item] of Object.entries(state.completed)){
  if(!DATA.missions.some(m=>m.id===id)||!item||!Number.isFinite(item.points)||item.points<0||item.points>400)return false;
 }
 return true;
}
function restore(raw){
 if(!isValidState(raw))return null;
 const state=initial(raw.age);
 state.challenge=raw.challenge;
 const completed={};
 for(const id of Object.keys(raw.completed)){
  const m=DATA.missions.find(item=>item.id===id);
  if(!m)continue;
  // Secondary district missions cannot be trusted without the first.
  if(m.id.endsWith('-2')&&!raw.completed[m.district+'-1'])continue;
  completed[id]={points:clamp(Math.floor(raw.completed[id].points),0,400),
    quality:clamp(Math.floor(raw.completed[id].quality||1),0,3)};
 }
 state.completed=completed;
 recompute(state);
 return state;
}
function recompute(state){
 state.points=0;
 state.skillPoints=Object.fromEntries(DATA.districts.map(x=>[x.skill,0]));
 state.locations=[];
 for(const m of DATA.missions){
  const done=state.completed[m.id];
  if(!done)continue;
  state.points+=done.points;
  const district=DATA.districts.find(d=>d.id===m.district);
  state.skillPoints[district.skill]+=done.points;
  if(!state.locations.includes(m.district))state.locations.push(m.district);
 }
 return state;
}
function setAge(state,age){
 const a=ageProfile(age);
 state.age=a.age;
 return a;
}
function setChallenge(state,v){
 if(!['auto','gentle','stretch'].includes(v))return false;
 state.challenge=v;return true;
}
function nextMission(state,districtId){
 const set=DATA.byDistrict[districtId];if(!set)return null;
 return set.find(m=>!state.completed[m.id])||null;
}
function currentMission(state,districtId){
 const list=DATA.byDistrict[districtId];
 if(!list)return null;
 return nextMission(state,districtId)||list[list.length-1];
}
function progress(state){
 const done=Object.keys(state.completed).length;
 return {done,total:DATA.missions.length,percent:Math.round(done/DATA.missions.length*100),
  districts:DATA.districts.filter(d=>DATA.byDistrict[d.id].every(m=>state.completed[m.id])).length,
  points:state.points};
}
function missionView(state,mission){
 const age=ageProfile(state.age,state.challenge);
 const ix=clamp(age.effective-6,0,5),kind=mission.kind;
 const variants=DATA.lifeContexts[mission.id];
 const alternate=age.stage==='teen'?variants?.teen:age.stage==='adult'?variants?.adult:age.stage==='senior'?variants?.senior:null;
 const data={id:mission.id,district:mission.district,title:mission.title,
  kind,situation:alternate||mission.situation[ix],reflect:mission.reflect,takeaway:mission.takeaway,
  age,skill:DATA.districts.find(x=>x.id===mission.district).skill};
 if(kind==='dialogue'){
  const optionCount=age.effective<=6?2:age.effective<=8?3:age.profile.options;
  const entries=mission.choices.slice(0,optionCount);
  data.choices=entries.map(([label,quality,feedback])=>({label,quality,feedback}));
 }
 if(kind==='sequence'){
  const count=age.profile.sequence;data.steps=mission.steps.slice(0,count);
 }
 if(kind==='focus'){
  data.symbols=mission.symbols.slice(0,age.profile.memory);
  data.options=mission.symbols.slice(0,Math.max(4,age.profile.memory));
 }
 if(kind==='evidence'){
  const count=age.profile.options;data.sources=mission.sources.slice(0,count).map(([label,reliable,feedback])=>({label,reliable,feedback}));
 }
 if(kind==='design'){
  const count=age.effective<=5?2:age.effective<=7?3:age.profile.options;
  data.parts=mission.parts.slice(0,count).map(([label,suitable,feedback])=>({label,suitable,feedback}));
 }
 if(kind==='perspectives'){
  const count=age.effective<=5?2:age.effective<=7?3:4;
  data.perspectives=(age.effective<=5?
   mission.perspectives.filter(item=>item[1]):mission.perspectives).slice(0,count).map(([label,useful])=>({label,useful}));
 }
 if(kind==='resources'){
  const total=age.profile.budget;
  data.total=total;
  // These thresholds use at most the available resources at each age.
  data.minimums=[Math.ceil(total*.35),Math.max(1,Math.floor(total*.20)),Math.max(1,Math.floor(total*.20))];
  data.labels=mission.labels;
 }
 return data;
}
function shuffleIndices(n,seed=0){
 const idx=Array.from({length:n},(_,i)=>i);
 // A guaranteed non-identity permutation for n>=2; no RNG/network needed.
 const start=n?Math.abs(Math.trunc(seed))%n:0;
 const out=idx.slice().reverse();
 if(start>0)out.push(...out.splice(0,start));
 if(n>1&&out.every((v,i)=>v===i))out.reverse();
 return out;
}
function newChallenge(view){
 const c={id:view.id,kind:view.kind,attempts:0,done:false,
   chosen:null,feedback:'',quality:0,earned:0};
 if(view.kind==='sequence'){c.sequence=[];c.order=shuffleIndices(view.steps.length,view.id.length);}
 if(view.kind==='focus'){c.focusInput=[];c.focusVisible=false;c.focusUsed=0;}
 if(view.kind==='resources'){c.allocation=[0,0,0];}
 if(view.kind==='perspectives'||view.kind==='design'){c.selected=[];}
 return c;
}
function answerChoice(c,view,index){
 if(c.done||!Number.isInteger(index))return null;
 const items=view.kind==='dialogue'?view.choices:view.kind==='evidence'?view.sources:null;
 if(!items||index<0||index>=items.length)return null;
 c.attempts++;
 c.chosen=index;
 const item=items[index];
 if(view.kind==='dialogue'){
  c.quality=c.attempts===1?item.quality:Math.min(item.quality,2);
  c.feedback=item.feedback;
  c.done=item.quality>=2;
  if(!c.done)c.feedback+=' Можно попробовать другой ответ без штрафа.';
  return {complete:c.done,feedback:c.feedback,quality:c.quality};
 }
 c.feedback=item.feedback;
 if(item.reliable){c.done=true;c.quality=c.attempts===1?3:2;}
 return {complete:c.done,feedback:item.feedback,quality:c.quality};
}
function chooseSequence(c,view,index){
 if(c.done||view.kind!=='sequence'||!Number.isInteger(index)||index<0||index>=view.steps.length)return null;
 if(c.sequence.includes(index))return null;
 c.attempts++;
 if(index!==c.sequence.length){
  c.feedback='Попробуй сначала выяснить, какое действие должно предшествовать остальным.';
  return {complete:false,feedback:c.feedback,quality:0};
 }
 c.sequence.push(index);
 c.feedback='Хороший порядок. '+(c.sequence.length<view.steps.length?'Что должно быть следующим?':'План готов.');
 if(c.sequence.length===view.steps.length){
  c.done=true;c.quality=c.attempts===view.steps.length?3:2;
 }
 return {complete:c.done,feedback:c.feedback,quality:c.quality};
}
function togglePart(c,view,index){
 const list=view.kind==='design'?view.parts:view.kind==='perspectives'?view.perspectives:null;
 if(!list||c.done||!Number.isInteger(index)||index<0||index>=list.length)return false;
 const found=c.selected.indexOf(index);
 if(found>=0)c.selected.splice(found,1);
 else if(c.selected.length<2)c.selected.push(index);
 return true;
}
function checkParts(c,view){
 if(c.done||c.selected.length!==2)return null;
 c.attempts++;
 const list=view.kind==='design'?view.parts:view.perspectives;
 const good=c.selected.every(i=>view.kind==='design'?list[i].suitable:list[i].useful);
 if(good){
  c.done=true;c.quality=c.attempts===1?3:2;
  c.feedback='Оба компонента помогают учесть безопасность или интересы участников.';
 }else c.feedback='Некоторые выбранные элементы мешают решению. Проверь последствия каждого.';
 return {complete:c.done,feedback:c.feedback,quality:c.quality};
}
function adjustResources(c,view,index,delta){
 if(c.done||view.kind!=='resources'||!Number.isInteger(index)||index<0||index>2||![-1,1].includes(delta))return false;
 const used=c.allocation.reduce((a,b)=>a+b,0);
 if(delta===1&&used>=view.total||delta===-1&&c.allocation[index]===0)return false;
 c.allocation[index]+=delta;return true;
}
function checkResources(c,view){
 if(view.kind!=='resources'||c.done)return null;
 c.attempts++;
 const used=c.allocation.reduce((a,b)=>a+b,0);
 const good=used===view.total&&c.allocation.every((v,i)=>v>=view.minimums[i]);
 if(good){
  c.done=true;c.quality=c.attempts===1?3:2;
  c.feedback='Все критические потребности обеспечены. Остаток ресурсов распределён.';
 }else c.feedback='Проверь: весь ресурс нужно распределить, но ни одна из основных потребностей не должна остаться без минимума.';
 return {complete:good,feedback:c.feedback,quality:c.quality};
}
function focusTap(c,view,icon){
 if(view.kind!=='focus'||c.done||c.focusVisible||!view.options.includes(icon))return null;
 const expected=view.symbols[c.focusInput.length];
 c.attempts++;
 if(icon!==expected){
  c.focusInput=[];c.feedback='Порядок не совпал. Посмотри на последовательность ещё раз; это тренировка, а не экзамен.';
  return {complete:false,feedback:c.feedback,quality:0,reset:true};
 }
 c.focusInput.push(icon);
 if(c.focusInput.length===view.symbols.length){
  c.done=true;c.quality=c.attempts===view.symbols.length?3:2;
  c.feedback='Получилось! Ты воспроизвёл порядок символов.';
 }
 return {complete:c.done,feedback:c.feedback,quality:c.quality};
}
function scoreResult(view,c){
 // Completion rewards progress/effort; bonus tracks a process in this game only.
 const base=45,bonus=c.quality===3?35:c.quality===2?24:c.quality===1?12:6;
 return {points:base+bonus,quality:c.quality};
}
function complete(state,view,c){
 if(!c.done||state.completed[view.id])return false;
 const receipt=scoreResult(view,c);
 state.completed[view.id]=receipt;
 recompute(state);
 return receipt;
}
const api={DATA,ageProfile,initial,isValidState,restore,recompute,setAge,setChallenge,
 nextMission,currentMission,progress,missionView,newChallenge,answerChoice,chooseSequence,
 togglePart,checkParts,adjustResources,checkResources,focusTap,complete,scoreResult,
 shuffleIndices};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontCityEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
