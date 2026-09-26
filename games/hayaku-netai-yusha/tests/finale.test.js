import test from 'node:test';
import assert from 'node:assert/strict';
import {SleepGame} from '../game.js';
import {MOBS,MOB_ROLES,BOSS_MOVES,SECRET_MIX,HOSTILE_DAMAGE_SCALE} from '../combat-data.js';
import {updateEnemies,extraSkills,bossAttack} from '../combat.js';
import {updateUltimate} from '../ultimates.js';
const game=()=>{const g=new SleepGame(()=>.41);g.begin();g.enterRoom();g.spawnCd=999;return g;};
const enemy=(g,prop='block',x=240,y=330)=>{const s=MOBS[prop],e={...s,prop,x,y,maxHp:s.hp,dead:false,flash:0,attackCd:0,age:0};g.enemies.push(e);return e;};
test('ultimate kills, concurrent normal kills and delayed ultimate drops never refund the gauge',()=>{
  const g=game();g.ultimate=100;for(let i=0;i<100;i++)enemy(g);g.useUltimate();assert.equal(g.kills,100);assert.equal(g.ultimate,0);
  g.hurtEnemy(enemy(g),999);g.gainUltimate(20);g.collect({kind:'milk',life:1,x:0,y:0});assert.equal(g.ultimate,0);
  for(let i=0;i<80;i++)updateUltimate(g,.05);assert.equal(g.ultimateLock,0);
  g.collect({kind:'milk',life:1,x:0,y:0,source:'ultimate'});g.hurtEnemy(enemy(g),999,0,'ultimate');assert.equal(g.ultimate,0);
  g.hurtEnemy(enemy(g),999);assert.equal(g.ultimate,.45);
});
test('every ultimate has a real distinct effect and remains locked through its duration plus three seconds',()=>{
  for(const id of ['close','cyclone','comet','family']){
    const g=game();g.state='roomIntro';assert.ok(g.selectUltimate(id));g.enterRoom();g.spawnCd=999;
    const e=enemy(g,'towel',240,350);g.hero.energy=40;g.ultimate=100;
    assert.equal(g.useUltimate(),true);assert.equal(g.useUltimate(),false);assert.equal(g.selectUltimate('close'),false);
    for(let i=0;i<125;i++){updateUltimate(g,.05);extraSkills(g,.05);if(!g.ultimateLock)break;g.gainUltimate(5);assert.equal(g.ultimate,0);}
    assert.ok(e.hp<e.maxHp,id);if(id==='family')assert.equal(g.hero.energy,60);
    while(g.ultimateLock>0){updateUltimate(g,.05);extraSkills(g,.05);}
    g.gainUltimate(4);assert.equal(g.ultimate,4);
  }
});
test('normal combat charging is rate limited rather than proportional to instant horde size',()=>{
  const g=game();g.ultimate=0;for(let i=0;i<100;i++)g.hurtEnemy(enemy(g),999);assert.ok(g.ultimate<=3.00001);
  updateUltimate(g,.5);for(let i=0;i<10;i++)g.hurtEnemy(enemy(g),999);assert.ok(g.ultimate<=4.50001);
});
test('bedtime opens with a horde and later phases have denser reinforcements',()=>{
  const g=game();g.stage=5;g.enterRoom();g.update(.05);g.spawnCd=0;g.update(.05);assert.ok(g.enemies.length+g.warnings.length>=70);
  g.enemies=[];g.warnings=[];g.firstWave=false;g.helped=4;g.spawnCd=0;g.update(.05);assert.equal(g.warnings.length,30);assert.equal(g.spawnCd,1.5);
});
test('retrieval does not finish a delivery, standing still cannot clear tidying, and song progress reacts to damage',()=>{
  const g=game();g.stage=5;g.enterRoom();g.bedAttackCd=999;
  Object.assign(g.hero,{x:g.request.x,y:g.request.y});g.updateTask(1.4);assert.equal(g.request.step,1);assert.equal(g.helped,0);g.updateTask(5);assert.equal(g.helped,0);
  g.helped=1;g.nextRequest();Object.assign(g.hero,{x:g.request.x,y:g.request.y});g.updateTask(20);assert.equal(g.helped,1);assert.equal(g.request.fill,0);
  g.helped=4;g.nextRequest();g.request.fill=3;g.hero.invulnerable=0;g.hurtHero(1,'test');assert.equal(g.request.fill,2.4);
});
test('both children cast different telegraphed attacks and escalation never harms children',()=>{
  const g=game();g.stage=5;g.enterRoom();g.warnings=[];
  const signatures=[];
  for(let i=0;i<6;i++){g.hazards=[];g.warnings=[];g.bedAttackCd=0;g.updateTask(.01);signatures.push([g.bedSpeaker,g.hazards.map(h=>h.kind||h.shape||'circle').join(','),g.warnings.map(w=>w.prop).join(',')]);}
  assert.equal(new Set(signatures.map(s=>JSON.stringify(s))).size,6);assert.ok(signatures.some(s=>s[0]===0));assert.ok(signatures.some(s=>s[0]===1));
  assert.ok(g.hazards.every(h=>h.life>.5));g.area(240,145,999,999);assert.equal(g.child.progress,0);assert.ok(g.bedKids.every(k=>!('hp' in k)));
});
test('pillow jumps to locked landing site, shooters have different counts and profiles, tank is huge and slow',()=>{
  const g=game(),e=enemy(g,'pillow',100,150);updateEnemies(g,.05);const h=g.hazards.find(h=>h.kind==='leap');assert.ok(h);const target={x:h.x,y:h.y};g.hero.x=430;
  updateEnemies(g,1.2);assert.equal(e.x,target.x);assert.equal(e.y,target.y);assert.ok(e.recover>0);
  for(const [prop,count] of [['bubble',5],['duck',7],['brush',1],['robot',3],['plate',1]]){const s=game();enemy(s,prop);updateEnemies(s,.01);assert.equal(s.hazards[0].count,count);}
  assert.ok(MOBS.towel.radius>MOBS.dust.radius*3);assert.ok(MOBS.dust.speed>MOBS.towel.speed*9);assert.ok(MOBS.towel.hp>MOBS.dust.hp*15);
  for(const m of Object.values(MOBS))assert.ok(MOB_ROLES[m.behavior]);
});
test('secret boss cycles eight attacks, accelerates and summons a large mixed horde within the cap',()=>{
  const g=game();g.route='morning';g.morning=3;g.startSecretBoss();g.spawnCd=0;g.update(.01);assert.ok(g.warnings.length>=64);assert.ok(g.warnings.every(w=>SECRET_MIX.includes(w.prop)));
  const seen=[];for(let i=0;i<8;i++){bossAttack(g,g.boss);seen.push(g.boss.move);}assert.deepEqual(seen,BOSS_MOVES[6]);assert.equal(g.boss.attackCd,2.2);
  g.boss.hp=g.boss.maxHp*.2;bossAttack(g,g.boss);assert.equal(g.boss.attackCd,1.3);assert.ok(g.enemies.length+g.warnings.length<=128);
});
test('all hostile damage passes the shared increase, including child and boss hazards',()=>{
  for(const base of [8,10,12,14,16,18,20]){const g=game();g.hero.invulnerable=0;g.hurtHero(base,'hostile');assert.equal(100-g.hero.energy,Math.ceil(base*HOSTILE_DAMAGE_SCALE));}
});
test('commute requires movement, crosses three districts and plays arrival before true ending; cleared boss cannot time out',()=>{
  const g=game();g.route='morning';g.secretDefeated=true;g.morningElapsed=239;g.state='sendoff';g.beginCommute();
  for(let i=0;i<100;i++)g.update(.05);assert.equal(g.commuteRun.distance,0);assert.equal(g.state,'commute');
  const seen=new Set();for(let i=0;i<180&&g.commuteRun.arrival===0;i++){g.update(.05,{x:1});seen.add(g.commuteRun.phase);}
  assert.deepEqual([...seen],[0,1,2]);assert.equal(g.state,'commute');assert.ok(g.commuteRun.arrival>0);assert.equal(g.completedMorning,false);
  for(let i=0;i<50;i++)g.update(.05);assert.equal(g.state,'trueEnding');assert.equal(g.completedMorning,true);
});
