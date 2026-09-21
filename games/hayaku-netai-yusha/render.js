import { WORLD as W, NIGHT } from './config.js';
const C = { ink: '#27364f', cream: '#fff1d4', skin: '#f3bd95', gold: '#f5ca73', teal: '#4a9b93', rose: '#e78f88' };
const FONT = '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
export class Painter {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.time = 0; }
  rect(x, y, w, h, r, color, stroke = '') {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  circle(x, y, r, color, stroke = '') {
    const c = this.ctx; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  }
  line(x, y, ex, ey, color, width = 3) {
    const c = this.ctx; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.stroke();
  }
  text(s, x, y, size = 14, color = C.ink, align = 'center') {
    const c = this.ctx; c.font = `800 ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
  }
  shadow(x, y, rx, ry = rx * .28) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = '#26365020'; c.fill();
  }
  person(x, y, kind = 'hero', scale = 1, sleepy = false) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    const child = kind === 'child', mama = kind === 'mama';
    this.shadow(0, 23, 19); const shirt = child ? '#f7cc75' : mama ? '#eaa4a0' : '#77bcb5';
    const bob = Math.sin(this.time * (child ? 4 : 3)) * 1.2;
    c.translate(0, bob);
    this.line(-7, 10, -8, 20, '#354665', 8); this.line(7, 10, 8, 20, '#354665', 8);
    this.rect(-15, -12, 30, 31, 10, shirt, '#38485b');
    if (!child) this.rect(-9, -8, 18, 24, 4, '#f8e5bd');
    this.line(-15, -5, -20, 9, C.skin, 7); this.line(15, -5, 20, 8, C.skin, 7);
    if (mama) this.circle(14, -37, 9, '#674b49');
    this.circle(0, -28, 19, C.skin, '#38485b');
    c.beginPath(); c.arc(0, -29, 19, Math.PI, Math.PI * 2); c.lineTo(17, -25); c.lineTo(10, -31); c.lineTo(4, -26); c.lineTo(-5, -33); c.lineTo(-17, -26); c.closePath(); c.fillStyle = mama ? '#674b49' : '#435069'; c.fill();
    if (sleepy) { this.line(-10, -26, -5, -25, C.ink, 2); this.line(5, -25, 10, -26, C.ink, 2); }
    else { this.circle(-7, -26, 2, C.ink); this.circle(7, -26, 2, C.ink); }
    this.circle(-12, -21, 3, '#e99583'); this.circle(12, -21, 3, '#e99583');
    this.line(-3, -18, 3, -18, '#b56e60', 2);
    if (child) { this.circle(0, 1, 5, C.cream); this.text('★', 0, 1, 8, '#dd9e4e'); }
    c.restore();
  }
  dog(x, y, scale = 1, sleepy = false) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.shadow(0, 16, 21); this.line(13, 0, 25, -10 + Math.sin(this.time * 9) * 5, '#cf9b67', 8);
    this.rect(-15, -6, 30, 22, 10, '#d7aa74', '#715a49');
    this.circle(-6, -11, 17, '#e3b87f', '#715a49');
    this.rect(-24, -22, 10, 22, 5, '#95694f'); this.rect(4, -24, 9, 18, 4, '#95694f');
    this.circle(-6, -5, 10, '#fff0ce'); this.circle(-7, -8, 3, '#554d49');
    if (sleepy) { this.line(-16, -15, -12, -15, '#554d49', 2); this.line(-3, -15, 1, -15, '#554d49', 2); }
    else { this.circle(-14, -15, 2, '#554d49'); this.circle(-1, -15, 2, '#554d49'); }
    this.line(-16, 7, 5, 7, '#d87771', 3); this.circle(-4, 9, 3, '#f9d978'); c.restore();
  }
  prop(kind, x, y, size = 14, eyes = true) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(size / 14, size / 14);
    if (kind === 'sock') {
      this.rect(-7, -15, 14, 26, 4, '#c3b4df', '#5c5d80'); this.rect(-7, 1, 25, 13, 5, '#b0a1d3', '#5c5d80'); this.line(-5, -10, 5, -10, '#f3eada', 3);
    } else if (kind === 'plate') {
      this.circle(0, 0, 16, '#e0f1e9', '#729689'); this.circle(0, 0, 11, '#b7d4ca'); this.circle(8, 7, 4, '#a5ae71');
    } else if (kind === 'bubble') {
      this.circle(0, 0, 15, '#a9dfe4', '#639fac'); this.circle(-5, -6, 4, '#effffd'); this.circle(12, -10, 6, '#c7edf0', '#639fac');
    } else if (kind === 'bag') {
      this.rect(-9, -17, 18, 10, 4, '#e2bf7e', '#876f54'); this.rect(-15, -10, 30, 26, 6, '#dda97b', '#876f54'); this.rect(-10, 2, 20, 10, 3, '#f2ca8e');
    } else if (kind === 'star') {
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 8 : 18; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#eed58b'; c.fill(); c.strokeStyle = '#ae9364'; c.stroke();
    } else if (kind === 'pillow') this.rect(-18, -12, 36, 24, 6, '#dfd4ed', '#9993b0');
    else if (kind === 'bread') { this.rect(-14, -12, 28, 27, 6, '#d9a16c', '#8e7057'); this.rect(-10, -9, 20, 20, 4, '#f9e5ad'); }
    else { this.rect(-15, -14, 30, 29, 5, '#e29c86', '#966f69'); this.rect(-6, -19, 12, 7, 2, '#efb8a4', '#966f69'); }
    if (eyes) { this.circle(-5, -1, 1.7, '#514f60'); this.circle(5, -1, 1.7, '#514f60'); }
    c.restore();
  }
  room(room, morning, clean = 0) {
    const c = this.ctx; const color = { living: '#dbb99d', kitchen: '#b8cec0', laundry: '#c2bed6', bath: '#abd0d2', entry: '#dacbb0', bedroom: morning ? '#dccfc0' : '#afb3ce' }[room] || '#d0c1a9';
    c.fillStyle = color; c.fillRect(0, 0, W.width, W.height);
    c.strokeStyle = '#ffffff21'; c.lineWidth = 1;
    for (let y = 100; y < 620; y += 46) { c.beginPath(); c.moveTo(0, y); c.lineTo(480, y); c.stroke(); }
    for (let x = 10; x < 480; x += 92) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x, 620); c.stroke(); }
    this.rect(0, 0, 480, 65, 0, '#f5e9d5'); this.rect(0, 58, 480, 9, 0, '#b09b87');
    this.rect(174, 6, 132, 46, 6, morning ? '#b9dfe3' : '#404f78', '#887d83');
    this.line(240, 7, 240, 51, '#ede4d4', 4); this.circle(280, 21, 8, morning ? '#fbe08c' : '#f6e2ae');
    this.rect(19, 8, 78, 40, 5, '#f6dcc0', '#c2a58c'); this.text('HOME', 58, 29, 12, '#987b64');
    this.rect(386, 12, 66, 36, 5, '#cab394'); this.rect(397, 19, 44, 5, 1, '#eddbbf'); this.rect(397, 31, 44, 5, 1, '#eddbbf');
    // Furniture remains outside the main play area so the horde never hides behind it.
    if (room === 'bedroom') {
      this.rect(154, 84, 172, 100, 16, '#8c87a4', '#70758e'); this.rect(160, 91, 160, 85, 12, '#ddd4e6');
      this.rect(180, 95, 48, 26, 8, '#fff0dc'); this.rect(240, 95, 48, 26, 8, '#fff0dc');
    } else if (room === 'bath') {
      this.rect(141, 80, 198, 66, 25, '#edf7ed', '#80a7b0'); this.rect(153, 90, 174, 45, 20, '#9bcbd2'); this.prop('bubble', 303, 110, 10, false);
    } else if (room === 'kitchen') {
      this.rect(128, 81, 225, 58, 10, '#f4e4c7', '#8ca092'); this.circle(179, 108, 18, '#829b93'); this.circle(280, 109, 18, '#d3b087');
    } else if (room === 'living') {
      this.rect(138, 81, 202, 66, 12, '#769a8f', '#557e74'); this.rect(151, 92, 82, 37, 9, '#a0bdb1'); this.rect(242, 92, 82, 37, 9, '#a0bdb1');
    } else if (room === 'laundry') {
      this.rect(177, 81, 124, 65, 9, '#efe9e1', '#a29eae'); this.circle(239, 116, 23, '#8a9eb1'); this.circle(239, 116, 16, '#cbd3d7');
    } else {
      this.rect(166, 78, 148, 66, 8, '#b3a58a', '#948770'); for (let i = 0; i < 3; i++) this.prop('bag', 195 + i * 43, 109, 14, false);
    }
    c.globalAlpha = .1; this.rect(72, 195, 336, 330, 90, '#fffbea'); c.globalAlpha = 1;
    // Decorative clutter disappears with actual clear progress.
    for (let i = 0; i < 14; i++) if (i / 14 > clean / 100) {
      const x = 35 + ((i * 137) % 410), y = 193 + ((i * 79) % 340);
      c.globalAlpha = .2; this.prop(['block', 'sock', 'plate'][i % 3], x, y, 10, false); c.globalAlpha = 1;
    }
    this.rect(8, 554, 76, 44, 7, '#bba184', '#988471'); this.text('収納', 46, 576, 11, '#fff1d4');
    if (clean > 85) { this.text('✦', 80, 175, 18, '#fff7df'); this.text('✦', 405, 410, 20, '#fff7df'); }
  }
  draw(game, time, stick) {
    this.time = time; const c = this.ctx; c.clearRect(0, 0, W.width, W.height);
    if (game.state === 'commute') { this.commute(game); return; }
    this.room(game.config.room, game.route === 'morning', game.familyTask ? game.child.progress : game.progress);
    for (const w of game.warnings) { c.globalAlpha = .3 + Math.sin(time * 12) * .15; this.circle(w.x, w.y, 18, '#e49f78'); c.globalAlpha = 1; }
    for (const a of game.hazards) {
      c.globalAlpha = .2; this.circle(a.x, a.y, a.r, '#e75d67'); c.globalAlpha = 1;
      c.setLineDash([7, 5]); this.circle(a.x, a.y, a.r, '#00000000', '#b34d62'); c.setLineDash([]);
      this.text('!', a.x, a.y, 22, '#ae4058');
    }
    if (game.request || game.sideRequest) {
      const r = game.request || game.sideRequest; c.globalAlpha = .35; this.circle(r.x, r.y, 46, '#fff7c2'); c.globalAlpha = 1;
      this.circle(r.x, r.y, 37, '#ffedc344', '#fff8df');
      c.beginPath(); c.arc(r.x, r.y, 38, -Math.PI / 2, -Math.PI / 2 + Math.min(1, r.fill / 2) * Math.PI * 2); c.strokeStyle = '#477f78'; c.lineWidth = 5; c.stroke();
      this.text('♡', r.x, r.y, 29, '#578d83'); this.label(r.label, r.x, r.y + 55, '#fff3d6');
    }
    for (const d of game.drops) { this.circle(d.x, d.y, 10, '#fff4cf'); this.text(d.kind === 'heart' ? '♥' : '✦', d.x, d.y, 14, d.kind === 'heart' ? '#c67279' : '#c39547'); }
    const actors = game.enemies.map(e => ({ y: e.y, draw: () => this.enemy(e, game) }));
    actors.push({ y: game.mama.y, draw: () => { this.person(game.mama.x, game.mama.y, 'mama', .83); this.label('ママ', game.mama.x, game.mama.y + 37); if (game.mama.active) this.text('♥', game.mama.x + 23, game.mama.y - 42, 24, '#b3556a'); } });
    actors.push({ y: game.pochi.y, draw: () => { this.dog(game.pochi.x, game.pochi.y, .78); if (game.pochi.active) this.text('♪', game.pochi.x, game.pochi.y - 37, 22, '#5e7857'); } });
    if (game.familyTask) actors.push({ y: game.child.y, draw: () => { this.person(game.child.x, game.child.y, 'child', 1.04, game.child.progress >= 80 && game.isBedtime); this.label(game.child.mood, game.child.x, game.child.y - 65); } });
    actors.push({ y: game.hero.y, draw: () => { if (game.hero.invulnerable > 0) c.globalAlpha = .6 + .4 * Math.sin(time * 18) ** 2; this.person(game.hero.x, game.hero.y, 'hero', .86); c.globalAlpha = 1; } });
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());
    for (const e of game.effects) this.fx(e, game);
    if (stick) { c.globalAlpha = .35; this.circle(stick.x, stick.y, 38, '#fff5df', '#40526c'); this.circle(stick.x + stick.dx * 28, stick.y + stick.dy * 28, 16, '#fff5df'); c.globalAlpha = 1; }
    if (game.isBedtime) { c.fillStyle = '#26345712'; c.fillRect(0, 0, 480, 620); }
  }
  label(s, x, y, color = '#fff5e4') {
    const w = Math.min(440, s.length * 12 + 22); this.rect(Math.max(3, Math.min(x - w / 2, 477 - w)), y - 13, w, 26, 13, color); this.text(s, Math.max(w / 2 + 3, Math.min(x, 477 - w / 2)), y, 11, '#49586b');
  }
  enemy(e, game) {
    const c = this.ctx; this.shadow(e.x, e.y + e.radius, e.radius);
    c.save(); c.translate(e.x, e.y); c.rotate(Math.sin(this.time * 4 + e.x) * .08);
    if (e.boss) {
      for (const [x, y, s] of [[-24, 8, 26], [24, 8, 26], [0, -22, 32]]) this.prop(e.prop, x, y, s);
      this.rect(-17, -2, 34, 10, 5, '#5c5869'); this.circle(-9, 1, 3, '#ffebbb'); this.circle(9, 1, 3, '#ffebbb');
      if (e.hp < e.maxHp * .5) this.text('!!', 0, -64, 21, '#8a4650');
    } else this.prop(e.prop, 0, 0, e.radius + 2);
    if (e.flash) { c.globalAlpha = .65; this.circle(0, 0, e.radius + 4, '#fff8d1'); }
    c.restore();
  }
  fx(e, game) {
    const c = this.ctx; const t = 1 - e.life / e.maxLife;
    c.save(); c.globalAlpha = 1 - t;
    if (e.kind === 'label') { this.label(e.text, e.x, e.y - t * 20, '#fff5dd'); c.restore(); return; }
    if (e.kind === 'tidy') {
      const x = e.x + (46 - e.x) * t * t, y = e.y + (573 - e.y) * t * t;
      this.circle(x, y, 4 * (1 - t) + 2, '#fff4ba'); c.restore(); return;
    }
    const colors = { sweep: '#fff0ba', bubble: '#e9ffff', vacuum: '#548e96', clip: '#fff3c4', heart: '#edabc2', quiet: '#d7dcff', ultimate: '#fff7d3', danger: '#c75b70' };
    c.strokeStyle = colors[e.kind] || C.cream; c.lineWidth = e.kind === 'sweep' ? 14 * (1 - t) + 2 : 3;
    c.beginPath();
    if (e.kind === 'sweep' && game.skills.mop < 3) { const a = Math.atan2(game.hero.facing.y, game.hero.facing.x); c.arc(e.x, e.y, e.radius * (.5 + t * .5), a - 1.65, a + 1.65); }
    else c.arc(e.x, e.y, Math.max(1, e.radius * (.3 + t * .7)), 0, Math.PI * 2);
    c.stroke();
    if (e.kind === 'heart') this.text('♥', e.x, e.y - t * 35, 28, '#fff1e5');
    c.restore();
  }
  commute(game) {
    const c = this.ctx; c.fillStyle = '#bad6d5'; c.fillRect(0, 0, 480, 620);
    this.rect(92, 0, 296, 139, 5, '#e8e6d7', '#839aa3'); this.rect(182, 42, 116, 95, 5, '#608390'); this.text('OFFICE', 240, 23, 19, '#456170');
    this.rect(128, 145, 224, 475, 0, '#a8afa7');
    for (let y = 177; y < 620; y += 45) this.rect(237, y, 6, 22, 1, '#f7edce');
    for (const x of [54, 428]) for (let y = 230; y < 600; y += 175) { this.rect(x - 5, y, 10, 45, 4, '#9b8571'); this.circle(x, y - 4, 28, '#79a394'); }
    this.circle(240, 99, 42, '#fff2b866', '#fff5d5'); this.text('出社', 240, 99, 18, '#fff6db');
    this.person(game.hero.x, game.hero.y, 'hero', 1); this.label('会社の入口へ！', 240, 550);
  }
  scene(kind, time) {
    this.time = time; const c = this.ctx; const morning = ['alarm', 'morning', 'sendoff', 'rush', 'office', 'memory', 'trueEnd'].includes(kind);
    const grad = c.createLinearGradient(0, 0, 0, 620); grad.addColorStop(0, morning ? '#c2dbdc' : '#283959'); grad.addColorStop(1, morning ? '#fff0cf' : '#6b7395');
    c.fillStyle = grad; c.fillRect(0, 0, 480, 620);
    c.save(); c.translate(24, -40); c.scale(.9, .9);
    if (!morning) for (let i = 0; i < 32; i++) this.circle((i * 137 + 17) % 480, (i * 79) % 330, 1 + i % 2, '#f5e7bc');
    this.circle(374, 96, 38, morning ? '#f5d997' : '#eadeb3');
    if (['office', 'trueEnd', 'rush'].includes(kind)) {
      for (let i = 0; i < 5; i++) {
        const height = 125 + (i * 47 % 85); this.rect(i * 105 - 15, 320 - height, 90, height, 4, i % 2 ? '#8fadb8' : '#7292a7');
        for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) this.rect(i * 105 + x * 23, 340 - height + y * 28, 12, 14, 2, '#e7dbc1');
      }
      this.rect(0, 319, 480, 301, 0, '#c3bfae'); this.person(240, 386, 'hero', 2.2);
      if (kind === 'trueEnd') this.text('今日も、定時で帰ろう。', 240, 530, 21, '#465b71');
      c.restore(); return;
    }
    // House cutaway: story portraits stay warm and human, including the final opponent.
    c.beginPath(); c.moveTo(40, 260); c.lineTo(240, 117); c.lineTo(440, 260); c.closePath(); c.fillStyle = '#807184'; c.fill();
    this.rect(67, 247, 346, 260, 12, morning ? '#eedabb' : '#ddc6aa'); this.rect(79, 427, 322, 80, 0, '#b7977e');
    this.rect(103, 271, 72, 75, 7, morning ? '#c4e1df' : '#536a8a', '#ac9886'); this.line(139, 272, 139, 344, '#edddc4', 4);
    const sleep = ['sleep', 'familySleep', 'nightEnd'].includes(kind);
    if (sleep) {
      this.rect(116, 369, 246, 116, 14, '#93889c'); this.rect(127, 379, 224, 94, 13, '#c3bed5');
      this.person(230, 408, 'child', 1.3, true);
      if (kind !== 'sleep') { this.person(161, 405, 'hero', 1.3, true); this.person(301, 405, 'mama', 1.3, true); }
      else this.person(326, 416, 'hero', 1.5);
      this.rect(124, 419, kind === 'sleep' ? 153 : 227, 57, 12, '#a5b9bd'); this.dog(335, 497, .9, true); this.text('Z z z', 236, 322, 24, '#7a7494');
    } else {
      this.person(154, 418, 'hero', 1.6); this.person(325, 416, 'mama', 1.6); this.person(241, 430, 'child', 1.25); this.dog(362, 472, 1.05);
      if (kind === 'alarm') { this.circle(245, 293, 37, '#f0c37f', '#8d7264'); this.line(245, 293, 245, 270, C.ink); this.line(245, 293, 260, 293, C.ink); this.text('6:30', 240, 535, 40, '#667d89'); }
      if (kind === 'sendoff') this.label('いってきます！', 240, 331);
      if (kind === 'home') this.label('おかえり！', 320, 332);
      if (kind === 'family') this.label('いっしょに、がんばろう。', 240, 326);
    }
    c.restore();
  }
}
