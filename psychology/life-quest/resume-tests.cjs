// node psychology/life-quest/resume-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({nextQuest,resumePhase,ORDER})");
let n=0;function check(v){assert.ok(v);n++}
const all=l.ORDER.flatMap(i=>[i+":0",i+":1"]);for(let i=0;i<all.length;i++){const done=all.slice(0,i),next=l.nextQuest(done,l.ORDER);check(next.stage+":"+next.phase===all[i]);check(l.resumePhase(done,next.stage)===next.phase)}
check(l.nextQuest(all,l.ORDER)===null);check(l.resumePhase(all,0)===0);check(l.resumePhase(["0:1"],0)===0);check(l.nextQuest(["0:1"],l.ORDER).phase===0);console.log(n+" resume assertions passed");
