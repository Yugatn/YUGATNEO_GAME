/* Custom low-overhead 3D projection: overhead/isometric and chase camera.
 * Only 2D canvas is required; no external WebGL or texture downloads.
 */
(function(root){
'use strict';
const core=root.MatrixRunnerXCore;
const PI=Math.PI;
const vec=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(v,t)=>vec(v.x*t,v.y*t,v.z*t);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const norm=(v)=>{const m=Math.hypot(v.x,v.y,v.z)||1;return mul(v,1/m);};
const GREEN='#71ffc5',WHITE='#e5fff6',RED='#ff6e86',GOLD='#f9d985';
class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=360;this.height=600;
  this.yaw=0;this.cam=null;this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.rain=Array.from({length:45},(_,i)=>({x:(i*37)%520,p:(i*29)%630,s:0.7+(i%7)*0.11}));this.resize();}
 resize(){const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);this.width=rect.width;this.height=rect.height;
  this.canvas.width=Math.max(1,Math.floor(rect.width*dpr));this.canvas.height=Math.max(1,Math.floor(rect.height*dpr));
  this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 makeCamera(s,dt){const player=core.positionAt(s.progress,s.laneView,s.elevation+0.1);
  const h=player.heading*PI/2, d=Math.atan2(Math.sin(h-this.yaw),Math.cos(h-this.yaw));
  this.yaw+=d*Math.min(1,dt*3.6);const fw=vec(Math.sin(this.yaw),0,Math.cos(this.yaw));
  const behind=s.view==='chase';const eye=add(add(player,mul(fw,behind?-17:-12)),vec(0,behind?10.5:36,0));
  const target=add(add(player,mul(fw,behind?25:20)),vec(0,behind?2.2:0,0));
  const forward=norm(sub(target,eye)),right=norm(cross(vec(0,1,0),forward)),up=norm(cross(forward,right));
  this.cam={eye,forward,right,up,zoom:this.height*(behind?0.98:1.04),behind};}
 project(p){const c=this.cam,v=sub(p,c.eye),depth=dot(v,c.forward);
  if(depth<=0.8)return null;const k=c.zoom/depth;
  return {x:this.width/2+dot(v,c.right)*k,y:this.height*0.38-dot(v,c.up)*k,k,depth};}
 path(points,fill,stroke,lineWidth=1){const c=this.ctx;const p=points.map(x=>this.project(x));if(p.some(x=>!x))return;
  c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();
  if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
 segment(a,b,stroke,width=1){const x=this.project(a),y=this.project(b);if(!x||!y)return;const c=this.ctx;
  c.beginPath();c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
 background(s){const c=this.ctx,w=this.width,h=this.height;const g=c.createLinearGradient(0,0,0,h);
  if(s.matrix>0){g.addColorStop(0,'#031509');g.addColorStop(1,'#011007');}
  else{g.addColorStop(0,'#050d1d');g.addColorStop(.65,'#091426');g.addColorStop(1,'#040911');}
  c.fillStyle=g;c.fillRect(0,0,w,h);
  c.strokeStyle=s.matrix>0?'#1b5435':'#163451';c.lineWidth=1;
  for(let x=-80;x<w+80;x+=45){c.beginPath();c.moveTo(x,0);c.lineTo(x+90,h);c.stroke();}
  if(s.matrix>0){c.font='13px monospace';c.textAlign='center';
   const glyphs='01アイウエカキクケ';
   for(const r of this.rain){const x=(r.x/w*360)%w;const p=(s.time*37*r.s+r.p)%(h+190);
    for(let j=0;j<11;j++){const y=p-j*20;if(y<-10||y>h+14)continue;
     c.fillStyle=j===0?'#adffd0':`rgba(53,239,119,${Math.max(0,0.5-j*0.048)})`;
     c.fillText(glyphs.charAt(Math.floor((s.time*7+j+r.x)%glyphs.length)),x,y);}}
  }
  c.fillStyle='rgba(178,244,230,.27)';
  for(let i=0;i<17;i++){const x=(i*173.3)%w,y=(i*97.1)%h;c.fillRect(x,y,1.5,1.5);}
 }
 road(s){const start=Math.max(0,Math.floor((s.progress-23)/4)*4),end=s.progress+170;
  for(let d=end;d>=start;d-=4){const a=core.positionAt(d,-1.68),b=core.positionAt(d,1.68),c=core.positionAt(d+4,1.68),e=core.positionAt(d+4,-1.68);
   const light=s.matrix>0;this.path([a,b,c,e],light?'#102a22':Math.floor(d/12)%2?'#152136':'#192a3e');
   this.segment(a,e,light?'#46d590':'#27d8dd',1.4);this.segment(b,c,light?'#46d590':'#27d8dd',1.4);
   for(let k of [-.5,.5]){const left=core.positionAt(d,k),right=core.positionAt(d+4,k);
    this.segment(left,right,'rgba(154,245,226,.25)',0.8);}
  }
 }
 box(obstacle,s){const at=obstacle.s,lane=obstacle.lane;const base=core.positionAt(at,lane);
  const v=core.vector(base.heading),right={x:v.z,z:-v.x},w=1.18,d=1.4;
  const H=obstacle.type==='pillar'?2.4:1.3;
  const pos=(i,j,h)=>vec(base.x+right.x*i*w+v.x*j*d,base.y+h,base.z+right.z*i*w+v.z*j*d);
  const a=pos(-1,-1,0),b=pos(1,-1,0),cc=pos(1,1,0),dd=pos(-1,1,0);
  const A=pos(-1,-1,H),B=pos(1,-1,H),C=pos(1,1,H),D=pos(-1,1,H);
  this.path([a,b,B,A],'#304061','#70eaff',1);
  this.path([b,cc,C,B],'#25334a','#82deff',1);
  this.path([A,B,C,D],obstacle.type==='pillar'?'#d76a88':'#b68956','#f1eed0',1.2);
  if(obstacle.type==='pillar')this.segment(A,C,'#ffd9df',1);
 }
 ring(o,s){const base=core.positionAt(o.s,o.lane,2.2),fw=core.vector(base.heading),right={x:fw.z,z:-fw.x};
  const points=[];for(let i=0;i<=30;i++){const t=i/30*2*PI;
   points.push(vec(base.x+right.x*Math.sin(t)*2.3,base.y+Math.cos(t)*2.7,base.z+right.z*Math.sin(t)*2.3));}
  const c=this.ctx;const p=points.map(v=>this.project(v));if(p.some(v=>!v))return;
  c.save();c.strokeStyle=s.matrix>0?'#b8ffca':'#87caff';c.lineWidth=3.8;c.shadowBlur=13;c.shadowColor='#38ff9b';
  c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.stroke();c.restore();
 }
 shard(o,s){
  if(o.resolved||o.dataLane===undefined)return;
  const p=core.positionAt(o.s,o.dataLane,1.2+.3*Math.sin(s.time*5+o.s));
  const q=this.project(p);if(!q)return;
  const c=this.ctx,r=Math.max(4,Math.min(15,q.k*.58));
  c.save();c.shadowBlur=12;c.shadowColor='#67e9ff';c.fillStyle='#91f3ff';c.strokeStyle='#e9ffff';c.lineWidth=1.4;
  c.beginPath();c.moveTo(q.x,q.y-r*1.4);c.lineTo(q.x+r,q.y);c.lineTo(q.x,q.y+r*1.4);c.lineTo(q.x-r,q.y);c.closePath();c.fill();c.stroke();c.restore();
 }
 agent(a){const at=core.positionAt(a.s,0,0);const p=this.project(vec(at.x,at.y+2,at.z));if(!p)return;
  const c=this.ctx,r=Math.max(3,Math.min(23,p.k*.50));c.save();c.strokeStyle=RED;c.lineWidth=2.2;c.shadowColor=RED;c.shadowBlur=9;
  c.beginPath();c.arc(p.x,p.y-r*.7,r*.55,0,2*PI);c.stroke();
  c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x,p.y+r*1.25);c.moveTo(p.x,p.y+r*.3);
  c.lineTo(p.x-r,p.y+r*.75);c.moveTo(p.x,p.y+r*.3);c.lineTo(p.x+r,p.y+r*.75);
  c.moveTo(p.x,p.y+r*1.25);c.lineTo(p.x-r*.7,p.y+r*2);c.moveTo(p.x,p.y+r*1.25);c.lineTo(p.x+r*.7,p.y+r*2);c.stroke();c.restore();}
 avatar(s){const ground=core.positionAt(s.progress,s.laneView),p=core.positionAt(s.progress,s.laneView,s.elevation);
  const head=this.project(vec(p.x,p.y+2.2,p.z)),body=this.project(vec(p.x,p.y+1.25,p.z)),shadow=this.project(vec(ground.x,ground.y+.04,ground.z));
  if(!head||!body||!shadow)return;
  const c=this.ctx,scale=Math.max(15,Math.min(34,head.k*.90));
  c.save();c.fillStyle='rgba(3,7,12,.53)';c.beginPath();c.ellipse(shadow.x,shadow.y,scale*1.4,scale*.55,0,0,PI*2);c.fill();c.restore();
  c.save();c.lineWidth=Math.max(2,scale*.2);c.lineCap='round';c.strokeStyle=s.matrix>0?GREEN:WHITE;
  c.shadowColor=s.matrix>0?'#36ffa3':'#67d9e7';c.shadowBlur=9;
  const t=s.time*19,run=Math.sin(t)*scale*.45;
  c.beginPath();c.moveTo(body.x,body.y-5);c.lineTo(body.x,body.y+scale*.85);
  c.moveTo(body.x,body.y+3);c.lineTo(body.x-scale*.75,body.y+scale*.25+run);
  c.moveTo(body.x,body.y+3);c.lineTo(body.x+scale*.75,body.y+scale*.25-run);
  c.moveTo(body.x,body.y+scale*.85);c.lineTo(body.x-scale*.5-run,body.y+scale*1.7);
  c.moveTo(body.x,body.y+scale*.85);c.lineTo(body.x+scale*.5+run,body.y+scale*1.7);c.stroke();
  c.fillStyle='#e7bb8c';c.beginPath();c.arc(head.x,head.y,scale*.92,0,PI*2);c.fill();
  c.fillStyle='#0d1e28';c.beginPath();c.arc(head.x-scale*.38,head.y,scale*.43,0,PI*2);
  c.arc(head.x+scale*.38,head.y,scale*.43,0,PI*2);c.fill();
  c.strokeStyle='#e1fdf0';c.lineWidth=Math.max(1.6,scale*.12);
  c.beginPath();c.arc(head.x-scale*.38,head.y,scale*.43,0,PI*2);
  c.arc(head.x+scale*.38,head.y,scale*.43,0,PI*2);
  c.moveTo(head.x-scale*.10,head.y);c.lineTo(head.x+scale*.10,head.y);c.stroke();
  c.restore();
 }
 scene(s,dt){if(!this.ctx)return;this.makeCamera(s,dt);this.background(s);this.road(s);
  for(const p of s.portals.filter(x=>x.s>=s.progress-9&&x.s<s.progress+135).sort((a,b)=>b.s-a.s))this.ring(p,s);
  for(const o of s.obstacles.filter(x=>x.s>=s.progress-8&&x.s<s.progress+120).sort((a,b)=>b.s-a.s)){this.box(o,s);this.shard(o,s);}
  for(const agent of s.agents)this.agent(agent);
  this.avatar(s);
  if(s.shieldVisual>0||s.shield){
    const p=core.positionAt(s.progress,s.laneView,s.elevation+1.2),q=this.project(p);
    if(q){const c=this.ctx,r=Math.max(24,Math.min(60,q.k*2.1));c.save();c.strokeStyle=s.shieldVisual>0?'#f9d985':'rgba(123,236,255,.65)';c.lineWidth=s.shieldVisual>0?4:1.8;c.beginPath();c.ellipse(q.x,q.y,r,r*1.12,0,0,2*PI);c.stroke();c.restore();}
  }
  if(s.pulseVisual>0){const c=this.ctx;const x=this.width/2,y=this.height*.64;
   c.save();c.strokeStyle='rgba(98,255,174,'+(s.pulseVisual/.32)+')';c.lineWidth=4;
   c.beginPath();c.ellipse(x,y,(1-s.pulseVisual/.32)*this.width*.65, (1-s.pulseVisual/.32)*200+10,0,0,2*PI);c.stroke();c.restore();}
  if(s.agents.length){const nearest=Math.min(...s.agents.map(a=>s.progress-a.s));
   const c=this.ctx;c.fillStyle=RED;c.font='bold 14px system-ui';c.textAlign='center';
   c.fillText('⚠ АГЕНТЫ СЗАДИ · '+Math.max(0,Math.round(nearest))+' м',this.width/2,this.height*.91);}
 }
}
root.MatrixRunnerXRenderer=Renderer;
})(typeof window!=='undefined'?window:globalThis);