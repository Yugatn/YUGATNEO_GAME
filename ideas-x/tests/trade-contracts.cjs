// Deterministic trade ledger, route and enterprise contract regression.
const fs=require("node:fs"),path=require("node:path");
function runTrade(html){
const js=html.split("<script>")[1].split("</script>")[0],E=new Function(js.replace(/\bbrowser\(\);\s*$/,"")+";return engine();")();
let results=[];function ck(n,v){if(!v)throw Error(n);results.push(n)}
let s=E.fresh("book","","normal","sandbox");E.start(s,"eu");s.points=999;
let target=s.regions.find(r=>r.id==="eu"),src=E.supplierOptions(s,"eu","food")[0],a=s.regions.find(r=>r.id===src.id);target.supply.food=10;a.supply.food=80;
ck("Contract creation",E.contractCreate(s,a.id,target.id,"food",4));ck("Duplicate rejected",!E.contractCreate(s,a.id,target.id,"food",4));
let c=s.contracts[0];s.day=4;let sum=s.regions.reduce((n,r)=>n+r.supply.food,0);E.contractTick(s);
ck("Actual transfer",c.last>0&&target.supply.food>10&&a.supply.food<80);ck("Conservation",Math.abs(sum-s.regions.reduce((n,r)=>n+r.supply.food,0))<1e-8);
a.trade=0;s.day=8;E.contractTick(s);ck("Blocked endpoint",c.state==="blocked"&&c.last===0);a.trade=100;s.day=12;E.contractTick(s);ck("Recovery",c.last>0);
a.supply.food=36;s.day=16;E.contractTick(s);ck("Protected source reserve",a.supply.food>=35&&c.last<=1.000001);
target.supply.food=99.5;a.supply.food=90;s.day=20;E.contractTick(s);ck("Destination limit",target.supply.food<=100&&c.last<=.500001);
let second=s.regions.find(r=>r.id!==a.id&&r.id!==target.id&&E.contractRoute(s,a.id,r.id).length);ck("Second buyer",E.contractCreate(s,a.id,second.id,"food",6));
a.supply.food=38;target.supply.food=5;second.supply.food=5;s.day=24;E.contractTick(s);ck("Shared source allocation",a.supply.food>=35-1e-8&&s.contracts.reduce((n,c)=>n+c.last,0)<=3.000001&&s.contracts.every(c=>c.last>0));
ck("Cancellation",E.contractCancel(s,c.id)&&s.contracts.length===1);
let primary=E.contractRoute(s,"us","eu"),mid=s.regions.find(r=>r.id===primary[1]);mid.trade=0;let alternate=E.contractRoute(s,"us","eu");ck("Alternative route",primary.length>2&&alternate.length>0&&!alternate.includes(mid.id));
let old=E.fresh();delete old.contracts;E.ensureEconomy(old);ck("Migration",Array.isArray(old.contracts));
let saved=JSON.parse(JSON.stringify(s));E.ensureEconomy(saved);ck("Persistence",saved.contracts[0].id===s.contracts[0].id&&saved.contracts[0].total===s.contracts[0].total);
let q=E.fresh("book","","normal","sandbox");E.start(q,"eu");q.points=999;E.enroll(q,"eu","critical");E.enroll(q,"us","creative");let [p1,p2]=q.generations;p1.role="engineer";p2.role="loader";for(let p of [p1,p2]){p.projectDay=1;p.life.capacity=95;p.level=90}for(let i=0;i<12;i++)E.tick(q,()=>.2);let seller=q.enterprises.find(e=>e.region==="eu"),buyer=q.enterprises.find(e=>e.region==="us");ck("Enterprise pair",!!seller&&!!buyer);ck("Enterprise contract",E.contractCreate(q,"eu","us","vehicles",6,seller.id,buyer.id));ck("Incompatible recipient rejected",!E.contractCreate(q,"eu","us","vehicles",4,seller.id,seller.id));q.regions.find(r=>r.id==="eu").supply.vehicles=90;q.regions.find(r=>r.id==="us").supply.vehicles=5;q.day=16;E.contractTick(q);ck("Enterprise output limit",q.contracts[0].last>0&&q.contracts[0].last<=seller.output*.08+1e-8);
return {results,primary,alternate,enterpriseTransfer:q.contracts[0].last}
}
console.log(JSON.stringify(runTrade(fs.readFileSync(path.join(__dirname,"../index.html"),"utf8")),null,2));
