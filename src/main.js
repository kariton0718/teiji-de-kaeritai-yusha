import {CONFIG as C} from './config.js';
import {Game} from './game.js';
import {createInput} from './input.js';
import {render} from './render.js';
import {AudioCues} from './audio.js';

const $=id=>document.getElementById(id),game=new Game(),audio=new AudioCues(),canvas=$('game'),ctx=canvas.getContext('2d');
let last=performance.now(),visualTime=0,previousState='',selection=0,resultSelection=0,effects=C.screenShake;

const input=createInput(()=>game.state==='playing',togglePause,command);
function transition(){input.clear();previousState='';last=performance.now();ui();}
function togglePause(){if(game.state==='playing')game.pause();else if(game.state==='paused')game.resume();transition();}
function action(){
  audio.unlock();
  if(game.state==='title')game.showInstructions();
  else if(game.state==='instructions')game.startRun();
  else if(game.state==='paused')game.resume();
  else if(game.state==='stageIntro')game.enterStage();
  else if(game.state==='bossIntro')game.spawnBoss();
  else if(game.state==='result'){game.reset();game.showInstructions();}
  transition();canvas.focus({preventScroll:true});
}
function chooseUpgrade(index){if(game.chooseUpgrade(index)){transition();canvas.focus({preventScroll:true});}}
function paintSelection(){document.querySelectorAll('[data-upgrade]').forEach((b,i)=>{b.classList.toggle('selected',i===selection);b.setAttribute('aria-current',String(i===selection));});}
function paintResultSelection(){[$('action'),$('to-title')].forEach((b,i)=>{b.classList.toggle('menu-selected',i===resultSelection);b.setAttribute('aria-current',String(i===resultSelection));});}
function command(code){
  const enter=code==='Enter'||code==='NumpadEnter';
  if(game.state==='upgrade'){
    const digit=/^(?:Digit|Numpad)([1-3])$/.exec(code);if(digit){chooseUpgrade(Number(digit[1])-1);return true;}
    if(['ArrowLeft','KeyA','ArrowUp','KeyW'].includes(code)){selection=(selection+2)%3;paintSelection();document.querySelector(`[data-upgrade="${selection}"]`)?.focus({preventScroll:true});return true;}
    if(['ArrowRight','KeyD','ArrowDown','KeyS'].includes(code)){selection=(selection+1)%3;paintSelection();document.querySelector(`[data-upgrade="${selection}"]`)?.focus({preventScroll:true});return true;}
    if(enter){chooseUpgrade(selection);return true;}return false;
  }
  if(game.state==='result'){
    if(['ArrowLeft','ArrowUp','KeyA','KeyW'].includes(code)){resultSelection=(resultSelection+1)%2;paintResultSelection();[$('action'),$('to-title')][resultSelection].focus({preventScroll:true});return true;}
    if(['ArrowRight','ArrowDown','KeyD','KeyS'].includes(code)){resultSelection=(resultSelection+1)%2;paintResultSelection();[$('action'),$('to-title')][resultSelection].focus({preventScroll:true});return true;}
    if(enter){if(resultSelection===0)action();else{game.reset();transition();}return true;}return false;
  }
  if(enter&&['title','instructions','paused','stageIntro','bossIntro'].includes(game.state)){action();return true;}
  return false;
}

$('action').onclick=action;$('action').onfocus=()=>{if(game.state==='result'){resultSelection=0;paintResultSelection();}};$('to-title').onclick=()=>{game.reset();transition();};$('to-title').onfocus=()=>{if(game.state==='result'){resultSelection=1;paintResultSelection();}};$('pause').onclick=togglePause;
$('sound').onclick=async()=>{audio.muted=!audio.muted;await audio.unlock();$('sound').textContent=audio.muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!audio.muted));};
$('shake').onclick=()=>{effects=!effects;$('shake').textContent=effects?'揺れ ON':'揺れ OFF';$('shake').setAttribute('aria-pressed',String(effects));$('shake').setAttribute('aria-label',effects?'画面揺れを切る':'画面揺れを入れる');};

function upgradeButton(id,i){
  const current=game.skillLevel(id),next=current+1,s=C.skills[id],b=document.createElement('button');b.dataset.upgrade=i;
  b.innerHTML=`<span class="upgrade-level">${current===0?'NEW':`Lv.${current} → Lv.${next}`}</span><b>${i+1}. ${s.name}</b><small>現在：${s.levels[current]}</small><em>選択後：${s.levels[next]}</em>`;
  b.onclick=()=>chooseUpgrade(i);b.onfocus=()=>{selection=i;paintSelection();};return b;
}
function menu(){
  $('upgrade-choices').hidden=game.state!=='upgrade';$('result-stats').hidden=game.state!=='result';$('to-title').hidden=game.state!=='result';$('action').hidden=game.state==='upgrade';
  if(game.state==='title'){$('badge').textContent='魔王商事 / 17:45';$('heading').textContent='定時で帰りたい勇者';$('message').textContent='広い斬撃と自動技で仕事をまとめて処理。\n移動・攻撃・必殺技だけで3フロアを突破しよう。';$('action').textContent='冒険を始める';$('hint').textContent='Enterで操作説明へ';}
  else if(game.state==='instructions'){$('badge').textContent='操作説明 / 3つだけ';$('heading').textContent='移動しながら、まとめて斬る。';$('message').textContent='移動：WASD / 方向キー\n攻撃：J / Space（押し続けて連続攻撃）\n全画面必殺：K / I（満タン時）\n赤・紫の予告は通常移動で避けられます。';$('action').textContent='営業フロアへ';$('hint').textContent='時計は停止中 / Enterで開始';}
  else if(game.state==='paused'){$('badge').textContent='一時停止';$('heading').textContent='休憩中';$('message').textContent='時計・敵・弾・予告・自動技はすべて停止しています。';$('action').textContent='戦闘へ戻る';$('hint').textContent='EnterまたはEscで再開 / 移動キーは押し直してください';}
  else if(game.state==='stageIntro'){$('badge').textContent=`STAGE ${game.stage} / 全3フロア`;$('heading').textContent=game.stageName;$('message').textContent=`フロア移動で気力を${Math.round(game.transitionHeal)}回復！\n${game.stageConfig.rule}\n取得した強化はそのまま引き継ぎます。`;$('action').textContent=`${game.stageName}へ進む`;$('hint').textContent='Enterで開始 / 時計は停止中';}
  else if(game.state==='upgrade'){
    $('badge').textContent=`STAGE ${game.stage}・WAVE ${game.wave} 突破 / 強化 ${game.upgradeCount+1}回目`;$('heading').textContent='技を取得・進化';$('message').textContent='同じ技を選ぶとLv.3まで進化。取得直後から見た目と攻撃範囲が変わります。';$('hint').textContent='1〜3で即決 / ←→・A D＋Enterで選択';
    $('upgrade-choices').replaceChildren(...game.offers.map(upgradeButton));selection=0;paintSelection();
  }else if(game.state==='bossIntro'){$('badge').textContent='FINAL / 6回の強化を持って決戦';$('heading').textContent='魔王部長、三段変身';$('message').textContent='第1形態：突進と円形会議\n第2形態：扇状書類弾と増援\n第3形態：連続突進と順番に爆発する床\n攻撃後や机への激突で弱点が露出します。';$('action').textContent='最終確認を始める';$('hint').textContent='撃破後、右上の退勤ゲート到達でクリア';}
  else if(game.state==='result'){
    const success=game.outcome==='success';$('badge').textContent=success?'定時退勤！':'残業発生';$('heading').textContent=success?'魔王商事から脱出成功':'今日は帰れなかった…';
    $('message').textContent=success?'違う技を重ねれば、次はさらに派手な退勤になります。':game.reason==='energy'?'気力が尽きました。赤紫の予告を見て歩いて離れよう。':'18:00になりました。広域技と必殺技で敵集団を早く処理しよう。';
    const skills=game.skillSummary().join('、')||'タスク斬り（初期）';$('result-stats').innerHTML=`<div><dt>結果</dt><dd>${success?'成功':'失敗'}</dd></div><div><dt>経過時間</dt><dd>${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')}</dd></div><div><dt>倒した敵</dt><dd>${game.kills}体</dd></div><div><dt>被弾</dt><dd>${game.hitsTaken}回</dd></div><div class="wide"><dt>取得・進化した技</dt><dd>${skills}</dd></div>`;
    $('action').textContent='もう一度';$('hint').textContent='←→／↑↓＋Enterで選択';resultSelection=0;paintResultSelection();
  }
  const target=game.state==='upgrade'?document.querySelector('[data-upgrade="0"]'):$('action');target?.focus({preventScroll:true});
}

function ui(){
  const h=game.hero;$('timer').textContent=game.timeText;$('clock').textContent=`${game.clock} → 18:00`;$('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;
  $('energy-text').textContent=`${Math.ceil(h.energy)} / ${C.hero.energy}`;$('energy-bar').style.transform=`scaleX(${h.energy/C.hero.energy})`;
  $('ultimate-text').textContent=game.ultimate>=100?'使用可能！':`${Math.floor(game.ultimate)}%`;$('ultimate-bar').style.transform=`scaleX(${game.ultimate/C.ultimate.max})`;
  $('wave-text').textContent=game.phase==='boss'||game.phase==='escape'?'魔王部長戦':game.wave?`${game.stageName} ${game.wave}/2`:'出勤前';
  const skillRows=Object.keys(C.skills).filter(id=>id==='slash'||game.skills[id]>0).map(id=>`<span>${C.skills[id].name} <b>${game.skills[id]?`Lv.${game.skills[id]}`:'初期'}</b></span>`);$('owned-upgrades').innerHTML=skillRows.join('');
  const boss=game.boss&&!game.boss.dead?game.boss:null;$('boss-hud').hidden=!boss;if(boss){$('boss-bar').style.transform=`scaleX(${boss.hp/boss.maxHp})`;$('boss-hp').textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;$('boss-name').textContent=`魔王部長・第${boss.bossPhase}形態`;}
  $('pause').disabled=game.state!=='playing';document.querySelector('.ultimate-button').classList.toggle('ready',game.ultimate>=100);
  $('battle-banner').hidden=!game.banner;if(game.banner){$('battle-banner').querySelector('b').textContent=game.banner.title;$('battle-banner').querySelector('span').textContent=game.banner.detail;}
  let status=game.notice||'出現予告から離れて敵を全滅させよう';if(game.state==='playing'){
    if(game.phase==='escape')status='魔王部長撃破！ 右上の退勤ゲートへ';
    else if(game.boss?.state==='stunned'||game.boss?.state==='recover')status=`弱点露出 ${Math.max(0,game.boss.left).toFixed(1)}秒：攻撃のチャンス！`;
  }
  $('status').textContent=status;$('status').className='status '+(h.hurtFlash>0?'danger':game.phase==='escape'?'clear':'');
  if(previousState===game.state)return;previousState=game.state;input.clear();$('overlay').hidden=game.state==='playing';if(game.state!=='playing')menu();
}

function frame(now){const dt=Math.min((now-last)/1000,C.maxDelta);last=now;game.update(dt,input.read());visualTime+=dt;render(ctx,game,visualTime,effects);ui();for(const e of game.events.splice(0))audio.play(e);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
export {game,input,ui,action,chooseUpgrade};
