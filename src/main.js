import {CONFIG as C} from './config.js';
import {Game} from './game.js';
import {createInput} from './input.js';
import {render} from './render.js';
import {AudioCues} from './audio.js';

const $=id=>document.getElementById(id),game=new Game(),audio=new AudioCues(),canvas=$('game'),ctx=canvas.getContext('2d');
let last=performance.now(),visualTime=0,previousState='',selection=0,effects=C.screenShake;

const input=createInput(()=>game.state==='playing',togglePause,command);
function transition(){input.clear();previousState='';last=performance.now();ui();}
function togglePause(){if(game.state==='playing')game.pause();else if(game.state==='paused')game.resume();transition();}
function action(){
  audio.unlock();
  if(game.state==='title')game.showInstructions();
  else if(game.state==='instructions')game.startRun();
  else if(game.state==='paused')game.resume();
  else if(game.state==='bossIntro')game.spawnBoss();
  else if(game.state==='result'){game.reset();game.showInstructions();}
  transition();canvas.focus({preventScroll:true});
}
function chooseUpgrade(index){if(game.chooseUpgrade(index)){transition();canvas.focus({preventScroll:true});}}
function paintSelection(){document.querySelectorAll('[data-upgrade]').forEach((b,i)=>{b.classList.toggle('selected',i===selection);b.setAttribute('aria-current',String(i===selection));});}
function command(code){
  const enter=code==='Enter'||code==='NumpadEnter';
  if(game.state==='upgrade'){
    const digit=/^(?:Digit|Numpad)([1-3])$/.exec(code);if(digit){chooseUpgrade(Number(digit[1])-1);return true;}
    if(['ArrowLeft','KeyA','ArrowUp','KeyW'].includes(code)){selection=(selection+2)%3;paintSelection();document.querySelector(`[data-upgrade="${selection}"]`)?.focus({preventScroll:true});return true;}
    if(['ArrowRight','KeyD','ArrowDown','KeyS'].includes(code)){selection=(selection+1)%3;paintSelection();document.querySelector(`[data-upgrade="${selection}"]`)?.focus({preventScroll:true});return true;}
    if(enter){chooseUpgrade(selection);return true;}return false;
  }
  if(enter&&['title','instructions','paused','bossIntro','result'].includes(game.state)){action();return true;}
  return false;
}

$('action').onclick=action;$('to-title').onclick=()=>{game.reset();transition();};$('pause').onclick=togglePause;
$('sound').onclick=async()=>{audio.muted=!audio.muted;await audio.unlock();$('sound').textContent=audio.muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!audio.muted));};
$('shake').onclick=()=>{effects=!effects;$('shake').textContent=effects?'揺れ ON':'揺れ OFF';$('shake').setAttribute('aria-pressed',String(effects));$('shake').setAttribute('aria-label',effects?'画面揺れを切る':'画面揺れを入れる');};

function menu(){
  $('upgrade-choices').hidden=game.state!=='upgrade';$('result-stats').hidden=game.state!=='result';$('to-title').hidden=game.state!=='result';$('action').hidden=game.state==='upgrade';
  if(game.state==='title'){$('badge').textContent='魔王商事 / 17:45';$('heading').textContent='定時で帰りたい勇者';$('message').textContent='仕事の魔物を倒し、能力を強化し、魔王部長から退勤を勝ち取ろう。';$('action').textContent='冒険を始める';$('hint').textContent='Enterで操作説明へ';}
  else if(game.state==='instructions'){$('badge').textContent='操作説明';$('heading').textContent='向いて、斬って、かわす。';$('message').textContent='移動：WASD / 方向キー\n攻撃：J / Space（押し続けても連続攻撃）\n回避：K　盾：L　必殺技：I\n黄色・赤・紫の予告を見たら移動か回避。';$('action').textContent='第1ラッシュ開始';$('hint').textContent='時計はまだ止まっています / Enterで開始';}
  else if(game.state==='paused'){$('badge').textContent='一時停止';$('heading').textContent='休憩中';$('message').textContent='時計・敵・弾・予告はすべて停止しています。';$('action').textContent='戦闘へ戻る';$('hint').textContent='EnterまたはEscで再開 / 移動キーは押し直してください';}
  else if(game.state==='upgrade'){
    $('badge').textContent=`第${game.wave}ラッシュ突破`; $('heading').textContent='働き方を1つ強化';$('message').textContent='選んだ能力はボス戦まで残ります。コーヒーも出現！';$('hint').textContent='1〜3で即決 / ←→・A D＋Enterで選択';
    $('upgrade-choices').replaceChildren();game.offers.forEach((id,i)=>{const u=C.upgrades[id],b=document.createElement('button');b.dataset.upgrade=i;b.innerHTML=`<b>${i+1}. ${u.name}</b><small>${u.detail}</small>`;b.onclick=()=>chooseUpgrade(i);b.onfocus=()=>{selection=i;paintSelection();};$('upgrade-choices').append(b);});selection=0;paintSelection();
  }else if(game.state==='bossIntro'){$('badge').textContent='FINAL / 17:45からの最終決戦';$('heading').textContent='魔王部長、登場';$('message').textContent='「最後に、ちょっといい？」\n突進を机へ誘導し、会議の円から逃げて反撃せよ。';$('action').textContent='最終確認を始める';$('hint').textContent='ボス撃破後、右上の退勤ゲート到達でクリア';}
  else if(game.state==='result'){
    const success=game.outcome==='success';$('badge').textContent=success?'定時退勤！':'残業発生';$('heading').textContent=success?'魔王商事から脱出成功':'今日は帰れなかった…';
    $('message').textContent=success?'強化の組み合わせを変えて、もっと鮮やかな退勤へ。':game.reason==='energy'?'気力が尽きました。盾と回避を使い分けよう。':'18:00になりました。まとめ斬りと必殺技で時間短縮！';
    const upgrades=game.upgrades.map(id=>C.upgrades[id].name).join('、')||'なし';$('result-stats').innerHTML=`<div><dt>結果</dt><dd>${success?'成功':'失敗'}</dd></div><div><dt>経過時間</dt><dd>${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')}</dd></div><div><dt>倒した敵</dt><dd>${game.kills}体</dd></div><div><dt>被弾</dt><dd>${game.hitsTaken}回</dd></div><div class="wide"><dt>取得強化</dt><dd>${upgrades}</dd></div>`;
    $('action').textContent='もう一度';$('hint').textContent='Enterで操作説明から再挑戦';
  }
  const target=game.state==='upgrade'?document.querySelector('[data-upgrade="0"]'):$('action');target?.focus({preventScroll:true});
}

function ui(){
  const h=game.hero;$('timer').textContent=game.timeText;$('clock').textContent=`${game.clock} → 18:00`;$('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;
  $('energy-text').textContent=`${Math.ceil(h.energy)} / ${C.hero.energy}`;$('energy-bar').style.transform=`scaleX(${h.energy/C.hero.energy})`;
  $('ultimate-text').textContent=game.ultimate>=100?'使用可能！':`${Math.floor(game.ultimate)}%`;$('ultimate-bar').style.transform=`scaleX(${game.ultimate/C.ultimate.max})`;
  $('shield-text').textContent=`有給の盾 ×${h.shields}${h.shieldLeft>0?'（発動中）':''}`;$('wave-text').textContent=game.wave===4?'魔王部長戦':game.wave?`第${game.wave}ラッシュ`:'出勤前';
  $('owned-upgrades').innerHTML=game.upgrades.length?game.upgrades.map(id=>`<span>${C.upgrades[id].name}</span>`).join(''):'<span>まだなし</span>';
  const boss=game.boss&&!game.boss.dead?game.boss:null;$('boss-hud').hidden=!boss;if(boss){$('boss-bar').style.transform=`scaleX(${boss.hp/boss.maxHp})`;$('boss-hp').textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;$('boss-name').textContent=boss.enraged?'魔王部長「最終確認」':'魔王部長';}
  $('pause').disabled=game.state!=='playing';document.querySelector('.ultimate-button').classList.toggle('ready',game.ultimate>=100);
  $('battle-banner').hidden=!game.banner;if(game.banner){$('battle-banner').querySelector('b').textContent=game.banner.title;$('battle-banner').querySelector('span').textContent=game.banner.detail;}
  let status=game.notice||'敵をすべて倒そう';if(game.state==='playing'){
    if(h.shieldLeft>0)status=`有給の盾 発動中 ${h.shieldLeft.toFixed(1)}秒`;
    else if(h.dashLeft>0)status='既読スルーダッシュ：無敵！';
    else if(game.phase==='escape')status='魔王部長撃破！ 右上の退勤ゲートへ';
    else if(game.boss?.state==='stunned')status=`魔王部長が気絶中 ${game.boss.left.toFixed(1)}秒：攻撃のチャンス！`;
  }
  $('status').textContent=status;$('status').className='status '+(h.hurtFlash>0?'danger':game.phase==='escape'?'clear':'');
  if(previousState===game.state)return;previousState=game.state;input.clear();$('overlay').hidden=game.state==='playing';if(game.state!=='playing')menu();
}

function frame(now){const dt=Math.min((now-last)/1000,C.maxDelta);last=now;game.update(dt,input.read());visualTime+=dt;render(ctx,game,visualTime,effects);ui();for(const e of game.events.splice(0))audio.play(e);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
export {game,input,ui,action,chooseUpgrade};
