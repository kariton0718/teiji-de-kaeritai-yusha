import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,rankResult} from '../src/game.js';
import {CONFIG,STAGES,center} from '../src/config.js';
import {ProgressStore,SAVE_KEY,validate} from '../src/progress.js';
const advance=(g,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=.01)g.update(Math.min(.01,seconds-t),input);};
const fresh=(id=1)=>{const g=new Game(()=>.2);g.reset(id);return g;};
const safe=(id=1)=>{const g=fresh(id);g.bossRest=999;g.protection=999;return g;};
const encounter=g=>{g.state='playing';g.encounter();};
const complete=g=>{for(const j of g.jobs){j.progress=j.duration;}g.phase='dash';};
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};

test('stage geometries differ and all work spots and exits are reachable',()=>{
  assert.equal(new Set(STAGES.map(s=>JSON.stringify(s.desks))).size,3);
  for(const stage of STAGES){const g=fresh(stage.id),C=g.config;
    for(const tile of [C.exit,...C.stations.map(s=>s.spot)]){
      const path=g.nav.findPath(g.hero,center(tile));assert.ok(path.length>0,'no route in stage '+stage.id);
      path.forEach(p=>assert.ok(!g.nav.blocked(p.x,p.y)));
    }
    C.stations.forEach(s=>assert.ok(g.nav.blocked(center(s.tile).x,center(s.tile).y)));
  }
});
test('stage intro freezes time until begin',()=>{const g=fresh();g.prepare(2);advance(g,2);assert.equal(g.elapsed,0);g.begin();advance(g,.1);assert.ok(g.elapsed>0);});
test('movement speed, diagonals, walls and desks survive',()=>{
  const a=fresh(),b=fresh();advance(a,.2,{x:1,y:0});advance(b,.2,{x:1,y:-1});
  assert.ok(Math.abs(a.hero.x-100-32)<1e-6);assert.ok(Math.abs(Math.hypot(b.hero.x-100,b.hero.y-540)-32)<1e-6);
  const g=safe();advance(g,1,{x:-1});assert.ok(g.hero.x>=52);g.hero={x:180,y:460};advance(g,1,{y:-1});assert.ok(g.hero.y>=452);
});
test('normal boss routes around desk without crossing solids',()=>{
  const g=fresh();g.hero={x:220,y:380};g.boss={x:220,y:460};g.elapsed=4;
  for(let i=0;i<2000&&g.catches===0;i++){g.update(.01);assert.ok(!g.nav.blocked(g.boss.x,g.boss.y));}
  assert.equal(g.catches,1);
});
test('work is hold-to-progress, stationary, range-bound and saved',()=>{
  const g=safe();advance(g,.3,{action:true});assert.equal(g.jobs[0].progress,0);
  g.hero=center(g.config.stations[0].spot);const p={...g.hero};
  advance(g,1,{x:1,action:true});assert.deepEqual(g.hero,p);assert.ok(g.jobs[0].progress>.99);
  const value=g.jobs[0].progress;advance(g,.4,{x:1});assert.equal(g.jobs[0].progress,value);
  g.hero=p;advance(g,.5,{action:true});assert.ok(g.jobs[0].progress>value+.49);
});
test('accept adds unfinished work and grants exactly eight seconds slow',()=>{
  const g=fresh();encounter(g);g.choose('accept');assert.equal(g.added,1);assert.equal(g.jobs.at(-1).progress,0);assert.equal(g.slowLeft,8);assert.ok(g.bossSpeed<CONFIG.angerSpeeds[0]);
  advance(g,10);assert.equal(g.slowLeft,8);g.continueResponse();g.protection=999;g.bossRest=999;advance(g,7.9);assert.ok(g.slowLeft>0);advance(g,.2);assert.equal(g.slowLeft,0);assert.equal(g.bossSpeed,CONFIG.angerSpeeds[0]);
});
test('anger advances to 3, increases speed/repath/prediction, then locks tomorrow',()=>{
  const g=fresh();for(let i=1;i<=3;i++){encounter(g);assert.equal(g.choose('tomorrow'),true);assert.equal(g.anger,i);assert.equal(g.bossSpeed,CONFIG.angerSpeeds[i]);}
  assert.ok(CONFIG.angerRepath[3]<CONFIG.angerRepath[0]);assert.ok(CONFIG.angerPrediction[3]>CONFIG.angerPrediction[0]);
  encounter(g);assert.equal(g.canChoose('tomorrow'),false);assert.equal(g.choose('tomorrow'),false);assert.equal(g.anger,3);assert.equal(g.added,0);
});
test('anger uses faster updates and predicted target during actual chase',()=>{
  const g=fresh();g.hero={x:300,y:540};g.boss={x:160,y:540};g.velocity={x:0,y:-100};g.anger=3;g.chase(.01);
  assert.ok(g.boss.y<540);assert.equal(g.repath,CONFIG.angerRepath[3]);
});
test('shield prevents added work and anger, only once',()=>{
  const g=fresh();g.anger=2;encounter(g);g.choose('shield');assert.equal(g.anger,2);assert.equal(g.added,0);assert.equal(g.shields,0);
  encounter(g);assert.equal(g.choose('shield'),false);
});
test('choices cannot apply twice',()=>{const g=fresh();encounter(g);g.choose('accept');assert.equal(g.choose('accept'),false);assert.equal(g.jobs.length,4);});
test('request wording varies without consecutive duplicate',()=>{
  const seen=new Set();for(const n of [0,.3,.6,.99]){const g=new Game(()=>n);g.reset();g.encounter();seen.add(g.request.text);}assert.equal(seen.size,4);
  const g=fresh();g.encounter();const old=g.request.text;g.choose('accept');g.continueResponse();g.encounter();assert.notEqual(g.request.text,old);
});
test('deflection starts a deterministic gauge and does not roll randomness',()=>{
  const g=fresh();encounter(g);g.random=()=>{throw Error('unexpected random roll');};g.choose('deflect');assert.equal(g.state,'timing');assert.equal(g.timingValue,0);
});
test('timing success range grants stop, no extra work or anger',()=>{
  const g=fresh();encounter(g);g.choose('deflect');advance(g,CONFIG.timing.period*.5);
  assert.ok(g.timingValue>=.4&&g.timingValue<=.62);g.hitTiming();assert.equal(g.state,'response');assert.equal(g.added,0);assert.equal(g.anger,0);assert.equal(g.bossRest,4);
  g.continueResponse();assert.equal(g.bossRest,4);assert.equal(g.hitTiming(),false);
});
test('timing miss and timeout create longer extra job',()=>{
  for(const timeout of [false,true]){const g=fresh();encounter(g);g.choose('deflect');if(timeout)advance(g,5);else g.hitTiming();
    assert.equal(g.state,'response');assert.equal(g.added,1);assert.equal(g.jobs.at(-1).duration,CONFIG.failedExtraDuration);assert.ok(g.jobs.at(-1).duration>CONFIG.extraDuration);}
});
test('timing freezes world, and pause freezes gauge itself',()=>{
  const g=fresh();encounter(g);g.choose('deflect');const time=g.remaining,boss={...g.boss};advance(g,.2);assert.equal(g.remaining,time);assert.deepEqual(g.boss,boss);
  g.pause();const elapsed=g.timing.elapsed;advance(g,2);assert.equal(g.timing.elapsed,elapsed);g.resume();assert.equal(g.state,'timing');advance(g,.1);assert.ok(g.timing.elapsed>elapsed);
});
test('response freezes world until continue then protects from immediate recapture',()=>{
  const g=fresh();g.boss={...g.hero};g.elapsed=4;g.update(.01);g.choose('shield');const time=g.remaining;advance(g,10);assert.equal(g.remaining,time);
  g.continueResponse();advance(g,2.9);assert.equal(g.catches,1);advance(g,.3);assert.equal(g.catches,2);
});
test('slime patrol segments are unobstructed and slime moves',()=>{
  const g=safe(2),route=g.config.patrol;
  for(let i=0;i<route.length;i++)assert.ok(g.nav.clearLine(center(route[i]),center(route[(i+1)%route.length])));
  const p={...g.slime.pos};advance(g,1);assert.notDeepEqual(g.slime.pos,p);assert.ok(!g.nav.blocked(g.slime.pos.x,g.slime.pos.y));
});
test('slime warning is fixed before impact and can be avoided',()=>{
  const g=safe(2);g.slime.left=.01;advance(g,.02);assert.equal(g.slime.phase,'warning');const p={...g.slime.area};advance(g,.5);assert.deepEqual(g.slime.area,p);assert.equal(g.meetingHits,0);
  g.hero={x:380,y:100};advance(g,2);assert.equal(g.meetingHits,0);assert.equal(g.slime.phase,'patrol');
});
test('remaining in meeting circle traps movement and work while spending time',()=>{
  const g=safe(2);g.hero=center(g.config.stations[0].spot);g.slime.phase='warning';g.slime.area={...g.hero};g.slime.left=.001;
  g.update(.01);assert.equal(g.meetingHits,1);assert.ok(g.meetingLeft>0);
  const p={...g.hero},time=g.remaining,work=g.jobs[0].progress;
  advance(g,1,{x:1,action:true});assert.deepEqual(g.hero,p);assert.equal(g.jobs[0].progress,work);assert.ok(g.remaining<time-.99);
  advance(g,2.1);assert.equal(g.meetingLeft,0);
});
test('pause and conversation freeze a pending meeting warning',()=>{
  const g=safe(2);g.slime.phase='warning';g.slime.left=2;g.slime.area={...g.hero};g.pause();advance(g,4);assert.equal(g.slime.left,2);
  g.resume();g.encounter();advance(g,4);assert.equal(g.slime.left,2);
});
test('director locks a direction and gives full warning, never tracking during telegraph',()=>{
  const g=fresh(3);g.boss={x:340,y:540};g.hero={x:60,y:540};g.director.left=.001;g.updateDirector(.01);
  assert.equal(g.director.phase,'windup');assert.equal(g.director.left,CONFIG.director.warning);const dir={...g.director.dir},p={...g.boss};
  g.hero={x:340,y:100};g.updateDirector(.5);assert.deepEqual(g.director.dir,dir);assert.deepEqual(g.boss,p);
});
test('director charges into desk, stops, and is stunned for configured duration',()=>{
  const g=fresh(3);g.boss={x:260,y:420};g.hero={x:260,y:260};g.director.left=.001;g.updateDirector(.01);
  for(let i=0;i<400&&g.director.phase!=='stunned';i++)g.updateDirector(.01);
  assert.equal(g.director.phase,'stunned');assert.equal(g.directorStuns,1);assert.ok(!g.nav.blocked(g.boss.x,g.boss.y));
  const p={...g.boss};g.updateDirector(1);assert.deepEqual(g.boss,p);assert.equal(g.director.phase,'stunned');
});
test('director can be baited into outer wall too',()=>{
  const g=fresh(3);g.boss={x:400,y:540};g.hero={x:430,y:540};g.director.left=.001;g.updateDirector(.01);
  for(let i=0;i<300&&g.director.phase!=='stunned';i++)g.updateDirector(.01);
  assert.equal(g.director.phase,'stunned');assert.ok(g.boss.x<=428.1);
});
test('charge contact opens encounter, while windup and stun do not',()=>{
  const g=fresh(3);g.elapsed=4;g.boss={x:340,y:540};g.hero={x:310,y:540};
  g.director={phase:'charge',left:1,origin:{...g.boss},dir:{x:-1,y:0}};advance(g,.1);assert.equal(g.state,'encounter');
  for(const phase of ['windup','stunned']){g.reset(3);g.elapsed=4;g.boss={...g.hero};g.director.phase=phase;g.director.left=1;advance(g,.1);assert.equal(g.state,'playing');}
});
test('moving sideways escapes a telegraphed charge',()=>{
  const g=safe(3);g.bossRest=0;g.protection=0;g.elapsed=4;g.boss={x:340,y:540};g.hero={x:180,y:540};
  g.director.left=.001;g.updateDirector(.01);advance(g,.5,{y:1});advance(g,2);assert.equal(g.catches,0);
});
test('all jobs gate exit; added work re-locks it; completion produces dash',()=>{
  const g=safe();g.hero=center(g.config.exit);g.update(.01);assert.equal(g.outcome,null);
  for(const s of [...g.config.stations].reverse()){g.hero=center(s.spot);advance(g,s.duration+.01,{action:true});}
  assert.equal(g.allDone,true);assert.equal(g.phase,'dash');assert.ok(g.events.includes('dash'));
  encounter(g);g.choose('accept');assert.equal(g.phase,'work');assert.match(g.response.detail,/閉鎖/);g.continueResponse();g.bossRest=999;
  const j=g.jobs.at(-1);g.hero=center(g.config.stations.find(s=>s.id===j.station).spot);advance(g,j.duration+.01,{action:true});
  g.hero=center(g.config.exit);g.update(.01);assert.equal(g.outcome,'success');
});
test('deadline wins over completion/exit and clock is exactly 18:00',()=>{
  const g=safe();complete(g);g.hero=center(g.config.exit);g.remaining=.001;g.update(.01);assert.equal(g.outcome,'failure');assert.equal(g.clock,'18:00');
});
test('retry resets anger, shields, hazards and work but preserves selected stage',()=>{
  const g=fresh(3);g.anger=3;g.shields=0;g.directorStuns=5;g.reset();assert.equal(g.stageId,3);assert.equal(g.anger,0);assert.equal(g.shields,1);assert.equal(g.directorStuns,0);assert.equal(g.jobs[0].progress,0);
});
test('ranks still distinguish multiple results',()=>{
  const g=fresh();g.outcome='success';g.elapsed=35;g.remaining=40;assert.equal(rankResult(g),'伝説の定時勇者');
  g.shields=0;assert.equal(rankResult(g),'華麗なる引き継ぎ職人');g.catches=4;assert.equal(rankResult(g),'盾を使い切った帰宅王');
  g.added=3;assert.equal(rankResult(g),'魔王商事の新たな管理職');g.remaining=3;assert.equal(rankResult(g),'ギリギリ退勤兵');
});
test('unlock 1→2→3 persists, failures do not unlock, best titles never downgrade',()=>{
  const mem=memory(),p=new ProgressStore(mem),g=fresh();assert.equal(p.data.unlocked,1);
  g.finish('failure');p.record(g);assert.equal(p.data.unlocked,1);
  g.reset(1);g.elapsed=30;g.finish('success');assert.equal(p.record(g),true);assert.equal(p.data.unlocked,2);
  g.reset(1);g.catches=10;g.shields=0;g.elapsed=40;g.finish('success');p.record(g);assert.equal(p.data.best[1].rank,'伝説の定時勇者');
  g.reset(2);g.finish('success');p.record(g);const loaded=new ProgressStore(mem);assert.equal(loaded.data.unlocked,3);assert.equal(loaded.data.best[1].rank,'伝説の定時勇者');
});
test('reset deletes only own save; corrupt and blocked storage remain playable',()=>{
  const m=memory();m.setItem('other','keep');const p=new ProgressStore(m);p.data.unlocked=3;p.save();p.reset();assert.equal(p.data.unlocked,1);assert.equal(m.getItem(SAVE_KEY),null);assert.equal(m.getItem('other'),'keep');
  m.setItem(SAVE_KEY,'bad json');assert.equal(new ProgressStore(m).data.unlocked,1);
  const blocked=new ProgressStore({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});blocked.data.unlocked=2;blocked.save();assert.equal(blocked.available,false);assert.equal(blocked.data.unlocked,2);
  assert.equal(validate({version:1,unlocked:999,best:{1:{rank:'fake',time:1}}}).unlocked,3);
  assert.deepEqual(validate({version:1,best:{1:{rank:'fake',time:1}}}).best,{});
});
