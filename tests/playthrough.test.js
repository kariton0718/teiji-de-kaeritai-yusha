import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {pilot} from './pilot.js';
import {blocked} from '../src/pathfinding.js';
import {CONFIG as C,solids} from '../src/config.js';

test('a complete run reaches every wave, both upgrades, boss phases and the gate without state skipping',()=>{
  let seed=7;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const g=new Game(random);g.showInstructions();g.startRun();const seen={waves:new Set(),upgrade:0,boss:false,enraged:false,charge:false,meeting:false,stun:false,gate:false};
  for(let ticks=0;ticks<300*60&&g.state!=='result';ticks++){
    if(g.state==='upgrade'){seen.upgrade++;g.chooseUpgrade(0);continue;}
    if(g.state==='bossIntro'){seen.boss=true;g.spawnBoss();continue;}
    if(g.state!=='playing')continue;
    seen.waves.add(g.wave);if(g.boss){seen.enraged||=g.boss.enraged;seen.charge||=g.boss.state==='chargeWarn'||g.boss.state==='charge';seen.meeting||=g.boss.state==='meetingWarn';seen.stun||=g.boss.state==='stunned';}seen.gate||=g.gateOpen;
    g.update(1/60,pilot(g));assert.equal(blocked(g.hero.x,g.hero.y,C.radius,solids),false);
  }
  console.log(JSON.stringify({outcome:g.outcome,elapsed:g.elapsed,kills:g.kills,hits:g.hitsTaken,upgrades:g.upgrades,seen:{...seen,waves:[...seen.waves]}}));
  assert.equal(g.outcome,'success');assert.ok(g.elapsed>0&&g.elapsed<=300);assert.equal(seen.upgrade,2);assert.deepEqual([...seen.waves],[1,2,3,4]);assert.equal(g.upgrades.length,2);assert.ok(seen.boss&&seen.enraged&&seen.charge&&seen.meeting&&seen.stun&&seen.gate);assert.equal(g.kills,18);
});
