// node psychology/life-quest/social-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({D,ORDER,COGNITIVE,VARIANTS,chooseRound,validKey,grant,xp,cognitiveCorrect})");
let n=0;function check(v){assert.ok(v);n++}
check(l.D.length===30);check(l.ORDER.length===30&&new Set(l.ORDER).size===30);check(l.ORDER.at(-1)===29);
for(const d of l.D){check(d.length===16);check([0,1,2].includes(d[7]));check([0,1,2].includes(d[14]))}
check(l.COGNITIVE.length===6);
for(const i of [0,1,2,4,5])for(let j=0;j<3;j++)for(const v of [0,1]){const q=l.chooseRound(i,j,v);check(q.options.length===3);check(new Set(q.options).size===3);check([0,1,2].includes(q.correct));check(l.cognitiveCorrect(q,q.correct));check(!l.cognitiveCorrect(q,(q.correct+1)%3))}
for(let i=0;i<3;i++)for(let j=0;j<3;j++)check(l.chooseRound(i,j,0).stim!==l.chooseRound(i,j,1).stim);
const keys=[...Array.from({length:60},(_,i)=>Math.floor(i/2)+":"+i%2),...Array.from({length:4},(_,i)=>"m:"+i),...Array.from({length:4},(_,i)=>"t:"+i),...Array.from({length:6},(_,i)=>"c:"+i)];check(keys.length===74);check(keys.every(l.validKey));check(l.xp(keys)===4400);check(!l.validKey("30:0"));check(!l.validKey("c:6"));check(!l.grant(keys,"c:5"));
console.log(n+" social assertions passed");
