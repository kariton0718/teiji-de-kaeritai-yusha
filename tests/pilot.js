import {CONFIG as C,center} from '../src/config.js';

const unit=(x,y)=>{const n=Math.hypot(x,y)||1;return {x:x/n,y:y/n};};
export function pilot(g){
  const h=g.hero,input={x:0,y:0,attack:false,dash:false,shield:false,ultimate:false};
  if(h.energy<45&&h.shields>0&&h.shieldLeft===0)input.shield=true;
  if(g.ultimate>=C.ultimate.max)input.ultimate=true;
  if(g.phase==='escape')return {...input,...toward(g,center(C.gate))};
  const boss=g.boss&&!g.boss.dead?g.boss:null;
  if(boss?.state==='meetingWarn'&&Math.hypot(h.x-boss.pos.x,h.y-boss.pos.y)<C.boss.meetingRadius+25){Object.assign(input,unit(h.x-boss.pos.x,h.y-boss.pos.y));input.dash=h.dashCd===0;return input;}
  if(boss?.state==='chargeWarn'){Object.assign(input,unit(-boss.dir.y,boss.dir.x));input.dash=h.dashCd===0;return input;}
  const ghost=g.activeEnemies.find(e=>e.type==='ghost'&&e.state==='warn'&&Math.abs((h.x-e.pos.x)*e.dir.y-(h.y-e.pos.y)*e.dir.x)<35);
  if(ghost){Object.assign(input,unit(-ghost.dir.y,ghost.dir.x));input.dash=h.dashCd===0;return input;}
  const shot=g.enemyProjectiles.find(p=>Math.hypot(h.x-p.pos.x,h.y-p.pos.y)<80);
  if(shot){Object.assign(input,unit(-shot.dir.y,shot.dir.x));input.dash=h.dashCd===0;return input;}
  const enemies=g.activeEnemies;if(!enemies.length)return input;
  const target=enemies.reduce((a,b)=>Math.hypot(h.x-a.pos.x,h.y-a.pos.y)<Math.hypot(h.x-b.pos.x,h.y-b.pos.y)?a:b);
  const d=Math.hypot(h.x-target.pos.x,h.y-target.pos.y),reach=g.attackRange+target.radius-8;
  if(d<=reach&&g.nav.clearLine(h,target.pos)){input.attack=true;const dot=h.facing.x*(target.pos.x-h.x)/d+h.facing.y*(target.pos.y-h.y)/d;if(dot<.72)Object.assign(input,unit(target.pos.x-h.x,target.pos.y-h.y));}
  else Object.assign(input,toward(g,target.pos));
  return input;
}
function toward(g,target){
  const h=g.hero;if(g.nav.clearLine(h,target))return unit(target.x-h.x,target.y-h.y);
  const path=g.nav.findPath(h,target),p=path.find(x=>Math.hypot(x.x-h.x,x.y-h.y)>22)||target;return unit(p.x-h.x,p.y-h.y);
}
