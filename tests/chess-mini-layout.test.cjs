'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const chessScript = fs.readFileSync(require.resolve('chess.js'), 'utf8');
const originalHtml = fs.readFileSync(path.join(root,'chess-mini/index.html'),'utf8');
const boardCss = fs.readFileSync(path.join(root,'chess-mini/board-layout.css'),'utf8');
const puzzleScript = fs.readFileSync(path.join(root,'chess-mini/puzzles.js'),'utf8');
const inlineScripts=[...originalHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(x=>x[1]).filter(x=>x.includes('let game=new Chess()'));
if(inlineScripts.length!==1)throw Error('Expected a single Matrix Chess controller');
const staticHtml=originalHtml
  .replace('<link rel="stylesheet" href="./board-layout.css">','<style>'+boardCss+'</style>')
  .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/g,'');
async function createPage(browser, width, height) {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.setDefaultTimeout(12000);
  const issues = [];
  page.on('pageerror', err => issues.push(err.message));
  // Load the real committed HTML and CSS in memory without DNS or CDN requests.
  // The production chess.js and puzzles are injected as local JavaScript.
  await page.setContent(staticHtml,{waitUntil:'load'});
  await page.addScriptTag({content:chessScript+'\nwindow.Chess=Chess;'});
  await page.addScriptTag({content:puzzleScript});
  await page.addScriptTag({content:inlineScripts[0]});
  await page.locator('#enterGame').click();
  await page.locator('#board .square').first().waitFor();
  return {page,issues};
}
function verifyGeometry(d,width){
  assert.equal(d.count,64,'exactly 64 board squares');
  assert.equal(d.columns,8,'eight explicit columns');
  assert.equal(d.rows,8,'eight explicit rows');
  assert.ok(Math.abs(d.board.width-d.board.height)<1.2,'board should be 1:1, not warped');
  assert.ok(d.board.width>240,'mobile board should remain legible');
  assert.ok(d.maxWidthDelta<1,'each file should have the same width');
  assert.ok(d.maxHeightDelta<1,'each rank should have the same height');
  assert.ok(d.biggestNonSquare<1.2,'square width and height should match');
  assert.ok(d.maxPieceOverflow<1,'piece glyph must fit within its square');
  assert.ok(d.scrollOverflow<=2,'no horizontal page overflow');
  assert.ok(d.board.width<=width,'board must not exceed viewport width');
}
async function geometry(page) {
 return page.evaluate(()=>{
   const board=document.querySelector('#board');
   const outer=board.getBoundingClientRect();
   const squares=Array.from(board.querySelectorAll(':scope > .square'));
   const rects=squares.map(s=>s.getBoundingClientRect());
   const target=rects[0];
   let largest=0,overflow=0;
   for(let i=0;i<rects.length;i++){
     largest=Math.max(largest,Math.abs(rects[i].width-rects[i].height));
     const piece=squares[i].querySelector('.piece');
     if(piece){const box=piece.getBoundingClientRect();
      overflow=Math.max(overflow,box.width-rects[i].width,box.height-rects[i].height);
     }
   }
   return {
     count:squares.length,board:{width:outer.width,height:outer.height},
     columns:getComputedStyle(board).gridTemplateColumns.split(' ').length,
     rows:getComputedStyle(board).gridTemplateRows.split(' ').length,
     maxWidthDelta:Math.max(...rects.map(r=>r.width))-Math.min(...rects.map(r=>r.width)),
     maxHeightDelta:Math.max(...rects.map(r=>r.height))-Math.min(...rects.map(r=>r.height)),
     biggestNonSquare:largest,maxPieceOverflow:overflow,
     scrollOverflow:document.documentElement.scrollWidth-window.innerWidth,
     topLeft:squares[0]?.dataset.square,
   };
 });
}
test('responsive 8×8 board survives mobile, tablet, landscape and desktop viewports',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
   const screens=[[320,640],[375,812],[390,844],[430,932],[768,1024],[844,390],[1280,800]];
   fs.mkdirSync(path.join(root,'test-artifacts','chess-mini'),{recursive:true});
   for(const [width,height] of screens){
     const {page,issues}=await createPage(browser,width,height);
     try{
       const sizes=await geometry(page);
       verifyGeometry(sizes,width);
       assert.equal(sizes.topLeft,'a8','initial white-oriented position must start on a8');
       assert.deepEqual(issues,[],'no uncaught browser errors');
       if ([320,390,768,1280].includes(width)) {
         await page.screenshot({path:path.join(root,'test-artifacts','chess-mini',width+'x'+height+'.png')});
       }
     }finally{await page.close();}
   }
 }finally{await browser.close();}
});
test('responsive board supports move, flip, hint, puzzle and board palette changes',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox']});
 try{
  const {page,issues}=await createPage(browser,390,844);
  try{
    await page.locator('[data-square="e2"]').click();
    await page.locator('[data-square="e4"]').click();
    await page.locator('[data-square="e4"] .piece').waitFor();
    assert.match(await page.locator('#moves').textContent(),/e4/);
    await page.locator('#flipTop').click();
    assert.equal(await page.locator('#board .square').first().getAttribute('data-square'),'h1');
    verifyGeometry(await geometry(page),390);
    await page.locator('#boardTheme').selectOption('violet');
    await page.locator('#pieceSet').selectOption('letters');
    assert.equal(await page.locator('body').getAttribute('data-board'),'violet');
    verifyGeometry(await geometry(page),390);
    await page.locator('#gameMode').selectOption('puzzle');
    await page.locator('#puzzleTheme').selectOption('Мат в один');
    assert.equal(await page.locator('#board .square').count(),64);
    verifyGeometry(await geometry(page),390);
    assert.deepEqual(issues,[],'play, flip, puzzle and CSS should not cause JS exceptions');
  }finally{await page.close();}
 }finally{await browser.close();}
});
