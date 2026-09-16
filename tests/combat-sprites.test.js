import test from 'node:test';
import assert from 'node:assert/strict';
// Exercise the image-loaded path without claiming this is a browser screenshot.
globalThis.Image=class {complete=true;naturalWidth=1792;naturalHeight=768;};
const {drawCombatSprite,SPRITE_IDS,BOSS_SPRITES}=await import('../src/sprites.js');
test('all 21 sprites select distinct cells wholly inside the atlas',()=>{const draws=[];const ctx={globalAlpha:1,save(){},restore(){},translate(){},scale(){},drawImage(...args){draws.push(args);}};for(const id of SPRITE_IDS)assert.equal(drawCombatSprite(ctx,id,100,100,64),true);assert.equal(SPRITE_IDS.length,21);assert.equal(BOSS_SPRITES.length,7);assert.equal(new Set(draws.map(a=>`${a[1]},${a[2]}`)).size,21);for(const [,x,y,w,h] of draws){assert.ok(x>=0&&y>=0&&x+w<=1792&&y+h<=768);}assert.equal(drawCombatSprite(ctx,'invalid',0,0,64),false);});
test('loaded sprite rendering covers hero, all mobs and every boss without invalid geometry',async()=>{
 const {Game}=await import('../src/game.js');const {render}=await import('../src/render.js');const {ENEMIES}=await import('../src/config.js');
 const g=new Game(()=>.4);g.state='playing';g.phase='test';const calls=[];const ctx=new Proxy({globalAlpha:1},{get:(o,key)=>key==='drawImage'?((...a)=>calls.push(a)):o[key]??((...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),String(key));}),set:(o,key,value)=>{o[key]=value;return true;}});
 for(const type of Object.keys(ENEMIES)){g.clearCombat();g.createEnemy(type,{x:200,y:300});render(ctx,g,1,false);}
 for(let i=0;i<7;i++){g.clearCombat();g.loadStage(Math.min(i+1,6));g.secretBossTriggered=i===6;g.state='bossIntro';const boss=g.spawnBoss();render(ctx,g,1,false);if(i===3||i===4){boss.bossPhase=2;boss.state='phaseShift';render(ctx,g,2,false);boss.state='attackWarn';render(ctx,g,3,false);}}
 assert.ok(calls.length>=40);
});
