// node psychology/life-quest/reflection-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({REFLECTIONS,reflectionReady,validKey,xp,grant,learningGroups,nextLearning,encodeBackup,decodeBackup})");
let n=0;function check(v){assert.ok(v);n++}
check(l.REFLECTIONS.length===4);for(const m of l.REFLECTIONS){check(m.prompts.length===3);check(m.examples.length===3);check(new Set(m.prompts).size===3);check(m.prompts.every(t=>t.length>15));check(m.examples.every(t=>t.length>15));check(m.hint.length>15)}
for(let i=0;i<8;i++)check(l.reflectionReady([!!(i&1),!!(i&2),!!(i&4)])===(i===7));for(const bad of [null,[],[1,1,1],[true,true,true,true],"true"])check(!l.reflectionReady(bad));
const keys=l.learningGroups().flatMap(g=>g.keys);check(keys.length===98);check(new Set(keys).size===98);check(l.xp(keys)===6800);check(!l.validKey("f:4"));check(!l.grant(keys,"f:3"));check(l.nextLearning(keys.filter(k=>!k.startsWith("f:")),"parents").key==="f:0");check(l.decodeBackup(l.encodeBackup({done:keys,route:"self",stage:0})).done.length===98);console.log(n+" reflection assertions passed");
