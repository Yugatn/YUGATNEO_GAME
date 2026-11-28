// Run: node psychology/life-quest/planner-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const source=script.slice(script.indexOf("const MISSIONS="),script.indexOf("let missionIndex="));
const {MISSIONS,evaluatePlan,validKey,grant,xp}=vm.runInNewContext(source+";function branchKey(k){return typeof k===\"string\"&&/^t:[0-3]$/.test(k)};({MISSIONS,evaluatePlan,validKey,grant,xp})");
let n=0;function check(v){assert.ok(v);n++}
for(const m of MISSIONS){const good=m[3].map(f=>f[2][0]);check(evaluatePlan(m,good).passed);check(!evaluatePlan(m,[]).complete);for(let i=0;i<m[3].length;i++){const wrong=good.slice();wrong[i]=m[3][i][1].findIndex((_,j)=>!m[3][i][2].includes(j));check(!evaluatePlan(m,wrong).passed);check(evaluatePlan(m,wrong).count===5);for(const j of m[3][i][2]){const alt=good.slice();alt[i]=j;check(evaluatePlan(m,alt).passed)}}}
check(validKey("19:1"));check(validKey("m:3"));check(!validKey("m:4"));check(!validKey(null));const done=["0:0"];check(grant(done,"m:0"));check(!grant(done,"m:0"));check(xp(done)===150);check(xp([...Array.from({length:40},(_,i)=>Math.floor(i/2)+":"+i%2),"m:0","m:1","m:2","m:3"])===2400);
console.log(n+" planner assertions passed");
