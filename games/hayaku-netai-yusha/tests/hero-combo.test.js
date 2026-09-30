import test from 'node:test';
import assert from 'node:assert/strict';
import {SleepGame} from '../game.js';
const game=()=>{const g=new SleepGame(()=>.5);g.begin();g.enterRoom();g.spawnCd=999;g.bubbleCd=999;return g;};
const mob=(g,x,y)=>{const e={x,y,hp:500,maxHp:500,radius:10,speed:0,attackCd:999,flash:0};g.enemies.push(e);return e;};
test('starter attacks nearby foes and third swing clears nearby enemies behind the hero',()=>{
 const g=game(),front=mob(g,240,355),back=mob(g,240,520);
 g.update(.01);assert.equal(front.hp,465);assert.equal(back.hp,500);assert.equal(g.attackCd,.31);
 // Use fixed targets to isolate the three-hit pattern from movement and knockback.
 front.y=355;g.attackCd=0;g.update(.01);assert.equal(g.mopCombo,2);
 front.y=355;g.attackCd=0;g.update(.01);assert.equal(g.mopCombo,3);assert.equal(back.hp,449);
 assert.equal(g.attackCd,.40);assert.ok(g.effects.some(e=>e.kind==='mopFinish'));
});
test('idle frames do not spend combo steps; retry resets the pattern',()=>{
 const g=game();for(let i=0;i<60;i++)g.update(.05);assert.equal(g.mopCombo,0);
 mob(g,240,355);g.attackCd=0;g.update(.01);assert.equal(g.mopCombo,1);
 g.enterRoom();assert.equal(g.mopCombo,0);
});
test('starter bubble has six links within its shorter starting reach, and a shorter cooldown',()=>{
 const g=game();g.hero.y=470;
 for(let i=0;i<7;i++)mob(g,160+i*32,350);
 g.bubbleCd=0;g.updateSkills(.01);
 assert.equal(g.effects.filter(e=>e.kind==='bubble').length,6);
 assert.ok(g.enemies.every(e=>e.hp<500));assert.ok(Math.abs(g.bubbleCd-2.1)<1e-9);
});
test('finisher keeps the normal-kill gauge cap and never targets family members',()=>{
 const g=game();g.ultimate=0;g.mopCombo=2;g.child.progress=12;
 for(let i=0;i<100;i++){const e=mob(g,240,355);e.hp=1;}
 g.update(.01);assert.equal(g.kills,100);assert.ok(g.ultimate<=3.001);assert.equal(g.child.progress,12);
});

test('stage bonuses progressively expand mop reach, persist on retry and reset for a new game',()=>{
 const g=game();
 for(const [level,range] of [[1,80],[2,108],[3,136]]){
  if(level>1){g.state='upgrade';assert.equal(g.chooseSkill('mop'),true);g.enterRoom();}
  g.spawnCd=999;g.bubbleCd=999;g.enemies=[];
  const outside=mob(g,240,430-range-11);g.update(.01);assert.equal(outside.hp,500);assert.equal(g.mopCombo,0);
  const inside=mob(g,240,430-range+1);g.attackCd=0;g.update(.01);assert.ok(inside.hp<500);assert.equal(outside.hp,500);
  assert.equal(g.effects.find(e=>e.kind==='mopSlash').radius,range);
  g.enterRoom();assert.equal(g.skills.mop,level);
 }
 g.begin();assert.equal(g.skills.mop,1);
});
test('bubble range expands only when bubble is chosen as a stage bonus',()=>{
 const g=game();g.state='upgrade';g.chooseSkill('heart');g.enterRoom();assert.equal(g.skills.bubble,1);
 for(const [level,reach] of [[1,155],[2,195],[3,235]]){
  if(level>1){g.state='upgrade';assert.equal(g.chooseSkill('bubble'),true);g.enterRoom();}
  g.enemies=[];g.effects=[];const outside=mob(g,240,430-reach-1);g.bubbleCd=0;g.updateSkills(.01);assert.equal(outside.hp,500);
  g.enemies=[];const inside=mob(g,240,430-reach+1);g.bubbleCd=0;g.updateSkills(.01);assert.ok(inside.hp<500);
  assert.equal(g.effects.find(e=>e.kind==='bubble').radius,31+(level-1)*8);
 }
});
