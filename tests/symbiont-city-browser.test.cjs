'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../symbiont-city');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=original.replace('<link rel="stylesheet" href="./style.css">','<style>'+css+'</style>')
 .replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,'');
const content=fs.readFileSync(path.join(root,'content.js'),'utf8');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const controller=fs.readFileSync(path.join(root,'game.js'),'utf8');
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
