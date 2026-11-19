/* SYMBIONT CITY · Play Workshops v3
 * Pure deterministic mechanics: memory, visual attention and bridge sequencing.
 * No player profile, diagnosis, telemetry or outside requests.
 */
(function(root){
'use strict';
const TYPES=['memory','attention','bridge'];
const GLYPHS=['✦','◆','☀','☘','★','♫','▲','☯','♟','✿','☂','◈'];
const BUILD=[
 {id:'survey',symbol:'⌕',name:'Изучить место',why:'Проверка условий помогает понять, где можно строить безопасно.'},
 {id:'supports',symbol:'▥',name:'Поставить опоры',why:'Опоры устанавливают до настила: иначе настил не на что положить.'},
 {id:'deck',symbol:'▰',name:'Уложить настил',why:'Настил соединяет береговые опоры и образует переход.'},
 {id:'test',symbol:'✓',name:'Проверить прочность',why:'Перед использованием нужно проверить готовую конструкцию.'}
];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function ageBand(age){
 const n=Number(age);
 if(!Number.isInteger(n)||n<0||n>110)return 'school';
 return n<=2?'caregiver':n<=5?'preschool':n<=8?'junior':n<=12?'school':n<=17?'teen':'adult';
}
function settings(age,challenge='auto'){
 const band=ageBand(age),support=challenge==='gentle'?-1:challenge==='stretch'?1:0;
 const pairs={caregiver:0,preschool:3,junior:4,school:5,teen:6,adult:5}[band];
 const cells={caregiver:0,preschool:4,junior:6,school:8,teen:10,adult:8}[band];
 const rounds={caregiver:0,preschool:3,junior:4,school:4,teen:5,adult:4}[band];
 return {band,age:Number(age),pairs:band==='caregiver'?0:clamp(pairs+support,2,8),
  cells:band==='caregiver'?0:clamp(cells+support*2,4,12),
  rounds:band==='caregiver'?0:clamp(rounds+support,2,6),
  cooperative:band==='caregiver'||band==='preschool',
  challenge:['gentle','auto','stretch'].includes(challenge)?challenge:'auto'};
}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function integer(s,n){return Math.floor(random(s)*n);}
function shuffle(s,a){
 const items=a.slice();
 for(let i=items.length-1;i>0;i--){const j=integer(s,i+1);[items[i],items[j]]=[items[j],items[i]];}
 return items;
}
function newGame(type,age=8,challenge='auto',seed=2026){
 if(!TYPES.includes(type))return null;
 const profile=settings(age,challenge),s={version:1,type,profile,seed:(Number.isInteger(seed)?seed:2026)>>>0,
  status:profile.band==='caregiver'?'caregiver':'playing',mistakes:0,steps:0,message:'',board:[],
  selected:[],matched:[],waiting:false,index:0,total:0,found:0};
 if(s.status==='caregiver')return s;
 if(type==='memory'){
  const symbols=shuffle(s,GLYPHS).slice(0,profile.pairs);
  s.board=shuffle(s,symbols.flatMap((symbol,i)=>[
    {id:i*2,symbol,pair:i},{id:i*2+1,symbol,pair:i}
  ]));s.total=profile.pairs;
 }else if(type==='attention'){
  s.total=profile.rounds;s.rounds=[];
  for(let round=0;round<profile.rounds;round++){
   const pool=shuffle(s,GLYPHS),target=pool[0];
   const items=shuffle(s,pool.slice(0,profile.cells));
   s.rounds.push({target,items});
  }
 }else{
  s.total=BUILD.length;
  s.board=shuffle(s,BUILD.map(x=>({id:x.id,symbol:x.symbol,name:x.name,why:x.why})));
 }
 return s;
}
function finish(s){
 if(s.index>=s.total){
  s.status='complete';s.message='Задание завершено. Можно сравнить стратегии и повторить в своём темпе.';
 }
}
function memoryPick(s,index){
 if(!s||s.type!=='memory'||s.status!=='playing'||s.waiting||
  !Number.isInteger(index)||index<0||index>=s.board.length)return null;
 const card=s.board[index];
 if(s.matched.includes(card.pair)||s.selected.includes(index))return null;
 s.selected.push(index);s.steps++;
 if(s.selected.length===1)return {kind:'first',symbol:card.symbol};
 const [a,b]=s.selected;
 if(s.board[a].pair===s.board[b].pair){
  s.matched.push(card.pair);s.found++;s.index=s.found;s.selected=[];finish(s);
  return {kind:'matched',symbol:card.symbol,complete:s.status==='complete'};
 }
 s.mistakes++;s.waiting=true;
 return {kind:'mismatch',message:'Пары разные. Запомни их положение и закрой, когда будешь готов.'};
}
function closePair(s){
 if(!s||s.type!=='memory'||s.status!=='playing'||!s.waiting)return false;
 s.selected=[];s.waiting=false;return true;
}
function attentionPick(s,index){
 if(!s||s.type!=='attention'||s.status!=='playing'||!Number.isInteger(index))return null;
 const round=s.rounds[s.index];
 if(!round||index<0||index>=round.items.length)return null;
 s.steps++;
 if(round.items[index]!==round.target){
  s.mistakes++;
  return {kind:'try',message:'Не совпало. Рассмотри символы и попробуй ещё раз.'};
 }
 s.index++;s.found++;finish(s);
 return {kind:'found',complete:s.status==='complete'};
}
function bridgePick(s,id){
 if(!s||s.type!=='bridge'||s.status!=='playing'||typeof id!=='string')return null;
 const step=s.board.find(x=>x.id===id);
 if(!step)return null;
 s.steps++;
 const required=BUILD[s.index];
 if(id!==required.id){
  s.mistakes++;s.message='Сейчас нужен другой этап. Подумай, что необходимо сделать прежде.';
  return {kind:'try',message:s.message,hint:required.why};
 }
 s.index++;s.found++;s.message=required.why;finish(s);
 return {kind:'built',name:required.name,why:required.why,complete:s.status==='complete'};
}
function rating(s){
 if(!s||s.status!=='complete')return 0;
 return s.mistakes===0?3:s.mistakes<=3?2:1;
}
function initial(){return {version:1,best:{},completed:[]};}
function validProgress(raw){
 if(!raw||raw.version!==1||!raw.best||typeof raw.best!=='object'||Array.isArray(raw.best)||
  !Array.isArray(raw.completed)||Object.keys(raw.best).some(x=>!TYPES.includes(x))||
  raw.completed.some(x=>!TYPES.includes(x)))return false;
 return Object.values(raw.best).every(x=>Number.isInteger(x)&&x>=1&&x<=3);
}
function restore(raw){
 if(!validProgress(raw))return initial();
 return {version:1,best:Object.fromEntries(TYPES.filter(x=>raw.best[x]).map(x=>[x,raw.best[x]])),
  completed:TYPES.filter(x=>raw.completed.includes(x))};
}
function reward(progress,s){
 if(!progress||!s||s.status!=='complete'||!TYPES.includes(s.type))return false;
 const stars=rating(s);
 progress.best[s.type]=Math.max(stars,progress.best[s.type]||0);
 if(!progress.completed.includes(s.type))progress.completed.push(s.type);
 return true;
}
function summary(progress){
 const p=restore(progress);
 return {done:p.completed.length,total:TYPES.length,stars:TYPES.reduce((sum,t)=>sum+(p.best[t]||0),0)};
}
const api={TYPES,GLYPHS,BUILD,ageBand,settings,newGame,memoryPick,closePair,attentionPick,
 bridgePick,rating,initial,restore,reward,summary};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontWorkshops=api;
})(typeof globalThis!=='undefined'?globalThis:this);
