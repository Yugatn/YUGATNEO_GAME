/* SYMBIONT CITY · Route of Help v1 · standalone spatial planning adventure.
 * Deterministic pure model, no timer, no network, no diagnostics.
 */
(function(root){
'use strict';
const DIRS=[
 {id:'up',dx:0,dy:-1,bit:1,opp:4},
 {id:'right',dx:1,dy:0,bit:2,opp:8},
 {id:'down',dx:0,dy:1,bit:4,opp:1},
 {id:'left',dx:-1,dy:0,bit:8,opp:2}
];
const key=(x,y,n)=>y*n+x;
function rand(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function sizeFor(age,challenge='auto'){
 const a=Number(age);
 if(!Number.isInteger(a)||a<0||a>110)return null;
 if(a<=2)return 0;
 const base=a<=5?5:a<=8?7:a<=12?9:11;
 const adjustment=challenge==='gentle'?-2:challenge==='stretch'?2:0;
 return Math.max(5,Math.min(13,base+adjustment));
}
function search(s,from,target){
 const n=s.size,queue=[key(from.x,from.y,n)],prev=Array(n*n).fill(-1),dist=Array(n*n).fill(-1);
 dist[queue[0]]=0;
 const targetKey=target?key(target.x,target.y,n):-1;
 let far=queue[0];
 for(let p=0;p<queue.length;p++){
  const i=queue[p],x=i%n,y=Math.floor(i/n);
  if(dist[i]>dist[far])far=i;
  if(i===targetKey)break;
  for(const d of DIRS){
   if(s.walls[i]&d.bit)continue;
   const nx=x+d.dx,ny=y+d.dy;
   if(nx<0||ny<0||nx>=n||ny>=n)continue;
   const next=key(nx,ny,n);
   if(dist[next]>=0)continue;
   prev[next]=i;dist[next]=dist[i]+1;queue.push(next);
  }
 }
 const end=target?targetKey:far;
 if(dist[end]<0)return null;
 const path=[];
 for(let i=end;i>=0;i=prev[i]){
  path.push({x:i%n,y:Math.floor(i/n)});
  if(i===queue[0])break;
 }
 return {distance:dist[end],path:path.reverse(),reachable:queue.length};
}
function create(age=8,challenge='auto',seed=2026){
 const n=sizeFor(age,challenge);
 if(n===null)return null;
 const s={version:1,size:n,seed:(Number.isInteger(seed)?seed:2026)>>>0,
  status:n===0?'caregiver':'playing',walls:[],player:{x:0,y:0},
  destination:null,supplies:[],collected:[],moves:0,unique:0,hints:0,
  message:'',seen:[],optimal:0};
 if(!n)return s;
 s.walls=Array(n*n).fill(15);
 s.seen=Array(n*n).fill(false);s.seen[0]=true;
 const visited=Array(n*n).fill(false),stack=[0];visited[0]=true;
 while(stack.length){
  const cur=stack[stack.length-1],x=cur%n,y=Math.floor(cur/n);
  const options=DIRS.filter(d=>{
   const nx=x+d.dx,ny=y+d.dy;
   return nx>=0&&nx<n&&ny>=0&&ny<n&&!visited[key(nx,ny,n)];
  });
  if(!options.length){stack.pop();continue;}
  const d=options[Math.floor(rand(s)*options.length)],nx=x+d.dx,ny=y+d.dy;
  const next=key(nx,ny,n);
  s.walls[cur]&=~d.bit;s.walls[next]&=~d.opp;
  visited[next]=true;stack.push(next);
 }
 const far=search(s,{x:0,y:0});
 s.destination=far.path[far.path.length-1];
 const route=far.path;
 for(const fraction of [.3,.64]){
  const p=route[Math.max(1,Math.min(route.length-2,Math.floor((route.length-1)*fraction)))];
  if(p&&!s.supplies.some(item=>item.x===p.x&&item.y===p.y))
   s.supplies.push({...p,id:'s'+s.supplies.length});
 }
 s.optimal=route.length-1;
 return s;
}
function move(s,direction){
 if(!s||s.status!=='playing')return null;
 const d=DIRS.find(d=>d.id===direction);if(!d)return null;
 const {x,y}=s.player,n=s.size,i=key(x,y,n);
 if(s.walls[i]&d.bit)return {kind:'wall',message:'Здесь стена. Найди другой путь.'};
 const nx=x+d.dx,ny=y+d.dy;
 if(nx<0||ny<0||nx>=n||ny>=n)return {kind:'wall',message:'Это край карты.'};
 s.moves++;s.player={x:nx,y:ny};
 const j=key(nx,ny,n);
 if(!s.seen[j]){s.seen[j]=true;s.unique++;}
 const item=s.supplies.find(p=>p.x===nx&&p.y===ny&&!s.collected.includes(p.id));
 if(item)s.collected.push(item.id);
 const atFinish=nx===s.destination.x&&ny===s.destination.y;
 if(atFinish&&s.collected.length===s.supplies.length){
  s.status='complete';s.message='Помощь доставлена! Обсуди, какой путь оказался удобнее.';
  return {kind:'complete',message:s.message};
 }
 if(atFinish){
  s.message='Ты нашёл пункт помощи. Собери оставшиеся припасы и возвращайся.';
  return {kind:'needSupplies',message:s.message};
 }
 s.message=item?'Припасы найдены! Продолжай путь к пункту помощи.':'Хороший манёвр. Ищи припасы и путь к цели.';
 return {kind:item?'supply':'step',message:s.message};
}
function hint(s){
 if(!s||s.status!=='playing')return null;
 const pending=s.supplies.filter(p=>!s.collected.includes(p.id));
 let target=s.destination;
 if(pending.length){
  const routes=pending.map(p=>search(s,s.player,p)).filter(Boolean).sort((a,b)=>a.distance-b.distance);
  target=routes[0].path[routes[0].path.length-1];
 }
 const route=search(s,s.player,target);
 if(!route||route.path.length<2)return {direction:null,message:'Ты уже у цели. Проверь, собраны ли все предметы.'};
 const next=route.path[1],d=DIRS.find(d=>s.player.x+d.dx===next.x&&s.player.y+d.dy===next.y);
 s.hints++;
 return {direction:d.id,message:'Совет: попробуй сделать шаг '+({up:'вверх',down:'вниз',left:'влево',right:'вправо'}[d.id])+'.'};
}
function stars(s){
 if(!s||s.status!=='complete')return 0;
 const efficiency=s.moves/Math.max(1,s.optimal);
 return efficiency<=1.3&&s.hints===0?3:efficiency<=2.5?2:1;
}
function initial(){return {version:1,best:0,completed:0};}
function restore(raw){
 if(!raw||raw.version!==1||!Number.isInteger(raw.best)||raw.best<0||raw.best>3||
 !Number.isInteger(raw.completed)||raw.completed<0||raw.completed>999999)return initial();
 return {version:1,best:raw.best,completed:raw.completed};
}
function reward(saved,s){
 if(!s||s.status!=='complete'||s.recorded||!saved)return false;
 const grade=stars(s);saved.best=Math.max(saved.best,grade);saved.completed=Math.min(999999,saved.completed+1);
 s.recorded=true;return true;
}
const api={DIRS,sizeFor,search,create,move,hint,stars,initial,restore,reward};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SymbiontHelpRoute=api;
})(typeof globalThis!=='undefined'?globalThis:this);
