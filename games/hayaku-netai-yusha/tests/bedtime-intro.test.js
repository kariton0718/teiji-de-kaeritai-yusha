import test from 'node:test';
import assert from 'node:assert/strict';
import {SleepGame} from '../game.js';
test('bedtime entrance freezes combat, clocks and inputs then starts a fresh mission',()=>{
 const g=new SleepGame(()=>.5);g.begin();g.stage=5;g.nightElapsed=123;g.hero.energy=70;
 assert.equal(g.startBedtimeIntro(),true);
 for(let i=0;i<100;i++)g.update(.05,{x:1,ultimate:true});
 assert.equal(g.state,'bedtimeIntro');assert.equal(g.nightElapsed,123);assert.equal(g.hero.energy,70);assert.equal(g.hero.x,240);assert.equal(g.warnings.length,0);
 for(let i=0;i<33;i++)g.update(.05);
 assert.equal(g.state,'playing');assert.equal(g.nightElapsed,123);assert.equal(g.requestIndex,1);assert.equal(g.warnings.length,18);assert.equal(g.hero.invulnerable,2);
});
test('opening wave adds 96 and early refills add 30 with the existing population cap',()=>{
 const g=new SleepGame(()=>.5);g.begin();g.stage=5;g.enterRoom();g.spawnCd=0;g.update(.01);
 assert.equal(g.warnings.length,114);assert.equal(g.spawnCd,1.8);
 g.warnings=[];g.spawnCd=0;g.update(.01);assert.equal(g.warnings.length,30);
 g.spawn(999);assert.equal(g.warnings.length,g.enemyLimit);
 g.warnings=[];g.roomTime=20;g.spawnCd=0;g.update(.01);assert.equal(g.warnings.length,22);
});
