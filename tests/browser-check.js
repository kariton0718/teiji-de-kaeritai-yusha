import {game,input,ui} from '../src/main.js';
import {CONFIG as C,center,SKILL_IDS} from '../src/config.js';
import {pilot} from './pilot.js';

const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(ok,m)=>{if(!ok)throw Error(m);},runtimeErrors=[];window.addEventListener('error',e=>runtimeErrors.push(e.message));window.addEventListener('unhandledrejection',e=>runtimeErrors.push(String(e.reason)));
function log(m){const li=parent.document.createElement('li');li.textContent=m;parent.document.querySelector('#results').append(li);}const key=(type,code,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,repeat,bubbles:true,cancelable:true}));const tap=code=>{key('keydown',code);key('keyup',code);};
function ready(id='exit'){game.reset();game.showInstructions();game.startRun();game.selectUltimate(id);game.enterStage();game.spawnQueue=[];game.spawnWarnings=[];game.enemies=[];game.phase='test';ui();}

async function checks(){
  game.reset();ui();tap('Enter');await paint();assert(game.state==='instructions','title');tap('Enter');await paint();assert(game.state==='ultimateSelect'&&document.querySelectorAll('[data-choice]').length===3,'ultimate menu');tap('Digit2');await paint();assert(game.ultimateChoice==='clones'&&game.state==='stageIntro','ultimate keyboard');tap('Enter');await paint();assert(game.state==='playing','stage start');log('PASS Enter進行、必殺技3択、数字キー選択');

  game.spawnQueue=[];game.spawnWarnings=[];game.phase='test';game.enemies=[];game.hero={...game.hero,x:200,y:300,facing:{x:1,y:0},attackCd:0};game.createEnemy('slime',{x:252,y:300});const x=game.hero.x;key('keydown','KeyD');key('keydown','Space');await sleep(55);key('keyup','Space');key('keyup','KeyD');assert(game.hero.x>x&&game.enemies[0].hp===16,'moving slash');assert(game.attackRange===64&&Math.round(game.attackArc*180/Math.PI)===100,'base slash');log('PASS 移動＋攻撃、初期64px・100度、一振り一判定');

  ready('exit');game.enemyProjectiles=[{kind:'mail',pos:{...game.hero},dir:{x:1,y:0},life:4,radius:7,damage:8,speed:0}];game.ultimate=100;tap('KeyK');await paint();assert(game.enemyProjectiles.length===0&&game.hero.invulnerable>0,'exit');
  ready('clones');game.ultimate=100;key('keydown','KeyI');await paint();assert(game.clonePositions().length===2&&game.ultimateEffectLeft>7,'clones');game.ultimate=100;await sleep(35);assert(game.ultimate===100,'held guard');key('keyup','KeyI');
  ready('rush');game.ultimate=100;tap('KeyK');await paint();assert(game.ultimateEffectLeft>5&&$('ultimate-text').textContent.includes('発動中'),'rush');log('PASS 3種類の必殺技、HUD残り時間、長押し再発動防止');

  const left=document.querySelector('[data-input="left"]'),attack=document.querySelector('[data-input="attack"]');for(const b of [left,attack])b.setPointerCapture=()=>{};const ptr=(b,type,id)=>b.dispatchEvent(new PointerEvent(type,{pointerId:id,bubbles:true,clientX:b.getBoundingClientRect().x+5,clientY:b.getBoundingClientRect().y+5}));ready('exit');game.hero={...game.hero,x:200,y:300,facing:{x:-1,y:0},attackCd:0};game.createEnemy('slime',{x:150,y:300});const px=game.hero.x;ptr(left,'pointerdown',1);ptr(attack,'pointerdown',2);await sleep(70);assert(game.hero.x<px&&game.enemies[0].hp<40,'touch');ptr(left,'pointerup',1);ptr(attack,'pointerup',2);assert(!input.debug().held.size,'release');log('PASS スマホ相当の移動＋攻撃同時入力');

  game.skills.reply=1;game.openUpgrade({kind:'wave',stage:1,wave:2},'evolution');ui();assert([...document.querySelectorAll('[data-choice]')].every(b=>!b.textContent.includes('NEW')),'evolution only');tap('Enter');await paint();assert(game.state==='playing','evolution choose');game.openUpgrade({kind:'stage',stage:2},'new');ui();assert(document.querySelector('#heading').textContent.includes('新しい技'),'new only');tap('Digit1');await paint();log('PASS 進化と新技の画面分離、キーボード選択');

  ready('exit');game.loadStage(4,true);game.state='stageIntro';game.phase='stageIntro';ui();tap('Enter');await paint();assert(game.worldWidth===960&&game.phase==='travel'&&game.objectivePoint,'wide');game.hero={...game.hero,x:900,y:1200};await paint();assert(game.camera().x===480&&game.camera().y===640,'camera');log('PASS 広いマップ、追従カメラ、目的地');

  game.loadStage(5,true);game.state='presidentIntro';game.phase='presidentIntro';ui();tap('Enter');await paint();const b=game.boss;assert(b?.type==='president'&&!$('boss-hud').hidden,'president');b.state='laserWarn';b.left=1;b.dir={x:1,y:0};await paint();const layout=game.layoutIndex;game.reorganize();assert(game.layoutIndex!==layout&&!game.isBlocked(game.hero.x,game.hero.y),'reorg');b.hp=1;b.state='recover';b.weak=true;game.damageEnemy(b,10,{x:1,y:0});game.hero={...game.hero,...center(game.stageConfig.gate)};await sleep(40);assert(game.outcome==='success','final gate');log('PASS 魔王社長、レーザー予告、地形変更、最終ゲート');

  tap('Enter');await paint();assert(game.state==='instructions'&&game.ultimateChoice===null&&game.ultimateEffectLeft===0,'reset');tap('Escape');assert(game.state==='instructions','esc menu');assert(runtimeErrors.length===0,`errors ${runtimeErrors.join('/')}`);log('PASS 再挑戦初期化、実行時エラーなし');log('ALL BROWSER CHECKS PASSED');
}

async function play(){
  game.reset();game.showInstructions();game.startRun();game.selectUltimate('exit');const priority={reply:120,thunder:115,meteor:110,drone:105,boomerang:90,slash:70,shredder:65,gauge:50,heal:40};let guard=0;
  while(game.state!=='result'&&guard++<C.timeLimit*60){if(game.state==='upgrade'){let pick=0,best=-Infinity;game.offers.forEach((id,i)=>{const s=(priority[id]||0)+(game.skills[id]||0)*8;if(s>best){best=s;pick=i;}});game.chooseUpgrade(pick);}else if(game.state==='stageIntro')game.enterStage();else if(game.state==='bossIntro')game.spawnBoss('manager');else if(game.state==='presidentIntro')game.spawnBoss('president');else if(game.state==='paused')game.resume();else if(game.state==='playing')game.update(1/60,pilot(game));if(guard%240===0){ui();await paint();}}
  ui();await paint();assert(game.outcome==='success','playthrough');assert(game.clearedWaves===10&&game.kills>=140,'whole flow');log(`PASS 全5ステージ→魔王部長→魔王社長→退勤 / ${Math.floor(game.elapsed/60)}:${String(Math.floor(game.elapsed%60)).padStart(2,'0')} / 撃破${game.kills}`);log('ALL PLAYTHROUGH PASSED（加速シミュレーション）');
}

async function visual(){
  ready('clones');game.loadStage(5,true);for(const id of SKILL_IDS)game.skills[id]=Math.min(3,id==='slash'?2:1);game.ultimate=100;game.useUltimate();game.hero={...game.hero,x:700,y:520,facing:{x:1,y:0}};for(const [type,x,y] of [['slime',650,420],['bat',820,450],['ghost',590,520],['brute',780,610],['sentry',600,650]])game.createEnemy(type,{x,y});game.enemies.find(e=>e.type==='ghost').state='warn';game.enemies.find(e=>e.type==='ghost').dir={x:1,y:0};game.enemies.find(e=>e.type==='brute').state='areaWarn';game.swing();game.castThunder(1);game.castMeteor(1);game.update=()=>{};game.notice='広いマップ＋新技＋分身の視認性確認';ui();await paint();log('後半ステージの分身・新技・危険予告を静止表示');
}

try{const mode=new URL(import.meta.url).searchParams.get('mode');mode==='play'?await play():mode==='visual'?await visual():await checks();}catch(e){log('FAIL '+e.message);console.error(e);}
