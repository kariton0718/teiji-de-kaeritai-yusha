import {CONFIG as C} from './config.js';
import {Game} from './game.js';
import {createInput} from './input.js';
import {render} from './render.js';
import {AudioCues} from './audio.js';
const game=new Game(),$=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),audio=new AudioCues();
let last=performance.now(),previousState='',previousJobs='',visualTime=0;
const input=createInput(()=>game.state==='playing',()=>{game.pause();input.clear();});
const focusGame=()=>{input.clear();last=performance.now();canvas.focus({preventScroll:true});};
$('pause').onclick=()=>{game.pause();input.clear();};
$('sound').onclick=async()=>{
  audio.muted=!audio.muted;await audio.unlock();
  $('sound').textContent=audio.muted?'音 OFF':'音 ON';
  $('sound').setAttribute('aria-label',audio.muted?'音を有効にする':'音を無効にする');
  $('sound').setAttribute('aria-pressed',String(!audio.muted));
  if(!audio.muted)audio.play('complete');
};
$('action').onclick=()=>{
  audio.unlock();
  if(game.state==='paused')game.resume();
  else if(game.state==='response')game.continueResponse();
  else if(game.state==='title'||game.state==='result')game.reset();
  focusGame();
};
document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
  if(game.choose(button.dataset.choice)){input.clear();audio.unlock();}
});
// Keep keyboard navigation in the current dialog. Movement is disabled there.
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||$('overlay').hidden)return;
  const buttons=[...$('overlay').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden&&b.offsetParent);
  if(!buttons.length)return;
  const first=buttons[0],end=buttons.at(-1);
  if(e.shiftKey&&(document.activeElement===first||!$('overlay').contains(document.activeElement))){e.preventDefault();end.focus();}
  else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}
});
function updateJobs(){
  const html=C.stations.map((s,i)=>{
    const jobs=game.jobs.filter(j=>j.station===s.id),done=jobs.every(j=>j.progress>=j.duration);
    const total=jobs.reduce((n,j)=>n+j.duration,0),progress=jobs.reduce((n,j)=>n+j.progress,0),pct=Math.floor(progress/total*100);
    const extra=jobs.filter(j=>j.extra&&j.progress<j.duration).length;
    const current=game.working&&jobs.some(j=>j.id===game.working);
    return `<div class="job ${done?'done':''} ${current?'active':''}"><div class="job-line"><b>${done?'✓':i+1} ${s.name}</b><span>${done?'完了':pct+'%'}</span></div><div class="job-meter"><i style="width:${pct}%"></i></div><small>${extra?'追加 '+extra+'件':'長押し '+s.duration+'秒'}</small></div>`;
  }).join('');
  if(html!==previousJobs){$('jobs').innerHTML=html;previousJobs=html;}
  $('job-count').textContent=`${game.finishedJobs.length} / ${game.jobs.length}`;
  const extra=game.jobs.filter(j=>j.extra&&j.progress<j.duration);
  $('extras').textContent=extra.length?`追加 ${extra.length}件：${extra[0].name} → ${C.stations.find(s=>s.id===extra[0].station).name}${extra.length>1?' ほか':''}`:game.added?'追加業務も完了！':'追加業務なし';
  $('shield-status').textContent=`有給の盾 ×${game.shields}`;
  $('boss-status').textContent=game.bossSpeed===C.bossSpeed?'上司 通常':`上司 ${(game.bossSpeed/C.bossSpeed).toFixed(2)}倍速`;
}
function resultStats(){
  const values=[[game.outcome==='success'?'クリア時間':'経過時間',game.elapsed.toFixed(1)+'秒'],['捕まった回数',game.catches+'回'],['追加された仕事',game.added+'件'],['残った有給の盾',game.shields+'枚']];
  $('result-stats').innerHTML=values.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}
function ui(){
  $('timer').textContent=game.remaining.toFixed(1);$('clock').textContent=game.clock+' → 18:00';
  $('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;
  const shell=document.querySelector('.game-shell');
  shell.classList.toggle('urgent',game.remaining<=C.urgentTime);
  shell.classList.toggle('dash',game.phase==='dash');
  shell.classList.toggle('won',game.outcome==='success');
  $('pause').disabled=game.state!=='playing';
  const job=game.nearJob();
  const danger=game.protection===0&&Math.hypot(game.hero.x-game.boss.x,game.hero.y-game.boss.y)<C.dangerDistance&&game.elapsed>=C.warningTime;
  let status='光る番号へ。E / Space または作業ボタンを長押し。';
  if(game.state==='paused')status='一時停止中。時計も仕事も上司も停止しています。';
  else if(game.state==='encounter'||game.state==='response')status='返答中は時計が止まります。落ち着いて選ぼう。';
  else if(game.state==='result')status=game.outcome==='success'?'定時退勤！ 本日の冒険、終了。':'18:00。今日の冒険は残業へ…。';
  else if(game.notice)status=game.notice.text;
  else if(game.working)status=`${danger?'上司が近い！ 離して逃げる？ ':'作業中… '}${job?job.name+' '+Math.floor(job.progress/job.duration*100)+'%':''}`;
  else if(game.phase==='dash')status='業務完了！ 移動速度UP。右上の出口へ！';
  else if(job)status=`${job.name}：長押しで進む / 離しても進捗保存`;
  else if(danger)status='上司が近づいている！ 机の向こうへ逃げよう。';
  if($('status').textContent!==status)$('status').textContent=status;
  $('status').className='status '+(game.phase==='dash'?'dash':danger?'danger':'');
  document.querySelector('.work-button').classList.toggle('ready',!!job&&game.state==='playing');
  $('celebration').hidden=!(game.celebration>0&&game.state==='playing');
  updateJobs();
  if(previousState===game.state)return;
  previousState=game.state;input.clear();
  $('overlay').hidden=game.state==='playing';
  if(game.state==='playing')return;
  $('choices').hidden=game.state!=='encounter';
  $('action').hidden=game.state==='encounter';
  $('result-stats').hidden=game.state!=='result';
  document.querySelector('.dialog').classList.toggle('encounter',game.state==='encounter');
  if(game.state==='title'){
    $('badge').textContent='魔王商事、17:45。';
    $('heading').textContent='仕事を終えて、帰ろう。';
    $('message').textContent=`定時まで${C.timeLimit}秒。3つの仕事を長押しで完了。
上司が来たら、続ける？ 逃げる？`;
    $('action').textContent='業務を始める →';
    $('hint').textContent='移動：WASD / 矢印　作業：E / Space 長押し';
  }else if(game.state==='paused'){
    $('badge').textContent='ひと休み';$('heading').textContent='業務を一時停止中';
    $('message').textContent='作業の進捗はそのまま。準備ができたら再開。';
    $('action').textContent='業務を再開';$('hint').textContent='画面を離れると自動で停止します。';
  }else if(game.state==='encounter'){
    $('badge').textContent=`上司からの依頼 / ${game.catches}回目`;
    $('heading').textContent='ちょっといい？';$('message').textContent=game.request.text;
    $('accept-detail').textContent=`追加＋1件（${C.extraDuration}秒）/ 上司の速さはそのまま`;
    $('tomorrow-detail').textContent=game.bossSpeed===C.bossMaxSpeed?'追加なし / 上司の速さはすでに上限':'追加なし / 上司の追跡がさらに速くなる';
    $('deflect-detail').textContent=`${Math.round(C.deflectChance*100)}%で回避 / 失敗すると追加＋1件`;
    $('shield-detail').textContent=game.shields?'追加なし・加速なし / 残り'+game.shields+'回':'使用済み / このプレイでは使えません';
    document.querySelector('[data-choice="shield"]').disabled=game.shields===0;
    $('hint').textContent=`時計は停止中。返答後は${C.protectionTime}秒間、上司をすり抜け可能。`;
  }else if(game.state==='response'){
    $('badge').textContent='返答の結果';$('heading').textContent=game.response.title;
    $('message').textContent=game.response.detail;$('action').textContent='よし、仕事に戻る →';
    $('hint').textContent='ボタンを押すまで時計は止まっています。';
  }else if(game.state==='result'){
    const success=game.outcome==='success';
    $('badge').textContent=success?'定時退勤！ 本日の冒険、終了。':'18:00 / 残業クエスト発生';
    $('heading').textContent=game.rank;
    $('message').textContent=success?'お疲れさまでした。今夜は、自分の時間！':`未完了 ${game.jobs.length-game.finishedJobs.length}件。${game.allDone?'あと一歩、出口に届かなかった。':'途中の進捗も次の作戦のヒントに。'}`;
    resultStats();$('action').textContent='もう一度、帰る';
    $('hint').textContent=game.rank==='伝説の定時勇者'?'次は盾を使って別の称号も狙ってみよう。':`次の目標：${C.titleRules.legendSeconds}秒以内・接触${C.titleRules.legendMaxCatches}回以下・追加0・盾を残して「伝説の定時勇者」。`;
  }
  const target=game.state==='encounter'?document.querySelector('[data-choice="accept"]'):$('action');
  target.focus({preventScroll:true});
}
function frame(now){
  const dt=Math.min((now-last)/1000,C.maxDelta);last=now;
  game.update(dt,input.read());
  if(game.state==='playing'||game.state==='result')visualTime+=dt;
  render(ctx,game,visualTime,!window.matchMedia('(prefers-reduced-motion: reduce)').matches);ui();
  for(const event of game.events.splice(0))audio.play(event);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Local integration tests import the actual instance, not a parallel mock.
export {game,input,audio};
