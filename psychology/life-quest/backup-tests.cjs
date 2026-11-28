// node psychology/life-quest/backup-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({sanitizeProgress,decodeBackup,encodeBackup,mergeProgress,normalizePrefs,validKey,xp})");
let n=0;function check(v){assert.ok(v);n++}function throws(fn){try{fn();return false}catch{return true}}
const a={done:["0:0","0:0","m:0","c:5"],route:"care",stage:28},b={done:["0:0","t:3","29:1"],route:"self",stage:29};
check(l.decodeBackup(l.encodeBackup(a)).done.length===3);check(l.decodeBackup(l.encodeBackup(a)).route==="care");check(l.mergeProgress(a,b).done.length===5);check(l.mergeProgress(a,b).stage===28);check(l.xp(l.mergeProgress(a,b).done)===400);check(a.done.length===4);check(l.sanitizeProgress({done:["x","0:0"],route:"x",stage:999}).done.length===1);check(l.sanitizeProgress({done:[],route:"x",stage:999}).stage===0);
for(const x of ["","null","{}","[]","{","a".repeat(32769),JSON.stringify({format:"yugatneo-life-quest",schema:2,progress:a}),JSON.stringify({format:"yugatneo-life-quest",schema:1,progress:{done:["c:6"]}})])check(throws(()=>l.decodeBackup(x)));
check(l.normalizePrefs({large:1,contrast:true,calm:"true"}).contrast);check(!l.normalizePrefs({large:1}).large);check(l.normalizePrefs(null).calm===false);console.log(n+" backup assertions passed");
