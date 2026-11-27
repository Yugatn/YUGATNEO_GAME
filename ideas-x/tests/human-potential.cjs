// Deterministic tests of human potential mechanics; all values are fictional simulation indices.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
function runHuman(html){
 const js=html.split("<script>")[1].split("</script>")[0],E=new Function(js.replace(/\bbrowser\(\);\s*$/,"")+";return engine();")();
 let results=[];function ck(n,x){if(!x)throw Error(n);results.push(n)}
 let s=E.fresh("book","","normal","human");ck("Prestart actions blocked",!E.humanAction(s,"eu","family"));E.start(s,"eu");E.enroll(s,"eu","critical");
 let p=s.generations[0],r=s.regions.find(x=>x.id==="eu");ck("Distinct skills",p.life.second!==p.skill);
 p.role="scientist";p.projectDay=1;p.life.capacity=20;p.life.alcohol=90;p.life.drugs=80;p.life.stress=90;E.tick(s,()=>.2);
 ck("Project delay",!p.initiative&&p.life.delays===1&&s.delayedProjects===1);
 s.points=999;ck("Individual support",E.humanAction(s,"eu","support",p.id));ck("Support cooldown",!E.humanAction(s,"eu","support",p.id));
 for(let k of ["family","prevention","care","team"])for(let i=0;i<3;i++)E.humanAction(s,"eu",k);
 for(let i=0;i<40;i++)E.tick(s,()=>.2);
 ck("Project resumes through support and team",p.initiative&&s.recoveredProjects===1);ck("Biography records project",p.life.history.some(x=>x.includes("Реализован")));
 p.role="public";p.life.capacity=15;r.human.oversight=0;let before=E.decisionPressure(s,r);r.human.oversight=100;ck("Institutional safeguards",before>0&&E.decisionPressure(s,r)===0);
 let old=E.fresh();delete old.regions[0].human;E.ensureEconomy(old);ck("Old save migration",!!old.regions[0].human);
 let w=E.fresh("book","","normal","human");E.start(w,"eu");for(let k of ["critical","creative","systems"])E.enroll(w,"eu",k);
 let control=JSON.parse(JSON.stringify(w));
 for(let i=0;i<480&&w.status==="playing";i++){if(i%16===0&&w.points>=35)E.humanAction(w,"eu","network");if(i%8===0&&w.points>=35&&E.economyStats(w).stability<65)E.economyAction(w,"eu","global","wood");if(i%8===0&&w.points>=35&&E.socialStats(w).child<70)E.reform(w,"eu","world");if(w.points>60)for(let u of E.upgrades)E.buy(w,u[0]);E.tick(w,()=>.2)}
 for(let i=0;i<w.day&&control.status==="playing";i++)E.tick(control,()=>.2);
 ck("Campaign victory",w.status==="won");ck("Support reduces both indices vs untreated scenario",E.humanStats(w).alcohol<E.humanStats(control).alcohol&&E.humanStats(w).drugs<E.humanStats(control).drugs);
 ck("Bounded regional values",w.regions.every(r=>Object.values(r.human).every(v=>Number.isFinite(v)&&v>=0&&v<=100)));
 let a=E.fresh();E.start(a,"eu");for(let i=0;i<360&&a.status==="playing";i++){for(let u of E.upgrades)E.buy(a,u[0]);E.tick(a,()=>.2)}ck("Original campaign regression",a.status==="won");
 return {results,day:w.day,supported:E.humanStats(w),control:E.humanStats(control),projects:w.legacyProjects}
}
const result=runHuman(html);console.log(JSON.stringify(result,null,2));