import {CONFIG as C,ULTIMATE_IDS} from './config.js';
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
  audio.unlock();if(game.state==='title')game.showInstructions();else if(game.state==='instructions')game.startRun();else if(game.state==='paused')game.resume();else if(game.state==='stageIntro')game.enterStage();else if(game.state==='bossIntro')game.spawnBoss();else if(game.state==='result'){game.reset();game.showInstructions();}
  transition();canvas.focus({preventScroll:true});
}
function chooseUpgrade(index){if(game.chooseUpgrade(index)){transition();canvas.focus({preventScroll:true});}}
function chooseUltimate(index){if(game.selectUltimate(index)){transition();canvas.focus({preventScroll:true});}}
function choiceCount(){return game.state==='ultimateSelect'?ULTIMATE_IDS.length:game.offers.length;}
function paintSelection(){document.querySelectorAll('[data-choice]').forEach((b,i)=>{b.classList.toggle('selected',i===selection);b.setAttribute('aria-current',String(i===selection));});}
function moveSelection(delta){const count=choiceCount();if(!count)return;selection=(selection+delta+count)%count;paintSelection();document.querySelector(`[data-choice="${selection}"]`)?.focus({preventScroll:true});}
function paintResultSelection(){[$('action'),$('to-title')].forEach((b,i)=>{b.classList.toggle('menu-selected',i===resultSelection);b.setAttribute('aria-current',String(i===resultSelection));});}
function command(code){
  const enter=code==='Enter'||code==='NumpadEnter';
  if(['upgrade','ultimateSelect'].includes(game.state)){
    const digit=/^(?:Digit|Numpad)([1-5])$/.exec(code);if(digit){const i=Number(digit[1])-1;if(i<choiceCount())game.state==='upgrade'?chooseUpgrade(i):chooseUltimate(i);return true;}
    if(['ArrowLeft','KeyA','ArrowUp','KeyW'].includes(code)){moveSelection(-1);return true;}if(['ArrowRight','KeyD','ArrowDown','KeyS'].includes(code)){moveSelection(1);return true;}
    if(enter){game.state==='upgrade'?chooseUpgrade(selection):chooseUltimate(selection);return true;}return false;
  }
  if(game.state==='result'){
    if(['ArrowLeft','ArrowUp','KeyA','KeyW','ArrowRight','ArrowDown','KeyD','KeyS'].includes(code)){resultSelection=(resultSelection+1)%2;paintResultSelection();[$('action'),$('to-title')][resultSelection].focus({preventScroll:true});return true;}
    if(enter){if(resultSelection===0)action();else{game.reset();transition();}return true;}return false;
  }
  if(enter&&['title','instructions','paused','stageIntro','bossIntro'].includes(game.state)){action();return true;}return false;
}

$('action').onclick=action;$('action').onfocus=()=>{if(game.state==='result'){resultSelection=0;paintResultSelection();}};$('to-title').onclick=()=>{game.reset();transition();};$('to-title').onfocus=()=>{if(game.state==='result'){resultSelection=1;paintResultSelection();}};$('pause').onclick=togglePause;
$('sound').onclick=async()=>{audio.setMuted(!audio.muted);await audio.unlock();$('sound').textContent=audio.muted?'音 OFF':'音 ON';$('sound').setAttribute('aria-pressed',String(!audio.muted));};
$('bgm-volume').oninput=e=>audio.setBgmVolume(Number(e.target.value)/100);
$('sfx-volume').oninput=e=>audio.setSfxVolume(Number(e.target.value)/100);
$('shake').onclick=()=>{effects=!effects;$('shake').textContent=effects?'揺れ ON':'揺れ OFF';$('shake').setAttribute('aria-pressed',String(effects));$('shake').setAttribute('aria-label',effects?'画面揺れを切る':'画面揺れを入れる');};

function upgradeButton(id,i){
  const b=document.createElement('button');b.dataset.choice=i;
  if(id==='heal'||id==='gauge'){const heal=id==='heal';b.innerHTML=`<span class="upgrade-level">補給</span><b>${i+1}. ${heal?'気力回復':'必殺技補充'}</b><small>進化できる技がない場合の代替報酬</small><em>${heal?'気力を40回復':'必殺技ゲージを100%にする'}</em>`;}
  else{const current=game.skillLevel(id),next=current+1,s=C.skills[id],label=current===0&&id!=='slash'?'NEW':current===0?'初期 → Lv.1':`Lv.${current} → Lv.${next}`;b.innerHTML=`<span class="upgrade-level">${label}</span><b>${i+1}. ${s.name}</b><small>現在：${s.levels[current]}</small><em>選択後：${s.levels[next]}</em>`;}
  b.onclick=()=>chooseUpgrade(i);b.onfocus=()=>{selection=i;paintSelection();};return b;
}
function ultimateButton(id,i){const d=C.ultimate[id],info={exit:'画面内を一掃＋敵弾消去。',clones:'8秒間、分身2体が攻撃を再現。',rush:'6秒間、高速全周斬撃＋被害半減。',blackhole:'前方へ吸引する渦。最後に爆発。',cannon:'向いている方向へ太い貫通ビーム。'}[id],type={exit:'瞬間一掃',clones:'継続火力',rush:'近接乱戦',blackhole:'集敵処理',cannon:'ボス集中'}[id],b=document.createElement('button');b.dataset.choice=i;b.innerHTML=`<span class="upgrade-level">ULTIMATE</span><b>${i+1}. ${d.name}</b><div class="ultimate-preview ${id}"><i></i><i></i><i></i></div><small>${info}</small><em>${type}タイプ</em>`;b.onclick=()=>chooseUltimate(i);b.onfocus=()=>{selection=i;paintSelection();};return b;}
function menu(){
  const choiceState=['upgrade','ultimateSelect'].includes(game.state);$('upgrade-choices').hidden=!choiceState;$('result-stats').hidden=game.state!=='result';$('to-title').hidden=game.state!=='result';$('action').hidden=choiceState;
  $('dialog-logo').hidden=game.state!=='title';$('title-art').hidden=game.state!=='title';$('title-cast').hidden=game.state!=='title';
  if(game.state==='title'){$('badge').textContent='魔王商事 / 17:45';$('heading').textContent='定時で帰りたい勇者';$('message').textContent='技を重ねて大量撃破。6つの役職魔王を倒して定時退勤せよ。';$('action').textContent='冒険を始める';$('hint').textContent='Enterで操作説明へ';}
  else if(game.state==='instructions'){$('badge').textContent='操作説明 / 3つだけ';$('heading').textContent='移動しながら、仕事を斬る。';$('message').textContent='移動：WASD / 方向キー（スマホは左下を触ってスライド）\n攻撃：J / Space（右下ボタンも長押し連続攻撃）\n必殺技：K / I（満タン時）\n赤・紫の予告は通常移動で避けられます。';$('action').textContent='必殺技を選ぶ';$('hint').textContent='時計は停止中 / Enterで選択へ';}
  else if(game.state==='ultimateSelect'){$('badge').textContent='今回の必殺技 / 5種類';$('heading').textContent='切り札を1つ選択';$('message').textContent='用途と動くプレビューを見て選択。再挑戦時に選び直せます。';$('hint').textContent='1〜5で即決 / 方向キー＋Enter';$('upgrade-choices').replaceChildren(...ULTIMATE_IDS.map(ultimateButton));selection=0;paintSelection();}
  else if(game.state==='paused'){$('badge').textContent='一時停止';$('heading').textContent='休憩中';$('message').textContent='時計・敵・弾・予告・自動技・必殺効果は停止しています。';$('action').textContent='戦闘へ戻る';$('hint').textContent='EnterまたはEscで再開';}
  else if(game.state==='stageIntro'){$('badge').textContent=`STAGE ${game.stage} / 全6ステージ`;$('heading').textContent=`${game.stageConfig.rank}戦・${game.stageName}`;$('message').textContent=`${game.stage>1?`フロア移動で気力を${Math.round(game.transitionHeal)}回復！\n`:''}${game.stageConfig.rule}\n開始後約1秒で敵が現れます。`;$('action').textContent='すぐに戦闘開始';$('hint').textContent='Enterで開始 / 時計は停止中';}
  else if(game.state==='upgrade'){$('badge').textContent=`STAGE ${game.stage} 報酬 / ${game.upgradeType==='evolution'?'進化':'新技'}`;$('heading').textContent=game.upgradeType==='evolution'?'取得済み技を進化':'新しい技を習得';$('message').textContent=game.upgradeType==='evolution'?'進化できる技だけを表示します。候補が少ない場合は2択以下になります。':'未取得の技だけを表示します。新しい攻撃が次の戦闘から加わります。';$('hint').textContent='1〜3で即決 / 方向キー＋Enter';$('upgrade-choices').replaceChildren(...game.offers.map(upgradeButton));selection=0;paintSelection();}
  else if(game.state==='bossIntro'){const d=C.rankBosses[game.stage-1];$('badge').textContent=`STAGE ${game.stage} BOSS / ${d.rank}`;$('heading').textContent=`魔王${d.rank}`;$('message').textContent=`${['横移動から突進＋増援','予告着地ハンコ＋衝撃波','分身高速移動＋扇状書類弾','定規薙ぎ払い＋2〜3連続突進','外周移動＋ドローン挟み撃ち','高速移動＋極太レーザー・弾幕・連続床'][game.stage-1]}\n雑魚をまとめて倒して必殺技をため、金色の反撃時間に攻撃。`;$('action').textContent='ボス戦開始';$('hint').textContent=game.stage===6?'撃破後、退勤ゲートへ':'撃破後、新技を習得';}
  else if(game.state==='result'){const success=game.outcome==='success';$('badge').textContent=success?'定時退勤！':'残業発生';$('heading').textContent=success?'魔王商事から脱出成功':'今日は帰れなかった…';$('message').textContent=success?'違う必殺技と技構成で、次の退勤を試そう。':game.reason==='energy'?'気力が尽きました。予告を見て歩いて離れよう。':'18:00になりました。新技と必殺技で処理速度を上げよう。';const skills=game.skillSummary().join('、');$('result-stats').innerHTML=`<div><dt>結果</dt><dd>${success?'成功':'失敗'}</dd></div><div><dt>経過時間</dt><dd>${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')}</dd></div><div><dt>倒した敵</dt><dd>${game.kills}体</dd></div><div><dt>被弾</dt><dd>${game.hitsTaken}回</dd></div><div class="wide"><dt>必殺技</dt><dd>${game.selectedUltimate?.name||'未選択'}</dd></div><div class="wide"><dt>取得・進化した技</dt><dd>${skills}</dd></div>`;$('action').textContent='もう一度';$('hint').textContent='方向キー＋Enterで選択';resultSelection=0;paintResultSelection();}
  const target=choiceState?document.querySelector('[data-choice="0"]'):$('action');target?.focus({preventScroll:true});
}
function ui(){
  const h=game.hero;$('timer').textContent=game.timeText;$('clock').textContent=`${game.clock} → 18:00`;$('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;$('energy-text').textContent=`${Math.ceil(h.energy)} / ${C.hero.energy}`;$('energy-bar').style.transform=`scaleX(${h.energy/C.hero.energy})`;
  const effect=game.ultimateEffectLeft>0?` 発動中 ${game.ultimateEffectLeft.toFixed(1)}秒`:game.ultimate>=100?' 使用可能！':` ${Math.floor(game.ultimate)}%`;$('ultimate-name').textContent=game.selectedUltimate?.name||'未選択';$('ultimate-text').textContent=effect;$('ultimate-bar').style.transform=`scaleX(${game.ultimate/C.ultimate.max})`;
  const remaining=game.activeEnemies.length+game.spawnWarnings.length+game.spawnQueue.length;$('wave-text').textContent=game.boss&&!game.boss.dead?`魔王${game.stageConfig.rank}戦`:game.phase==='wave'?`敵出現中・残り${remaining}体`:game.state==='bossIntro'?'ボス接近':game.stageName;
  $('owned-upgrades').innerHTML=Object.keys(C.skills).filter(id=>id==='slash'||game.skills[id]>0).map(id=>`<span>${C.skills[id].name} <b>${game.skills[id]?`Lv.${game.skills[id]}`:'初期'}</b></span>`).join('');
  const boss=game.boss&&!game.boss.dead?game.boss:null;$('boss-hud').hidden=!boss;if(boss){$('boss-bar').style.transform=`scaleX(${boss.hp/boss.maxHp})`;$('boss-hp').textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;$('boss-name').textContent=`魔王${game.stageConfig.rank}${C.rankBosses[game.stage-1].phases>1?`・第${boss.bossPhase}形態`:''}`;}
  $('pause').disabled=game.state!=='playing';document.querySelector('.ultimate-button').classList.toggle('ready',game.ultimate>=100&&game.ultimateEffectLeft<=0);document.querySelector('.ultimate-button b').textContent=game.ultimateEffectLeft>0?game.ultimateEffectLeft.toFixed(1):'必殺';document.querySelector('.ultimate-button').setAttribute('aria-label',`必殺技 ${game.selectedUltimate?.name||'未選択'}`);
  $('battle-banner').hidden=!game.banner;if(game.banner){$('battle-banner').querySelector('b').textContent=game.banner.title;$('battle-banner').querySelector('span').textContent=game.banner.detail;}
  let status=game.notice||'出現予告から離れて敵を全滅させよう';if(game.state==='playing'&&game.phase==='wave')status=`敵出現中　残り${remaining}体`;if(game.state==='playing'&&game.boss&&!game.boss.dead&&!game.boss.weak&&game.boss.state!=='attackWarn')status=`魔王${game.stageConfig.rank}戦　増援${game.bossMinionCount()}体　次の増援${Math.max(0,game.boss.reinforceLeft).toFixed(1)}秒`;if(game.state==='playing'&&game.boss?.weak)status=`反撃時間 ${Math.max(0,game.boss.left).toFixed(1)}秒：攻撃のチャンス！`;$('status').textContent=status;$('status').className='status '+(h.hurtFlash>0?'danger':game.phase==='escape'?'clear':'');
  if(previousState===game.state)return;previousState=game.state;input.clear();$('overlay').hidden=game.state==='playing';if(game.state!=='playing')menu();
  const scene=game.state==='title'?'title':game.state==='result'?(game.outcome==='success'?'victory':'pause'):game.state==='paused'?'pause':game.state==='playing'?(game.boss?(game.stage===6?'final':'boss'):game.stage>=4?'late':'battle'):'pause';audio.setScene(scene);
}
function frame(now){const dt=Math.min((now-last)/1000,C.maxDelta);last=now;game.update(dt,input.read());visualTime+=dt;render(ctx,game,visualTime,effects);ui();for(const e of game.events.splice(0))audio.play(e);requestAnimationFrame(frame);}
if(new URLSearchParams(location.search).get('showcase')==='late'){
  game.showInstructions();game.startRun();game.selectUltimate('blackhole');game.loadStage(6,true);game.state='playing';game.phase='wave';game.wave=2;game.spawnQueue=[];game.spawnWarnings=[];
  Object.keys(game.skills).forEach(id=>game.skills[id]=3);for(let i=0;i<44;i++){const type=i%10===0?'brute':i%5===0?'sentry':i%4===0?'bat':'slime';game.createEnemy(type,game.chooseSpawn());}
  game.spawnQueue=[{type:'slime',due:999,source:'showcase'}];game.hero.invulnerable=999;game.ultimate=100;game.useUltimate();game.banner={title:'社長決裁フロア / 大量処理',detail:'成長した7系統の技で一斉攻撃！',left:99};
  let measuredFrames=0,measuredStart=performance.now(),measuredLast=measuredStart,worstFrame=0;const measureFrame=now=>{worstFrame=Math.max(worstFrame,now-measuredLast);measuredLast=now;if(++measuredFrames<180)requestAnimationFrame(measureFrame);else console.info(`[PERF] late showcase ${Math.round(measuredFrames/((now-measuredStart)/1000))} fps, worst ${worstFrame.toFixed(1)} ms`);};requestAnimationFrame(measureFrame);
}
requestAnimationFrame(frame);
export {game,input,ui,action,chooseUpgrade,chooseUltimate,audio};
