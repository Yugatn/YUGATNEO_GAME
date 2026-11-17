'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {Chess}=require('chess.js');
const puzzles=require('../chess-mini/puzzles.js');
const html=fs.readFileSync(path.join(__dirname,'../chess-mini/index.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).find(s=>s.includes('let game=new Chess()'));
if(!script)throw new Error('Cannot find inline chess app');
function setup(){
 const dom=new JSDOM(html,{url:'https://local.test/chess-mini/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.Chess=Chess;w.NeoChessPuzzles=puzzles;
 w.eval(script);
 return w;
}
function el(w,id){const node=w.document.getElementById(id);assert.ok(node,'missing '+id);return node;}
function select(w,id,value){
 el(w,id).value=value;
 el(w,id).dispatchEvent(new w.Event('change',{bubbles:true}));
}
function square(w,algebraic){
 const found=[...el(w,'board').children].find(e=>e.getAttribute('aria-label')?.startsWith(algebraic));
 assert.ok(found,'square '+algebraic+' should exist');
 return found;
}
test('app initializes a real 64-square board and displays splash before start',()=>{
 const w=setup();
 assert.equal(el(w,'board').children.length,64);
 assert.equal(el(w,'chessIntro').hidden,false);
 el(w,'enterGame').click();
 assert.equal(el(w,'chessIntro').hidden,true);
 assert.ok(square(w,'d1').textContent.includes('♕'));
 assert.ok(square(w,'d8').textContent.includes('♛'));
 w.close();
});
test('puzzle is playable from start to first-solve reward, repeat gives no more points',()=>{
 const w=setup();
 select(w,'gameMode','puzzle');
 assert.equal(el(w,'puzzleControls').style.display,'block');
 assert.equal(el(w,'clockPreset').disabled,true);
 assert.match(el(w,'puzzleInfo').textContent,/Последняя горизонталь/);
 select(w,'hintsToggle','off');
 assert.equal(el(w,'hintMove').disabled,true);
 square(w,'e1').click();
 assert.equal(el(w,'board').querySelectorAll('.square.legal').length,0,'no legal overlays');
 select(w,'hintsToggle','on');
 assert.equal(el(w,'hintMove').disabled,false);
 el(w,'hintMove').click();
 assert.ok(el(w,'board').querySelector('.square.best-from'),'move suggestion shown');
 square(w,'e8').click();
 assert.match(el(w,'statusTitle').textContent,/решена/);
 assert.match(el(w,'leaderboard').textContent,/Баллы за головоломки:/);
 const score=Number(w.localStorage.getItem('yugatneo.matrix-chess.ratings.v1')&&
   JSON.parse(w.localStorage.getItem('yugatneo.matrix-chess.ratings.v1')).puzzlePoints);
 assert.ok(score>0,'puzzle points gained');
 el(w,'retryPuzzle').click();
 square(w,'e1').click();
 square(w,'e8').click();
 const retry=JSON.parse(w.localStorage.getItem('yugatneo.matrix-chess.ratings.v1')).puzzlePoints;
 assert.equal(retry,score,'no repeated bonuses for the same puzzle');
 w.close();
});
test('board themes, piece designs and local two-player rules survive settings changes',()=>{
 const w=setup();
 select(w,'boardTheme','cyber');
 select(w,'pieceSet','letters');
 select(w,'piecePalette','ice');
 assert.equal(w.document.body.dataset.board,'cyber');
 assert.equal(w.document.body.dataset.pieceSet,'letters');
 assert.equal(w.document.body.dataset.palette,'ice');
 assert.equal(square(w,'e1').textContent.includes('K'),true,'letter piece style works');
 square(w,'e2').click();square(w,'e4').click();
 assert.match(el(w,'moves').textContent,/e4/);
 assert.match(el(w,'whiteClock').textContent,/\d\d:\d\d/);
 w.close();
});
test('AI and puzzle modes switch without removing legal chess board or local leaderboard',()=>{
 const w=setup();
 select(w,'gameMode','puzzle');
 select(w,'puzzleTheme','Вилка');
 assert.match(el(w,'puzzleInfo').textContent,/Вилка/);
 assert.equal(el(w,'board').children.length,64);
 select(w,'gameMode','local');
 assert.equal(el(w,'puzzleControls').style.display,'none');
 assert.equal(el(w,'clockPreset').disabled,false);
 assert.equal(el(w,'board').children.length,64);
 select(w,'gameMode','ai');
 assert.equal(el(w,'difficultyRow').style.display,'flex');
 assert.equal(el(w,'blackPlayerName').value,'Компьютер');
 w.close();
});
