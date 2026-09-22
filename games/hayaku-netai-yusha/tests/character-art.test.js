import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ART_IDS, MOB_TYPES, BOSS_TYPES, artURL, CharacterArt } from '../character-art.js';
import { NIGHT, MORNING } from '../config.js';
import { Painter } from '../render.js';

test('every encounter has individual artwork and all 18 WebP files exist', () => {
  assert.equal(new Set(ART_IDS).size, 18);
  for (const config of [...NIGHT, ...MORNING]) assert.ok(MOB_TYPES.includes(config.prop));
  for (const config of NIGHT.filter(c => c.hp > 0)) assert.ok(BOSS_TYPES.includes(config.prop));
  for (const id of ART_IDS) {
    const bytes = readFileSync(new URL(artURL(id)));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length > 1000);
  }
});
test('loader caches each asset once and handles image failures without rejection', async () => {
  let count = 0;
  const art = new CharacterArt(() => {
    count++;
    return { naturalWidth: 256, set src(value) {
      queueMicrotask(() => value.includes('mob-bag') ? this.onerror() : this.onload());
    }};
  });
  await art.ready;
  assert.equal(count, 18);
  assert.ok(art.get('hero'));
  assert.equal(art.get('mob-bag'), undefined);
  assert.ok(art.failed.has('mob-bag'));
});
test('stalled images settle and remain on safe fallback', async () => {
  const art = new CharacterArt(() => ({}), 5);
  await art.ready;
  assert.equal(art.failed.size, 18);
});
test('missing Image support does not prevent renderer setup', async () => {
  const art = new CharacterArt(() => { throw new Error('unavailable'); });
  await art.ready;
  assert.equal(art.failed.size, 18);
});
test('renderer uses separate enemy/boss and child sleeping sprites', () => {
  const ids = [], draws = [];
  const ctx = new Proxy({ drawImage: (...args) => draws.push(args) }, {
    get: (o, k) => k in o ? o[k] : () => {},
  });
  const art = { get: id => { ids.push(id); return { width: 256, height: 256 }; } };
  const p = new Painter({ getContext: () => ctx }, art);
  for (const prop of MOB_TYPES) p.enemy({ x: 100, y: 200, radius: 11, prop }, {});
  for (const prop of BOSS_TYPES) p.enemy({ x: 100, y: 200, radius: 38, prop, boss: true, hp: 10, maxHp: 10 }, {});
  p.person(100, 200, 'child', 1, true);
  p.person(100, 200, 'hero');
  p.person(100, 200, 'mama');
  p.person(100, 200, 'child');
  p.dog(100, 200);
  assert.equal(draws.length, 18);
  for (const id of ART_IDS) assert.ok(ids.includes(id), id);
});
test('renderer can draw enemies and family when artwork is unavailable', () => {
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {} });
  const p = new Painter({ getContext: () => ctx }, { get: () => undefined });
  p.enemy({ x: 100, y: 200, radius: 38, prop: 'block', boss: true, hp: 10, maxHp: 10 }, {});
  p.person(100, 200, 'child', 1, true);
  p.dog(100, 200);
});
