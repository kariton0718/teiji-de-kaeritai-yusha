// Timed cameos: no invisible healing, collecting or combat while family is away.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function move(a,target,speed,dt){const d=distance(a,target);if(d>1){const step=Math.min(d,speed*dt);a.x+=(target.x-a.x)/d*step;a.y+=(target.y-a.y)/d*step;}a.moving=d>8;}
export function resetGuests(g){
  Object.assign(g.mama,{x:30,y:490,present:false,visit:0,cooldown:14,announced:false,active:0,age:0});
  Object.assign(g.pochi,{x:450,y:490,present:false,visit:0,cooldown:22,announced:false,active:0,age:0});
  g.mamaCd=0;g.mamaSweepCd=.5;g.pochiCd=1;
}
export function updateGuests(g,dt){
  for(const id of ['mama','pochi']){
    const a=g[id],name=id==='mama'?'ママ':'ポチ';
    a.active=Math.max(0,a.active-dt);
    if(!a.present){
      a.cooldown-=dt;
      if(a.cooldown<=2&&!a.announced){a.announced=true;g.effect('label',240,315,0,`${name}が駆けつける！`,1.8);g.emit('help');}
      if(a.cooldown>0)continue;
      a.present=true;a.visit=id==='mama'?8:7;a.age=0;a.x=id==='mama'?24:456;a.y=clamp(g.hero.y+70,100,560);
      if(id==='mama'){g.mamaCd=0;g.mamaSweepCd=.5;}else g.pochiCd=1;
      g.effect('heart',a.x,a.y,50,'',.8);g.emit(id);
    }
    a.age+=dt;a.visit=Math.max(0,a.visit-dt);
    if(a.visit<=0){a.present=false;a.active=0;a.announced=false;a.cooldown=(id==='mama'?26:22)+g.random()*8;continue;}
    if(a.visit<1){move(a,{x:id==='mama'?-45:525,y:a.y},230,dt);continue;}
    if(id==='mama'){
      move(a,{x:clamp(g.hero.x-58,30,450),y:clamp(g.hero.y+30,85,565)},220,dt);
      g.mamaCd-=dt;g.mamaSweepCd-=dt;
      if(g.mamaSweepCd<=0){
        g.area(a.x,a.y,135,38+g.skills.heart*8,'mamaWave',18);
        g.projectiles=g.projectiles.filter(p=>p.friendly||distance(p,a)>175);
        a.active=1.5;g.mamaSweepCd=3;
      }
      if(g.mamaCd<=0&&distance(a,g.hero)<190){
        const heal=Math.min(g.hero.maxEnergy-g.hero.energy,18+g.skills.heart*5);
        g.hero.energy+=heal;a.active=2;g.mamaCd=99; // One heal per visit.
        g.area(a.x,a.y,175,45,'heart');
        g.effect('label',g.hero.x,g.hero.y-65,0,`ママの回復 気力＋${Math.round(heal)}`,1.8);g.emit('mama');
      }
    }else{
      g.pochiCd-=dt;
      const target=g.drops.find(d=>d.life>0)||g.request||g.sideRequest||{x:g.hero.x+40,y:g.hero.y+35};
      move(a,target,245,dt);
      if(g.drops.includes(target)&&distance(a,target)<24){g.collect(target);a.active=1;}
      if(g.pochiCd<=0){
        g.pochiCd=99;a.active=2;
        if(g.familyTask&&g.request){if(g.request.kind!=='tidy')g.request.fill=Math.max(g.request.fill,Math.min((g.request.hold||2)-.3,g.request.fill+.35));}
        else g.gainUltimate(4);
        g.effect('label',a.x,a.y-30,0,'ポチのお届け！',1.5);g.emit('pochi');
      }
    }
  }
}
