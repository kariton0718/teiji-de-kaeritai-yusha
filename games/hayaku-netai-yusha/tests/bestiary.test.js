import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROFILES, profilesFor } from '../bestiary-data.js';
import { ART_IDS } from '../character-art.js';
import { mountBestiary } from '../bestiary.js';

test('public character book covers 18 unique illustrated characters', () => {
  assert.equal(PROFILES.length, 18);
  assert.equal(new Set(PROFILES.map(p => p.id)).size, 18);
  assert.equal(profilesFor('family').length, 5);
  assert.equal(profilesFor('mob').length, 8);
  assert.equal(profilesFor('boss').length, 5);
  for (const p of PROFILES) assert.ok(ART_IDS.includes(p.id) && p.name && p.quote && p.description && p.where);
});
test('title assets and stylesheet are present in the publication configuration', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /assets\/title\/\*\.webp/);
  assert.match(workflow, /hayaku-netai-yusha\/\*\.css/);
  for (const file of ['title-logo', 'title-keyart']) {
    const bytes = readFileSync(new URL('../assets/title/' + file + '.webp', import.meta.url));
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});
test('book filters, arrows, keyboard, swiping and reset work in DOM adapter', t => {
  const previous = globalThis.document;
  t.after(() => { globalThis.document = previous; });
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.scrollLeft = 0; }
    setAttribute(k, v) { this.attrs[k] = v; }
    append(...nodes) { for (const n of nodes) { n.offsetLeft = this.children.length * 332; this.children.push(n); } }
    replaceChildren() { this.children = []; }
    addEventListener(k, fn) { this.events[k] = fn; }
    scrollTo({left}) { this.scrollLeft = left; this.events.scroll?.(); }
    emit(k, event = {}) { this.events[k]?.({preventDefault() {}, stopPropagation() {}, ...event}); }
  }
  globalThis.document = {createElement: tag => new Element(tag)};
  const parent = new Element('div'), root = mountBestiary(parent);
  const filters = root.children.find(n => n.className === 'bestiary-filters');
  const nav = root.children.find(n => n.className === 'bestiary-navigation');
  const rail = root.children.find(n => n.className === 'bestiary-rail');
  const [prev, count, next] = nav.children;
  assert.equal(rail.children.length, 18); assert.equal(count.textContent, '1 / 18'); assert.ok(prev.disabled);
  next.emit('click'); assert.equal(count.textContent, '2 / 18');
  filters.children[3].emit('click');
  assert.equal(rail.children.length, 5); assert.equal(count.textContent, '1 / 5'); assert.equal(rail.scrollLeft, 0);
  assert.equal(filters.children[3].attrs['aria-pressed'], 'true');
  rail.emit('keydown', {key: 'ArrowRight'}); assert.equal(count.textContent, '2 / 5');
  rail.scrollTo({left: 332 * 4}); assert.equal(count.textContent, '5 / 5'); assert.ok(next.disabled);
  filters.children[1].emit('click'); assert.equal(count.textContent, '1 / 5');
  assert.equal(rail.children[0].children[0].alt, '早く寝たい勇者');
  prev.emit('click'); assert.equal(count.textContent, '1 / 5');
});
