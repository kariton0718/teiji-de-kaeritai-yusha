import {getStageConfig,makeSolids,center} from './config.js';
import {navigation} from './pathfinding.js';
export function rankResult(g){
  const r=g.config.titleRules;
  if(g.outcome==='failure')return g.added>=r.managerExtras?'魔王商事の新たな管理職':'議事録に敗れし者';
  if(g.remaining<=r.clutchSeconds)return 'ギリギリ退勤兵';
  if(g.elapsed<=r.legendSeconds&&g.catches<=r.legendMaxCatches&&g.added===0&&g.shields>0)return '伝説の定時勇者';
  if(g.added>=r.managerExtras)return '魔王商事の新たな管理職';
  if(g.added===0&&g.catches<=r.craftMaxCatches)return '華麗なる引き継ぎ職人';
  return g.shields>0?'有給を守りし仕事人':'盾を使い切った帰宅王';
}
export class Game {
  constructor(random=Math.random){this.random=random;this.reset(1);this.state='title';}
  reset(id=this.stageId||1){
    this.config=getStageConfig(id);this.stageId=this.config.id;this.solids=makeSolids(this.config);this.nav=navigation(this.solids);
    const C=this.config;
    Object.assign(this,{
      state:'playing',resumeState:'playing',phase:'work',hero:center(C.heroStart),boss:center(C.bossStart),
      remaining:C.timeLimit,elapsed:0,protection:0,bossRest:0,slowLeft:0,anger:0,
      catches:0,added:0,shields:C.shieldCharges,path:[],repath:0,outcome:null,rank:null,
      request:null,lastRequest:-1,response:null,working:null,notice:null,celebration:0,
      jobs:C.stations.map(s=>({id:s.id,station:s.id,name:s.name,duration:s.duration,progress:0,extra:false})),
      timing:null,meetingLeft:0,meetingHits:0,directorStuns:0,velocity:{x:0,y:0},
      slime:C.enemy==='slime'?{pos:center(C.patrol[0]),waypoint:1,phase:'patrol',left:C.slime.firstDelay,area:null}:null,
      director:C.enemy==='director'?{phase:'chase',left:C.director.firstDelay,origin:null,dir:{x:0,y:1}}:null,
      events:[]
    });
  }
  prepare(id){this.reset(id);this.state='briefing';}
  begin(){if(this.state==='briefing')this.state='playing';}
  get bossSpeed(){return this.config.angerSpeeds[this.anger]*(this.slowLeft>0?this.config.acceptSlowMultiplier:1);}
  get finishedJobs(){return this.jobs.filter(j=>j.progress>=j.duration);}
  get allDone(){return this.jobs.every(j=>j.progress>=j.duration);}
  get clock(){
    const C=this.config,minute=this.remaining===0?C.deadlineMinute:Math.min(C.deadlineMinute,C.startMinute+(C.deadlineMinute-C.startMinute)*this.elapsed/C.timeLimit);
    return `${Math.floor(minute/60).toString().padStart(2,'0')}:${Math.floor(minute%60).toString().padStart(2,'0')}`;
  }
  get timingValue(){
    if(!this.timing)return 0;
    const t=(this.timing.elapsed/this.config.timing.period)%2;return t<=1?t:2-t;
  }
  nearJob(){
    return this.jobs.find(j=>{const p=center(this.config.stations.find(s=>s.id===j.station).spot);return j.progress<j.duration&&Math.hypot(this.hero.x-p.x,this.hero.y-p.y)<=this.config.workRange;});
  }
  pause(){if(['playing','timing'].includes(this.state)){this.resumeState=this.state;this.state='paused';this.working=null;}}
  resume(){if(this.state==='paused')this.state=this.resumeState;}
  say(text,kind='info'){this.notice={text,kind,left:this.config.noticeTime};this.events.push(kind);}
  update(delta,input={x:0,y:0,action:false}){
    const C=this.config;
    if(this.state==='timing'){
      this.timing.elapsed+=Math.min(Math.max(delta,0),C.maxDelta);
      if(this.timing.elapsed>=C.timing.duration)this.resolveTiming(false);
      return;
    }
    if(this.state!=='playing')return;
    let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){const dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;}
  }
  tick(dt,input){
    const C=this.config;
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;
    if(this.remaining<=1e-8){this.remaining=0;this.finish('failure');return;}
    this.protection=Math.max(0,this.protection-dt);this.bossRest=Math.max(0,this.bossRest-dt);this.slowLeft=Math.max(0,this.slowLeft-dt);
    this.celebration=Math.max(0,this.celebration-dt);
    if(this.notice){this.notice.left-=dt;if(this.notice.left<=0)this.notice=null;}
    const old={...this.hero};this.working=null;
    if(this.meetingLeft>0){
      this.meetingLeft=Math.max(0,this.meetingLeft-dt);
      if(this.meetingLeft===0){this.protection=Math.max(this.protection,C.slime.protectionAfter);this.say('会議終了！ 今のうちに逃げよう。');}
    }else{
      const job=this.nearJob();this.working=input.action&&job?job.id:null;
      if(this.working){
        job.progress=Math.min(job.duration,job.progress+dt);
        if(job.duration-job.progress<1e-8)job.progress=job.duration;
        if(job.progress===job.duration){
          this.say(`${job.name}、完了！`,'complete');
          if(this.allDone){this.phase='dash';this.celebration=C.celebrationTime;this.say('業務完了！ 出口が開いた。退勤ダッシュ！','dash');}
        }
      }else{
        const n=Math.hypot(input.x||0,input.y||0),speed=C.heroSpeed*(this.phase==='dash'?C.dashMultiplier:1);
        if(n)this.nav.move(this.hero,(input.x||0)/n*speed*dt,(input.y||0)/n*speed*dt);
      }
    }
    this.velocity={x:(this.hero.x-old.x)/dt,y:(this.hero.y-old.y)/dt};
    if(this.slime)this.updateSlime(dt);
    if(this.elapsed>=C.warningTime&&this.bossRest===0){if(this.director)this.updateDirector(dt);else this.chase(dt);}
    const exit=center(C.exit);
    if(this.allDone&&Math.abs(this.hero.x-exit.x)<C.tile/2&&Math.abs(this.hero.y-exit.y)<C.tile/2){this.finish('success');return;}
    const contactAllowed=!this.director||['chase','charge'].includes(this.director.phase);
    if(this.elapsed>=C.warningTime&&this.bossRest===0&&contactAllowed&&this.meetingLeft===0&&this.protection===0&&Math.hypot(this.hero.x-this.boss.x,this.hero.y-this.boss.y)<C.radius*2&&this.nav.clearLine(this.hero,this.boss))this.encounter();
  }
  chase(dt){
    const C=this.config,lead=C.angerPrediction[this.anger];
    let aim={x:this.hero.x+this.velocity.x*lead,y:this.hero.y+this.velocity.y*lead};
    if(this.nav.blocked(aim.x,aim.y)||aim.x<40||aim.x>440||aim.y<40||aim.y>600)aim=this.hero;
    this.repath-=dt;
    if(this.repath<=0){this.path=this.nav.findPath(this.boss,aim);this.repath=C.angerRepath[this.anger];}
    let target;
    if(this.nav.clearLine(this.boss,aim))target=aim;
    else {while(this.path.length>1&&this.nav.clearLine(this.boss,this.path[1]))this.path.shift();target=this.path[0];}
    if(target){const dx=target.x-this.boss.x,dy=target.y-this.boss.y,d=Math.hypot(dx,dy);if(d>0){const step=Math.min(d,this.bossSpeed*dt);this.nav.move(this.boss,dx/d*step,dy/d*step);}}
  }
  updateSlime(dt){
    const s=this.slime,C=this.config,H=C.slime;
    s.left-=dt;
    if(s.phase==='warning'){
      if(s.left>0)return;
      if(Math.hypot(this.hero.x-s.area.x,this.hero.y-s.area.y)<=H.radius){
        this.meetingLeft=H.meetingTime;this.meetingHits++;this.working=null;this.say(`会議に捕まった！ ${H.meetingTime}秒間、作業も移動もできない。`,'danger');
      }else this.say('会議を回避！ 仕事を進めよう。','complete');
      s.phase='patrol';s.left=H.interval;s.area=null;return;
    }
    if(s.left<=0){s.phase='warning';s.left=H.warning;s.area={...s.pos};this.say('会議予告！ 黄色い円の外へ逃げて！','encounter');return;}
    const target=center(C.patrol[s.waypoint]),dx=target.x-s.pos.x,dy=target.y-s.pos.y,d=Math.hypot(dx,dy),step=Math.min(d,H.speed*dt);
    if(d>0)this.nav.move(s.pos,dx/d*step,dy/d*step);
    if(d<=step+.001)s.waypoint=(s.waypoint+1)%C.patrol.length;
  }
  updateDirector(dt){
    const d=this.director,C=this.config,H=C.director;
    d.left-=dt;
    if(d.phase==='stunned'){if(d.left<=0){d.phase='chase';d.left=H.interval;}return;}
    if(d.phase==='windup'){if(d.left<=0){d.phase='charge';d.left=H.duration;this.events.push('danger');}return;}
    if(d.phase==='charge'){
      const speed=H.speed*(this.slowLeft>0?C.acceptSlowMultiplier:1);
      const x=this.boss.x+d.dir.x*speed*dt,y=this.boss.y+d.dir.y*speed*dt;
      if(this.nav.blocked(x,y)){d.phase='stunned';d.left=H.stunTime;this.directorStuns++;this.say(`机・壁に激突！ 部長が${H.stunTime}秒気絶。作業のチャンス！`,'complete');return;}
      this.boss.x=x;this.boss.y=y;
      if(d.left<=0){d.phase='chase';d.left=H.interval;}
      return;
    }
    if(d.left<=0){
      const dx=this.hero.x-this.boss.x,dy=this.hero.y-this.boss.y,n=Math.hypot(dx,dy)||1;
      d.phase='windup';d.left=H.warning;d.origin={...this.boss};d.dir={x:dx/n,y:dy/n};
      this.say('最終確認！ 赤い線から横へ。机にぶつけよう！','encounter');return;
    }
    this.chase(dt);
  }
  chargeEnd(){
    const d=this.director;if(!d?.origin)return this.boss;
    const length=this.config.director.speed*this.config.director.duration;
    let p={...d.origin};
    for(let n=0;n<length;n+=4){const q={x:p.x+d.dir.x*4,y:p.y+d.dir.y*4};if(this.nav.blocked(q.x,q.y))break;p=q;}
    return p;
  }
  encounter(){
    if(this.state!=='playing')return;
    this.catches++;this.working=null;this.state='encounter';
    if(this.director){this.director.phase='chase';this.director.left=this.config.director.interval;}
    const C=this.config,options=C.requests.map((_,i)=>i).filter(i=>i!==this.lastRequest);
    this.lastRequest=options[Math.min(options.length-1,Math.floor(this.random()*options.length))];
    this.request=C.requests[this.lastRequest];this.events.push('encounter');
  }
  addJob(duration=this.config.extraDuration){
    this.added++;this.jobs.push({id:`extra-${this.added}`,station:this.request.station,name:this.request.job,duration,progress:0,extra:true});
    this.phase='work';this.celebration=0;
    return this.config.stations.find(s=>s.id===this.request.station).name;
  }
  canChoose(choice){return ['accept','tomorrow','deflect','shield'].includes(choice)&&(choice!=='shield'||this.shields>0)&&(choice!=='tomorrow'||this.anger<this.config.maxAnger);}
  respond(title,detail,kind='info'){this.response={title,detail,kind};this.state='response';this.events.push(kind);}
  choose(choice){
    if(this.state!=='encounter'||!this.canChoose(choice))return false;
    const C=this.config,wasDash=this.phase==='dash';
    if(choice==='shield'){
      this.shields--;this.respond('有給の盾、発動！','追加業務なし。怒りもそのまま。今日は帰ります。','shield');
    }else if(choice==='tomorrow'){
      this.anger++;this.repath=0;
      this.respond(this.anger===C.maxAnger?'上司、激怒！ 先送りはもうできない。':'明日に回した。上司の怒り＋1',
        `追加なし。怒り ${this.anger}/${C.maxAnger}。追跡が速く、先回りも鋭くなる。`,'danger');
    }else if(choice==='deflect'){
      this.timing={elapsed:0};this.state='timing';
    }else{
      const station=this.addJob();this.slowLeft=C.acceptSlowTime;
      this.respond('引き受けた。今なら隙がある！',`追加＋1「${this.request.job}」→ ${station}。上司は${C.acceptSlowTime}秒間ゆっくり移動。${wasDash?'出口は再び閉鎖。':''}`,'complete');
    }
    return true;
  }
  hitTiming(){
    if(this.state!=='timing')return false;
    const t=this.timingValue,H=this.config.timing;
    this.resolveTiming(t>=H.successStart&&t<=H.successEnd);return true;
  }
  resolveTiming(success){
    if(this.state!=='timing')return;
    const C=this.config,wasDash=this.phase==='dash';
    if(success){this.bossRest=C.timing.stopTime;this.respond('部長へのパス成功！',`追加なし。上司が${C.timing.stopTime}秒停止。今が仕事のチャンス！`,'shield');}
    else {const station=this.addJob(C.failedExtraDuration);this.respond('部長「説明をまとめておいて」',`判定失敗。長い追加業務＋1（${C.failedExtraDuration}秒）→ ${station}。${wasDash?'出口は再び閉鎖。':''}`,'danger');}
  }
  continueResponse(){
    if(this.state!=='response')return;
    const C=this.config;this.state='playing';this.protection=C.protectionTime;this.bossRest=Math.max(this.bossRest,C.bossResponseRest);
    this.repath=0;this.say(`対応済み。${C.protectionTime}秒間すり抜けOK。`);
  }
  finish(outcome){this.outcome=outcome;this.state='result';this.working=null;this.rank=rankResult(this);this.events.push(outcome);}
}
