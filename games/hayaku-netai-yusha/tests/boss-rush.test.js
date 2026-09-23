import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SleepGame} from '../game.js';
import {STORY} from '../config.js';
import {bossAttack,updateEnemies,updateProjectiles,shot} from '../combat.js';
const game=stage=>{const g=new SleepGame(()=>.41);g.begin();g.stage=stage;g.enterRoom();g.spawnBoss();g.boss.attackCd=999;return g;};
test('all eight ending scenes have individually stored WebP artwork',()=>{
  const ids=['night','sendoff','true'].flatMap(k=>STORY[k].map(s=>s[3]));assert.equal(new Set(ids).size,8);
  for(const id of ids)assert.equal(readFileSync(new URL('../assets/story/'+id+'.webp',import.meta.url)).toString('ascii',8,12),'WEBP');
});
test('pan boomerangs reverse once and hot zones wait for the warning, then expire',()=>{
  const g=game(1);g.boss.turn=3;bossAttack(g,g.boss);updateEnemies(g,.91);assert.equal(g.projectiles.length,3);
  const p=g.projectiles[1];g.hero.x=450;g.hero.y=580;for(let i=0;i<23;i++)updateProjectiles(g,.05);assert.equal(p.returned,true);const vx=p.vx,vy=p.vy;updateProjectiles(g,.05);assert.equal(p.vx,vx);assert.equal(p.vy,vy);
  g.boss.turn=4;bossAttack(g,g.boss);updateEnemies(g,.5);assert.equal(g.zones.length,0);updateEnemies(g,.61);assert.equal(g.zones.length,1);
  g.boss.attackCd=999;for(let i=0;i<100;i++)updateEnemies(g,.05);assert.equal(g.zones.length,0);
});
test('gap rings leave the advertised safe angle free of bullets',()=>{
  const g=game(2);g.boss.turn=3;bossAttack(g,g.boss);const h={...g.hazards.find(h=>h.kind==='gapRing')};updateEnemies(g,1.06);assert.ok(g.projectiles.length>=10);
  for(const p of g.projectiles){const a=Math.atan2(p.vy,p.vx),delta=Math.atan2(Math.sin(a-h.angle),Math.cos(a-h.angle));assert.ok(Math.abs(delta)>=.52);}
});
test('shower curtain leaves one lane safe before switching and chained dash re-telegraphs',()=>{
  const g=game(3);g.boss.turn=4;bossAttack(g,g.boss);assert.equal(g.hazards.filter(h=>h.life===1.15).length,4);assert.equal(g.hazards.filter(h=>h.life===2.4).length,1);
  const b=game(4);b.boss.turn=4;bossAttack(b,b.boss);b.boss.attackCd=999;updateEnemies(b,1.66);assert.equal(b.boss.windup,.85);assert.ok(b.hazards.some(h=>h.visualOnly&&h.life===.85));
});
test('last phase speeds attacks again; ultimate clears zones and enemy bullets reserve room for friendly attacks',()=>{
  const g=game(0);bossAttack(g,g.boss);const first=g.boss.attackCd;g.boss.hp=g.boss.maxHp*.5;bossAttack(g,g.boss);const second=g.boss.attackCd;g.boss.hp=g.boss.maxHp*.2;bossAttack(g,g.boss);assert.ok(first>second&&second>g.boss.attackCd);
  g.zones=[{x:0,y:0,r:40,life:3}];g.ultimate=100;g.useUltimate();assert.equal(g.zones.length,0);
  for(let i=0;i<180;i++)shot(g,g.hero,0);assert.equal(g.projectiles.length,112);shot(g,g.hero,0,{friendly:true});assert.equal(g.projectiles.length,113);
});
