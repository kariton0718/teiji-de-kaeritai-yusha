import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,rankResult} from '../src/game.js';
import {CONFIG as C,center} from '../src/config.js';
import {blocked,findPath,clearLine} from '../src/pathfinding.js';

const advance=(g,seconds,input={x:0,y:0,action:false})=>{
  for(let t=0;t<seconds-1e-8;t+=.01)g.update(Math.min(.01,seconds-t),input);
};
const fresh=()=>{const g=new Game(()=>.25);g.reset();return g;};
const safe=()=>{const g=fresh();g.bossRest=999;g.protection=999;return g;};
const encounter=(g,request=0)=>{g.elapsed=Math.max(C.warningTime,g.elapsed);g.request=C.requests[request];g.state='encounter';};
const finishWork=g=>{for(const s of C.stations){g.hero=center(s.spot);advance(g,s.duration+.01,{action:true});}};

test('0.2 starts at 17:45 with 3 jobs, closed exit and unused shield',()=>{
  const g=fresh();assert.equal(g.clock,'17:45');assert.equal(g.remaining,C.timeLimit);assert.equal(g.jobs.length,3);assert.equal(g.allDone,false);assert.equal(g.shields,1);
});
test('all work spots, spawn and exit are connected and fixtures solid',()=>{
  const start=center(C.heroStart);
  for(const target of [...C.stations.map(s=>s.spot),C.exit]){
    const p=findPath(start,center(target));assert.ok(p.length>0);p.forEach(v=>assert.ok(!blocked(v.x,v.y)));
  }
  C.stations.forEach(s=>assert.ok(blocked(center(s.tile).x,center(s.tile).y)));
});
test('movement speed and normalized diagonals survive the refactor',()=>{
  const a=fresh(),b=fresh();advance(a,.2,{x:1,y:0});advance(b,.2,{x:1,y:-1});
  assert.ok(Math.abs(a.hero.x-100-32)<1e-6);assert.ok(Math.abs(Math.hypot(b.hero.x-100,b.hero.y-540)-32)<1e-6);
});
test('desk, wall and work fixtures block movement',()=>{
  const g=safe();advance(g,.6,{x:-1,y:0});assert.ok(g.hero.x>=52);
  g.hero={x:180,y:460};advance(g,.8,{x:0,y:-1});assert.ok(g.hero.y>=452);
  g.hero=center(C.stations[0].spot);advance(g,.8,{x:0,y:-1});assert.ok(g.hero.y>=492);
});
test('boss routes around desk without entering solids',()=>{
  const g=fresh();g.hero={x:220,y:380};g.boss={x:220,y:460};g.elapsed=C.warningTime;
  for(let i=0;i<1800&&g.catches===0;i++){g.update(.01);assert.ok(!blocked(g.boss.x,g.boss.y));}
  assert.equal(g.catches,1);assert.equal(g.state,'encounter');
});
test('boss waits for warning time',()=>{
  const g=fresh(),p={...g.boss};advance(g,C.warningTime-.1);assert.deepEqual(g.boss,p);
  advance(g,.4);assert.notDeepEqual(g.boss,p);
});
test('work requires range and holding, pins position, and persists after leaving',()=>{
  const g=safe();advance(g,1,{action:true});assert.equal(g.jobs[0].progress,0);
  g.hero=center(C.stations[0].spot);advance(g,.5);assert.equal(g.jobs[0].progress,0);
  const p={...g.hero};advance(g,1,{x:1,y:0,action:true});assert.deepEqual(g.hero,p);assert.ok(g.jobs[0].progress>.99);
  const progress=g.jobs[0].progress;advance(g,.4,{x:1,y:0});assert.equal(g.jobs[0].progress,progress);
  g.hero={...p};advance(g,.5,{action:true});assert.ok(g.jobs[0].progress>progress+.49);
});
test('all jobs can be completed in reverse order',()=>{
  const g=safe();for(const s of [...C.stations].reverse()){g.hero=center(s.spot);advance(g,s.duration+.01,{action:true});}
  assert.equal(g.allDone,true);assert.equal(g.phase,'dash');assert.ok(g.celebration>0);
});
test('boss approaches during work and interrupts with one frozen encounter',()=>{
  const g=fresh();g.hero=center(C.stations[0].spot);g.boss={x:200,y:500};g.elapsed=C.warningTime;
  advance(g,2,{action:true});assert.equal(g.state,'encounter');assert.equal(g.catches,1);
  const saved=JSON.stringify(g);advance(g,20,{x:1,action:true});assert.equal(JSON.stringify(g),saved);
  assert.ok(g.jobs[0].progress>0&&g.jobs[0].progress<g.jobs[0].duration);
});
test('random requests cover all 4 and do not repeat consecutively',()=>{
  const seen=new Set();for(const n of [0,.3,.6,.99]){const g=new Game(()=>n);g.reset();g.encounter();seen.add(g.request.text);}
  assert.equal(seen.size,4);
  const g=fresh();g.encounter();const prior=g.request.text;g.choose('shield');g.continueResponse();g.encounter();assert.notEqual(g.request.text,prior);
});
test('accept adds a genuinely unfinished job without erasing old progress',()=>{
  const g=safe();g.jobs[0].progress=2;encounter(g,1);assert.equal(g.choose('accept'),true);
  assert.equal(g.added,1);assert.equal(g.jobs.length,4);assert.equal(g.jobs.at(-1).progress,0);assert.equal(g.jobs.at(-1).duration,C.extraDuration);assert.equal(g.jobs[0].progress,2);assert.equal(g.bossSpeed,C.bossSpeed);
});
test('tomorrow adds no work and permanently speeds boss up to cap',()=>{
  const g=fresh();for(let i=0;i<9;i++){encounter(g);g.choose('tomorrow');g.continueResponse();}
  assert.equal(g.added,0);assert.equal(g.jobs.length,3);assert.equal(g.bossSpeed,C.bossMaxSpeed);
});
test('deflection succeeds below probability and fails at boundary',()=>{
  const win=new Game(()=>C.deflectChance-.01);win.reset();encounter(win);win.choose('deflect');assert.equal(win.added,0);assert.match(win.response.title,/成功/);
  const lose=new Game(()=>C.deflectChance);lose.reset();encounter(lose);lose.choose('deflect');assert.equal(lose.added,1);
});
test('shield completely avoids both consequences and is one use only',()=>{
  const g=fresh();encounter(g);g.choose('shield');assert.equal(g.shields,0);assert.equal(g.added,0);assert.equal(g.bossSpeed,C.bossSpeed);
  encounter(g);assert.equal(g.choose('shield'),false);assert.equal(g.state,'encounter');
});
test('double clicks cannot apply a choice twice',()=>{
  const g=fresh();encounter(g);g.choose('accept');assert.equal(g.choose('accept'),false);assert.equal(g.added,1);
});
test('response keeps time frozen until explicit continue, then grants escape protection',()=>{
  const g=fresh();g.boss={...g.hero};g.elapsed=C.warningTime;g.update(.01);g.choose('accept');
  const time=g.remaining;advance(g,10);assert.equal(g.remaining,time);
  g.continueResponse();assert.equal(g.protection,C.protectionTime);advance(g,C.protectionTime-.1);
  assert.equal(g.catches,1);advance(g,.2);assert.equal(g.catches,2);
});
test('closed exit refuses escape and all work opens it with a dash cue',()=>{
  const g=safe();g.hero=center(C.exit);g.update(.01);assert.equal(g.state,'playing');
  finishWork(g);assert.equal(g.phase,'dash');assert.equal(g.allDone,true);assert.ok(g.events.includes('dash'));assert.ok(g.celebration>0);
  g.hero=center(C.exit);g.update(.01);assert.equal(g.outcome,'success');
});
test('dash actually increases hero speed',()=>{
  const g=safe();finishWork(g);g.hero=center(C.heroStart);advance(g,.1,{x:1,y:0});assert.ok(Math.abs(g.hero.x-100-C.heroSpeed*C.dashMultiplier*.1)<1e-5);
});
test('an accepted request after opening re-locks gate until extra job is done',()=>{
  const g=safe();finishWork(g);encounter(g,2);g.choose('accept');assert.equal(g.phase,'work');assert.match(g.response.detail,/再び閉じ/);
  g.continueResponse();g.bossRest=999;g.protection=999;g.hero=center(C.exit);g.update(.01);assert.equal(g.outcome,null);
  g.hero=center(C.stations[2].spot);advance(g,C.extraDuration+.01,{action:true});assert.equal(g.phase,'dash');assert.equal(g.allDone,true);
});
test('completed main jobs remain done while extra progress is saved independently',()=>{
  const g=safe();finishWork(g);encounter(g,0);g.choose('accept');g.continueResponse();g.bossRest=999;g.hero=center(C.stations[0].spot);
  advance(g,1,{action:true});assert.equal(g.jobs[0].progress,g.jobs[0].duration);assert.ok(g.jobs[3].progress>.99);
  advance(g,.3,{x:1});const progress=g.jobs[3].progress;advance(g,.3);assert.equal(g.jobs[3].progress,progress);
});
test('deadline wins over last work completion and exit',()=>{
  const g=safe();g.hero=center(C.stations[0].spot);g.jobs.forEach(j=>j.progress=j.duration);g.jobs[0].progress-=.001;g.remaining=.001;g.update(.01,{action:true});assert.equal(g.outcome,'failure');assert.equal(g.phase,'work');
  g.reset();g.jobs.forEach(j=>j.progress=j.duration);g.hero=center(C.exit);g.remaining=.001;g.update(.01);assert.equal(g.outcome,'failure');
});
test('pause freezes work, clock, protection, cues and enemies',()=>{
  const g=safe();g.hero=center(C.stations[0].spot);advance(g,.2,{action:true});g.pause();
  const saved=JSON.stringify(g);advance(g,3,{action:true});assert.equal(JSON.stringify(g),saved);g.resume();advance(g,.1,{action:true});assert.ok(g.jobs[0].progress>.29);
});
test('results stop simulation and repeated retries reset every gameplay field',()=>{
  const g=fresh();for(let i=0;i<5;i++){
    encounter(g);g.choose('tomorrow');g.continueResponse();g.remaining=.001;g.update(.01);
    const saved=JSON.stringify(g);advance(g,2);assert.equal(JSON.stringify(g),saved);g.reset();
    assert.equal(g.remaining,C.timeLimit);assert.equal(g.phase,'work');assert.equal(g.jobs.length,3);assert.equal(g.added,0);assert.equal(g.catches,0);assert.equal(g.shields,C.shieldCharges);assert.equal(g.bossSpeed,C.bossSpeed);assert.equal(g.rank,null);
  }
});
test('ranks respond to time, catches, extra jobs and remaining shield',()=>{
  const g=fresh();g.outcome='success';g.elapsed=35;g.remaining=40;assert.equal(rankResult(g),'伝説の定時勇者');
  g.shields=0;assert.equal(rankResult(g),'華麗なる引き継ぎ職人');
  g.catches=4;assert.equal(rankResult(g),'盾を使い切った帰宅王');
  g.shields=1;assert.equal(rankResult(g),'有給を守りし仕事人');
  g.added=3;assert.equal(rankResult(g),'魔王商事の新たな管理職');
  g.remaining=4;assert.equal(rankResult(g),'ギリギリ退勤兵');
  g.outcome='failure';g.added=0;assert.equal(rankResult(g),'議事録に敗れし者');
});
test('clock reaches 18:00 at real-time limit; huge deltas are bounded',()=>{
  const g=safe();g.update(500);assert.ok(g.elapsed<=C.maxDelta+.00001);advance(g,C.timeLimit);assert.equal(g.clock,'18:00');assert.equal(g.outcome,'failure');
});
