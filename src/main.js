import {CONFIG,STAGES} from './config.js';
import {Game} from './game.js';
import {createInput} from './input.js';
import {render} from './render.js';
import {AudioCues} from './audio.js';
import {ProgressStore,SAVE_KEY} from './progress.js';
const $=id=>document.getElementById(id),game=new Game(),canvas=$('game'),ctx=canvas.getContext('2d'),audio=new AudioCues();
const testMode=new URLSearchParams(location.search).get('test')==='1',dev=CONFIG.developer.unlockAllStages;
let storage;try{storage=window.localStorage;}catch{}
const progress=new ProgressStore(storage,SAVE_KEY+(testMode?'.test':''));
let last=performance.now(),previousState='',previousJobs='',visualTime=0,selection=0,newUnlock=false,resetting=false;
const choiceNames=['accept','tomorrow','deflect','shield'];
const visibleButtons=()=>[...$('overlay').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.offsetParent);
const input=createInput(()=>game.state==='playing',()=>{game.pause();input.clear();},command);
function focusGame(){input.clear();last=performance.now();canvas.focus({preventScroll:true});}
function prepare(id){if(!dev&&id>progress.data.unlocked)return;game.prepare(id);previousState='';resetting=false;input.clear();audio.unlock();}
function toTitle(){game.reset(game.stageId);game.state='title';previousState='';resetting=false;input.clear();}
function pick(index){
  if(!game.canChoose(choiceNames[index]))return;
  selection=index;paintSelection();
}
function paintSelection(){
  document.querySelectorAll('[data-choice]').forEach((b,i)=>{
    b.classList.toggle('selected',i===selection);b.setAttribute('aria-current',i===selection?'true':'false');
  });
}
function choose(index){
  if(game.choose(choiceNames[index])){input.clear();audio.unlock();ui();}
}
function command(code){
  const enter=['Enter','NumpadEnter'].includes(code),up=['ArrowUp','KeyW'].includes(code),down=['ArrowDown','KeyS'].includes(code);
  if(game.state==='encounter'){
    const digit=/^(?:Digit|Numpad)([1-4])$/.exec(code);
    if(digit){choose(Number(digit[1])-1);return true;}
    if(up||down){
      let next=selection;
      do{next=(next+(up?3:1))%4;}while(!game.canChoose(choiceNames[next]));
      pick(next);document.querySelectorAll('[data-choice]')[next].focus({preventScroll:true});return true;
    }
    if(enter){choose(selection);return true;}
    return code==='Space';
  }
  if(game.state==='timing'&&(enter||code==='Space')){game.hitTiming();input.clear();ui();return true;}
  if(!['playing','timing'].includes(game.state)){
    const buttons=visibleButtons(),focused=buttons.indexOf(document.activeElement);
    if(up||down){
      if(buttons.length){const b=buttons[(focused+(up?-1:1)+buttons.length)%buttons.length];b.focus({preventScroll:true});b.scrollIntoView({block:'nearest'});}
      return true;
    }
    if(enter){(buttons.includes(document.activeElement)?document.activeElement:buttons[0])?.click();return true;}
  }
  return false;
}
$('pause').onclick=()=>{game.pause();input.clear();};
$('sound').onclick=async()=>{
  audio.muted=!audio.muted;await audio.unlock();$('sound').textContent=audio.muted?'音 OFF':'音 ON';
  $('sound').setAttribute('aria-label',audio.muted?'音を有効にする':'音を無効にする');
  $('sound').setAttribute('aria-pressed',String(!audio.muted));if(!audio.muted)audio.play('complete');
};
$('action').onclick=()=>{
  audio.unlock();
  if(game.state==='paused')game.resume();
  else if(game.state==='briefing')game.begin();
  else if(game.state==='response')game.continueResponse();
  else if(game.state==='result')prepare(game.stageId);
  focusGame();
};
$('next-stage').onclick=()=>prepare(game.stageId+1);
$('to-title').onclick=toTitle;
$('judge').onclick=()=>{game.hitTiming();input.clear();ui();};
$('reset-save').onclick=()=>{resetting=true;previousState='';ui();$('cancel-reset').focus();};
$('cancel-reset').onclick=()=>{resetting=false;previousState='';ui();};
$('confirm-reset').onclick=()=>{progress.reset();game.reset(1);toTitle();};
document.querySelectorAll('[data-choice]').forEach((button,index)=>{
  button.onclick=()=>choose(index);
  button.addEventListener('focus',()=>{if(game.state==='encounter'){selection=index;paintSelection();}});
  button.addEventListener('pointerenter',()=>{if(game.state==='encounter'&&!button.disabled)pick(index);});
});
// Native Tab works too, bounded by the current modal.
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||$('overlay').hidden)return;
  const buttons=visibleButtons(),first=buttons[0],end=buttons.at(-1);if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||!$('overlay').contains(document.activeElement))){e.preventDefault();end.focus();}
  else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}
});
function updateJobs(){
  const C=game.config;
  const html=C.stations.map((s,i)=>{
    const jobs=game.jobs.filter(j=>j.station===s.id),done=jobs.every(j=>j.progress>=j.duration);
    const total=jobs.reduce((n,j)=>n+j.duration,0),value=jobs.reduce((n,j)=>n+j.progress,0),pct=Math.floor(value/total*100);
    const extra=jobs.filter(j=>j.extra&&j.progress<j.duration).length;
    return `<div class="job ${done?'done':''} ${jobs.some(j=>j.id===game.working)?'active':''}"><div class="job-line"><b>${done?'✓':i+1} ${s.name}</b><span>${done?'完了':pct+'%'}</span></div><div class="job-meter"><i style="width:${pct}%"></i></div><small>${extra?'追加 '+extra+'件':'長押し '+s.duration+'秒'}</small></div>`;
  }).join('');
  if(html!==previousJobs){$('jobs').innerHTML=html;previousJobs=html;}
  $('job-count').textContent=`${game.finishedJobs.length} / ${game.jobs.length}`;
  const extra=game.jobs.filter(j=>j.extra&&j.progress<j.duration);
  $('extras').textContent=extra.length?`追加${extra.length}件：${extra[0].name} → ${C.stations.find(s=>s.id===extra[0].station).name}`:game.added?'追加業務も完了！':'追加業務なし';
  $('shield-status').textContent=`有給の盾 ×${game.shields}`;
  $('boss-status').textContent=`怒り ${game.anger}/${C.maxAnger}${game.anger===C.maxAnger?' 激怒！':''}${game.slowLeft>0?' / 減速 '+game.slowLeft.toFixed(0)+'秒':''}`;
  $('boss-status').classList.toggle('enraged',game.anger===C.maxAnger);
  $('stage-label').textContent=`${C.day} / ${C.name}`;
}
function stageMenu(){
  $('stage-select').replaceChildren();
  for(const s of STAGES){
    const b=document.createElement('button'),locked=!dev&&s.id>progress.data.unlocked;
    b.dataset.stage=s.id;b.disabled=locked;
    const best=progress.data.best[s.id];
    const title=document.createElement('b'),detail=document.createElement('small');
    title.textContent=`${s.id}. ${s.day}「${s.name}」`;
    detail.textContent=locked?`ステージ${s.id-1}クリアで解放`:best?'最高：'+best.rank+' / '+best.time.toFixed(1)+'秒':'未挑戦 / Enter またはタップで選ぶ';
    b.append(title,detail);b.onclick=()=>prepare(s.id);$('stage-select').append(b);
  }
}
function resultStats(){
  const entries=[[game.outcome==='success'?'クリア時間':'経過時間',game.elapsed.toFixed(1)+'秒'],['上司との接触',game.catches+'回'],['追加された業務',game.added+'件'],['上司の怒り',game.anger+'/'+game.config.maxAnger],['有給の盾',game.shields+'枚']];
  if(game.slime)entries.push(['会議への参加',game.meetingHits+'回']);
  if(game.director)entries.push(['部長を気絶させた',game.directorStuns+'回']);
  $('result-stats').innerHTML=entries.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}
function ui(){
  const C=game.config;
  $('timer').textContent=game.remaining.toFixed(1);$('clock').textContent=game.clock+' → 18:00';
  $('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;
  const shell=document.querySelector('.game-shell');
  shell.classList.toggle('urgent',game.remaining<=C.urgentTime);shell.classList.toggle('dash',game.phase==='dash');shell.classList.toggle('won',game.outcome==='success');
  $('pause').disabled=!['playing','timing'].includes(game.state);
  const job=game.nearJob(),danger=game.protection===0&&Math.hypot(game.hero.x-game.boss.x,game.hero.y-game.boss.y)<C.dangerDistance&&game.elapsed>=C.warningTime;
  let status='番号へ移動。E / Space または作業ボタンを長押し。';
  if(game.state==='paused')status='一時停止中。再開ボタンで続けます。';
  else if(['encounter','response','timing'].includes(game.state))status='会話中はゲーム時計が止まります。';
  else if(game.state==='result')status=game.outcome==='success'?'定時退勤！ 本日の冒険、終了。':'18:00。今日の冒険は残業へ…。';
  else if(game.meetingLeft>0)status=`会議中… あと${game.meetingLeft.toFixed(1)}秒。時計は進んでいる！`;
  else if(game.director?.phase==='windup')status=`突進まで${game.director.left.toFixed(1)}秒！ 赤い線から横へ！`;
  else if(game.director?.phase==='stunned')status=`部長が気絶中！ あと${game.director.left.toFixed(1)}秒、仕事のチャンス。`;
  else if(game.slime?.phase==='warning')status=`会議まで${game.slime.left.toFixed(1)}秒！ 黄色い円の外へ。`;
  else if(game.notice)status=game.notice.text;
  else if(game.working)status=(danger?'上司が近い！ 離して逃げる？ ':'作業中… ')+(job?job.name+' '+Math.floor(job.progress/job.duration*100)+'%':'');
  else if(game.phase==='dash')status='業務完了！ 移動速度UP。右上の出口へ！';
  else if(job)status=job.name+'：長押しで作業 / 途中の進捗は保存';
  if($('status').textContent!==status)$('status').textContent=status;
  $('status').className='status '+(game.phase==='dash'?'dash':danger?'danger':'');
  document.querySelector('.work-button').classList.toggle('ready',!!job&&game.state==='playing'&&game.meetingLeft===0);
  $('celebration').hidden=!(game.celebration>0&&game.state==='playing');
  if(game.state==='timing'){
    $('timing-cursor').style.left=(game.timingValue*100)+'%';
    $('timing-help').textContent=`あと${Math.max(0,C.timing.duration-game.timing.elapsed).toFixed(1)}秒 / 緑で Space・Enter・タップ`;
  }
  updateJobs();
  if(previousState===game.state)return;
  previousState=game.state;input.clear();
  $('overlay').hidden=game.state==='playing';if(game.state==='playing')return;
  $('choices').hidden=game.state!=='encounter';$('timing-panel').hidden=game.state!=='timing';
  $('stage-select').hidden=game.state!=='title'||resetting;
  $('action').hidden=['title','encounter','timing'].includes(game.state);
  $('next-stage').hidden=true;$('to-title').hidden=!['result','paused'].includes(game.state);
  $('result-stats').hidden=game.state!=='result';$('reset-save').hidden=game.state!=='title'||resetting;
  $('reset-confirm').hidden=!(game.state==='title'&&resetting);
  $('save-status').hidden=!['title','result'].includes(game.state);
  document.querySelector('.dialog').classList.toggle('encounter',game.state==='encounter');
  document.querySelector('.dialog').classList.toggle('stage-menu',game.state==='title');
  if(game.state==='title'){
    $('badge').textContent=dev?'開発設定：全ステージ解放 / 記録しません':testMode?'検証用セーブ（通常記録とは別）':'魔王商事の一週間 / 0.3';
    $('heading').textContent=resetting?'保存データのリセット':'今日は、何曜日を帰る？';
    $('message').textContent=resetting?'このゲームの記録だけを消します。':'クリアして、次の曜日へ。長押し作業の進捗は保存。';
    stageMenu();$('hint').textContent='↑↓ / W S / Tab で移動、Enterで決定';
  }else if(game.state==='briefing'){
    $('badge').textContent=`STAGE ${C.id} / ${C.day}`;$('heading').textContent=C.name;
    $('message').textContent=C.rule+'\n制限時間 '+C.timeLimit+'秒。3業務を終えて出口へ。';
    $('action').textContent='出勤する →';$('hint').textContent='E / Space長押しで作業。離して逃げても進捗保存。';
  }else if(game.state==='paused'){
    $('badge').textContent='ひと休み';$('heading').textContent='一時停止中';
    $('message').textContent='仕事も予告もゲージも、ここで止まっています。';$('action').textContent='再開する';
    $('hint').textContent='Enterで再開。移動キーは押し直してください。';
  }else if(game.state==='encounter'){
    $('badge').textContent=(C.enemy==='director'?'魔王部長':'上司')+' / 怒り '+game.anger+'/'+C.maxAnger;
    $('heading').textContent='ちょっといい？';$('message').textContent=game.request.text;
    const labels=['1. 承知しました','2. 明日やります','3. 担当は部長です','4. 有給の盾'];
    document.querySelectorAll('[data-choice]').forEach((b,i)=>{b.disabled=!game.canChoose(choiceNames[i]);b.querySelector('b').textContent=labels[i];});
    $('accept-detail').textContent=`追加＋1 / 上司を${C.acceptSlowTime}秒減速`;
    $('tomorrow-detail').textContent=game.anger===C.maxAnger?'激怒中：これ以上は先送りできません':'追加なし / 怒り＋1、速度・追跡が強化';
    $('deflect-detail').textContent=`タイミング成功で${C.timing.stopTime}秒停止 / 失敗は長い追加`;
    $('shield-detail').textContent=game.shields?'追加・怒りを回避 / 残り'+game.shields+'回':'使用済み：このプレイでは選べません';
    $('hint').textContent='1〜4／↑↓＋Enterで選択（W/Sも対応）';
    selection=0;paintSelection();
  }else if(game.state==='timing'){
    $('badge').textContent='部長へのパス / タイミング勝負';$('heading').textContent='緑の範囲で、今だ！';
    $('message').textContent='Space / Enter または判定ボタンをタップ。\n押し直して1回だけ決定。時間切れも失敗。';
    $('timing-zone').style.left=C.timing.successStart*100+'%';$('timing-zone').style.width=(C.timing.successEnd-C.timing.successStart)*100+'%';
    $('hint').textContent='ゲーム時計は停止中。焦らず狙おう。';
  }else if(game.state==='response'){
    $('badge').textContent='返答の結果';$('heading').textContent=game.response.title;$('message').textContent=game.response.detail;
    $('action').textContent='仕事に戻る →';$('hint').textContent='Enterで再開。返答後は'+C.protectionTime+'秒すり抜け可能。';
  }else if(game.state==='result'){
    newUnlock=dev?false:progress.record(game);
    const success=game.outcome==='success';$('badge').textContent=C.day+'「'+C.name+'」 / '+(success?'定時退勤！':'残業発生');
    $('heading').textContent=game.rank;
    $('message').textContent=newUnlock?'次のステージ解放！ '+STAGES[game.stageId].day+'「'+STAGES[game.stageId].name+'」':success?(game.stageId===3?'月・水・金、お疲れさまでした！ 次は最高称号へ。':'お疲れさまでした。次は、もっと上手に帰ろう。'):'残り業務 '+(game.jobs.length-game.finishedJobs.length)+'件。次の作戦で再挑戦。';
    resultStats();$('action').textContent='もう一度';
    $('next-stage').hidden=!(game.stageId<3&&(dev||progress.data.unlocked>game.stageId));
    $('hint').textContent='↑↓ / W S / Tab ＋ Enterで操作。最高称号はステージごとに保存。';
  }
  $('save-status').textContent=dev?'開発プレイ：記録は保存しません':progress.available?'解放状況・最高称号をこのブラウザーに保存':'保存できません。この画面を閉じるまでの記録です。';
  let target=game.state==='encounter'?document.querySelector('[data-choice="accept"]'):game.state==='timing'?$('judge'):game.state==='title'?(resetting?$('cancel-reset'):$('stage-select').querySelector('button:not(:disabled)')):$('action');
  target?.focus({preventScroll:true});
}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function frame(now){
  const dt=Math.min((now-last)/1000,CONFIG.maxDelta);last=now;game.update(dt,input.read());
  if(game.state==='playing'||game.state==='result')visualTime+=dt;
  render(ctx,game,visualTime,!reduced.matches);ui();for(const e of game.events.splice(0))audio.play(e);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
export {game,input,audio,progress,ui,prepare,toTitle};
