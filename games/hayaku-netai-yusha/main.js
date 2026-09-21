import { SleepGame } from './game.js';
import { Painter } from './render.js';
import { HomeAudio } from './audio.js';
import { NIGHT, MORNING, STORY, SKILLS } from './config.js';
import { canvasPoint, stickVector } from './input.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), overlay = $('overlay'), game = new SleepGame(), painter = new Painter(canvas), audio = new HomeAudio();
let scene = 'family', story = null, storyIndex = 0, storyDone = null, priorState = '', last = 0, noticeLeft = 0;
const input = { x: 0, y: 0, ultimate: false }, keys = new Set(); let pointer = null, stick = null;
const clearInput = () => { keys.clear(); pointer = null; stick = null; input.x = 0; input.y = 0; input.ultimate = false; };
function button(label, action, secondary = false) {
  const b = document.createElement('button'); b.className = 'btn' + (secondary ? ' secondary' : ''); b.textContent = label; b.addEventListener('click', action); overlay.append(b); return b;
}
function panel(html, modal = true) { clearInput(); overlay.hidden = false; overlay.className = 'overlay' + (modal ? ' panel' : ''); overlay.innerHTML = html; }
function setHud(show) { for (const id of ['hud', 'controls', 'ultimate']) $(id).hidden = !show; }
function title() {
  game.reset(); scene = 'family'; story = null; priorState = 'title'; setHud(false);
  panel('<div class="eyebrow">定時で帰りたい勇者 SERIES / 02</div><h1><span>定時で帰った。その先にも冒険があった。</span>早く寝たい勇者</h1><p class="lead">家事を片づけて、子どもを寝かしつけて。<br>家族みんなで、おやすみなさい。</p><div class="family-tags"><span>ママと手分け</span><span>ポチもお手伝い</span><span>夜と朝、2つの結末</span></div>', false);
  button('おうちの冒険をはじめる →', () => { game.begin(); playStory('opening', () => roomIntro()); });
  button('遊び方・家族の紹介', instructions, true);
  const p = document.createElement('p'); p.className = 'subtle'; p.textContent = '試作版 v0.1 ・ 通常攻撃は自動 ・ 音は初期OFF'; overlay.append(p);
}
function instructions() {
  panel('<div class="eyebrow">HOW TO PLAY</div><h2>家族で、夜を乗り切ろう。</h2><p>画面の好きな場所をスライドして移動。家事の魔物への攻撃は自動です。ゲージがたまったら、右下の必殺技！</p><p><b>ママ</b>：気力を回復し、周りの家事も片づけてくれます。<br><b>ポチ</b>：アイテムを運び、お願いの場所を探します。<br><b>子ども</b>：かわいい強敵。「お願い」の輪に入って2秒、お手伝いすると準備が進みます。</p><p>夜の6ステージを終えると、おやすみのエンディング。試作では、その後のボタンから翌朝の裏ルートも遊べます。</p>');
  button('わかった！', title);
}
function playStory(id, done) { clearInput(); setHud(false); story = STORY[id]; storyIndex = 0; storyDone = done; renderStory(); }
function renderStory() {
  const [title, copy, art] = story[storyIndex]; scene = art;
  panel(`<div class="story-counter">${story.map((_, i) => `<i class="${i <= storyIndex ? 'on' : ''}"></i>`).join('')}</div><div class="eyebrow">早く寝たい勇者</div><h2>${title}</h2><p class="lead">${copy}</p>`, false);
  button(storyIndex === story.length - 1 ? 'つづける →' : '次へ →', nextStory);
  if (storyIndex < story.length - 1) button('演出をスキップ', () => { const done = storyDone; story = null; done(); }, true);
}
function nextStory() { if (!story) return; storyIndex++; if (storyIndex < story.length) renderStory(); else { const done = storyDone; story = null; done(); } }
function roomIntro() {
  story = null; const cfg = game.config; scene = null; priorState = game.state;
  panel(`<div class="eyebrow">${game.route === 'night' ? `夜の冒険 / ${game.stage + 1} OF 6` : `裏ステージ 朝の総力戦 / ${game.morning + 1} OF 4`}</div><h2>${cfg.name}</h2><p>${cfg.line || cfg.child}</p><p class="lead">${cfg.action}</p><p>${game.familyTask ? '光る輪の中に2秒とどまると、お手伝いできます。近くの魔物は自動でお片づけ。' : '魔物をまとめて片づけると、ボスが登場。赤い予告から離れて、反撃しよう。'}</p>`);
  button(game.familyTask ? 'お手伝いをはじめる →' : 'いっしょに片づけよう！', () => { game.enterRoom(); priorState = 'playing'; overlay.hidden = true; scene = null; setHud(true); showNotice(cfg.action, 5); });
}
function showNotice(s, duration = 3) { $('notice').textContent = s; $('notice').classList.add('show'); noticeLeft = duration; }
function upgrades() {
  panel(`<div class="eyebrow">ROOM CLEAR / おつかれさま！</div><h2>家事のコツを、ひとつ。</h2><p>次の部屋へ。使うほど、まとめて片づく。</p><div class="choices" id="choices"></div>`);
  for (const skill of game.offers()) {
    const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `<strong>${skill.icon} ${skill.name}　Lv.${game.skills[skill.id] + 1}</strong><small>${skill.detail}</small>`;
    b.addEventListener('click', () => { if (game.chooseSkill(skill.id)) roomIntro(); }); $('choices').append(b);
  }
}
function result(morning = false) {
  game.state = 'result'; priorState = 'result'; scene = morning ? 'trueEnd' : 'nightEnd'; setHud(false);
  panel(`<div class="ending-mark">${morning ? 'TRUE ENDING / 夜を越えて、朝へ' : 'NIGHT ENDING / 家族みんな、おやすみ'}</div><h2>${morning ? '今日も、定時で帰ろう。' : 'やっと、眠れた。'}</h2><p>${morning ? '子どもを送り出し、無事に出社。<br>家族で乗り切った、もうひとつの冒険。' : 'ママも、子どもも、ポチも。<br>今日も一日、おつかれさまでした。'}</p><div class="stats"><div class="stat"><span>片づけた魔物</span><strong>${game.kills}</strong></div><div class="stat"><span>最大 家事コンボ</span><strong>${game.bestCombo}</strong></div></div>`, false);
  if (!morning) {
    button('翌朝の裏ルートも遊ぶ →', () => { if (game.beginMorning()) { priorState = game.state; playStory('dawn', roomIntro); } });
    const p = document.createElement('p'); p.className = 'subtle'; p.textContent = '試作中は全員が翌朝を体験できます。正式な出現条件は調整予定。'; overlay.append(p);
  }
  button('タイトルへ戻る', title, true);
}
function defeat() {
  panel(`<div class="eyebrow">今日は、ちょっとひと休み。</div><h2>おつかれさま、勇者。</h2><p>${game.cause}</p><p>お願いの輪へ移動しながら、近くの魔物を片づけよう。ママの回復と、ポチのお届けも力になります。</p>`);
  button(game.route === 'morning' ? '朝の支度からもう一度' : 'この部屋からもう一度', () => {
    game.hero.energy = game.hero.maxEnergy; game.ultimate = Math.max(50, game.ultimate);
    if (game.route === 'morning') { game.morningElapsed = 0; game.morning = 0; } else game.nightElapsed = Math.min(game.nightElapsed, game.stage * 60);
    game.state = 'roomIntro'; roomIntro();
  }); button('タイトルへ戻る', title, true);
}
function changeState() {
  if (game.state === priorState) return; priorState = game.state; clearInput();
  if (game.state === 'upgrade') upgrades();
  else if (game.state === 'nightEnding') playStory('night', () => result(false));
  else if (game.state === 'morningRoomIntro') roomIntro();
  else if (game.state === 'sendoff') playStory('sendoff', () => { game.beginCommute(); priorState = 'commute'; scene = null; overlay.hidden = true; setHud(true); $('ultimate').hidden = true; showNotice('自分も出社！ 画面をスライドして会社の入口へ。', 5); });
  else if (game.state === 'trueEnding') playStory('true', () => result(true));
  else if (game.state === 'defeat') defeat();
}
$('sound').addEventListener('click', () => { try { const enabled = audio.toggle(); $('sound').textContent = enabled ? '音 ON' : '音 OFF'; $('sound').setAttribute('aria-pressed', String(enabled)); } catch { showNotice('このブラウザーでは音を再生できません。'); } });
$('ultimate').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (overlay.hidden && !document.hidden) game.useUltimate(); });
$('ultimate').addEventListener('click', e => { if (e.detail === 0 && overlay.hidden && !document.hidden) game.useUltimate(); });
canvas.addEventListener('pointerdown', e => {
  if (!overlay.hidden || pointer !== null || !['playing', 'commute'].includes(game.state)) return;
  e.preventDefault(); const p = canvasPoint(e.clientX, e.clientY, canvas.getBoundingClientRect());
  if (p.x < 0 || p.x > 480 || p.y < 0 || p.y > 620) return;
  pointer = e.pointerId; canvas.setPointerCapture(pointer); stick = { x: p.x, y: p.y, dx: 0, dy: 0 };
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer || !stick) return; e.preventDefault();
  const v = stickVector(stick, canvasPoint(e.clientX, e.clientY, canvas.getBoundingClientRect())); input.x = v.x; input.y = v.y; stick.dx = v.x; stick.dy = v.y;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => { if (e.pointerId === pointer) { pointer = null; stick = null; input.x = 0; input.y = 0; } });
document.addEventListener('keydown', e => {
  if (!overlay.hidden || document.hidden) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); keys.add(e.code); }
  if (e.code === 'Space' && !e.repeat) game.useUltimate();
});
document.addEventListener('keyup', e => keys.delete(e.code));
// Focus changes can occur during mobile browser UI interactions. Never open a
// blocking menu here. Only clear held controls to prevent movement getting stuck.
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { clearInput(); last = 0; });
function refreshHud() {
  const day = game.route === 'morning', commute = game.state === 'commute';
  $('chapter').textContent = commute ? '最後の一走り / 出社へ' : day ? `朝 ${game.morning + 1}/4 · ${game.config.name}` : `夜 ${game.stage + 1}/6 · ${game.config.name}`;
  const minutes = day ? 390 + Math.min(119, game.morningElapsed / 2) : 1110 + Math.min(210, game.nightElapsed * .55);
  $('clock').textContent = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${Math.floor(minutes % 60).toString().padStart(2, '0')}`;
  $('energy').textContent = Math.ceil(game.hero.energy); $('energy-fill').style.width = `${game.hero.energy / game.hero.maxEnergy * 100}%`;
  $('energy-fill').style.background = game.hero.energy < 25 ? '#dc8c89' : '#81bcaa';
  const boss = game.boss && !game.boss.dead;
  $('objective').textContent = commute ? '会社の入口へ' : game.familyTask ? game.isBedtime ? 'すやすやゲージ' : 'お支度ゲージ' : boss ? game.config.boss : 'お片づけ';
  $('counter').textContent = commute ? 'あと少し！' : game.familyTask ? `${Math.round(game.child.progress)}%${game.isBedtime ? ` · 音 ${Math.round(game.noise)}%` : ''}` : boss ? `${Math.ceil(game.boss.hp)} / ${game.boss.maxHp}` : `${Math.min(game.stageKills, game.config.quota)} / ${game.config.quota}`;
  $('progress-fill').style.width = `${commute ? 100 : boss ? game.boss.hp / game.boss.maxHp * 100 : game.progress}%`;
  $('ultimate').classList.toggle('ready', game.ultimate >= 100); $('ultimate').disabled = game.ultimate < 100; $('ult-value').textContent = game.ultimate >= 100 ? '発動！' : `${Math.floor(game.ultimate)}%`;
  $('ult-name').textContent = game.isBedtime ? 'みんな、おやすみ。' : '本日は閉店です！';
  $('skill-list').textContent = SKILLS.filter(s => game.skills[s.id]).map(s => `${s.icon}${game.skills[s.id]}`).join(' ');
}
let hudLeft = 0;
function frame(now) {
  const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
  // Freeze only while the page is actually hidden; resume automatically on return.
  if (!document.hidden) {
    if (pointer === null) { input.x = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0); input.y = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0); }
    game.update(dt, input); changeState();
    if (!document.hidden) audio.update(dt, story ? 'story' : game.state === 'result' ? 'ending' : game.isBedtime ? 'bed' : game.route === 'morning' ? 'morning' : 'night');
    const events = game.events.splice(0); for (const e of new Set(events)) audio.event(e);
  }
  canvas.style.objectPosition = scene ? 'center top' : 'center';
  if (scene) painter.scene(scene, now / 1000); else painter.draw(game, now / 1000, stick);
  hudLeft -= dt; if (hudLeft <= 0) { refreshHud(); hudLeft = .1; }
  if (noticeLeft > 0 && !document.hidden) { noticeLeft -= dt; if (noticeLeft <= 0) $('notice').classList.remove('show'); }
  requestAnimationFrame(frame);
}
title(); requestAnimationFrame(frame);
