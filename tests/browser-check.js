import {game,input,progress,ui,toTitle} from '../src/main.js';
import {center} from '../src/config.js';
import {ProgressStore,SAVE_KEY} from '../src/progress.js';
import {pilotInput,pilotChoice} from './pilot.js';
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(ok,m)=>{if(!ok)throw Error(m);};
function log(m){const li=parent.document.createElement('li');li.textContent=m;parent.document.querySelector('#results').append(li);}
const key=(type,code,repeat=false)=>window.dispatchEvent(new KeyboardEvent(type,{code,repeat,bubbles:true,cancelable:true}));
const tap=code=>{key('keydown',code);key('keyup',code);};
async function reset(id=1){game.reset(id);input.clear();await paint();}
async function encounter(){game.encounter();await paint();}
async function back(){tap('Enter');await paint();}
async function checks(){
 progress.reset();toTitle();await paint();
 assert(document.querySelector('[data-stage="2"]').disabled,'stage lock');
 tap('Enter');await paint();assert(game.state==='briefing','keyboard stage select');
 tap('Enter');await paint();assert(game.state==='playing','keyboard start');log('PASS タイトル・開始をEnterだけで操作');
 let x=game.hero.x;key('keydown','KeyD');await sleep(90);key('keyup','KeyD');assert(game.hero.x>x,'movement');
 key('keydown','KeyA');await encounter();assert(input.read().x===0,'clear on encounter');
 tap('ArrowDown');assert(document.querySelector('[data-choice="tomorrow"]').classList.contains('selected'),'down');
 key('keydown','ArrowDown',true);key('keyup','ArrowDown');assert(document.querySelector('[data-choice="tomorrow"]').classList.contains('selected'),'repeat');
 tap('ArrowUp');tap('KeyS');tap('KeyW');assert(document.querySelector('[data-choice="accept"]').classList.contains('selected'),'WS/up');
 tap('Enter');await paint();assert(game.added===1&&game.slowLeft===8,'accept');
 await back();key('keydown','KeyA',true);assert(input.read().x===0,'quarantine');key('keyup','KeyA');
 log('PASS ↑↓・W/S・Enter、選択枠、キーリピート抑制、会話後の移動残りなし');
 for(let i=1;i<=3;i++){await encounter();tap('Digit2');await paint();assert(game.anger===i,'anger');await back();}
 await encounter();assert(document.querySelector('[data-choice="tomorrow"]').disabled,'anger disabled');tap('Digit2');assert(game.state==='encounter','disabled digit');
 tap('Digit4');await paint();assert(game.shields===0&&game.anger===3,'shield');await back();
 await encounter();assert(document.querySelector('[data-choice="shield"]').disabled,'shield disabled');
 tap('Digit4');assert(game.state==='encounter','shield cannot reuse');
 tap('Digit1');await paint();assert(game.added===2,'digit1');await back();
 log('PASS 数字1/2/4、怒り3段階・先送り不能、有給の盾1回制限');
 await encounter();tap('Digit3');await paint();assert(game.state==='timing','digit3');
 const frozen=game.remaining;while(game.timingValue<.47)await sleep(8);
 tap('Space');await paint();assert(game.response.title.includes('成功')&&game.remaining===frozen,'gauge success');await back();
 await encounter();tap('Digit3');await paint();tap('Enter');await paint();assert(game.jobs.at(-1).duration===game.config.failedExtraDuration,'gauge miss');await back();
 await encounter();tap('Digit3');await paint();$('judge').click();await paint();assert(game.state==='response','tap judge');await back();
 log('PASS ゲージ：Space成功・Enter失敗・画面ボタン判定、時計停止');
 await reset();game.bossRest=999;game.hero=center(game.config.stations[0].spot);
 key('keydown','KeyE');await sleep(100);key('keyup','KeyE');assert(game.jobs[0].progress>0,'hold work');const p=game.jobs[0].progress;
 tap('KeyD');assert(game.jobs[0].progress===p,'save work');
 const b=document.querySelector('[data-dir="action"]'),capture=b.setPointerCapture;b.setPointerCapture=()=>{};
 const pointer=(type)=>b.dispatchEvent(new PointerEvent(type,{pointerId:1,bubbles:true}));
 pointer('pointerdown');await sleep(100);pointer('pointerup');assert(game.jobs[0].progress>p&&!input.read().action,'pointer');
 pointer('pointerdown');pointer('pointercancel');assert(!input.read().action,'cancel');b.setPointerCapture=capture;
 window.dispatchEvent(new Event('blur'));await paint();const time=game.remaining;await sleep(80);assert(game.state==='paused'&&game.remaining===time,'pause');await back();
 log('PASS 長押し作業・進捗保存、画面ボタンと解除（合成Pointer）、フォーカス喪失停止（合成blur）');
 await reset(2);game.bossRest=999;game.slime.left=.001;await paint();assert(game.slime.phase==='warning','slime warning');
 game.hero={...game.slime.area};game.slime.left=.001;await paint();assert(game.meetingHits===1&&game.meetingLeft>0,'slime hit');
 const pos={...game.hero};key('keydown','KeyD');await sleep(60);key('keyup','KeyD');assert(game.hero.x===pos.x,'meeting freeze');
 await reset(2);game.bossRest=999;game.slime.left=.001;await paint();game.hero={x:420,y:100};game.slime.left=.001;await paint();assert(game.meetingHits===0,'slime evade');
 log('PASS 会議スライム：予告表示・命中と足止め・範囲外回避（状態設定あり）');
 await reset(3);game.elapsed=4;game.boss={x:260,y:420};game.hero={x:260,y:260};game.director.left=.001;await paint();assert(game.director.phase==='windup','director warning');
 while(game.director.phase!=='stunned')await sleep(30);assert(game.directorStuns===1,'desk stun');
 await reset(3);game.elapsed=4;game.boss={x:340,y:540};game.hero={x:310,y:540};game.director={phase:'charge',left:1,origin:{...game.boss},dir:{x:-1,y:0}};
 await sleep(80);assert(game.state==='encounter','charge hit');
 log('PASS 魔王部長：方向予告・机衝突と気絶・突進接触（状態設定あり）');
 progress.reset();await reset(1);game.finish('success');await paint();
 assert(progress.data.unlocked===2&&!$('next-stage').hidden&&$('message').textContent.includes('解放'),'unlock2');
 assert($('result-stats').textContent.includes('上司の怒り'),'stats');
 $('next-stage').focus();tap('Enter');await paint();assert(game.stageId===2&&game.state==='briefing','next keyboard');await back();
 game.finish('success');await paint();assert(progress.data.unlocked===3,'unlock3');
 const saved=new ProgressStore(localStorage,SAVE_KEY+'.test');assert(saved.data.unlocked===3&&saved.data.best[1],'persistent');
 tap('Enter');await paint();assert(game.stageId===2&&game.state==='briefing','retry');await back();
 game.remaining=.001;await paint();assert(game.outcome==='failure','timeout');
 $('to-title').click();await paint();$('reset-save').click();await paint();$('confirm-reset').click();await paint();
 assert(progress.data.unlocked===1&&document.querySelector('[data-stage="2"]').disabled,'reset');
 log('PASS 結果表示・次ステージ/再挑戦のEnter操作・時間切れ・1→2→3解放・保存の再読込・リセット');
 log('ALL CHECKS PASSED');
}
async function play(){
 progress.reset();toTitle();await paint();
 for(let stage=1;stage<=3;stage++){
  document.querySelector('[data-stage="'+stage+'"]').click();await paint();tap('Enter');await paint();
  const held=new Set(),sync=want=>{for(const k of [...held])if(!want.has(k)){key('keyup',k);held.delete(k);}for(const k of want)if(!held.has(k)){key('keydown',k);held.add(k);}};
  const start=performance.now();
  while(game.state!=='result'&&performance.now()-start<150000){
   if(game.state==='playing'){
    const d=pilotInput(game),want=new Set();
    if(d.action)want.add('KeyE');else{if(Math.abs(d.x)>2)want.add(d.x>0?'KeyD':'KeyA');if(Math.abs(d.y)>2)want.add(d.y>0?'KeyS':'KeyW');}sync(want);
   }else{
    sync(new Set());
    if(game.state==='encounter')tap('Digit'+({accept:1,tomorrow:2,deflect:3,shield:4}[pilotChoice(game)]));
    else if(game.state==='response')tap('Enter');
    else if(game.state==='timing'&&game.timingValue>.47&&game.timingValue<.58)tap('Space');
    else if(game.state==='paused')throw Error('focus loss');
   }
   await sleep(12);
  }
  sync(new Set());assert(game.outcome==='success','stage '+stage+' failed');
  log('PASS 通しプレイ STAGE '+stage+' / '+game.elapsed.toFixed(1)+'秒 / 接触'+game.catches+' / 怒り'+game.anger+' / 追加'+game.added+' / 会議'+game.meetingHits+' / 気絶'+game.directorStuns);
  $('to-title').click();await paint();
 }
 log('ALL PLAYTHROUGHS PASSED（位置・時計・進捗の変更なし）');
}
try{if(new URL(import.meta.url).searchParams.get('mode')==='play')await play();else await checks();}
catch(e){log('FAIL '+e.message);console.error(e);}
