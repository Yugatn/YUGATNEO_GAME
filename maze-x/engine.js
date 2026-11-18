/* YUGATNEO / LABYRINTH X — deterministic, offline multistorey maze engine.
 * Original logic; no network, Telegram identity, copyrighted film assets.
 * Floors are connected by stair vortices; each floor is fully traversable.
 */
(function(root){
'use strict';
const DIRECTIONS=[
 {id:'up',dx:0,dy:-1,bit:1,reverse:4},
 {id:'right',dx:1,dy:0,bit:2,reverse:8},
 {id:'down',dx:0,dy:1,bit:4,reverse:1},
 {id:'left',dx:-1,dy:0,bit:8,reverse:2}
];
const MODES={
 explorer:{label:'Исследователь',size:25,levels:2,agents:1,agentDelay:1.8,braid:.05,bonusTime:270,mult:1},
 navigator:{label:'Навигатор',size:37,levels:3,agents:2,agentDelay:1.45,braid:.07,bonusTime:560,mult:1.5},
 architect:{label:'Архитектор',size:49,levels:4,agents:3,agentDelay:1.12,braid:.10,bonusTime:850,mult:2},
 master:{label:'Мастер Матрицы',size:65,levels:5,agents:4,agentDelay:.90,braid:.13,bonusTime:1350,mult:3}
};
const RIDDLES=[
 {q:'Какое число продолжает ряд 2, 4, 8, 16, …?',a:['24','32','20'],correct:1,why:'Каждое следующее число вдвое больше предыдущего.'},
 {q:'Все кристаллы имеют грани. Некоторые камни — кристаллы. Что следует?',a:['Все камни имеют грани','Некоторые камни имеют грани','Камни не имеют граней'],correct:1,why:'Из существования некоторых камней-кристаллов следует, что некоторые камни имеют грани.'},
 {q:'После четырёх последовательных поворотов направо под углом 90° куда ты смотришь?',a:['В исходном направлении','Налево','Назад'],correct:0,why:'Четыре прямых угла дают полный оборот: 360°.'},
 {q:'Какой маршрут короче: A = 4+5, B = 3+7, C = 6+2?',a:['Маршрут A','Маршрут B','Маршрут C'],correct:2,why:'Длины равны 9, 10 и 8. Минимум у маршрута C.'},
 {q:'Все агенты носят плащи. Перед тобой субъект в плаще. Обязательно ли он агент?',a:['Да','Нет','Только ночью'],correct:1,why:'Из «если агент, то плащ» не следует «если плащ, то агент».'},
 {q:'Следующее число последовательности 1, 1, 2, 3, 5, …?',a:['6','8','10'],correct:1,why:'Каждый член равен сумме двух предыдущих: 3+5=8.'},
 {q:'Какой поворот изменяет направление движения на 180°?',a:['Два поворота на 90° в одну сторону','Один поворот на 90°','Четыре поворота на 90°'],correct:0,why:'Два поворота по 90° в одну сторону дают 180°.'},
 {q:'Маяк мигает каждые две минуты: первое мигание в 0:00. Когда третье?',a:['0:02','0:06','0:04'],correct:2,why:'Первое — в 0:00, второе — в 0:02, третье — в 0:04.'},
 {q:'Какое число делится и на 3, и на 4 без остатка?',a:['12','18','20'],correct:0,why:'12 делится на 3 и 4; 18 не делится на 4, а 20 — на 3.'},
 {q:'Если на карте север вверху, то что находится слева от севера?',a:['Восток','Запад','Юг'],correct:1,why:'При ориентации «север сверху» запад находится слева.'},
 {q:'У маршрута две развилки по 2 варианта. Сколько всего комбинаций?',a:['2','3','4'],correct:2,why:'У первой развилки 2 выбора, у второй 2: всего 2×2=4.'},
 {q:'Один кратчайший путь занимает 7 шагов. Другой — 9. Сколько шагов экономится?',a:['2','9','16'],correct:0,why:'Разница: 9−7=2 шага.'},
 {q:'Три наблюдателя видят разные части лабиринта. Следует ли из этого, что лабиринты разные?',a:['Обязательно','Нет, это может быть один лабиринт','Да, если ночь'],correct:1,why:'Разные точки зрения не доказывают существование разных объектов.'},
 {q:'Какая фигура имеет четыре равные стороны и четыре прямых угла?',a:['Квадрат','Треугольник','Ромб с острыми углами'],correct:0,why:'Это определение квадрата.'},
 {q:'Каждый мост ведёт через реку. Перед тобой переправа. Можно ли назвать её мостом наверняка?',a:['Да','Нет, переправа может быть паромом','Всегда'],correct:1,why:'Из того, что мост — переправа, не следует, что любая переправа — мост.'},
 {q:'Сигнал удваивается каждый цикл: 1, 2, 4, 8. Какое число будет через два цикла?',a:['24','32','16'],correct:1,why:'Следующие два цикла: 16 и 32.'}
];
function rng(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function ri(s,n){return Math.floor(rng(s)*n);}
function ix(x,y,n){return y*n+x;}
function xy(i,n){return {x:i%n,y:Math.floor(i/n)};}
function within(x,y,n){return x>=0&&y>=0&&x<n&&y<n;}
function openDirs(f,x,y){
 const result=[],i=ix(x,y,f.size),mask=f.walls[i];
 for(const d of DIRECTIONS)if(!(mask&d.bit)&&within(x+d.dx,y+d.dy,f.size))result.push(d);
 return result;
}
function makeFloor(s,n,braid){
 const total=n*n,walls=Array(total).fill(15),used=new Uint8Array(total);
 const from=ix(1,1,n),stack=[from];used[from]=1;
 while(stack.length){
  const cur=stack[stack.length-1],x=cur%n,y=Math.floor(cur/n);
  const candidates=[];
  for(const d of DIRECTIONS){
   const nx=x+d.dx,ny=y+d.dy;
   if(within(nx,ny,n)&&!used[ix(nx,ny,n)])candidates.push(d);
  }
  if(!candidates.length){stack.pop();continue;}
  const d=candidates[ri(s,candidates.length)],nx=x+d.dx,ny=y+d.dy,ni=ix(nx,ny,n);
  walls[cur]&=~d.bit;walls[ni]&=~d.reverse;
  used[ni]=1;stack.push(ni);
 }
 // Braids create genuine loops but never sever the guaranteed path.
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
  if(rng(s)>=braid)continue;
  const d=rng(s)<.5?DIRECTIONS[1]:DIRECTIONS[2];
  const a=ix(x,y,n),b=ix(x+d.dx,y+d.dy,n);
  walls[a]&=~d.bit;walls[b]&=~d.reverse;
 }
 return {size:n,walls,start:{x:1,y:1},stair:null,exit:null,portals:[],
  agents:[],seen:Array(total).fill(0),walked:Array(total).fill(0),answered:{},visited:0};
}
function search(f,origin,target){
 const n=f.size,N=n*n,prev=new Int32Array(N),dist=new Int32Array(N),q=new Int32Array(N);
 prev.fill(-1);dist.fill(-1);
 const start=ix(origin.x,origin.y,n),end=target?ix(target.x,target.y,n):-1;
 let head=0,tail=0;q[tail++]=start;dist[start]=0;let farthest=start;
 while(head<tail){
  const here=q[head++];if(dist[here]>dist[farthest])farthest=here;
  if(here===end)break;
  const x=here%n,y=Math.floor(here/n),mask=f.walls[here];
  for(const d of DIRECTIONS){
   if(mask&d.bit)continue;
   const nx=x+d.dx,ny=y+d.dy;if(!within(nx,ny,n))continue;
   const ni=ix(nx,ny,n);if(dist[ni]>=0)continue;
   dist[ni]=dist[here]+1;prev[ni]=here;q[tail++]=ni;
  }
 }
 if(target&&dist[end]<0)return null;
 const targetIndex=target?end:farthest,path=[];
 for(let p=targetIndex;p!==-1;p=prev[p]){path.push(xy(p,n));if(p===start)break;}
 path.reverse();
 return {distance:dist[targetIndex],far:xy(farthest,n),path,reachable:tail};
}
function populate(s,floor,cfg,index){
 const result=search(floor,floor.start),target=result.far;
 if(index===cfg.levels-1)floor.exit=target;else floor.stair=target;
 const path=result.path;
 // Portal deliberately lies along a valid short route toward the exit/stair.
 for(const fraction of [.31,.67]){
  const cell=path[Math.max(2,Math.min(path.length-3,Math.floor(path.length*fraction)))];
  if(cell&&!floor.portals.some(p=>p.x===cell.x&&p.y===cell.y))
   floor.portals.push({x:cell.x,y:cell.y,taken:false});
 }
 for(let j=0;j<cfg.agents;j++){
  const offset=Math.min(path.length-2,Math.max(6,Math.floor(path.length*(.48+j*.12))));
  const cell=path[offset];
  if(!cell)continue;
  floor.agents.push({id:index+'-'+j,x:cell.x,y:cell.y,clock:cfg.agentDelay*(.7+j*.18),seen:false});
 }
}
function reveal(s){
 const f=s.floors[s.floor],n=f.size,p=s.player;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  if(Math.abs(dx)+Math.abs(dy)>3)continue;
  const x=p.x+dx,y=p.y+dy;
  if(within(x,y,n)){
   const i=ix(x,y,n);
   if(!f.seen[i]){f.seen[i]=1;f.visited++;s.discovered++;}
  }
 }
}
function create(mode='navigator',seed=2026){
 if(!MODES[mode])mode='navigator';
 const cfg=MODES[mode];
 const s={version:1,mode,seed:(Number.isInteger(seed)?seed:2026)>>>0,phase:'ready',
  floors:[],floor:0,player:{x:1,y:1,facing:'right'},lives:3,
  elapsed:0,steps:0,uniqueSteps:0,legacyPoints:0,score:0,bonus:0,discovered:0,portals:0,riddlesSolved:0,
  agentsDodged:0,wallJumps:0,matrix:false,charges:0,phaseArmed:false,
  moveCooldown:0,safeTimer:1.5,events:[],riddle:null,hintPath:[],hintUntil:0,
  reason:'',timeBonus:0,nearAgent:false,lastEscapeAt:-100};
 for(let i=0;i<cfg.levels;i++){
  const floor=makeFloor(s,cfg.size,cfg.braid);
  populate(s,floor,cfg,i);s.floors.push(floor);
 }
 s.floors[0].walked[ix(s.player.x,s.player.y,cfg.size)]=1;
 reveal(s);return s;
}
function start(s){if(s.phase!=='ready'&&s.phase!=='paused')return false;s.phase='playing';return true;}
function pause(s){if(s.phase!=='playing')return false;s.phase='paused';return true;}
function openMap(s){
 if(s.phase!=='playing')return false;
 s.phase='map';s.events=['mapOpen'];return true;
}
function closeMap(s){
 if(s.phase!=='map')return false;
 s.phase='playing';s.events=['mapClose'];return true;
}
function upgradeSave(s){
 // Preserve v1 progress and scores. Earlier builds awarded points for every
 // step, so retain points already earned while switching future movement
 // rewards to a once-per-cell model.
 if(!s||!MODES[s.mode]||!Array.isArray(s.floors))return s;
 const n=MODES[s.mode].size;
 if(!Number.isFinite(s.legacyPoints))s.legacyPoints=Math.max(0,(Number(s.score)||0)-(Number(s.bonus)||0));
 if(!Number.isFinite(s.uniqueSteps))s.uniqueSteps=0;
 if(!Number.isFinite(s.lastEscapeAt))s.lastEscapeAt=-100;
 for(let i=0;i<s.floors.length;i++){
  const f=s.floors[i];
  if(!Array.isArray(f.walked)||f.walked.length!==n*n){
   f.walked=Array(n*n).fill(0);
   f.walked[ix(f.start.x,f.start.y,n)]=1;
   if(i===s.floor)f.walked[ix(s.player.x,s.player.y,n)]=1;
  }
 }
 return s;
}
function nearAgent(s){
 const f=s.floors[s.floor];
 return f.agents.some(a=>Math.abs(a.x-s.player.x)+Math.abs(a.y-s.player.y)<=3);
}
function agentHit(s){
 if(s.safeTimer>0||s.phase!=='playing')return false;
 if(!s.floors[s.floor].agents.some(a=>a.x===s.player.x&&a.y===s.player.y))return false;
 s.lives--;s.safeTimer=2.2;s.bonus=Math.max(0,s.bonus-110);
 s.events.push('hit');
 if(s.lives<=0){
  s.phase='failed';s.reason='Агент догнал тебя. Попробуй другой маршрут или используй фазовый переход.';
  s.events.push('failed');
 }else{
  s.player.x=s.floors[s.floor].start.x;
  s.player.y=s.floors[s.floor].start.y;
  s.nearAgent=false;
  s.events.push('respawn');reveal(s);
 }
 return true;
}
function score(s){
 s.score=Math.max(0,Math.floor((s.uniqueSteps||0)*8*MODES[s.mode].mult+
  (s.legacyPoints||0)+s.bonus));
 return s.score;
}
function rememberCell(s){
 const f=s.floors[s.floor],i=ix(s.player.x,s.player.y,f.size);
 if(!f.walked[i]){
  f.walked[i]=1;s.uniqueSteps++;
  s.events.push('newCell');
  return true;
 }
 return false;
}
function complete(s){
 const cfg=MODES[s.mode];
 s.timeBonus=Math.max(0,Math.round((cfg.bonusTime-s.elapsed)*4*cfg.mult));
 s.bonus+=1200*cfg.mult+s.timeBonus;
 s.phase='completed';score(s);s.events.push('complete');
}
function arrived(s){
 const f=s.floors[s.floor],p=s.player;
 for(const portal of f.portals){
  if(portal.taken||portal.x!==p.x||portal.y!==p.y)continue;
  portal.taken=true;s.matrix=true;s.portals++;s.charges=Math.min(5,s.charges+2);
  s.bonus+=230*MODES[s.mode].mult;s.safeTimer=Math.max(s.safeTimer,1.3);
  s.events.push('portal');
 }
 if(f.stair&&p.x===f.stair.x&&p.y===f.stair.y){
  s.floor++;s.player.x=s.floors[s.floor].start.x;s.player.y=s.floors[s.floor].start.y;
  s.player.facing='right';s.moveCooldown=.3;s.safeTimer=2.5;
  s.bonus+=370*MODES[s.mode].mult;s.events.push('stair');
  s.phaseArmed=false;s.hintPath=[];s.hintUntil=0;s.nearAgent=false;
  s.floors[s.floor].walked[ix(s.player.x,s.player.y,s.floors[s.floor].size)]=1;
  reveal(s);
 }else if(f.exit&&p.x===f.exit.x&&p.y===f.exit.y)complete(s);
}
function tryMove(s,direction,phaseWall=false){
 if(s.phase!=='playing')return false;
 const d=DIRECTIONS.find(x=>x.id===direction);if(!d)return false;
 if(s.moveCooldown>0)return false;
 const p=s.player,f=s.floors[s.floor],nx=p.x+d.dx,ny=p.y+d.dy;
 s.player.facing=direction;
 if(!within(nx,ny,f.size)){s.events=['boundary'];return false;}
 const wall=!!(f.walls[ix(p.x,p.y,f.size)]&d.bit);
 if(wall&&!(phaseWall&&s.matrix&&s.charges>0)){
  s.events=['wall'];return false;
 }
 s.events=[];
 if(wall){s.charges--;s.phaseArmed=false;s.wallJumps++;s.safeTimer=Math.max(1.0,s.safeTimer);s.bonus+=55;s.events.push('phaseWall');}
 else if(s.phaseArmed){s.phaseArmed=false;}
 p.x=nx;p.y=ny;s.steps++;s.moveCooldown=.095;
 s.events.push('step');rememberCell(s);reveal(s);arrived(s);
 if(s.phase==='playing')agentHit(s);
 score(s);return true;
}
function move(s,dir){return tryMove(s,dir,s.phaseArmed);}
function armPhase(s){
 if(s.phase!=='playing'||!s.matrix||s.charges<=0)return false;
 s.phaseArmed=!s.phaseArmed;s.events=['arm'];return true;
}
function phaseThrough(s,dir){
 if(s.phase!=='playing'||!s.matrix||s.charges<=0)return false;
 return tryMove(s,dir,true);
}
function shortestHint(f,from){
 const target=f.stair||f.exit;
 if(!target)return [];
 const found=search(f,from,target);
 return found?found.path.slice(0,12):[];
}
function atJunction(s){
 const f=s.floors[s.floor];
 return openDirs(f,s.player.x,s.player.y).length>=3;
}
function riddleOffer(s){
 if(s.phase!=='playing'||!atJunction(s))return null;
 const f=s.floors[s.floor],key=ix(s.player.x,s.player.y,f.size);
 if(f.answered[key])return null;
 const index=(s.floor*17+s.steps+s.riddlesSolved)%RIDDLES.length;
 return {index,question:RIDDLES[index].q,answers:RIDDLES[index].a.slice()};
}
function askRiddle(s){
 const o=riddleOffer(s);
 if(!o)return null;
 s.riddle={...o,key:ix(s.player.x,s.player.y,s.floors[s.floor].size)};
 s.phase='riddle';s.events=['riddle'];return o;
}
function answerRiddle(s,answerIndex){
 if(s.phase!=='riddle'||!s.riddle)return null;
 const item=s.riddle,chosen=Number.isInteger(answerIndex)?answerIndex:-1;
 if(chosen<0||chosen>=3)return null;
 const r=RIDDLES[item.index],correct=chosen===r.correct;
 s.floors[s.floor].answered[item.key]=true;
 s.riddle=null;s.phase='playing';
 if(correct){
  s.riddlesSolved++;s.bonus+=140*MODES[s.mode].mult;
  s.hintPath=shortestHint(s.floors[s.floor],s.player);
  s.hintUntil=s.elapsed+18;s.events=['correct'];
 }else{s.hintPath=[];s.hintUntil=0;s.events=['wrong'];}
 score(s);
 return {correct,explanation:r.why,hint:correct?s.hintPath.slice():[],reward:correct?140*MODES[s.mode].mult:0};
}
function skipRiddle(s){
 if(s.phase!=='riddle'||!s.riddle)return false;
 s.floors[s.floor].answered[s.riddle.key]=true;
 s.riddle=null;s.phase='playing';s.events=['skipped'];return true;
}
function agentStep(s,agent){
 const f=s.floors[s.floor],dx=Math.abs(agent.x-s.player.x),dy=Math.abs(agent.y-s.player.y);
 const dirs=openDirs(f,agent.x,agent.y);if(!dirs.length)return;
 let chosen=null;
 if(dx+dy<=14){
  const searchResult=search(f,{x:agent.x,y:agent.y},s.player);
  if(searchResult&&searchResult.path.length>=2){
   const next=searchResult.path[1];
   chosen=dirs.find(d=>agent.x+d.dx===next.x&&agent.y+d.dy===next.y);
  }
 }
 if(!chosen)chosen=dirs[ri(s,dirs.length)];
 agent.x+=chosen.dx;agent.y+=chosen.dy;
}
function step(s,dtInput){
 if(s.phase!=='playing'||!Number.isFinite(dtInput)||dtInput<=0)return [];
 const dt=Math.min(.05,dtInput);s.events=[];
 s.elapsed+=dt;s.moveCooldown=Math.max(0,s.moveCooldown-dt);
 s.safeTimer=Math.max(0,s.safeTimer-dt);
 const floor=s.floors[s.floor],cfg=MODES[s.mode];
 for(const agent of floor.agents){
  agent.clock-=dt;if(agent.clock<=0){
   agent.clock+=cfg.agentDelay;
   agentStep(s,agent);if(agentHit(s))break;
  }
 }
 const near=nearAgent(s);
 if(s.nearAgent&&!near&&s.elapsed-s.lastEscapeAt>=12){
  s.agentsDodged++;s.lastEscapeAt=s.elapsed;
  s.bonus+=40*cfg.mult;s.events.push('escape');
 }
 s.nearAgent=near;
 if(s.hintUntil&&s.elapsed>s.hintUntil){s.hintUntil=0;s.hintPath=[];s.events.push('hintGone');}
 score(s);
 return s.events;
}
function progress(s){
 const cfg=MODES[s.mode],floor=s.floors[s.floor];
 const target=floor.stair||floor.exit;
 const far=search(floor,floor.start,target);
 const route=far?.distance||1;
 return {
  floor:s.floor+1,totalFloors:cfg.levels,
  explored:Math.floor(floor.visited/(floor.size*floor.size)*100),
  floorDistance:Math.floor((Math.max(0,route-search(floor,s.player,target)?.distance||0)/route)*100),
  mode:cfg.label
 };
}
const api={MODES,DIRECTIONS,RIDDLES,create,start,pause,openMap,closeMap,upgradeSave,move,armPhase,phaseThrough,step,
 riddleOffer,askRiddle,answerRiddle,skipRiddle,shortestHint,search,openDirs,progress,score,
 atJunction,ix,within,nearAgent};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.LabyrinthX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
