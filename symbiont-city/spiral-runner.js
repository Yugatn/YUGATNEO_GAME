/* SYMBIONT CITY · Spiral Runner: deterministic maze, portal and nonviolent chasers.
 * Independent miniature arcade inside City, no medical or psychological scoring.
 */
(function(root){
'use strict';
const DIRS=[{id:'up',dx:0,dy:-1,bit:1,opp:4},{id:'right',dx:1,dy:0,bit:2,opp:8},
 {id:'down',dx:0,dy:1,bit:4,opp:1},{id:'left',dx:-1,dy:0,bit:8,opp:2}];
const at=(x,y,n)=>y*n+x,inside=(x,y,n)=>x>=0&&y>=0&&x<n&&y<n;
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function profile(age){
 const a=Number(age);if(!Number.isInteger(a)||a<0||a>110)return null;
 if(a<=2)return {size:0,floors:0,agents:0,delay:0,group:'caregiver'};
 if(a<=5)return {size:9,floors:1,agents:0,delay:0,group:'preschool'};
 if(a<=8)return {size:13,floors:2,agents:1,delay:2.7,group:'young'};
 if(a<=12)return {size:21,floors:3,agents:1,delay:2.1,group:'school'};
 if(a<=17)return {size:29,floors:3,agents:2,delay:1.7,group:'teen'};
 return {size:35,floors:4,agents:2,delay:1.4,group:'adult'};
}
function bfs(f,from,to){
 const n=f.size,start=at(from.x,from.y,n),end=to?at(to.x,to.y,n):-1;
 const prev=new Int32Array(n*n),dist=new Int32Array(n*n),q=new Int32Array(n*n);
 prev.fill(-1);dist.fill(-1);
 let head=0,tail=1,far=start;q[0]=start;dist[start]=0;
 while(head<tail){
  const cur=q[head++],x=cur%n,y=Math.floor(cur/n);
  if(dist[cur]>dist[far])far=cur;
  if(cur===end)break;
  for(const d of DIRS){
   if(f.walls[cur]&d.bit)continue;
   const nx=x+d.dx,ny=y+d.dy,ni=at(nx,ny,n);
   if(!inside(nx,ny,n)||dist[ni]>=0)continue;
   dist[ni]=dist[cur]+1;prev[ni]=cur;q[tail++]=ni;
  }
 }
 const last=to?end:far;
 if(dist[last]<0)return null;
 const path=[];
 for(let i=last;i>=0;i=prev[i]){
  path.push({x:i%n,y:Math.floor(i/n)});
  if(i===start)break;
 }
 return {length:dist[last],path:path.reverse(),reachable:tail};
}
function makeFloor(s,config,j){
 const n=config.size,walls=Array(n*n).fill(15),used=new Uint8Array(n*n),
  stack=[0];used[0]=1;
 while(stack.length){
  const i=stack[stack.length-1],x=i%n,y=Math.floor(i/n);
  const choices=DIRS.filter(d=>inside(x+d.dx,y+d.dy,n)&&!used[at(x+d.dx,y+d.dy,n)]);
  if(!choices.length){stack.pop();continue;}
  const d=choices[Math.floor(random(s)*choices.length)],next=at(x+d.dx,y+d.dy,n);
  walls[i]&=~d.bit;walls[next]&=~d.opp;used[next]=1;stack.push(next);
 }
 const f={size:n,walls,seen:Array(n*n).fill(false),walked:Array(n*n).fill(false),
  portal:null,portalTaken:false,exit:null,agents:[],floor:j};
 const route=bfs(f,{x:0,y:0});
 f.exit=route.path[route.path.length-1];
 f.portal=route.path[Math.max(1,Math.floor(route.length*.38))];
 for(let i=0;i<config.agents;i++){
  const cell=route.path[Math.min(route.path.length-2,Math.floor(route.length*(.62+i*.12)))];
  if(cell)f.agents.push({x:cell.x,y:cell.y,clock:config.delay*(.7+i*.3)});
 }
 return f;
}
function reveal(s){
 const f=s.floors[s.floor],n=f.size;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const x=s.player.x+dx,y=s.player.y+dy;
  if(inside(x,y,n)&&Math.abs(dx)+Math.abs(dy)<=3)f.seen[at(x,y,n)]=true;
 }
}
function create(age=8,seed=2026){
 const cfg=profile(age);if(!cfg)return null;
 const s={version:1,group:cfg.group,size:cfg.size,seed:(Number.isInteger(seed)?seed:2026)>>>0,
  floor:0,config:cfg,phase:cfg.group==='caregiver'?'caregiver':'ready',
  floors:[],player:{x:0,y:0,face:'down'},charges:0,matrix:false,arm:false,
  lives:3,score:0,unique:0,steps:0,seconds:0,invul:3,distance:0,hints:0,message:''};
 if(!cfg.size)return s;
 for(let j=0;j<cfg.floors;j++)s.floors.push(makeFloor(s,cfg,j));
 s.floors[0].walked[0]=true;reveal(s);
 return s;
}
function start(s){if(!s||!['ready','paused'].includes(s.phase))return false;
 s.phase='playing';return true;}
function pause(s){if(!s||s.phase!=='playing')return false;s.phase='paused';return true;}
function phase(s){if(!s||s.phase!=='playing'||!s.matrix||s.charges<=0)return false;
 s.arm=!s.arm;return true;}
function hit(s){
 if(s.invul>0)return false;
 const f=s.floors[s.floor];
 if(!f.agents.some(a=>a.x===s.player.x&&a.y===s.player.y))return false;
 s.lives--;s.invul=2.3;s.message='Агент близко! Выбирай безопасный маршрут.';
 if(!s.lives){s.phase='failed';return true;}
 s.player.x=0;s.player.y=0;s.arm=false;reveal(s);
 return true;
}
function move(s,direction){
 if(!s||s.phase!=='playing')return null;
 const d=DIRS.find(d=>d.id===direction);if(!d)return null;
 const f=s.floors[s.floor],p=s.player,n=f.size,nx=p.x+d.dx,ny=p.y+d.dy;
 p.face=direction;
 if(!inside(nx,ny,n))return {kind:'wall'};
 const wall=!!(f.walls[at(p.x,p.y,n)]&d.bit);
 if(wall&&!(s.arm&&s.charges>0))return {kind:'wall'};
 if(wall){s.charges--;s.arm=false;s.score+=35;s.invul=Math.max(s.invul,.8);}
 p.x=nx;p.y=ny;s.steps++;
 const idx=at(nx,ny,n);
 if(!f.walked[idx]){f.walked[idx]=true;s.unique++;s.score+=10;}
 reveal(s);
 if(!f.portalTaken&&nx===f.portal.x&&ny===f.portal.y){
  f.portalTaken=true;s.charges=Math.min(5,s.charges+2);s.matrix=true;s.score+=150;
  s.message='Портал! Мир стал кодом, доступны прыжки через стену.';
  return {kind:'portal'};
 }
 if(nx===f.exit.x&&ny===f.exit.y){
  s.score+=300;
  if(s.floor===s.floors.length-1){
   s.phase='complete';
   s.score+=Math.max(0,Math.round((s.size*s.floors.length*12-s.seconds)*2));
   s.message='Спираль пройдена. Помни: знания и помощь важнее рекорда.';
   return {kind:'complete'};
  }
  s.floor++;
  s.player={x:0,y:0,face:'down'};s.arm=false;s.invul=2.5;
  s.floors[s.floor].walked[0]=true;reveal(s);
  s.message='Новый виток. Исследуй следующий уровень.';
  return {kind:'stair'};
 }
 hit(s);
 return {kind:s.phase==='failed'?'failed':wall?'phased':'step'};
}
function tick(s,seconds){
 if(!s||s.phase!=='playing'||!Number.isFinite(seconds)||seconds<=0)return [];
 const dt=Math.min(.06,seconds);s.seconds+=dt;
 s.invul=Math.max(0,s.invul-dt);
 const f=s.floors[s.floor],events=[];
 for(const a of f.agents){
  a.clock-=dt;if(a.clock>0)continue;
  a.clock+=s.config.delay;
  if(Math.abs(a.x-s.player.x)+Math.abs(a.y-s.player.y)<=12){
   const r=bfs(f,a,s.player);if(r&&r.path.length>1){
    a.x=r.path[1].x;a.y=r.path[1].y;
   }
  }else{
   const dirs=DIRS.filter(d=>inside(a.x+d.dx,a.y+d.dy,f.size)&&
    !(f.walls[at(a.x,a.y,f.size)]&d.bit));
   if(dirs.length){const d=dirs[Math.floor(random(s)*dirs.length)];a.x+=d.dx;a.y+=d.dy;}
  }
  if(hit(s)){events.push(s.phase==='failed'?'failed':'hit');if(s.phase==='failed')break;}
 }
 return events;
}
function hint(s){
 if(!s||s.phase!=='playing')return null;
 const r=bfs(s.floors[s.floor],s.player,s.floors[s.floor].exit);
 if(!r||r.path.length<2)return null;
 const p=r.path[1],d=DIRS.find(d=>d.dx===p.x-s.player.x&&d.dy===p.y-s.player.y);
 s.hints++;return d?.id||null;
}
const api={DIRS,profile,bfs,create,start,pause,phase,move,tick,hint,at,inside};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.SymbiontSpiralRunner=api;
})(typeof globalThis!=='undefined'?globalThis:this);
