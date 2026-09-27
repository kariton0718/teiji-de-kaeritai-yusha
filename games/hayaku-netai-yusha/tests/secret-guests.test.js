import test from 'node:test';
import assert from 'node:assert/strict';
import {SleepGame} from '../game.js';
import {shot,bossAttack,updateEnemies} from '../combat.js';
const make=()=>{const g=new SleepGame(()=>.41);g.begin();g.enterRoom();g.spawnCd=999;return g;};
test('cinematic is damage-free, clock-free, automatic and cannot start the boss twice',()=>{
 const g=make();g.route='morning';g.morning=3;g.morningElapsed=210;g.hero.energy=50;g.startSecretBoss();
 for(let i=0;i<140;i++){g.update(.05,{ultimate:true,x:1});assert.equal(g.morningElapsed,210);assert.equal(g.hero.energy,50);assert.equal(g.enemies.length,0);}
 assert.equal(g.state,'secretIntro');for(let i=0;i<5;i++)g.update(.05);
 assert.equal(g.state,'playing');assert.equal(g.boss.maxHp,7200);assert.equal(g.enemies.filter(e=>e.boss).length,1);
 assert.equal(g.enterSecretBattle(),false);assert.equal(g.enemies.filter(e=>e.boss).length,1);
});
test('secret opening and late reinforcements are denser, bounded, and preserve friendly projectile slots',()=>{
 const g=make();g.route='morning';g.startSecretBoss();g.enterSecretBattle();g.spawnCd=0;g.update(.01);
 assert.equal(g.warnings.length,116);assert.equal(g.spawnCd,1.1);
 g.warnings=[];g.boss.hp=g.boss.maxHp*.2;bossAttack(g,g.boss);g.warnings=[];g.spawnCd=0;g.update(.01);
 assert.equal(g.warnings.length,68);assert.equal(g.spawnCd,.7);
 g.spawn(999);assert.equal(g.warnings.length+g.enemies.length,176);
 for(let i=0;i<220;i++)shot(g,g.hero,0);assert.equal(g.projectiles.length,144);
 for(let i=0;i<48;i++)shot(g,g.hero,0,{friendly:true});assert.equal(g.projectiles.length,192);
 g.enterRoom();assert.equal(g.enemyLimit,128);assert.equal(g.secretActive,false);
});
test('away guests cannot heal, collect, attack or fill the gauge; cameo expires and returns',()=>{
 const g=make();g.hero.energy=50;g.ultimate=0;g.drops=[{x:g.pochi.x,y:g.pochi.y,kind:'rice',life:16}];
 for(let i=0;i<100;i++)g.updateAllies(.05);
 assert.equal(g.hero.energy,50);assert.equal(g.drops[0].life,16);assert.equal(g.ultimate,0);assert.equal(g.effects.length,0);
 g.mama.cooldown=0;g.updateAllies(.05);assert.equal(g.mama.present,true);
 for(let i=0;i<161;i++)g.updateAllies(.05);
 assert.equal(g.mama.present,false);assert.ok(g.mama.cooldown>=26);assert.equal(g.hero.energy,68);
 g.drops=[];const hp=g.hero.energy;for(let i=0;i<100;i++)g.updateAllies(.05);assert.equal(g.hero.energy,hp);
 g.mama.cooldown=0;g.updateAllies(.05);assert.equal(g.mama.present,true);
 g.enterRoom();assert.equal(g.mama.present,false);assert.equal(g.pochi.present,false);
});
test('guests never auto-complete a child task, and healing remains capped at maximum',()=>{
 const g=make();g.stage=5;g.enterRoom();g.request={kind:'sing',hold:4,fill:3.65,x:240,y:200};g.pochi.cooldown=0;
 for(let i=0;i<25;i++)g.updateAllies(.05);assert.ok(g.request.fill<4);assert.equal(g.helped,0);
 g.hero.energy=99;g.mama.cooldown=0;for(let i=0;i<100;i++)g.updateAllies(.05);assert.equal(g.hero.energy,100);
});
test('secret damage is stronger but defensive buffs still apply and end state remains stable',()=>{
 const g=make();g.route='morning';g.startSecretBoss();g.enterSecretBattle();g.hero.invulnerable=0;g.hurtHero(20,'clock');assert.equal(g.hero.energy,64);
 g.hero.invulnerable=0;g.buffs.apron=8;g.hurtHero(20,'clock');assert.equal(g.hero.energy,46);
 g.hurtEnemy(g.boss,10000);g.update(.01);assert.equal(g.state,'sendoff');assert.equal(g.secretDefeated,true);
 g.beginCommute();g.morningElapsed=260;g.update(.05);assert.equal(g.state,'commute');
});
test('all boss phases retain visible warnings before damage; late phases add lane patterns',()=>{
 const g=make();g.route='morning';g.startSecretBoss();g.enterSecretBattle();g.boss.hp=1000;g.boss.turn=0;
 bossAttack(g,g.boss);assert.equal(g.boss.attackCd,.8);assert.ok(g.hazards.filter(h=>h.shape==='line').length===4);
 assert.ok(g.hazards.every(h=>h.life>=.8));g.hero.invulnerable=0;const hp=g.hero.energy;g.boss.attackCd=99;
 updateEnemies(g,.1);assert.equal(g.hero.energy,hp);
});
