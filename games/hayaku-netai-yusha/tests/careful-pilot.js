import {distance,clamp} from '../game.js';
import {segmentDistance} from '../combat.js';
// Controller only: reads state, moves and presses ultimate. Never changes combat stats.
export function carefulPilot(g) {
  if(g.state==='commute')return {x:240-g.hero.x,y:92-g.hero.y};
  const enemies=g.enemies.filter(e=>!e.dead),near=enemies.filter(e=>distance(e,g.hero)<200);
  const target=g.request||(g.boss&&!g.boss.dead?g.boss:enemies.reduce((a,e)=>!a||distance(e,g.hero)<distance(a,g.hero)?e:a,null))||{x:240,y:310};
  let best=Infinity,chosen={x:0,y:0};
  const speed=g.buffs.shoes>0?245:177,dt=.35;
  for(let i=-1;i<16;i++) {
    const angle=i*Math.PI/8,v=i<0?{x:0,y:0}:{x:Math.cos(angle),y:Math.sin(angle)};
    const p={x:clamp(g.hero.x+v.x*speed*dt,24,456),y:clamp(g.hero.y+v.y*speed*dt,74,580)};
    let score=g.request?distance(p,target)*.3:Math.abs(distance(p,target)-(target.boss?105:65))*.15;
    score+=Math.max(0,45-p.x)*.2+Math.max(0,p.x-435)*.2+Math.max(0,95-p.y)*.2+Math.max(0,p.y-550)*.2;
    for(const e of near){const d=distance(p,e),r=e.radius+32;score+=Math.max(0,r-d)*(e.boss?10:2.5);}
    for(const h of g.hazards){if(h.visualOnly||['mobShot','volley','ring','gapRing','boomerang','nextCharge'].includes(h.kind))continue;const d=h.shape==='line'?segmentDistance(p,h,{x:h.x2,y:h.y2}):distance(p,h);score+=Math.max(0,h.r+24-d)*(h.life<.8?4:1.2);}
    for(const z of g.zones)score+=Math.max(0,z.r+22-distance(p,z))*5;
    for(const b of g.projectiles){if(b.friendly||distance(b,g.hero)>170)continue;const end={x:b.x+b.vx*dt,y:b.y+b.vy*dt};score+=Math.max(0,b.radius+22-segmentDistance(p,b,end))*3;}
    if(score<best){best=score;chosen=v;}
  }
  return {...chosen,ultimate:g.ultimate>=100&&(enemies.length>25||Boolean(g.boss)||g.hero.energy<35)};
}
