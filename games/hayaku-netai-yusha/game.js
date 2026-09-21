import { WORLD as W, NIGHT, MORNING, SKILLS, BED_REQUESTS } from './config.js';
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };

// Family members are never damage targets. Child progress lives outside combat entities.
export class SleepGame {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() {
    this.state = 'title'; this.route = 'night'; this.stage = 0; this.morning = 0;
    this.hero = { x: 240, y: 430, energy: 100, maxEnergy: 100, invulnerable: 0, facing: { x: 0, y: -1 } };
    this.child = { x: 240, y: 140, progress: 0, mood: 'まだ遊びたい！' };
    this.mama = { x: 78, y: 480, active: 0 }; this.pochi = { x: 370, y: 450, active: 0 };
    this.skills = { mop: 1, bubble: 0, vacuum: 0, clip: 0, heart: 0 };
    this.elapsed = 0; this.nightElapsed = 0; this.morningElapsed = 0; this.kills = 0;
    this.ultimate = 35; this.combo = 0; this.comboLife = 0; this.bestCombo = 0;
    this.completedNight = false; this.completedMorning = false; this.cause = '';
    this.events = []; this.clearRoom();
  }
  clearRoom() {
    this.enemies = []; this.effects = []; this.drops = []; this.hazards = []; this.warnings = [];
    this.stageKills = 0; this.roomTime = 0; this.spawnCd = .8; this.attackCd = 0;
    this.bubbleCd = 1; this.vacuumCd = 2; this.clipCd = 1; this.mamaCd = 9; this.pochiCd = 3;
    this.boss = null; this.bossSpawned = false; this.request = null; this.requestIndex = 0;
    this.noise = 0; this.requestWait = 0; this.dangerCd = 3; this.helped = 0;
    this.firstWave = true; this.sideRequest = null; this.sideCd = 13;
    this.hero.x = 240; this.hero.y = 430; this.hero.invulnerable = 2;
    this.mama.x = 78; this.mama.y = 480; this.pochi.x = 370; this.pochi.y = 450;
  }
  get config() { return this.route === 'morning' ? MORNING[this.morning] : NIGHT[this.stage]; }
  get familyTask() { return this.route === 'morning' || this.stage === 5; }
  get isBedtime() { return this.route === 'night' && this.stage === 5; }
  get progress() {
    if (this.familyTask) return this.child.progress;
    return Math.min(100, this.stageKills / this.config.quota * 100);
  }
  begin() { this.reset(); this.state = 'intro'; }
  enterRoom() {
    this.clearRoom(); this.child.progress = 0; this.child.mood = this.isBedtime ? 'もう1冊、読んで？' : this.config.child || 'がんばれ！';
    this.state = 'playing'; if (this.familyTask) this.nextRequest();
    this.emit('room');
  }
  emit(type) { this.events.push(type); if (this.events.length > 30) this.events.shift(); }
  effect(kind, x, y, radius = 30, text = '', life = .5) {
    if (this.effects.length >= W.maxEffects) this.effects.shift();
    this.effects.push({ kind, x, y, radius, text, life, maxLife: life });
  }
  spawn(count, prop = this.config.prop) {
    for (let i = 0; i < count && this.enemies.length + this.warnings.length < W.maxEnemies; i++) {
      const side = Math.floor(this.random() * 4);
      let p = { x: side < 2 ? 22 + side * 436 : 24 + this.random() * 432, y: side >= 2 ? 62 + (side - 2) * 518 : 65 + this.random() * 510 };
      if (distance(p, this.hero) < 120) p = { x: this.hero.x < 240 ? 453 : 27, y: 80 + this.random() * 470 };
      this.warnings.push({ ...p, life: .85 + this.random() * .5, prop, heavy: this.random() < .08 });
    }
  }
  hurtEnemy(e, damage, push = 0) {
    if (!e || e.dead) return;
    e.hp -= damage; e.flash = .12;
    if (push) { const n = unit(e.x - this.hero.x, e.y - this.hero.y); e.x = clamp(e.x + n.x * push, 22, 458); e.y = clamp(e.y + n.y * push, 65, 584); }
    if (e.hp > 0) return;
    e.dead = true; this.kills++; this.stageKills++; this.combo++; this.comboLife = 2.2;
    this.bestCombo = Math.max(this.bestCombo, this.combo); this.ultimate = Math.min(100, this.ultimate + (e.boss ? 14 : 1.1));
    this.effect('tidy', e.x, e.y, 13, '', .7);
    if (this.combo % 15 === 0) { this.effect('label', this.hero.x, this.hero.y - 50, 0, `${this.combo} 家事コンボ！`, 1.1); this.emit('combo'); }
    if (this.random() < .075 && this.drops.length < W.maxDrops) this.drops.push({ x: e.x, y: e.y, life: 16, kind: this.random() < .55 ? 'heart' : 'spark' });
    this.emit('tidy');
  }
  area(x, y, radius, damage, kind = 'sweep', push = 0) {
    this.effect(kind, x, y, radius);
    for (const e of this.enemies) if (!e.dead && distance({ x, y }, e) < radius + e.radius) this.hurtEnemy(e, damage, push);
  }
  useUltimate() {
    if (this.state !== 'playing' || this.ultimate < 100) return false;
    this.ultimate = 0;
    this.area(this.hero.x, this.hero.y, 800, 180, this.isBedtime ? 'quiet' : 'ultimate', 30);
    this.hazards = []; this.hero.invulnerable = 2;
    this.effect('label', 240, 280, 0, this.isBedtime ? 'みんな、おやすみ。' : '本日は閉店です！', 2);
    this.emit('ultimate'); return true;
  }
  hurtHero(damage, source) {
    if (this.state !== 'playing' || this.hero.invulnerable > 0) return;
    this.hero.energy = Math.max(0, this.hero.energy - damage); this.hero.invulnerable = 1;
    this.effect('label', this.hero.x, this.hero.y - 32, 0, `気力 −${damage}`, .8); this.emit('hurt');
    if (this.hero.energy <= 0) { this.cause = `${source}で気力を使い切った。`; this.state = 'defeat'; }
  }
  nextRequest() {
    const spots = [{ x: 105, y: 215 }, { x: 375, y: 250 }, { x: 120, y: 405 }, { x: 360, y: 440 }, { x: 240, y: 295 }];
    const p = spots[this.requestIndex % spots.length];
    const label = this.isBedtime ? BED_REQUESTS[this.requestIndex % BED_REQUESTS.length] : this.config.request;
    this.request = { ...p, label, fill: 0 }; this.requestIndex++;
  }
  collect(drop) {
    if (drop.life <= 0) return;
    drop.life = 0;
    if (drop.kind === 'heart') this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 9);
    else this.ultimate = Math.min(100, this.ultimate + 9);
    this.effect('heart', drop.x, drop.y, 20); this.emit('collect');
  }
  update(dt, input = {}) {
    if (this.state !== 'playing' && this.state !== 'commute') return;
    dt = clamp(dt, 0, .05); this.elapsed += dt;
    if (this.route === 'night') this.nightElapsed += dt; else this.morningElapsed += dt;
    if (this.nightElapsed > 720 && this.route === 'night') { this.cause = '夜ふかしで眠気が限界に。'; this.state = 'defeat'; return; }
    if (this.morningElapsed > 240 && this.route === 'morning') { this.cause = '朝の支度に時間がかかり、遅刻してしまった。'; this.state = 'defeat'; return; }
    const h = this.hero; h.invulnerable = Math.max(0, h.invulnerable - dt);
    const n = unit(input.x || 0, input.y || 0); const moving = Boolean(input.x || input.y);
    if (moving) { h.facing = n; h.x = clamp(h.x + n.x * 177 * dt, 24, 456); h.y = clamp(h.y + n.y * 177 * dt, 74, 580); }
    this.effects.forEach(e => e.life -= dt); this.effects = this.effects.filter(e => e.life > 0);
    if (this.state === 'commute') {
      if (distance(h, { x: 240, y: 92 }) < 45) { this.completedMorning = true; this.state = 'trueEnding'; this.emit('ending'); }
      return;
    }
    this.roomTime += dt; this.comboLife -= dt; if (this.comboLife <= 0) this.combo = 0;
    if (input.ultimate) this.useUltimate();
    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      const count = this.familyTask ? 12 : this.firstWave ? 72 + this.stage * 6 : 24 + this.stage * 4;
      this.firstWave = false; this.spawn(count); this.spawnCd = this.familyTask ? 4.8 : 3.6;
    }
    for (const w of this.warnings) {
      w.life -= dt; if (w.life > 0) continue;
      const hp = w.heavy ? 54 : 17 + (this.route === 'night' ? this.stage * 2 : 7);
      this.enemies.push({ x: w.x, y: w.y, hp, maxHp: hp, radius: w.heavy ? 17 : 11, speed: w.heavy ? 27 : 34 + this.random() * 23, prop: w.prop, heavy: w.heavy, flash: 0, dead: false });
    }
    this.warnings = this.warnings.filter(w => w.life > 0);
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const level = this.skills.mop; const range = 92 + level * 14;
      const target = this.enemies.find(e => !e.dead && distance(h, e) < range + e.radius);
      if (target) {
        if (level < 3) h.facing = unit(target.x - h.x, target.y - h.y);
        this.effect(this.isBedtime ? 'quiet' : 'sweep', h.x, h.y, range);
        for (const e of this.enemies) {
          if (e.dead || distance(h, e) > range + e.radius) continue;
          const v = unit(e.x - h.x, e.y - h.y);
          if (level >= 3 || v.x * h.facing.x + v.y * h.facing.y > -.15) this.hurtEnemy(e, 22 + level * 8, 12);
        }
        this.emit('sweep'); this.attackCd = .43;
      } else this.attackCd = .08;
    }
    this.updateSkills(dt); this.updateEnemies(dt); if (this.state !== 'playing') return;
    this.updateAllies(dt); this.updateTask(dt); this.updateOptionalRequest(dt);
    for (const d of this.drops) { d.life -= dt; if (distance(d, h) < 32) this.collect(d); }
    this.drops = this.drops.filter(d => d.life > 0);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (!this.familyTask) {
      if (!this.bossSpawned && this.stageKills >= this.config.quota) this.spawnBoss();
      if (this.boss?.dead) { this.state = 'upgrade'; this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 20); this.emit('clear'); }
    }
  }
  updateSkills(dt) {
    this.bubbleCd -= dt; this.clipCd -= dt; this.vacuumCd -= dt;
    if (this.skills.bubble && this.bubbleCd <= 0) {
      let target = this.enemies.find(e => !e.dead && distance(e, this.hero) < 215);
      const used = new Set();
      for (let i = 0; i < 3 + this.skills.bubble * 2 && target; i++) {
        used.add(target); this.area(target.x, target.y, 42, 30, 'bubble');
        const prev = target; target = this.enemies.find(e => !e.dead && !used.has(e) && distance(prev, e) < 125);
      }
      this.bubbleCd = 2.7 - this.skills.bubble * .35;
    }
    if (this.skills.clip && this.clipCd <= 0) {
      const targets = this.enemies.filter(e => !e.dead && distance(e, this.hero) < 310).slice(0, 2 + this.skills.clip * 2);
      for (const e of targets) { this.effect('clip', e.x, e.y, 16); this.hurtEnemy(e, 32 + this.skills.clip * 10); }
      this.clipCd = .8;
    }
    if (this.skills.vacuum && this.vacuumCd <= 0) {
      const radius = 155 + this.skills.vacuum * 30;
      for (const e of this.enemies) if (!e.boss && distance(e, this.hero) < radius) { e.x += (this.hero.x - e.x) * .45; e.y += (this.hero.y - e.y) * .45; }
      this.area(this.hero.x, this.hero.y, radius, 26 + this.skills.vacuum * 12, 'vacuum'); this.vacuumCd = 4;
    }
  }
  spawnBoss() {
    this.bossSpawned = true;
    // Reserve one entity slot for the boss even when all horde slots are occupied.
    if (this.enemies.length + this.warnings.length >= W.maxEnemies) {
      if (this.warnings.length) this.warnings.pop(); else this.enemies.pop();
    }
    this.boss = { x: this.hero.x < 240 ? 370 : 110, y: 125, hp: this.config.hp, maxHp: this.config.hp, radius: 38, speed: 24 + this.stage * 3, prop: this.config.prop, boss: true, flash: 0, dead: false, attackCd: 2.4 };
    this.enemies.push(this.boss); this.effect('label', 240, 250, 0, this.config.boss, 2.2); this.emit('boss');
  }
  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue; e.flash = Math.max(0, e.flash - dt);
      const n = unit(this.hero.x - e.x, this.hero.y - e.y);
      e.x += n.x * e.speed * dt; e.y += n.y * e.speed * dt;
      if (distance(e, this.hero) < e.radius + 15) this.hurtHero(e.boss ? 14 : e.heavy ? 10 : 6, e.boss ? this.config.boss : '押し寄せる家事');
      if (e.boss) {
        e.attackCd -= dt;
        if (e.attackCd <= 0) {
          const pattern = this.stage % 3; const count = pattern === 2 ? 4 : pattern === 1 ? 3 : 1;
          for (let i = 0; i < count; i++) this.hazards.push({ x: clamp(this.hero.x + (i - (count - 1) / 2) * 85, 40, 440), y: this.hero.y, r: pattern === 0 ? 92 : 48, life: 1.25, fired: false });
          e.attackCd = e.hp < e.maxHp / 2 ? 2.3 : 3.4; this.emit('warning');
        }
      }
    }
    for (const a of this.hazards) {
      a.life -= dt;
      if (a.life <= 0 && !a.fired) { a.fired = true; this.effect('danger', a.x, a.y, a.r); if (distance(this.hero, a) < a.r + 12) this.hurtHero(16, this.boss ? `${this.config.boss}の予告攻撃` : '散らかった床'); }
    }
    this.hazards = this.hazards.filter(a => a.life > 0);
  }
  updateAllies(dt) {
    this.mama.active = Math.max(0, this.mama.active - dt); this.pochi.active = Math.max(0, this.pochi.active - dt);
    this.mamaCd -= dt; this.pochiCd -= dt;
    if (this.mamaCd <= 0) {
      this.mama.active = 3; this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 18 + this.skills.heart * 5);
      this.area(this.hero.x, this.hero.y, 175, 45, 'heart');
      this.effect('label', this.hero.x, this.hero.y - 65, 0, this.isBedtime ? 'ママ「そっとね」 気力回復' : 'ママ「こっちは任せて！」 気力回復', 2);
      this.mamaCd = 16; this.emit('mama');
    }
    const target = this.drops.find(d => d.life > 0) || ((this.request || this.sideRequest) && this.pochiCd <= 2 ? this.request || this.sideRequest : { x: this.hero.x + 40, y: this.hero.y + 35 });
    const n = unit(target.x - this.pochi.x, target.y - this.pochi.y);
    if (distance(target, this.pochi) > 7) { this.pochi.x += n.x * 190 * dt; this.pochi.y += n.y * 190 * dt; }
    if (this.drops.includes(target) && distance(target, this.pochi) < 24) { this.collect(target); this.pochi.active = 1; }
    if (this.pochiCd <= 0) {
      this.pochi.active = 2; this.pochiCd = 12;
      if (this.familyTask && this.request) { this.request.fill = Math.min(1.5, this.request.fill + .5); this.effect('label', this.pochi.x, this.pochi.y - 30, 0, 'ポチが見つけた！', 1.6); }
      else { this.ultimate = Math.min(100, this.ultimate + 7); this.effect('label', this.pochi.x, this.pochi.y - 30, 0, 'ポチのお届け！', 1.5); }
      this.emit('pochi');
    }
  }
  updateTask(dt) {
    if (!this.familyTask) return;
    this.dangerCd -= dt;
    if (this.dangerCd <= 0) { this.hazards.push({ x: this.hero.x, y: this.hero.y, r: 47, life: 1.65, fired: false }); this.dangerCd = 5; }
    if (this.isBedtime) {
      this.noise = clamp(this.noise + (this.enemies.length > 38 ? 6 : -4) * dt, 0, 100);
      if (this.noise >= 100) { this.child.mood = 'なにか、音がした？'; this.noise = 55; this.child.progress = Math.max(0, this.child.progress - 5); }
    }
    if (!this.request) { this.requestWait -= dt; if (this.requestWait <= 0) this.nextRequest(); return; }
    if (distance(this.hero, this.request) < 46) {
      this.request.fill += dt;
      if (this.request.fill >= 2) {
        this.child.progress = Math.min(100, this.child.progress + (this.isBedtime ? 20 : 34)); this.helped++;
        this.child.mood = this.isBedtime ? ['もう1冊……', 'おみず、ありがとう', 'ふわぁ……', 'ねむくなってきた', 'すう、すう……'][this.helped - 1] : 'できた！';
        this.effect('label', this.child.x, this.child.y - 40, 0, this.isBedtime ? 'すやすや ＋20' : 'お支度できた！', 1.6);
        this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 5); this.request = null; this.requestWait = 2.5; this.emit('help');
        if (this.child.progress >= 100) {
          if (this.isBedtime) { this.completedNight = true; this.state = 'nightEnding'; this.emit('ending'); }
          else if (this.morning === 3) { this.state = 'sendoff'; this.emit('clear'); }
          else { this.morning++; this.state = 'morningRoomIntro'; this.emit('clear'); }
        }
      }
    }
  }
  updateOptionalRequest(dt) {
    if (this.familyTask) return;
    this.sideCd -= dt;
    if (!this.sideRequest && this.sideCd <= 0) {
      this.sideRequest = { x: 360, y: 235, label: this.stage % 2 ? '絵本を探して！' : 'ぬいぐるみ取って！', fill: 0, life: 14 }; this.sideCd = 32;
    }
    const r = this.sideRequest; if (!r) return;
    r.life -= dt;
    if (distance(this.hero, r) < 46) r.fill += dt;
    if (r.fill >= 2) {
      this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 12); this.ultimate = Math.min(100, this.ultimate + 18);
      this.effect('label', r.x, r.y - 35, 0, 'ありがとう！ 気力＋12', 1.8); this.emit('help'); this.sideRequest = null;
    } else if (r.life <= 0) this.sideRequest = null;
  }
  offers() { return SKILLS.filter(s => this.skills[s.id] < 3).slice(0, 5); }
  chooseSkill(id) {
    if (this.state !== 'upgrade' || !SKILLS.some(s => s.id === id) || this.skills[id] >= 3) return false;
    this.skills[id]++;
    if (id === 'heart') { this.hero.maxEnergy += 20; this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 35); }
    this.stage++; this.state = 'roomIntro'; return true;
  }
  beginMorning() {
    if (!this.completedNight || !['nightEnding', 'result'].includes(this.state)) return false;
    this.route = 'morning'; this.morning = 0; this.morningElapsed = 0;
    this.hero.energy = this.hero.maxEnergy; this.ultimate = 100; this.state = 'morningIntro'; return true;
  }
  beginCommute() {
    if (this.state !== 'sendoff') return false;
    this.clearRoom(); this.state = 'commute'; this.hero.y = 550; return true;
  }
}
