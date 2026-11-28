// node psychology/life-quest/science-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(script);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({D,SCIENCE_CARDS,SCIENCE_SOURCES,scienceCard})");
let n=0;function check(v){assert.ok(v);n++}
check(l.SCIENCE_CARDS.length===l.D.length);check(l.D.length===30);
for(let i=0;i<l.D.length;i++){const c=l.scienceCard(i);check(c.length===6);check(c.slice(0,5).every(t=>typeof t==="string"&&t.length>20));check(c[5].length>=1);check(new Set(c[5]).size===c[5].length);for(const id of c[5]){const source=l.SCIENCE_SOURCES[id];check(!!source);check(source.length===3);check(source[1].startsWith("https://"));check(source[2].length>3)}}
for(const bad of [-1,30,1.5,null,"1"])check(l.scienceCard(bad)===null);
check(new Set(Object.values(l.SCIENCE_SOURCES).map(s=>s[1])).size===Object.keys(l.SCIENCE_SOURCES).length);console.log(n+" science card assertions passed");
