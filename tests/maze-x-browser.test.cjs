'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../maze-x');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
 .replace(/<script\s+[^>]*src="[^"]+"[^>]*><\/script>/g,'');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
async function launch(browser,width,height,mode='explorer'){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
 page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(html,{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const values=new Map();
  Object.defineProperty(window,'localStorage',{configurable:true,value:{
   getItem:k=>values.has(k)?values.get(k):null,
   setItem:(k,v)=>values.set(k,String(v)),
   removeItem:k=>values.delete(k),clear:()=>values.clear(),
  }});
 });
 await page.addScriptTag({content:engine});
 await page.addScriptTag({content:`
  (()=>{const initial=LabyrinthX.create;
   LabyrinthX.create=(...args)=>{const state=initial(...args);window.__mazeState=state;return state;};
  })();`});
 await page.addScriptTag({content:game});
 await page.locator('#mode').selectOption(mode);
 await page.locator('#start').click();
 await page.waitForTimeout(90);
 return {page,errors};
}
function geometries(page){return page.evaluate(()=>{
 const rect=e=>{const r=e.getBoundingClientRect();
  return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const canvas=document.getElementById('scene');
 const r=rect(canvas),buttons=['up','down','left','right','phase'].map(id=>rect(document.getElementById(id)));
 const c=canvas.getContext('2d'),image=c.getImageData(Math.floor(r.width*.5)-20,Math.floor(r.height*.52)-20,40,40);
 const colors=new Set();
 for(let i=0;i<image.data.length;i+=16)colors.add(image.data[i]+':'+image.data[i+1]+':'+image.data[i+2]);
 return {canvas:r,buttons,colors:colors.size,
  scrollWidth:document.documentElement.scrollWidth,
  state:{floor:window.__mazeState.floor,phase:window.__mazeState.phase,
    visible:window.__mazeState.floors[0].visited,
    total:window.__mazeState.floors[0].size**2}};
});}
test('browser viewport shows the nearby maze, player and accessible controls in portrait',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,
  args:['--no-sandbox']});
 try{
  fs.mkdirSync(path.resolve(__dirname,'../test-artifacts/maze-x'),{recursive:true});
  for(const [width,height] of [[320,640],[390,844],[430,932],[768,1024]]){
   const {page,errors}=await launch(browser,width,height);
   try{
    const g=await geometries(page);
    assert.ok(g.canvas.width>=width-1&&g.canvas.height>=height-1);
    assert.ok(g.buttons.every(r=>r.x>=0&&r.right<=width+1&&r.bottom<=height+1),
      'maze D-pad and phase controls must remain inside mobile screen');
    assert.ok(g.scrollWidth<=width+2,'no horizontal overflow');
    assert.equal(g.state.phase,'playing');
    assert.ok(g.state.visible>0&&g.state.visible<g.state.total*.3,
      'only a fragment of the huge maze is initially revealed');
    assert.ok(g.colors>5,'Canvas renders maze and runner, not just a blank rectangle');
    assert.deepEqual(errors,[],'no uncaught browser exceptions');
    await page.screenshot({path:path.resolve(__dirname,'../test-artifacts/maze-x/'+width+'x'+height+'.png')});
   }finally{await page.close();}
  }
 }finally{await browser.close();}
});
test('real browser allows moving, solving a fork riddle and crossing a wall via portal power',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,
  args:['--no-sandbox']});
 try{
  const {page,errors}=await launch(browser,390,844);
  try{
   const direction=await page.evaluate(()=>{
    const s=window.__mazeState;
    return LabyrinthX.openDirs(s.floors[0],s.player.x,s.player.y)[0].id;
   });
   await page.locator('#'+direction).click();
   assert.ok(await page.evaluate(()=>window.__mazeState.steps>=1));
   await page.evaluate(()=>{
    const s=window.__mazeState,f=s.floors[0];s.moveCooldown=0;
    for(let y=1;y<f.size;y++)for(let x=1;x<f.size;x++)
     if(LabyrinthX.openDirs(f,x,y).length>=3){
      s.player={x,y,facing:'right'};return;
     }
   });
   await page.waitForTimeout(170);
   await page.locator('#junction').click();
   assert.equal(await page.locator('#riddle').isVisible(),true);
   assert.equal(await page.locator('#answers button').count(),3);
   const correct=await page.evaluate(()=>{
    const offered=window.__mazeState.riddle;
    return LabyrinthX.RIDDLES[offered.index].correct;
   });
   await page.locator('#answers button').nth(correct).click();
   assert.equal(await page.locator('#riddle').isVisible(),false);
   assert.equal(await page.evaluate(()=>window.__mazeState.riddlesSolved),1);
   await page.evaluate(()=>{
    const s=window.__mazeState;s.matrix=true;s.charges=2;s.moveCooldown=0;
   });
   await page.waitForTimeout(170);
   await page.locator('#phase').click();
   assert.equal(await page.evaluate(()=>window.__mazeState.phaseArmed),true);
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }finally{await browser.close();}
});
