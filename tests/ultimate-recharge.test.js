import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {CONFIG as C,ULTIMATE_IDS} from '../src/config.js';
const fresh=(id='exit')=>{const g=new Game(()=>.5);g.showInstructions();g.startRun();g.selectUltimate(id);g.enterStage();g.clearCombat();g.phase='test';g.hero.x=200;g.hero.y=300;return g;};
test('screen-clear ultimate cannot recharge itself, including chained bomb kills',()=>{
 const g=fresh();for(let i=0;i<20;i++)g.createEnemy(i===0?'bomb':'slime',{x:210+i,y:300});g.ultimate=100;assert.equal(g.useUltimate(),true);assert.ok(g.kills>=20);assert.equal(g.ultimate,0);assert.equal(g.useUltimate(),false);assert.equal(g.telemetry.ultimateUses,1);
});
test('all ultimates block gain during effect and recovery, then allow ordinary kills',()=>{
 for(const id of ULTIMATE_IDS){const g=fresh(id);g.ultimate=100;g.useUltimate();g.killEnemy(g.createEnemy('slime',{x:400,y:400}));assert.equal(g.ultimate,0,id);g.ultimateEffectLeft=0;g.ultimateRechargeLeft=.1;g.killEnemy(g.createEnemy('slime',{x:400,y:400}));assert.equal(g.ultimate,0,id);g.update(.1);g.update(.1);g.killEnemy(g.createEnemy('slime',{x:400,y:400}));assert.ok(g.ultimate>0,id);g.reset();assert.equal(g.ultimateRechargeLeft,0);}
});
test('summons award less gauge, and recharge delay decreases during gameplay',()=>{
 const g=fresh(),normal=g.createEnemy('slime',{x:100,y:300});g.killEnemy(normal);const normalGain=g.ultimate;g.ultimate=0;const summon=g.createEnemy('slime',{x:100,y:300});summon.bossSummon=true;g.killEnemy(summon);assert.ok(Math.abs(g.ultimate-normalGain*C.ultimate.summonGainMultiplier)<1e-9);g.ultimate=100;g.useUltimate();const remaining=g.ultimateRechargeLeft;g.update(.1);assert.ok(g.ultimateRechargeLeft<remaining);
});
