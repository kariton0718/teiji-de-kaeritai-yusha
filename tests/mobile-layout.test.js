import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('title uses new square key art and readable SVG logo',()=>{
  const titleCss=readFileSync(new URL('../title-art.css',import.meta.url),'utf8');
  assert.match(html,/id="title-art"[^>]*src="assets\/title-keyart-v3.webp"/);
  assert.equal((html.match(/assets\/title-logo-v3.svg/g)||[]).length,2);
  assert.match(titleCss,/#title-cast\{display:none!important\}/);
  assert.match(titleCss,/height:auto;aspect-ratio:1;object-fit:contain/);
  assert.ok(readFileSync(new URL('../assets/title-keyart-v3.webp',import.meta.url)).length>10000);
  const logo=readFileSync(new URL('../assets/title-logo-v3.svg',import.meta.url),'utf8');
  assert.match(logo,/>定時で帰りたい<\/text>/);assert.match(logo,/>勇者<\/text>/);
});
test('pause is unique and in an external dock after the status strip',()=>{
  assert.equal((html.match(/id="pause"/g)||[]).length,1);
  assert.ok(html.indexOf('class="pause-dock"')>html.indexOf('id="status"'));
  assert.match(html,/<nav class="pause-dock"[^>]*><button id="pause"/);
  assert.doesNotMatch(html.match(/<div class="hud-buttons">.*?<\/div>/)[0],/id="pause"/);
});
test('square story crop preserves source aspect ratio in all four panels',()=>{
  const square=css.slice(css.indexOf('/* Each source'));
  assert.match(square,/aspect-ratio:1;height:auto;max-height:none/);
  assert.match(square,/width:355\.555556%;height:200%/);
  assert.ok(Math.abs((355.555556/200)-(1200/675))<1e-7);
  assert.match(square,/overflow-y:auto/);
  assert.match(square,/\.q2 img\{left:-216\.666667%;transform:none/);
  assert.match(square,/\.q3 img\{top:-100%;transform:none/);
  assert.match(square,/\.q4 img\{left:-216\.666667%;top:-100%;transform:none/);
});
