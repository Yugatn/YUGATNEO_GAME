import test from 'node:test';
import assert from 'node:assert/strict';
import { SquareGame, zoneAt } from '../four-square/engine.mjs';
const make = () => new SquareGame({ random: () => .5 });
function advance(game, ms) { for (let i=0; i<Math.ceil(ms/16); i++) game.tick(16); }

test('square mapping and penalty center', () => {
  assert.deepEqual([zoneAt(.25,.25), zoneAt(.75,.25), zoneAt(.25,.75), zoneAt(.75,.75)],[0,1,2,3]);
  assert.equal(zoneAt(.50,.50),4);
  assert.equal(zoneAt(-.05,.5),-1);
});

test('opening throw: center first, diagonal second, kick only after square bounce', () => {
  const g=make();
  assert.equal(g.serve(1).ok,false);
  assert.equal(g.serve(0).ok,true);
  assert.equal(g.receiver,3);
  advance(g, 625);
  assert.equal(g.shot.segment,1,'center bounce must occur first');
  assert.equal(g.canKick(3),false);
  advance(g,720);
  assert.equal(g.shot.segment,2,'second landing in receiver quadrant');
  assert.equal(g.shot.bouncesInSquare,1);
  assert.equal(g.canKick(3),true);
});

test('early foot is a fault to kicker',()=>{
  const g=make();
  g.beginServe(2);
  g.serve(2); // human in seat 2, diagonal target 1
  const kick=g.strike(1,'foot',0);
  assert.equal(kick.foul,true);
  assert.equal(g.players[1].conceded,1);
  assert.equal(g.phase,'pause');
});

test('normal missing bounce scores 1 to receiver', () => {
  const g=make();
  g.createShot({from:{x:.75,y:.75}, shooter:3, target:0, kind:'foot'});
  g.shot.botPlan.choice=.99; // miss bot; seat 2 is human, so no intervention anyway
  advance(g,830);
  assert.equal(g.canKick(0),true);
  advance(g,950);
  assert.equal(g.players[0].conceded,1);
  assert.equal(g.totalGoals,1);
});

test('successful header goal awards five and instantly replaces occupant',()=>{
  const g=make();
  g.createShot({from:{x:.75,y:.75}, shooter:3, target:0, kind:'head'});
  advance(g,830);
  advance(g,950);
  assert.equal(g.players[0].conceded,0);
  assert.equal(g.players[0].human,false);
  assert.equal(g.totalGoals,5);
  assert.equal(g.humanSeat,-1);
  assert.ok(g.message.includes('выбыл'));
  assert.equal(g.requestReentry(),true);
  assert.equal(g.humanQueued,true);
});

test('red center hit is own +1, even for header',()=>{
  const g=make();
  g.createShot({from:{x:.75,y:.75}, shooter:3, target:4, kind:'head'});
  advance(g,830);
  assert.equal(g.players[3].conceded,1);
  assert.equal(g.players[0].conceded,0);
});

test('bot can only return a ball after a valid shot phase',()=>{
  const g=make();
  assert.equal(g.strike(0,'head',2).ok,false);
  g.createShot({from:{x:.75,y:.75},shooter:3,target:0,kind:'foot'});
  advance(g,500);
  assert.equal(g.canHead(0),true);
  assert.equal(g.strike(0,'head',2).ok,true);
  assert.equal(g.shot.kind,'head');
});

test('after fifth conceded replaces player and serves again',()=>{
  const g=make();
  for(let n=0;n<5;n++){
    g.penalty(0,1,'test');
    if(n<4) g.beginServe(0);
  }
  assert.equal(g.players[0].conceded,0);
  assert.equal(g.players[0].name,'Бот 5');
  assert.equal(g.totalGoals,5);
  g.tick(50);
});

test('reserve human returns to vacant slot after a queue rotation',()=>{
  const g=make();
  g.penalty(0,5,'header');
  assert.equal(g.requestReentry(),true);
  g.beginServe(0);
  g.penalty(1,5,'header');
  assert.equal(g.humanSeat,-1);
  g.beginServe(0);
  g.penalty(1,5,'header');
  assert.equal(g.humanSeat,1);
  assert.equal(g.players[1].name,'Ты');
  assert.equal(g.humanQueued,false);
});

test('bot starts automatic diagonal serve in no-human corner',()=>{
  const g=make();
  g.beginServe(1);
  advance(g,1000);
  assert.equal(g.shot.kind,'serve');
  assert.equal(g.shot.target,2);
});