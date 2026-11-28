// node psychology/life-quest/system-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({SYSTEMS,SYSTEM_TURNS,systemStart,systemStep,systemCanAct,systemFinal,systemStability,systemClamp,validKey,xp,grant,learningGroups,nextLearning})");
let n=0,ends=0;function check(v){assert.ok(v);n++}
check(l.SYSTEMS.length===2);check(l.SYSTEM_TURNS===5);
const first=l.systemStart(0),a=l.systemStep(first,2),b=l.systemStep(a,3);
check(first.turn===0&&first.history.length===0);check(a.values[0]===43&&a.pending[0]===8);check(b.values[0]===55&&b.history[1].received[0]===8);check(l.systemFinal(a)===null);check(l.systemStep(first,99)===null);
function explore(s){check(s.values.every(v=>Number.isInteger(v)&&v>=0&&v<=100));check(s.history.length===s.turn);if(s.turn===l.SYSTEM_TURNS){ends++;const result=l.systemFinal(s);check(result.every((v,i)=>v===l.systemClamp(s.values[i]+s.pending[i])));check(l.systemStability(result)===Math.min(...result));check(l.systemStep(s,3)===null);return}
check(l.systemCanAct(s,3));for(let a=0;a<4;a++){const next=l.systemStep(s,a);if(!next){check(!l.systemCanAct(s,a));continue}check(next.turn===s.turn+1);check(next.values.every((v,i)=>v===l.systemClamp(l.systemClamp(s.values[i]+s.pending[i])+l.SYSTEMS[s.index].actions[a].now[i])));explore(next)}}
for(let i=0;i<2;i++)explore(l.systemStart(i));check(ends>1000);
const keys=l.learningGroups().flatMap(g=>g.keys);check(keys.length===104);check(new Set(keys).size===104);check(keys.every(l.validKey));check(l.xp(keys)===7400);check(!l.validKey("y:2"));check(!l.grant(keys,"y:1"));check(l.nextLearning(keys.filter(k=>!k.startsWith("y:")),"parents").key==="y:0");console.log(n+" system assertions passed; "+ends+" reachable completed paths");
