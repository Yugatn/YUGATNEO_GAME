// node psychology/life-quest/spatial-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({COGNITIVE,CHC,SHAPES,spatialTask,rotateGrid,nextDifficulty,validKey,xp,grant,D,ORDER})");
let n=0;function check(v){assert.ok(v);n++}
for(let lv=1;lv<=3;lv++)for(let i=0;i<3;i++){const q=l.spatialTask(lv,i);check(q.source.length===lv+1);check(q.options.length===3);check(new Set(q.options.map(g=>JSON.stringify(g))).size===3);check(JSON.stringify(q.options[q.correct])===JSON.stringify(l.rotateGrid(q.source)));check(q.options.every(g=>g.flat().reduce((a,b)=>a+b,0)===q.source.flat().reduce((a,b)=>a+b,0)));check(JSON.stringify(l.rotateGrid(l.rotateGrid(l.rotateGrid(l.rotateGrid(q.source)))))===JSON.stringify(q.source))}
for(let i=1;i<=3;i++){check(l.nextDifficulty(i,0)===Math.min(3,i+1));check(l.nextDifficulty(i,1)===Math.max(1,i-1))}
check(l.COGNITIVE.length===6);check(l.CHC.length===9);check(l.validKey("c:3"));check(!l.validKey("c:6"));const all=[...Array.from({length:48},(_,i)=>Math.floor(i/2)+":"+i%2),...Array.from({length:4},(_,i)=>"m:"+i),...Array.from({length:4},(_,i)=>"t:"+i),...Array.from({length:4},(_,i)=>"c:"+i)];check(l.xp(all)===3600);check(all.length===60);check(all.every(l.validKey));check(!l.grant(all,"c:3"));
console.log(n+" spatial assertions passed");
