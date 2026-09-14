import {CONFIG as C,center} from './config.js';
import {findPath,clearLine,move} from './pathfinding.js';

export function rankResult(g){
  const r=C.titleRules;
  if(g.outcome==='failure')return g.added>=r.managerExtras?'魔王商事の新たな管理職':'議事録に敗れし者';
  if(g.remaining<=r.clutchSeconds)return 'ギリギリ退勤兵';
  if(g.elapsed<=r.legendSeconds&&g.catches<=r.legendMaxCatches&&g.added===0&&g.shields>0)return '伝説の定時勇者';
  if(g.added>=r.managerExtras)return '魔王商事の新たな管理職';
  if(g.added===0&&g.catches<=r.craftMaxCatches)return '華麗なる引き継ぎ職人';
  return g.shields>0?'有給を守りし仕事人':'盾を使い切った帰宅王';
}
export class Game {
  constructor(random=Math.random){this.random=random;this.reset();this.state='title';}
  reset(){
    Object.assign(this,{
      state:'playing',phase:'work',hero:center(C.heroStart),boss:center(C.bossStart),
      remaining:C.timeLimit,elapsed:0,protection:0,bossRest:0,bossSpeed:C.bossSpeed,
      catches:0,added:0,shields:C.shieldCharges,path:[],repath:0,outcome:null,rank:null,
      request:null,lastRequest:-1,response:null,working:null,notice:null,celebration:0,
      jobs:C.stations.map(s=>({id:s.id,station:s.id,name:s.name,duration:s.duration,progress:0,extra:false})),
      events:[]
    });
  }
  get finishedJobs(){return this.jobs.filter(j=>j.progress>=j.duration);}
  get allDone(){return this.jobs.every(j=>j.progress>=j.duration);}
  get clock(){
    const minute=this.remaining===0?C.deadlineMinute:Math.min(C.deadlineMinute,C.startMinute+(C.deadlineMinute-C.startMinute)*this.elapsed/C.timeLimit);
    return `${Math.floor(minute/60).toString().padStart(2,'0')}:${Math.floor(minute%60).toString().padStart(2,'0')}`;
  }
  nearJob(){
    return this.jobs.find(j=>{
      const p=center(C.stations.find(s=>s.id===j.station).spot);
      return j.progress<j.duration&&Math.hypot(this.hero.x-p.x,this.hero.y-p.y)<=C.workRange;
    });
  }
  pause(){if(this.state==='playing'){this.state='paused';this.working=null;}}
  resume(){if(this.state==='paused')this.state='playing';}
  say(text,kind='info'){this.notice={text,kind,left:C.noticeTime};this.events.push(kind);}
  update(delta,input={x:0,y:0,action:false}){
    if(this.state!=='playing')return;
    let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){
      const dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;
    }
  }
  tick(dt,input){
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;
    // No work completion or escape can override the deadline.
    if(this.remaining<=1e-8){this.remaining=0;this.finish('failure');return;}
    this.protection=Math.max(0,this.protection-dt);
    this.bossRest=Math.max(0,this.bossRest-dt);
    this.celebration=Math.max(0,this.celebration-dt);
    if(this.notice){this.notice.left-=dt;if(this.notice.left<=0)this.notice=null;}

    const job=this.nearJob();
    this.working=input.action&&job?job.id:null;
    if(this.working){
      job.progress=Math.min(job.duration,job.progress+dt);
      if(job.duration-job.progress<1e-8)job.progress=job.duration;
      if(job.progress===job.duration){
        this.say(`${job.name}、完了！`,'complete');
        if(this.allDone){
          this.phase='dash';this.celebration=C.celebrationTime;
          this.say('業務完了！ 出口が開いた。退勤ダッシュ！','dash');
        }
      }
    }else{
      const length=Math.hypot(input.x||0,input.y||0);
      const speed=C.heroSpeed*(this.phase==='dash'?C.dashMultiplier:1);
      if(length)move(this.hero,(input.x||0)/length*speed*dt,(input.y||0)/length*speed*dt);
    }
    if(this.elapsed>=C.warningTime&&this.bossRest===0)this.chase(dt);
    const exit=center(C.exit);
    if(this.allDone&&Math.abs(this.hero.x-exit.x)<C.tile/2&&Math.abs(this.hero.y-exit.y)<C.tile/2){this.finish('success');return;}
    if(this.elapsed>=C.warningTime&&this.protection===0&&Math.hypot(this.hero.x-this.boss.x,this.hero.y-this.boss.y)<C.radius*2&&clearLine(this.hero,this.boss))this.encounter();
  }
  chase(dt){
    this.repath-=dt;
    if(this.repath<=0){this.path=findPath(this.boss,this.hero);this.repath=C.repathTime;}
    let target;
    if(clearLine(this.boss,this.hero))target=this.hero;
    else {
      while(this.path.length>1&&clearLine(this.boss,this.path[1]))this.path.shift();
      target=this.path[0];
    }
    if(target){
      const dx=target.x-this.boss.x,dy=target.y-this.boss.y,d=Math.hypot(dx,dy);
      if(d>0){const step=Math.min(d,this.bossSpeed*dt);move(this.boss,dx/d*step,dy/d*step);}
    }
  }
  encounter(){
    if(this.state!=='playing')return;
    this.catches++;this.working=null;this.state='encounter';
    // Avoid immediately repeating the same request.
    const candidates=C.requests.map((_,i)=>i).filter(i=>i!==this.lastRequest);
    this.lastRequest=candidates[Math.min(candidates.length-1,Math.floor(this.random()*candidates.length))];
    this.request=C.requests[this.lastRequest];this.events.push('encounter');
  }
  addJob(){
    this.added++;
    this.jobs.push({id:`extra-${this.added}`,station:this.request.station,name:this.request.job,duration:C.extraDuration,progress:0,extra:true});
    this.phase='work';this.celebration=0;
    return C.stations.find(s=>s.id===this.request.station).name;
  }
  choose(choice){
    if(this.state!=='encounter'||!['accept','tomorrow','deflect','shield'].includes(choice))return false;
    if(choice==='shield'&&this.shields===0)return false;
    const wasDash=this.phase==='dash';
    let title,detail,kind='info';
    if(choice==='shield'){
      this.shields--;title='有給の盾、発動！';detail='追加業務なし。追跡速度もそのまま。今日は帰ります。';kind='shield';
    }else if(choice==='tomorrow'){
      this.bossSpeed=Math.min(C.bossMaxSpeed,this.bossSpeed+C.bossSpeedStep);
      title='明日の自分に託した！';detail=`追加業務なし。上司の追跡は通常の${(this.bossSpeed/C.bossSpeed).toFixed(2)}倍に。${this.bossSpeed===C.bossMaxSpeed?'これ以上は速くなりません。':''}`;kind='danger';
    }else if(choice==='deflect'&&this.random()<C.deflectChance){
      title='部長にパス成功！';detail='上司「そうだったか…」 追加業務なし。';kind='shield';
    }else{
      const station=this.addJob();title=choice==='deflect'?'部長「君に任せた」':'頼れる社員に認定！';
      detail=`追加業務＋1「${this.request.job}」→ ${station}の場所で作業。${wasDash?'出口が再び閉じました。':''}`;kind='danger';
    }
    this.response={title,detail,kind};this.state='response';this.events.push(kind);
    return true;
  }
  continueResponse(){
    if(this.state!=='response')return;
    this.state='playing';this.protection=C.protectionTime;this.bossRest=C.bossResponseRest;
    this.repath=0;this.say(`対応済み。${C.protectionTime}秒間すり抜けOK。`);
  }
  finish(outcome){this.outcome=outcome;this.state='result';this.working=null;this.rank=rankResult(this);this.events.push(outcome);}
}
