// Deterministic organization and production regression.
const fs=require("node:fs"),path=require("node:path");
function runEnterprises(html){
const js=html.split("<script>")[1].split("</script>")[0],E=new Function(js.replace(/\bbrowser\(\);\s*$/,"")+";return engine();")();
let results=[];function ck(n,x){if(!x)throw Error(n);results.push(n)}
let s=E.fresh("book","","normal","sandbox");E.start(s,"eu");E.enroll(s,"eu","critical");
let p=s.generations[0],r=s.regions.find(r=>r.id==="eu");p.role="engineer";p.projectDay=1;p.life.capacity=95;p.level=90;E.tick(s,()=>.2);
ck("Alumnus establishes organization",s.enterprises.length===1&&s.enterprises[0].founder===p.id);
let e=s.enterprises[0];ck("Startup period",e.state==="building");for(let i=0;i<11;i++)E.tick(s,()=>.2);
ck("Production begins",e.state==="active"&&e.output>0);s.points=999;let well=e.well;
ck("Workplace care",E.enterpriseAction(s,e.id,"care")&&e.well>well);
ck("Cooperative model",E.enterpriseAction(s,e.id,"coop")&&e.model==="coop");ck("Duplicate conversion rejected",!E.enterpriseAction(s,e.id,"coop"));
e.reserve=0;r.supply.power=0;r.supply.materials=0;for(let i=0;i<4;i++)E.tick(s,()=>.2);ck("Input shortage",e.state==="shortage"&&e.shortage>40);
r.supply.power=100;r.supply.materials=100;for(let i=0;i<4;i++)E.tick(s,()=>.2);ck("Recovery after resupply",e.state==="active");
p.role="artist";e.team=100;for(let i=0;i<4;i++)E.tick(s,()=>.2);ck("Founder continuity",e.output>0&&s.enterprises.length===1);
ck("Bounded indicators",["well","skill","load","reserve","team","output","shortage"].every(k=>Number.isFinite(e[k])&&e[k]>=0&&e[k]<=100));
let old=E.fresh();delete old.enterprises;E.ensureEconomy(old);ck("Old save migration",Array.isArray(old.enterprises));
ck("Regional and world counts",E.enterpriseStats(s,"eu").count===1&&E.enterpriseStats(s).coop===1);
let snap=JSON.parse(JSON.stringify(s));E.ensureEconomy(snap);ck("Save retains founder and organization",snap.enterprises[0].founder===p.id&&snap.enterprises[0].model==="coop");
return {results,day:s.day,enterprise:e}
}
console.log(JSON.stringify(runEnterprises(fs.readFileSync(path.join(__dirname,"../index.html"),"utf8")),null,2));
