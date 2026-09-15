import {game,input,ui} from '../src/main.js';
import {CONFIG as C,center} from '../src/config.js';
import {pilot} from './pilot.js';
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(ok,m)=>{if(!ok)throw Error(m);};
function log(m){const li=parent.document.createElement('li');li.textContent=m;parent.document.querySelector('#results').append(li);}
const key=(type,code,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,repeat,bubbles:true,cancelable:true}));
const tap=code=>{key('keydown',code);key('keyup',code);};
async function checks(){
  game.reset();ui();tap('Enter');await paint();assert(game.state==='instructions','title enter');tap('Enter');await paint();assert(game.state==='playing','start enter');log('PASS Enterでタイトル→操作説明→戦闘');
  game.spawnQueue=[];game.spawnWarnings=[];game.phase='test';const x=game.hero.x;key('keydown','KeyD');await sleep(100);key('keyup','KeyD');assert(game.hero.x>x,'move');
  game.enemies=[];game.hero={...game.hero,x:200,y:300,facing:{x:1,y:0}};game.createEnemy('slime',{x:245,y:300});key('keydown','Space');await sleep(50);key('keyup','Space');assert(game.enemies[0].hp===20,'attack once');log('PASS キーボード移動・Space攻撃・一振り一判定');
  game.hero.dashCd=0;const before=game.hero.x;tap('KeyK');await sleep(80);assert(game.hero.x>before&&game.hero.dashLeft>0,'dash');assert(game.damageHero(50,{x:0,y:0})===false,'dash invulnerable');
  game.hero.dashLeft=0;game.hero.shieldLeft=0;tap('KeyL');await paint();assert(game.hero.shields===1&&game.damageHero(50,{x:0,y:0})===false,'shield');
  game.ultimate=100;tap('KeyI');await paint();assert(game.ultimate<100&&game.banner.title.includes('退勤'),'ultimate');log('PASS K回避無敵・L盾無敵・I必殺技');
  const left=document.querySelector('[data-input="left"]'),attack=document.querySelector('[data-input="attack"]');for(const b of [left,attack])b.setPointerCapture=()=>{};
  const ptr=(b,type,id)=>b.dispatchEvent(new PointerEvent(type,{pointerId:id,bubbles:true,clientX:b.getBoundingClientRect().x+5,clientY:b.getBoundingClientRect().y+5}));
  game.enemies=[];game.hero={...game.hero,x:200,y:300,facing:{x:-1,y:0},attackCd:0};game.createEnemy('slime',{x:155,y:300});const px=game.hero.x;ptr(left,'pointerdown',1);ptr(attack,'pointerdown',2);await sleep(70);assert(game.hero.x<px&&game.enemies[0].hp<40,'multitouch');ptr(left,'pointerup',1);ptr(attack,'pointerup',2);assert(!input.debug().held.size,'release');log('PASS 画面ボタンの移動＋攻撃同時入力と解除（合成Pointer）');
  tap('Escape');await paint();assert(game.state==='paused','pause');const time=game.remaining;await sleep(80);assert(game.remaining===time,'frozen');tap('Escape');await paint();assert(game.state==='playing','resume');key('keydown','KeyD');window.dispatchEvent(new Event('blur'));await paint();assert(game.state==='paused'&&!input.debug().held.size,'blur');tap('Enter');await paint();log('PASS Esc一時停止・復帰、画面離脱停止と入力解除（合成blur）');
  game.enemies=[];game.spawnQueue=[];game.spawnWarnings=[];game.wave=1;game.openUpgrade();ui();tap('ArrowRight');assert(document.querySelector('[data-upgrade="1"]').classList.contains('selected'),'arrow select');key('keydown','ArrowRight',true);key('keyup','ArrowRight');assert(document.querySelector('[data-upgrade="1"]').classList.contains('selected'),'repeat');tap('Enter');await paint();assert(game.upgrades.length===1&&game.wave===2,'upgrade');const count=game.attacks.length;key('keydown','Enter',true);key('keyup','Enter');assert(game.attacks.length===count,'no flow');
  game.enemies=[];game.spawnQueue=[];game.spawnWarnings=[];game.wave=2;game.openUpgrade();ui();tap('Digit3');await paint();assert(game.upgrades.length===2&&new Set(game.upgrades).size===2,'digit choice');log('PASS 強化の←→＋Enter・数字3、重複なし、入力流れ込みなし');
  game.spawnQueue=[];game.spawnWarnings=[];game.enemies=[];game.state='bossIntro';game.phase='bossIntro';ui();tap('Enter');await paint();assert(game.boss&&$('boss-hud').hidden===false,'boss intro');game.boss.hp=240;game.boss.state='chargeWarn';game.boss.left=1;game.boss.dir={x:1,y:0};await paint();assert($('boss-name').textContent.includes('最終確認'),'enrage hud');
  game.boss.pos={x:180,y:160};game.boss.dir={x:0,y:1};game.boss.left=.001;await sleep(20);while(game.boss&&!game.boss.dead&&game.boss.state!=='stunned')await sleep(15);assert(game.boss.state==='stunned','boss stun');
  game.boss.state='stunned';game.boss.hp=1;game.damageEnemy(game.boss,20,{x:1,y:0});await paint();assert(game.gateOpen&&game.state==='playing','gate only');game.hero={...game.hero,...center(C.gate)};await paint();assert(game.outcome==='success','gate clear');assert($('result-stats').textContent.includes('倒した敵'),'result');tap('Enter');await paint();assert(game.state==='instructions'&&game.upgrades.length===0&&game.hero.shields===2,'retry reset');log('PASS ボス予告・机衝突気絶・撃破後ゲート・結果・Enter再挑戦初期化');
  log('ALL BROWSER CHECKS PASSED');
}
async function play(){
  game.reset();ui();tap('Enter');await paint();tap('Enter');await paint();const held=new Set();let upgrades=0,boss=false;
  const codes={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',attack:'KeyJ'};
  const sync=want=>{for(const a of [...held])if(!want.has(a)){key('keyup',codes[a]);held.delete(a);}for(const a of want)if(!held.has(a)){key('keydown',codes[a]);held.add(a);}};
  const start=performance.now();while(game.state!=='result'&&performance.now()-start<300000){
    if(game.state==='playing'){const p=pilot(game),want=new Set();if(p.x<-.25)want.add('left');if(p.x>.25)want.add('right');if(p.y<-.25)want.add('up');if(p.y>.25)want.add('down');if(p.attack)want.add('attack');sync(want);if(p.dash)tap('KeyK');if(p.shield)tap('KeyL');if(p.ultimate)tap('KeyI');}
    else{sync(new Set());if(game.state==='upgrade'){upgrades++;tap('Digit1');}else if(game.state==='bossIntro'){boss=true;tap('Enter');}else if(game.state==='paused')throw Error('unexpected pause');}
    await sleep(12);
  }
  sync(new Set());assert(game.outcome==='success','natural playthrough');assert(upgrades===2&&boss&&game.kills===18,'whole flow');log(`PASS 通しプレイ ${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')} / 撃破${game.kills} / 被弾${game.hitsTaken} / 強化${game.upgrades.length}`);log('ALL PLAYTHROUGH PASSED（位置・気力・時計・敵の変更なし）');
}
try{new URL(import.meta.url).searchParams.get('mode')==='play'?await play():await checks();}catch(e){log('FAIL '+e.message);console.error(e);}
