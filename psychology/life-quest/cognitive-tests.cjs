// node psychology/life-quest/cognitive-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({D,ORDER,ATLAS,COGNITIVE,cognitiveCorrect,validKey,grant,xp,MISSIONS,evaluatePlan,STORIES,branchResult})");
let n=0;function check(v){assert.ok(v);n++}
check(l.D.length===24);check(l.ORDER.length===24&&new Set(l.ORDER).size===24);check(l.ORDER.every(i=>l.D[i]));check(l.ORDER.at(-1)===8);
for(const d of l.D){check(d.length===16);check([0,1,2].includes(d[7]));check([0,1,2].includes(d[14]))}
for(const g of l.COGNITIVE.slice(0,3)){check(g.rounds.length===3);for(const q of g.rounds){check(q.options.length===3);for(let i=0;i<3;i++)check(l.cognitiveCorrect(q,i)===(i===q.correct));check(!l.cognitiveCorrect(q,null))}}
for(const k of ["0:0","19:1","23:1","m:3","t:3","c:2"])check(l.validKey(k));for(const k of ["24:0","c:4","t:4","m:4",null])check(!l.validKey(k));
const all=[...Array.from({length:48},(_,i)=>Math.floor(i/2)+":"+i%2),...Array.from({length:4},(_,i)=>"m:"+i),...Array.from({length:4},(_,i)=>"t:"+i),...Array.from({length:3},(_,i)=>"c:"+i)];check(all.length===59);check(all.every(l.validKey));check(l.xp(all)===3500);check(!l.grant(all,"c:2"));
for(const m of l.MISSIONS){const good=m[3].map(f=>f[2][0]);check(l.evaluatePlan(m,good).passed);check(!l.evaluatePlan(m,[]).complete);for(let i=0;i<m[3].length;i++){const wrong=good.slice();wrong[i]=m[3][i][1].findIndex((_,j)=>!m[3][i][2].includes(j));check(!l.evaluatePlan(m,wrong).passed);check(l.evaluatePlan(m,wrong).count===5)}}
for(const s of l.STORIES)for(let a=0;a<2;a++)for(let b=0;b<2;b++)check(l.branchResult(s,a,b).repair===(!s.first[a][2]&&!!s.second[b][2]));
console.log(n+" cognitive and regression assertions passed");
