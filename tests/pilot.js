import {CONFIG as C} from '../src/config.js';
const unit=(x,y)=>{const n=Math.hypot(x,y)||1;return {x:x/n,y:y/n};};
function toward(g,target){const h=g.hero;if(g.nav.clearLine(h,target))return unit(target.x-h.x,target.y-h.y);const path=g.nav.findPath(h,target),p=path.find(x=>Math.hypot(x.x-h.x,x.y-h.y)>22)||target;return unit(p.x-h.x,p.y-h.y);}
export function pilot(g){
  const h=g.hero,input={x:0,y:0,attack:false,ultimate:false};if(g.ultimate>=C.ultimate.max&&g.ultimateEffectLeft<=0)input.ultimate=true;
  if(g.phase==='escape'&&g.objectivePoint)return {...input,...toward(g,g.objectivePoint)};
  const boss=g.boss&&!g.boss.dead?g.boss:null;
  const area=g.enemyAreas.filter(a=>a.kind!=='laser'&&!a.fired&&Math.hypot(h.x-a.pos.x,h.y-a.pos.y)<a.radius+22).sort((a,b)=>a.left-b.left)[0];if(area&&area.left<.9){Object.assign(input,unit(h.x-area.pos.x,h.y-area.pos.y));return input;}
  if(boss?.state==='attackWarn'&&['charge','multi','beam','crossLaser'].includes(boss.attackKind)){Object.assign(input,unit(-boss.dir.y,boss.dir.x));return input;}
  if(boss?.state==='attackWarn'&&['sidestep','copyShift','flank','presidentRush'].includes(boss.attackKind)&&boss.moveTarget){const d=Math.hypot(h.x-boss.moveTarget.x,h.y-boss.moveTarget.y);if(d<100){Object.assign(input,unit(h.x-boss.moveTarget.x,h.y-boss.moveTarget.y));return input;}}
  if(boss?.state==='attackWarn'&&boss.attackKind==='jumpSlam'&&boss.moveTarget&&Math.hypot(h.x-boss.moveTarget.x,h.y-boss.moveTarget.y)<110){Object.assign(input,unit(h.x-boss.moveTarget.x,h.y-boss.moveTarget.y));return input;}
  if(boss?.state==='attackWarn'&&['slam','sweep','floor'].includes(boss.attackKind)&&Math.hypot(h.x-boss.pos.x,h.y-boss.pos.y)<150){Object.assign(input,unit(h.x-boss.pos.x,h.y-boss.pos.y));return input;}
  const ghost=g.activeEnemies.find(e=>e.type==='ghost'&&e.state==='warn'&&Math.abs((h.x-e.pos.x)*e.dir.y-(h.y-e.pos.y)*e.dir.x)<42);if(ghost){Object.assign(input,unit(-ghost.dir.y,ghost.dir.x));return input;}
  const brute=g.activeEnemies.find(e=>e.type==='brute'&&e.state==='areaWarn'&&Math.hypot(h.x-e.pos.x,h.y-e.pos.y)<C.enemies.brute.areaRadius+20);if(brute){Object.assign(input,unit(h.x-brute.pos.x,h.y-brute.pos.y));return input;}
  const shot=g.enemyProjectiles.filter(p=>Math.hypot(h.x-p.pos.x,h.y-p.pos.y)<78).sort((a,b)=>Math.hypot(h.x-a.pos.x,h.y-a.pos.y)-Math.hypot(h.x-b.pos.x,h.y-b.pos.y))[0];if(shot){Object.assign(input,unit(-shot.dir.y,shot.dir.x));return input;}
  const crowd=g.activeEnemies.filter(e=>!g.isBoss(e)&&Math.hypot(h.x-e.pos.x,h.y-e.pos.y)<58);if(crowd.length>=4){const c=crowd.reduce((p,e)=>({x:p.x+e.pos.x,y:p.y+e.pos.y}),{x:0,y:0});Object.assign(input,unit(h.x-c.x/crowd.length,h.y-c.y/crowd.length));input.attack=true;return input;}
  const enemies=g.activeEnemies;if(!enemies.length)return input;const target=boss&&(boss.weak||(g.skills.slash>=2&&g.bossMinionCount()<12))?boss:enemies.reduce((a,b)=>Math.hypot(h.x-a.pos.x,h.y-a.pos.y)<Math.hypot(h.x-b.pos.x,h.y-b.pos.y)?a:b),d=Math.hypot(h.x-target.pos.x,h.y-target.pos.y),reach=(g.ultimateChoice==='rush'&&g.ultimateEffectLeft>0?C.ultimate.rush.range:g.attackRange)+target.radius-6;
  if(d<=reach&&g.nav.clearLine(h,target.pos)){input.attack=true;const dot=h.facing.x*(target.pos.x-h.x)/(d||1)+h.facing.y*(target.pos.y-h.y)/(d||1);if(dot<Math.cos(g.attackArc/2)*.9)Object.assign(input,unit(target.pos.x-h.x,target.pos.y-h.y));}
  else Object.assign(input,toward(g,target.pos));return input;
}
