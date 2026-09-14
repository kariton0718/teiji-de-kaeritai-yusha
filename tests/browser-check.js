import {game,input} from '../src/main.js';
import {CONFIG as C,center} from '../src/config.js';
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
function assert(ok,message){if(!ok)throw Error(message);}
function log(message){const li=parent.document.createElement('li');li.textContent=message;parent.document.querySelector('#results').append(li);}
const key=(type,code)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
const pointer=(target,type,id=1,extra={})=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:target.getBoundingClientRect().x+10,clientY:target.getBoundingClientRect().y+10,bubbles:true,...extra}));
try{
  $('action').click();await paint();assert(game.state==='playing'&&$('overlay').hidden,'start');log('PASS 開始ボタンで実ゲーム開始');
  let x=game.hero.x;key('keydown','KeyD');await sleep(120);key('keyup','KeyD');assert(game.hero.x>x,'WASD movement');x=game.hero.x;await sleep(80);assert(game.hero.x===x,'keyup');log('PASS WASD移動・キーを離すと停止');
  let y=game.hero.y;key('keydown','ArrowUp');await sleep(120);key('keyup','ArrowUp');assert(game.hero.y<y,'arrow movement');log('PASS 方向キー移動');
  // Synthetic pointers do not create native capture; temporarily stub capture only.
  const b=document.querySelector('[data-dir="left"]'),capture=b.setPointerCapture;b.setPointerCapture=()=>{};
  pointer(b,'pointerdown');x=game.hero.x;await sleep(100);assert(game.hero.x<x,'screen hold');pointer(b,'pointerup');assert(input.read().x===0,'pointerup');
  pointer(b,'pointerdown');pointer(b,'pointercancel');assert(input.read().x===0,'pointercancel');
  pointer(b,'pointerdown');pointer(b,'pointermove',1,{clientX:-10});assert(input.read().x===0,'outside');b.setPointerCapture=capture;log('PASS 画面ボタン長押し／pointerup／cancel／範囲外で解除（合成入力）');
  key('keydown','KeyD');window.dispatchEvent(new Event('blur'));const remaining=game.remaining;await sleep(140);assert(game.state==='paused'&&game.remaining===remaining&&input.read().x===0,'blur pause');await paint();assert(!$('overlay').hidden,'pause screen');$('action').click();await paint();assert(game.state==='playing','resume');log('PASS フォーカス喪失で入力解除・時計停止、再開ボタン');
  game.elapsed=2;game.boss={...game.hero};await paint();assert(game.catches===1&&game.stun>0&&$('status').textContent.includes('−3秒'),'contact UI');log('PASS 接触：吹き出し描画・−3秒・足止め');
  game.pause();let stun=game.stun;await sleep(120);assert(game.stun===stun,'stun paused');game.resume();await sleep(1300);assert(game.protection>0&&game.catches===1,'protection');log('PASS 足止め中の一時停止・解除後の保護表示');
  game.hero=center(C.exit);game.boss=center(C.bossStart);await paint();assert(game.outcome==='success'&&$('heading').textContent==='定時退勤！','success UI');log('PASS 実画面に成功結果');
  $('action').click();await paint();assert(game.catches===0&&game.remaining>29&&game.stun===0,'retry');log('PASS 再挑戦ボタンで状態初期化');
  game.remaining=.001;await paint();assert(game.outcome==='failure'&&$('message').textContent.includes('議事録'),'failure UI');log('PASS 時間切れ・議事録の失敗画面');
  for(let i=0;i<3;i++){$('action').click();await paint();assert(game.state==='playing'&&game.catches===0,'repeat');game.remaining=0;await paint();}log('PASS 連続3回の再挑戦');
  assert(document.documentElement.scrollWidth<=390,'mobile horizontal overflow');log('PASS 幅390pxの横はみ出しなし');log('完了：全ブラウザーテスト成功');
}catch(e){log('FAIL '+e.message);console.error(e);}
