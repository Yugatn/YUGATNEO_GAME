'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../matrix-sprint/engine.js');
const dir=path.join(__dirname,'../matrix-sprint');
const tick=1/60;
function playing(seed=2026){const s=C.create(seed);C.start(s);return s;}
function advance(s,seconds){for(let i=0;i<Math.ceil(seconds/tick);i++)C.step(s,tick);}
function near(s,d,segment){s.distance=d;s.segmentIndex=segment||0;}
test('start and pause preserve game state',()=>{
 const s=C.create(2026);assert.equal(s.phase,'ready');
 assert.ok(C.start(s));assert.equal(s.phase,'running');
 assert.ok(C.pause(s));const d=s.distance;
 assert.deepEqual(C.step(s,0.5),[]);assert.equal(s.distance,d);
 assert.ok(C.start(s));assert.ok(C.step(s,1).length>=0);
 assert.ok(s.distance-d<C.CONFIG.BASE_SPEED/25,'background elapsed time is capped');
});
test('track has multiple 90-degree directions and height ramps',()=>{
 const s=C.create(1);const a=s.segments;
 assert.equal(a[0].turnAfter,'right');
 assert.equal(a[1].heading,1);
 assert.ok(a.some(x=>x.rise>0));
 assert.equal(C.positionAt(s,0,0).x,0);
 const p=C.positionAt(s,120,0);
 assert.equal(p.x,a[1].x);assert.equal(p.z,a[1].z);
});
test('left and right controls change lanes but clamp to three tracks',()=>{
 const s=playing();
 assert.equal(C.steer(s,'left'),'lane');assert.equal(s.lane,-1);
 assert.equal(C.steer(s,'left'),false);
 assert.equal(C.steer(s,'right'),'lane');assert.equal(s.lane,0);
 assert.equal(C.steer(s,'wrong'),false);
});
test('mandatory corners: miss = lose, correct edge = real turn',()=>{
 const fail=playing();
 near(fail,119.85,0);
 assert.ok(C.step(fail,tick).includes('hit'));
 assert.equal(fail.phase,'gameover');assert.match(fail.reason,/поворот/);
 const pass=playing();
 near(pass,118,0);
 assert.equal(C.steer(pass,'left'),false,'wrong edge rejected near a right turn');
 assert.equal(C.steer(pass,'right'),'corner');
 assert.equal(pass.lane,0,'corner input does not change lane');
 near(pass,119.85,0);
 assert.ok(C.step(pass,tick).includes('turn'));
 assert.equal(pass.phase,'running');assert.equal(pass.segmentIndex,1);
 assert.equal(pass.turnArmed,null);
});
test('collision and obstacle avoidance are assessed on server-independent core',()=>{
 const fail=playing();near(fail,33.8);
 assert.ok(C.step(fail,tick).includes('hit'));
 assert.equal(fail.phase,'gameover');
 const avoid=playing();near(avoid,33.8);
 C.steer(avoid,'left');
 assert.ok(C.step(avoid,tick).includes('avoided'));
 assert.equal(avoid.passed,1);assert.equal(avoid.phase,'running');
});
test('jump protects over obstacles and is not infinitely stackable',()=>{
 const s=playing();near(s,33.8);s.jumpY=2;s.jumpV=0;
 assert.ok(C.step(s,tick).includes('avoided'));
 assert.equal(s.phase,'running');
 assert.equal(C.jump(s),false,'cannot jump while airborne');
 const normal=playing();assert.ok(C.jump(normal));assert.ok(normal.jumpV>0);
 advance(normal,1);assert.equal(normal.jumpY,0,'jump eventually lands');
});
test('a raised step needs a jump and gives a new elevation at segment exit',()=>{
 const s=playing();const seg=s.segments[2];
 assert.ok(seg.rise>0);
 near(s,seg.start+83.8,2);s.jumpY=2;s.jumpV=0;
 assert.ok(C.step(s,tick).includes('avoided'));
 assert.equal(s.phase,'running');
 const f=playing();near(f,seg.start+83.8,2);
 assert.ok(C.step(f,tick).includes('hit'));
 assert.match(f.reason,/платформу/);
});
test('portal requires the correct lane and a jump; grants permanent Matrix mode and power',()=>{
 const missed=playing();near(missed,99.8);missed.jumpY=0;
 C.step(missed,tick);assert.equal(missed.matrix,false);
 const s=playing();near(s,99.8);s.jumpY=2;
 assert.ok(C.step(s,tick).includes('portal'));
 assert.equal(s.matrix,true);assert.equal(s.portals,1);
 assert.equal(s.charges,C.CONFIG.MAX_CHARGES);
 assert.ok(s.nextAgentAt>s.distance);
 const next=C.step(s,tick);assert.ok(Array.isArray(next));
 assert.ok(s.matrix,'Matrix mode stays active beyond portal crossing');
});
test('energy blast can neutralize an approaching Agent but is rate-limited',()=>{
 const s=playing();s.matrix=true;s.charges=3;
 s.agents=[{id:1,lane:0,distance:s.distance+12,alive:true}];
 assert.equal(C.fire(s),'hit');
 assert.equal(s.defeated,1);assert.equal(s.charges,2);
 assert.equal(C.fire(s),false,'cannot spam shots during cooldown');
 s.shotCooldown=0;assert.equal(C.fire(s),'empty','a miss still uses a charge');
});
test('agents are dodgeable by switching lanes or jumping',()=>{
 const a=playing();a.matrix=true;a.nextAgentAt=Infinity;
 a.agents=[{id:1,lane:0,distance:1,alive:true}];
 assert.ok(C.step(a,tick).includes('hit'),'same-lane chaser catches runner');
 const b=playing();b.matrix=true;b.nextAgentAt=Infinity;
 b.agents=[{id:2,lane:0,distance:1,alive:true}];
 C.steer(b,'left');
 assert.ok(C.step(b,tick).includes('dodge'));
 assert.equal(b.phase,'running');assert.equal(b.dodged,1);
});
test('score grows with distance, avoided hazards, portals and enemy dodges',()=>{
 const s=playing();CoreTypeCheck(s);
 C.steer(s,'left');
 advance(s,2.3);
 assert.ok(s.score>0);
 const prior=s.score;s.bonus+=100;C.step(s,tick);
 assert.ok(s.score>prior);
 function CoreTypeCheck(o){assert.equal(typeof o.score,'number');}
});
test('view mode toggles without resetting progress',()=>{
 const s=playing();s.distance=80;
 assert.equal(C.setView(s,'rear'),'rear');
 assert.equal(s.distance,80);
 assert.equal(C.setView(s,'top'),'top');
 assert.equal(C.setView(s,'bad'),'top');
});
test('HTML and distribution files are compatible with Telegram and GitHub Pages',()=>{
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 for(const expected of ['id="scene"','id="start"','id="jump"','id="left"','id="right"',
  'id="view"','id="blast"','id="pause"','id="intro"','id="restart"',
  'telegram-web-app.js','src="./engine.js"','src="./game.js"']){
  assert.ok(html.includes(expected),expected);
 }
 assert.ok(!html.includes('onclick='),'avoid inline onclick handlers');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'unique DOM element ids');
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.scope,'./');
 for(const name of ['engine.js','game.js','index.html','sw.js','icon.svg','manifest.webmanifest'])
  assert.ok(fs.existsSync(path.join(dir,name)),name);
 const service=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
 assert.match(service,/matrix-sprint|spiral-run/);
 assert.ok(!fs.readFileSync(path.join(dir,'game.js'),'utf8').includes('initDataUnsafe'),
  'no unverified Telegram identity or data usage');
});
