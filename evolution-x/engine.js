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
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function chooseLane(s){return Math.floor(rand(s)*3)-1;}
function newCellState(s){
 s.cells=[{id:++s.nextId,generation:0}];
 s.wave=0;s.waveRemaining=1;s.divisions=0;
}
function runnerEntities(s){
 let list=[],loc=36;
 while(loc<RUN_GOAL-28){
  const lane=chooseLane(s);
  const types=['block','bar','block','step','agent','block'];
  const type=types[(Math.floor(loc/30)+s.planet)%types.length];
  list.push({id:'r'+s.planet+'-'+list.length,at:loc,lane,type,done:false});
  loc+=25+Math.floor(rand(s)*9);
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
  at+=25+Math.floor(rand(s)*13);
 }
 return list;
}
function newRunner(s){
 s.runner={
  distance:0,furthest:0,lane:0,jump:0,velocity:0,hits:0,invulnerable:0,
  shield:0,pulse:0,matrix:false,portals:0,avoided:0,defeated:0,
  entities:runnerEntities(s)
 };
}
function newSpace(s){
 s.space={
  distance:0,furthest:0,lane:0,hull:3,invulnerable:0,boostTime:0,boostCharges:3,
  avoided:0,hits:0,asteroids:spaceEntities(s)
 };
}
function create(seed){
 const s={version:1,phase:'intro',seed:Number.isInteger(seed)?seed>>>0:2026,
  planet:0,score:0,totalDistance:0,time:0,nextId:0,events:[],
  cells:[],wave:0,waveRemaining:0,divisions:0,transition:0,
  runner:null,space:null};
 newCellState(s);return s;
}
function start(s){
 if(s.phase!=='intro')return false;
 s.phase='cells';s.events=['begin'];return true;
}
function cellPositions(s){
 const n=s.cells.length,cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 return s.cells.map((c,i)=>({
  id:c.id,x:((i%cols)+0.5)/cols,y:(Math.floor(i/cols)+0.5)/rows,
  r:Math.min(.38/cols,.38/rows),generation:c.generation,
  active:c.generation===s.wave
 }));
}
function divide(s,nx,ny){
 if(s.phase!=='cells'||!Number.isFinite(nx)||!Number.isFinite(ny)||
    nx<0||nx>1||ny<0||ny>1)return false;
 const layout=cellPositions(s),n=layout.length;
 const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 const col=Math.min(cols-1,Math.floor(nx*cols));
 const row=Math.min(rows-1,Math.floor(ny*rows));
 const index=row*cols+col;
 if(index>=n||!layout[index].active)return false;
 const parent=s.cells[index];
 s.cells.splice(index,1,{id:++s.nextId,generation:parent.generation+1},
                    {id:++s.nextId,generation:parent.generation+1});
 s.divisions++;s.waveRemaining--;
 s.score+=5+Math.min(12,s.wave);
 s.events=['divide'];
 if(s.cells.length>=CELL_GOAL){
  s.phase='emergence';s.transition=2.15;s.events.push('emergence');
 }else if(s.waveRemaining===0){
  s.wave++;s.waveRemaining=s.cells.length;
  s.score+=s.wave*12;
  s.events.push('newwave');
 }
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
 s.runner.jump=.01;s.runner.velocity=12.5;s.events=['jump'];return true;
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
  r.distance+=dt*(23+Math.min(5,s.planet*1.4));
  creditDistance(s,r,old,RUN_GOAL);
  r.invulnerable=Math.max(0,r.invulnerable-dt);
  if(r.jump>0||r.velocity>0){
   r.velocity-=27*dt;
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
  p.distance+=dt*(25+Math.min(5,s.planet*1.25))*(p.boostTime>0?1.75:1);
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
   s.score+=900*(s.planet+1);s.events.push('planetReached');
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
 divideNext,steer,jump,ability,step,scoreProgress};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.StoryXEvolution=api;
})(typeof globalThis!=='undefined'?globalThis:this);
