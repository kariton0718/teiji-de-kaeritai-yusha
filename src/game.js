import {CONFIG as C,center,solids,SKILL_IDS,rotate} from './config.js';
import {navigation,blocked,clearLine} from './pathfinding.js';

const copy=p=>({x:p.x,y:p.y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y,f={x:0,y:-1})=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:copy(f);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class Game{
  constructor(random=Math.random){this.random=random;this.nav=navigation(solids);this.reset();}
  reset(){
    this.state='title';this.resumeState='playing';this.phase='title';this.outcome=null;this.reason=null;
    this.remaining=C.timeLimit;this.elapsed=0;this.stage=1;this.wave=0;this.waveElapsed=0;this.waveClearLeft=0;this.clearedWaves=0;this.upgradeCount=0;
    this.hero={...center(C.heroStart),energy:C.hero.energy,facing:{x:0,y:-1},attackCd:0,attackCount:0,invulnerable:0,slowLeft:0,hurtFlash:0};
    this.skills={slash:0,reply:0,shredder:0,thunder:0,meteor:0};this.offers=[];this.afterUpgrade=null;
    this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];
    this.particles=[];this.thunders=[];this.meteors=[];this.enemyAreas=[];this.orbitHits=new Map();
    this.auto={thunder:0,meteor:0};this.kills=0;this.hitsTaken=0;this.ultimate=0;this.coffee=null;this.gateOpen=false;
    this.banner=null;this.notice='Enterで操作説明へ';this.events=[];this.nextEnemyId=1;this.shake=0;this.boss=null;this.transitionHeal=0;
  }
  get stageConfig(){return C.stages[this.stage-1];}
  get stageName(){return this.stageConfig.name;}
  get waveLabel(){return this.wave?`STAGE ${this.stage} / WAVE ${this.wave}`:'出勤前';}
  get activeEnemies(){return this.enemies.filter(e=>!e.dead);}
  get clock(){const m=Math.min(C.deadlineMinute,C.startMinute+(C.deadlineMinute-C.startMinute)*this.elapsed/C.timeLimit);return `${Math.floor(m/60).toString().padStart(2,'0')}:${Math.floor(m%60).toString().padStart(2,'0')}`;}
  get timeText(){const n=Math.ceil(this.remaining);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
  skillLevel(id){return this.skills[id]||0;}
  get attackRange(){return C.attack.ranges[this.skills.slash];}
  get attackArc(){return C.attack.arcs[this.skills.slash]*Math.PI/180;}

  showInstructions(){if(this.state==='title'){this.state='instructions';this.phase='instructions';}}
  startRun(){if(this.state==='instructions')this.beginWave(1,1);}
  enterStage(){if(this.state==='stageIntro')this.beginWave(this.stage,1);}
  pause(){if(this.state==='playing'){this.resumeState='playing';this.state='paused';}}
  resume(){if(this.state==='paused')this.state=this.resumeState;}

  beginWave(stage,wave){
    this.state='playing';this.phase='wave';this.stage=stage;this.wave=wave;this.waveElapsed=0;this.waveClearLeft=0;this.spawnQueue=[];this.spawnWarnings=[];
    let due=.15;for(const group of C.stages[stage-1].waves[wave-1]){for(let i=0;i<group.count;i++){this.spawnQueue.push({type:group.type,due,source:'wave'});due+=group.stagger;}due+=C.groupGap;}
    this.banner={title:`${this.stageName} ${wave}/2`,detail:wave===1?this.stageConfig.rule:'増援！ 全滅させて強化を選べ',left:2.4};this.notice=`${this.stageName}：出現予告から離れよう`;this.events.push('wave');
  }
  chooseSpawn(){
    const occupied=[...this.activeEnemies.map(e=>e.pos),...this.spawnWarnings.map(w=>w.pos)],points=C.spawnPoints.map(center).filter(p=>dist(p,this.hero)>110&&!blocked(p.x,p.y,C.radius,solids));
    points.sort((a,b)=>occupied.reduce((s,p)=>s+Math.max(0,100-dist(a,p)),0)-occupied.reduce((s,p)=>s+Math.max(0,100-dist(b,p)),0));return copy(points[Math.floor(this.random()*Math.min(4,points.length))]||center(C.spawnPoints[0]));
  }
  addSpawnWarning(type,source='wave'){if(this.spawnWarnings.length+this.activeEnemies.length>=C.limits.enemies)return;this.spawnWarnings.push({type,source,pos:this.chooseSpawn(),left:C.spawnWarning});}
  createEnemy(type,pos){
    if(this.activeEnemies.length>=C.limits.enemies)return null;const d=C.enemies[type];
    const e={id:this.nextEnemyId++,type,pos:copy(pos),hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'move',left:type==='bat'?d.shootInterval:type==='ghost'?d.chargeInterval:type==='brute'?d.areaInterval:0,dir:{x:0,y:1},path:[],repath:0};this.enemies.push(e);return e;
  }
  spawnBoss(){
    if(this.state!=='bossIntro')return;const d=C.boss,e={id:this.nextEnemyId++,type:'boss',pos:center(C.bossStart),hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'chase',left:1.5,dir:{x:0,y:1},path:[],repath:0,bossPhase:1,pattern:0,chargesLeft:0,weak:false,phaseSeen:new Set(),phaseDone:new Set()};
    this.enemies.push(e);this.boss=e;this.phase='boss';this.state='playing';this.wave=0;this.banner={title:'魔王部長・第1形態',detail:'「最後に、ちょっといい？」',left:2.8};this.notice='赤い突進と紫の会議範囲を見切れ！';this.events.push('boss');
  }

  update(delta,input={}){
    input={x:0,y:0,attack:false,ultimate:false,...input};
    if(this.state!=='playing')return;let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){const dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;input={...input,ultimate:false};}
  }
  tick(dt,input){
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;if(this.remaining<=0){this.finish('timeout');return;}
    const h=this.hero;for(const k of ['attackCd','invulnerable','slowLeft','hurtFlash'])h[k]=Math.max(0,h[k]-dt);
    if(this.banner){this.banner.left-=dt;if(this.banner.left<=0)this.banner=null;}this.shake=Math.max(0,this.shake-dt);
    const facing=norm(input.x||0,input.y||0,h.facing);if(input.x||input.y)h.facing=facing;
    if(input.ultimate&&this.ultimate>=C.ultimate.max)this.useUltimate();
    const m=Math.hypot(input.x||0,input.y||0);if(m)this.nav.move(h,input.x/m*C.hero.speed*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt,input.y/m*C.hero.speed*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt);if(input.attack&&h.attackCd===0)this.swing();
    this.updateSpawns(dt);this.updateFollowups(dt);this.updateProjectiles(dt);this.updateAutomaticSkills(dt);this.updateMeteors(dt);this.updateEnemyAreas(dt);this.updateEnemies(dt);this.separateEnemies();this.collectCoffee();this.updateEffects(dt);
    if(this.phase==='wave')this.checkWaveClear(dt);if(this.phase==='escape'&&dist(h,center(C.gate))<25)this.finish('success');
  }

  swing(follow=false,dir=null){
    const h=this.hero;if(!follow){h.attackCd=C.attack.cooldown;h.attackCount++;if(this.skills.slash>=2)this.followups.push({left:C.attack.followDelay,dir:copy(h.facing)});}
    const a={kind:follow?'follow':'slash',pos:copy(h),dir:copy(dir||h.facing),range:this.attackRange,arc:this.attackArc,damage:follow?C.attack.followDamage:C.attack.damage,left:C.attack.duration,total:C.attack.duration,hit:new Set()};this.pushAttack(a);this.applyArc(a);
    if(!follow&&this.skills.reply>0)this.fireReply();
    if(!follow&&this.skills.slash>=3&&h.attackCount%C.attack.fullCircleEvery===0){const all={kind:'circle',pos:copy(h),range:C.attack.fullCircleRange,damage:C.attack.fullCircleDamage,left:.28,total:.28,hit:new Set()};this.pushAttack(all);this.applyRadius(all,false);this.events.push('burst');}
    this.events.push('attack');
  }
  pushAttack(a){this.attacks.push(a);if(this.attacks.length>C.attack.maxVisuals)this.attacks.splice(0,this.attacks.length-C.attack.maxVisuals);}
  applyArc(a){for(const e of this.activeEnemies){const dx=e.pos.x-a.pos.x,dy=e.pos.y-a.pos.y,d=Math.hypot(dx,dy),dot=d?(dx*a.dir.x+dy*a.dir.y)/d:1;if(!a.hit.has(e.id)&&d<=a.range+e.radius&&dot>=Math.cos(a.arc/2)&&clearLine(a.pos,e.pos,solids)){a.hit.add(e.id);this.damageEnemy(e,a.damage,a.dir,e.type==='boss'?3:C.attack.knockback);}}}
  applyRadius(a,aerial=true){for(const e of this.activeEnemies)if(!a.hit.has(e.id)&&dist(a.pos,e.pos)<=a.range+e.radius&&(aerial||clearLine(a.pos,e.pos,solids))){a.hit.add(e.id);this.damageEnemy(e,a.damage,norm(e.pos.x-a.pos.x,e.pos.y-a.pos.y),8);}}
  fireReply(){
    const level=this.skills.reply,angles=C.reply.angles[level];for(const angle of angles){const dir=rotate(this.hero.facing,angle);this.heroProjectiles.push({kind:'reply',pos:{x:this.hero.x+dir.x*22,y:this.hero.y+dir.y*22},dir,life:C.reply.life,radius:C.reply.radius,damage:C.reply.damage,pierce:C.reply.pierce[level],hit:new Set()});}
    if(this.heroProjectiles.length>C.reply.max)this.heroProjectiles.splice(0,this.heroProjectiles.length-C.reply.max);
  }
  useUltimate(){
    this.ultimate=0;this.hero.invulnerable=Math.max(this.hero.invulnerable,C.ultimate.invulnerability);this.enemyProjectiles=[];this.pushAttack({kind:'ultimate',pos:copy(this.hero),range:Math.hypot(C.width,C.height),left:C.ultimate.duration,total:C.ultimate.duration});
    for(const e of [...this.activeEnemies])this.damageEnemy(e,e.type==='boss'?C.ultimate.bossDamage:C.ultimate.mobDamage,norm(e.pos.x-this.hero.x,e.pos.y-this.hero.y),22);
    this.banner={title:'本日は退勤します！',detail:'画面内の仕事と敵弾を一斉処理！',left:1.35};this.shake=C.screenShake?0.16:0;this.events.push('ultimate');
  }
  updateFollowups(dt){for(const f of this.followups)f.left-=dt;for(const f of this.followups.filter(f=>f.left<=0))this.swing(true,f.dir);this.followups=this.followups.filter(f=>f.left>0);for(const a of this.attacks)a.left-=dt;this.attacks=this.attacks.filter(a=>a.left>0);}

  updateAutomaticSkills(dt){
    this.updateShredder(dt);const enemies=this.activeEnemies;if(!enemies.length)return;
    const tl=this.skills.thunder;if(tl){this.auto.thunder-=dt;if(this.auto.thunder<=0){this.castThunder(tl);this.auto.thunder=C.thunder.interval[tl];}}
    const ml=this.skills.meteor;if(ml){this.auto.meteor-=dt;if(this.auto.meteor<=0){this.castMeteor(ml);this.auto.meteor=C.meteor.interval[ml];}}
  }
  orbitPositions(){const level=this.skills.shredder;if(!level)return [];const count=C.shredder.blades[level],radius=C.shredder.radius[level],base=this.elapsed*3.7;return Array.from({length:count},(_,i)=>({x:this.hero.x+Math.cos(base+i*Math.PI*2/count)*radius,y:this.hero.y+Math.sin(base+i*Math.PI*2/count)*radius,index:i}));}
  updateShredder(dt){for(const [k,v] of this.orbitHits)this.orbitHits.set(k,v-dt);for(const [k,v] of this.orbitHits)if(v<=0)this.orbitHits.delete(k);for(const b of this.orbitPositions()){if(blocked(b.x,b.y,C.shredder.size,solids))continue;for(const e of [...this.activeEnemies]){const key=`${b.index}:${e.id}`;if(!this.orbitHits.has(key)&&dist(b,e.pos)<=C.shredder.size+e.radius&&clearLine(this.hero,e.pos,solids)){this.orbitHits.set(key,C.shredder.hitInterval);this.damageEnemy(e,C.shredder.damage,norm(e.pos.x-b.x,e.pos.y-b.y),5);}}}}
  castThunder(level){
    const available=[...this.activeEnemies],used=new Set();for(let bolt=0;bolt<C.thunder.bolts[level];bolt++){let current=available.filter(e=>!used.has(e.id)).sort((a,b)=>dist(this.hero,a.pos)-dist(this.hero,b.pos))[0];if(!current||dist(this.hero,current.pos)>C.thunder.range)continue;let from=copy(this.hero);for(let c=0;c<C.thunder.chains[level]&&current;c++){used.add(current.id);this.thunders.push({from:copy(from),to:copy(current.pos),left:C.thunder.effect});this.damageEnemy(current,C.thunder.damage,{x:0,y:1},0);from=copy(current.pos);current=this.activeEnemies.filter(e=>!used.has(e.id)&&dist(from,e.pos)<=C.thunder.chainRange).sort((a,b)=>dist(from,a.pos)-dist(from,b.pos))[0];}}
    if(this.thunders.length>C.thunder.maxEffects)this.thunders.splice(0,this.thunders.length-C.thunder.maxEffects);this.events.push('thunder');
  }
  castMeteor(level){
    const enemies=[...this.activeEnemies],count=Math.min(C.meteor.count[level],enemies.length),chosen=[];for(let i=0;i<count;i++){const target=enemies.filter(e=>!chosen.includes(e)).sort((a,b)=>enemies.filter(e=>dist(b.pos,e.pos)<90).length-enemies.filter(e=>dist(a.pos,e.pos)<90).length)[0];if(!target)break;chosen.push(target);enemies.splice(enemies.indexOf(target),1);this.meteors.push({pos:copy(target.pos),radius:C.meteor.radius[level],damage:C.meteor.damage,left:C.meteor.warning,effect:0,fired:false});}
    if(this.meteors.length>C.meteor.max)this.meteors.splice(0,this.meteors.length-C.meteor.max);this.events.push('meteor');
  }
  updateMeteors(dt){for(const m of this.meteors){if(!m.fired){m.left-=dt;if(m.left<=0){m.fired=true;m.effect=C.meteor.effect;const a={pos:m.pos,range:m.radius,damage:m.damage,hit:new Set()};this.applyRadius(a,true);this.shake=C.screenShake?0.1:0;this.events.push('impact');}}else m.effect-=dt;}this.meteors=this.meteors.filter(m=>!m.fired||m.effect>0);}

  updateSpawns(dt){
    if(this.phase==='wave'){this.waveElapsed+=dt;for(const q of this.spawnQueue.filter(q=>q.due<=this.waveElapsed)){this.addSpawnWarning(q.type,q.source);q.done=true;}this.spawnQueue=this.spawnQueue.filter(q=>!q.done);}
    for(const w of this.spawnWarnings)w.left-=dt;for(const w of this.spawnWarnings.filter(w=>w.left<=0)){if(this.activeEnemies.length<C.limits.enemies)this.createEnemy(w.type,w.pos);else w.left=.15;}this.spawnWarnings=this.spawnWarnings.filter(w=>w.left>0);
  }
  updateProjectiles(dt){
    for(const p of this.heroProjectiles){p.life-=dt;p.pos.x+=p.dir.x*C.reply.speed*dt;p.pos.y+=p.dir.y*C.reply.speed*dt;if(this.offscreen(p.pos)||blocked(p.pos.x,p.pos.y,p.radius,solids)){p.life=0;continue;}for(const e of [...this.activeEnemies])if(!p.hit.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){p.hit.add(e.id);this.damageEnemy(e,p.damage,p.dir,8);if(p.hit.size>=p.pierce)p.life=0;}}
    this.heroProjectiles=this.heroProjectiles.filter(p=>p.life>0);
    for(const p of this.enemyProjectiles){p.life-=dt;p.pos.x+=p.dir.x*(p.speed||C.projectile.enemySpeed)*dt;p.pos.y+=p.dir.y*(p.speed||C.projectile.enemySpeed)*dt;if(this.offscreen(p.pos)||blocked(p.pos.x,p.pos.y,p.radius,solids)){p.life=0;continue;}if(dist(p.pos,this.hero)<p.radius+C.radius){this.damageHero(p.damage||C.projectile.enemyDamage,p.pos);p.life=0;}}
    this.enemyProjectiles=this.enemyProjectiles.filter(p=>p.life>0).slice(-C.projectile.maxEnemy);
  }
  offscreen(p){return p.x<-20||p.x>C.width+20||p.y<-20||p.y>C.height+20;}
  shootFan(pos,dir,count,spread,kind='mail',damage=C.projectile.enemyDamage){
    const start=-(count-1)*spread/2;for(let i=0;i<count&&this.enemyProjectiles.length<C.projectile.maxEnemy;i++)this.enemyProjectiles.push({kind,pos:copy(pos),dir:rotate(dir,start+i*spread),life:C.projectile.enemyLife,radius:kind==='boss'?8:7,damage,speed:kind==='boss'?C.projectile.bossSpeed:C.projectile.enemySpeed});this.events.push('shoot');
  }

  moveEnemy(e,target,speed,dt){e.repath-=dt;if(clearLine(e.pos,target,solids)){const d=norm(target.x-e.pos.x,target.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);return;}if(e.repath<=0){e.path=this.nav.findPath(e.pos,target);e.repath=.32;}while(e.path.length&&dist(e.pos,e.path[0])<10)e.path.shift();const p=e.path[0];if(p){const d=norm(p.x-e.pos.x,p.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);}}
  updateEnemies(dt){for(const e of [...this.activeEnemies]){e.flash=Math.max(0,e.flash-dt);e.contactLeft=Math.max(0,e.contactLeft-dt);if(e.type==='slime')this.updateSlime(e,dt);else if(e.type==='bat')this.updateBat(e,dt);else if(e.type==='ghost')this.updateGhost(e,dt);else if(e.type==='brute')this.updateBrute(e,dt);else this.updateBoss(e,dt);}this.enemies=this.enemies.filter(e=>!e.dead);}
  updateSlime(e,dt){this.moveEnemy(e,this.hero,C.enemies.slime.speed+(this.stage-1)*4,dt);this.contactHero(e,C.enemies.slime.damage);}
  updateBat(e,dt){
    const d=C.enemies.bat,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='warn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanByStage[this.stage],d.spread);e.state='move';e.left=d.shootInterval-Math.max(0,this.stage-1)*.15;}return;}
    if(range<d.desired-28)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+35)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){if(this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateGhost(e,dt){
    const d=C.enemies.ghost;e.left-=dt;if(e.state==='warn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;}return;}if(e.state==='charge'){const x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;if(blocked(x,y,e.radius,solids)){e.state='recover';e.left=d.recovery;}else{e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage,true);}if(e.left<=0){e.state='recover';e.left=d.recovery;}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.chargeInterval;}return;}this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage,true);if(e.left<=0){if(this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateBrute(e,dt){
    const d=C.enemies.brute;e.left-=dt;if(e.state==='warn'){if(e.left<=0){if(dist(e.pos,this.hero)<=d.areaRadius)this.damageHero(d.damage,e.pos);e.state='recover';e.left=d.recovery;this.events.push('danger');}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.areaInterval;}return;}this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage);if(e.left<=0){if(this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;this.events.push('warn');}}
  }
  dangerBusy(except){return this.activeEnemies.filter(e=>e.id!==except.id&&((e.type==='ghost'&&['warn','charge'].includes(e.state))||(e.type==='brute'&&e.state==='warn'))).length>=C.danger.maxConcurrent;}

  bossPhaseFor(hp){return hp>C.boss.hp*C.boss.phaseAt[1]?1:hp>C.boss.hp*C.boss.phaseAt[2]?2:3;}
  updateBoss(e,dt){
    const d=C.boss,nextPhase=this.bossPhaseFor(e.hp),required={1:['charge','meeting'],2:['fan','summon']}[e.bossPhase]||[];
    if(nextPhase!==e.bossPhase&&required.every(kind=>e.phaseDone.has(kind))){e.bossPhase=nextPhase;e.pattern=0;e.phaseSeen=new Set();e.phaseDone=new Set();e.state='phaseShift';e.left=1.15;const lines={2:['魔王部長・第2形態','「全員、この資料を見て！」'],3:['魔王部長・第3形態','「最終確認を始める！」']}[nextPhase];this.banner={title:lines[0],detail:lines[1],left:2.4};this.notice=nextPhase===2?'扇状書類弾と増援が追加！':'連続突進と順番に爆発する床！';this.events.push('bossPhase');}
    e.weak=['stunned','recover'].includes(e.state);e.left-=dt;
    if(e.state==='phaseShift'){if(e.left<=0){e.state='chase';e.left=0;this.startBossAttack(e);}return;}
    if(e.state==='stunned'||e.state==='recover'||e.state==='floorSequence'){if(e.left<=0){if(e.state==='floorSequence')e.phaseDone.add('floor');e.state='chase';e.left=d.intervals[e.bossPhase];}return;}
    if(e.state==='chargeWarn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;this.events.push('danger');}return;}
    if(e.state==='charge'||e.state==='multiCharge'){const kind=e.state==='charge'?'charge':'multi',duration=e.state==='charge'?d.chargeDuration:d.multiDuration,x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;if(blocked(x,y,e.radius,solids)){e.phaseDone.add(kind);e.state='stunned';e.left=d.stun;e.chargesLeft=0;this.notice='机に激突！ 弱点露出！';this.events.push('stun');return;}e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage);if(e.left<=0){if(e.state==='multiCharge'&&--e.chargesLeft>0){e.state='multiWarn';e.left=d.multiWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);}else{e.phaseDone.add(kind);e.state='recover';e.left=duration+.35;}}return;}
    if(e.state==='multiWarn'){if(e.left<=0){e.state='multiCharge';e.left=d.multiDuration;}return;}
    if(e.state==='meetingWarn'){if(e.left<=0){if(dist(e.pos,this.hero)<=d.meetingRadius)this.damageHero(d.damage,e.pos);e.phaseDone.add('meeting');e.state='recover';e.left=d.meetingRecovery;this.events.push('danger');}return;}
    if(e.state==='fanWarn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanCount,d.fanSpread,'boss',11);e.phaseDone.add('fan');e.state='recover';e.left=1;}return;}
    if(e.state==='summonWarn'){if(e.left<=0){for(let i=0;i<d.summonCount;i++)this.addSpawnWarning(i===d.summonCount-1?'bat':'slime','boss');e.phaseDone.add('summon');e.state='recover';e.left=1.05;this.events.push('summon');}return;}
    this.moveEnemy(e,this.hero,d.speed*(1+(e.bossPhase-1)*.1),dt);if(e.left<=0)this.startBossAttack(e);
  }
  startBossAttack(e){
    const patterns={1:['charge','meeting'],2:['fan','summon','charge','meeting'],3:['multi','floor','fan','summon','meeting']}[e.bossPhase],kind=patterns[e.pattern++%patterns.length],d=C.boss;e.phaseSeen.add(kind);
    if(kind==='charge'){e.state='chargeWarn';e.left=d.chargeWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='「ちょっといい？」赤い進路から横へ！';}
    else if(kind==='meeting'){e.state='meetingWarn';e.left=d.meetingWarning;this.notice='「5分だけ会議」紫の円から出よう！';}
    else if(kind==='fan'){e.state='fanWarn';e.left=d.fanWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='扇状の書類弾！ 隙間か背後へ！';}
    else if(kind==='summon'){e.state='summonWarn';e.left=d.summonWarning;this.notice='「担当者を呼んで！」増援予告！';}
    else if(kind==='multi'){e.state='multiWarn';e.left=d.multiWarning;e.chargesLeft=d.multiCharges;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='連続「ちょっといい？」方向は毎回予告！';}
    else{e.state='floorSequence';this.createBossFloorAreas();e.left=d.floorWarning+(d.floorCount-1)*d.floorGap+d.floorRecovery;this.notice='床の数字順に爆発！ 安全な場所へ移動！';}
    this.events.push('warn');
  }
  createBossFloorAreas(){
    const d=C.boss,spots=[copy(this.hero),{x:100,y:140},{x:380,y:140},{x:100,y:500},{x:380,y:500},{x:240,y:320}];for(let i=0;i<d.floorCount;i++)this.enemyAreas.push({kind:'bossFloor',pos:spots[i%spots.length],radius:d.floorRadius,left:d.floorWarning+i*d.floorGap,order:i+1,damage:d.damage,fired:false,effect:0});this.enemyAreas=this.enemyAreas.slice(-C.limits.enemyAreas);
  }
  updateEnemyAreas(dt){for(const a of this.enemyAreas){if(!a.fired){a.left-=dt;if(a.left<=0){a.fired=true;a.effect=.32;if(dist(a.pos,this.hero)<=a.radius)this.damageHero(a.damage,a.pos);this.events.push('danger');}}else a.effect-=dt;}this.enemyAreas=this.enemyAreas.filter(a=>!a.fired||a.effect>0);}

  contactHero(e,damage,slow=false){const d=C.enemies[e.type];if(e.contactLeft>0||dist(e.pos,this.hero)>=e.radius+C.radius)return;e.contactLeft=e.type==='boss'?0.6:(d.contactCooldown||0.75);if(this.damageHero(damage,e.pos)&&slow)this.hero.slowLeft=C.hero.slowDuration;}
  damageHero(amount,source){const h=this.hero;if(h.invulnerable>0)return false;h.energy=Math.max(0,h.energy-amount);h.invulnerable=C.hero.hitInvulnerability;h.hurtFlash=.25;this.hitsTaken++;this.shake=C.screenShake?0.12:0;const d=norm(h.x-source.x,h.y-source.y);this.nav.move(h,d.x*16,d.y*16);this.events.push('hurt');if(h.energy===0)this.finish('energy');return true;}
  damageEnemy(e,amount,dir,knock=0){
    if(e.dead||e.state==='phaseShift')return false;
    let floor=0;if(e.type==='boss'){amount*=e.weak?C.boss.weakMultiplier:C.boss.armorMultiplier;if(e.bossPhase===1)floor=C.boss.hp*C.boss.phaseAt[1];else if(e.bossPhase===2)floor=C.boss.hp*C.boss.phaseAt[2];else if(!['multi','floor'].every(kind=>e.phaseDone.has(kind)))floor=1;}
    e.hp=Math.max(floor,e.hp-amount);e.flash=.11;this.shake=C.screenShake?0.055:0;this.events.push('hit');if(knock&&e.type!=='boss')this.nav.move(e.pos,dir.x*knock,dir.y*knock);if(e.hp===0)this.killEnemy(e);return true;
  }
  killEnemy(e){
    if(e.dead)return;e.dead=true;this.kills++;if(e.type!=='boss')this.ultimate=clamp(this.ultimate+C.enemies[e.type].ult,0,C.ultimate.max);for(let i=0;i<(e.type==='boss'?34:9)&&this.particles.length<C.limits.particles;i++)this.particles.push({pos:copy(e.pos),vel:{x:(this.random()-.5)*160,y:(this.random()-.5)*160},left:.65+this.random()*.5,color:e.type==='boss'?'#f4ca62':'#f3ecda'});this.events.push(e.type==='boss'?'bossDown':'defeat');if(e.type==='boss'){this.gateOpen=true;this.phase='escape';this.banner={title:'魔王部長、撃破！',detail:'退勤ゲートへ走れ！',left:3};this.notice='右上の退勤ゲートへ！';}}
  separateEnemies(){const list=this.activeEnemies;for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy),need=(a.radius+b.radius)*.7;if(d>0&&d<need){const p=(need-d)/2,nx=dx/d,ny=dy/d;this.nav.move(a.pos,-nx*p,-ny*p);this.nav.move(b.pos,nx*p,ny*p);}}}
  collectCoffee(){if(this.coffee&&dist(this.hero,this.coffee)<C.coffee.pickupRange){const before=this.hero.energy;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+C.coffee.heal);this.notice=`コーヒーで気力 ${Math.round(this.hero.energy-before)} 回復`;this.coffee=null;this.events.push('heal');}}
  updateEffects(dt){for(const p of this.particles){p.left-=dt;p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.vel.y+=80*dt;}this.particles=this.particles.filter(p=>p.left>0);for(const t of this.thunders)t.left-=dt;this.thunders=this.thunders.filter(t=>t.left>0);}

  checkWaveClear(dt){if(this.spawnQueue.length||this.spawnWarnings.length||this.activeEnemies.length){this.waveClearLeft=0;return;}this.waveClearLeft+=dt;if(this.waveClearLeft<C.waveCompleteDelay)return;this.clearedWaves++;const next=this.wave===1?{kind:'wave',stage:this.stage,wave:2}:this.stage<3?{kind:'stage',stage:this.stage+1}:{kind:'boss'};this.openUpgrade(next);}
  buildOffers(){
    const available=SKILL_IDS.filter(id=>this.skills[id]<3),result=[];
    if(this.upgradeCount===0&&available.includes('reply'))result.push('reply');
    const evolutions=available.filter(id=>id==='slash'||this.skills[id]>0);if(!result.length&&evolutions.length)result.push(evolutions[Math.floor(this.random()*evolutions.length)]);
    const pool=available.filter(id=>!result.includes(id));for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}result.push(...pool.slice(0,3-result.length));return result;
  }
  openUpgrade(next){this.state='upgrade';this.phase='upgrade';this.afterUpgrade=next;this.offers=this.buildOffers();this.banner=null;this.events.push('upgrade');}
  chooseUpgrade(index){
    if(this.state!=='upgrade'||!this.offers[index])return false;const id=this.offers[index];if(this.skills[id]>=3)return false;this.skills[id]++;this.upgradeCount++;this.coffee={...center(C.coffeeSpot)};this.auto.thunder=0;this.auto.meteor=0;const next=this.afterUpgrade;
    if(next.kind==='wave')this.beginWave(next.stage,next.wave);else if(next.kind==='stage'){this.transitionHeal=Math.min(C.hero.energy-this.hero.energy,C.hero.energy*C.hero.stageHealRatio);this.hero.energy+=this.transitionHeal;this.stage=next.stage;this.wave=0;this.state='stageIntro';this.phase='stageIntro';this.notice=`フロア移動で気力${Math.round(this.transitionHeal)}回復`;if(this.transitionHeal>0)this.events.push('heal');}else{this.state='bossIntro';this.phase='bossIntro';this.wave=0;this.notice='魔王部長が待っている';}return true;
  }
  skillSummary(){return SKILL_IDS.filter(id=>id==='slash'||this.skills[id]>0).map(id=>this.skills[id]?`${C.skills[id].name} Lv.${this.skills[id]}`:`${C.skills[id].name} 初期`);}
  finish(reason){this.outcome=reason==='success'?'success':'failure';this.reason=reason;this.state='result';this.phase='result';this.events.push(this.outcome);}
}
