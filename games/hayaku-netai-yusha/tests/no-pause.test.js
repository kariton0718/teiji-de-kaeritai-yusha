import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { SleepGame } from '../game.js';
import { STORY, SKILLS } from '../config.js';
import { canvasPoint, stickVector } from '../input.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

// Run the actual controller with a small DOM/event double, not a real browser.
// Only module imports and visual/audio adapters are replaced; game logic is real.
function harness() {
  const target = () => ({
    listeners: {}, addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); },
    emit(name, event = {}) { for (const fn of this.listeners[name] || []) fn({ preventDefault() {}, stopPropagation() {}, ...event }); },
  });
  function element() {
    return Object.assign(target(), {
      children: [], hidden: false, style: {}, classList: { add() {}, remove() {}, toggle() {} },
      set innerHTML(value) { this.content = value; this.children = []; }, get innerHTML() { return this.content || ''; },
      append(child) { this.children.push(child); }, setAttribute() {}, setPointerCapture() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 620 }; },
    });
  }
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], element()]));
  const document = Object.assign(target(), { hidden: false, getElementById: id => elements.get(id), createElement: element });
  const window = target(); let game, callback, now = 1000;
  class ObservedGame extends SleepGame { constructor() { super(() => .41); game = this; } }
  vm.runInNewContext(source.replace(/^import .*;\n/gm, ''), {
    document, window, SleepGame: ObservedGame, STORY, SKILLS, canvasPoint, stickVector, mountBestiary() {},
    Painter: class { scene() {} draw() {} }, HomeAudio: class { update() {} event() {} },
    requestAnimationFrame(fn) { callback = fn; },
  });
  const overlay = elements.get('overlay');
  function click(label) { const b = overlay.children.find(b => b.textContent === label); assert.ok(b, `Missing ${label}`); b.emit('click'); }
  function frames(count = 10) { for (let i = 0; i < count; i++) { now += 1000 / 60; callback(now); } }
  function start() { click('おうちの冒険をはじめる →'); click('演出をスキップ'); click('いっしょに片づけよう！'); frames(2); }
  return { document, window, elements, game, overlay, start, frames, click, jump(ms) { now += ms; } };
}

test('no time button, Escape instruction, paused state, or blocking resume menu remains', () => {
  assert.doesNotMatch(html, /id="pause"|Esc：一時停止/);
  assert.doesNotMatch(source, /\bpaused\b|function pause\(|冒険をつづける/);
});
test('repeated focus loss does not open a menu or stop active gameplay', () => {
  const h = harness(); h.start(); const time = h.game.elapsed;
  for (let i = 0; i < 6; i++) { h.window.emit('blur'); h.frames(2); }
  assert.equal(h.overlay.hidden, true); assert.equal(h.game.state, 'playing'); assert.ok(h.game.elapsed > time);
});
test('hidden page freezes; returning resumes without a button or time jump', () => {
  const h = harness(); h.start(); const time = h.game.elapsed;
  h.document.hidden = true; h.document.emit('visibilitychange'); h.jump(60000); h.frames(20);
  assert.equal(h.game.elapsed, time); assert.equal(h.overlay.hidden, true);
  h.document.hidden = false; h.document.emit('visibilitychange'); h.jump(60000); h.frames(1);
  assert.equal(h.game.elapsed, time); h.frames(10);
  assert.ok(h.game.elapsed > time); assert.ok(h.game.elapsed - time < .2); assert.equal(h.overlay.hidden, true);
});
test('Escape does not interrupt gameplay', () => {
  const h = harness(); h.start(); h.document.emit('keydown', { code: 'Escape' }); h.frames();
  assert.equal(h.overlay.hidden, true); assert.equal(h.game.state, 'playing');
});
test('focus loss clears held keys and a new movement input works immediately', () => {
  const h = harness(); h.start(); h.document.emit('keydown', { code: 'KeyD' }); h.frames(6); const x = h.game.hero.x;
  assert.ok(x > 240); h.window.emit('blur'); h.frames(6); assert.equal(h.game.hero.x, x);
  h.document.emit('keydown', { code: 'KeyA' }); h.frames(6); assert.ok(h.game.hero.x < x);
});
test('visibility changes cancel old touch ownership and allow a fresh pointer', () => {
  const h = harness(); h.start(); const canvas = h.elements.get('canvas');
  canvas.emit('pointerdown', { pointerId: 1, clientX: 240, clientY: 430 });
  canvas.emit('pointermove', { pointerId: 1, clientX: 280, clientY: 430 }); h.frames(4);
  h.document.hidden = true; h.document.emit('visibilitychange'); h.document.hidden = false; h.document.emit('visibilitychange');
  const x = h.game.hero.x; h.frames(4); assert.equal(h.game.hero.x, x);
  canvas.emit('pointerdown', { pointerId: 2, clientX: 240, clientY: 430 });
  canvas.emit('pointermove', { pointerId: 2, clientX: 200, clientY: 430 }); h.frames(4);
  assert.ok(h.game.hero.x < x); assert.equal(h.overlay.hidden, true);
});
test('story menu survives visibility changes without being replaced', () => {
  const h = harness(); h.click('おうちの冒険をはじめる →'); const content = h.overlay.innerHTML;
  h.window.emit('blur'); h.document.hidden = true; h.document.emit('visibilitychange'); h.frames();
  h.document.hidden = false; h.document.emit('visibilitychange'); h.frames();
  assert.equal(h.overlay.hidden, false); assert.equal(h.overlay.innerHTML, content);
  h.click('演出をスキップ'); h.click('いっしょに片づけよう！'); h.frames(); assert.equal(h.game.state, 'playing');
});
