import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
const fresh=()=>{const g=new Game(()=>.5);g.showInstructions();g.startRun();g.selectUltimate('exit');g.enterStage();g.clearCombat();g.stage=6;Object.assign(g.hero,{x:200,y:300,energy:100,invulnerable:0});return g;};
test('all projectile families apply increased damage once and respect invulnerability',()=>{
 for(const kind of ['mail','drone','heavy','boss','returnPaper']){const g=fresh();const p={kind,pos:{x:200,y:300},origin:{x:200,y:300},dir:{x:0,y:0},life:3,radius:9,damage:20,speed:132};g.enemyProjectiles.push({...p,pos:{...p.pos}},{...p,pos:{...p.pos}});g.updateProjectiles(0);assert.equal(g.hero.energy,67,kind);assert.equal(g.hitsTaken,1);}
});
test('laser, contact and rush reduction retain distinct damage levels',()=>{
 let g=fresh();g.fireBossLaser({pos:{x:100,y:300}},{x:1,y:0},20);assert.equal(g.hero.energy,72);
 g=fresh();g.damageHero(20,{x:190,y:300});assert.equal(g.hero.energy,76);
 g=fresh();g.ultimateChoice='rush';g.ultimateEffectLeft=2;g.damageHero(20,{x:190,y:300},'projectile');assert.equal(g.hero.energy,83.5);
});
