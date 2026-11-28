// Planet X — repeatable UI logic smoke test (mock DOM, no browser layout).
// Run: node ideas-x/tests/interface-smoke.cjs
const fs=require("node:fs");
const path=require("node:path");
function runSmoke(html) {
const assert=(condition,label)=>{if(!condition)throw Error(label);passed.push(label)},passed=[];
const js=html.split("<script>")[1].split("</script>")[0];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert(new Set(ids).size===ids.length,"Unique HTML IDs");
assert([...js.matchAll(/\$\("([^"]+)"\)/g)].every(m=>ids.includes(m[1])),"All DOM references exist");
class MockNode {
constructor(){this.value="";this.checked=false;this.hidden=false;this.disabled=false;this.dataset={};this.attrs={};this.children=[];this.listeners={};this._html="";this.scrollTop=0;let set=new Set();this.classList={toggle:(k,v)=>{let on=v===undefined?!set.has(k):!!v;if(on)set.add(k);else set.delete(k);return on},contains:k=>set.has(k)}}
set innerHTML(v){this._html=v;let o=v.match(/<option value="([^"]*)"/);if(o&&!this.value)this.value=o[1]}get innerHTML(){return this._html}
appendChild(n){this.children.push(n);return n}replaceChildren(...n){this.children=n}setAttribute(k,v){this.attrs[k]=v}addEventListener(k,v){this.listeners[k]=v}getBoundingClientRect(){return {left:0,top:0,width:1000,height:440}}querySelectorAll(){return []}
}
const els=Object.fromEntries(ids.map(id=>[id,new MockNode()])),store={},listeners={};
const doc={getElementById:k=>els[k]||null,createElementNS:()=>new MockNode(),createDocumentFragment:()=>new MockNode(),addEventListener:(k,v)=>listeners[k]=v,hidden:false};
new Function("document","window","localStorage","fetch","AbortSignal","setInterval","clearInterval","confirm",js)(doc,{addEventListener:(k,v)=>listeners[k]=v},{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},async()=>{throw Error("offline test")},{timeout:()=>null},()=>1,()=>{},()=>true);
const state=()=>JSON.parse(store["ideas-x-v1"]),click=(el,dataset)=>el.onclick({target:{closest:()=>({dataset})}});
const tabs=["overview","system","society","science","peace","generations","development","chronicle","settings"];
const switchTo=id=>{if(tabs.slice(0,4).includes(id))click(els.deckNav,{tab:id});else els.moreTabs.onchange({target:{value:id}})};
assert(tabs.every(t=>els[t].hidden===(t!=="overview")),"Initial overview only");
assert(!els.start.hidden&&els.start.disabled&&els.controls.hidden,"Start visible, disabled until selection");
assert(els.econGlobal.innerHTML===""&&els.scienceGlobal.innerHTML==="","Inactive panels not rendered");
els.mode.value="human";els.regionSelect.value="eu";els.regionSelect.onchange({target:els.regionSelect});
assert(!els.start.disabled&&els.start.textContent==="Начать здесь","Region unlocks fixed start");
els.start.onclick();
assert(state().started&&state().selected==="eu"&&els.start.hidden&&!els.controls.hidden,"Start swaps to time controls");
assert(state().history.length===1&&state().history[0][0]===0&&state().history[0][1].length===192,"Initial historical snapshot");
for(let t of tabs){switchTo(t);assert(tabs.every(k=>els[k].hidden===(k!==t)),"Single active panel: "+t)}
switchTo("system");els.deckScroll.scrollTop=155;switchTo("society");switchTo("system");
assert(els.deckScroll.scrollTop===155,"Restore tab scroll position");
assert(els.econGlobal.innerHTML.includes("Устойчивость мира"),"Economy rendered on demand");
switchTo("generations");els.enroll.onclick();assert(state().generations.length===1,"School moved and works");
assert(state().generations[0].life.second!==state().generations[0].skill,"Second skill");
assert(els.glist.innerHTML.includes("Образовательный опыт")&&els.glist.innerHTML.includes("Профориентация"),"Career and education interface");
els.lifeStart.value="0";els.lifeStart.onchange();assert(els.enroll.textContent.includes("с рождения"),"Birth mode label");
els.enroll.onclick();assert(state().generations[1].startAge===0&&state().generations[1].level===0,"Birth enrollment interface");
els.lifeStart.value="10";els.lifeStart.onchange();
assert(els.glist.innerHTML.includes("Биография"),"Biography visible");
click(els.glist,{support:"1"});assert(state().generations[0].life.assisted===24,"Individual support UI");
switchTo("society");assert(els.humanGlobal.innerHTML.includes("Семейная среда"),"Human potential panel");
click(els.humanActions,{human:"family"});assert(state().regions.find(r=>r.id==="eu").human.family>=72,"Family support UI");
switchTo("science");click(els.techGrid,{science:"launch",tech:"water"});assert(state().research[0]?.tech==="water","Science action");
click(els.controls,{step:"7"});assert(state().day===7,"Time control independent of tab");
assert(state().history.length===2&&state().history[1][0]===4,"Four-turn history sampling");
switchTo("chronicle");assert(els.historyChart.innerHTML.includes("<svg")&&els.historyStats.innerHTML.includes("Изменение"),"History graph and comparison");
els.historyMetric.value="ecology";els.historyMetric.onchange();assert(els.historyChart.innerHTML.includes("Экология"),"History metric switch");
els.logFilter.value="crisis";els.logFilter.onchange();assert(els.log.innerHTML.includes("Нет событий выбранного типа"),"Chronicle event filter");
els.logFilter.value="all";els.logFilter.onchange();assert(els.log.innerHTML.includes("Первые участники"),"Chronicle restores events");
els.layer.onchange({target:{value:"healthRisk"}});assert(els.layer.value==="healthRisk","Health risk atlas layer");
els.layer.onchange({target:{value:"resource:food"}});assert(els.layer.value==="resource:food"&&els.mapnote.textContent.includes("Продовольствие"),"Resource layer");
assert(els.markers.children.some(n=>n.classList.contains("supplier")),"Supplier highlights");
assert(els.edges.children.some(n=>n.classList.contains("resourceRoute"))&&els.edges.children.some(n=>n.attrs.opacity===.07),"Resource route filtering");
els.layer.onchange({target:{value:"ecology"}});assert(els.layer.value==="ecology","Map layer selection");
els.mapZoom.onclick();assert(els.mapwrap.classList.contains("zoomed"),"Map zoom");
const view=()=>els.atlas.attrs.viewBox.split(" ").map(Number);
assert(view()[2]<1000&&els.zoomLevel.textContent==="3×","Focus selected region");
els.zoomIn.onclick();assert(view()[2]<1000/3,"Incremental zoom");
els.zoomOut.onclick();assert(Math.abs(view()[2]-1000/3)<.01,"Incremental zoom out");
const evt=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){}});
let prior=view();els.atlas.listeners.pointerdown(evt(1,400,200));els.atlas.listeners.pointermove(evt(1,450,220));els.atlas.listeners.pointerup(evt(1,450,220));
assert(view()[0]<prior[0],"Drag moves camera");
els.mapHome.onclick();assert(view().join(" ")==="0 0 1000 440","World reset");
els.atlas.listeners.pointerdown(evt(1,400,200));els.atlas.listeners.pointerdown(evt(2,600,200));els.atlas.listeners.pointermove(evt(2,700,200));els.atlas.listeners.pointerup(evt(1,400,200));els.atlas.listeners.pointerup(evt(2,700,200));
assert(view()[2]<1000,"Pinch increases scale");
for(let i=0;i<30;i++)els.zoomIn.onclick();assert(Math.abs(view()[2]-1000/6)<.01&&els.zoomIn.disabled,"Zoom upper bound");
els.mapHome.onclick();assert(els.zoomOut.disabled&&els.zoomLevel.textContent==="1×","Zoom lower bound");
els.atlas.listeners.wheel({clientX:500,clientY:220,deltaY:-100,preventDefault(){}});assert(view()[2]<1000,"Wheel zoom");
els.atlas.listeners.keydown({target:els.atlas,key:"Home",preventDefault(){}});assert(view()[2]===1000,"Keyboard home");
els.mapFocus.onclick();assert(view()[2]<1000,"Focus shortcut");
switchTo("settings");els.mapMotion.onclick();assert(els.atlas.classList.contains("noMotion"),"Animation preference");
els.reset.onclick();assert(state().day===0&&!state().started&&!els.overview.hidden&&els.settings.hidden,"Reset returns to overview");
assert(els.start.disabled&&els.controls.hidden,"Reset restores start controls");
assert(state().history.length===0,"Reset clears history");
assert(JSON.parse(store["ideas-x-ui-v1"]).motion===false,"Motion preference persisted");
els.mapSize.onclick();assert(els.gameShell.attrs["data-map-size"]==="large"&&JSON.parse(store["ideas-x-ui-v1"]).size==="large","Large atlas mode");
els.mapSize.onclick();assert(els.gameShell.attrs["data-map-size"]==="compact","Compact atlas mode");
els.mapSizeSelect.onchange({target:{value:"normal"}});assert(els.gameShell.attrs["data-map-size"]==="normal","Map size settings synchronize");
assert(JSON.parse(store["ideas-x-ui-v1"]).layer==="ecology","Map layer preference persisted");
els.mapLabels.onclick();assert(JSON.parse(store["ideas-x-ui-v1"]).labels===true,"Map labels preference persisted");
assert(els.eventSound.attrs["aria-pressed"]==="false","Sound off by default");
els.eventSound.onclick();assert(JSON.parse(store["ideas-x-ui-v1"]).sound===true&&els.eventSound.attrs["aria-pressed"]==="true","Sound preference on");
els.eventSound.onclick();assert(JSON.parse(store["ideas-x-ui-v1"]).sound===false,"Sound preference off");
switchTo("system");assert(els.deckScroll.scrollTop===0,"Reset clears scroll memory");
els.mode.value="peace";els.regionSelect.value="eu";els.regionSelect.onchange({target:els.regionSelect});els.start.onclick();assert(!els.eventAlert.hidden&&els.eventAlert.textContent==="Кризис","War alert");
els.eventAlert.onclick();assert(!els.chronicle.hidden&&!els.eventCard.hidden&&els.eventText.textContent.includes("Вооружённый конфликт"),"Event opens chronicle card");
els.eventRegion.onclick();assert(els.zoomLevel.textContent==="3×","Event region focus");
els.eventDetails.onclick();assert(!els.peace.hidden,"Event opens relevant section");
els.eventAlert.onclick();els.eventDismiss.onclick();assert(els.eventAlert.hidden&&els.eventCard.hidden,"Dismiss event");
click(els.controls,{step:"1"});assert(els.eventAlert.hidden,"Dismissed event does not repeat");
els.reset.onclick();els.mode.value="human";els.regionSelect.value="eu";els.regionSelect.onchange({target:els.regionSelect});els.start.onclick();
switchTo("system");assert(els.enterpriseSelect.disabled&&els.enterpriseDetail.innerHTML.includes("Школа"),"Empty enterprise panel");
switchTo("generations");els.lifeStart.value="10";els.lifeStart.onchange();els.enroll.onclick();
for(let i=0;i<22;i++){if(i%4===0){switchTo("society");click(els.humanActions,{human:"network"})}click(els.controls,{step:"7"})}
switchTo("system");assert(state().enterprises.length===1&&!els.enterpriseSelect.disabled,"Enterprise panel after project");
assert(els.enterpriseDetail.innerHTML.includes("Производительность")&&els.enterpriseActions.innerHTML.includes("Условия труда"),"Enterprise indicators and actions");
let well=state().enterprises[0].well;click(els.enterpriseActions,{enterprise:"care"});assert(state().enterprises[0].well>well,"Workplace action UI");
els.reset.onclick();assert(state().enterprises.length===0,"New party clears enterprises");
els.reset.onclick();els.mode.value="sandbox";els.regionSelect.value="eu";els.regionSelect.onchange({target:els.regionSelect});els.start.onclick();switchTo("system");
els.contractGood.value="food";els.contractGood.onchange();els.contractAmount.value="4";assert(!els.contractAdd.disabled&&els.contractPreview.textContent.includes("Маршрут"),"Contract preview");
els.contractAdd.onclick();assert(state().contracts.length===1&&els.contractList.innerHTML.includes("Ожидает"),"Contract UI creation");
els.contractMap.onclick();assert(els.layer.value==="contracts"&&els.edges.children.some(n=>n.classList.contains("contractRoute")),"Contract atlas");
click(els.controls,{step:"7"});assert(state().contracts[0].last>0&&els.contractList.innerHTML.includes("Выполняется")||state().contracts[0].last>0&&els.contractList.innerHTML.includes("Частично"),"Contract UI delivery");
click(els.contractList,{cancelContract:"1"});assert(state().contracts.length===0,"Contract UI cancellation");
els.reset.onclick();assert(state().contracts.length===0,"Contract reset");
return passed;
}
const passed=runSmoke(fs.readFileSync(path.join(__dirname,"../index.html"),"utf8"));
for(const label of passed)console.log("PASS "+label);
console.log(passed.length+" checks passed");
