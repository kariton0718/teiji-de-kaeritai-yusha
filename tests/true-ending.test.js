import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {OPENING,ENDING,TRUE_ENDING,getStorySlides} from '../src/story.js';
import {Game} from '../src/game.js';
test('only a defeated secret boss selects the complete true ending; replay and reset remain distinct',()=>{
 const g=new Game();assert.equal(getStorySlides('ending',g.secretBossDefeated),ENDING);g.secretBossTriggered=true;assert.equal(getStorySlides('ending',g.secretBossDefeated),ENDING);g.secretBossDefeated=true;g.finish('success');assert.equal(getStorySlides('ending',g.secretBossDefeated),TRUE_ENDING);g.completeEnding();assert.equal(getStorySlides('ending',g.secretBossDefeated),TRUE_ENDING);assert.equal(getStorySlides('opening',true),OPENING);g.reset();assert.equal(getStorySlides('ending',g.secretBossDefeated),ENDING);
});
test('true ending has four unique illustrated scenes and square atlas layout',()=>{assert.equal(TRUE_ENDING.length,4);assert.equal(new Set(TRUE_ENDING.map(s=>s.heading)).size,4);for(let i=0;i<4;i++){const slide=TRUE_ENDING[i];assert.ok(slide.text.length>20);assert.equal(slide.className,`square-sheet q${i+1} true-ending-scene`);assert.ok(existsSync(slide.image));assert.notEqual(slide.image,ENDING[i].image);}const css=readFileSync('styles.css','utf8');assert.match(css,/square-sheet img\{width:200%;height:200%/);});
