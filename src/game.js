import {CONFIG as C,center} from './config.js';
import {findPath,clearLine,move} from './pathfinding.js';
export class Game {
  constructor(){this.reset();this.state='title';}
  reset(){Object.assign(this,{state:'playing',hero:center(C.heroStart),boss:center(C.bossStart),remaining:C.timeLimit,elapsed:0,stun:0,protection:0,catches:0,path:[],repath:0,outcome:null});}
  pause(){if(this.state==='playing')this.state='paused';}
  resume(){if(this.state==='paused')this.state='playing';}
  update(delta,input={x:0,y:0}){
    if(this.state!=='playing')return;
    let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){let dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;}
  }
  tick(dt,input){
    this.remaining-=dt;this.elapsed+=dt;
    if(this.stun>0){
      this.stun=Math.max(0,this.stun-dt);
      if(this.stun===0)this.protection=C.protectionTime;
    }else{
      this.protection=Math.max(0,this.protection-dt);
      const length=Math.hypot(input.x,input.y);
      if(length)move(this.hero,input.x/length*C.heroSpeed*dt,input.y/length*C.heroSpeed*dt);
      if(this.elapsed>=C.warningTime){
        this.repath-=dt;
        if(this.repath<=0){this.path=findPath(this.boss,this.hero);this.repath=C.repathTime;}
        let target;
        if(clearLine(this.boss,this.hero))target=this.hero;
        else {
          // Skip only waypoints reachable by a collision-free segment; never cut a desk corner.
          while(this.path.length>1&&clearLine(this.boss,this.path[1]))this.path.shift();
          target=this.path[0];
        }
        if(target){const dx=target.x-this.boss.x,dy=target.y-this.boss.y,d=Math.hypot(dx,dy);if(d>0){let step=Math.min(d,C.bossSpeed*dt);move(this.boss,dx/d*step,dy/d*step);}}
        if(this.protection===0&&Math.hypot(this.hero.x-this.boss.x,this.hero.y-this.boss.y)<C.radius*2&&clearLine(this.hero,this.boss)){
          this.catches++;this.remaining-=C.penalty;this.stun=C.stunTime;
        }
      }
    }
    // Time and contact penalties always take priority over the exit.
    const exit=center(C.exit);
    if(this.remaining<=0){this.remaining=0;this.finish('failure');}
    else if(Math.abs(this.hero.x-exit.x)<C.tile/2&&Math.abs(this.hero.y-exit.y)<C.tile/2)this.finish('success');
  }
  finish(outcome){this.outcome=outcome;this.state='result';}
}
