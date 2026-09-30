import test from 'node:test';
import assert from 'node:assert/strict';
import {SleepGame} from '../game.js';
import {drawMorningIntro} from '../morning-intro.js';
test('all four morning rooms open with a growing horde and frequent bounded reinforcements',()=>{
 for(let room=0;room<4;room++){
  const g=new SleepGame(()=>.5);g.begin();g.route='morning';g.morning=room;g.enterRoom();g.spawnCd=0;g.update(.01);
  assert.equal(g.warnings.length,52+room*8);assert.ok(g.warnings.every(w=>w.life>0));assert.equal(g.enemies.length,0);
  assert.equal(g.spawnCd,2.2-room*.15);g.warnings=[];g.spawnCd=0;g.update(.01);assert.equal(g.warnings.length,22+room*4);
  g.spawn(999);assert.equal(g.warnings.length,128);
 }
});
test('morning cinematic renders both pages with balanced Canvas state and a fixed draw budget',()=>{
 for(const kind of ['alarm','morning'])for(const t of [0,1,60]){
  let depth=0,calls=0;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({save(){depth++;},restore(){depth--;assert.ok(depth>=0);},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get(o,k){return k in o?o[k]:()=>{};}});
  const p={ctx};for(const k of ['rect','circle','line','text','person','dog'])p[k]=(...args)=>{calls++;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));};
  drawMorningIntro(p,kind,t);assert.equal(depth,0);assert.ok(calls<200);
 }
});
