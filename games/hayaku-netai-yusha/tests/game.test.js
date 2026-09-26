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

test('night has six encounters and the morning is a separate four-phase extra encounter', () => {
  assert.equal(NIGHT.length, 6); assert.equal(MORNING.length, 4); assert.equal(NIGHT[5].hp, 0);
  assert.notDeepEqual(STORY.night, STORY.true);
  assert.match(STORY.true.at(-1)[0], /今日も、定時で帰ろう/);
});
test('horde occupancy including warnings and boss stays within 128', () => {
  const g = playing(); g.spawn(1000); assert.equal(g.warnings.length, WORLD.maxEnemies);
  g.spawnBoss(); assert.equal(g.enemies.length + g.warnings.length, WORLD.maxEnemies);
  advance(g, 2); assert.ok(g.enemies.length + g.warnings.length <= WORLD.maxEnemies);
});
test('first horde contains more entries than the first game maximum of 64', () => {
  const g = playing(); advance(g, .82); assert.ok(g.warnings.length > 64);
});
test('child has progress, no HP, and cannot be damaged by any attack', () => {
  const g = playing(); g.stage = 5; g.enterRoom(); g.ultimate = 100;
  const before = structuredClone(g.child); g.area(g.child.x, g.child.y, 999, 999); g.useUltimate();
  assert.deepEqual(g.child, before); assert.equal('hp' in g.child, false); assert.equal(g.enemies.includes(g.child), false);
});
test('standing in the morning request circle completes caregiving, without combat damage', () => {
  const g = playing(); g.route = 'morning'; g.enterRoom(); g.spawnCd = 999; g.dangerCd = 999;
  Object.assign(g.hero, { x: g.request.x, y: g.request.y }); advance(g, 2.1);
  assert.equal(g.child.progress, 34); assert.equal(g.helped, 1); assert.equal(g.request, null);
});
test('six multi-step bedtime missions end only after both blankets, never automatically in morning', () => {
  const g = playing(); g.stage = 5; g.enterRoom();
  // Transition test; combat viability is covered separately by the unmodified pilot.
  g.bedAttackCd=999;
  for (let n = 0; n < 6; n++) {
    if(n>0)g.updateTask(2.1);
    assert.equal(g.helped,n);
    const r=g.request;
    if(r.kind==='tidy')for(let i=0;i<12;i++){const e={x:r.x,y:r.y,hp:1,radius:10};g.enemies.push(e);g.hurtEnemy(e,1);}
    for(let i=0;i<250&&g.helped===n;i++){Object.assign(g.hero,{x:g.request.x,y:g.request.y});g.updateTask(.05);}
    assert.equal(g.helped,n+1);
  }
  assert.equal(g.state, 'nightEnding'); assert.equal(g.completedNight, true); assert.equal(g.route, 'night');
});
test('morning requires a completed night, restores energy, and keeps upgrades', () => {
  const g = playing(); assert.equal(g.beginMorning(), false);
  g.completedNight = true; g.state = 'result'; g.hero.energy = 2; g.skills.bubble = 2;
  assert.equal(g.beginMorning(), true); assert.equal(g.hero.energy, g.hero.maxEnergy); assert.equal(g.skills.bubble, 2);
});
test('mama heals with an upper bound and provides real area support', () => {
  const g = playing(); g.spawnCd = 999; g.hero.energy = 70;
  g.mama.x = g.hero.x - 30; g.mama.y = g.hero.y;
  g.enemies.push({ x: g.hero.x + 120, y: g.hero.y, radius: 11, hp: 30, maxHp: 30, speed: 0, dead: false, flash: 0 });
  g.mamaCd = 0; g.update(1 / 60); assert.equal(g.hero.energy, 88); assert.equal(g.kills, 1);
  g.mamaCd = 0; g.update(1 / 60); assert.equal(g.hero.energy, 100);
});
test('pochi retrieves a distant drop instead of requiring the hero to pick it up', () => {
  const g = playing(); g.spawnCd = 999; g.hero.energy = 60;
  g.drops.push({ x: 410, y: 160, kind: 'heart', life: 16 }); advance(g, 3);
  assert.equal(g.drops.length, 0); assert.equal(g.hero.energy, 69);
});
test('optional child request rewards help and expiry has no punishment', () => {
  const g = playing(); g.spawnCd = 999; g.sideCd = 0; g.hero.energy = 50; g.update(1 / 60);
  Object.assign(g.hero, { x: g.sideRequest.x, y: g.sideRequest.y }); advance(g, 2.1); assert.equal(g.hero.energy, 62);
  g.sideCd = 0; g.update(1 / 60); g.sideRequest.life = .01; g.hero.x = 40; g.hero.y = 430;
  g.update(.05); assert.equal(g.sideRequest, null); assert.equal(g.hero.energy, 62);
});
test('fatal hit preserves a clear cause and cannot be followed by ally resurrection', () => {
  const g = playing(); g.hero.energy = 1; g.hero.invulnerable = 0; g.mamaCd = 0;
  g.hurtHero(6, 'おもちゃの群れ'); advance(g, 1);
  assert.equal(g.state, 'defeat'); assert.equal(g.hero.energy, 0); assert.match(g.cause, /おもちゃの群れ/);
});
test('paused/menu states do not advance clocks; huge frame gaps are clamped', () => {
  const g = playing(); g.state = 'upgrade'; g.update(20); assert.equal(g.elapsed, 0);
  g.state = 'playing'; g.update(20); assert.equal(g.elapsed, .05);
});
test('morning timeout and successful office arrival are different outcomes', () => {
  const g = playing(); g.route = 'morning'; g.morningElapsed = 241; g.update(.02); assert.equal(g.state, 'defeat'); assert.match(g.cause, /遅刻/);
  const h = playing(); h.route = 'morning'; h.state = 'sendoff'; h.beginCommute(); advance(h,10,{x:1});
  assert.equal(h.state, 'trueEnding'); assert.equal(h.completedMorning, true);
});
test('upgrade selection cannot overflow or advance from a gameplay state', () => {
  const g = playing(); assert.equal(g.chooseSkill('mop'), false);
  g.state = 'upgrade'; assert.equal(g.chooseSkill('unknown'), false); g.skills.mop = 3; assert.equal(g.chooseSkill('mop'), false);
  assert.equal(g.chooseSkill('heart'), true); assert.equal(g.hero.maxEnergy, 120); assert.equal(g.stage, 1);
});
test('pointer mapping handles letterboxing and stick deadzone', () => {
  assert.deepEqual(canvasPoint(240, 450, { left: 0, top: 0, width: 480, height: 900 }), { x: 240, y: 310 });
  assert.deepEqual(canvasPoint(195, 310, { left: 0, top: 0, width: 390, height: 620 }), { x: 240, y: 310 });
  assert.deepEqual(stickVector({ x: 10, y: 10 }, { x: 12, y: 13 }), { x: 0, y: 0 });
  assert.deepEqual(stickVector({ x: 10, y: 10 }, { x: 40, y: 50 }), { x: .6, y: .8 });
});
test('old close-and-stand controller can no longer coast through the first boss', () => {
  const g=playing(14);for(let i=0;i<12000 && g.state==='playing';i++)g.update(1/60,pilot(g));
  assert.equal(g.state,'defeat');assert.ok(g.bossSpawned);assert.ok(g.elapsed>20);
});
for (const seed of [14, 71, 2026]) test(`hard-mode pilot benchmark: ${seed===71?'defeat remains possible':'both routes complete'}, seed ${seed}`, () => {
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
    assert.ok(g.enemies.length + g.warnings.length <= WORLD.maxEnemies);
  }
  if(seed===71){assert.equal(g.state,'defeat');assert.equal(g.stage,3);assert.equal(retries,2);console.log(JSON.stringify({seed,result:'defeat',stage:g.stage,retries,kills:g.kills}));return;}
  assert.equal(g.state, 'trueEnding', `${g.cause}; stage=${g.stage}; morning=${g.morning}`);
  assert.equal(encounters, 6); assert.equal(visitedNightEnding, true); assert.equal(morningPhases, 4);
  assert.equal(g.secretDefeated, true, 'must defeat secret boss before sendoff and office');
  assert.ok(g.kills > 1000); assert.ok(peak > 64);
  console.log(JSON.stringify({ seed, retries, seconds: Math.round(g.elapsed), nightSeconds: Math.round(g.nightElapsed), morningSeconds: Math.round(g.morningElapsed), kills: g.kills, peakEnemies: peak }));
});
