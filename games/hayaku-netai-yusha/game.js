import { WORLD as W, NIGHT, MORNING, SKILLS } from './config.js?v=0.6.2';
import { MOBS, NIGHT_MIX, MORNING_MIX, SECRET_MIX, HOSTILE_DAMAGE_SCALE, ITEMS, SECRET_BOSS } from './combat-data.js?v=0.6.2';
import { updateEnemies, updateProjectiles, extraSkills, shot, hazard } from './combat.js?v=0.6.2';
import { ULTIMATES, activateUltimate, updateUltimate } from './ultimates.js?v=0.6.2';
import { nextBedRequest, updateBedtime } from './bedtime.js?v=0.6.2';
import { updateGuests, resetGuests } from './guests.js?v=0.6.2';
import { updateCommute } from './commute.js?v=0.6.2';
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
    this.skills = { mop: 1, bubble: 1, vacuum: 0, clip: 0, heart: 0, iron: 0, towel: 0, meteor: 0 };
    this.secretActive = false; this.secretDefeated = false;
    this.elapsed = 0; this.nightElapsed = 0; this.morningElapsed = 0; this.kills = 0;
    this.ultimate = 35; this.ultimateId='close'; this.ultimateLock=0; this.ultimateActive=null; this.chargeBudget=3; this.combo = 0; this.comboLife = 0; this.bestCombo = 0;
    this.completedNight = false; this.completedMorning = false; this.cause = '';
    this.events = []; this.clearRoom();
  }
  clearRoom() {
    this.ultimateActive=null;
    this.bedKids=[{x:185,y:145},{x:295,y:145}];this.bedAttackCd=3;this.bedTurn=0;this.bedBanner='';this.bedBannerLife=0;this.bedSpeechLife=0;this.bedSpeaker=0;
    this.enemies = []; this.effects = []; this.drops = []; this.hazards = []; this.warnings = [];
    this.projectiles = []; this.falls = []; this.zones = []; this.buffs = { shoes: 0, gloves: 0, apron: 0 };
    this.skillCds = { iron: 1, towel: 1, meteor: 2 }; this.mamaSweepCd = 3;
    this.lastPickup = ''; this.pickupLife = 0;
    this.stageKills = 0; this.roomTime = 0; this.spawnCd = .8; this.attackCd = 0; this.mopCombo = 0;
    this.bubbleCd = 1; this.vacuumCd = 2; this.clipCd = 1; this.mamaCd = 9; this.pochiCd = 3;
    this.boss = null; this.bossSpawned = false; this.request = null; this.requestIndex = 0;
    this.noise = 0; this.requestWait = 0; this.dangerCd = 3; this.helped = 0;
    this.firstWave = true; this.sideRequest = null; this.sideCd = 13;
    this.hero.x = 240; this.hero.y = 430; this.hero.invulnerable = 2;
    resetGuests(this); this.secretIntroTime = 0;
  }
  get enemyLimit() { return this.secretActive ? 176 : W.maxEnemies; }
  get config() { return this.secretActive ? SECRET_BOSS : this.route === 'morning' ? MORNING[this.morning] : NIGHT[this.stage]; }
  get familyTask() { return !this.secretActive && (this.route === 'morning' || this.stage === 5); }
  get isBedtime() { return this.route === 'night' && this.stage === 5; }
  get bedPhase() { return 1+Math.min(2,Math.floor(this.helped/2)); }
  get ultimateOptions() { return ULTIMATES; }
  get ultimateName() { return ULTIMATES.find(s=>s.id===this.ultimateId).name; }
  selectUltimate(id) { if(!['intro','roomIntro','morningIntro','morningRoomIntro'].includes(this.state)||!ULTIMATES.some(s=>s.id===id))return false;this.ultimateId=id;return true; }
  gainUltimate(amount,source='support') {
    if(this.ultimateLock>0||this.ultimateActive||source==='ultimate')return;
    if(source==='kill'){amount=Math.min(amount,this.chargeBudget);this.chargeBudget-=amount;}
    this.ultimate=Math.min(100,this.ultimate+amount);
  }
  get progress() {
    if (this.secretActive) return this.boss ? Math.max(0, 100 - this.boss.hp / this.boss.maxHp * 100) : 0;
    if (this.familyTask) return this.child.progress;
    return Math.min(100, this.stageKills / this.config.quota * 100);
  }
  begin() { this.reset(); this.state = 'intro'; }
  startBedtimeIntro() {
    if (!this.isBedtime || this.secretActive) return false;
    this.clearRoom(); this.bedtimeIntroTime=0; this.state='bedtimeIntro'; this.emit('room'); return true;
  }
  enterRoom() {
    this.secretActive = false;
    this.clearRoom(); this.child.progress = 0; this.child.mood = this.isBedtime ? 'もう1冊、読んで？' : this.config.child || 'がんばれ！';
    this.state = 'playing'; if (this.familyTask) this.nextRequest();
    this.emit('room');
  }
  emit(type) { this.events.push(type); if (this.events.length > 30) this.events.shift(); }
  effect(kind, x, y, radius = 30, text = '', life = .5) {
    if (this.effects.length >= W.maxEffects) this.effects.shift();
    this.effects.push({ kind, x, y, radius, text, life, maxLife: life });
  }
  spawn(count, prop = null) {
    const mix = this.secretActive ? SECRET_MIX : this.route === 'morning' ? MORNING_MIX[this.morning] : NIGHT_MIX[this.stage];
    for (let i = 0; i < count && this.enemies.length + this.warnings.length < this.enemyLimit; i++) {
      const side = Math.floor(this.random() * 4);
      let p = { x: side < 2 ? 22 + side * 436 : 24 + this.random() * 432, y: side >= 2 ? 62 + (side - 2) * 518 : 65 + this.random() * 510 };
      if (distance(p, this.hero) < 120) p = { x: this.hero.x < 240 ? 453 : 27, y: 80 + this.random() * 470 };
      const type = prop || mix[Math.floor(this.random() * mix.length)];
      this.warnings.push({ ...p, life: .85 + this.random() * .5, prop: type, heavy: MOBS[type]?.behavior === 'tank' });
    }
  }
  hurtEnemy(e, damage, push = 0, source = 'normal') {
    if (!e || e.dead) return;
    e.hp -= damage * (this.buffs.gloves > 0 ? 1.6 : 1); e.flash = .12;
    if (e.behavior === 'tank') push *= .25;
    if (e.boss) push *= .08;
    if (push) { const n = unit(e.x - this.hero.x, e.y - this.hero.y); e.x = clamp(e.x + n.x * push, 22, 458); e.y = clamp(e.y + n.y * push, 65, 584); }
    if (e.hp > 0) return;
    e.dead = true; this.kills++; this.stageKills++; this.combo++; this.comboLife = 2.2;
    this.bestCombo = Math.max(this.bestCombo, this.combo); this.gainUltimate(e.boss?8:.45,source==='ultimate'?'ultimate':'kill');
    if(this.isBedtime&&this.request?.kind==='tidy'&&distance(e,this.request)<145)this.request.kills++;
    this.effect('tidy', e.x, e.y, 13, '', .7);
    if (this.combo % 15 === 0) { this.effect('label', this.hero.x, this.hero.y - 50, 0, `${this.combo} 家事コンボ！`, 1.1); this.emit('combo'); }
    if (this.random() < .045 && this.drops.length < W.maxDrops) {
      const pool = ['rice', 'rice', 'milk', 'shoes', 'gloves', 'apron'];
      this.drops.push({ x: e.x, y: e.y, life: 16, kind: pool[Math.floor(this.random() * pool.length)], source });
    }
    this.emit('tidy');
  }
  area(x, y, radius, damage, kind = 'sweep', push = 0, source = 'normal') {
    this.effect(kind, x, y, radius);
    for (const e of this.enemies) if (!e.dead && distance({ x, y }, e) < radius + e.radius) this.hurtEnemy(e, damage, push, source);
  }
  useUltimate() {
    return activateUltimate(this);
  }
  hurtHero(damage, source) {
    if (this.state !== 'playing' || this.hero.invulnerable > 0) return;
    damage=Math.ceil(damage*HOSTILE_DAMAGE_SCALE*(this.secretActive?1.35:1));
    if (this.buffs.apron > 0) damage = Math.ceil(damage / 2);
    if(this.ultimateActive?.id==='family')damage=Math.ceil(damage*.5);
    if(this.isBedtime&&this.request?.kind==='sing')this.request.fill=Math.max(0,this.request.fill-.6);
    this.hero.energy = Math.max(0, this.hero.energy - damage); this.hero.invulnerable = .85;
    this.effect('label', this.hero.x, this.hero.y - 32, 0, `気力 −${damage}`, .8); this.emit('hurt');
    if (this.hero.energy <= 0) { this.cause = `${source}で気力を使い切った。`; this.state = 'defeat'; }
  }
  nextRequest() {
    if(this.isBedtime){nextBedRequest(this);return;}
    const spots = [{ x: 105, y: 215 }, { x: 375, y: 250 }, { x: 120, y: 405 }, { x: 360, y: 440 }, { x: 240, y: 295 }];
    const p = spots[this.requestIndex % spots.length];
    const label = this.config.request;
    this.request = { ...p, label, fill: 0 }; this.requestIndex++;
  }
  collect(drop) {
    if (drop.life <= 0) return;
    const beforeCharge=this.ultimate;
    drop.life = 0;
    if (drop.kind === 'heart' || drop.kind === 'rice') this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + (drop.kind === 'rice' ? 25 : 9));
    else if (drop.kind in this.buffs) this.buffs[drop.kind] = 8;
    else this.gainUltimate(drop.kind==='milk'?12:5,drop.source);
    this.lastPickup = ITEMS[drop.kind] ? `${ITEMS[drop.kind].name}：${ITEMS[drop.kind].label}` : 'ポチのお届け！'; this.pickupLife = 2.5;
    if(drop.kind==='milk')this.lastPickup=this.ultimate>beforeCharge?`ホットミルク：必殺＋${Math.round(this.ultimate-beforeCharge)}`:drop.source==='ultimate'?'必殺で出たミルク：充填対象外':'ホットミルク：現在は充填できません';
    this.effect('label', this.hero.x, this.hero.y - 60, 0, drop.kind==='milk'?this.lastPickup:ITEMS[drop.kind]?.label || '回復！', 1.4);
    this.effect('heart', drop.x, drop.y, 20); this.emit('collect');
  }
  update(dt, input = {}) {
    if (this.state === 'bedtimeIntro') {
      this.bedtimeIntroTime += clamp(dt,0,.05);
      if(this.bedtimeIntroTime >= 6.6) this.enterRoom();
      return;
    }
    if (this.state === 'secretIntro') {
      this.secretIntroTime += clamp(dt,0,.05);
      const beat = Math.floor(this.secretIntroTime / 1.8);
      if(beat !== this.secretIntroBeat){this.secretIntroBeat=beat;this.emit('secretBell');}
      if(this.secretIntroTime >= 7.2) this.enterSecretBattle();
      return; // Cinematic never consumes the morning clock or deals damage.
    }
    if (this.state !== 'playing' && this.state !== 'commute') return;
    dt = clamp(dt, 0, .05); this.elapsed += dt;
    if (this.route === 'night') this.nightElapsed += dt; else this.morningElapsed += dt;
    if (this.nightElapsed > 720 && this.route === 'night') { this.cause = '夜ふかしで眠気が限界に。'; this.state = 'defeat'; return; }
    if (this.morningElapsed > 240 && this.route === 'morning' && !this.secretDefeated) { this.cause = '朝の支度に時間がかかり、遅刻してしまった。'; this.state = 'defeat'; return; }
    const h = this.hero; h.invulnerable = Math.max(0, h.invulnerable - dt);
    for (const k in this.buffs) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    this.pickupLife = Math.max(0, this.pickupLife - dt);
    const n = unit(input.x || 0, input.y || 0); const moving = Boolean(input.x || input.y);
    const speed = this.buffs.shoes > 0 ? 245 : 177;
    if (moving && this.state!=='commute') { h.facing = n; h.x = clamp(h.x + n.x * speed * dt, 24, 456); h.y = clamp(h.y + n.y * speed * dt, 74, 580); }
    this.effects.forEach(e => e.life -= dt); this.effects = this.effects.filter(e => e.life > 0);
    if (this.state === 'commute') {
      updateCommute(this,dt,input);
      return;
    }
    this.roomTime += dt; this.comboLife -= dt; if (this.comboLife <= 0) this.combo = 0;
    updateUltimate(this,dt);
    if (input.ultimate) this.useUltimate();
    this.spawnCd -= dt;
    if (this.spawnCd <= 0) {
      const count = this.secretActive ? this.firstWave?116:44+(this.boss?.phase||1)*8 : this.isBedtime ? this.firstWave?96:this.roomTime<18&&this.bedPhase===1?30:18+this.bedPhase*4 : this.familyTask ? 10 : this.firstWave ? 72 + this.stage * 5 : 20 + this.stage * 3;
      this.firstWave = false; this.spawn(count); this.spawnCd = this.secretActive ? (this.boss?.phase===3?.7:this.boss?.phase===2?.9:1.1) : this.isBedtime ? this.roomTime<18&&this.bedPhase===1?1.8:2.4-this.bedPhase*.3 : this.familyTask ? 3.8 : 2.9;
    }
    for (const w of this.warnings) {
      w.life -= dt; if (w.life > 0) continue;
      const spec = MOBS[w.prop]; const hp = spec.hp * (1 + (this.route === 'night' ? this.stage : 4) * .07);
      this.enemies.push({ ...spec, x: w.x, y: w.y, hp, maxHp: hp, prop: w.prop, heavy: w.heavy, flash: 0, dead: false, attackCd: 1 + this.random() * 1.8, age: this.random() * 6 });
    }
    this.warnings = this.warnings.filter(w => w.life > 0);
    this.attackCd -= dt;
    if (this.attackCd <= 0) {
      const level = this.skills.mop; const finisher = this.mopCombo % 3 === 2;
      const range = 80 + (level - 1) * 28 + (finisher ? 16 + (level - 1) * 5 : 0);
      const target = this.enemies.find(e => !e.dead && distance(h, e) < range + e.radius);
      if (target) {
        if (level < 3) h.facing = unit(target.x - h.x, target.y - h.y);
        const swing = { kind: this.isBedtime ? 'quiet' : finisher ? 'mopFinish' : 'mopSlash',
          x:h.x,y:h.y,radius:range,angle:Math.atan2(h.facing.y,h.facing.x),
          direction:this.mopCombo%2 ? -1 : 1,life:.24,maxLife:.24 };
        if(this.effects.length>=W.maxEffects)this.effects.shift();
        this.effects.push(swing);
        for (const e of this.enemies) {
          if (e.dead || distance(h, e) > range + e.radius) continue;
          const v = unit(e.x - h.x, e.y - h.y);
          if (finisher || level >= 3 || v.x * h.facing.x + v.y * h.facing.y > -.35)
            this.hurtEnemy(e, (finisher ? 42 : 26) + level * 9, finisher ? 34 : 20);
        }
        this.mopCombo++; this.emit(finisher ? 'mopFinish' : 'sweep'); this.attackCd = finisher ? .40 : .31;
      } else this.attackCd = .08;
    }
    this.updateSkills(dt); updateEnemies(this, dt); updateProjectiles(this, dt); if (this.state !== 'playing') return;
    this.updateAllies(dt); this.updateTask(dt); if(this.state!=='playing')return; this.updateOptionalRequest(dt);
    for (const d of this.drops) { d.life -= dt; if (distance(d, h) < 32) this.collect(d); }
    this.drops = this.drops.filter(d => d.life > 0);
    this.enemies = this.enemies.filter(e => !e.dead);
    if (!this.familyTask) {
      if (!this.bossSpawned && this.stageKills >= this.config.quota) this.spawnBoss();
      if (this.boss?.dead) { this.state = this.secretActive ? 'sendoff' : 'upgrade'; if (this.secretActive) this.secretDefeated = true; this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 20); this.emit('clear'); }
    }
  }
  updateSkills(dt) {
    extraSkills(this, dt);
    this.bubbleCd -= dt; this.clipCd -= dt; this.vacuumCd -= dt;
    if (this.skills.bubble && this.bubbleCd <= 0) {
      let target = this.enemies.find(e => !e.dead && distance(e, this.hero) < 155 + (this.skills.bubble - 1) * 40);
      const used = new Set();
      for (let i = 0; i < 4 + this.skills.bubble * 2 && target; i++) {
        used.add(target); this.area(target.x, target.y, 31 + (this.skills.bubble - 1) * 8, 33, 'bubble', 6);
        const prev = target; target = this.enemies.find(e => !e.dead && !used.has(e) && distance(prev, e) < 96 + (this.skills.bubble - 1) * 22);
      }
      this.bubbleCd = 2.4 - this.skills.bubble * .3;
    }
    if (this.skills.clip && this.clipCd <= 0) {
      const targets = this.enemies.filter(e => !e.dead && distance(e, this.hero) < 310).slice(0, 2 + this.skills.clip * 2);
      for (const e of targets) shot(this, this.hero, Math.atan2(e.y - this.hero.y, e.x - this.hero.x), { friendly: true, kind: 'clip', speed: 440, radius: 7, damage: 32 + this.skills.clip * 10, life: 1.1 });
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
    if (this.enemies.length + this.warnings.length >= this.enemyLimit) {
      if (this.warnings.length) this.warnings.pop(); else this.enemies.pop();
    }
    this.boss = { x: this.hero.x < 240 ? 370 : 110, y: 125, hp: this.config.hp * 1.8, maxHp: this.config.hp * 1.8, radius: 38, speed: this.secretActive ? 90 : 36 + this.stage * 4, prop: this.config.prop, boss: true, flash: 0, dead: false, attackCd: 1.2, phase: 1 };
    this.enemies.push(this.boss); this.effect('label', 240, 250, 0, this.config.boss, 2.2); this.emit('boss');
  }
  updateEnemies(dt) {
    updateEnemies(this, dt);
  }
  updateAllies(dt) { updateGuests(this,dt); }
  updateTask(dt) {
    if (!this.familyTask) return;
    if(this.isBedtime){updateBedtime(this,dt);return;}
    this.dangerCd -= dt;
    if (this.dangerCd <= 0) {
      hazard(this, { x: this.hero.x, y: this.hero.y, r: 36 + this.helped * 3, life: 1.65, damage: 10 });
      this.dangerCd = 3.8;
    }
    if (!this.request) { this.requestWait -= dt; if (this.requestWait <= 0) this.nextRequest(); return; }
    if (distance(this.hero, this.request) < 46) {
      this.request.fill += dt;
      if (this.request.fill >= 2) {
        this.child.progress = Math.min(100, this.child.progress + 34); this.helped++;
        this.child.mood = 'できた！';
        this.effect('label', this.child.x, this.child.y - 40, 0, 'お支度できた！', 1.6);
        this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 5); this.request = null; this.requestWait = 2.5; this.emit('help');
        if (this.child.progress >= 100) {
          if (this.morning === 3) { this.startSecretBoss(); }
          else { this.morning++; this.state = 'morningRoomIntro'; this.emit('clear'); }
        }
      }
    }
  }
  updateOptionalRequest(dt) {
    if (this.familyTask || this.secretActive) return;
    this.sideCd -= dt;
    if (!this.sideRequest && this.sideCd <= 0) {
      this.sideRequest = { x: 360, y: 235, label: this.stage % 2 ? '絵本を探して！' : 'ぬいぐるみ取って！', fill: 0, life: 14 }; this.sideCd = 32;
    }
    const r = this.sideRequest; if (!r) return;
    r.life -= dt;
    if (distance(this.hero, r) < 46) r.fill += dt;
    if (r.fill >= 2) {
      this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 12); this.gainUltimate(8);
      this.effect('label', r.x, r.y - 35, 0, 'ありがとう！ 気力＋12', 1.8); this.emit('help'); this.sideRequest = null;
    } else if (r.life <= 0) this.sideRequest = null;
  }
  startSecretBoss() {
    this.clearRoom(); this.secretActive = true; this.state = 'secretIntro';
    this.secretIntroBeat = -1; this.emit('secretBell');
  }
  enterSecretBattle() {
    if(this.state !== 'secretIntro')return false;
    this.state = 'playing'; this.spawnCd = .25; this.firstWave = true;
    this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 30); this.ultimate = 100;
    this.spawnBoss(); this.hero.invulnerable = 3; this.emit('secretBattle');
    return true;
  }
  offers() { return SKILLS.filter(s => this.skills[s.id] < 3); }
  chooseSkill(id) {
    if (this.state !== 'upgrade' || !SKILLS.some(s => s.id === id) || this.skills[id] >= 3) return false;
    this.skills[id]++;
    if (id === 'heart') { this.hero.maxEnergy += 20; this.hero.energy = Math.min(this.hero.maxEnergy, this.hero.energy + 35); }
    this.stage++; this.state = 'roomIntro'; return true;
  }
  beginMorning() {
    if (!this.completedNight || !['nightEnding', 'result'].includes(this.state)) return false;
    this.route = 'morning'; this.morning = 0; this.morningElapsed = 0; this.secretActive = false; this.secretDefeated = false;
    this.hero.energy = this.hero.maxEnergy; this.ultimate = 100; this.state = 'morningIntro'; return true;
  }
  beginCommute() {
    if (this.state !== 'sendoff') return false;
    this.clearRoom(); this.state = 'commute'; this.hero.x=130; this.hero.y = 495;
    this.commuteRun={distance:0,length:1600,arrival:0,phase:0,moving:false};this.emit('commute');return true;
  }
}
