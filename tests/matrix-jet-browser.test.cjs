'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../matrix-jet');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script(?:\s[^>]*)?src="[^"]+"[^>]*><\/script>/g,'');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'game.js'),'utf8');
async function screen(browser,width,height){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.setDefaultTimeout(8000);
 const issues=[];page.on('pageerror',e=>issues.push(e.message));
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 await page.addScriptTag({content:engine});
 // Diagnostic wrapper exists ONLY inside the test browser, not in the app.
 await page.addScriptTag({content:`
  (()=>{const old=MatrixJetEngine.create;
   MatrixJetEngine.create=(...args)=>{const state=old(...args);window.__jetTestState=state;return state;};
  })();`});
 await page.addScriptTag({content:renderer});
 await page.locator('#start').click();
 return {page,issues};
}
test('portrait layout paints original jet without exceptions at 320/390/430px',async()=>{
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const sizes=[[320,640],[390,844],[430,932]];
  fs.mkdirSync(path.resolve(__dirname,'../test-artifacts/matrix-jet'),{recursive:true});
  for(const [width,height] of sizes){
   const {page,issues}=await screen(browser,width,height);
   try{
    await page.waitForTimeout(100);
    const metrics=await page.evaluate(()=>{
      const c=document.getElementById('sky').getBoundingClientRect();
      const controls=Array.from(document.querySelectorAll('.controls button'))
        .map(el=>el.getBoundingClientRect());
      const sample=document.getElementById('sky').getContext('2d')
        .getImageData(Math.floor(c.width/2),Math.floor(c.height*.76),1,1).data;
      return {canvas:{width:c.width,height:c.height},controls:
         controls.map(q=>({left:q.left,right:q.right,top:q.top,bottom:q.bottom})),
        pixel:[...sample]};
    });
    assert.ok(metrics.canvas.width>=width-1);
    assert.ok(metrics.canvas.height>=height-1);
    assert.ok(metrics.controls.every(q=>q.left>=0&&q.right<=width&&q.bottom<=height+1),
      'all four flight buttons must remain inside portrait viewport');
    assert.ok(metrics.pixel[3]>0,'plane should be drawn inside opaque canvas');
    assert.deepEqual(issues,[],'renderer should not throw');
    await page.screenshot({path:path.resolve(__dirname,
       '../test-artifacts/matrix-jet/'+width+'x'+height+'.png')});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('browser responds to altitude and portal, enables phase button and pause',async()=>{
 const browser=await chromium.launch({headless:true,
   executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,issues}=await screen(browser,390,844);
  try{
   await page.locator('#up').click();
   assert.match(await page.locator('#altitude').textContent(),/ВЫСОКО/);
   await page.evaluate(()=>{
    const s=window.__jetTestState;
    s.matrix=true;s.charges=2;s.invulnerable=0;s.phaseTime=0;
   });
   await page.waitForTimeout(120);
   assert.equal(await page.locator('#phase').isVisible(),true);
   assert.equal(await page.locator('#codeChip').isVisible(),true);
   await page.locator('#phase').click();
   const result=await page.evaluate(()=>({
    charges:window.__jetTestState.charges,
    active:window.__jetTestState.phaseTime>0,
  }));
   assert.equal(result.charges,1);
   assert.equal(result.active,true);
   await page.locator('#pause').click();
   assert.equal(await page.locator('#paused').isVisible(),true);
   await page.locator('#resume').click();
   assert.equal(await page.locator('#paused').isVisible(),false);
   assert.deepEqual(issues,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});
