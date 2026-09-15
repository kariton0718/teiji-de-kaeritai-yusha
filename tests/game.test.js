import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CONFIG as C,center,solids,UPGRADE_IDS} from '../src/config.js';
import {blocked,clearLine} from '../src/pathfinding.js';

const game=()=>{const g=new Game(()=>.25);g.showInstructions();g.startRun();g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];g.phase='test';return g;};
const step=(g,seconds,input={})=>{let left=seconds;while(left>1e-9){const dt=Math.min(1/120,left);g.update(dt,input);left-=dt;}};
const enemy=(g,type,pos)=>g.createEnemy(type,pos);

test('title and instructions freeze five-minute clock, then map 5:00 to 17:45–18:00',()=>{
  const g=new Game();g.update(30);assert.equal(g.remaining,300);assert.equal(g.timeText,'5:00');assert.equal(g.clock,'17:45');g.showInstructions();g.update(30);assert.equal(g.remaining,300);g.startRun();g.update(.1);assert.ok(Math.abs(g.remaining-299.9)<1e-6);
  g.elapsed=150;assert.equal(g.clock,'17:52');g.elapsed=300;assert.equal(g.clock,'18:00');
});
test('movement keeps facing, normalizes diagonals, and cannot cross desks or walls',()=>{
  const g=game(),p={...g.hero};step(g,.5,{x:1,y:-1});assert.ok(Math.abs(Math.hypot(g.hero.x-p.x,g.hero.y-p.y)-85)<1);assert.ok(g.hero.facing.x>.7&&g.hero.facing.y<-.7);
  g.hero={...g.hero,x:150,y:220};step(g,1,{x:1});assert.ok(g.hero.x<148.1||!blocked(g.hero.x,g.hero.y,C.radius,solids));assert.equal(blocked(g.hero.x,g.hero.y,C.radius,solids),false);
});
test('one swing hits each enemy once, hits a group, and knocks small enemies back',()=>{
  const g=game();g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};const a=enemy(g,'slime',{x:245,y:290}),b=enemy(g,'slime',{x:246,y:310}),x=a.pos.x;
  g.swing();assert.equal(a.hp,20);assert.equal(b.hp,20);assert.ok(a.pos.x>x);step(g,.12);assert.equal(a.hp,20);
});
test('attack respects facing, range and walls',()=>{
  const g=game();g.hero={...g.hero,x:140,y:220,facing:{x:1,y:0}};const behind=enemy(g,'slime',{x:100,y:220}),behindDesk=enemy(g,'slime',{x:220,y:220});g.swing();assert.equal(behind.hp,40);assert.equal(behindDesk.hp,40);assert.equal(clearLine(g.hero,behindDesk.pos,solids),false);
});
test('held attack repeats at configured interval and follow-up is weaker',()=>{
  const g=game();g.hero={...g.hero,x:200,y:300,facing:{x:1,y:0}};const e=enemy(g,'ghost',{x:250,y:300});step(g,.34,{attack:true});assert.equal(e.hp,30);step(g,.02,{attack:true});assert.equal(e.hp,10);
  const h=game();h.upgrades.push('double');h.hero={...h.hero,x:200,y:300,facing:{x:1,y:0}};const s=enemy(h,'slime',{x:245,y:300});h.swing();step(h,.14);assert.equal(s.hp,8);
});
test('dash lasts 0.18 seconds, is invulnerable, has cooldown, and respects walls',()=>{
  const g=game();g.hero={...g.hero,x:100,y:300,facing:{x:1,y:0}};g.update(.01,{dash:true});const start=g.hero.x;assert.ok(g.hero.dashLeft>0);assert.equal(g.damageHero(50,{x:0,y:300}),false);step(g,.2);assert.ok(g.hero.x>start+70);const cd=g.hero.dashCd;g.update(.01,{dash:true});assert.ok(g.hero.dashCd<cd);
  g.hero={...g.hero,x:140,y:180,facing:{x:0,y:1},dashCd:0};g.update(.2,{dash:true});assert.equal(blocked(g.hero.x,g.hero.y,C.radius,solids),false);assert.ok(g.hero.y<188.1);
});
test('shield has two charges, blocks damage for 1.5 seconds, then expires',()=>{
  const g=game();g.update(.01,{shield:true});assert.equal(g.hero.shields,1);assert.ok(g.hero.shieldLeft>1.48);assert.equal(g.damageHero(80,{x:0,y:0}),false);step(g,1.51);assert.equal(g.damageHero(10,{x:0,y:0}),true);assert.equal(g.hero.energy,90);
});
test('damage invulnerability prevents overlap burst and ghost adds slow without disabling control',()=>{
  const g=game();assert.equal(g.damageHero(12,{x:0,y:0}),true);assert.equal(g.damageHero(50,{x:0,y:0}),false);assert.equal(g.hitsTaken,1);step(g,.81);const ghost=enemy(g,'ghost',{...g.hero});ghost.contactLeft=0;g.contactHero(ghost,14,true);assert.ok(g.hero.slowLeft>0);const x=g.hero.x;step(g,.2,{x:1});assert.ok(g.hero.x>x);
});
test('ultimate charges from kills, damages a group, cannot one-shot boss, and is consumed',()=>{
  const g=game();g.hero={...g.hero,x:240,y:320};const a=enemy(g,'slime',{x:270,y:320});g.damageEnemy(a,40,{x:1,y:0});assert.equal(g.ultimate,16);g.spawnBoss();const b=g.boss;b.pos={x:280,y:320};b.state='recover';g.ultimate=100;const s=enemy(g,'slime',{x:210,y:320});g.update(.01,{ultimate:true});assert.equal(g.ultimate,16);assert.equal(b.hp,440);assert.equal(s.dead,true);assert.ok(g.banner.title.includes('退勤'));
});
test('enemy bullets are telegraphed, capped, collide with desks, expire and damage hero',()=>{
  const g=game(),bat=enemy(g,'bat',{x:100,y:300});bat.left=.001;g.update(.01);assert.equal(bat.state,'warn');assert.ok(bat.left>.58);bat.left=.001;g.update(.01);assert.equal(g.enemyProjectiles.length,1);
  g.enemyProjectiles=[{pos:{x:150,y:220},dir:{x:1,y:0},life:4,radius:7}];g.update(.1);assert.equal(g.enemyProjectiles.length,0);
  g.enemyProjectiles=[{pos:{x:g.hero.x-10,y:g.hero.y},dir:{x:1,y:0},life:4,radius:7}];g.update(.01);assert.equal(g.hitsTaken,1);
  g.enemyProjectiles=Array.from({length:C.projectile.maxEnemy},()=>({pos:{x:80,y:80},dir:{x:0,y:0},life:4,radius:7}));bat.state='warn';bat.left=.001;g.update(.01);assert.equal(g.enemyProjectiles.length,C.projectile.maxEnemy);
});
test('ghost locks charge direction during warning and has recovery after charge',()=>{
  const g=game(),e=enemy(g,'ghost',{x:100,y:300});g.hero={...g.hero,x:300,y:300};e.left=.001;g.update(.01);assert.equal(e.state,'warn');const dir={...e.dir};g.hero.y=500;step(g,.3);assert.deepEqual(e.dir,dir);e.left=.001;g.update(.01);assert.equal(e.state,'charge');step(g,.7);assert.ok(['recover','move'].includes(e.state));
});
test('spawn warnings keep planned enemies from counting as wave clear and avoid hero overlap',()=>{
  const g=game();g.beginWave(1);step(g,.2);assert.ok(g.spawnWarnings.length);assert.equal(g.state,'playing');assert.ok(g.spawnWarnings.every(w=>Math.hypot(w.pos.x-g.hero.x,w.pos.y-g.hero.y)>100));
  g.spawnQueue=[];g.spawnWarnings=[];g.enemies=[];step(g,C.waveCompleteDelay+.02);assert.equal(g.state,'upgrade');
});
test('wave 1 and 2 offer three unowned upgrades; choices carry forward and coffee heals',()=>{
  const g=game();g.wave=1;g.openUpgrade();assert.equal(g.offers.length,3);g.chooseUpgrade(0);assert.equal(g.upgrades.length,1);assert.equal(g.wave,2);assert.ok(g.coffee);g.hero.energy=50;g.hero.x=g.coffee.x;g.hero.y=g.coffee.y;g.collectCoffee();assert.equal(g.hero.energy,74);assert.equal(g.coffee,null);
  g.enemies=[];g.spawnQueue=[];g.spawnWarnings=[];g.wave=2;g.openUpgrade();assert.ok(g.offers.every(id=>!g.upgrades.includes(id)));const first=g.upgrades[0];g.chooseUpgrade(0);assert.equal(g.upgrades.length,2);assert.equal(g.upgrades.filter(x=>x===first).length,1);
});
test('every upgrade changes its promised combat value and all can coexist',()=>{
  const g=game();const baseSpeed=g.speed,baseRange=g.attackRange,baseArc=g.attackArc,baseDash=g.dashCooldown;g.upgrades.push(...UPGRADE_IDS);
  assert.ok(g.speed>baseSpeed&&g.attackRange>baseRange&&g.attackArc>baseArc&&g.dashCooldown<baseDash);assert.ok(g.hasUpgrade('double')&&g.hasUpgrade('reply'));g.hero.shields=2;g.hero.energy=50;g.state='upgrade';g.offers=['vacation'];g.upgrades=g.upgrades.filter(x=>x!=='vacation');g.chooseUpgrade(0);assert.equal(g.hero.shields,3);assert.equal(g.hero.energy,75);g.ultimate=100;assert.equal(g.ultimateDamage,90);
});
test('upgrade, instructions and pause freeze enemies, bullets, warnings and clock',()=>{
  for(const state of ['upgrade','paused']){const g=game(),e=enemy(g,'slime',{x:100,y:100});g.enemyProjectiles=[{pos:{x:100,y:100},dir:{x:1,y:0},life:4,radius:7}];g.spawnWarnings=[{type:'slime',pos:{x:200,y:200},left:.8}];g.state=state;const before={time:g.remaining,x:e.pos.x,life:g.enemyProjectiles[0].life,w:g.spawnWarnings[0].left};g.update(2,{x:1,attack:true});assert.deepEqual({time:g.remaining,x:e.pos.x,life:g.enemyProjectiles[0].life,w:g.spawnWarnings[0].left},before);}
});
test('boss charge locks direction, hits a desk, and stuns for 1.5 seconds',()=>{
  const g=game();g.spawnBoss();const b=g.boss;b.pos={x:180,y:300};g.hero={...g.hero,x:180,y:100};b.state='chargeWarn';b.left=C.boss.chargeWarning;b.dir={x:0,y:-1};const dir={...b.dir};g.hero.x=400;step(g,.5);assert.deepEqual(b.dir,dir);b.left=.001;g.update(.01);for(let i=0;i<300&&b.state!=='stunned';i++)g.update(.01);assert.equal(b.state,'stunned');assert.ok(b.left>1.4);
});
test('boss meeting shows a fixed circle; leaving or dashing/shielding avoids it',()=>{
  for(const defense of ['outside','dash','shield']){const g=game();g.spawnBoss();const b=g.boss;b.pos={x:240,y:320};g.hero={...g.hero,x:250,y:320};b.state='meetingWarn';b.left=.01;if(defense==='outside')g.hero.x=420;if(defense==='dash')g.hero.dashLeft=.1;if(defense==='shield')g.hero.shieldLeft=.1;g.update(.02);assert.equal(g.hitsTaken,0);assert.equal(b.state,'recover');}
  const g=game();g.spawnBoss();g.boss.pos={x:240,y:320};g.hero={...g.hero,x:250,y:320};g.boss.state='meetingWarn';g.boss.left=.01;g.update(.02);assert.equal(g.hitsTaken,1);
});
test('boss enrages below half health without removing readable warnings, attacks never overlap',()=>{
  const g=game();g.spawnBoss();const b=g.boss;b.hp=250;b.state='chase';b.left=.01;g.update(.02);assert.equal(b.enraged,true);assert.ok(['chargeWarn','meetingWarn'].includes(b.state));assert.ok(b.left>=1-.02);assert.equal(g.activeEnemies.filter(e=>e.type==='boss').length,1);
});
test('boss defeat opens gate, but only gate arrival succeeds',()=>{
  const g=game();g.spawnBoss();g.boss.state='stunned';g.damageEnemy(g.boss,500,{x:1,y:0});assert.equal(g.gateOpen,true);assert.equal(g.state,'playing');assert.equal(g.phase,'escape');assert.equal(g.outcome,null);g.hero={...g.hero,...center(C.gate)};g.update(.01);assert.equal(g.outcome,'success');
});
test('energy zero and timeout lose; boss defeat cannot override deadline',()=>{
  let g=game();g.hero.energy=1;g.damageHero(2,{x:0,y:0});assert.equal(g.reason,'energy');g=game();g.remaining=.001;g.update(.01);assert.equal(g.reason,'timeout');g=game();g.spawnBoss();g.boss.state='stunned';g.damageEnemy(g.boss,500,{x:1,y:0});g.hero={...g.hero,...center(C.gate)};g.remaining=.001;g.update(.01);assert.equal(g.outcome,'failure');
});
test('retry completely resets waves, upgrades, projectiles, shields and statistics',()=>{
  const g=game();g.upgrades=['wide','double'];g.hero.shields=0;g.enemyProjectiles.push({});g.kills=9;g.finish('energy');g.reset();assert.equal(g.state,'title');assert.equal(g.wave,0);assert.deepEqual(g.upgrades,[]);assert.deepEqual(g.enemyProjectiles,[]);assert.equal(g.hero.shields,2);assert.equal(g.kills,0);assert.equal(g.remaining,300);
});
