import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {Game} from '../src/game.js';
import {CONFIG as C} from '../src/config.js';
import {ALLY_PROFILES} from '../src/bestiary.js';
const fresh=()=>{const g=new Game(()=>.99);g.state='playing';g.phase='wave';g.hero.x=200;g.hero.y=300;g.nav.clearLine=()=>true;return g;};
test('helpers roll once per floor after eight ordinary kills, never from boss summons',()=>{
 const g=fresh();g.random=()=>0;const summon={type:'slime',bossSummon:true};for(let i=0;i<20;i++)g.maybeSpawnAlly(summon);assert.equal(g.allies.length,0);
 for(let i=0;i<7;i++)g.maybeSpawnAlly({type:'slime'});assert.equal(g.allies.length,0);g.maybeSpawnAlly({type:'slime'});assert.equal(g.allies[0].kind,'healer');g.allies=[];for(let i=0;i<40;i++)g.maybeSpawnAlly({type:'slime'});assert.equal(g.allies.length,0);
 g.stage=2;g.random=()=>.99;for(let i=0;i<8;i++)g.maybeSpawnAlly({type:'slime'});g.random=()=>0;g.maybeSpawnAlly({type:'slime'});assert.equal(g.allies.length,0);
 g.stage=3;g.random=()=>.2;for(let i=0;i<8;i++)g.maybeSpawnAlly({type:'slime'});assert.equal(g.allies.length,1);
});
test('healer restores at most 36, clamps energy, freezes in menus and expires',()=>{
 const g=fresh();g.spawnAlly('healer');g.allies[0].pos={x:220,y:300};g.hero.energy=20;for(let i=0;i<61;i++)g.updateAllies(.1);assert.equal(g.hero.energy,56);assert.equal(g.telemetry.healed,36);
 const left=g.allies[0].left;g.state='upgrade';g.updateAllies(.1);assert.equal(g.allies[0].left,left);g.state='playing';for(let i=0;i<20;i++)g.updateAllies(.1);assert.equal(g.allies.length,0);
 g.spawnAlly('healer');g.allies[0].pos={x:220,y:300};g.hero.energy=98;g.updateAllies(.1);assert.equal(g.hero.energy,C.hero.energy);
 g.finish('energy');assert.equal(g.allies.length,0);g.reset();assert.equal(g.allyRolledStages.size,0);
});
test('striker fires bounded piercing volleys only at visible targets and ends on transition',()=>{
 const g=fresh();g.spawnAlly('striker');assert.equal(g.spawnAlly('healer'),false);g.allies[0].pos={x:200,y:300};const e=g.createEnemy('slime',{x:240,y:300});e.pos={x:240,y:300};g.nav.clearLine=()=>false;g.updateAllies(.01);assert.equal(g.heroProjectiles.length,0);g.nav.clearLine=()=>true;g.updateAllies(.01);assert.equal(g.heroProjectiles.length,3);assert.ok(g.heroProjectiles.every(p=>p.noUltimateGain&&p.pierce===3));g.isBlocked=()=>false;for(let i=0;i<10;i++)g.updateProjectiles(.01);assert.ok(e.hp<e.maxHp);assert.equal(g.ultimate,0);
 g.allies[0].cooldown=0;g.heroProjectiles=Array(C.reply.max).fill({});g.updateAllies(.1);assert.equal(g.heroProjectiles.length,C.reply.max);g.clearCombat();assert.equal(g.allies.length,0);
});
test('ally chain explosions do not charge ultimates; subsequent hero kills still do',()=>{
 const g=fresh();g.phase='test';const bomb=g.createEnemy('bomb',{x:200,y:300}),slime=g.createEnemy('slime',{x:205,y:300});bomb.pos={x:200,y:300};slime.pos={x:205,y:300};g.damageEnemyFromAlly(bomb,100,{x:1,y:0});assert.ok(bomb.dead&&slime.dead);assert.equal(g.ultimate,0);assert.equal(g.suppressUltimateGain,false);g.killEnemy(g.createEnemy('slime',{x:300,y:300}));assert.ok(g.ultimate>0);
});
test('public ally portraits exist and cover all six stages without secret characters',()=>{assert.equal(ALLY_PROFILES.length,2);for(const p of ALLY_PROFILES){assert.ok(existsSync(p.image));assert.deepEqual(p.stages,[1,2,3,4,5,6]);assert.ok(!p.id.includes('auditor'));}});
