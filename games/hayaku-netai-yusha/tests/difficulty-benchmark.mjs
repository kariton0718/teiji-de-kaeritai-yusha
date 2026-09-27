import test from 'node:test';
import assert from 'node:assert/strict';
import { SleepGame, distance } from '../game.js';
import { WORLD, NIGHT, MORNING, STORY } from '../config.js';
import { canvasPoint, stickVector } from '../input.js';
import { carefulPilot } from './careful-pilot.js';

function random(seed = 14) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function playing(seed = 14) { const g = new SleepGame(random(seed)); g.begin(); g.enterRoom(); return g; }
function advance(g, seconds, input = {}) { for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, input); }
function pilot(g) {
  let target = g.request || (g.boss && !g.boss.dead ? g.boss : g.enemies.filter(e => !e.dead).sort((a, b) => distance(a, g.hero) - distance(b, g.hero))[0]) || { x: 240, y: 320 };
  if (g.state === 'commute') target = { x: 240, y: 90 };
  let x = target.x - g.hero.x, y = target.y - g.hero.y, d = Math.hypot(x, y);
  if (!g.request && g.state !== 'commute' && d < 75) { x = 0; y = 0; }
  for (const a of g.hazards) if (distance(a, g.hero) < a.r + 28) { x = g.hero.x - a.x || 1; y = g.hero.y - a.y || 1; break; }
  if (g.request && d < 15 && !g.hazards.length) { x = 0; y = 0; }
  return { x, y, ultimate: g.ultimate >= 100 && g.enemies.length > 20 };
}

for (const seed of [14, 71, 2026]) test(`difficulty diagnostic seed ${seed}`, () => {
  const g = playing(seed); let frames = 0, peak = 0, encounters = 0, visitedNightEnding = false, morningPhases = 1, retries=0;
  while (frames++ < 60000) {
    if (g.state === 'upgrade') { encounters++; g.chooseSkill(['bubble', 'mop', 'vacuum', 'mop', 'clip'][g.stage]); g.enterRoom(); }
    if (g.state === 'nightEnding') { visitedNightEnding = true; encounters++; g.beginMorning(); g.enterRoom(); }
    if (g.state === 'morningRoomIntro') { morningPhases++; g.enterRoom(); }
    if (g.state === 'sendoff') g.beginCommute();
    if(g.state==='defeat' && retries<2){
      retries++;g.hero.energy=g.hero.maxEnergy;g.ultimate=Math.max(50,g.ultimate);
      if(g.route==='morning'){g.morningElapsed=0;g.morning=0;g.secretActive=false;morningPhases=1;}
      else g.nightElapsed=Math.min(g.nightElapsed,g.stage*60);
      g.enterRoom();
    }
    if (g.state === 'trueEnding' || g.state === 'defeat') break;
    g.update(1 / 60, carefulPilot(g)); peak = Math.max(peak, g.enemies.length);
    assert.ok(g.enemies.length + g.warnings.length <= g.enemyLimit);
  }
  assert.ok(['defeat','trueEnding'].includes(g.state),'simulation must terminate without getting stuck');
  console.log(JSON.stringify({ seed, result:g.state, stage:g.stage, morning:g.morning, retries, seconds: Math.round(g.elapsed), nightSeconds: Math.round(g.nightElapsed), morningSeconds: Math.round(g.morningElapsed), kills: g.kills, peakEnemies: peak }));
});
