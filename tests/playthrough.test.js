import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {pilot} from './pilot.js';
import {blocked} from '../src/pathfinding.js';
import {CONFIG as C} from '../src/config.js';

function choose(g,priority){let best=0,score=-Infinity;g.offers.forEach((id,i)=>{const value=(priority[id]??10)+(g.skills[id]||0)*8;if(value>score){score=value;best=i;}});return best;}
function run(seed,ultimate,priority){
  const random=()=>((seed=seed*16807%2147483647)-1)/2147483646,g=new Game(random);g.showInstructions();g.startRun();g.selectUltimate(ultimate);
  const seen={waves:new Set(),stages:new Set(),upgradeTypes:new Set(),manager:false,president:false,wide:false,elevator:false,gate:false,maxEnemies:0,maxBullets:0};
  for(let ticks=0;ticks<C.timeLimit*60&&g.state!=='result';ticks++){
    if(g.state==='upgrade'){seen.upgradeTypes.add(g.upgradeType);g.chooseUpgrade(choose(g,priority));continue;}if(g.state==='stageIntro'){g.enterStage();continue;}if(g.state==='bossIntro'){seen.manager=true;g.spawnBoss('manager');continue;}if(g.state==='presidentIntro'){seen.president=true;g.spawnBoss('president');continue;}if(g.state!=='playing')continue;
    if(g.wave&&g.phase==='wave')seen.waves.add(`${g.stage}-${g.wave}`);seen.stages.add(g.stage);seen.wide||=g.worldWidth>C.width;seen.elevator||=g.phase==='elevator';seen.gate||=g.phase==='escape';seen.maxEnemies=Math.max(seen.maxEnemies,g.activeEnemies.length);seen.maxBullets=Math.max(seen.maxBullets,g.enemyProjectiles.length);
    g.update(1/60,pilot(g));assert.equal(blocked(g.hero.x,g.hero.y,C.radius,g.solids),false);
  }
  return {g,seen,report:{ultimate:g.selectedUltimate?.name,outcome:g.outcome,elapsed:Number(g.elapsed.toFixed(2)),kills:g.kills,hits:g.hitsTaken,skills:g.skillSummary(),seen:{...seen,waves:[...seen.waves],stages:[...seen.stages],upgradeTypes:[...seen.upgradeTypes]}}};
}

test('ranged build clears five stages, both bosses and the final gate',()=>{
  const {g,seen,report}=run(7,'exit',{reply:120,thunder:115,meteor:110,drone:105,boomerang:90,slash:65,shredder:60,gauge:50,heal:40});console.log(JSON.stringify(report));
  assert.equal(g.outcome,'success');assert.deepEqual([...seen.waves],['1-1','1-2','2-1','2-2','3-1','3-2','4-1','4-2','5-1','5-2']);assert.deepEqual([...seen.stages],[1,2,3,4,5]);assert.ok(seen.manager&&seen.president&&seen.wide&&seen.elevator&&seen.gate);assert.deepEqual([...seen.upgradeTypes].sort(),['evolution','new']);assert.ok(g.elapsed<C.timeLimit);
});

test('close build with rush also clears the full route',()=>{
  const {g,seen,report}=run(19,'rush',{slash:130,shredder:125,boomerang:115,drone:85,reply:80,thunder:70,meteor:65,gauge:55,heal:45});console.log(JSON.stringify({build:'close',...report}));
  assert.equal(g.outcome,'success');assert.ok(g.skills.slash>=2);assert.ok(g.skills.shredder>=1);assert.ok(seen.manager&&seen.president&&seen.wide);assert.ok(g.elapsed<C.timeLimit);
});
