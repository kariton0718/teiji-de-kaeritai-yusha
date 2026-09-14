import {CONFIG as C} from './config.js';
import {Game} from './game.js';
import {createInput} from './input.js';
import {render} from './render.js';
const game=new Game(),$=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let last=performance.now(),previousState='';
const input=createInput(()=>game.state==='playing',()=>{game.pause();input.clear();});
$('pause').onclick=()=>{game.pause();input.clear();};
$('action').onclick=()=>{if(game.state==='paused')game.resume();else game.reset();input.clear();last=performance.now();canvas.focus({preventScroll:true});};
function ui(){
  $('timer').textContent=game.remaining.toFixed(1);$('time-bar').style.transform=`scaleX(${game.remaining/C.timeLimit})`;
  document.querySelector('.game-shell').classList.toggle('urgent',game.remaining<=5);
  $('pause').disabled=game.state!=='playing';
  const status=game.state==='title'?'仕事は終わった。あとは帰るだけ。':game.state==='paused'?'一時停止中 · 再開するまで時計も止まります':game.state==='result'?`呼び止められた回数：${game.catches}回`:game.stun>0?'ちょっといい？ 5分だけ！ −3秒 / 足止め中':game.protection>0?'対応済み · 保護中は上司をすり抜けられます':game.elapsed<C.warningTime?'上司が動き出すまで、あと少し…':game.remaining<=5?'あと5秒以下！ 緑の出口へ急ごう！':'右上の緑の出口へ！ 机を使って上司をかわそう。';
  if($('status').textContent!==status)$('status').textContent=status;
  if(previousState===game.state)return;previousState=game.state;
  $('overlay').hidden=game.state==='playing';
  if(game.state==='playing')return;
  if(game.state==='paused'){
    $('badge').textContent='ちょっと、ひと休み';$('heading').textContent='退勤チャレンジ中断中';$('message').textContent='時間も上司も停止中。準備ができたら続きをどうぞ。';$('action').textContent='チャレンジを再開';$('hint').textContent='画面を離れると自動で一時停止します';
  }else if(game.state==='result'){
    const success=game.outcome==='success';$('badge').textContent=success?'QUEST COMPLETE':'OVERTIME QUEST';$('heading').textContent=success?'定時退勤！':'残業クエスト発生';$('message').textContent=success?`本日の冒険、終了。残り ${game.remaining.toFixed(1)}秒で退勤しました。`:'残業クエスト発生：議事録の作成';$('action').textContent='もう一度、帰る';$('hint').textContent=`呼び止められた回数：${game.catches}回 · 次は別の通り道で。`;
  }
  if(game.state!=='title')$('action').focus({preventScroll:true});
}
function frame(now){const dt=(now-last)/1000;last=now;game.update(dt,input.read());render(ctx,game);ui();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// Named exports let the local browser integration suite exercise the actual instance.
export {game,input};
