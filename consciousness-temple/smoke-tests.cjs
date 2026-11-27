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
result.legacy=migrateMeta({points:3},0).space.lastExchange===-1;
const battle=create(0,1,123,m),base=battle.clarity;
result.place=place(battle,0,0,"attention")&&battle.clarity===base-V.attention.cost&&!place(battle,0,0,"reason")&&!place(battle,-1,0,"reason");
result.remove=remove(battle,0,0)&&!remove(battle,0,0);
start(battle);const old=battle.time;step(battle,NaN);step(battle,-1);result.invalidTime=battle.time===old;
step(battle,.1);result.pause=pause(battle)&&!pause(battle);const t=battle.time;step(battle,.1);result.resume=battle.time===t&&start(battle);
const w=create(0,1,123,m);start(w);w.wave=waveLimit(w);step(w,.1);result.victory=w.phase==="won"&&award(m,0)&&!award(m,0);
const l=create(0,1,123,m);start(l);for(let i=0;i<3;i++)breach(l,0);result.defeat=l.phase==="lost"&&l.integrity===0&&!start(l);
const enemy=create(0,1,123,m);addEnemy(enemy,{key:"greed",r:0});const e=enemy.enemies[0],hp=e.hp;hurt(enemy,e,NaN);hurt(enemy,e,-10);result.invalidDamage=e.hp===hp;hurt(enemy,e,e.hp+e.shield);hurt(enemy,e,10);result.singleReward=enemy.kills===1;
let fusions=0;for(const [k,f] of Object.entries(FUSIONS)){const x=create(9,1,123,m);x.clarity=10000;x.grid[0][0]={key:f.a,hp:V[f.a].hp,rank:1,t:1};x.grid[0][1]={key:f.b,hp:V[f.b].hp,rank:1,t:1};if(fuse(x,0,0,0,1)&&x.grid[0][0].key===k&&x.grid[0][1]===null&&restoreBattle(x))fusions++}result.allFusions=fusions===Object.keys(FUSIONS).length;
result.audioDefaults=JSON.stringify(audioPrefs(null))===JSON.stringify({music:35,effects:55});
result.audioClamp=JSON.stringify(audioPrefs({music:123,effects:-5}))===JSON.stringify({music:100,effects:0});
result.audioInvalid=audioPrefs({music:NaN,effects:"10"}).effects===55;
result.audioZero=audioPrefs({music:0}).music===0;
result.audioIndependent=audioLevel("music",{music:20,effects:80})===.2&&audioLevel("effects",{music:20,effects:80})===.8;
result.audioThemes=audioTheme("running",false,false,false)==="battle"&&audioTheme("paused",false,false,false)===null&&audioTheme("paused",true,true,true)==="space"&&audioTheme("paused",true,false,true)==="society"&&audioTheme("paused",true,false,false)==="inner";
result.audioScores=Object.values(AUDIO_THEMES).every(n=>n.length===6&&n.every(v=>Number.isFinite(v)&&v>0));
const preview=create(0,1,42,metaNew()),before=JSON.stringify(preview);
result.placementPreview=placementIssue(preview,0,0,"attention")===null&&JSON.stringify(preview)===before;
result.placementBounds=placementIssue(preview,-1,0,"attention")==="bounds";
result.placementTeam=placementIssue(preview,0,0,"courage")==="team";
result.placementOccupied=place(preview,0,0,"attention")&&placementIssue(preview,0,0,"attention")==="occupied";
result.placementCooldown=placementIssue(preview,0,1,"attention")==="cooldown";
preview.cool.attention=0;preview.clarity=0;result.placementClarity=placementIssue(preview,0,1,"attention")==="clarity";
preview.clarity=1000;addEnemy(preview,{key:"greed",r:0});preview.enemies[0].x=1.5;result.placementEnemy=placementIssue(preview,0,1,"attention")==="enemy";
preview.phase="lost";result.placementFinished=placementIssue(preview,1,1,"attention")==="finished";
result.menuRoutes=Object.keys(MENU_PAGES).every(k=>menuRoute(k)===k);
result.menuUnknown=menuRoute("constructor")==="home";
result.worldRoutes=WORLD_ROUTES.every(k=>worldRoute(k)===k);
result.worldFallback=worldRoute("bad")==="map";
result.worldMap=worldMapVisible("questPanel")&&worldMapVisible("branchPanel")&&worldMapVisible("socialPanel")&&!worldMapVisible("spacePanel");
return result})()
`)();
const ids=new Set(Array.from(html.slice(0,html.indexOf("<script>")).matchAll(/\bid="([^"]+)"/g),m=>m[1]));
result.domReferences=Array.from(script.matchAll(/\$\("([^"]+)"\)/g),m=>m[1]).every(id=>ids.has(id));
const menuCode=script.slice(script.indexOf("let menuActive=false"),script.indexOf("menuInit();restore();"));
const mock=`
const nodes={};const cl={add(){},remove(){}};const document={activeElement:null,body:{classList:cl}};
function $(id){return nodes[id]||(nodes[id]={id,hidden:false,open:false,value:"",scrollTop:0,textContent:"",inert:false,isConnected:true,setAttribute(){},removeAttribute(){},focus(){document.activeElement=this},querySelector(){return null},prepend(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false}})}
document.activeElement=$("menuOpen");function el(){return {}}
let s=create(0,1,42,metaNew()),worldOpen=false,worldSig="",practice=null,sceneOpen=false;function closePractice(){practice=null}function worldUI(){}function update(){}function save(){}function draw(){}function tone(){}function teamUI(){}function templeUI(){}function sceneUI(){}function learningUI(){}function journalUI(){}function mapUI(){}function renderLex(){}
`;
const menuResults=new Function(core+mock+menuCode+`
return (()=>{menuInit();start(s);menuGo("home");const opened=menuActive&&s.phase==="paused"&&$("arena").inert&&$("gameMenu").open&&!$("page-home").hidden;menuGo("world");worldNavigate("spacePanel");const space=worldOpen&&$("spacePanel").open&&!$("spacePanel").hidden&&$("worldMap").hidden&&!$("questPanel").open;worldNavigate("questPanel");const quest=$("questPanel").open&&!$("worldMap").hidden&&$("spacePanel").hidden;practice={};menuBack();const practiceBack=!practice&&menuCurrent==="world";menuGo("library");const library=!worldOpen&&$("worldPanel").hidden&&!$("page-library").hidden;menuBack();const returnWorld=menuCurrent==="world"&&worldOpen&&$("questPanel").open;menuBack();const subBack=worldCurrent==="spacePanel";menuBack();const mapBack=worldCurrent==="map";menuBack();const back=menuCurrent==="home";menuBack();const close=!menuActive&&!$("arena").inert&&!$("gameMenu").open&&document.activeElement===$("menuOpen")&&s.phase==="paused";menuGo("settings");menuClose(false);const direct=!menuActive&&!$("arena").inert;return {opened,space,quest,practiceBack,library,returnWorld,subBack,mapBack,back,close,direct}})()
`)();
for(const [key,value] of Object.entries(menuResults))result["menu_"+key]=value;
const allIds=Array.from(html.slice(0,html.indexOf("<script>")).matchAll(/\bid="([^"]+)"/g),m=>m[1]);
result.uniqueIds=new Set(allIds).size===allIds.length;
result.allMenuPages=new Function(core+"return Object.keys(MENU_PAGES)")().every(k=>ids.has("page-"+k));
for(const [k,v] of Object.entries(result))console.log((v?"PASS ":"FAIL ")+k);
if(!Object.values(result).every(Boolean))process.exitCode=1;
