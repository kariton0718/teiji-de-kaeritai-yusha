import {CONFIG as C,center,solids,UPGRADE_IDS} from './config.js';
import {navigation,blocked,clearLine} from './pathfinding.js';

const copy=p=>({x:p.x,y:p.y});
const norm=(x,y,fallback={x:0,y:-1})=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:copy(fallback);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class Game {
  constructor(random=Math.random){this.random=random;this.nav=navigation(solids);this.reset();}

  reset(){
    this.state='title';this.resumeState='playing';this.outcome=null;this.phase='title';
    this.remaining=C.timeLimit;this.elapsed=0;this.wave=0;this.waveElapsed=0;this.waveClearLeft=0;
    this.hero={...center(C.heroStart),energy:C.hero.energy,facing:{x:0,y:-1},attackCd:0,dashCd:0,dashLeft:0,dashDir:{x:0,y:-1},shieldLeft:0,shields:C.shield.charges,invulnerable:0,slowLeft:0,hurtFlash:0};
    this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];this.particles=[];this.afterimages=[];
    this.kills=0;this.hitsTaken=0;this.ultimate=0;this.upgrades=[];this.offers=[];this.coffee=null;this.gateOpen=false;
    this.banner=null;this.notice='Enterで操作説明へ';this.events=[];this.nextEnemyId=1;this.shake=0;this.boss=null;
  }

  get clock(){
    const minute=C.startMinute+(C.deadlineMinute-C.startMinute)*(this.elapsed/C.timeLimit);
    const safe=Math.min(C.deadlineMinute,minute);return `${Math.floor(safe/60).toString().padStart(2,'0')}:${Math.floor(safe%60).toString().padStart(2,'0')}`;
  }
  get timeText(){const n=Math.ceil(this.remaining);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
  get activeEnemies(){return this.enemies.filter(e=>!e.dead);}
  hasUpgrade(id){return this.upgrades.includes(id);}
  get speed(){return C.hero.speed*(this.hasUpgrade('swift')?1.2:1)*(this.hero.slowLeft>0?C.hero.slowMultiplier:1);}
  get dashCooldown(){return C.dash.cooldown*(this.hasUpgrade('swift')?0.7:1);}
  get attackRange(){return C.attack.range+(this.hasUpgrade('wide')?24:0);}
  get attackArc(){return C.attack.arc+(this.hasUpgrade('wide')?Math.PI*50/180:0);}
  get ultimateDamage(){return C.ultimate.damage+(this.hasUpgrade('resolve')?30:0);}

  showInstructions(){if(this.state==='title'){this.state='instructions';this.phase='instructions';}}
  startRun(){if(this.state!=='instructions')return;this.state='playing';this.phase='wave';this.beginWave(1);}
  pause(){if(this.state==='playing'){this.resumeState=this.state;this.state='paused';}}
  resume(){if(this.state==='paused')this.state=this.resumeState;}

  beginWave(number){
    this.phase='wave';this.wave=number;this.waveElapsed=0;this.waveClearLeft=0;this.spawnQueue=[];this.spawnWarnings=[];
    let due=.15;
    for(const group of C.waves[number-1])for(let n=0;n<group.count;n++){this.spawnQueue.push({type:group.type,due});due+=group.stagger;}
    this.banner={title:`第${number}ラッシュ`,detail:number===1?'まずはタスクスライム！':number===2?'未読メールの予告を見切れ！':'電話突進をかわして一掃！',left:2};
    this.notice=`第${number}ラッシュ：出現地点から離れよう`;this.events.push('wave');
  }

  chooseSpawn(){
    const points=C.spawnPoints.map(center).filter(p=>dist(p,this.hero)>105&&!blocked(p.x,p.y,C.radius,solids));
    const occupied=[...this.activeEnemies.map(e=>e.pos),...this.spawnWarnings.map(w=>w.pos)];
    points.sort((a,b)=>occupied.reduce((s,p)=>s+Math.max(0,90-dist(a,p)),0)-occupied.reduce((s,p)=>s+Math.max(0,90-dist(b,p)),0));
    return copy(points[Math.floor(this.random()*Math.min(3,points.length))]||center(C.spawnPoints[0]));
  }
  createEnemy(type,pos){
    const d=C.enemies[type],e={id:this.nextEnemyId++,type,pos:copy(pos),hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,path:[],repath:0,state:'move',left:type==='bat'?d.shootInterval:type==='ghost'?d.chargeInterval:0,dir:{x:0,y:1},knock:{x:0,y:0}};
    this.enemies.push(e);return e;
  }
  spawnBoss(){
    const d=C.boss,e={id:this.nextEnemyId++,type:'boss',pos:center(C.bossStart),hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'chase',left:1.4,dir:{x:0,y:1},attack:'charge',enraged:false,path:[],repath:0};
    this.enemies.push(e);this.boss=e;this.wave=4;this.phase='boss';this.state='playing';
    this.banner={title:'魔王部長',detail:'「最後に、ちょっといい？」',left:2.5};this.notice='赤い進路と紫の会議範囲を見て回避！';this.events.push('boss');
  }

  update(delta,input={x:0,y:0,attack:false,dash:false,shield:false,ultimate:false}){
    if(this.state!=='playing')return;
    let left=Math.min(Math.max(0,delta),C.maxDelta);
    while(left>1e-8&&this.state==='playing'){const dt=Math.min(C.step,left);this.tick(dt,input);left-=dt;input={...input,dash:false,shield:false,ultimate:false};}
  }

  tick(dt,input){
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;
    if(this.remaining<=0){this.finish('timeout');return;}
    const h=this.hero;
    h.attackCd=Math.max(0,h.attackCd-dt);h.dashCd=Math.max(0,h.dashCd-dt);h.invulnerable=Math.max(0,h.invulnerable-dt);h.shieldLeft=Math.max(0,h.shieldLeft-dt);h.slowLeft=Math.max(0,h.slowLeft-dt);h.hurtFlash=Math.max(0,h.hurtFlash-dt);
    if(this.banner){this.banner.left-=dt;if(this.banner.left<=0)this.banner=null;}
    this.shake=Math.max(0,this.shake-dt);
    const n=norm(input.x||0,input.y||0,h.facing);
    if(input.x||input.y)h.facing=n;
    if(input.shield&&h.shields>0&&h.shieldLeft===0){h.shields--;h.shieldLeft=C.shield.duration;this.events.push('shield');this.notice='有給の盾！ 1.5秒間ダメージ無効';}
    if(input.dash&&h.dashCd===0){h.dashLeft=C.dash.duration;h.dashCd=this.dashCooldown;h.dashDir=norm(input.x||0,input.y||0,h.facing);this.afterimages.push({pos:copy(h),left:.28});this.events.push('dash');}
    if(input.ultimate&&this.ultimate>=C.ultimate.max)this.useUltimate();
    if(h.dashLeft>0){h.dashLeft=Math.max(0,h.dashLeft-dt);this.nav.move(h,h.dashDir.x*C.dash.speed*dt,h.dashDir.y*C.dash.speed*dt);if(this.random()<.12)this.afterimages.push({pos:copy(h),left:.22});}
    else {const m=Math.hypot(input.x||0,input.y||0);if(m)this.nav.move(h,(input.x/m)*this.speed*dt,(input.y/m)*this.speed*dt);if(input.attack&&h.attackCd===0)this.swing();}
    this.updateSpawns(dt);this.updateAttacks(dt);this.updateProjectiles(dt);this.updateEnemies(dt);this.separateEnemies();this.collectCoffee();this.updateEffects(dt);
    if(this.phase==='wave')this.checkWaveClear(dt);
    if(this.phase==='escape'&&dist(h,center(C.gate))<25)this.finish('success');
  }

  swing(follow=false){
    const h=this.hero;if(!follow){h.attackCd=C.attack.cooldown;if(this.hasUpgrade('double'))this.followups.push({left:C.attack.followDelay,dir:copy(h.facing)});}
    const attack={id:`a${this.elapsed}-${this.attacks.length}`,pos:copy(h),dir:follow?copy(this.followups.currentDir||h.facing):copy(h.facing),range:this.attackRange,arc:this.attackArc,damage:follow?C.attack.followDamage:C.attack.damage,left:C.attack.duration,total:C.attack.duration,follow,hit:new Set()};
    this.attacks.push(attack);this.applyAttack(attack);
    if(!follow&&this.hasUpgrade('reply'))this.heroProjectiles.push({pos:{x:h.x+h.facing.x*22,y:h.y+h.facing.y*22},dir:copy(h.facing),life:C.projectile.heroLife,radius:6,damage:C.projectile.heroDamage,hit:new Set()});
    this.events.push('attack');
  }
  applyAttack(a){for(const e of this.activeEnemies){
    if(a.hit.has(e.id))continue;const dx=e.pos.x-a.pos.x,dy=e.pos.y-a.pos.y,d=Math.hypot(dx,dy);if(d>a.range+e.radius)continue;
    const dot=d?(dx*a.dir.x+dy*a.dir.y)/d:1;if(dot<Math.cos(a.arc/2)||!clearLine(a.pos,e.pos,solids))continue;
    a.hit.add(e.id);this.damageEnemy(e,a.damage,a.dir,e.type!=='boss'?C.attack.knockback:4);
  }}
  useUltimate(){
    this.ultimate=0;const attack={pos:copy(this.hero),range:C.ultimate.range,damage:this.ultimateDamage,left:C.ultimate.duration,total:C.ultimate.duration};
    this.attacks.push({...attack,ultimate:true});for(const e of this.activeEnemies)if(dist(this.hero,e.pos)<=attack.range+e.radius&&clearLine(this.hero,e.pos,solids))this.damageEnemy(e,attack.damage,norm(e.pos.x-this.hero.x,e.pos.y-this.hero.y),28);
    this.banner={title:'本日は退勤します！',detail:'周囲の仕事をまとめて処理！',left:1.2};this.events.push('ultimate');this.shake=C.screenShake?0.16:0;
  }
  damageEnemy(e,amount,dir,knock=0){
    if(e.dead)return;if(e.type==='boss'&&!['stunned','recover'].includes(e.state))amount*=C.boss.armorMultiplier;e.hp=Math.max(0,e.hp-amount);e.flash=.12;this.shake=C.screenShake?0.07:0;this.events.push('hit');
    if(knock&&e.type!=='boss'){this.nav.move(e.pos,dir.x*knock,dir.y*knock);}
    if(e.hp===0)this.killEnemy(e);
  }
  killEnemy(e){
    if(e.dead)return;e.dead=true;this.kills++;const gain=(e.type==='boss'?0:C.enemies[e.type].ult)*(this.hasUpgrade('resolve')?1.5:1);this.ultimate=clamp(this.ultimate+gain,0,C.ultimate.max);
    for(let i=0;i<(e.type==='boss'?30:10);i++)this.particles.push({pos:copy(e.pos),vel:{x:(this.random()-.5)*150,y:(this.random()-.5)*150},left:.7+this.random()*.45,color:e.type==='boss'?'#f5cb67':'#f2ead0'});
    this.events.push(e.type==='boss'?'bossDown':'defeat');
    if(e.type==='boss'){this.gateOpen=true;this.phase='escape';this.banner={title:'魔王部長、撃破！',detail:'退勤ゲートが開いた。出口へ！',left:3};this.notice='右上の退勤ゲートへ移動！';}
  }

  updateAttacks(dt){
    for(const a of this.attacks)a.left-=dt;this.attacks=this.attacks.filter(a=>a.left>0);
    for(const f of this.followups)f.left-=dt;
    for(const f of this.followups.filter(f=>f.left<=0)){this.followups.currentDir=f.dir;this.swing(true);}
    this.followups=this.followups.filter(f=>f.left>0);delete this.followups.currentDir;
  }
  updateSpawns(dt){
    if(this.phase!=='wave')return;this.waveElapsed+=dt;
    for(const q of this.spawnQueue.filter(q=>q.due<=this.waveElapsed)){this.spawnWarnings.push({type:q.type,pos:this.chooseSpawn(),left:C.spawnWarning});q.done=true;}
    this.spawnQueue=this.spawnQueue.filter(q=>!q.done);
    for(const w of this.spawnWarnings)w.left-=dt;
    for(const w of this.spawnWarnings.filter(w=>w.left<=0))this.createEnemy(w.type,w.pos);
    this.spawnWarnings=this.spawnWarnings.filter(w=>w.left>0);
  }
  updateProjectiles(dt){
    for(const p of this.heroProjectiles){p.life-=dt;p.pos.x+=p.dir.x*C.projectile.heroSpeed*dt;p.pos.y+=p.dir.y*C.projectile.heroSpeed*dt;if(blocked(p.pos.x,p.pos.y,p.radius,solids)){p.life=0;continue;}for(const e of this.activeEnemies)if(!p.hit.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){p.hit.add(e.id);this.damageEnemy(e,p.damage,p.dir,9);}}
    this.heroProjectiles=this.heroProjectiles.filter(p=>p.life>0);
    for(const p of this.enemyProjectiles){p.life-=dt;p.pos.x+=p.dir.x*C.projectile.enemySpeed*dt;p.pos.y+=p.dir.y*C.projectile.enemySpeed*dt;if(blocked(p.pos.x,p.pos.y,p.radius,solids)){p.life=0;continue;}if(dist(p.pos,this.hero)<p.radius+C.radius){if(this.damageHero(p.damage,p.pos))p.life=0;else p.life=0;}}
    this.enemyProjectiles=this.enemyProjectiles.filter(p=>p.life>0);
  }

  moveEnemy(e,target,speed,dt){
    e.repath-=dt;if(clearLine(e.pos,target,solids)){const d=norm(target.x-e.pos.x,target.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);return;}
    if(e.repath<=0){e.path=this.nav.findPath(e.pos,target);e.repath=.35;}
    while(e.path.length&&dist(e.pos,e.path[0])<8)e.path.shift();const p=e.path[0];if(p){const d=norm(p.x-e.pos.x,p.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);}
  }
  updateEnemies(dt){
    for(const e of this.activeEnemies){e.flash=Math.max(0,e.flash-dt);e.contactLeft=Math.max(0,e.contactLeft-dt);if(e.type==='slime')this.updateSlime(e,dt);else if(e.type==='bat')this.updateBat(e,dt);else if(e.type==='ghost')this.updateGhost(e,dt);else this.updateBoss(e,dt);}
    this.enemies=this.enemies.filter(e=>!e.dead);
  }
  updateSlime(e,dt){this.moveEnemy(e,this.hero,C.enemies.slime.speed,dt);this.contactHero(e,C.enemies.slime.damage);}
  updateBat(e,dt){
    const d=C.enemies.bat,range=dist(e.pos,this.hero);e.left-=dt;
    if(e.state==='warn'){if(e.left<=0){if(this.enemyProjectiles.length<C.projectile.maxEnemy)this.enemyProjectiles.push({pos:copy(e.pos),dir:copy(e.dir),life:C.projectile.enemyLife,radius:7});e.state='move';e.left=d.shootInterval;this.events.push('shoot');}return;}
    if(range<d.desired-25)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+45)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}
  }
  updateGhost(e,dt){
    const d=C.enemies.ghost;e.left-=dt;
    if(e.state==='warn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;}return;}
    if(e.state==='charge'){
      const x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;
      if(blocked(x,y,e.radius,solids)){e.state='recover';e.left=d.recovery;}else{e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage,true);}
      if(e.left<=0){e.state='recover';e.left=d.recovery;}return;
    }
    if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.chargeInterval;}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage,true);
    if(e.left<=0){e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}
  }
  updateBoss(e,dt){
    const d=C.boss;e.enraged=e.hp<=e.maxHp/2;e.left-=dt;
    if(e.state==='stunned'||e.state==='recover'){if(e.left<=0){e.state='chase';e.left=e.enraged?d.enragedInterval:d.attackInterval;}return;}
    if(e.state==='chargeWarn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;this.events.push('danger');}return;}
    if(e.state==='charge'){
      const x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;
      if(blocked(x,y,e.radius,solids)){e.state='stunned';e.left=d.stun;this.notice='机に激突！ 1.5秒の攻撃チャンス';this.events.push('stun');return;}
      e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage);if(e.left<=0){e.state='recover';e.left=.55;}return;
    }
    if(e.state==='meetingWarn'){if(e.left<=0){if(dist(e.pos,this.hero)<=d.meetingRadius)this.damageHero(d.damage,e.pos);e.state='recover';e.left=d.meetingRecovery;this.events.push('danger');}return;}
    this.moveEnemy(e,this.hero,d.speed*(e.enraged?1.16:1),dt);
    if(e.left<=0){if(e.attack==='charge'){e.state='chargeWarn';e.left=d.chargeWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);e.attack='meeting';this.notice='「ちょっといい？」赤い進路から横へ！';}else{e.state='meetingWarn';e.left=d.meetingWarning;e.attack='charge';this.notice='「5分だけ会議」紫の円から出よう！';}this.events.push('warn');}
  }
  contactHero(e,damage,slow=false){if(e.contactLeft>0||dist(e.pos,this.hero)>=e.radius+C.radius)return;e.contactLeft=e.type==='boss'?.55:C.enemies[e.type].contactCooldown||.7;if(this.damageHero(damage,e.pos)&&slow)this.hero.slowLeft=C.hero.slowDuration;}
  damageHero(amount,source){
    const h=this.hero;if(h.invulnerable>0||h.dashLeft>0||h.shieldLeft>0)return false;
    h.energy=Math.max(0,h.energy-amount);h.invulnerable=C.hero.hitInvulnerability;h.hurtFlash=.25;this.hitsTaken++;this.shake=C.screenShake?0.13:0;
    const d=norm(h.x-source.x,h.y-source.y);this.nav.move(h,d.x*18,d.y*18);this.events.push('hurt');
    if(h.energy===0)this.finish('energy');return true;
  }
  separateEnemies(){
    const list=this.activeEnemies;for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy),need=(a.radius+b.radius)*.72;if(d>0&&d<need){const push=(need-d)/2,nx=dx/d,ny=dy/d;this.nav.move(a.pos,-nx*push,-ny*push);this.nav.move(b.pos,nx*push,ny*push);}}
  }
  collectCoffee(){if(this.coffee&&dist(this.hero,this.coffee)<C.coffee.pickupRange){const before=this.hero.energy;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+C.coffee.heal);this.notice=`コーヒーで気力 ${Math.round(this.hero.energy-before)} 回復`;this.coffee=null;this.events.push('heal');}}
  updateEffects(dt){for(const p of this.particles){p.left-=dt;p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.vel.y+=80*dt;}this.particles=this.particles.filter(p=>p.left>0);for(const a of this.afterimages)a.left-=dt;this.afterimages=this.afterimages.filter(a=>a.left>0);}

  checkWaveClear(dt){
    if(this.spawnQueue.length||this.spawnWarnings.length||this.activeEnemies.length){this.waveClearLeft=0;return;}
    this.waveClearLeft+=dt;if(this.waveClearLeft<C.waveCompleteDelay)return;
    if(this.wave<3)this.openUpgrade();else{this.state='bossIntro';this.phase='bossIntro';this.banner=null;this.notice='魔王部長が現れた';}
  }
  openUpgrade(){
    this.state='upgrade';this.phase='upgrade';const remaining=UPGRADE_IDS.filter(id=>!this.upgrades.includes(id));
    for(let i=remaining.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
    this.offers=remaining.slice(0,3);this.banner=null;this.events.push('upgrade');
  }
  chooseUpgrade(index){
    if(this.state!=='upgrade'||!this.offers[index])return false;const id=this.offers[index];this.upgrades.push(id);
    if(id==='vacation'){this.hero.shields++;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+25);}
    this.coffee={...center(C.coffeeSpot)};this.state='playing';this.phase='wave';this.beginWave(this.wave+1);return true;
  }
  finish(reason){this.outcome=reason==='success'?'success':'failure';this.reason=reason;this.state='result';this.phase='result';this.events.push(this.outcome);}
}
