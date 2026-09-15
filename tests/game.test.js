import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CONFIG as C,center,SKILL_IDS} from '../src/config.js';

const step=(g,seconds,input={})=>{let left=seconds;while(left>1e-9&&g.state==='playing'){const dt=Math.min(1/120,left);g.update(dt,input);left-=dt;}};
const fresh=(ultimate='exit')=>{const g=new Game(()=>.25);g.showInstructions();g.startRun();g.selectUltimate(ultimate);g.enterStage();g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];g.phase='test';return g;};
const add=(g,type,pos)=>g.createEnemy(type,pos);
const manager=()=>{const g=fresh();g.loadStage(3,true);g.state='bossIntro';g.phase='bossIntro';g.spawnBoss('manager');return [g,g.boss];};
const president=()=>{const g=fresh();g.loadStage(5,true);g.state='presidentIntro';g.phase='presidentIntro';g.spawnBoss('president');return [g,g.boss];};

test('eight-minute clock and all menu states freeze combat time',()=>{
  const g=new Game();assert.equal(g.timeText,'8:00');g.update(20);assert.equal(g.remaining,480);g.showInstructions();g.startRun();assert.equal(g.state,'ultimateSelect');g.update(10);assert.equal(g.remaining,480);g.selectUltimate(0);assert.equal(g.state,'stageIntro');g.enterStage();g.update(.1);assert.ok(Math.abs(g.remaining-479.9)<1e-6);
});

test('initial slash is 64px by 100 degrees, deals 24 and matches a single arc hit',()=>{
  const g=fresh();assert.equal(g.attackRange,64);assert.ok(Math.abs(g.attackArc*180/Math.PI-100)<1e-6);g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};
  const front=add(g,'slime',{x:255,y:300}),behind=add(g,'slime',{x:145,y:300});g.swing();assert.equal(front.hp,16);assert.equal(behind.hp,40);step(g,.1);assert.equal(front.hp,16);
});

test('slash cannot pass a desk and keeps moving while held attack repeats',()=>{
  const g=fresh();g.hero={...g.hero,x:140,y:220,facing:{x:1,y:0}};const hidden=add(g,'slime',{x:220,y:220});g.swing();assert.equal(hidden.hp,40);
  const moving=fresh(),x=moving.hero.x;step(moving,.8,{x:1,attack:true});assert.ok(moving.hero.x>x+100);assert.ok(moving.hero.attackCount>=2);
});

test('wave one offers evolutions and wave two offers only unlearned new skills',()=>{
  const g=fresh();g.skills.reply=1;g.skills.slash=1;g.openUpgrade({kind:'wave',stage:1,wave:2},'evolution');assert.ok(g.offers.every(id=>g.skills[id]>0&&g.skills[id]<3));
  g.state='playing';g.openUpgrade({kind:'stage',stage:2},'new');assert.ok(g.offers.includes('reply')===false);assert.ok(g.offers.every(id=>!['slash','heal','gauge'].includes(id)&&g.skills[id]===0));
});

test('evolution candidate shortage is allowed and empty evolution gives recovery choices',()=>{
  const g=fresh();g.skills={slash:2,reply:3,shredder:0,thunder:0,meteor:0,boomerang:0,drone:0};g.openUpgrade({kind:'wave',stage:1,wave:2},'evolution');assert.deepEqual(g.offers,['slash']);
  g.skills.slash=3;g.state='playing';g.openUpgrade({kind:'wave',stage:1,wave:2},'evolution');assert.deepEqual(g.offers,['heal','gauge']);g.hero.energy=50;g.chooseUpgrade(0);assert.equal(g.hero.energy,90);
});

test('boomerang hits once outbound and once returning without per-frame damage',()=>{
  const g=fresh();g.skills.boomerang=1;g.hero={...g.hero,x:180,y:300,facing:{x:1,y:0}};const e=add(g,'brute',{x:260,y:300});g.fireBoomerang();const p=g.heroProjectiles[0];for(let i=0;i<240&&p.life>0;i++)g.updateProjectiles(1/120);assert.equal(p.outHits.has(e.id),true);assert.equal(p.backHits.has(e.id),true);assert.equal(e.hp,C.enemies.brute.hp-C.boomerang.damage[1]*2);
});

test('friendly drones follow the hero and gain count and fire rate by level',()=>{
  const g=fresh();g.skills.drone=1;let p=g.dronePositions()[0];g.hero.x+=30;assert.notEqual(g.dronePositions()[0].x,p.x);const e=add(g,'slime',{x:g.hero.x+100,y:g.hero.y});g.fireDrone(1);assert.equal(g.heroProjectiles.some(x=>x.kind==='drone'),true);assert.equal(C.drone.count[2],2);assert.ok(C.drone.interval[3]<C.drone.interval[1]);
});

test('screen-clear ultimate affects only the current camera and clears visible bullets',()=>{
  const g=fresh('exit');g.loadStage(4,true);const cam=g.camera(),near=add(g,'brute',{x:cam.x+100,y:cam.y+100}),far=add(g,'brute',{x:900,y:100});g.enemyProjectiles=[{pos:{x:cam.x+50,y:cam.y+50}},{pos:{x:900,y:100}}];g.ultimate=100;g.useUltimate();assert.equal(near.hp,C.enemies.brute.hp-C.ultimate.exit.mobDamage);assert.equal(far.hp,C.enemies.brute.hp);assert.equal(g.enemyProjectiles.length,1);assert.ok(g.hero.invulnerable>=.69);
});

test('clone ultimate creates two intangible followers and repeats slash and reply at half damage',()=>{
  const g=fresh('clones');g.skills.reply=1;g.ultimate=100;g.useUltimate();assert.equal(g.clonePositions().length,2);const p=g.clonePositions()[0],e=add(g,'slime',{x:p.x+35,y:p.y});g.hero.facing={x:1,y:0};g.swing();assert.ok(e.hp<40);assert.ok(g.heroProjectiles.some(x=>x.kind==='cloneReply'));const before=g.ultimate;g.killEnemy(add(g,'slime',{x:80,y:80}));assert.equal(g.ultimate,before);step(g,C.ultimate.clones.duration+.1);assert.equal(g.clonePositions().length,0);
});

test('rush ultimate uses bounded fast full-circle attacks and halves incoming damage',()=>{
  const g=fresh('rush');g.ultimate=100;g.useUltimate();const e=add(g,'slime',{x:g.hero.x+50,y:g.hero.y});g.swing();assert.ok(e.hp<40);assert.ok(g.hero.attackCd>=C.ultimate.rush.minCooldown&&g.hero.attackCd<C.attack.cooldown);step(g,C.ultimate.invulnerability+.02);const hp=g.hero.energy;g.damageHero(20,{x:0,y:0});assert.equal(g.hero.energy,hp-10);step(g,C.ultimate.rush.duration+.1);assert.equal(g.ultimateEffectLeft,0);
});

test('large enemy attacks sooner, changes action by distance and resists knockback',()=>{
  const g=fresh(),b=add(g,'brute',{x:g.hero.x+220,y:g.hero.y});b.left=0;g.updateBrute(b,.01);assert.equal(b.state,'rangedWarn');assert.equal(b.left,C.enemies.brute.rangedWarning);b.state='move';b.left=0;b.pos={x:g.hero.x+55,y:g.hero.y};g.updateBrute(b,.01);assert.equal(b.state,'areaWarn');assert.ok(C.enemies.brute.areaInterval<3.85);const x=b.pos.x;g.damageEnemy(b,1,{x:1,y:0},24);assert.ok(b.pos.x-x<7);
});

test('manager attacks more often while preserving warnings and all three phases',()=>{
  const [g,b]=manager();assert.ok(C.boss.intervals[1]<=3.1*.85);g.startManagerAttack(b);assert.equal(b.state,'chargeWarn');assert.equal(b.left,1.25);b.phaseDone=new Set(['charge','meeting']);b.hp=400;b.state='chase';b.left=0;g.updateManager(b,.01);assert.equal(b.bossPhase,2);b.phaseDone=new Set(['fan','summon']);b.hp=200;b.state='chase';b.left=0;g.updateManager(b,.01);assert.equal(b.bossPhase,3);
});

test('wide stages use a clamped camera, guided arenas and dynamic collision',()=>{
  const g=fresh();g.loadStage(4,true);assert.deepEqual([g.worldWidth,g.worldHeight],[960,1280]);g.state='stageIntro';g.enterStage();assert.equal(g.phase,'travel');assert.ok(g.objectivePoint);g.hero={...g.hero,x:900,y:1200};assert.deepEqual(g.camera(),{x:480,y:640});assert.equal(g.isBlocked(0,0),true);
});

test('off-camera ranged enemies do not begin attacks in wide maps',()=>{
  const g=fresh();g.loadStage(4,true);g.hero={...g.hero,x:100,y:1150};const e=add(g,'sentry',{x:850,y:100});e.left=0;g.updateSentry(e,.01);assert.equal(e.state,'move');assert.ok(e.left>.3);
});

test('president laser can be walked out of and reorganization never leaves actors trapped',()=>{
  const [g,b]=president();g.hero={...g.hero,x:b.pos.x+180,y:b.pos.y};b.state='laserWarn';b.left=C.president.laserWarning;b.dir={x:1,y:0};step(g,C.president.laserWarning+.05,{y:1});assert.equal(g.hitsTaken,0);
  g.hero={...g.hero,x:450,y:940};const minion=add(g,'slime',{x:460,y:940});g.reorganize();assert.equal(g.isBlocked(g.hero.x,g.hero.y),false);assert.equal(g.isBlocked(minion.pos.x,minion.pos.y),false);assert.ok(g.nav.findPath(g.hero,center(g.stageConfig.gate)).length>0);
});

test('president uses laser, reorganization and capped summons before changing phase',()=>{
  const [g,b]=president(),states=[];for(let i=0;i<3;i++){b.state='chase';g.startPresidentAttack(b);states.push(b.state);}assert.deepEqual(states,['laserWarn','reorgWarn','summonWarn']);
  b.hp=C.president.hp*.49;b.state='chase';b.left=0;g.updatePresident(b,.01);assert.equal(b.bossPhase,2);assert.equal(b.state,'phaseShift');
  g.enemies=g.enemies.filter(e=>e===b);b.state='summonWarn';b.left=0;g.updatePresident(b,.01);assert.ok(g.spawnWarnings.length<=C.president.summonCap);
});

test('all five stages, manager elevator, president and final gate form one run',()=>{
  const g=new Game(()=>.25);g.showInstructions();g.startRun();g.selectUltimate('exit');const visited=new Set(),types=[];let managerSeen=false,presidentSeen=false,elevatorSeen=false;
  for(let guard=0;guard<100&&g.state!=='result';guard++){
    if(g.state==='stageIntro'){g.enterStage();continue;}if(g.state==='upgrade'){types.push(g.upgradeType);g.chooseUpgrade(0);continue;}if(g.state==='bossIntro'){managerSeen=true;const b=g.spawnBoss('manager');g.killEnemy(b);continue;}if(g.state==='presidentIntro'){presidentSeen=true;const b=g.spawnBoss('president');g.killEnemy(b);continue;}
    if(g.state==='playing'&&g.phase==='travel'){visited.add(g.stage);g.hero={...g.hero,...g.travelTarget};g.update(.01);continue;}if(g.state==='playing'&&g.phase==='wave'){visited.add(g.stage);g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];step(g,C.waveCompleteDelay+.02);continue;}if(g.state==='playing'&&g.phase==='elevator'){elevatorSeen=true;g.hero={...g.hero,...center(g.stageConfig.gate)};g.update(.01);continue;}if(g.state==='playing'&&g.phase==='escape'){g.hero={...g.hero,...center(g.stageConfig.gate)};g.update(.01);continue;}
  }
  assert.equal(g.outcome,'success');assert.deepEqual([...visited],[1,2,3,4,5]);assert.ok(managerSeen&&presidentSeen&&elevatorSeen);assert.equal(types.filter(x=>x==='evolution').length,5);assert.equal(types.filter(x=>x==='new').length,6);assert.equal(g.clearedWaves,10);
});

test('energy depletion and eight-minute timeout both end the run',()=>{
  let g=fresh();g.hero.energy=1;g.damageHero(2,{x:0,y:0});assert.equal(g.reason,'energy');g=fresh();g.remaining=.001;g.update(.01);assert.equal(g.reason,'timeout');
});

test('pause and retry clear projectiles, effects, skills, bosses and selected ultimate',()=>{
  const g=fresh('clones');g.ultimate=100;g.useUltimate();g.pause();const before=g.ultimateEffectLeft;g.update(5);assert.equal(g.ultimateEffectLeft,before);g.finish('energy');g.reset();assert.equal(g.ultimateChoice,null);assert.equal(g.ultimateEffectLeft,0);assert.equal(g.stage,1);assert.equal(g.boss,null);assert.deepEqual(g.heroProjectiles,[]);assert.ok(SKILL_IDS.every(id=>g.skills[id]===0));assert.equal(g.remaining,480);
});
