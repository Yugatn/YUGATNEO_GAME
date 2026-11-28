// node psychology/life-quest/offline-tests.cjs
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1],sw=fs.readFileSync(path.join(__dirname,"sw.js"),"utf8");
new vm.Script(script);new vm.Script(sw);
const l=vm.runInNewContext(script.slice(0,script.indexOf("let data={done:[]"))+";({SCIENCE_SOURCES,SOURCE_TOPICS,filterSources,linkedModules,MODULE_EVIDENCE})");
let n=0;function check(v){assert.ok(v);n++}
check(l.filterSources("","all").length===24);check(l.SOURCE_TOPICS.length===7);check(l.filterSources("","prevention").length===6);check(l.filterSources("alcohol","prevention").some(([k])=>k==="alcohol"));check(l.filterSources("alcohol","food").length===0);check(l.linkedModules("nida").includes("habits"));
for(const [id,title,keys] of l.SOURCE_TOPICS){check(!!title);check(keys.every(k=>!!l.SCIENCE_SOURCES[k]))}
for(const id of ["quest","brain","models","planner","story","conflicts","perspectives","habits","thinking","reflection","skills","systems","learning","settings"])check(html.split('id="'+id+'"').length===2);
console.log(n+" navigation assertions passed");
const events={},self={registration:{scope:"https://example.test/YUGATNEO_GAME/psychology/life-quest/"},addEventListener:(k,fn)=>events[k]=fn};
const w=new Function("self","URL",sw+";return {isGameNavigation,PAGE,CACHE,PREFIX};")(self,URL);
const url=self.registration.scope;for(const suffix of ["","index.html","?x=1","index.html?x=1"])check(w.isGameNavigation({method:"GET",mode:"navigate",url:url+suffix}));
for(const suffix of ["sw.js","sub/","../","../other/"])check(!w.isGameNavigation({method:"GET",mode:"navigate",url:new URL(suffix,url).href}));
check(!w.isGameNavigation({method:"POST",mode:"navigate",url}));check(!w.isGameNavigation({method:"GET",mode:"cors",url}));check(!w.isGameNavigation({method:"GET",mode:"navigate",url:"https://other.test/"}));check(w.CACHE.startsWith(w.PREFIX));check(Object.keys(events).sort().join(",")==="activate,fetch,install");
console.log((n-34)+" offline scope assertions passed");
