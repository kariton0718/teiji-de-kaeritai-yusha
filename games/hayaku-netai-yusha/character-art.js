export const MOB_TYPES = ['block', 'plate', 'sock', 'bubble', 'bag', 'star', 'pillow', 'bread'];
export const BOSS_TYPES = MOB_TYPES.slice(0, 5);
export const ART_IDS = [...MOB_TYPES.map(p => 'mob-' + p), ...BOSS_TYPES.map(p => 'boss-' + p), 'hero', 'mama', 'pochi', 'child', 'child-sleep'];
export const artURL = id => new URL('./assets/characters/' + id + '.webp', import.meta.url).href;

// Load once, never gate game progress on image/network availability.
export class CharacterArt {
  constructor(makeImage = () => new Image(), timeout = 12000) {
    this.images = new Map();
    this.failed = new Set();
    this.ready = Promise.all(ART_IDS.map(id => new Promise(resolve => {
      let image, timer, done = false;
      const finish = ok => {
        if (done) return;
        done = true; clearTimeout(timer);
        if (ok) this.images.set(id, image); else this.failed.add(id);
        if (image) { image.onload = null; image.onerror = null; }
        resolve();
      };
      try {
        image = makeImage();
        image.onload = () => finish(image.naturalWidth > 0);
        image.onerror = () => finish(false);
        timer = setTimeout(() => finish(false), timeout);
        image.src = artURL(id);
      } catch { finish(false); }
    })));
  }
  get(id) { return this.images.get(id); }
}
