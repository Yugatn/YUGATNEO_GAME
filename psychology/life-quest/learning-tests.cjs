// node psychology/life-quest/learning-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({HABITS,habitCorrect,learningGroups,groupProgress,nextLearning,validKey,xp,grant,encodeBackup,decodeBackup})");
let n=0;function check(v){assert.ok(v);n++}
const groups=l.learningGroups(),all=groups.flatMap(g=>g.keys);check(groups.length===14);check(all.length===104);check(new Set(all).size===104);check(all.every(l.validKey));check(l.xp(all)===7400);check(!l.validKey("h:4"));
for(const g of groups){check(l.groupProgress(g,[]).completed===0);check(l.groupProgress(g,all).completed===g.keys.length);check(l.groupProgress(g,all).next===null);check(l.groupProgress(g,[g.keys[0],g.keys[0]]).completed===1)}
for(const [route,first] of [["parents","0:0"],["self","c:0"],["care","24:0"]]){check(l.nextLearning([],route).key===first);const done=[];for(let i=0;i<all.length;i++){const next=l.nextLearning(done,route);check(!!next&&l.validKey(next.key)&&!done.includes(next.key));done.push(next.key)}check(l.nextLearning(done,route)===null)}
check(l.HABITS.length===4);for(const m of l.HABITS){check(m.rounds.length===2);for(const q of m.rounds){check(q.a.length===3);check(new Set(q.a.map(x=>x[0])).size===3);for(let i=0;i<3;i++){check(l.habitCorrect(q,i)===(i===q.ok));check(q.a[i][1].length>0)}check(!l.habitCorrect(q,null))}}
check(!l.grant(all,"h:3"));check(l.decodeBackup(l.encodeBackup({done:all,route:"self",stage:0})).done.length===104);console.log(n+" learning assertions passed");
