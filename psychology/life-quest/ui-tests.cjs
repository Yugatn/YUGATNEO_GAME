// Simulated DOM only: does not test layout, native input events or real browsers.
const fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function makeDom(){
 class E{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.style={};this.className="";this._text="";this.disabled=false;this.scrollLeft=0;this.clientWidth=320;this.offsetWidth=80;this.offsetLeft=0;this.classList={toggle:(k,on)=>{let a=this.className.split(/\s+/).filter(Boolean).filter(x=>x!==k);if(on)a.push(k);this.className=a.join(" ")}}}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(c=>c.textContent).join("")}
 append(...els){for(const e of els){e.parent=this;this.children.push(e)}}replaceChildren(...els){this.children=[];this._text="";this.append(...els)}
 setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]}
 contains(t){return this===t||this.children.some(e=>e.contains(t))}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 focus(){} click(){if(!this.disabled)this.onclick?.()}
 querySelector(sel){return this.all().find(e=>sel==="[aria-current=true]"?e.attrs["aria-current"]==="true":sel.startsWith(".")?e.className.split(/\s+/).includes(sel.slice(1)):e.tagName===sel.toUpperCase())||null}
 all(){return this.children.flatMap(e=>[e,...e.all()])}
 }
 const body=new E("body");for(const id of ["screen","xp","count","progress","map","modeLabel","modeMenu","quest","brain","models","planner","story","conflicts","perspectives","habits","thinking","reflection","learning","settings","reset"]){const e=new E("div");e.id=id;body.append(e)}
 return {body,createElement:t=>new E(t),getElementById:id=>body.all().find(e=>e.id===id)||null,addEventListener:()=>{}}
}
function drive(){
 let n=0;function check(v,label){if(!v)throw Error("UI "+n+": "+label);n++}
 const screen=()=>$("screen"),find=(tag,t)=>{const e=screen().all().find(x=>x.tagName===tag&&x.textContent===t);if(!e)throw Error("missing "+t);return e},click=t=>find("BUTTON",t).click(),group=cls=>{const e=screen().querySelector("."+cls);if(!e)throw Error("missing group "+cls);return e},option=(i,cls="choices")=>group(cls).children[i].click(),nav=id=>$(id).click();
 check(mode==="quest","initial mode");
 for(const i of ORDER){$("map").children[ORDER.indexOf(i)].click();check(data.stage===i,"map stage");check($("science-card").textContent.includes("Ограничения"),"stage science card");check($("science-card").textContent.includes("Авторская философская связь"),"philosophy distinction");const d=D[i];option((d[7]+1)%3);check(!data.done.includes(i+":0"),"wrong no XP");option(d[7]);check(data.done.includes(i+":0"),"round one");click("Как Вы думаете?");check(phase===1,"coaching transition");option(d[14]);check(data.done.includes(i+":1"),"round two");click(i===ORDER.at(-1)?"Итоги этапа":"Следующий уровень");if(i!==ORDER.at(-1))check(data.stage===ORDER[ORDER.indexOf(i)+1],"next level")}
 check(xp(data.done)===3000,"quest total");
 nav("planner");for(let i=0;i<MISSIONS.length;i++){group("mission-tabs").children[i].click();const m=MISSIONS[i];for(let j=0;j<m[3].length;j++){const el=$("plan-"+j);el.value=String(m[3][j][2][0]);el.onchange()}click("Проверить решения");check(data.done.includes("m:"+i),"mission reward")}
 nav("story");for(let i=0;i<STORIES.length;i++){group("mission-tabs").children[i].click();const st=STORIES[i];option(0);check(storyStep===1,"story transition");option(0);check(storyStep===2,"story consequence");option(st.correct);check(data.done.includes("t:"+i),"story reward")}
 nav("brain");for(let i=0;i<COGNITIVE.length;i++){group("mission-tabs").children[i].click();for(let j=0;j<3;j++){if(i===0)click("Запомнил — скрыть числа");if(i===3)option(spaceTask.correct,"spatial-options");else option(chooseRound(i,j,cogVariant).correct);click("Далее")}check(data.done.includes("c:"+i),"cognitive reward")}
 nav("conflicts");for(let i=0;i<CONFLICTS.length;i++){group("mission-tabs").children[i].click();const m=CONFLICTS[i];for(let j=0;j<3;j++){const k=m.steps[j][3];option((k+1)%3);check(conflictStep===j,"wrong stays");option(k);click(j===2?"Завершить диалог":"Следующий шаг");check(conflictStep===j+1,"dialogue next")}check(data.done.includes("r:"+i),"dialogue reward")}
 check(data.done.length===78,"all complete");check(xp(data.done)===4800,"max XP");check($("progress").value===78,"progress meter");
 group("mission-tabs").children[0].click();for(let j=0;j<3;j++){option(CONFLICTS[0].steps[j][3]);click(j===2?"Завершить диалог":"Следующий шаг")}check(xp(data.done)===4800,"repeat no double reward");
 nav("perspectives");for(let i=0;i<PERSPECTIVES.length;i++){group("mission-tabs").children[i].click();const m=PERSPECTIVES[i];for(let j=0;j<m.roles.length;j++){const role=m.roles[j];option([0,1,2].find(k=>!role.accepted.includes(k)));check(perspectiveStep===j&&!perspectiveCorrect(role,perspectiveChoice),"invalid role choice");option(role.accepted[j%2]);click(j===0?"Поменяться ролями":"Завершить сценарий");check(perspectiveStep===j+1,"role transition")}check(data.done.includes("p:"+i),"role reward")}
 check(data.done.length===82&&xp(data.done)===5200,"expanded total");
 group("mission-tabs").children[0].click();for(let j=0;j<2;j++){option(PERSPECTIVES[0].roles[j].accepted[1-j]);click(j===0?"Поменяться ролями":"Завершить сценарий")}check(xp(data.done)===5200,"role replay no XP");
 nav("learning");check(screen().textContent.includes("Мой маршрут развития"),"learning dashboard");check(nextLearning(data.done,data.route).key==="f:0","remaining recommendation");click("Продолжить по маршруту");check(mode==="reflection"&&reflectionIndex===0,"recommendation opens reflection");nav("habits");
 for(let i=0;i<HABITS.length;i++){group("mission-tabs").children[i].click();for(let j=0;j<2;j++){const q=HABITS[i].rounds[j];option((q.ok+1)%3);check(habitRound===j,"habit wrong stays");option(q.ok);click(j===0?"Следующий вопрос":"Завершить сценарий")}check(data.done.includes("h:"+i),"habit XP")}
 check(data.done.length===86&&xp(data.done)===5600,"expanded learning total");
 nav("learning");check(nextLearning(data.done,data.route).key==="f:0","reflection priority");nav("thinking");
 for(let i=0;i<THINKING.length;i++){group("mission-tabs").children[i].click();for(let j=0;j<2;j++){const q=THINKING[i].rounds[j];option((q.ok+1)%3);check(thinkingRound===j,"thinking wrong stays");option(q.ok);click(j===0?"Следующий вопрос":"Завершить сценарий")}check(data.done.includes("k:"+i),"thinking XP");check(screen().textContent.includes(THINKING[i].practice),"offline task")}
 check(data.done.length===90&&xp(data.done)===6000,"thinking total");
 group("mission-tabs").children[0].click();for(let j=0;j<2;j++){option(THINKING[0].rounds[j].ok);click(j===0?"Следующий вопрос":"Завершить сценарий")}check(xp(data.done)===6000,"thinking replay");
 nav("learning");click("Продолжить по маршруту");check(mode==="reflection","open reflection");
 for(let i=0;i<REFLECTIONS.length;i++){group("mission-tabs").children[i].click();check($("reflection-finish").disabled,"cannot finish early");for(let j=0;j<3;j++){const c=$("reflection-"+j);c.checked=true;c.onchange();check($("reflection-finish").disabled===(j<2),"checklist gate")}click("Отметить практикум выполненным");check(data.done.includes("f:"+i),"reflection XP")}
 check(data.done.length===94&&xp(data.done)===6400,"reflection total");
 group("mission-tabs").children[0].click();for(let j=0;j<3;j++){const c=$("reflection-"+j);c.checked=true;c.onchange()}click("Отметить практикум выполненным");check(xp(data.done)===6400,"reflection replay");
 nav("learning");check(nextLearning(data.done,data.route)===null,"learning complete");check(screen().textContent.includes("Все направления освоены"),"learning final");
 nav("models");check(screen().textContent.includes("Атлас развития"),"atlas");
 nav("settings");check(screen().textContent.includes("Перенос прогресса"),"settings");click("Показать код резервной копии");check(decodeBackup($("backup-text").value).done.length===94,"backup export");click("Проверить копию");click("Подтвердить объединение");check(xp(data.done)===6400,"merge no loss");check(JSON.parse(localStorage.getItem(K)).done.length===94,"persisted");
 $("reset").click();check(data.done.length===0&&xp(data.done)===0,"reset");check(mode==="quest","reset route");return n;
}
const mock=makeDom(),mem=new Map(),store={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
const n=new Function("document","localStorage","confirm",script+";return ("+drive.toString()+")()")(mock,store,()=>true);console.log(n+" simulated DOM assertions passed");
