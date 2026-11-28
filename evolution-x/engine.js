/* STORY X / EVOLUTION ODYSSEY — deterministic offline game core.
 * Artistic metaphor of growth, not a biological model of human evolution.
 * DOM-free; runs in Telegram WebView and Node test runner.
 */
(function(root){
'use strict';
const CELL_GOAL=256;
const RUN_GOAL=760;
const SPACE_GOAL=900;
const VALID_PHASES=['intro','cells','emergence','runner','launch','space','landing'];
// Fictional gameplay parameters; not real astronomical measurements.
const PROFILES=Object.freeze([
 {name:'Исток',gravity:1,runSpeed:23,spaceSpeed:25,runnerGap:25,asteroidGap:25,boost:3,cellBonus:0,trait:'Равновесие · базовая физика'},
 {name:'Криос',gravity:.65,runSpeed:21,spaceSpeed:23,runnerGap:28,asteroidGap:27,boost:3,cellBonus:1,trait:'Слабая гравитация · длинные прыжки'},
 {name:'Аврора',gravity:.85,runSpeed:26,spaceSpeed:27,runnerGap:24,asteroidGap:25,boost:4,cellBonus:2,trait:'Энергетическое поле · четыре ускорения'},
 {name:'Гелиос',gravity:1.4,runSpeed:28,spaceSpeed:30,runnerGap:23,asteroidGap:23,boost:3,cellBonus:3,trait:'Сильная гравитация · короткие прыжки'},
 {name:'Элизиум',gravity:.95,runSpeed:24,spaceSpeed:26,runnerGap:27,asteroidGap:28,boost:4,cellBonus:4,trait:'Стабильная среда · редкие препятствия'}
].map(Object.freeze));
function profile(planet){
 const n=Number.isSafeInteger(planet)&&planet>=0?planet:0;
 return PROFILES[n%PROFILES.length];
}
// One optional specialization per world; selection locks at emergence.
const SPECIALIZATIONS=Object.freeze([
 {id:'adaptation',name:'Адаптация',desc:'Один стартовый щит на беговом этапе.'},
 {id:'motor',name:'Моторика',desc:'Начальная скорость прыжка выше на 15%.'},
 {id:'navigation',name:'Навигация',desc:'Один дополнительный заряд ускорения в космосе.'}
].map(Object.freeze));
function specialization(s){return SPECIALIZATIONS.find(x=>x.id===s.specialization)||null;}
function chooseSpecialization(s,id){
 if(s.phase!=='cells'||s.cells.length<32||specialization(s)||!SPECIALIZATIONS.some(x=>x.id===id))return false;
 s.specialization=id;s.events=['specialized'];return true;
}
function boostLimit(s){return profile(s.planet).boost+(s.specialization==='navigation'?1:0);}
function speedBonus(planet){return Math.min(4,Math.floor(planet/PROFILES.length)*.6);}
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function chooseLane(s){return Math.floor(rand(s)*3)-1;}
function newCellState(s){
 s.cells=[{id:++s.nextId,generation:0}];
 s.wave=0;s.waveRemaining=1;s.divisions=0;s.specialization=null;
}
function runnerEntities(s){
 let list=[],loc=36;
 while(loc<RUN_GOAL-28){
  const lane=chooseLane(s);
  const types=['block','bar','block','step','agent','block'];
  const type=types[(Math.floor(loc/30)+s.planet)%types.length];
  list.push({id:'r'+s.planet+'-'+list.length,at:loc,lane,type,done:false});
  loc+=profile(s.planet).runnerGap+Math.floor(rand(s)*9);
 }
 for(const at of [135,345,580]){
  // Keep portal entry free of same-lane obstacles nearby.
  const lane=chooseLane(s);
  list=list.filter(o=>o.lane!==lane||Math.abs(o.at-at)>=14);
  list.push({id:'p'+s.planet+'-'+at,at,lane,type:'portal',done:false});
 }
 list.push({id:'rocket',at:RUN_GOAL,lane:0,type:'rocket',done:false});
 return list.sort((a,b)=>a.at-b.at);
}
function spaceEntities(s){
 const list=[];let at=64;
 while(at<SPACE_GOAL-35){
  list.push({id:'a'+s.planet+'-'+list.length,at,lane:chooseLane(s),
    size:0.7+rand(s)*.75,done:false});
  at+=profile(s.planet).asteroidGap+Math.floor(rand(s)*13);
 }
 return list;
}
function newRunner(s){
 s.runner={
  distance:0,furthest:0,lane:0,jump:0,velocity:0,hits:0,invulnerable:0,
  shield:s.specialization==='adaptation'?1:0,pulse:0,matrix:false,portals:0,avoided:0,defeated:0,
  entities:runnerEntities(s)
 };
}
function newSpace(s){
 s.space={
  distance:0,furthest:0,lane:0,hull:3,invulnerable:0,boostTime:0,boostCharges:boostLimit(s),boostCapacity:boostLimit(s),
  avoided:0,hits:0,asteroids:spaceEntities(s)
 };
}
function create(seed){
 const s={version:1,phase:'intro',seed:Number.isInteger(seed)?seed>>>0:2026,
  planet:0,score:0,totalDistance:0,time:0,nextId:0,events:[],
  cells:[],wave:0,waveRemaining:0,divisions:0,transition:0,
  runner:null,space:null,chronicle:[]};
 newCellState(s);return s;
}
function start(s){
 if(s.phase!=='intro')return false;
 s.phase='cells';s.events=['begin'];return true;
}
// The ordered leaves of a binary division tree encode their ancestry by generation.
 // Reconstruct fixed local regions from legacy saves without adding persisted coordinates.
function cellPositions(s){
 const out=[];let index=0;
 function visit(depth,left,top,width,height){
  const c=s.cells[index];if(!c)return;
  if(c.generation===depth){
   const x=left+width/2,y=top+height/2,u=2*x-1,v=2*y-1;
   // Rounded colony footprint, with no global rearrangement after any split.
   const cx=.5+.5*u*Math.sqrt(1-.24*v*v);
   const cy=.5+.5*v*Math.sqrt(1-.24*u*u);
   const r=Math.min(width,height)*(depth<2?.38:.30);
   out.push({id:c.id,x:cx,y:cy,r,generation:c.generation,active:c.generation===s.wave});
   index++;return;
  }
  if(depth>=8||!Number.isInteger(c.generation)||c.generation<depth)return;
  if(depth%2===0){
   visit(depth+1,left,top,width/2,height);
   visit(depth+1,left+width/2,top,width/2,height);
  }else{
   visit(depth+1,left,top,width,height/2);
   visit(depth+1,left,top+height/2,width,height/2);
  }
 }
 visit(0,0,0,1,1);
 // Defensive fallback for malformed/non-tree legacy data; never recurse indefinitely.
 if(out.length!==s.cells.length){
  const n=s.cells.length,cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
  return s.cells.map((c,i)=>({id:c.id,x:((i%cols)+.5)/cols,y:(Math.floor(i/cols)+.5)/rows,
   r:Math.min(.30/cols,.30/rows),generation:c.generation,active:c.generation===s.wave}));
 }
 return out;
}
// Geometric soft-cell approximation: fixed centers and weighted contact planes.
const shapeCache=new WeakMap();
function cellGeometry(s){
 const saved=shapeCache.get(s.cells);
 if(saved&&saved.length===s.cells.length&&saved.wave===s.wave)return saved.geometry;
 const geometry=cellPositions(s).map(c=>({...c,planes:[],points:[],maxR:0}));
 for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++){
  const a=geometry[i],b=geometry[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  if(d<=0||d>2.2*(a.r+b.r))continue;
  const ux=dx/d,uy=dy/d,gap=Math.min(a.r,b.r)*.035,limit=d*a.r/(a.r+b.r);
  a.planes.push({x:ux,y:uy,limit:Math.max(.001,limit-gap)});
  b.planes.push({x:-ux,y:-uy,limit:Math.max(.001,d-limit-gap)});
 }
 for(const c of geometry){
  const count=48,aspect=.90+.08*(.5+.5*Math.sin(c.id*1.73));
  const growth=c.generation>=2?1.84:1.06;
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2,ux=Math.cos(a),uy=Math.sin(a);
   const irregular=1+.064*Math.sin(a*3+c.id*.71)+.038*Math.cos(a*5-c.id*.37)+.018*Math.sin(a*2+c.id*.19);
   let r=c.r*growth*irregular/Math.hypot(ux,uy/aspect);
   for(const plane of c.planes){
    const dot=ux*plane.x+uy*plane.y;if(dot>0)r=Math.min(r,plane.limit/dot);
   }
   if(ux>0)r=Math.min(r,(.99-c.x)/ux);if(ux<0)r=Math.min(r,(.01-c.x)/ux);
   if(uy>0)r=Math.min(r,(.99-c.y)/uy);if(uy<0)r=Math.min(r,(.01-c.y)/uy);
   r=Math.max(0,r);c.points.push({x:ux*r,y:uy*r});c.maxR=Math.max(c.maxR,r);
  }
 }
 shapeCache.set(s.cells,{length:s.cells.length,wave:s.wave,geometry});
 return geometry;
}
function insideCell(c,dx,dy,margin=1){
 if(Math.hypot(dx,dy)>c.maxR*margin)return false;
 let inside=false;
 for(let i=0,j=c.points.length-1;i<c.points.length;j=i++){
  const a=c.points[i],b=c.points[j],ax=a.x*margin,ay=a.y*margin,bx=b.x*margin,by=b.y*margin;
  if((ay>dy)!==(by>dy)&&dx<(bx-ax)*(dy-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
function cellAt(s,nx,ny){
 if(!Number.isFinite(nx)||!Number.isFinite(ny)||nx<0||nx>1||ny<0||ny>1)return null;
 let best=null,nearest=Infinity;
 for(const c of cellGeometry(s)){
  const dx=nx-c.x,dy=ny-c.y,d=Math.hypot(dx,dy);
  if(insideCell(c,dx,dy))return c;
  if(d<nearest&&insideCell(c,dx,dy,1.12)){nearest=d;best=c;}
 }
 return best;
}
function divide(s,nx,ny){
 if(s.phase!=='cells')return false;
 const hit=cellAt(s,nx,ny);
 if(!hit||!hit.active)return false;
 const index=s.cells.findIndex(c=>c.id===hit.id);
 if(index<0)return false;
 const parent=s.cells[index];
 s.cells.splice(index,1,{id:++s.nextId,generation:parent.generation+1},
                    {id:++s.nextId,generation:parent.generation+1});
 s.divisions++;s.waveRemaining--;
 s.score+=5+Math.min(12,s.wave)+profile(s.planet).cellBonus;
 s.events=['divide'];
 if(s.cells.length>=CELL_GOAL){
  s.phase='emergence';s.transition=2.15;s.events.push('emergence');
 }else if(s.waveRemaining===0){
  s.wave++;s.waveRemaining=s.cells.length;
  s.score+=s.wave*12;
  s.events.push('newwave');
 }
 if(s.cells.length===32&&!specialization(s))s.events.push('specializationUnlocked');
 return true;
}
// Keyboard/accessibility option: still requires one deliberate action per cell.
function divideNext(s){
 if(s.phase!=='cells')return false;
 const c=cellPositions(s).find(x=>x.active);
 return !!c&&divide(s,c.x,c.y);
}
function creditDistance(s,actor,old,goal){
 const before=Math.max(old,Number.isFinite(actor.furthest)?actor.furthest:old);
 const after=Math.max(before,Math.min(goal,actor.distance));
 actor.furthest=after;
 s.totalDistance+=after-before;
 s.score+=Math.floor(after/5)-Math.floor(before/5);
}
function steer(s,direction){
 if(direction!==-1&&direction!==1)return false;
 const actor=s.phase==='runner'?s.runner:s.phase==='space'?s.space:null;
 if(!actor)return false;
 const next=Math.max(-1,Math.min(1,actor.lane+direction));
 if(next===actor.lane)return false;
 actor.lane=next;s.events=['lane'];return true;
}
function jump(s){
 if(s.phase!=='runner'||s.runner.jump>0||s.runner.velocity>0)return false;
 s.runner.jump=.01;s.runner.velocity=12.5*(s.specialization==='motor'?1.15:1);s.events=['jump'];return true;
}
function ability(s){
 if(s.phase==='runner'){
  const r=s.runner;
  if(!r.matrix||r.pulse<=0)return false;
  r.pulse--;r.invulnerable=Math.max(r.invulnerable,.9);
  let defeated=0;
  for(const o of r.entities){
   if(o.done||o.type==='portal'||o.type==='rocket')continue;
   if(o.at>=r.distance-2&&o.at<=r.distance+56&&Math.abs(o.lane-r.lane)<=1){
    o.done=true;defeated++;
   }
  }
  r.defeated+=defeated;s.score+=80*defeated+25;
  s.events=['pulse'];
  return true;
 }
 if(s.phase==='space'){
  const p=s.space;
  if(p.boostCharges<=0)return false;
  p.boostCharges--;p.boostTime=1.6;p.invulnerable=Math.max(p.invulnerable,1.8);
  s.score+=30;s.events=['boost'];return true;
 }
 return false;
}
function recordWorld(s){
 const r=s.runner||{},p=s.space||{};
 const journal=Array.isArray(s.chronicle)?s.chronicle:[];
 if(journal.some(entry=>entry.planet===s.planet))return;
 const portals=Number.isFinite(r.portals)?r.portals:0;
 const runHits=Number.isFinite(r.hits)?r.hits:0,spaceHits=Number.isFinite(p.hits)?p.hits:0;
 const medals=[];
 if(portals>=3)medals.push('Проводник Матрицы');
 if(s.runner&&Number.isFinite(r.hits)&&runHits===0)medals.push('Безупречный бег');
 if(spaceHits===0)medals.push('Звёздный пилот');
 const bonus=medals.length*150;s.score+=bonus;
 journal.push({planet:s.planet,name:profile(s.planet).name,specialization:specialization(s)?.name||null,portals,runHits,spaceHits,medals,bonus,score:Math.round(s.score)});
 s.chronicle=journal.slice(-30);
}
function scoreProgress(s){
 if(s.phase==='intro')return 0;
 if(s.phase==='cells'||s.phase==='emergence')
  return Math.min(25,25*(s.cells.length-1)/(CELL_GOAL-1));
 if(s.phase==='runner'||s.phase==='launch')
  return 25+40*Math.min(1,(s.runner?.distance||0)/RUN_GOAL);
 if(s.phase==='space'||s.phase==='landing')
  return 65+35*Math.min(1,(s.space?.distance||0)/SPACE_GOAL);
 return 0;
}
function step(s,rawDt){
 if(!VALID_PHASES.includes(s.phase)||!Number.isFinite(rawDt)||rawDt<=0)return [];
 const dt=Math.min(1/30,rawDt);
 s.events=[];s.time+=dt;
 if(s.phase==='emergence'){
  s.transition-=dt;
  if(s.transition<=0){
   newRunner(s);s.phase='runner';s.events.push('human');
  }
 }else if(s.phase==='runner'){
  const r=s.runner,old=r.distance;
  r.distance+=dt*(profile(s.planet).runSpeed+speedBonus(s.planet));
  creditDistance(s,r,old,RUN_GOAL);
  r.invulnerable=Math.max(0,r.invulnerable-dt);
  if(r.jump>0||r.velocity>0){
   r.velocity-=27*profile(s.planet).gravity*dt;
   r.jump+=r.velocity*dt;
   if(r.jump<=0){r.jump=0;r.velocity=0;}
  }
  for(const o of r.entities){
   if(o.done||o.at>r.distance||o.at<old)continue;
   o.done=true;
   if(o.type==='portal'){
    if(r.lane===o.lane){
     r.matrix=true;r.portals++;r.shield=Math.min(3,r.shield+1);
     r.pulse=Math.min(5,r.pulse+2);s.score+=240;s.events.push('portal');
    }
    continue;
   }
   if(o.type==='rocket')continue;
   if(o.lane!==r.lane||r.jump>=1.1||r.invulnerable>0){
    r.avoided++;s.score+=25;s.events.push('avoided');
   }else if(r.shield>0){
    r.shield--;r.invulnerable=1.0;s.events.push('shield');
   }else{
    r.hits++;r.invulnerable=1.5;s.score=Math.max(0,s.score-50);
    s.events.push('collision');
    if(r.hits%3===0){r.distance=Math.max(0,r.distance-42);s.events.push('retry');}
   }
  }
  if(r.distance>=RUN_GOAL){
   r.distance=RUN_GOAL;s.phase='launch';s.transition=2.6;
   s.score+=400;s.events.push('rocket');
  }
 }else if(s.phase==='launch'){
  s.transition-=dt;
  if(s.transition<=0){newSpace(s);s.phase='space';s.events.push('space');}
 }else if(s.phase==='space'){
  const p=s.space,old=p.distance;
  p.boostTime=Math.max(0,p.boostTime-dt);
  p.invulnerable=Math.max(0,p.invulnerable-dt);
  p.distance+=dt*(profile(s.planet).spaceSpeed+speedBonus(s.planet))*(p.boostTime>0?1.75:1);
  creditDistance(s,p,old,SPACE_GOAL);
  for(const a of p.asteroids){
   if(a.done||a.at>p.distance||a.at<old)continue;
   a.done=true;
   if(a.lane!==p.lane||p.invulnerable>0){
    p.avoided++;s.score+=30;s.events.push('asteroidAvoided');
   }else{
    p.hull--;p.hits++;p.invulnerable=1.5;
    s.score=Math.max(0,s.score-80);s.events.push('asteroidHit');
    if(p.hull<=0){
     p.hull=3;
     p.distance=Math.max(0,p.distance-45);
     s.events.push('checkpoint');
    }
   }
  }
  if(p.distance>=SPACE_GOAL){
   p.distance=SPACE_GOAL;s.phase='landing';s.transition=2.8;
   s.score+=900*(s.planet+1);
   recordWorld(s);
   s.events.push('planetReached');
  }
 }else if(s.phase==='landing'){
  s.transition-=dt;
  if(s.transition<=0){
   s.planet++;newCellState(s);s.runner=null;s.space=null;
   s.phase='cells';s.events.push('newPlanet');
  }
 }
 return s.events;
}
const api={CELL_GOAL,RUN_GOAL,SPACE_GOAL,create,start,cellPositions,divide,
 cellAt,cellGeometry,divideNext,steer,jump,ability,step,scoreProgress,profile,SPECIALIZATIONS,specialization,chooseSpecialization};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.StoryXEvolution=api;
})(typeof globalThis!=='undefined'?globalThis:this);
