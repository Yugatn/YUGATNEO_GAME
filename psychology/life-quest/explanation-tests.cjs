// node psychology/life-quest/explanation-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({D,ANSWER_NOTES,answerNote,answerReview,SCIENCE_SOURCES,SCIENCE_CARDS,sourceMatches,MODULE_EVIDENCE})");
let n=0;function check(v){assert.ok(v);n++}
check(l.ANSWER_NOTES.length===l.D.length);for(let i=0;i<l.D.length;i++){check(l.ANSWER_NOTES[i].length===2);for(let p=0;p<2;p++){const a=l.answerReview(i,p);check(a.length===3);check(a.filter(x=>x.correct).length===1);check(a.findIndex(x=>x.correct)===l.D[i][p===0?7:14]);check(new Set(a.map(x=>x.note)).size===3);for(let j=0;j<3;j++){check(a[j].option===l.D[i][(p===0?4:11)+j]);check(a[j].note.length>20);check(l.answerNote(i,p,j)===a[j].note)}}}
for(const args of [[-1,0,0],[0,2,0],[0,0,3],["0",0,0]])check(l.answerNote(...args)===null);
check(l.sourceMatches("").length===Object.keys(l.SCIENCE_SOURCES).length);check(l.sourceMatches("выготский").some(([k])=>k==="vygotsky"));check(l.sourceMatches("кормление").length>=0);check(l.sourceMatches("zzzz-not-a-source").length===0);check(l.sourceMatches("КРИЗИС СЕМИ ЛЕТ").some(([k])=>k==="elkonin"));
for(const ids of Object.values(l.MODULE_EVIDENCE)){check(ids.length>=2);check(ids.every(id=>!!l.SCIENCE_SOURCES[id]))}console.log(n+" explanation and library assertions passed");
