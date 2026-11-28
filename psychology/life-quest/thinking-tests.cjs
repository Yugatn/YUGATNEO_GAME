// node psychology/life-quest/thinking-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({THINKING,thinkingCorrect,validKey,xp,grant,learningGroups,encodeBackup,decodeBackup})");
let n=0;function check(v){assert.ok(v);n++}
check(l.THINKING.length===4);for(const m of l.THINKING){check(m.rounds.length===2);check(m.practice.length>20);for(const q of m.rounds){check(q.a.length===3);check(new Set(q.a.map(x=>x[0])).size===3);for(let i=0;i<3;i++){check(l.thinkingCorrect(q,i)===(i===q.ok));check(q.a[i][1].length>0)}check(!l.thinkingCorrect(q,null))}}
const keys=l.learningGroups().flatMap(g=>g.keys);check(keys.length===104);check(l.xp(keys)===7400);check(!l.validKey("k:4"));check(!l.grant(keys,"k:3"));check(l.decodeBackup(l.encodeBackup({done:keys,route:"self",stage:0})).done.length===104);console.log(n+" thinking assertions passed");
