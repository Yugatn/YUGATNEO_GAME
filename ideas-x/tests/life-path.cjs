// Deterministic lifespan and career transition regression.
const fs=require("node:fs"),path=require("node:path");
function runLife(html){
const js=html.split("<script>")[1].split("</script>")[0],E=new Function(js.replace(/\bbrowser\(\);\s*$/,"")+";return engine();")();
let results=[];function ck(n,x){if(!x)throw Error(n);results.push(n)}
let s=E.fresh("book","","normal","human");E.start(s,"eu");ck("Birth enrollment",E.enroll(s,"eu","critical",null,()=>.2,0));
let p=s.generations[0],r=s.regions.find(x=>x.id==="eu");ck("Age zero",E.age(s,p)===0&&p.level===0);ck("Child career blocked",!E.careerCounsel(s,p.id,()=>.1));
s.points=999;let old=r.educationAccess;E.humanAction(s,"eu","institutes");E.ensureEconomy(s);ck("Education institution improves access",r.educationAccess>old);
for(let i=0;i<56;i++)E.tick(s,()=>.2);ck("School milestone",E.age(s,p)===7&&p.life.history.some(x=>x.includes("Начало школьного")));ck("Education grows",p.life.education>0);
for(let i=56;i<216;i++){if(i%16===0){s.points=999;E.humanAction(s,"eu","network")}E.tick(s,()=>.2)}
ck("Adult chooses career",!!p.role&&E.age(s,p)>=22);ck("Portfolio",p.life.portfolio.length===1);
s.points=999;let prior=p.role;ck("Career guidance",E.careerCounsel(s,p.id,()=>.05));ck("Career transition preserves portfolio",p.role!==prior&&p.life.changes===1&&!p.initiative&&p.life.portfolio.length===1);ck("Guidance cooldown",!E.careerCounsel(s,p.id,()=>.05));
for(let i=0;i<25;i++)E.tick(s,()=>.2);ck("Second career project",p.life.portfolio.length===2);
let oldsave=E.fresh();E.start(oldsave,"eu");E.enroll(oldsave,"eu","critical");delete oldsave.generations[0].startAge;delete oldsave.generations[0].life.interests;E.ensureEconomy(oldsave);ck("Old age preserved",E.age(oldsave,oldsave.generations[0])===10&&oldsave.generations[0].life.interests.length===6);
return {results,day:s.day,age:E.age(s,p),portfolio:p.life.portfolio}
}
console.log(JSON.stringify(runLife(fs.readFileSync(path.join(__dirname,"../index.html"),"utf8")),null,2));
