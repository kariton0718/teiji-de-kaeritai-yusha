import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {pilotInput,pilotChoice} from './pilot.js';
for(const stage of [1,2,3])test('normal end-to-end simulation, stage '+stage,()=>{
  const g=new Game(()=>.2);g.reset(stage);let windup=false,meetingWarning=false;
  for(let n=0;n<18000&&g.state!=='result';n++){
    if(g.state==='encounter')g.choose(pilotChoice(g));
    else if(g.state==='response')g.continueResponse();
    else if(g.state==='timing'){g.update(.01);if(g.state==='timing'&&g.timingValue>=.48&&g.timingValue<=.54)g.hitTiming();}
    else g.update(.02,pilotInput(g));
    windup||=g.director?.phase==='windup';meetingWarning||=g.slime?.phase==='warning';
    assert.ok(!g.nav.blocked(g.hero.x,g.hero.y));assert.ok(!g.nav.blocked(g.boss.x,g.boss.y));
  }
  console.log(JSON.stringify({stage,result:g.outcome,time:g.elapsed,catches:g.catches,anger:g.anger,added:g.added,meetings:g.meetingHits,stuns:g.directorStuns,windup,meetingWarning}));
  assert.equal(g.outcome,'success');assert.equal(g.allDone,true);assert.ok(g.anger<=3);
  if(stage===2)assert.ok(meetingWarning);
  if(stage===3){assert.ok(windup);assert.ok(g.directorStuns>0);}
});
