import { artURL } from './character-art.js?v=0.4.1';
import { categories, profilesFor } from './bestiary-data.js?v=0.4.1';

export function mountBestiary(parent) {
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const root = el('section', 'bestiary'); root.id = 'bestiary';
  root.setAttribute('aria-label', 'おうちのキャラクター図鑑');
  root.append(el('p', 'eyebrow', 'CHARACTER BOOK'), el('h2', '', 'おうちのキャラクター図鑑'),
    el('p', 'bestiary-lead', '頼れる家族も、手ごわい家事も。今夜の冒険で出会う仲間たち。'));
  const filters = el('div', 'bestiary-filters'); filters.setAttribute('aria-label', 'キャラクターの種類');
  const nav = el('div', 'bestiary-navigation');
  const prev = el('button', '', '← 前へ'), next = el('button', '', '次へ →'), count = el('span', 'bestiary-count');
  prev.type = next.type = 'button'; prev.setAttribute('aria-label', '前のキャラクター'); next.setAttribute('aria-label', '次のキャラクター');
  count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-atomic', 'true');
  nav.append(prev, count, next);
  const rail = el('div', 'bestiary-rail'); rail.tabIndex = 0; rail.setAttribute('aria-label', 'キャラクター一覧。左右キーまたはスワイプで移動');
  root.append(filters, nav, rail, el('p', 'bestiary-hint', '← 横にスワイプ・左右の矢印でめくれます →'));
  parent.append(root);
  let group = 'all', index = 0, cards = [];
  const update = () => {
    count.textContent = (index + 1) + ' / ' + cards.length;
    prev.disabled = index === 0; next.disabled = index === cards.length - 1;
  };
  const move = delta => {
    index = Math.max(0, Math.min(cards.length - 1, index + delta));
    rail.scrollTo({left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: 'auto'});
    update();
  };
  const tabs = categories.map(([id, name]) => {
    const b = el('button', '', name); b.type = 'button';
    b.addEventListener('click', () => { group = id; render(); }); filters.append(b); return {id, b};
  });
  function render() {
    rail.replaceChildren(); index = 0;
    cards = profilesFor(group).map(profile => {
      const card = el('article', 'bestiary-card');
      const img = el('img', ''); img.src = artURL(profile.artId || profile.id); img.alt = profile.name;
      img.width = img.height = 512; img.loading = 'lazy'; img.decoding = 'async';
      const caption = el('div', 'bestiary-copy');
      caption.append(el('small', 'bestiary-place', profile.where), el('h3', '', profile.name),
        el('p', 'bestiary-quote', '「' + profile.quote + '」'), el('p', '', profile.description));
      if (profile.companion) {
        const pair = el('div','bestiary-pair'), second = el('img',''); second.src = artURL(profile.companion); second.alt = '女の子'; second.width=second.height=512; second.loading='lazy';
        pair.append(img,second); card.append(pair,caption);
      } else card.append(img, caption);
      rail.append(card); return card;
    });
    for (const {id, b} of tabs) b.setAttribute('aria-pressed', String(id === group));
    rail.scrollLeft = 0; update();
  }
  prev.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
  rail.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); event.stopPropagation(); move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  rail.addEventListener('scroll', () => {
    if (!cards.length) return;
    const left = rail.scrollLeft + cards[0].offsetLeft;
    index = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - left) < Math.abs(cards[best].offsetLeft - left) ? i : best, 0);
    update();
  }, {passive: true});
  render();
  return root;
}
