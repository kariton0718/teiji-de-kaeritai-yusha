import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CONFIG as C,center} from '../src/config.js';
import {blocked} from '../src/pathfinding.js';
const exitGame=elapsed=>{const g=new Game(()=>.4);g.loadStage(6);g.state='playing';g.phase='escape';g.gateOpen=true;Object.assign(g.hero,center(g.stageConfig.gate));g.elapsed=elapsed;g.remaining=C.timeLimit-elapsed;return g;};
test('fast exit triggers one secret encounter at inclusive threshold; slower exit ends normally',()=>{
 for(const time of [120,C.secretBoss.unlockSeconds]){const g=exitGame(time);assert.equal(g.reachExit(),true);assert.equal(g.state,'bossIntro');assert.equal(g.gateOpen,false);assert.equal(g.exitArrivalTime,time);assert.equal(g.ultimate,100);assert.ok(g.pickups.some(p=>p.type==='drink'));const elapsed=g.elapsed;g.update(.1);assert.equal(g.elapsed,elapsed);const b=g.spawnBoss();assert.equal(b.rankIndex,6);assert.equal(b.radius,18);assert.equal(blocked(b.pos.x,b.pos.y,b.radius,g.solids),false);g.killEnemy(b);assert.equal(g.secretBossDefeated,true);g.hero.x=center(g.stageConfig.gate).x;g.hero.y=center(g.stageConfig.gate).y;g.reachExit();assert.equal(g.state,'ending');g.reset();assert.equal(g.secretBossTriggered,false);assert.equal(g.secretBossDefeated,false);assert.equal(g.exitArrivalTime,null);}
 const slow=exitGame(C.secretBoss.unlockSeconds+.01);slow.reachExit();assert.equal(slow.state,'ending');assert.equal(slow.secretBossTriggered,false);
});
test('timeout at gate cannot start a secret encounter',()=>{const g=exitGame(539.99);g.remaining=.001;g.update(.01);assert.equal(g.reason,'timeout');assert.equal(g.secretBossTriggered,false);});
test('all auditor phase attacks execute with finite bounded state and safe movement',()=>{
 const g=exitGame(100);g.reachExit();const b=g.spawnBoss();g.hero.invulnerable=1000;const d=C.rankBosses[6];
 for(let phase=1;phase<=d.phases;phase++){b.bossPhase=phase;for(let i=0;i<d.patterns[phase-1].length;i++){b.pattern=i;g.startRankAttack(b);assert.ok(b.left>=C.bossAttack.minWarning);g.executeRankAttack(b);if(b.state==='fastMove'){for(let j=0;j<60&&b.state==='fastMove';j++)g.updateFastMove(b,1/120);if(b.state==='attackWarn')g.executeRankAttack(b);}assert.ok(Number.isFinite(b.pos.x)&&Number.isFinite(b.pos.y));assert.equal(blocked(b.pos.x,b.pos.y,b.radius,g.solids),false);assert.ok(g.enemyProjectiles.length<=C.projectile.maxEnemy);g.enemyProjectiles=[];g.enemyAreas=[];}}
 assert.ok(b.report.fastMoves>=3);assert.ok(b.report.attacks>=12);assert.ok(d.speed>C.rankBosses[5].speed*2);
});
