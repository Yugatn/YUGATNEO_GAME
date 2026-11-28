// node psychology/life-quest/perspective-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({PERSPECTIVES,perspectiveCorrect,recommendPerspective,validKey,xp,grant,encodeBackup,decodeBackup})");
let n=0;function check(v){assert.ok(v);n++}
check(l.PERSPECTIVES.length===4);
for(const m of l.PERSPECTIVES){check(m.roles.length===2);check(!!m.practice&&!!m.reflection);for(const role of m.roles){check(role.options.length===3);check(new Set(role.options.map(o=>o[0])).size===3);check(role.accepted.length===2&&new Set(role.accepted).size===2);for(let i=0;i<3;i++){check(l.perspectiveCorrect(role,i)===role.accepted.includes(i));check(role.options[i][1].length>0)}check(!l.perspectiveCorrect(role,null))}}
for(const [route,first] of [["parents",0],["self",2],["care",3]]){check(l.recommendPerspective([],route)===first);check(l.recommendPerspective(["p:"+first],route)!==first);check(l.recommendPerspective(["p:0","p:1","p:2","p:3"],route)===null)}
const keys=[...Array.from({length:60},(_,i)=>Math.floor(i/2)+":"+i%2),...Array.from({length:4},(_,i)=>"m:"+i),...Array.from({length:4},(_,i)=>"t:"+i),...Array.from({length:6},(_,i)=>"c:"+i),...Array.from({length:4},(_,i)=>"r:"+i),...Array.from({length:4},(_,i)=>"p:"+i)];
check(keys.length===82);check(keys.every(l.validKey));check(!l.validKey("p:4"));check(l.xp(keys)===5200);check(!l.grant(keys,"p:3"));check(l.decodeBackup(l.encodeBackup({done:keys,route:"care",stage:28})).done.length===82);console.log(n+" perspective assertions passed");
