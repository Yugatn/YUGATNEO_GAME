// node psychology/life-quest/story-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const {STORIES,branchResult,validKey,grant,xp,D,ORDER}=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({STORIES,branchResult,validKey,grant,xp,D,ORDER})");
let n=0;function check(v){assert.ok(v);n++}
for(const s of STORIES){check(s.ages.length===3);check(s.answers.length===3&&[0,1,2].includes(s.correct));check(branchResult(s,null,null)===null);for(let a=0;a<2;a++){check(branchResult(s,a,null).future===null);for(let b=0;b<2;b++){const z=branchResult(s,a,b);check(z.later===s.later[s.first[a][2]?0:1]);check(z.future===s.future[s.second[b][2]?0:1]);check(z.repair===(!s.first[a][2]&&!!s.second[b][2]));}}}
check(validKey("t:3"));check(!validKey("t:4"));check(validKey("19:1"));check(validKey("m:3"));const ds=["0:0","m:0"];check(grant(ds,"t:0"));check(!grant(ds,"t:0"));check(xp(ds)===250);check(xp([...Array.from({length:40},(_,i)=>Math.floor(i/2)+":"+i%2),...Array.from({length:4},(_,i)=>"m:"+i),...Array.from({length:4},(_,i)=>"t:"+i)])===2800);check(D.length===20&&new Set(ORDER).size===20);
console.log(n+" story assertions passed");
