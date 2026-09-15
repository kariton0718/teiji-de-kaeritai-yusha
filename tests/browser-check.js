import {game,input,ui} from '../src/main.js';
import {CONFIG as C,center} from '../src/config.js';
import {pilot} from './pilot.js';

const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(ok,m)=>{if(!ok)throw Error(m);};
const runtimeErrors=[];window.addEventListener('error',e=>runtimeErrors.push(e.message));window.addEventListener('unhandledrejection',e=>runtimeErrors.push(String(e.reason)));
function log(m){const li=parent.document.createElement('li');li.textContent=m;parent.document.querySelector('#results').append(li);}
const key=(type,code,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,repeat,bubbles:true,cancelable:true}));
const tap=code=>{key('keydown',code);key('keyup',code);};

async function checks(){
  game.reset();ui();tap('Enter');await paint();assert(game.state==='instructions','title enter');tap('Enter');await paint();assert(game.state==='playing','start enter');log('PASS Enterでタイトル→操作説明→営業フロア');

  game.spawnQueue=[];game.spawnWarnings=[];game.phase='test';const x=game.hero.x;key('keydown','KeyD');await sleep(100);key('keyup','KeyD');assert(game.hero.x>x,'move');
  game.enemies=[];game.hero={...game.hero,x:200,y:300,facing:{x:1,y:0},attackCd:0};game.createEnemy('slime',{x:245,y:300});key('keydown','Space');await sleep(45);key('keyup','Space');assert(game.enemies[0].hp===20,'attack once');log('PASS キーボード移動・Space攻撃・一振り一判定');

  game.skills={slash:3,reply:3,shredder:3,thunder:3,meteor:3};game.enemies=[];for(let i=0;i<8;i++)game.createEnemy('brute',{x:100+i*35,y:300+(i%2)*50});game.hero={...game.hero,x:240,y:320,facing:{x:1,y:0},attackCd:0,attackCount:3};game.swing();game.castThunder(3);game.castMeteor(3);
  assert(game.heroProjectiles.length===5&&game.orbitPositions().length===4&&game.thunders.length&&game.meteors.length===3,'skills');log('PASS 5系統Lv.3の斬撃・5方向返信・回転刃・落雷・3地点メテオ');

  game.enemyProjectiles=[{kind:'mail',pos:{x:80,y:80},dir:{x:1,y:0},life:4,radius:7,damage:10,speed:0}];game.enemyAreas=[{kind:'bossFloor',pos:{x:80,y:80},radius:30,left:2,order:1,damage:1,fired:false,effect:0}];game.ultimate=100;tap('KeyI');await paint();assert(game.enemyProjectiles.length===0&&game.enemyAreas.length===1,'ultimate');log('PASS 全画面必殺で敵へ攻撃・敵弾消去・危険予告は維持');

  const left=document.querySelector('[data-input="left"]'),attack=document.querySelector('[data-input="attack"]');for(const b of [left,attack])b.setPointerCapture=()=>{};
  const ptr=(b,type,id)=>b.dispatchEvent(new PointerEvent(type,{pointerId:id,bubbles:true,clientX:b.getBoundingClientRect().x+5,clientY:b.getBoundingClientRect().y+5}));
  game.skills={slash:0,reply:0,shredder:0,thunder:0,meteor:0};game.enemies=[];game.hero={...game.hero,x:200,y:300,facing:{x:-1,y:0},attackCd:0};game.createEnemy('slime',{x:155,y:300});const px=game.hero.x;ptr(left,'pointerdown',1);ptr(attack,'pointerdown',2);await sleep(70);assert(game.hero.x<px&&game.enemies[0].hp<40,'multitouch');ptr(left,'pointerup',1);ptr(attack,'pointerup',2);assert(!input.debug().held.size,'release');log('PASS スマホ相当の移動＋攻撃同時入力と解除（合成Pointer）');

  tap('Escape');await paint();assert(game.state==='paused','pause');const time=game.remaining;await sleep(60);assert(game.remaining===time,'frozen');tap('Escape');await paint();assert(game.state==='playing','resume');key('keydown','KeyD');window.dispatchEvent(new Event('blur'));await paint();assert(game.state==='paused'&&!input.debug().held.size,'blur');tap('Enter');await paint();log('PASS Esc一時停止・復帰、画面離脱停止と入力解除（合成blur）');

  game.skills={slash:0,reply:0,shredder:0,thunder:0,meteor:0};game.upgradeCount=0;game.openUpgrade({kind:'wave',stage:1,wave:2});ui();assert(game.offers.includes('reply')&&document.querySelectorAll('[data-upgrade]').length===3,'first offers');assert(document.querySelector('#upgrade-choices').textContent.includes('現在：')&&document.querySelector('#upgrade-choices').textContent.includes('選択後：'),'level copy');
  const replyIndex=game.offers.indexOf('reply');tap(`Digit${replyIndex+1}`);await paint();assert(game.skills.reply===1,'digit choice');
  game.openUpgrade({kind:'wave',stage:1,wave:2});ui();tap('ArrowRight');assert(document.querySelector('[data-upgrade="1"]').classList.contains('selected'),'arrow');key('keydown','ArrowRight',true);key('keyup','ArrowRight');assert(document.querySelector('[data-upgrade="1"]').classList.contains('selected'),'repeat guard');tap('Enter');await paint();assert(game.upgradeCount===2,'enter choice');log('PASS 強化3候補、現在／次段階、数字・矢印＋Enter、キーリピート抑制');

  game.stage=2;game.wave=0;game.state='stageIntro';game.phase='stageIntro';ui();assert($('heading').textContent==='業務集中フロア','stage intro');tap('Enter');await paint();assert(game.state==='playing'&&game.stage===2&&game.wave===1,'stage start');

  game.spawnQueue=[];game.spawnWarnings=[];game.enemies=[];game.state='bossIntro';game.phase='bossIntro';ui();tap('Enter');await paint();assert(game.boss&&!$('boss-hud').hidden,'boss');
  const b=game.boss;b.hp=C.boss.hp*.66;b.phaseDone=new Set(['charge','meeting']);b.state='chase';b.left=0;await sleep(30);assert(b.bossPhase===2&&$('boss-name').textContent.includes('第2形態'),'phase2');
  b.hp=C.boss.hp*.33;b.phaseDone=new Set(['fan','summon']);b.state='chase';b.left=0;await sleep(30);assert(b.bossPhase===3&&$('boss-name').textContent.includes('第3形態'),'phase3');
  b.state='chase';b.pattern=0;game.startBossAttack(b);await paint();assert(b.state==='multiWarn','multi');b.state='chase';b.pattern=1;game.startBossAttack(b);await paint();assert(b.state==='floorSequence'&&game.enemyAreas.length,'floor');log('PASS 魔王部長の3形態、連続突進予告、番号付き床攻撃');

  b.phaseDone=new Set(['multi','floor']);b.state='stunned';b.weak=true;b.hp=1;game.damageEnemy(b,20,{x:1,y:0});await paint();assert(game.gateOpen&&game.state==='playing','gate only');game.hero={...game.hero,...center(C.gate)};await sleep(30);assert(game.outcome==='success'&&$('result-stats').textContent.includes('取得・進化した技'),'result');tap('Enter');await paint();assert(game.state==='instructions'&&game.upgradeCount===0&&game.hero.shields===2,'retry');log('PASS ボス撃破後ゲート、結果、Enter再挑戦の完全初期化');
  assert(runtimeErrors.length===0,`console errors: ${runtimeErrors.join(' / ')}`);log('PASS 通常ゲーム画面の実行時エラーなし');log('ALL BROWSER CHECKS PASSED');
}

async function play(){
  game.reset();game.showInstructions();game.startRun();const choices={reply:100,thunder:90,meteor:85,shredder:70,slash:65};let guard=0;
  while(game.state!=='result'&&guard++<20000){
    if(game.state==='upgrade'){let pick=0,best=-Infinity;game.offers.forEach((id,i)=>{const score=choices[id]+game.skills[id]*5;if(score>best){best=score;pick=i;}});game.chooseUpgrade(pick);}
    else if(game.state==='stageIntro')game.enterStage();else if(game.state==='bossIntro')game.spawnBoss();else if(game.state==='playing')game.update(1/60,pilot(game));
    if(guard%120===0){ui();await paint();}
  }
  ui();await paint();assert(game.outcome==='success','playthrough');assert(game.upgradeCount===6&&game.kills>=90,'whole flow');log(`PASS 全6ウェーブ→3形態ボス→退勤 ${game.timeText}残し / 撃破${game.kills} / 被弾${game.hitsTaken} / 強化${game.upgradeCount}`);log('ALL PLAYTHROUGH PASSED（状態遷移を省略しない加速シミュレーション）');
}

async function visual(){
  game.reset();game.showInstructions();game.startRun();game.spawnQueue=[];game.spawnWarnings=[];game.enemies=[];game.stage=3;game.wave=2;game.phase='wave';game.state='playing';game.skills={slash:3,reply:3,shredder:3,thunder:3,meteor:3};game.hero={...game.hero,x:240,y:340,facing:{x:0,y:-1},attackCount:3};
  const setup=[['slime',90,150],['slime',135,170],['slime',350,160],['bat',100,430],['bat',380,430],['ghost',70,300],['brute',380,300]];for(const [type,x,y] of setup)game.createEnemy(type,{x,y});
  game.enemies.find(e=>e.type==='bat').state='warn';game.enemies.find(e=>e.type==='bat').dir={x:1,y:-.2};game.enemies.find(e=>e.type==='ghost').state='warn';game.enemies.find(e=>e.type==='ghost').dir={x:1,y:0};game.enemies.find(e=>e.type==='brute').state='warn';
  game.spawnWarnings=[{type:'slime',pos:{x:300,y:120},left:.5}];game.swing();game.castThunder(3);game.castMeteor(3);game.ultimate=100;game.banner=null;game.notice='終盤の視認性確認：主人公と危険予告を見分けられるか';game.update=()=>{};ui();await paint();log('終盤の全技・敵予告を静止表示');
}

try{const mode=new URL(import.meta.url).searchParams.get('mode');mode==='play'?await play():mode==='visual'?await visual():await checks();}catch(e){log('FAIL '+e.message);console.error(e);}
