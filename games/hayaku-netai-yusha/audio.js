// Original synthesized score. No external audio, requests, or licensed recordings.
export class HomeAudio {
  constructor() { this.enabled = false; this.ctx = null; this.step = 0; this.left = 0; this.mode = 'night'; }
  toggle() {
    if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; this.ctx = new AC(); }
    this.enabled = !this.enabled;
    if (this.enabled) this.ctx.resume().catch(() => {});
    return this.enabled;
  }
  tone(frequency, duration = .15, volume = .025, type = 'sine') {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = frequency; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(volume, now + .015); g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + duration + .02); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  update(dt, mode) {
    if (!this.enabled) return; this.left -= dt; if (this.left > 0) return;
    if (this.mode !== mode) { this.mode = mode; this.step = 0; }
    const quiet = ['bed', 'ending', 'story'].includes(mode); const morning = mode === 'morning';
    const melody = quiet ? [0, 4, 7, 11, 7, 4, 2, 7] : morning ? [0, 7, 12, 11, 7, 4, 9, 7, 4, 7, 11, 12, 14, 12, 7, 4] : [0, 4, 7, 12, 11, 7, 4, 2, 5, 9, 12, 14, 12, 9, 7, 4];
    const base = quiet ? 220 : 196; const note = melody[this.step % melody.length];
    this.tone(base * 2 ** (note / 12), quiet ? .85 : .3, quiet ? .017 : .022, 'sine');
    if (this.step % 4 === 0) this.tone(base / 2 * (this.step % 16 < 8 ? 1 : 4 / 3), quiet ? 1.3 : .5, .018, 'triangle');
    if (!quiet && this.step % 2 === 0) this.tone(75, .09, .02, 'sine');
    this.step++; this.left = quiet ? .55 : morning ? .18 : .23;
  }
  event(type) {
    if (type === 'sweep') this.tone(370, .07, .01, 'triangle');
    if (type === 'combo') { this.tone(660, .13, .025); this.tone(880, .22, .02); }
    if (type === 'hurt') this.tone(110, .2, .025, 'triangle');
    if (['help', 'mama', 'pochi', 'collect'].includes(type)) this.tone(type === 'pochi' ? 590 : 780, .18, .017);
    if (['clear', 'ending', 'ultimate'].includes(type)) for (const f of [330, 440, 554, 660]) this.tone(f, .7, .02);
    if (type === 'warning') this.tone(260, .13, .014, 'triangle');
  }
}
