import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CONFIG as C,center,solids,SKILL_IDS} from '../src/config.js';
import {blocked,clearLine} from '../src/pathfinding.js';

const fresh=()=>{const g=new Game(()=>.25);g.showInstructions();g.startRun();g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];g.phase='test';return g;};
const step=(g,seconds,input={})=>{let left=seconds;while(left>1e-9&&g.state==='playing'){const dt=Math.min(1/120,left);g.update(dt,input);left-=dt;}};
const add=(g,type,pos)=>g.createEnemy(type,pos);
const openBoss=g=>{g.state='bossIntro';g.phase='bossIntro';g.spawnBoss();return g.boss;};

test('menus pause the five-minute 17:45 clock and play advances it',()=>{
  const g=new Game();g.update(30);assert.equal(g.timeText,'5:00');assert.equal(g.clock,'17:45');
  g.showInstructions();g.update(30);assert.equal(g.remaining,300);g.startRun();g.update(.1);assert.ok(Math.abs(g.remaining-299.9)<1e-6);
  g.elapsed=150;assert.equal(g.clock,'17:52');g.elapsed=300;assert.equal(g.clock,'18:00');
});

test('movement keeps facing, normalizes diagonals and respects walls/desks',()=>{
  const g=fresh(),p={...g.hero};step(g,.5,{x:1,y:-1});assert.ok(Math.abs(Math.hypot(g.hero.x-p.x,g.hero.y-p.y)-85)<1);assert.ok(g.hero.facing.x>.7&&g.hero.facing.y<-.7);
  g.hero={...g.hero,x:60,y:220};step(g,1,{x:1});assert.equal(blocked(g.hero.x,g.hero.y,C.radius,solids),false);assert.ok(g.hero.x<68.1);
});

test('one slash hits each target once, knocks groups back and cannot cross a desk',()=>{
  const g=fresh();g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};const a=add(g,'slime',{x:245,y:290}),b=add(g,'slime',{x:246,y:310}),x=a.pos.x;
  g.swing();assert.equal(a.hp,16);assert.equal(b.hp,16);assert.ok(a.pos.x>x);step(g,.12);assert.equal(a.hp,16);g.hero.attackCd=0;g.swing();assert.equal(a.dead,true);assert.equal(b.dead,true);
  const w=fresh();w.hero={...w.hero,x:140,y:220,facing:{x:1,y:0}};const hidden=add(w,'slime',{x:220,y:220});assert.equal(clearLine(w.hero,hidden.pos,solids),false);w.swing();assert.equal(hidden.hp,40);
});

test('task slash evolves through range, follow-up and periodic full-circle levels',()=>{
  const g=fresh(),baseRange=g.attackRange,baseArc=g.attackArc;g.skills.slash=1;assert.ok(g.attackRange>baseRange&&g.attackArc>baseArc);
  g.skills.slash=2;g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};const e=add(g,'ghost',{x:250,y:300});g.swing();step(g,.14);assert.equal(e.hp,12);
  const all=fresh();all.skills.slash=3;all.hero={...all.hero,x:240,y:320,facing:{x:1,y:0},attackCount:3};const behind=add(all,'slime',{x:190,y:320});all.swing();assert.ok(behind.hp<40);assert.ok(all.attacks.some(a=>a.kind==='circle'));
});

test('reply evolves from one to three to five projectiles and level 3 pierces',()=>{
  const g=fresh();g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};
  for(const level of [1,2,3]){g.skills.reply=level;g.heroProjectiles=[];g.swing();assert.equal(g.heroProjectiles.length,[0,1,3,5][level]);g.hero.attackCd=0;}
  const p=g.heroProjectiles[2];assert.equal(p.pierce,4);
});

test('shredder uses per-blade hit cooldown instead of damaging every frame',()=>{
  const g=fresh();g.skills.shredder=1;g.hero={...g.hero,x:240,y:320};const b=g.orbitPositions()[0],e=add(g,'brute',{x:b.x,y:b.y});g.updateShredder(.01);const once=e.hp;g.updateShredder(.01);assert.equal(e.hp,once);g.updateShredder(C.shredder.hitInterval+.01);assert.ok(e.hp<once);
  g.skills.shredder=3;assert.equal(g.orbitPositions().length,4);assert.equal(C.shredder.radius[3],74);
});

test('thunder chains to distinct targets and meteor is aerial with expanded multi-sites',()=>{
  const g=fresh();g.hero={...g.hero,x:200,y:300};const list=[add(g,'slime',{x:230,y:300}),add(g,'slime',{x:260,y:300}),add(g,'slime',{x:290,y:300}),add(g,'slime',{x:320,y:300})];
  g.castThunder(3);const struck=new Set(g.thunders.map(t=>`${t.to.x},${t.to.y}`));assert.equal(struck.size,g.thunders.length);assert.ok(g.thunders.length>=3);
  g.skills.meteor=3;g.castMeteor(3);assert.equal(g.meteors.length,3);for(const m of g.meteors)m.left=0;g.updateMeteors(.01);assert.ok(list.some(e=>e.hp<40));assert.equal(g.meteors.every(m=>m.fired),true);
});

test('ultimate reaches the screen, clears bullets, preserves warnings and does limited boss damage',()=>{
  const g=fresh(),mob=add(g,'brute',{x:90,y:90}),boss=openBoss(g);boss.state='recover';boss.weak=true;g.enemyProjectiles=[{life:4}];g.enemyAreas=[{pos:{x:80,y:80},radius:20,left:2,fired:false,effect:0,damage:1}];g.ultimate=100;g.useUltimate();
  assert.equal(g.enemyProjectiles.length,0);assert.equal(g.enemyAreas.length,1);assert.equal(mob.hp,30);assert.equal(boss.hp,C.boss.hp-C.ultimate.bossDamage);assert.equal(g.ultimate,0);
});

test('bat fans scale by stage, ghost locks its charge and dangerous rushes do not start together',()=>{
  const g=fresh(),bat=add(g,'bat',{x:100,y:300});g.stage=3;bat.state='warn';bat.left=.001;bat.dir={x:1,y:0};g.updateBat(bat,.01);assert.equal(g.enemyProjectiles.length,5);
  const ghost=add(g,'ghost',{x:100,y:420});g.hero={...g.hero,x:300,y:420};ghost.left=.001;g.updateGhost(ghost,.01);assert.equal(ghost.state,'warn');const dir={...ghost.dir};g.hero.y=550;g.updateGhost(ghost,.2);assert.deepEqual(ghost.dir,dir);
  const brute=add(g,'brute',{x:300,y:500});brute.left=.001;g.updateBrute(brute,.01);assert.equal(brute.state,'move');assert.ok(brute.left>.3);
  const clear=fresh(),only=add(clear,'brute',{x:300,y:500});only.left=.001;clear.updateBrute(only,.01);assert.equal(only.state,'warn');assert.ok(only.left>1.2);
});

test('spawns are warned away from the hero and all entity/effect caps hold',()=>{
  const g=fresh();g.beginWave(3,2);step(g,.2);assert.ok(g.spawnWarnings.length);assert.ok(g.spawnWarnings.every(w=>Math.hypot(w.pos.x-g.hero.x,w.pos.y-g.hero.y)>100));
  for(let i=0;i<50;i++)g.createEnemy('slime',{x:80+i,y:80});assert.ok(g.activeEnemies.length<=C.limits.enemies);
  g.enemyProjectiles=Array.from({length:70},()=>({pos:{x:80,y:80},dir:{x:0,y:0},life:4,radius:7}));g.updateProjectiles(.01);assert.ok(g.enemyProjectiles.length<=C.projectile.maxEnemy);
});

test('six wave clears lead through three stages and six retained upgrades to the boss',()=>{
  const g=new Game(()=>.25);g.showInstructions();g.startRun();const visited=[],offers=[];
  for(let n=0;n<6;n++){
    g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];step(g,C.waveCompleteDelay+.02);assert.equal(g.state,'upgrade');visited.push([g.stage,g.wave]);offers.push([...g.offers]);assert.equal(g.offers.length,3);assert.ok(g.offers.every(id=>g.skills[id]<3));
    assert.equal(g.chooseUpgrade(0),true);
    if(g.state==='stageIntro')g.enterStage();
  }
  assert.deepEqual(visited,[[1,1],[1,2],[2,1],[2,2],[3,1],[3,2]]);assert.ok(offers[0].includes('reply'));assert.equal(g.upgradeCount,6);assert.equal(g.state,'bossIntro');assert.equal(Object.values(g.skills).reduce((a,b)=>a+b,0),6);
});

test('stage transition restores exactly 30 percent of maximum energy without overflow',()=>{
  const g=fresh();g.hero.energy=50;g.openUpgrade({kind:'stage',stage:2});g.chooseUpgrade(0);assert.equal(g.hero.energy,80);assert.equal(g.transitionHeal,30);assert.equal(g.state,'stageIntro');assert.ok(g.notice.includes('30'));
  g.state='upgrade';g.offers=['slash'];g.afterUpgrade={kind:'stage',stage:3};g.hero.energy=90;g.chooseUpgrade(0);assert.equal(g.hero.energy,100);assert.equal(g.transitionHeal,10);
});

test('offers include an available evolution and omit maximum skills without stalling',()=>{
  const g=fresh();g.upgradeCount=2;g.skills={slash:3,reply:2,shredder:3,thunder:0,meteor:0};const offers=g.buildOffers();assert.equal(offers.length,3);assert.ok(offers.includes('reply'));assert.ok(!offers.includes('slash')&&!offers.includes('shredder'));
  g.skills={slash:3,reply:3,shredder:3,thunder:2,meteor:2};assert.deepEqual(new Set(g.buildOffers()),new Set(['thunder','meteor']));
});

test('all five skill families operate at level 3 together',()=>{
  const g=fresh();for(const id of SKILL_IDS)g.skills[id]=3;g.hero={...g.hero,x:240,y:320,facing:{x:1,y:0},attackCount:3};for(let i=0;i<8;i++)add(g,'brute',{x:205+i*10,y:290+(i%2)*55});
  g.swing();g.updateAutomaticSkills(.01);assert.equal(g.heroProjectiles.length,5);assert.equal(g.orbitPositions().length,4);assert.ok(g.thunders.length);assert.equal(g.meteors.length,3);assert.ok(g.attacks.some(a=>a.kind==='circle'));
});

test('pause and upgrade freeze enemies, bullets, warnings, automatic skills and clock',()=>{
  for(const state of ['upgrade','paused']){const g=fresh(),e=add(g,'slime',{x:100,y:100});g.skills.thunder=1;g.enemyProjectiles=[{pos:{x:100,y:100},dir:{x:1,y:0},life:4,radius:7}];g.spawnWarnings=[{type:'slime',pos:{x:200,y:200},left:.8}];g.state=state;const before={time:g.remaining,x:e.pos.x,life:g.enemyProjectiles[0].life,w:g.spawnWarnings[0].left,auto:g.auto.thunder};g.update(2,{x:1,attack:true});assert.deepEqual({time:g.remaining,x:e.pos.x,life:g.enemyProjectiles[0].life,w:g.spawnWarnings[0].left,auto:g.auto.thunder},before);}
});

test('ultimate grants short invulnerability and 1.2 second hit immunity prevents burst damage',()=>{
  const g=fresh();assert.equal('dashLeft' in g.hero,false);assert.equal('shieldLeft' in g.hero,false);g.ultimate=100;g.useUltimate();assert.ok(g.hero.invulnerable>=.69);assert.equal(g.damageHero(50,{x:0,y:0}),false);
  step(g,.71);assert.equal(g.damageHero(10,{x:0,y:0}),true);assert.equal(g.damageHero(50,{x:0,y:0}),false);assert.ok(g.hero.invulnerable>1.19);assert.equal(g.hitsTaken,1);
});

test('floor, charge and fan attacks leave routes that normal movement can use',()=>{
  const floor=fresh();floor.hero={...floor.hero,x:240,y:320};floor.enemyAreas=[{kind:'bossFloor',pos:{x:240,y:320},radius:C.boss.floorRadius,left:C.boss.floorWarning,order:1,damage:C.boss.damage,fired:false,effect:0}];step(floor,C.boss.floorWarning+.02,{x:1});assert.equal(floor.hitsTaken,0);assert.ok(Math.hypot(floor.hero.x-240,floor.hero.y-320)>C.boss.floorRadius+C.radius);
  const rush=fresh(),ghost=add(rush,'ghost',{x:100,y:300});rush.hero={...rush.hero,x:230,y:300};ghost.state='warn';ghost.left=C.enemies.ghost.warning;ghost.dir={x:1,y:0};step(rush,C.enemies.ghost.warning+C.enemies.ghost.chargeDuration,{y:1});assert.equal(rush.hitsTaken,0);assert.deepEqual(ghost.dir,{x:1,y:0});
  const batGap=2*C.enemies.bat.desired*Math.sin(C.enemies.bat.spread*Math.PI/360);assert.ok(batGap>2*(C.radius+7));
  const bossGap=2*C.enemies.bat.desired*Math.sin(C.boss.fanSpread*Math.PI/360);assert.ok(bossGap>2*(C.radius+8));
});

test('stage 1 enemy rewards charge the ultimate before the floor ends',()=>{
  const g=fresh();for(let i=0;i<10;i++){const e=add(g,'slime',{x:80+i*20,y:100});g.damageEnemy(e,100,{x:1,y:0});}assert.equal(g.ultimate,100);
});

test('boss has three phase-specific patterns and keeps readable warning times',()=>{
  const g=fresh(),b=openBoss(g);assert.equal(b.bossPhase,1);g.startBossAttack(b);assert.equal(b.state,'chargeWarn');assert.equal(b.left,C.boss.chargeWarning);
  b.phaseDone=new Set(['charge','meeting']);b.hp=C.boss.hp*.6;b.state='chase';b.left=0;g.updateBoss(b,.01);assert.equal(b.bossPhase,2);b.state='chase';const states=new Set();for(let i=0;i<4;i++){g.startBossAttack(b);states.add(b.state);b.state='chase';}assert.ok(states.has('fanWarn')&&states.has('summonWarn'));
  b.phaseDone=new Set(['fan','summon']);b.hp=C.boss.hp*.3;b.state='chase';b.left=0;g.updateBoss(b,.01);assert.equal(b.bossPhase,3);b.state='chase';const late=new Set();for(let i=0;i<5;i++){g.startBossAttack(b);late.add(b.state);b.state='chase';}assert.ok(late.has('multiWarn')&&late.has('floorSequence'));assert.equal(C.boss.multiWarning>=.7,true);assert.equal(C.boss.floorWarning>=1,true);
});

test('boss charge can be routed into a desk, exposing a full-damage weak window',()=>{
  const g=fresh(),b=openBoss(g);b.pos={x:180,y:300};b.state='charge';b.left=1;b.dir={x:0,y:-1};for(let i=0;i<300&&b.state!=='stunned';i++)g.updateBoss(b,.01);assert.equal(b.state,'stunned');assert.ok(b.left>1.4);
  const hp=b.hp;b.weak=true;g.damageEnemy(b,20,{x:1,y:0});assert.equal(b.hp,hp-20);b.weak=false;const hp2=b.hp;g.damageEnemy(b,20,{x:1,y:0});assert.equal(b.hp,hp2-12);
});

test('boss defeat opens the gate; only arrival wins; energy and timeout lose',()=>{
  const g=fresh(),b=openBoss(g);b.bossPhase=3;b.phaseDone=new Set(['multi','floor']);b.state='stunned';b.weak=true;g.damageEnemy(b,C.boss.hp,{x:1,y:0});assert.equal(g.phase,'escape');assert.equal(g.outcome,null);g.hero={...g.hero,...center(C.gate)};g.update(.01);assert.equal(g.outcome,'success');
  let x=fresh();x.hero.energy=1;x.damageHero(2,{x:0,y:0});assert.equal(x.reason,'energy');x=fresh();x.remaining=.001;x.update(.01);assert.equal(x.reason,'timeout');
});

test('retry completely resets stages, skills, projectiles, boss and statistics',()=>{
  const g=fresh();g.stage=3;g.skills={slash:3,reply:3,shredder:1,thunder:1,meteor:1};g.upgradeCount=6;g.enemyProjectiles.push({});g.kills=99;g.boss={};g.finish('energy');g.reset();
  assert.equal(g.state,'title');assert.equal(g.stage,1);assert.equal(g.wave,0);assert.deepEqual(g.skills,{slash:0,reply:0,shredder:0,thunder:0,meteor:0});assert.deepEqual(g.enemyProjectiles,[]);assert.equal('shields' in g.hero,false);assert.equal(g.kills,0);assert.equal(g.boss,null);assert.equal(g.remaining,300);
});
