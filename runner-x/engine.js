/* YUGATNEO • Matrix Runner X — pure game rules, no DOM or Telegram dependency.
 * Copyright 2026 Yugatn. Original mechanics and procedural tracks.
 */
(function(root){
'use strict';
const C=Object.freeze({START_SPEED:17,MAX_SPEED:32,GRAVITY:22,JUMP:10.2,
  PORTAL_SECONDS:13,STEP_EVERY:380,STEP_HEIGHT:2.6,LANES:3,TURN_WINDOW:36,MAX_DT:1/30});
const DIRECTIONS=['north','east','south','west'];
const ROT={left:-1,right:1};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function makeTurns(count=180){
  const turns=[];let x=0,z=0,heading=0,prev=0;
  for(let i=0;i<count;i++){
    const at=245+i*242;
    const d=at-prev;
    const v=vector(heading);x+=v.x*d;z+=v.z*d;
    const direction=["right","left","left","right","right","left"][i%6];
    heading=(heading+ROT[direction]+4)%4;
    turns.push({at,x,z,direction,heading});prev=at;
  }
  return turns;
}
function vector(h){const o=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}];return o[h%4];}
const TURNS=makeTurns();
function positionAt(s,lane=0,extra=0){
  let from=0,x=0,z=0,h=0;
  for(const turn of TURNS){if(s<turn.at)break;from=turn.at;x=turn.x;z=turn.z;h=turn.heading;}
  const v=vector(h),right={x:v.z,z:-v.x},d=s-from;
  return {x:x+v.x*d+right.x*lane*3.5,z:z+v.z*d+right.z*lane*3.5,
    y:tierAt(s)*C.STEP_HEIGHT+extra,heading:h};
}
function tierAt(distance){return Math.max(0,Math.floor((distance+0.00001)/C.STEP_EVERY));}
function nextTurn(s){return TURNS.find(t=>t.at>s-2)||null;}
function newGame(seed=2026){
  const s={phase:'ready',seed:seed>>>0,progress:0,time:0,lane:0,laneView:0,
    elevation:0,vy:0,view:'top',yaw:0,speed:C.START_SPEED,
    matrix:0,pulseCooldown:0,pulseVisual:0,portalCount:0,
    obstacles:[],portals:[],agents:[],nextObstacle:52,nextPortal:142,nextAgent:225,
    turnCursor:0,pendingTurn:null,avoided:0,turnsMade:0,tier:0,agentDodges:0,
    bonus:0,score:0,events:[],lastEvent:'',reason:'',lastStepChecked:0};
  replenish(s);
  return s;
}
function running(s){return s.phase==='running';}
function start(s){if(s.phase==='ready'||s.phase==='paused')s.phase='running';return running(s);}
function pause(s){if(s.phase==='running'){s.phase='paused';return true;}return false;}
function jump(s){if(!running(s))return false;if(s.elevation>0.001||s.vy>0)return false;
  s.vy=C.JUMP*(s.matrix>0?1.16:1);return true;}
function nearJunction(at,margin=26){return TURNS.some(t=>Math.abs(t.at-at)<margin);}
function nearStep(at,margin=26){const lower=Math.round(at/C.STEP_EVERY)*C.STEP_EVERY;return lower>0&&Math.abs(at-lower)<margin;}
function nearPortal(at,margin=25){const n=Math.round((at-142)/455);return Math.abs(at-(142+n*455))<margin;}
function replenish(s){
  while(s.nextObstacle < s.progress+225){
    const at=s.nextObstacle;s.nextObstacle+=22+random(s)*14;
    if(nearJunction(at,36)||nearStep(at,32)||nearPortal(at,28))continue;
    const lane=Math.floor(random(s)*3)-1;
    s.obstacles.push({s:at,lane,type:random(s)<0.65?'barrier':'pillar',resolved:false});
  }
  while(s.nextPortal<s.progress+235){
    s.portals.push({s:s.nextPortal,lane:0,used:false});
    s.nextPortal+=455;
  }
}
function turn(s,direction){
  if(!running(s)||!(direction in ROT))return false;
  const upcoming=TURNS[s.turnCursor];
  if(upcoming&&upcoming.at-s.progress<=C.TURN_WINDOW&&upcoming.at-s.progress>=-3){
    s.pendingTurn=direction;
    s.lastEvent=direction===upcoming.direction?'turn-queued':'wrong-turn-queued';
    return true;
  }
  const lane=clamp(s.lane+ROT[direction],-1,1);
  if(lane===s.lane)return false;
  s.lane=lane;
  s.lastEvent='lane';return true;
}
function camera(s){if(s.phase==='gameover')return s.view;s.view=s.view==='top'?'chase':'top';return s.view;}
function pulse(s){
  if(!running(s)||s.matrix<=0||s.pulseCooldown>0)return false;
  s.pulseCooldown=1.1;s.pulseVisual=0.32;s.lastEvent='pulse';
  const before=s.agents.length;
  s.agents=s.agents.filter(a=>Math.abs(a.s-s.progress)>66);
  const count=before-s.agents.length;
  s.bonus+=count*110;s.lastEvent=count?'agent-neutralized':'pulse';
  s.events.push('pulse');if(count)s.events.push('agent-neutralized');
  return true;
}
function lose(s,reason,events){
  s.phase='gameover';s.reason=reason;s.lastEvent=reason;events.push('gameover');
}
function step(s,dt){
  if(!running(s)||!Number.isFinite(dt)||dt<=0)return [];
  dt=Math.min(C.MAX_DT,dt);const ev=s.events.splice(0);
  const old=s.progress;
  s.time+=dt;
  s.speed=Math.min(C.MAX_SPEED,C.START_SPEED+s.time*0.14);
  s.progress+=s.speed*dt;
  s.matrix=Math.max(0,s.matrix-dt);
  s.pulseCooldown=Math.max(0,s.pulseCooldown-dt);
  s.pulseVisual=Math.max(0,s.pulseVisual-dt);
  s.elevation=Math.max(0,s.elevation+s.vy*dt-0.5*C.GRAVITY*dt*dt);
  if(s.elevation===0){s.vy=0;}else{s.vy-=C.GRAVITY*dt;}
  s.laneView+=(s.lane-s.laneView)*Math.min(1,dt*11);

  const t=TURNS[s.turnCursor];
  if(t&&old<t.at&&s.progress>=t.at){
    if(s.pendingTurn!==t.direction){lose(s,'missed-turn',ev);return ev;}
    s.turnCursor++;s.pendingTurn=null;s.turnsMade++;s.bonus+=75;
    s.lastEvent='corner';ev.push('corner');
  }
  const oldTier=tierAt(old),newTier=tierAt(s.progress);
  if(newTier>oldTier){
    if(s.elevation<1.0){lose(s,'missed-step',ev);return ev;}
    s.elevation=Math.max(0,s.elevation-1.15);
    s.tier=newTier;s.bonus+=160;s.lastEvent='climb';ev.push('climb');
  }
  replenish(s);
  for(const o of s.obstacles){
    if(o.resolved||!(old<o.s&&s.progress>=o.s))continue;
    o.resolved=true;
    if(o.lane===s.lane&&s.elevation<(o.type==='pillar'?1.4:0.82)){
      lose(s,'hit',ev);return ev;
    }
    s.avoided++;s.bonus+=30;s.lastEvent='avoided';ev.push('avoided');
  }
  s.obstacles=s.obstacles.filter(o=>o.s>s.progress-12);
  for(const p of s.portals){
    if(p.used||!(old<p.s&&s.progress>=p.s))continue;
    p.used=true;
    if(p.lane===s.lane&&s.elevation>=0.55){
      s.matrix=C.PORTAL_SECONDS;s.portalCount++;
      s.bonus+=220;s.lastEvent='portal';ev.push('portal');
    }else{ev.push('portal-missed');}
  }
  s.portals=s.portals.filter(o=>o.s>s.progress-10);
  if(s.progress>=s.nextAgent){
    s.agents.push({s:s.progress-31,pace:5.6+random(s)*1.6});
    s.nextAgent+=225;
    ev.push('agent-appeared');
  }
  for(const a of s.agents){
    a.s+=dt*(s.speed+a.pace);
    if(a.s>=s.progress-3){
      if(s.elevation>0.95){s.agentDodges++;s.bonus+=45;a.gone=true;ev.push('agent-dodged');}
      else{lose(s,'agent',ev);return ev;}
    }
  }
  s.agents=s.agents.filter(a=>!a.gone);
  s.score=Math.floor(s.progress*2)+s.bonus;
  return ev;
}
function nextHint(s){
  const t=TURNS[s.turnCursor],stepAt=(tierAt(s.progress)+1)*C.STEP_EVERY;
  const portal=s.portals.find(p=>!p.used&&p.s>s.progress);
  const candidates=[];
  if(t)candidates.push({kind:'turn',distance:t.at-s.progress,text:'ПОВОРОТ '+(t.direction==='left'?'←':'→')});
  if(stepAt>s.progress)candidates.push({kind:'step',distance:stepAt-s.progress,text:'ПРЫЖОК НА УРОВЕНЬ ↑'});
  if(portal)candidates.push({kind:'portal',distance:portal.s-s.progress,text:'ПОРТАЛ — ПРЫЖОК ◎'});
  candidates.sort((a,b)=>a.distance-b.distance);
  return candidates[0]||{kind:'run',distance:999,text:'БЕГИ ВПЕРЁД'};
}
const api=Object.freeze({C,TURNS,vector,positionAt,tierAt,nextTurn,newGame,
  start,pause,jump,turn,camera,pulse,step,nextHint,replenish,random});
root.MatrixRunnerXCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);