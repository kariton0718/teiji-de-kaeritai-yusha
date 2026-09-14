import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {blocked} from '../src/pathfinding.js';
import {pilotInput} from './pilot.js';
function run(strategy){
  let seed=517;
  const g=new Game(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});g.reset();
  for(let n=0;n<20000&&g.state!=='result';n++){
    if(g.state==='encounter')g.choose(strategy(g));
    else if(g.state==='response')g.continueResponse();
    else g.update(.02,pilotInput(g));
    assert.ok(!blocked(g.hero.x,g.hero.y));assert.ok(!blocked(g.boss.x,g.boss.y));
  }
  return g;
}
test('full normal playthrough: all jobs, shield, speed choices, dash and escape',()=>{
  const g=run(g=>g.shields?'shield':'tomorrow');
  console.log(JSON.stringify({strategy:'shield then tomorrow',result:g.outcome,time:g.elapsed,catches:g.catches,added:g.added,rank:g.rank}));
  assert.equal(g.outcome,'success');assert.ok(g.catches>0);assert.equal(g.allDone,true);assert.equal(g.shields,0);
});
test('full normal playthrough handles an added job before escape',()=>{
  const g=run(g=>g.catches===1?'accept':g.shields?'shield':'tomorrow');
  console.log(JSON.stringify({strategy:'accept once, shield, tomorrow',result:g.outcome,time:g.elapsed,catches:g.catches,added:g.added,rank:g.rank}));
  assert.equal(g.outcome,'success');assert.equal(g.added,1);assert.equal(g.finishedJobs.length,4);
});
test('accepting every request can lead to overtime, with unfinished tasks',()=>{
  const g=run(()=> 'accept');
  console.log(JSON.stringify({strategy:'always accept',result:g.outcome,time:g.elapsed,catches:g.catches,added:g.added,rank:g.rank}));
  assert.equal(g.outcome,'failure');assert.ok(g.added>0);
});
