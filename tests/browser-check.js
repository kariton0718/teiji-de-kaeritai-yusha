import {game,input,audio} from '../src/main.js';
import {CONFIG as C,center} from '../src/config.js';
import {pilotInput} from './pilot.js';
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms)),paint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
function assert(ok,message){if(!ok)throw Error(message);}
function log(message){const li=parent.document.createElement('li');li.textContent=message;parent.document.querySelector('#results').append(li);}
const key=(type,code)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
const pointer=(target,type,id=1,extra={})=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:target.getBoundingClientRect().x+10,clientY:target.getBoundingClientRect().y+10,bubbles:true,...extra}));
async function reset(){game.reset();input.clear();await paint();}
async function forceEncounter(){game.encounter();await paint();}
async function choose(choice){document.querySelector('[data-choice="'+choice+'"]').click();await paint();}
async function back(){ $('action').click();await paint(); }
async function checks(){
  $('action').click();await paint();assert(game.state==='playing'&&$('overlay').hidden,'start');log('PASS 開始：17:45・3業務・閉じた出口');
  let x=game.hero.x;key('keydown','KeyD');await sleep(120);key('keyup','KeyD');assert(game.hero.x>x,'WASD');x=game.hero.x;await sleep(80);assert(game.hero.x===x,'keyup');log('PASS WASD移動と解除');
  let y=game.hero.y;key('keydown','ArrowUp');await sleep(80);key('keyup','ArrowUp');assert(game.hero.y<y,'arrows');log('PASS 方向キー移動');
  game.hero=center(C.stations[0].spot);game.bossRest=999;game.protection=999;
  key('keydown','KeyE');await sleep(160);key('keyup','KeyE');assert(game.jobs[0].progress>0,'E work');const p=game.jobs[0].progress;
  key('keydown','KeyD');await sleep(120);key('keyup','KeyD');assert(game.jobs[0].progress===p,'saved');log('PASS E長押しで作業、逃げても進捗保存');
  game.hero=center(C.stations[0].spot);key('keydown','Space');await sleep(100);key('keyup','Space');assert(game.jobs[0].progress>p,'Space work');log('PASS Space長押し作業');
  const b=document.querySelector('[data-dir="action"]'),capture=b.setPointerCapture;b.setPointerCapture=()=>{};
  let progress=game.jobs[0].progress;pointer(b,'pointerdown');await sleep(120);assert(game.jobs[0].progress>progress,'screen work');
  pointer(b,'pointerup');assert(!input.read().action,'pointerup');
  pointer(b,'pointerdown');pointer(b,'pointercancel');assert(!input.read().action,'cancel');
  pointer(b,'pointerdown');pointer(b,'pointermove',1,{clientX:-10});assert(!input.read().action,'outside');b.setPointerCapture=capture;log('PASS 画面作業ボタンの長押し・up・cancel・範囲外解除（合成入力）');
  key('keydown','KeyE');window.dispatchEvent(new Event('blur'));const time=game.remaining,work=game.jobs[0].progress;await sleep(120);
  assert(game.state==='paused'&&game.remaining===time&&game.jobs[0].progress===work&&!input.read().action,'pause');await paint();await back();assert(game.state==='playing','resume');log('PASS フォーカス喪失で作業・時計・入力が停止、再開');
  // Emulate hidden document, dispatch its actual visibility handler, then restore.
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;
  await paint();assert(game.state==='paused','visibility pause');await back();log('PASS 非表示イベントで自動停止（合成イベント）');
  key('keydown','Space');await forceEncounter();
  const repeated=new KeyboardEvent('keydown',{code:'Space',repeat:true,cancelable:true});
  window.dispatchEvent(repeated);const released=new KeyboardEvent('keyup',{code:'Space',cancelable:true});window.dispatchEvent(released);
  assert(repeated.defaultPrevented&&released.defaultPrevented&&game.state==='encounter','held key accidentally answered');log('PASS 作業長押しのまま捕まっても返答を誤選択しない');
  const frozen=game.remaining;await sleep(100);assert(game.remaining===frozen&&!$('choices').hidden,'frozen choice');
  await choose('accept');assert(game.added===1&&game.jobs.length===4&&game.state==='response','accept');
  assert($('message').textContent.includes('追加業務＋1'),'feedback');await sleep(100);assert(game.remaining===frozen,'response pause');await back();assert(game.protection>0,'protect');log('PASS 返答中の時計停止、受諾で追加業務、結果表示と保護');
  await forceEncounter();await choose('tomorrow');assert(game.bossSpeed===C.bossSpeed+C.bossSpeedStep&&game.added===1,'tomorrow');await back();log('PASS 明日やります：追加なし・速度上昇');
  await forceEncounter();await choose('shield');assert(game.shields===0&&game.added===1,'shield');await back();
  await forceEncounter();assert(document.querySelector('[data-choice="shield"]').disabled,'disabled shield');
  const rng=game.random;game.random=()=>0;await choose('deflect');assert(game.added===1,'deflect success');await back();log('PASS 盾1回制限・部長パス成功');
  await forceEncounter();game.random=()=>.99;await choose('deflect');assert(game.added===2,'deflect fail');game.random=rng;await back();log('PASS 部長パス失敗で追加業務');
  game.bossRest=999;game.protection=999;
  game.jobs.forEach(j=>j.progress=j.duration);const last=game.jobs.at(-1);last.progress-=.01;
  game.hero=center(C.stations.find(s=>s.id===last.station).spot);key('keydown','KeyE');await paint();key('keyup','KeyE');
  assert(game.allDone&&game.phase==='dash'&&!$('celebration').hidden&&document.querySelector('.game-shell').classList.contains('dash'),'dash');
  log('PASS 最後の業務完了：開門・明るい画面・業務完了バナー');
  game.hero=center(C.exit);await paint();assert(game.outcome==='success'&&!$('result-stats').hidden,'result');
  assert($('result-stats').textContent.includes('クリア時間')&&$('result-stats').textContent.includes('残った有給の盾'),'stats');log('PASS 脱出成功・称号・4つの結果指標');
  await back();assert(game.added===0&&game.shields===1&&game.jobs.every(j=>j.progress===0),'reset');game.remaining=.001;await paint();
  assert(game.outcome==='failure'&&$('heading').textContent==='議事録に敗れし者','failure');log('PASS 再挑戦初期化・時間切れ・失敗称号');
  for(let i=0;i<3;i++){await back();game.remaining=.001;await paint();}log('PASS 連続3回の再挑戦');
  assert(document.documentElement.scrollWidth<=390,'overflow');log('PASS 390px幅の横はみ出しなし');
  log('完了：結合テスト全項目成功');
}
async function play(){
  // A reproducible random seed controls only request wording, never the game clock.
  let seed=517;game.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  $('action').click();await paint();log('開始：通常設定で追加業務も含めて最後までプレイ');
  const held=new Set();let handled=-1,lastJobs=0;
  const sync=desired=>{
    for(const k of [...held])if(!desired.has(k)){key('keyup',k);held.delete(k);}
    for(const k of desired)if(!held.has(k)){key('keydown',k);held.add(k);}
  };
  const started=performance.now();
  while(game.state!=='result'&&performance.now()-started<150000){
    if(game.state==='playing'){
      const dir=pilotInput(game),want=new Set();
      if(dir.action)want.add('KeyE');
      else {
        // Cardinal inputs align with the tile route; avoid oscillating both axes.
        if(Math.abs(dir.x)>2)want.add(dir.x>0?'KeyD':'KeyA');
        if(Math.abs(dir.y)>2)want.add(dir.y>0?'KeyS':'KeyW');
      }
      sync(want);
      if(game.finishedJobs.length!==lastJobs){lastJobs=game.finishedJobs.length;log('業務完了 '+lastJobs+'/'+game.jobs.length+' / 残り '+game.remaining.toFixed(1)+'秒');}
    }else if(game.state==='encounter'){
      sync(new Set());
      if(handled!==game.catches){
        handled=game.catches;log('接触 '+game.catches+'回目：'+game.request.text);
        await sleep(500);
        const choice=game.catches===1?'accept':game.shields?'shield':'tomorrow';
        document.querySelector('[data-choice="'+choice+'"]').click();await paint();
      }
    }else if(game.state==='response'){
      log('返答結果：'+game.response.title);await sleep(500);$('action').click();await paint();
    }else if(game.state==='paused'){throw Error('通しプレイがフォーカス喪失で停止しました。');}
    await sleep(16);
  }
  sync(new Set());assert(game.outcome==='success','normal playthrough did not escape');
  log('PASS 入力だけで全業務＋追加業務を完了し脱出');
  log('結果：'+game.rank+' / '+game.elapsed.toFixed(1)+'秒 / 接触'+game.catches+'回 / 追加'+game.added+'件 / 盾'+game.shields+'枚');
}
try{if(new URL(import.meta.url).searchParams.get('mode')==='play')await play();else await checks();}
catch(e){log('FAIL '+e.message);console.error(e);}
