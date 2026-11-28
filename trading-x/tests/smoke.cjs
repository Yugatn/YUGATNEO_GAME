/* Trading X offline smoke: node trading-x/tests/smoke.cjs
 * DOM/Canvas doubles only. Browser layout and gestures require real E2E.
 */
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
scripts.forEach(s=>new Function(s));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(ids.length!==new Set(ids).size)throw Error('duplicate DOM ID');
if(/position\s*:\s*(sticky|fixed)/.test(html.match(/<style>([\s\S]*?)<\/style>/)[1]))throw Error('pinned element');
const ctx = new Proxy({}, {get:(t,k)=>typeof t[k]!=='undefined'?t[k]:()=>{},set:(t,k,v)=>(t[k]=v,true)});
const nodes={}, defaults={tf:'1',style:'candle',zoom:'48',ind:'none',risk:'.01',stop:'.02',regime:'0',lo:'100',lc:'105',lh:'108',ll:'98',netroute:'primary',netsector:'0'};
function node(id){let classes=new Set();return {id,children:[],dataset:{},value:defaults[id]||'',checked:id==='vol',hidden:false,classList:{contains(k){return classes.has(k)},add(k){classes.add(k)},remove(k){classes.delete(k)},toggle(k,force){const v=force===undefined?!classes.has(k):force;v?classes.add(k):classes.delete(k);return v}},replaceChildren(...x){this.children=x},appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(){},scrollIntoView(){},querySelectorAll(){if(id==='netamounts')return this.amounts??(this.amounts=[0,1000,5000,10000].map(x=>{let a=node('');a.dataset.amount=String(x);return a}));if(id==='netedges')return [node('')];return []},getBoundingClientRect(){return {width:390,height:240,left:0}},getContext(){return ctx}}}
const doc={getElementById(id){if(!ids.includes(id))throw Error('missing DOM '+id);return nodes[id]??(nodes[id]=node(id))},createElement(){return node('')},body:node('body')};
let stored=null;const storage={getItem(){return stored},setItem(k,v){stored=v}};
const win={addEventListener(){},scrollTo(){},devicePixelRatio:2};
const result=new Function('document','localStorage','window','confirm',scripts[1]+`
let tests=0;function ck(v,label){if(!v)throw Error('smoke '+tests+' '+(label||''));tests++}
ck($('boot').hidden&&Q.length===lessons.length&&Q.length>=30,'boot');
ck(lessonIds.length===Q.length&&new Set(lessonIds).size===Q.length&&new Set(courseOrder).size===Q.length&&courseOrder.length===Q.length,'stable curriculum');ck(index===courseOrder[0],'budget first');for(let i of courseOrder){ck(index===i,'route order');let xp=$('xp').textContent;choose((Q[i].correct+1)%3);ck($('xp').textContent===xp&&reviewPending.has(lessonIds[i]),'wrong answer queued');choose(Q[i].correct);ck(solved.has(i)&&!$('lessonReward').hidden&&!reviewPending.has(lessonIds[i]),'lesson');$('next').onclick()}
ck(mode==='city');switchMode('campaign');$('courseChapter').value='indicators';$('courseLevel').value='advanced';changeCourse();ck(filteredLessons().length===2&&courseMeta[index].chapter==='indicators','filters');let i=index,xp=$('xp').textContent;choose((Q[i].correct+1)%3);ck(reviewPending.has(lessonIds[i])&&$('next').disabled,'solved error');$('courseReview').onclick();ck(reviewMode&&index===i,'review route');choose(Q[i].correct);ck(!reviewPending.size&&$('xp').textContent===xp,'review no extra XP');$('next').onclick();ck(!reviewMode,'review exit');$('courseChapter').value='all';$('courseLevel').value='all';changeCourse();ck(JSON.parse(localStorage.getItem('trading-x-v1')).solvedIds.length===Q.length,'stable IDs stored');switchMode('city');
for(let i=0;i<cityQuests.length;i++){let q=cityQuests[netIndex];$('netroute').value='reserve';$('netroute').onchange();$('netcommit').onclick();ck(cityState.result.cash===q.budget,'reserve');answerCity(q.correct);ck(netSolved.has(i));$('netnext').onclick()}
switchMode('campaign');startPractice();ck($('tf').disabled);
for(let i=0;i<practiceTasks.length;i++){ck(practiceIndex===i);let t=practiceTasks[i],a=drawMeta.a;let j=t.type==='pick'?a.findIndex(b=>b[t.id==='findhigh'?'h':'v']===Math.max(...a.map(v=>v[t.id==='findhigh'?'h':'v']))):0;if(t.type!=='draw')selectCandle(j);
if(t.type==='draw'){let a=drawMeta.a,kind=t.draw;let candidates=[];for(let x=1;x<a.length-1;x++)for(let y=x+4;y<a.length-1;y++)if(gradeDraw(kind,a,[a[x].t,a[y].t]).ok)candidates.push([x,y]);ck(candidates.length>0,'valid draw scenario');ck(!gradeDraw(kind,a,[a[0].t,a[1].t]).ok,'invalid marks');let [x,y]=candidates[0];selectCandle(x,false);ck(practiceState.marks.length===0,'keyboard navigation does not mark');$('drawMark').onclick();ck(practiceState.marks.length===1);$('drawUndo').onclick();ck(practiceState.marks.length===0);selectCandle(x);selectCandle(y);$('drawClear').onclick();ck(practiceState.marks.length===0,'clear marks');selectCandle(x);selectCandle(y);$('drawCheck').onclick()}if(t.type==='experiment'){let base=JSON.stringify(practiceState.experiment.original),series=JSON.stringify(data);$('experimentSlider').value=t.target==='doji'?'2':'0';renderExperiment();$('experimentCheck').onclick();ck(!practiceState.done,'wrong experiment');$('experimentSlider').value=t.target==='red'?'-4':t.target==='green'?'4':'0';renderExperiment();let b=practiceState.experiment.hypothetical;ck(b.h>=Math.max(b.o,b.c)&&b.l<=Math.min(b.o,b.c),'valid OHLC');$('experimentCheck').onclick();ck(JSON.stringify(practiceState.experiment.original)===base&&JSON.stringify(data)===series,'history unchanged')}if(t.type==='quiz'){let q=practiceState.question;ck(q.options.length===3&&new Set(q.options).size===3);let xp=$('xp').textContent;answerPractice((q.correct+1)%3);ck(!practiceState.done&&$('xp').textContent===xp);answerPractice(q.correct)}
ck(practiceState.done&&practiceSolved.has(t.id));let xp=$('xp').textContent,sel=selection;finishPractice('repeat');ck($('xp').textContent===xp);moveCandle(1);ck(selection===sel&&$('candleprev').disabled,'completed highlight');$('practiceNext').onclick()}
ck(practiceSolved.size===practiceTasks.length);ck(JSON.parse(localStorage.getItem('trading-x-v1')).practiceSolved.length===practiceTasks.length);
switchMode('lab');ck(!$('tf').disabled);
for(let i=0;i<4;i++){labIndex=i;[()=>preset(100,105,108,98),()=>preset(105,100,108,98),()=>preset(100,100,106,94),()=>preset(103,105,106,97)][i]();$('labcheck').onclick();ck(labSolved.has(i))}
switchMode('sandbox');ck(!practiceActive&&$('practicebar').hidden);tick(1);let old=cursor;switchMode('lab');switchMode('sandbox');ck(cursor===old);
ck($('xp').textContent===(Q.length*100+practiceTasks.length*75+4*75+cityQuests.length*150)+' XP');
return {tests,xp:$('xp').textContent};`)(doc,storage,win,()=>true);
// Legacy snapshots: preserve old numeric IDs, then verify a reload with stable IDs.
function bootSnapshot(snapshot){stored=JSON.stringify(snapshot);return new Function('document','localStorage','window','confirm',scripts[1]+`
return {index,solved:[...solved],review:[...reviewPending],xp:$('xp').textContent,snapshot:JSON.parse(localStorage.getItem('trading-x-v1'))};`)(doc,storage,win,()=>true)}
const legacy=bootSnapshot({solved:[0,5,23],index:5,netSolved:[0],labSolved:[0],practiceSolved:['body']});
if(legacy.index!==5||legacy.solved.length!==3||legacy.xp!=='600 XP'||legacy.snapshot.lessonId!=='rsi')throw Error('legacy migration');
if(legacy.snapshot.solvedIds.join(',')!=='ohlc,rsi,financial-safety')throw Error('stable ID migration');
const migrated=bootSnapshot({...legacy.snapshot,solved:[],reviewPending:['rsi','invalid-id']});
if(migrated.index!==5||migrated.solved.length!==3||migrated.xp!=='600 XP'||migrated.review.join(',')!=='rsi')throw Error('stable ID reload');
result.tests+=3;
console.log('Trading X smoke OK',result);
