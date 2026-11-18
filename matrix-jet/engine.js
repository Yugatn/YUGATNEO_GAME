/* YUGATNEO / MATRIX JET · original pure arcade simulation.
 * Airspace/altitude is symbolic; no real-world flight guidance.
 * No browser API, network, account or real-world weapon mechanics.
 */
(function(root){
'use strict';
const C=Object.freeze({
  PLAYER_Y:.76, MIN_X:.10, MAX_X:.90, START_SPEED:.67, MAX_SPEED:1.36,
  BASE_SPAWN:1.12, PORTAL_FIRST:8.5, PORTAL_REPEAT:15,
  PHASE_DURATION:3.25, ALTITUDE_COOLDOWN:.30, MAX_CHARGES:3,
  MAX_LIVES:3
});
const ALTITUDES=['Низко','Средне','Высоко'];
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function create(seed){
 return {
  version:1,phase:'ready',seed:Number.isInteger(seed)?seed>>>0:2026,
  elapsed:0, distance:0, speed:C.START_SPEED, score:0, bonus:0, bestCombo:0,combo:0,
  avoided:0, nearMisses:0, portals:0, passedThrough:0, hits:0,
  x:.5,targetX:.5, aspect:.50, altitude:1, smoothAltitude:1,altitudeCooldown:0,
  matrix:false, charges:0,phaseTime:0,invulnerable:0,lives:C.MAX_LIVES,
  entities:[],nextId:0,spawnIn:1.15,nextPortalAt:C.PORTAL_FIRST,
  events:[],reason:''
 };
}
function start(s){
 if(s.phase!=='ready'&&s.phase!=='paused')return false;
 s.phase='running';return true;
}
function pause(s){
 if(s.phase!=='running')return false;
 s.phase='paused';return true;
}
function steer(s,dir){
 if(s.phase!=='running'||(dir!==-1&&dir!==1))return false;
 s.targetX=clamp(Math.round((s.targetX+dir*.16)*1000)/1000,C.MIN_X,C.MAX_X);
 s.events=['steer'];return true;
}
function aim(s,fraction){
 if(s.phase!=='running'||!Number.isFinite(fraction))return false;
 s.targetX=clamp(fraction,C.MIN_X,C.MAX_X);s.events=['steer'];return true;
}
function changeAltitude(s,dir){
 if(s.phase!=='running'||(dir!==-1&&dir!==1)||s.altitudeCooldown>0)return false;
 const next=clamp(s.altitude+dir,0,2);
 if(next===s.altitude)return false;
 s.altitude=next;s.altitudeCooldown=C.ALTITUDE_COOLDOWN;
 s.events=['altitude'];return true;
}
function special(s){
 if(s.phase!=='running'||!s.matrix||s.charges<1||s.phaseTime>0)return false;
 s.charges--;s.phaseTime=C.PHASE_DURATION;s.invulnerable=Math.max(s.invulnerable,C.PHASE_DURATION);
 s.bonus+=55;s.events=['phase'];return true;
}
function spawnObstacle(s){
 const kind=rand(s)<.55?'cloud':'birds';
 const size=kind==='cloud'?.075+rand(s)*.024:.048+rand(s)*.020;
 const e={id:++s.nextId,kind,x:.13+rand(s)*.74,y:-.15,
  altitude:Math.floor(rand(s)*3),r:size,resolved:false,hit:false};
 s.entities.push(e);return e;
}
function spawnPortal(s){
 // Spawn within a reachable corridor, occasionally requesting an altitude change.
 const e={id:++s.nextId,kind:'portal',x:clamp(s.targetX+(rand(s)-.5)*.24,.16,.84),y:-.16,
  altitude:rand(s)<.72?s.altitude:Math.floor(rand(s)*3),
  r:.075,resolved:false,hit:false};
 s.entities.push(e);return e;
}
function collide(s,e){
 const horizontal=Math.abs(s.x-e.x);
 const vertical=Math.abs(C.PLAYER_Y-e.y);
 const planeRadius=.040;
 return s.altitude===e.altitude &&
  horizontal < (planeRadius+e.r)*.85 &&
  vertical < (planeRadius+e.r)*.89*clamp(s.aspect||.5,.25,1);
}
function updateScore(s){
 s.score=Math.floor(s.distance*.48)+s.bonus;
 return s.score;
}
function step(s,inputDt){
 if(s.phase!=='running'||!Number.isFinite(inputDt)||inputDt<=0)return [];
 const dt=Math.min(1/30,inputDt);
 const events=[];s.elapsed+=dt;
 s.speed=clamp(C.START_SPEED+s.elapsed*.0065,C.START_SPEED,C.MAX_SPEED);
 s.distance+=s.speed*dt*100;
 s.x+=(s.targetX-s.x)*Math.min(1,dt*15);
 s.smoothAltitude+=(s.altitude-s.smoothAltitude)*Math.min(1,dt*9);
 s.altitudeCooldown=Math.max(0,s.altitudeCooldown-dt);
 s.phaseTime=Math.max(0,s.phaseTime-dt);
 s.invulnerable=Math.max(0,s.invulnerable-dt);
 s.spawnIn-=dt;
 if(s.spawnIn<=0){
  spawnObstacle(s);
  s.spawnIn+=Math.max(.68,C.BASE_SPAWN-s.elapsed*.003);
  events.push('spawn');
 }
 if(s.elapsed>=s.nextPortalAt){
  spawnPortal(s);s.nextPortalAt+=C.PORTAL_REPEAT;events.push('portalAhead');
 }
 for(const e of s.entities){
  e.y+=s.speed*dt;
  if(e.resolved)continue;
  if(collide(s,e)){
   e.resolved=true;
   if(e.kind==='portal'){
    s.matrix=true;s.portals++;
    s.charges=Math.min(C.MAX_CHARGES,s.charges+2);
    s.invulnerable=Math.max(s.invulnerable,.7);
    s.bonus+=240;
    events.push('portal');
   }else if(s.phaseTime>0){
    s.passedThrough++;s.avoided++;s.combo++;
    s.bonus+=60+Math.min(80,s.combo*4);
    events.push('phased');
   }else if(s.invulnerable>0){
    s.avoided++;s.bonus+=20;events.push('protected');
   }else{
    e.hit=true;s.hits++;s.lives--;
    s.combo=0;s.invulnerable=1.25;s.bonus=Math.max(0,s.bonus-80);
    events.push('hit');
    if(s.lives<=0){
      s.phase='gameover';s.reason=e.kind==='birds'?
        'Стая птиц — требуется новый манёвр':'Турбулентное облако — попробуй другой эшелон';
      events.push('gameover');
    }
   }
  }else if(e.y>C.PLAYER_Y+e.r+.055){
   e.resolved=true;
   if(e.kind!=='portal'){
     s.avoided++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);
     const altDiff=Math.abs(s.altitude-e.altitude);
     const near=altDiff===0&&Math.abs(s.x-e.x)<e.r+.13;
     if(near){s.nearMisses++;s.bonus+=45;events.push('nearMiss');}
     else {s.bonus+=25+Math.min(25,s.combo*2);events.push('avoided');}
   }
  }
 }
 s.entities=s.entities.filter(e=>e.y<1.17);
 updateScore(s);s.events=events;return events;
}
function planeScale(altitude){return [1.22,1,.78][Math.round(clamp(altitude,0,2))];}
const api={C,ALTITUDES,create,start,pause,steer,aim,changeAltitude,special,step,
 planeScale,updateScore,spawnObstacle,spawnPortal,collide};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.MatrixJetEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
