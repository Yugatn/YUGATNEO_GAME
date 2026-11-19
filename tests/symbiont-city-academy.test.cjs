'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const A=require('../symbiont-city/academy.js');
const E=require('../symbiont-city/spiral-runner.js');
test('academy has exactly 4 clearly framed themes and 12 unique educational situations',()=>{
 assert.equal(A.TRACKS.length,4);
 assert.equal(A.ids.length,12);
 assert.equal(new Set(A.ids).size,A.ids.length);
 for(const id of A.ids){
  const v=A.view(id,20);
  assert.ok(v&&v.situation&&v.framing&&v.lesson&&v.question);
  assert.ok(v.source.startsWith('https://'));
  assert.equal(v.choices.length,3);
  assert.ok(v.correct>=0&&v.correct<3);
 }
 assert.match(A.TRACKS[0].framing,/философия/);
 assert.match(A.TRACKS[1].framing,/психотерапевтом/);
});
test('the age gates protect ages 0–2 and keep reproductive information age-appropriate',()=>{
 for(let age=0;age<=110;age++){
  assert.ok(A.band(age));
  for(const id of A.ids){
   const v=A.view(id,age);
   assert.ok(v&&v.agePrompt&&v.title);
   if(age<=2){assert.equal(v.caregiver,true);assert.equal(v.choices.length,0);}
   else assert.ok(v.choices.length>=3);
  }
  const preventive=A.view('prevention',age);
  if(age>=3&&age<=8){
   assert.doesNotMatch(preventive.situation+/\s+/.source+' '+preventive.lesson,
    /презерватив|контрацепци|ИППП|менструац/i);
   assert.match(preventive.lesson,/взросл/i);
  }else if(age>=13){
   assert.match(preventive.lesson,/ИППП/);
  }
 }
 assert.equal(A.band(-1),null);
 assert.equal(A.band(111),null);
});
test('each age from 6 through 17 receives a distinct reflection scaffold',()=>{
 const seen=new Set();
 for(let age=6;age<=17;age++){
  const prompt=A.view('friend',age).agePrompt;
  assert.ok(prompt.length>20);
  seen.add(prompt);
 }
 assert.equal(seen.size,12);
});
test('choices record only completion flags and no health details or journal answers',()=>{
 const s=A.initial();
 const q=A.view('friend',12);
 const bad=(q.correct+1)%3;
 const no=A.result(s,'friend',12,bad);
 assert.ok(no&&!no.helpful);
 assert.deepEqual(s.completed,{});
 const yes=A.result(s,'friend',12,q.correct);
 assert.ok(yes.helpful);
 assert.deepEqual(s.completed,{friend:true});
 assert.equal(A.result(s,'prevention',1,0),null);
 assert.equal(A.result(s,'invalid',25,0),null);
 assert.equal(A.result(s,'friend',25,100),null);
 assert.deepEqual(A.restore(JSON.parse(JSON.stringify(s))),s);
});
test('restoration discards unsupported keys and values without adding personal data',()=>{
 const d=A.restore({version:1,completed:{friend:true,private_note:'secret',rumor:'yes',boundaries:false}});
 assert.deepEqual(d.completed,{friend:true});
 assert.deepEqual(A.restore({version:5,completed:{friend:true}}),A.initial());
 assert.deepEqual(A.restore(null),A.initial());
});
test('running game spans five clear age profiles without infant gameplay',()=>{
 const profiles=[[1,0,0,0],[4,9,1,0],[7,13,2,1],[10,21,3,1],[15,29,3,2],[25,35,4,2]];
 for(const [age,size,floors,agents] of profiles){
  const s=E.create(age,44);
  assert.equal(s.size,size);assert.equal(s.floors.length,floors);
  assert.equal(s.config.agents,agents);
  if(size===0){assert.equal(s.phase,'caregiver');assert.equal(E.start(s),false);}
  else{assert.equal(s.phase,'ready');assert.equal(E.start(s),true);}
 }
 assert.equal(E.create(111),null);
 assert.equal(E.create(-1),null);
});
test('all runner floors are connected and walls reciprocal; every floor has exit and portal',()=>{
 for(const age of [4,6,10,14,30]){
  const s=E.create(age,2026);
  for(const f of s.floors){
   assert.equal(E.bfs(f,{x:0,y:0}).reachable,f.size*f.size);
   assert.ok(f.portal&&f.exit);
   assert.ok(E.bfs(f,{x:0,y:0},f.exit));
   for(let y=0;y<f.size;y++)for(let x=0;x<f.size;x++){
    const mask=f.walls[y*f.size+x];
    for(const d of E.DIRS){
     const nx=x+d.dx,ny=y+d.dy;
     if(!E.inside(nx,ny,f.size))assert.ok(mask&d.bit);
     else assert.equal(!!(mask&d.bit),!!(f.walls[ny*f.size+nx]&d.opp));
    }
   }
  }
 }
});
test('runner completes all spiral floors through carved paths without enemies',()=>{
 const s=E.create(15,77);E.start(s);
 for(const f of s.floors)f.agents=[];
 let seenPortal=0;
 while(s.phase==='playing'){
  const f=s.floors[s.floor],route=E.bfs(f,s.player,f.exit);
  assert.ok(route&&route.path.length>0);
  for(const p of route.path.slice(1)){
   const d=E.DIRS.find(d=>s.player.x+d.dx===p.x&&s.player.y+d.dy===p.y);
   assert.ok(d);const result=E.move(s,d.id);
   if(result?.kind==='portal')seenPortal++;
  }
 }
 assert.equal(s.phase,'complete');
 assert.equal(s.floor,s.floors.length-1);
 assert.ok(seenPortal>=s.floors.length);
 assert.ok(s.score>0);
});
test('runner phase power crosses exactly one wall and never outside maze',()=>{
 const s=E.create(9,113);E.start(s);
 let f=s.floors[s.floor];
 const reachable=E.bfs(f,s.player,f.portal).path;
 for(const p of reachable.slice(1)){
  const d=E.DIRS.find(d=>s.player.x+d.dx===p.x&&s.player.y+d.dy===p.y);
  E.move(s,d.id);
 }
 assert.equal(s.matrix,true);assert.equal(s.charges,2);
 const d=E.DIRS.find(d=>E.inside(s.player.x+d.dx,s.player.y+d.dy,f.size)&&
  (f.walls[E.at(s.player.x,s.player.y,f.size)]&d.bit));
 assert.ok(d);
 assert.equal(E.move(s,d.id).kind,'wall');
 assert.equal(E.phase(s),true);
 assert.equal(E.move(s,d.id).kind,'phased');
 assert.equal(s.charges,1);
 s.player.x=0;s.player.y=0;
 s.charges=1;E.phase(s);
 assert.equal(E.move(s,'left').kind,'wall');
 assert.equal(s.charges,1);
});
test('runner score only counts first-time explored cells; pause freezes agents',()=>{
 const s=E.create(8,200);E.start(s);
 const f=s.floors[0];f.agents=[];
 const d=E.DIRS.find(d=>!(f.walls[0]&d.bit));
 assert.ok(d);
 E.move(s,d.id);const score=s.score,unique=s.unique;
 const back=E.DIRS.find(z=>z.bit===d.opp);
 for(let k=0;k<30;k++){E.move(s,back.id);E.move(s,d.id);}
 assert.equal(s.score,score);assert.equal(s.unique,unique);
 assert.equal(E.pause(s),true);
 const t=s.seconds;assert.deepEqual(E.tick(s,500),[]);assert.equal(s.seconds,t);
});
test('academy and runner are registered in PWA and never read Telegram identity',()=>{
 const root=path.resolve(__dirname,'../symbiont-city');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const name of ['academy.js','academy-ui.js','academy.css','spiral-runner.js','spiral-runner-ui.js']){
  assert.ok(html.includes('./'+name),name);
  assert.ok(sw.includes("'./"+name+"'"),name);
 }
 for(const id of ['academySection','academyCards','academyOverlay','academyBody',
  'spiralStart','spiralOverlay','spiralCanvas','spiralControls','spiralPhase','spiralDone']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(sw.includes('yugatneo-symbiont-city-v6'));
 for(const name of ['academy-ui.js','spiral-runner-ui.js']){
  const source=fs.readFileSync(path.join(root,name),'utf8');
  assert.ok(!source.includes('initDataUnsafe'));
  assert.ok(!source.includes('fetch('));
 }
});
