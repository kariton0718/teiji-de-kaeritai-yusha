import { BOSS_MOVES } from './combat-data.js';
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const segmentDistance = (p,a,b) => {
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
export function hazard(g, data) {
  if(g.hazards.length >= 28) return;
  g.hazards.push({r:40,life:1.1,fired:false,damage:20,...data});
}
export function shot(g, origin, angle, options={}) {
  if(g.projectiles.length>=160 || (!options.friendly && g.projectiles.filter(p=>!p.friendly).length>=112)) return;
  const p={x:origin.x,y:origin.y,speed:155,radius:7,life:5,damage:10,friendly:false,kind:'ball',hits:new Set(),...options};
  p.vx=Math.cos(angle)*p.speed;p.vy=Math.sin(angle)*p.speed;g.projectiles.push(p);
}
function volley(g,e,count=3,speed=125,spread=.32) {
  const angle=Math.atan2(g.hero.y-e.y,g.hero.x-e.x);
  for(let i=0;i<count;i++)shot(g,e,angle+(i-(count-1)/2)*spread,{speed,kind:e.prop||'ball',damage:12});
}
function line(g,origin,target,width=23,life=1.25,extra={}) {
  hazard(g,{x:origin.x,y:origin.y,x2:target.x,y2:target.y,r:width,life,shape:'line',...extra});
}
function aimCharge(g,e) {
  e.aim={x:g.hero.x,y:g.hero.y}; e.windup=.85;
  line(g,e,e.aim,e.radius,.85,{damage:0,visualOnly:true});
}
export function bossAttack(g,e) {
  const stage=g.secretActive?6:g.stage, phase=e.hp<e.maxHp*.25?3:e.hp<e.maxHp*.6?2:1;
  const turn=(e.turn||0)%5;e.turn=(e.turn||0)+1;e.phase=phase;
  e.move=BOSS_MOVES[stage][turn];g.effect('label',240,185,0,`${phase===3?'ラストスパート！ ':phase===2?'本気！ ':''}${e.move}`,1.6);
  if(stage===0) {
    if(turn===0)for(let i=0;i<phase+1;i++)hazard(g,{x:clamp(g.hero.x+(i?90:-20),40,440),y:g.hero.y,r:48,life:1.25+i*.2});
    if(turn===1)aimCharge(g,e);
    if(turn===2){g.spawn(8+phase*3,'block');hazard(g,{x:e.x,y:e.y,kind:'volley',count:3+phase*2,r:25});}
  } else if(stage===1) {
    if(turn===0)hazard(g,{x:e.x,y:e.y,kind:'volley',count:3+phase*2,r:28});
    if(turn===1){line(g,{x:24,y:g.hero.y},{x:456,y:g.hero.y},22);line(g,{x:g.hero.x,y:65},{x:g.hero.x,y:584},22);}
    if(turn===2)for(let i=0;i<3+phase;i++)hazard(g,{x:clamp(g.hero.x+Math.cos(i*1.8)*100,45,435),y:clamp(g.hero.y+Math.sin(i*1.8)*100,100,550),r:45,life:1.2+i*.25});
  } else if(stage===2) {
    if(turn===0)for(let i=0;i<3+phase;i++)hazard(g,{x:65+i*85,y:g.hero.y,r:33,life:1.3+i*.15});
    if(turn===1){e.pull=2.2;hazard(g,{x:e.x,y:e.y,r:95,life:2.3});}
    if(turn===2){g.spawn(10+phase*3,'sock');g.spawn(2,'towel');}
  } else if(stage===3) {
    if(turn===0)hazard(g,{x:e.x,y:e.y,kind:'volley',count:5+phase*2,r:28});
    if(turn===1)for(let i=0;i<phase+1;i++){const x=clamp(g.hero.x+(i-.5)*110,35,445);line(g,{x,y:65},{x,y:585},23,1.2+i*.2);}
    if(turn===2){g.spawn(4,'duck');for(let i=0;i<3;i++)hazard(g,{x:80+i*160,y:g.hero.y,r:43,life:1.5});}
  } else if(stage===4) {
    if(turn===0){hazard(g,{x:e.x,y:e.y,kind:'volley',count:7,r:28});hazard(g,{x:g.hero.x,y:g.hero.y,r:48,life:1.6});}
    if(turn===1)aimCharge(g,e);
    if(turn===2){g.spawn(phase*3,'bag');g.spawn(3,'alarm');line(g,{x:24,y:g.hero.y},{x:456,y:g.hero.y},25);}
  } else {
    if(turn===0){hazard(g,{x:e.x,y:e.y,kind:'ring',count:10+phase*2,r:32});hazard(g,{x:g.hero.x,y:g.hero.y,r:45,life:1.6});}
    if(turn===1){line(g,{x:30,y:90},{x:450,y:570},25);line(g,{x:450,y:90},{x:30,y:570},25,1.55);if(phase===2)line(g,{x:24,y:g.hero.y},{x:456,y:g.hero.y},22,1.8);}
    if(turn===2){g.spawn(4,'bread');g.spawn(3,'brush');g.spawn(2,'alarm');e.pull=1.5;hazard(g,{x:e.x,y:e.y,r:85,life:1.6});}
  }
  if(turn>=3)signatureAttack(g,e,stage,turn,phase);
  e.attackCd=phase===3?1.75:phase===2?2.25:2.9;g.emit('warning');
}
function signatureAttack(g,e,stage,turn,phase) {
  const target={x:g.hero.x,y:g.hero.y},angle=Math.atan2(target.y-e.y,target.x-e.x);
  if(stage===0){
    if(turn===3)for(let i=0;i<6;i++)hazard(g,{x:clamp(target.x+(i-2)*62,35,445),y:clamp(target.y+(i-2)*24,95,550),r:34,life:.85+i*.24});
    else {g.spawn(phase+2,'train');line(g,{x:24,y:target.y},{x:456,y:target.y},27,1);line(g,{x:target.x,y:65},{x:target.x,y:584},27,1.5);}
  } else if(stage===1){
    if(turn===3)hazard(g,{x:e.x,y:e.y,kind:'boomerang',angle,count:phase+2,r:32,life:.9,prop:'plate'});
    else for(let i=0;i<3;i++)hazard(g,{x:clamp(target.x+(i-1)*105,45,435),y:clamp(target.y+(i%2)*90,100,550),kind:'zone',r:42,life:1.1+i*.35,duration:3});
  } else if(stage===2){
    if(turn===3){e.pull=2.4;hazard(g,{x:e.x,y:e.y,kind:'gapRing',angle,count:14,r:32,life:1.05,prop:'sock'});}
    else for(let i=0;i<3+phase;i++)hazard(g,{x:clamp(target.x+Math.cos(i*1.5)*90,40,440),y:clamp(target.y+Math.sin(i*1.5)*90,100,550),r:40,life:.9+i*.4});
  } else if(stage===3){
    if(turn===3){for(let i=0;i<phase;i++)hazard(g,{x:e.x,y:e.y,kind:'gapRing',angle:angle+i*.55,count:16,r:30,life:.9+i*.7,prop:'bubble'});}
    else{const safe=Math.floor(clamp(target.x/96,0,4));for(let i=0;i<5;i++)if(i!==safe)line(g,{x:48+i*96,y:70},{x:48+i*96,y:584},29,1.15);line(g,{x:48+safe*96,y:70},{x:48+safe*96,y:584},29,2.4);}
  } else if(stage===4){
    if(turn===3)hazard(g,{x:e.x,y:e.y,kind:'boomerang',angle,count:4+phase,r:30,life:1,prop:'bag'});
    else{aimCharge(g,e);hazard(g,{x:e.x,y:e.y,kind:'nextCharge',owner:e,r:27,life:1.65});if(phase>=2)hazard(g,{x:e.x,y:e.y,kind:'nextCharge',owner:e,r:27,life:3.25});}
  } else {
    if(turn===3)for(let i=0;i<4+phase;i++){const a=i*.43;line(g,e,{x:e.x+Math.cos(a)*650,y:e.y+Math.sin(a)*650},17,.85+i*.28);}
    else{for(let i=0;i<phase+1;i++)hazard(g,{x:e.x,y:e.y,kind:'gapRing',angle:angle+i*.55,count:18,r:30,life:1+i*.65,prop:'clock'});hazard(g,{x:target.x,y:target.y,r:56,life:2.8});}
  }
}
export function updateEnemies(g,dt) {
  let rangedBudget=0;
  const boosters=g.enemies.filter(e=>!e.dead&&e.behavior==='support');
  for(const e of g.enemies) {
    if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.age=(e.age||0)+dt;
    const d=dist(e,g.hero),a=Math.atan2(g.hero.y-e.y,g.hero.x-e.x),b=e.behavior||'chase';
    let angle=a,speed=e.speed*(e.boss?(e.hp<e.maxHp*.6?1.2:1):1.12);
    e.boosted=!e.boss&&boosters.some(s=>s!==e&&dist(s,e)<115);
    if(e.boosted)speed*=1.3;
    if(b==='zigzag')angle+=Math.sin(e.age*6)*.85;
    if(b==='orbit')angle+=d<180?1.05:.35;
    if(['ranged','spread','sniper','support'].includes(b)&&d<200)speed=d<135?-speed*.6:0;
    if(e.windup>0){speed=0;e.windup-=dt;if(e.windup<=0){e.dash=.65;e.dashAngle=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);}}
    if(e.dash>0){e.dash-=dt;angle=e.dashAngle;speed=e.boss?310:260;}
    e.x=clamp(e.x+Math.cos(angle)*speed*dt,22,458);e.y=clamp(e.y+Math.sin(angle)*speed*dt,65,584);
    if(dist(e,g.hero)<e.radius+15)g.hurtHero(e.boss?18:b==='tank'?13:8,e.boss?g.config.boss:'押し寄せる家事');
    if(e.pull>0){e.pull-=dt;g.hero.x=clamp(g.hero.x-Math.cos(a)*44*dt,24,456);g.hero.y=clamp(g.hero.y-Math.sin(a)*44*dt,74,580);g.effect('vacuum',e.x,e.y,110,'',.12);}
    e.attackCd=(e.attackCd??(2+g.random()*3))-dt;
    if(e.boss){if(e.attackCd<=0)bossAttack(g,e);continue;}
    if(e.attackCd>0||d>380)continue;
    // Only a few ranged enemies may begin a shot per frame/wave window.
    if(['ranged','spread','sniper'].includes(b)&&g.hazards.filter(h=>h.owner&&!h.owner.dead).length<9&&rangedBudget<3){
      rangedBudget++;hazard(g,{x:e.x,y:e.y,x2:g.hero.x,y2:g.hero.y,shape:'aim',kind:'mobShot',owner:e,r:8,life:b==='sniper'?.85:.7,count:b==='spread'?5:b==='ranged'?2:1,speed:b==='sniper'?270:155});
    }
    if(b==='charge')aimCharge(g,e);
    if(b==='bounce')hazard(g,{x:g.hero.x,y:g.hero.y,r:38,life:1.05,damage:12});
    if(b==='support')g.effect('boost',e.x,e.y,115,'',.7);
    e.attackCd=2.2+g.random()*1.3;
  }
  // Process a snapshot: a delayed charge creates its own fresh warning.
  for(const h of [...g.hazards]){
    h.life-=dt;if(h.life>0||h.fired)continue;h.fired=true;
    if(h.owner?.dead||h.visualOnly)continue;
    if(h.kind==='mobShot'){
      const angle=Math.atan2(h.y2-h.y,h.x2-h.x);for(let i=0;i<h.count;i++)shot(g,h,angle+(i-(h.count-1)/2)*.34,{speed:h.speed,kind:h.owner.prop});
    }else if(h.kind==='volley')volley(g,h,h.count,165);
    else if(h.kind==='nextCharge')aimCharge(g,h.owner);
    else if(h.kind==='zone'){g.zones.push({x:h.x,y:h.y,r:h.r,life:h.duration,damage:12});}
    else if(h.kind==='boomerang'){for(let i=0;i<h.count;i++)shot(g,h,h.angle+(i-(h.count-1)/2)*.3,{speed:190,kind:h.prop,returnAt:2.9,origin:{x:h.x,y:h.y},life:4,radius:11,damage:14});}
    else if(h.kind==='gapRing'){for(let i=0;i<h.count;i++){const a=i*Math.PI*2/h.count,delta=Math.atan2(Math.sin(a-h.angle),Math.cos(a-h.angle));if(Math.abs(delta)<.52)continue;shot(g,h,a,{speed:145,kind:h.prop,damage:12});}}
    else if(h.kind==='ring'){for(let i=0;i<h.count;i++)shot(g,h,i*Math.PI*2/h.count,{speed:140,kind:'clock',damage:12});}
    else {g.effect('danger',h.x,h.y,h.r,'',.45);if(h.shape==='line')g.effects.push({kind:'beam',x:h.x,y:h.y,x2:h.x2,y2:h.y2,radius:h.r,life:.4,maxLife:.4,hostile:true});const hit=h.shape==='line'?segmentDistance(g.hero,h,{x:h.x2,y:h.y2})<h.r+12:dist(g.hero,h)<h.r+12;if(hit)g.hurtHero(h.damage??16,g.boss?g.config.boss:'散らかった床');}
  }
  g.hazards=g.hazards.filter(h=>h.life>0&&(!h.owner||!h.owner.dead));
  for(const z of g.zones){z.life-=dt;if(dist(g.hero,z)<z.r+10)g.hurtHero(z.damage,'焦げつきホットゾーン');}
  g.zones=g.zones.filter(z=>z.life>0).slice(-10);
}
export function updateProjectiles(g,dt) {
  for(const p of g.projectiles){
    const previous={x:p.x,y:p.y};p.life-=dt;
    if(p.returnAt && p.life<=p.returnAt && !p.returned){p.returned=true;const a=Math.atan2(p.origin.y-p.y,p.origin.x-p.x);p.vx=Math.cos(a)*p.speed;p.vy=Math.sin(a)*p.speed;}
    if(p.kind==='towel'&&p.life<1){const a=Math.atan2(g.hero.y-p.y,g.hero.x-p.x);p.vx=Math.cos(a)*300;p.vy=Math.sin(a)*300;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.friendly){for(const e of g.enemies){if(e.dead||p.hits.has(e)||segmentDistance(e,previous,p)>e.radius+p.radius)continue;p.hits.add(e);g.hurtEnemy(e,p.damage,3);g.effect('impact',e.x,e.y,20,'',.22);if(!p.pierce){p.life=0;break;}}}
    else if(segmentDistance(g.hero,previous,p)<p.radius+13){g.hurtHero(p.damage,'飛び道具');p.life=0;}
  }
  g.projectiles=g.projectiles.filter(p=>p.life>0&&p.x>-30&&p.x<510&&p.y>20&&p.y<670);
}
export function extraSkills(g,dt){
  for(const id of ['iron','towel','meteor']){
    g.skillCds[id]-=dt;const lv=g.skills[id];if(!lv||g.skillCds[id]>0)continue;
    const target=g.enemies.find(e=>!e.dead&&dist(e,g.hero)<400);if(!target)continue;
    const a=Math.atan2(target.y-g.hero.y,target.x-g.hero.x);
    if(id==='iron'){
      const end={x:g.hero.x+Math.cos(a)*520,y:g.hero.y+Math.sin(a)*520};
      g.effects.push({kind:'beam',x:g.hero.x,y:g.hero.y,x2:end.x,y2:end.y,radius:12+lv*5,life:.45,maxLife:.45});
      for(const e of g.enemies)if(!e.dead&&segmentDistance(e,g.hero,end)<e.radius+12+lv*5)g.hurtEnemy(e,55+lv*25,5);
      g.skillCds[id]=3.5-lv*.3;
    }else if(id==='towel'){
      for(let i=0;i<lv;i++)shot(g,g.hero,a+(i-(lv-1)/2)*.4,{friendly:true,kind:'towel',speed:280,damage:32+lv*12,pierce:true,life:2,radius:18});g.skillCds[id]=2.8;
    }else{
      g.falls.push({x:target.x,y:target.y,life:.65,radius:75+lv*15,damage:70+lv*25});g.skillCds[id]=4.5-lv*.4;
    }
  }
  for(const f of g.falls){f.life-=dt;if(f.life<=0)g.area(f.x,f.y,f.radius,f.damage,'meteor',18);}
  g.falls=g.falls.filter(f=>f.life>0);
}
