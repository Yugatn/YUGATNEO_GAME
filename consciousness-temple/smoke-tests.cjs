// Run: node consciousness-temple/smoke-tests.cjs
// Pure game-logic smoke tests; not a browser/UI test.
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script = html.split("<script>")[1].split("</script>")[0];
new Function(script);
const core=script.slice(0,script.indexOf("const $=id"));
const result=new Function(core+`
return (()=>{const result={};const m=metaNew(),p=m.planet;let s=create(0,1,123,m);
result.fresh=!!restoreBattle(s,false);
start(s);for(let i=0;i<100;i++)step(s,.1);
const q=restoreBattle(s,false);result.running=q?.phase==="paused"&&q.wave===s.wave&&q.enemies.length===s.enemies.length;
result.corrupt=!restoreBattle({...s,grid:[[]]})&&!restoreBattle({...s,enemies:[{key:"greed",r:99}]})&&!restoreBattle({...s,shots:[null]})&&!restoreBattle({...s,clarity:NaN});
result.mode=!!restoreBattle(createEndless(1,42,m),true)&&!restoreBattle(createEndless(1,42,m),false);
let runs=0;for(let l=0;l<10;l++)for(let diff=0;diff<3;diff++){const x=create(l,diff,123+l,m);start(x);for(let i=0;i<1800&&x.phase==="running";i++)step(x,.1);if(restoreBattle(x)&&Number.isFinite(x.clarity))runs++}
result.campaignSmoke=runs===30;
for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)planetLink(p,PLANET_KEYS[i],PLANET_KEYS[j]);
const green=["green","green","green","science"];for(let i=0;i<12;i++)planetStep(p,green);
result.orbitLaunch=planetLaunch(p);for(let i=0;i<24&&p.mission!=="orbital";i++)planetStep(p,i%2===0?["green","expand","expand","science"]:green);
result.orbit=p.mission==="orbital";for(let i=0;i<6;i++)planetStep(p,green);
for(const [k] of SPACE_WORLDS){for(let i=0;i<3;i++)spaceSurvey(m,k);for(let j=0;j<3;j++){const city=PLANET_KEYS.reduce((best,id)=>p.cities[id].stock[j]>p.cities[best].stock[j]?id:best,PLANET_KEYS[0]);const cargo=[0,0,0];cargo[j]=6;if(!spaceSend(m,k,city,cargo,false))break}result["found_"+k]=spaceFound(m,k);for(let i=0;i<6;i++)planetStep(p,green)}
result.reserve=PLANET_KEYS.every(k=>p.cities[k].stock.every(v=>v>=3));
for(let i=0;i<8;i++)spaceStep(m,i<4?["habitat","habitat"]:["reserve","reserve"]);
result.stable=SPACE_WORLDS.every(([k])=>m.space.worlds[k].stable>=3);
for(let i=0;i<3;i++)spaceStep(m,["research","reserve"]);
result.exchange=spaceExchange(m,"moon","mars")&&!spaceExchange(m,"mars","moon");
const saved=migrateMeta(JSON.parse(JSON.stringify(m)),0);result.reload=JSON.stringify(saved.space)===JSON.stringify(m.space)&&JSON.stringify(saved.planet)===JSON.stringify(p);
result.legacy=migrateMeta({points:3},0).space.lastExchange===-1;return result})()
`)();
const ids=new Set(Array.from(html.slice(0,html.indexOf("<script>")).matchAll(/\bid="([^"]+)"/g),m=>m[1]));
result.domReferences=Array.from(script.matchAll(/\$\("([^"]+)"\)/g),m=>m[1]).every(id=>ids.has(id));
for(const [k,v] of Object.entries(result))console.log((v?"PASS ":"FAIL ")+k);
if(!Object.values(result).every(Boolean))process.exitCode=1;
