'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {Chess}=require('chess.js');
const puzzles=require('../chess-mini/puzzles.js');
const root=path.resolve(__dirname,'../chess-mini');
test('all puzzles are distinct and have only legal solutions and valid mates',()=>{
 assert.ok(puzzles.puzzles.length>=10,'starter bank should contain multiple tactical problems');
 const ids=new Set();
 for(const p of puzzles.puzzles){
  assert.ok(!ids.has(p.id),'duplicate puzzle id '+p.id);
  ids.add(p.id);
  const result=puzzles.createPosition(Chess,p);
  const g=new Chess(result.fen);
  const expected=puzzles.uciToMove(p.uci);
  const all=g.moves({verbose:true});
  assert.ok(all.some(m=>m.from===expected.from&&m.to===expected.to),'puzzle UCI must be legal '+p.id);
  const played=g.move(expected);
  assert.ok(played,'solution must be legal '+p.id);
  if(p.mate)assert.equal(g.in_checkmate(),true,'claimed mate must be a real checkmate '+p.id);
  assert.ok(p.points>0&&p.points<=150,'reasonable reward points '+p.id);
  assert.ok(['Мат в один','Вилка','Выигрыш материала','Превращение пешки'].includes(p.theme));
  assert.ok(p.description.length>20);
 }
});
test('puzzles do not require networking or Telegram accounts',()=>{
 const source=fs.readFileSync(path.join(root,'puzzles.js'),'utf8');
 assert.ok(!/fetch\(|XMLHttpRequest|initDataUnsafe|localStorage/.test(source));
});
test('chess mini HTML script is parseable JavaScript and includes all controls',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
 assert.equal(scripts.length,1,'one local inline application script');
 for(const js of scripts)assert.doesNotThrow(()=>new vm.Script(js,{filename:'chess-mini/index.html'}));
 for(const id of ['gameMode','board','puzzleControls','puzzleTheme','nextPuzzle','retryPuzzle','hintMove','hintsToggle','piecePalette','boardTheme','pieceSet','leaderboard','enterGame','chessIntro','promotion','promos','aiLevel']){
  assert.ok(html.includes('id="'+id+'"'),'missing control '+id);
 }
 assert.ok(html.includes('telegram-web-app.js'));
 assert.ok(html.includes('src="./puzzles.js"'));
 assert.ok(!html.includes('onclick='),'avoid inline event handlers');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'no duplicated HTML ids');
});
test('local-only ratings and puzzle points are not advertised as global Elo',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('rankKey'));
 assert.ok(html.includes('ranking.solved[puzzleCurrent.id]'));
 assert.ok(html.includes('if(!ranking.solved[puzzleCurrent.id])'),'first solve award only');
 assert.ok(html.includes('puzzleHintUsed?.5:1'),'hints reduce bonus');
 assert.ok(html.includes('Локальный рейтинг'),'clearly local rating');
 assert.ok(html.includes('recordIfTerminal'),'game completion stored');
});
test('offline app shell and services exist',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./index.html');
 for(const name of ['index.html','icon.svg','manifest.webmanifest','sw.js','puzzles.js'])
  assert.ok(fs.existsSync(path.join(root,name)),name);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(sw.includes('chess.min.js'));
 const rootWorker=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
 assert.ok(rootWorker.includes("chess-mini/"),'root worker must defer to this app');
});
