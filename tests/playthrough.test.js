import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {pilot} from './pilot.js';
import {blocked} from '../src/pathfinding.js';
import {CONFIG as C,solids} from '../src/config.js';

const priority={reply:100,thunder:90,meteor:85,shredder:72,slash:68};
const chooseBuild=g=>{
  let best=0,score=-Infinity;
  g.offers.forEach((id,i)=>{const value=priority[id]+g.skills[id]*5;if(value>score){score=value;best=i;}});
  return best;
};

test('a complete run visits all six waves, carries six upgrades, sees all boss phases and reaches the gate',()=>{
  let seed=7;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const g=new Game(random);g.showInstructions();g.startRun();
  const seen={waves:new Set(),stages:new Set(),upgrades:0,stageIntros:0,boss:false,phases:new Set(),charge:false,meeting:false,fan:false,summon:false,multi:false,floor:false,stun:false,gate:false,maxEnemies:0,maxBullets:0};
  for(let ticks=0;ticks<300*60&&g.state!=='result';ticks++){
    if(g.state==='upgrade'){seen.upgrades++;g.chooseUpgrade(chooseBuild(g));continue;}
    if(g.state==='stageIntro'){seen.stageIntros++;g.enterStage();continue;}
    if(g.state==='bossIntro'){seen.boss=true;g.spawnBoss();continue;}
    if(g.state!=='playing')continue;
    if(g.wave){seen.waves.add(`${g.stage}-${g.wave}`);seen.stages.add(g.stage);}
    if(g.boss&&!g.boss.dead){
      const b=g.boss;seen.phases.add(b.bossPhase);seen.charge||=['chargeWarn','charge'].includes(b.state);seen.meeting||=b.state==='meetingWarn';seen.fan||=b.state==='fanWarn';seen.summon||=b.state==='summonWarn';seen.multi||=['multiWarn','multiCharge'].includes(b.state);seen.floor||=b.state==='floorSequence';seen.stun||=b.state==='stunned';
    }
    seen.gate||=g.gateOpen;seen.maxEnemies=Math.max(seen.maxEnemies,g.activeEnemies.length);seen.maxBullets=Math.max(seen.maxBullets,g.enemyProjectiles.length);
    g.update(1/60,pilot(g));assert.equal(blocked(g.hero.x,g.hero.y,C.radius,solids),false);
  }
  const report={outcome:g.outcome,elapsed:Number(g.elapsed.toFixed(2)),kills:g.kills,hits:g.hitsTaken,skills:g.skillSummary(),seen:{...seen,waves:[...seen.waves],stages:[...seen.stages],phases:[...seen.phases]}};
  console.log(JSON.stringify(report));
  assert.equal(g.outcome,'success');assert.ok(g.elapsed>0&&g.elapsed<=C.timeLimit);assert.equal(seen.upgrades,6);assert.equal(seen.stageIntros,2);
  assert.deepEqual([...seen.waves],['1-1','1-2','2-1','2-2','3-1','3-2']);assert.deepEqual([...seen.stages],[1,2,3]);assert.equal(Object.values(g.skills).reduce((a,b)=>a+b,0),6);
  assert.ok(seen.boss&&seen.gate);assert.deepEqual([...seen.phases],[1,2,3]);assert.ok(seen.charge&&seen.meeting&&seen.fan&&seen.summon&&seen.multi&&seen.floor);
  assert.ok(seen.maxEnemies>=8);assert.ok(seen.maxBullets>=3);
});

test('a close-range slash and shredder build can also finish the full route',()=>{
  let seed=19;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const g=new Game(random),closePriority={slash:110,shredder:105,reply:80,thunder:65,meteor:60};g.showInstructions();g.startRun();
  for(let ticks=0;ticks<300*60&&g.state!=='result';ticks++){
    if(g.state==='upgrade'){let pick=0,best=-Infinity;g.offers.forEach((id,i)=>{const score=closePriority[id]+g.skills[id]*5;if(score>best){best=score;pick=i;}});g.chooseUpgrade(pick);continue;}
    if(g.state==='stageIntro'){g.enterStage();continue;}if(g.state==='bossIntro'){g.spawnBoss();continue;}if(g.state==='playing')g.update(1/60,pilot(g));
  }
  console.log(JSON.stringify({build:'close',outcome:g.outcome,elapsed:Number(g.elapsed.toFixed(2)),kills:g.kills,hits:g.hitsTaken,skills:g.skillSummary()}));
  assert.equal(g.outcome,'success');assert.equal(g.upgradeCount,6);assert.ok(g.skills.slash>=2);assert.ok(g.skills.shredder>=2);
});
