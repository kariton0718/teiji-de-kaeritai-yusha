import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SleepGame,distance} from '../game.js';
import {MOBS,NIGHT_MIX,MORNING_MIX,BOSS_MOVES} from '../combat-data.js';
import {STORY} from '../config.js';
import {bossAttack,updateEnemies,updateProjectiles,extraSkills,shot,segmentDistance} from '../combat.js';
const game=()=>{const g=new SleepGame(()=>.41);g.begin();g.enterRoom();g.spawnCd=999;return g;};
const enemy=(g,prop,x=240,y=200)=>{const s=MOBS[prop],e={...s,prop,x,y,maxHp:s.hp,dead:false,flash:0,attackCd:0,age:0};g.enemies.push(e);return e;};
test('all 15 distinct mobs are reachable in mixed stage rosters',()=>{
  assert.equal(Object.keys(MOBS).length,15);
  assert.equal(new Set([...NIGHT_MIX,...MORNING_MIX].flat()).size,15);
  for(const mix of [...NIGHT_MIX,...MORNING_MIX]){assert.ok(new Set(mix).size>=4);for(const id of mix)assert.ok(MOBS[id]);}
  assert.ok(MOBS.dust.speed>MOBS.towel.speed*4);assert.ok(MOBS.towel.hp>MOBS.dust.hp*10);assert.ok(MOBS.towel.radius>MOBS.dust.radius*2);
});
test('ranged enemies telegraph then fire; defeating shooter cancels pending shot',()=>{
  const g=game(),e=enemy(g,'brush');updateEnemies(g,.05);
  assert.equal(g.projectiles.length,0);assert.equal(g.hazards[0].shape,'aim');
  const saved={...g.hazards[0]};updateEnemies(g,1.2);assert.ok(g.projectiles.length>0);
  g.projectiles=[];g.hazards=[saved];e.dead=true;updateEnemies(g,2);assert.equal(g.projectiles.length,0);
});
test('charging mob locks aim before its dash and does not home in',()=>{
  const g=game(),e=enemy(g,'train');updateEnemies(g,.05);const aim={...e.aim};assert.ok(e.windup>0);
  g.hero.x=400;for(let i=0;i<24;i++)updateEnemies(g,.05);assert.deepEqual(e.aim,aim);assert.ok(e.dash>0);assert.ok(Math.abs(e.dashAngle-Math.PI/2)<.1);
});
test('clock support accelerates neighbors and stops on defeat',()=>{
  const g=game(),clock=enemy(g,'alarm',200,200),mob=enemy(g,'block',230,200);
  updateEnemies(g,.02);assert.equal(mob.boosted,true);clock.dead=true;updateEnemies(g,.02);assert.equal(mob.boosted,false);
});
test('fast projectiles use swept collision; piercing attacks hit each enemy once',()=>{
  const g=game(),e=enemy(g,'towel',150,300);shot(g,{x:100,y:300},0,{friendly:true,speed:1000,damage:20,pierce:true});
  updateProjectiles(g,.1);assert.equal(e.hp,e.maxHp-20);g.projectiles[0].vx=-1000;updateProjectiles(g,.1);assert.equal(e.hp,e.maxHp-20);
  assert.equal(segmentDistance({x:50,y:0},{x:0,y:0},{x:100,y:0}),0);
});
test('mama follows, heals locally and clears hostile shots near her',()=>{
  const g=game();g.hero.x=400;g.hero.y=200;const before=distance(g.hero,g.mama);g.updateAllies(.05);assert.ok(distance(g.hero,g.mama)<before);
  g.mamaCd=0;g.hero.energy=50;g.updateAllies(.05);assert.equal(g.hero.energy,50);
  g.mama.x=g.hero.x-40;g.mama.y=g.hero.y;g.mamaSweepCd=0;
  shot(g,g.mama,0);shot(g,g.mama,0,{friendly:true});g.updateAllies(.05);
  assert.equal(g.hero.energy,68);assert.equal(g.projectiles.length,1);assert.equal(g.projectiles[0].friendly,true);
});
test('five clear items restore resources or give temporary non-stacking buffs',()=>{
  const g=game();g.hero.energy=40;g.ultimate=20;
  for(const kind of ['rice','milk','shoes','gloves','apron'])g.collect({kind,x:100,y:100,life:1});
  assert.equal(g.hero.energy,65);assert.equal(g.ultimate,32);assert.equal(g.buffs.shoes,8);
  const e=enemy(g,'towel');g.hurtEnemy(e,10);assert.equal(e.hp,e.maxHp-16);
  g.hero.invulnerable=0;g.hurtHero(10,'test');assert.equal(g.hero.energy,58);
  g.collect({kind:'shoes',x:0,y:0,life:1});assert.equal(g.buffs.shoes,8);
  for(let i=0;i<161;i++)g.update(.05);assert.equal(g.buffs.shoes,0);assert.equal(g.buffs.gloves,0);assert.equal(g.buffs.apron,0);
});
test('three new attacks actually damage targets and are offered',()=>{
  for(const id of ['iron','towel','meteor']){
    const g=game(),e=enemy(g,'towel',240,250);g.skills[id]=1;g.skillCds[id]=0;
    extraSkills(g,.01);
    if(id==='meteor')extraSkills(g,.7);
    if(id==='towel')for(let i=0;i<20;i++)updateProjectiles(g,.05);
    assert.ok(e.hp<e.maxHp,id);assert.ok(g.offers().some(s=>s.id===id));
  }
});
test('each combat boss cycles five named moves, then accelerates in phase two',()=>{
  for(const stage of [0,1,2,3,4,6]){
    const g=game();if(stage===6){g.route='morning';g.morning=3;g.secretActive=true;}else g.stage=stage;
    g.spawnBoss();const seen=[];
    for(let i=0;i<BOSS_MOVES[stage].length;i++){bossAttack(g,g.boss);seen.push(g.boss.move);}
    assert.deepEqual(seen,BOSS_MOVES[stage]);const normal=g.boss.attackCd;g.boss.hp=g.boss.maxHp*.4;bossAttack(g,g.boss);assert.ok(g.boss.attackCd<normal);
    assert.ok(g.enemies.length+g.warnings.length<=128);
  }
});
test('fourth morning task leads to secret boss, only its defeat enables sendoff',()=>{
  const g=game();g.route='morning';g.morning=3;g.enterRoom();g.child.progress=99;g.request.fill=1.99;
  g.hero.x=g.request.x;g.hero.y=g.request.y;g.updateTask(.02);
  assert.equal(g.state,'playing');assert.equal(g.secretActive,true);assert.equal(g.familyTask,false);assert.equal(g.boss.prop,'clock');assert.ok(Number.isFinite(g.progress));
  g.hurtEnemy(g.boss,9999);g.update(.02);assert.equal(g.state,'sendoff');assert.equal(g.secretDefeated,true);
  g.beginCommute();assert.equal(g.state,'commute');
});
test('opening has four individual full illustrations and deployment includes them',()=>{
  assert.equal(STORY.opening.length,4);
  for(const [,copy,,id] of STORY.opening){assert.ok(copy.length>20);const b=readFileSync(new URL('../assets/story/'+id+'.webp',import.meta.url));assert.equal(b.toString('ascii',8,12),'WEBP');}
  assert.match(readFileSync(new URL('../../../.github/workflows/pages.yml',import.meta.url),'utf8'),/assets\/story\/\*\.webp/);
});
