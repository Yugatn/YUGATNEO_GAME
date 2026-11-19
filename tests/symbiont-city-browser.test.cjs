'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../symbiont-city');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const labCSS=fs.readFileSync(path.join(root,'lab.css'),'utf8');
const workshopsCSS=fs.readFileSync(path.join(root,'workshops.css'),'utf8');
const routeCSS=fs.readFileSync(path.join(root,'help-route.css'),'utf8');
const academyCSS=fs.readFileSync(path.join(root,'academy.css'),'utf8');
const systemsCSS=fs.readFileSync(path.join(root,'social-health.css'),'utf8');
const html=original.replace('<link rel="stylesheet" href="./style.css">','<style>'+css+'</style>')
 .replace('<link rel="stylesheet" href="./lab.css">','<style>'+labCSS+'</style>')
 .replace('<link rel="stylesheet" href="./workshops.css">','<style>'+workshopsCSS+'</style>')
 .replace('<link rel="stylesheet" href="./help-route.css">','<style>'+routeCSS+'</style>')
 .replace('<link rel="stylesheet" href="./academy.css">','<style>'+academyCSS+'</style>')
 .replace('<link rel="stylesheet" href="./social-health.css">','<style>'+systemsCSS+'</style>')
 .replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,'');
const content=fs.readFileSync(path.join(root,'content.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
const decisions=fs.readFileSync(path.join(root,'decisions.js'),'utf8');
const labUI=fs.readFileSync(path.join(root,'lab-ui.js'),'utf8');
const workshops=fs.readFileSync(path.join(root,'workshops.js'),'utf8');
const workshopsUI=fs.readFileSync(path.join(root,'workshops-ui.js'),'utf8');
const helpRoute=fs.readFileSync(path.join(root,'help-route.js'),'utf8');
const helpRouteUI=fs.readFileSync(path.join(root,'help-route-ui.js'),'utf8');
const academy=fs.readFileSync(path.join(root,'academy.js'),'utf8');
const academyUI=fs.readFileSync(path.join(root,'academy-ui.js'),'utf8');
const spiral=fs.readFileSync(path.join(root,'spiral-runner.js'),'utf8');
const spiralUI=fs.readFileSync(path.join(root,'spiral-runner-ui.js'),'utf8');
const social=fs.readFileSync(path.join(root,'social-organism.js'),'utf8');
const adult=fs.readFileSync(path.join(root,'adult-health.js'),'utf8');
const systemsUI=fs.readFileSync(path.join(root,'social-health-ui.js'),'utf8');
async function open(browser,width,height){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const values=new Map();
  Object.defineProperty(window,'localStorage',{configurable:true,value:{
   getItem(k){return values.has(String(k))?values.get(String(k)):null;},
   setItem(k,v){values.set(String(k),String(v));},
   removeItem(k){values.delete(String(k));},clear(){values.clear();}
  }});
 });
 await page.addScriptTag({content});
 await page.addScriptTag({content:engine});
 await page.addScriptTag({content:controller});
 await page.addScriptTag({content:decisions});
 await page.addScriptTag({content:labUI});
 await page.addScriptTag({content:workshops});
 await page.addScriptTag({content:workshopsUI});
 await page.addScriptTag({content:helpRoute});
 await page.addScriptTag({content:helpRouteUI});
 await page.addScriptTag({content:academy});
 await page.addScriptTag({content:academyUI});
 await page.addScriptTag({content:spiral});
 await page.addScriptTag({content:spiralUI});
 await page.addScriptTag({content:social});
 await page.addScriptTag({content:adult});
 await page.addScriptTag({content:systemsUI});
 await page.evaluate(()=>{
  document.getElementById('districtList').addEventListener('click',()=>window.__districtClicks=(window.__districtClicks||0)+1);
 });
 await page.waitForTimeout(100);
 return {page,errors};
}
test('browser renders accessible city and seven selectable districts at mobile and desktop widths',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  fs.mkdirSync(path.resolve(__dirname,'../test-artifacts/symbiont-city'),{recursive:true});
  for(const [w,h] of [[320,700],[390,844],[768,1024],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    assert.equal(await page.locator('[data-district]').count(),7);
    const data=await page.evaluate(()=>{
     const rect=document.querySelector('#cityCanvas').getBoundingClientRect();
     const canvas=document.getElementById('cityCanvas');
     const pixel=canvas.getContext('2d').getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data;
     return {width:rect.width,left:rect.left,right:rect.right,scroll:document.documentElement.scrollWidth,pixel:[...pixel]};
    });
    assert.ok(data.width>=250&&data.right<=w+2&&data.left>=0,'responsive map fits the screen');
    assert.ok(data.scroll<=w+2,'no horizontal page overflow');
    assert.equal(data.pixel[3],255,'city canvas is opaque');
    assert.deepEqual(errors,[],'no uncaught browser exceptions');
    await page.screenshot({path:path.resolve(__dirname,'../test-artifacts/symbiont-city/'+w+'x'+h+'.png'),fullPage:true});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('a 6-year-old, teen and adult get different scenario wording and a real mission reward',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,390,844);
  try{
   const texts=[];
   for(const age of [6,15,35,76]){
    await page.locator('#age').fill(String(age));
    await page.locator('#age').dispatchEvent('change');
    await page.locator('[data-district="dialogue"]').click();
    const opened=await page.locator('#missionOverlay').isVisible();
    const debug=await page.evaluate(()=>({
     hidden:document.getElementById('missionOverlay').hidden,
     title:document.getElementById('missionTitle').textContent,
     body:document.getElementById('missionBody').textContent.slice(0,80),
     story:document.getElementById('cityStory').textContent,
     districtClicks:window.__districtClicks||0,
     overlayStyle:getComputedStyle(document.getElementById('missionOverlay')).display,
    }));
    assert.ok(opened,'dialogue mission should open at age '+age+
      '; errors='+errors.join(' | ')+
      '; debug='+JSON.stringify(debug));
    texts.push(await page.locator('#missionBody').textContent());
    await page.locator('#missionClose').click();
   }
   assert.equal(new Set(texts).size,4);
   await page.locator('#age').fill('6');await page.locator('#age').dispatchEvent('change');
   await page.locator('[data-district="garden"]').click();
   await page.locator('#missionNext').click();
   const options=page.locator('#missionBody [data-choice]');
   assert.equal(await options.count(),2);
   await options.nth(1).click();
   await page.locator('#missionNext').click();
   await page.locator('#missionNext').click();
   assert.ok((await page.locator('#points').textContent()).trim()!=='0','mission points awarded');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});
test('0–2 mode offers adult offline play, no score; changing age never changes previous progress',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,320,700);
  try{
   await page.locator('#age').fill('2');await page.locator('#age').dispatchEvent('change');
   await page.locator('[data-district="library"]').click();
   assert.ok(await page.locator('#missionOverlay').isVisible(),
      'caregiver dialogue must open: '+errors.join(' | '));
   assert.match(await page.locator('#missionBody').textContent(),/экранная игра не предназначена/);
   assert.equal(await page.locator('#missionBody [data-choice]').count(),0);
   assert.equal((await page.locator('#points').textContent()).trim(),'0');
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});

test('the family decision lab is responsive and children can complete an actual simulation',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  fs.mkdirSync(path.resolve(__dirname,'../test-artifacts/symbiont-city'),{recursive:true});
  for(const [w,h] of [[320,700],[390,844],[768,1024],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    assert.equal(await page.locator('[data-lab-id]').count(),5);
    assert.match(await page.locator('#labCount').textContent(),/0 \/ 5/);
    const bounds=await page.evaluate(()=>{
      const r=document.getElementById('labSection').getBoundingClientRect();
      return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(bounds.left>=0&&bounds.right<=w+2&&bounds.overflow<=2,
      'decision laboratory fits width '+w);
    await page.locator('[data-lab-id="rumor"]').click();
    assert.ok(await page.locator('#labOverlay').isVisible());
    await page.locator('#labNext').click();
    assert.match(await page.locator('#labBody').textContent(),/источника|источник|официаль/);
    await page.locator('#labNext').click();
    assert.equal(await page.locator('#labBody [data-lab-option]').count(),2);
    await page.locator('#labBody [data-lab-option="2"]').click();
    assert.match(await page.locator('#labBody').textContent(),/Игровые последствия/);
    assert.match(await page.locator('#labCount').textContent(),/1 \/ 5/);
    await page.locator('#labNext').click();
    assert.match(await page.locator('#labBody').textContent(),/Рефлексия/);
    assert.deepEqual(errors,[],'browser does not throw on '+w);
    if(w<=390)await page.screenshot({path:path.resolve(__dirname,
      '../test-artifacts/symbiont-city/lab-'+w+'x'+h+'.png')});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('parent and child can vote separately, agree jointly, and revise without score farming',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,390,844);
  try{
   await page.locator('#age').fill('4');
   await page.locator('#age').dispatchEvent('change');
   assert.equal(await page.locator('#labTogether').isChecked(),true);
   await page.locator('[data-lab-id="bridge"]').click();
   await page.locator('#labNext').click();
   await page.locator('#labNext').click();
   await page.locator('#labBody [data-lab-option="0"]').click();
   assert.match(await page.locator('#labBody').textContent(),/Второй участник/);
   await page.locator('#labBody [data-lab-option="1"]').click();
   assert.match(await page.locator('#labBody').textContent(),/Сравните два выбора/);
   await page.locator('#labBody [data-lab-option="1"]').click();
   assert.match(await page.locator('#labCount').textContent(),/1 \/ 5/);
   const before=await page.locator('#labMeters').textContent();
   await page.locator('#labClose').click();
   await page.locator('[data-lab-id="bridge"]').click();
   await page.locator('#labNext').click();
   await page.locator('#labNext').click();
   for(let i=0;i<3;i++)await page.locator('#labBody [data-lab-option="1"]').click();
   assert.equal(await page.locator('#labMeters').textContent(),before);
   assert.match(await page.locator('#cityLevel').textContent(),/0 \/ 14/);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});

test('three real skill workshops fit 320px phones and desktop without horizontal overflow',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[320,700],[390,844],[768,1024],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    assert.equal(await page.locator('[data-workshop]').count(),3);
    const bounds=await page.evaluate(()=>{
     const r=document.getElementById('workshopsSection').getBoundingClientRect();
     return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(bounds.left>=0&&bounds.right<=w+2&&bounds.overflow<=2,
     'workshop layout must fit width '+w+': '+JSON.stringify(bounds));
    await page.locator('[data-workshop="memory"]').click();
    assert.equal(await page.locator('#workshopOverlay').isVisible(),true);
    assert.ok(await page.locator('[data-memory]').count()>=6);
    await page.locator('#workshopClose').click();
    assert.equal(await page.locator('#workshopOverlay').isVisible(),false);
    assert.deepEqual(errors,[],'no browser error at '+w);
    if(w<=390)await page.screenshot({path:path.resolve(__dirname,
     '../test-artifacts/symbiont-city/workshops-'+w+'x'+h+'.png'),fullPage:true});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('complete real visual search, build a bridge, and preserve existing city progress in Chromium',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,390,844);
  try{
   await page.locator('[data-workshop="attention"]').click();
   for(let round=0;round<4;round++){
    const target=await page.locator('.workshop-target strong').textContent();
    const index=await page.locator('[data-attention]').evaluateAll((nodes,t)=>
      nodes.find(x=>x.textContent===t)?.getAttribute('data-attention'),target);
    assert.ok(index!==undefined);
    await page.locator('[data-attention="'+index+'"]').click();
   }
   assert.match(await page.locator('#workshopsProgress').textContent(),/1 \/ 3/);
   assert.match(await page.locator('#workshopBody').textContent(),/Мастерская восстановлена/);
   await page.locator('#workshopDone').click();
   await page.locator('[data-workshop="bridge"]').click();
   for(const part of ['survey','supports','deck','test'])
     await page.locator('[data-build="'+part+'"]').click();
   assert.match(await page.locator('#workshopsProgress').textContent(),/2 \/ 3/);
   assert.match(await page.locator('#cityLevel').textContent(),/0 \/ 14/);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});

test('help route gameplay stays visible on portrait and desktop, with a reachable completion',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  fs.mkdirSync(path.resolve(__dirname,'../test-artifacts/symbiont-city'),{recursive:true});
  for(const [w,h] of [[320,700],[390,844],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    await page.locator('#routeStart').click();
    assert.equal(await page.locator('#routeOverlay').isVisible(),true);
    const info=await page.evaluate(()=>{
      const r=document.querySelector('.route-board').getBoundingClientRect();
      return {width:r.width,left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(info.width>130&&info.left>=0&&info.right<=w+2&&info.overflow<=2,
      'route board fits screen: '+w+' '+JSON.stringify(info));
    assert.equal(await page.locator('[data-route-dir]').count(),4);
    await page.locator('#routeHint').click();
    assert.match(await page.locator('#routeBody').textContent(),/Совет:/);
    assert.deepEqual(errors,[]);
    if(w<=390)await page.screenshot({path:path.resolve(__dirname,
      '../test-artifacts/symbiont-city/help-route-'+w+'x'+h+'.png')});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});

test('new Academy works on small phones and gives a clear explanation without horizontal overflow',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[320,700],[390,844],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    assert.equal(await page.locator('[data-academy-id]').count(),12);
    const bounds=await page.evaluate(()=>{
     const r=document.getElementById('academySection').getBoundingClientRect();
     return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(bounds.left>=0&&bounds.right<=w+2&&bounds.overflow<=3,
     'academy fits '+w+'px: '+JSON.stringify(bounds));
    await page.locator('[data-academy-id="friend"]').click();
    assert.equal(await page.locator('#academyOverlay').isVisible(),true);
    await page.locator('#academyNext').click();
    assert.equal(await page.locator('[data-academy-answer]').count(),3);
    await page.locator('[data-academy-answer="1"]').click();
    assert.match(await page.locator('#academyBody').textContent(),/слушай|разрешени/);
    assert.match(await page.locator('#academyCount').textContent(),/1 \/ 12/);
    assert.deepEqual(errors,[]);
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('new Spiral Runner renders a runner in fog of war and supports phone arrow controls',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,390,844);
  try{
   await page.locator('#spiralStart').click();
   assert.equal(await page.locator('#spiralOverlay').isVisible(),true);
   const r=await page.locator('#spiralCanvas').boundingBox();
   assert.ok(r&&r.width>200&&r.x+r.width<=391&&r.height>150,JSON.stringify(r));
   assert.equal(await page.locator('[data-spiral-direction]').count(),4);
   await page.locator('#spiralHint').click();
   assert.match(await page.locator('#spiralStatus').textContent(),/Подсказка/);
   await page.locator('#spiralDone').click();
   assert.equal(await page.locator('#spiralOverlay').isVisible(),false);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});

test('social organism simulation renders on mobile and can revise peaceful public solutions',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  for(const [w,h] of [[320,700],[390,844],[1280,850]]){
   const {page,errors}=await open(browser,w,h);
   try{
    assert.equal(await page.locator('[data-system-id]').count(),3);
    const geom=await page.evaluate(()=>{
     const r=document.getElementById('socialSection').getBoundingClientRect();
     return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(geom.left>=0&&geom.right<=w+2&&geom.overflow<=3,JSON.stringify(geom));
    await page.locator('[data-system-id="feedback"]').click();
    assert.equal(await page.locator('#systemsOverlay').isVisible(),true);
    await page.locator('#systemsNext').click();
    assert.equal(await page.locator('[data-systems-choice]').count(),3);
    await page.locator('[data-systems-choice="1"]').click();
    assert.match(await page.locator('#socialCount').textContent(),/1 \/ 3/);
    assert.match(await page.locator('#systemsBody').textContent(),/Мирная|мирная/);
    assert.deepEqual(errors,[]);
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('adult health modules cannot be opened or seen by children and unlock at 18',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,errors}=await open(browser,390,844);
  try{
   assert.equal(await page.locator('#adultHealthSection').isVisible(),false);
   assert.equal(await page.locator('[data-health-id]').count(),0);
   await page.locator('#age').fill('17');
   await page.locator('#age').dispatchEvent('change');
   assert.equal(await page.locator('#adultHealthSection').isVisible(),false);
   await page.locator('#age').fill('18');
   await page.locator('#age').dispatchEvent('change');
   assert.equal(await page.locator('#adultHealthSection').isVisible(),true);
   assert.equal(await page.locator('[data-health-id]').count(),4);
   await page.locator('[data-health-id="screens"]').click();
   await page.locator('#systemsNext').click();
   await page.locator('[data-systems-choice="0"]').click();
   assert.match(await page.locator('#systemsBody').textContent(),/не означает/);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});
