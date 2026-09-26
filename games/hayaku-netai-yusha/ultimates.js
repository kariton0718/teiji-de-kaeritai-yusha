export const ULTIMATES = [
  {id:'close',name:'本日は閉店です！',detail:'一撃で全体を片づけ、敵弾を消す。',duration:.6},
  {id:'cyclone',name:'お片づけ大旋風',detail:'4秒間、近くの魔物を吸い寄せて連続攻撃。',duration:4},
  {id:'comet',name:'お星さま大そうじ',detail:'3秒間、敵を追いかける星が5回落下。',duration:3},
  {id:'family',name:'家族のふわふわ結界',detail:'気力＋20。6秒間ダメージ半減、近くの敵弾消しと反撃。',duration:6},
];
export function activateUltimate(g){
  if(g.state!=='playing'||g.ultimate<100||g.ultimateLock>0)return false;
  const spec=g.ultimateOptions.find(s=>s.id===g.ultimateId);
  g.ultimate=0;g.ultimateActive={id:spec.id,left:spec.duration,tick:0,pulses:0};g.ultimateLock=spec.duration+3;
  g.hazards=[];g.zones=[];g.projectiles=g.projectiles.filter(p=>p.friendly);g.hero.invulnerable=Math.max(2,g.hero.invulnerable);
  if(spec.id==='close')g.area(g.hero.x,g.hero.y,800,180,'ultimate',30,'ultimate');
  if(spec.id==='family')g.hero.energy=Math.min(g.hero.maxEnergy,g.hero.energy+20);
  g.effect('label',240,280,0,spec.name,2);g.emit('ultimate');return true;
}
export function updateUltimate(g,dt){
  g.chargeBudget=Math.min(3,g.chargeBudget+dt*3);
  g.ultimateLock=Math.max(0,g.ultimateLock-dt);
  const a=g.ultimateActive;if(!a)return;a.left-=dt;a.tick-=dt;
  if(a.id==='family')g.projectiles=g.projectiles.filter(p=>p.friendly||Math.hypot(p.x-g.hero.x,p.y-g.hero.y)>145);
  if(a.tick<=0){
    a.tick=a.id==='cyclone'?.4:.6;
    if(a.id==='cyclone'){
      for(const e of g.enemies)if(!e.dead&&!e.boss&&Math.hypot(e.x-g.hero.x,e.y-g.hero.y)<250){e.x+=(g.hero.x-e.x)*.25;e.y+=(g.hero.y-e.y)*.25;}
      g.area(g.hero.x,g.hero.y,180,32,'vacuum',0,'ultimate');
    }
    if(a.id==='comet'&&a.pulses<5){const target=g.enemies.find(e=>!e.dead&&e.boss)||g.enemies.find(e=>!e.dead);if(target)g.falls.push({x:target.x,y:target.y,life:.45,radius:110,damage:110,source:'ultimate'});}
    if(a.id==='family'&&a.pulses%2===0)g.area(g.hero.x,g.hero.y,145,48,'heart',35,'ultimate');
    a.pulses++;
  }
  if(a.left<=0)g.ultimateActive=null;
}
