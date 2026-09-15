import {CONFIG as C,center,makeSolids,SKILL_IDS,NEW_SKILL_IDS,ULTIMATE_IDS,rotate} from './config.js';
import {navigation,blocked,clearLine} from './pathfinding.js';

const copy=p=>({x:p.x,y:p.y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y,f={x:0,y:-1})=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:copy(f);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffled=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

export class Game{
  constructor(random=Math.random){this.random=random;this.reset();}
  reset(){
    this.state='title';this.resumeState='playing';this.phase='title';this.outcome=null;this.reason=null;
    this.remaining=C.timeLimit;this.elapsed=0;this.stage=1;this.wave=0;this.waveElapsed=0;this.waveClearLeft=0;this.clearedWaves=0;this.upgradeCount=0;
    this.skills=Object.fromEntries(SKILL_IDS.map(id=>[id,0]));this.ultimateChoice=null;this.ultimate=0;this.ultimateEffectLeft=0;
    this.hero={...center(C.stages[0].start),energy:C.hero.energy,facing:{x:0,y:-1},attackCd:0,attackCount:0,invulnerable:0,slowLeft:0,hurtFlash:0};
    this.offers=[];this.upgradeType=null;this.afterUpgrade=null;this.layoutIndex=0;this.loadStage(1,false);
    this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];
    this.particles=[];this.thunders=[];this.meteors=[];this.enemyAreas=[];this.orbitHits=new Map();this.auto={thunder:0,meteor:0,boomerang:0,drone:0};
    this.kills=0;this.hitsTaken=0;this.coffee=null;this.gateOpen=false;this.elevatorPending=false;this.travelTarget=null;
    this.banner=null;this.notice='Enterで操作説明へ';this.events=[];this.nextEnemyId=1;this.shake=0;this.boss=null;this.transitionHeal=0;
  }
  loadStage(stageId,moveHero=true){
    this.stage=stageId;this.layoutIndex=0;const s=this.stageConfig;this.worldWidth=s.size[0];this.worldHeight=s.size[1];this.solids=makeSolids(stageId,0);this.nav=navigation(this.solids,this.worldWidth,this.worldHeight);
    if(moveHero)this.hero={...this.hero,...center(s.start),facing:{x:0,y:-1},attackCd:0,invulnerable:0,slowLeft:0};
  }
  get stageConfig(){return C.stages[this.stage-1];}
  get stageName(){return this.stageConfig.name;}
  get waveLabel(){return this.wave?`STAGE ${this.stage} / WAVE ${this.wave}`:'移動中';}
  get activeEnemies(){return this.enemies.filter(e=>!e.dead);}
  get selectedUltimate(){return this.ultimateChoice?C.ultimate[this.ultimateChoice]:null;}
  get clock(){const m=Math.min(C.deadlineMinute,C.startMinute+(C.deadlineMinute-C.startMinute)*this.elapsed/C.timeLimit);return `${Math.floor(m/60).toString().padStart(2,'0')}:${Math.floor(m%60).toString().padStart(2,'0')}`;}
  get timeText(){const n=Math.ceil(this.remaining);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
  get attackRange(){return C.attack.ranges[this.skills.slash];}
  get attackArc(){return C.attack.arcs[this.skills.slash]*Math.PI/180;}
  skillLevel(id){return this.skills[id]||0;}
  isBoss(e){return e?.type==='manager'||e?.type==='president';}
  camera(){return {x:clamp(this.hero.x-C.width/2,0,this.worldWidth-C.width),y:clamp(this.hero.y-C.height/2,0,this.worldHeight-C.height)};}
  inCamera(p,margin=0){const c=this.camera();return p.x>=c.x-margin&&p.x<=c.x+C.width+margin&&p.y>=c.y-margin&&p.y<=c.y+C.height+margin;}
  get objectivePoint(){
    if(this.travelTarget)return this.travelTarget;if(['elevator','escape'].includes(this.phase))return center(this.stageConfig.gate);
    if(this.worldWidth>C.width&&this.phase==='wave'){const e=this.activeEnemies.find(x=>!this.inCamera(x.pos,20));if(e)return e.pos;}
    return null;
  }

  showInstructions(){if(this.state==='title'){this.state='instructions';this.phase='instructions';}}
  startRun(){if(this.state==='instructions'){this.state='ultimateSelect';this.phase='ultimateSelect';this.notice='今回の切り札を1つ選ぼう';}}
  selectUltimate(index){
    if(this.state!=='ultimateSelect')return false;const id=typeof index==='string'?index:ULTIMATE_IDS[index];if(!ULTIMATE_IDS.includes(id))return false;
    this.ultimateChoice=id;this.loadStage(1,true);this.state='stageIntro';this.phase='stageIntro';this.notice=`必殺技：${this.selectedUltimate.name}`;return true;
  }
  enterStage(){if(this.state!=='stageIntro')return;if(this.stageConfig.arenas)this.startTravel(1);else this.beginWave(this.stage,1);}
  pause(){if(this.state==='playing'){this.resumeState='playing';this.state='paused';}}
  resume(){if(this.state==='paused')this.state=this.resumeState;}

  startTravel(wave){this.state='playing';this.phase='travel';this.wave=wave;this.travelTarget=center(this.stageConfig.arenas[wave-1]);this.notice=`矢印の先へ移動：戦闘エリア ${wave}/2`;this.banner={title:this.stageName,detail:'目的地へ入ると戦闘開始',left:2};}
  beginWave(stage,wave){
    this.state='playing';this.phase='wave';this.stage=stage;this.wave=wave;this.travelTarget=null;this.waveElapsed=0;this.waveClearLeft=0;this.spawnQueue=[];this.spawnWarnings=[];
    let due=.15;for(const group of this.stageConfig.waves[wave-1]){for(let i=0;i<group.count;i++){this.spawnQueue.push({type:group.type,due,source:'wave'});due+=group.stagger;}due+=C.groupGap;}
    this.banner={title:`${this.stageName} ${wave}/2`,detail:wave===1?this.stageConfig.rule:'増援！ 全滅させて報酬を選べ',left:2.4};this.notice=`${this.stageName}：出現予告から離れよう`;this.events.push('wave');
  }
  chooseSpawn(){
    const occupied=[...this.activeEnemies.map(e=>e.pos),...this.spawnWarnings.map(w=>w.pos)];let points=this.stageConfig.spawnPoints.map(center).filter(p=>dist(p,this.hero)>110&&!this.isBlocked(p.x,p.y,C.radius));
    if(this.stageConfig.arenas){const arena=center(this.stageConfig.arenas[Math.max(0,this.wave-1)]);const near=points.filter(p=>dist(p,arena)<330);if(near.length)points=near;}
    points.sort((a,b)=>occupied.reduce((s,p)=>s+Math.max(0,100-dist(a,p)),0)-occupied.reduce((s,p)=>s+Math.max(0,100-dist(b,p)),0));return copy(points[Math.floor(this.random()*Math.min(5,points.length))]||center(this.stageConfig.spawnPoints[0]));
  }
  addSpawnWarning(type,source='wave'){if(this.spawnWarnings.length+this.activeEnemies.length>=C.limits.enemies)return;this.spawnWarnings.push({type,source,pos:this.chooseSpawn(),left:C.spawnWarning});}
  createEnemy(type,pos){
    if(this.activeEnemies.length>=C.limits.enemies)return null;const d=C.enemies[type];if(!d)return null;
    const first={bat:d.shootInterval,ghost:d.chargeInterval,brute:d.areaInterval,sentry:d.shootInterval}[type]||0;
    const e={id:this.nextEnemyId++,type,pos:copy(pos),hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'move',left:first,dir:{x:0,y:1},path:[],repath:0};this.enemies.push(e);return e;
  }
  spawnBoss(kind=this.stageConfig.boss){
    if(!['bossIntro','presidentIntro'].includes(this.state))return null;const manager=kind==='manager',d=manager?C.boss:C.president,pos=center(manager?C.bossStart:C.presidentStart);
    const e={id:this.nextEnemyId++,type:manager?'manager':'president',pos,hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'chase',left:1.25,dir:{x:0,y:1},path:[],repath:0,bossPhase:1,pattern:0,chargesLeft:0,weak:false,phaseSeen:new Set(),phaseDone:new Set()};
    this.enemies.push(e);this.boss=e;this.phase=manager?'managerBoss':'presidentBoss';this.state='playing';this.wave=0;this.banner={title:manager?'魔王部長・第1形態':'魔王社長、就任',detail:manager?'「最後に、ちょっといい？」':'「退勤には、承認が必要だ」',left:2.8};this.notice=manager?'予告を避け、攻撃後の隙を狙え！':'稟議レーザーと組織再編を見切れ！';this.events.push('boss');return e;
  }

  update(delta,input={}){
    input={x:0,y:0,attack:false,ultimate:false,...input};if(this.state!=='playing')return;let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){const dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;input={...input,ultimate:false};}
  }
  tick(dt,input){
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;if(this.remaining<=0){this.finish('timeout');return;}
    const h=this.hero;for(const k of ['attackCd','invulnerable','slowLeft','hurtFlash'])h[k]=Math.max(0,h[k]-dt);for(const k of Object.keys(this.auto))this.auto[k]=Math.max(0,this.auto[k]-dt);
    if(this.ultimateEffectLeft>0)this.ultimateEffectLeft=Math.max(0,this.ultimateEffectLeft-dt);
    if(this.banner){this.banner.left-=dt;if(this.banner.left<=0)this.banner=null;}this.shake=Math.max(0,this.shake-dt);
    const facing=norm(input.x||0,input.y||0,h.facing);if(input.x||input.y)h.facing=facing;if(input.ultimate&&this.ultimate>=C.ultimate.max&&this.ultimateEffectLeft<=0)this.useUltimate();
    const m=Math.hypot(input.x||0,input.y||0);if(m)this.nav.move(h,input.x/m*C.hero.speed*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt,input.y/m*C.hero.speed*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt);
    if(input.attack&&h.attackCd===0)this.swing();
    if(this.phase==='travel'&&this.travelTarget&&dist(h,this.travelTarget)<48)this.beginWave(this.stage,this.wave);
    this.updateSpawns(dt);this.updateFollowups(dt);this.updateProjectiles(dt);this.updateAutomaticSkills(dt);this.updateMeteors(dt);this.updateEnemyAreas(dt);this.updateEnemies(dt);this.separateEnemies();this.collectCoffee();this.updateEffects(dt);
    if(this.phase==='wave')this.checkWaveClear(dt);
    if(this.phase==='elevator'&&dist(h,center(this.stageConfig.gate))<28){this.gateOpen=false;this.elevatorPending=false;this.openUpgrade({kind:'stage',stage:4},'new','魔王部長撃破');}
    if(this.phase==='escape'&&dist(h,center(this.stageConfig.gate))<28)this.finish('success');
  }

  swing(follow=false,dir=null,source=null,multiplier=1){
    const h=this.hero,direction=copy(dir||h.facing),origin=source?copy(source):copy(h),rush=!follow&&!source&&this.ultimateChoice==='rush'&&this.ultimateEffectLeft>0;
    if(!follow&&!source){h.attackCd=rush?Math.max(C.ultimate.rush.minCooldown,C.attack.cooldown*.5):C.attack.cooldown;h.attackCount++;if(this.skills.slash>=2)this.followups.push({left:C.attack.followDelay,dir:direction});}
    if(rush){const a={kind:'rush',pos:origin,range:C.ultimate.rush.range,damage:C.ultimate.rush.damage,left:C.attack.duration,total:C.attack.duration,hit:new Set()};this.pushAttack(a);this.applyRadius(a,false);}
    else{const a={kind:source?'cloneSlash':follow?'follow':'slash',pos:origin,dir:direction,range:this.attackRange,arc:this.attackArc,damage:(follow?C.attack.followDamage:C.attack.damage)*multiplier,left:C.attack.duration,total:C.attack.duration,hit:new Set()};this.pushAttack(a);this.applyArc(a);}
    if(!follow&&this.skills.reply>0)this.fireReply(origin,direction,multiplier,source?'cloneReply':'reply');
    if(!follow&&!source&&this.skills.boomerang>0&&this.auto.boomerang<=0){this.fireBoomerang();this.auto.boomerang=C.boomerang.cooldown[this.skills.boomerang];}
    if(!follow&&!source&&this.skills.slash>=3&&h.attackCount%C.attack.fullCircleEvery===0){const all={kind:'circle',pos:copy(h),range:C.attack.fullCircleRange,damage:C.attack.fullCircleDamage,left:.28,total:.28,hit:new Set()};this.pushAttack(all);this.applyRadius(all,false);this.events.push('burst');}
    if(!follow&&!source&&this.ultimateChoice==='clones'&&this.ultimateEffectLeft>0)for(const p of this.clonePositions())this.swing(false,direction,p,C.ultimate.clones.damageMultiplier);
    this.events.push('attack');
  }
  pushAttack(a){this.attacks.push(a);if(this.attacks.length>C.attack.maxVisuals)this.attacks.splice(0,this.attacks.length-C.attack.maxVisuals);}
  applyArc(a){for(const e of [...this.activeEnemies]){const dx=e.pos.x-a.pos.x,dy=e.pos.y-a.pos.y,d=Math.hypot(dx,dy),dot=d?(dx*a.dir.x+dy*a.dir.y)/d:1;if(!a.hit.has(e.id)&&d<=a.range+e.radius&&dot>=Math.cos(a.arc/2)&&this.clearLine(a.pos,e.pos)){a.hit.add(e.id);this.damageEnemy(e,a.damage,a.dir,this.isBoss(e)?3:C.attack.knockback);}}}
  applyRadius(a,aerial=true){for(const e of [...this.activeEnemies])if(!a.hit.has(e.id)&&dist(a.pos,e.pos)<=a.range+e.radius&&(aerial||this.clearLine(a.pos,e.pos))){a.hit.add(e.id);this.damageEnemy(e,a.damage,norm(e.pos.x-a.pos.x,e.pos.y-a.pos.y),8);}}
  fireReply(origin=this.hero,dir=this.hero.facing,multiplier=1,kind='reply'){
    const level=this.skills.reply;for(const angle of C.reply.angles[level]){const d=rotate(dir,angle);this.heroProjectiles.push({kind,pos:{x:origin.x+d.x*22,y:origin.y+d.y*22},dir:d,life:C.reply.life,radius:C.reply.radius,damage:C.reply.damage*multiplier,pierce:C.reply.pierce[level],hit:new Set(),speed:C.reply.speed});}
    this.heroProjectiles=this.heroProjectiles.slice(-C.reply.max);
  }
  fireBoomerang(){const level=this.skills.boomerang,d=copy(this.hero.facing);this.heroProjectiles.push({kind:'boomerang',pos:{x:this.hero.x+d.x*20,y:this.hero.y+d.y*20},dir:d,origin:copy(this.hero),travel:0,returning:false,life:4,radius:C.boomerang.radius[level],damage:C.boomerang.damage[level],range:C.boomerang.range[level],outHits:new Set(),backHits:new Set()});this.heroProjectiles=this.heroProjectiles.slice(-C.reply.max);}
  clonePositions(){if(!(this.ultimateChoice==='clones'&&this.ultimateEffectLeft>0))return [];const f=this.hero.facing,p={x:-f.y,y:f.x},o=C.ultimate.clones.offset;return [{x:this.hero.x+p.x*o-f.x*12,y:this.hero.y+p.y*o-f.y*12},{x:this.hero.x-p.x*o-f.x*12,y:this.hero.y-p.y*o-f.y*12}];}
  dronePositions(){const level=this.skills.drone;if(!level)return [];const count=C.drone.count[level],base=this.elapsed*2.1;return Array.from({length:count},(_,i)=>({x:this.hero.x+Math.cos(base+i*Math.PI*2/count)*34,y:this.hero.y+Math.sin(base+i*Math.PI*2/count)*34,index:i}));}
  useUltimate(){
    const id=this.ultimateChoice,d=C.ultimate[id];this.ultimate=0;this.hero.invulnerable=Math.max(this.hero.invulnerable,C.ultimate.invulnerability);
    if(id==='exit'){
      const cam=this.camera();this.enemyProjectiles=this.enemyProjectiles.filter(p=>!this.inCamera(p.pos));this.pushAttack({kind:'ultimate',pos:{x:cam.x+C.width/2,y:cam.y+C.height/2},range:Math.hypot(C.width,C.height)/2,left:d.duration,total:d.duration});
      for(const e of [...this.activeEnemies].filter(e=>this.inCamera(e.pos)))this.damageEnemy(e,this.isBoss(e)?d.bossDamage:d.mobDamage,norm(e.pos.x-this.hero.x,e.pos.y-this.hero.y),22);
    }else this.ultimateEffectLeft=d.duration;
    this.banner={title:`${d.name}！`,detail:id==='exit'?'画面内の仕事と敵弾を一斉処理！':id==='clones'?'8秒間、分身2体が攻撃を再現！':'6秒間、高速全周斬撃＋被害半減！',left:1.35};this.shake=C.screenShake?0.16:0;this.events.push('ultimate');
  }
  updateFollowups(dt){for(const f of this.followups)f.left-=dt;for(const f of this.followups.filter(f=>f.left<=0))this.swing(true,f.dir);this.followups=this.followups.filter(f=>f.left>0);for(const a of this.attacks)a.left-=dt;this.attacks=this.attacks.filter(a=>a.left>0);}

  updateAutomaticSkills(dt){
    this.updateShredder(dt);const enemies=this.activeEnemies;if(!enemies.length)return;
    const tl=this.skills.thunder;if(tl&&this.auto.thunder<=0){this.castThunder(tl);this.auto.thunder=C.thunder.interval[tl];}
    const ml=this.skills.meteor;if(ml&&this.auto.meteor<=0){this.castMeteor(ml);this.auto.meteor=C.meteor.interval[ml];}
    const dl=this.skills.drone;if(dl&&this.auto.drone<=0){this.fireDrone(dl);this.auto.drone=C.drone.interval[dl];}
  }
  orbitPositions(){const level=this.skills.shredder;if(!level)return [];const count=C.shredder.blades[level],radius=C.shredder.radius[level],base=this.elapsed*3.7;return Array.from({length:count},(_,i)=>({x:this.hero.x+Math.cos(base+i*Math.PI*2/count)*radius,y:this.hero.y+Math.sin(base+i*Math.PI*2/count)*radius,index:i}));}
  updateShredder(dt){for(const [k,v] of this.orbitHits)this.orbitHits.set(k,v-dt);for(const [k,v] of this.orbitHits)if(v<=0)this.orbitHits.delete(k);for(const b of this.orbitPositions()){if(this.isBlocked(b.x,b.y,C.shredder.size))continue;for(const e of [...this.activeEnemies]){const key=`${b.index}:${e.id}`;if(!this.orbitHits.has(key)&&dist(b,e.pos)<=C.shredder.size+e.radius&&this.clearLine(this.hero,e.pos)){this.orbitHits.set(key,C.shredder.hitInterval);this.damageEnemy(e,C.shredder.damage,norm(e.pos.x-b.x,e.pos.y-b.y),5);}}}}
  castThunder(level){
    const available=this.activeEnemies.filter(e=>dist(this.hero,e.pos)<=C.thunder.range),used=new Set();for(let bolt=0;bolt<C.thunder.bolts[level];bolt++){let current=available.filter(e=>!used.has(e.id)).sort((a,b)=>dist(this.hero,a.pos)-dist(this.hero,b.pos))[0];if(!current)continue;let from=copy(this.hero);for(let c=0;c<C.thunder.chains[level]&&current;c++){used.add(current.id);this.thunders.push({from:copy(from),to:copy(current.pos),left:C.thunder.effect});this.damageEnemy(current,C.thunder.damage,{x:0,y:1},0);from=copy(current.pos);current=this.activeEnemies.filter(e=>!used.has(e.id)&&dist(from,e.pos)<=C.thunder.chainRange).sort((a,b)=>dist(from,a.pos)-dist(from,b.pos))[0];}}
    this.thunders=this.thunders.slice(-C.thunder.maxEffects);this.events.push('thunder');
  }
  castMeteor(level){
    const enemies=this.activeEnemies.filter(e=>this.inCamera(e.pos,40)),count=Math.min(C.meteor.count[level],enemies.length),chosen=[];for(let i=0;i<count;i++){const target=enemies.filter(e=>!chosen.includes(e)).sort((a,b)=>enemies.filter(e=>dist(b.pos,e.pos)<90).length-enemies.filter(e=>dist(a.pos,e.pos)<90).length)[0];if(!target)break;chosen.push(target);enemies.splice(enemies.indexOf(target),1);this.meteors.push({pos:copy(target.pos),radius:C.meteor.radius[level],damage:C.meteor.damage,left:C.meteor.warning,effect:0,fired:false});}
    this.meteors=this.meteors.slice(-C.meteor.max);this.events.push('meteor');
  }
  fireDrone(level){for(const p of this.dronePositions()){const target=this.activeEnemies.filter(e=>dist(p,e.pos)<=C.drone.range&&this.clearLine(p,e.pos)).sort((a,b)=>dist(p,a.pos)-dist(p,b.pos))[0];if(target){const d=norm(target.pos.x-p.x,target.pos.y-p.y);this.heroProjectiles.push({kind:'drone',pos:copy(p),dir:d,life:1.2,radius:C.drone.radius,damage:C.drone.damage[level],pierce:1,hit:new Set(),speed:C.drone.shotSpeed});}}this.heroProjectiles=this.heroProjectiles.slice(-C.reply.max);}
  updateMeteors(dt){for(const m of this.meteors){if(!m.fired){m.left-=dt;if(m.left<=0){m.fired=true;m.effect=C.meteor.effect;this.applyRadius({pos:m.pos,range:m.radius,damage:m.damage,hit:new Set()},true);this.shake=C.screenShake?0.1:0;this.events.push('impact');}}else m.effect-=dt;}this.meteors=this.meteors.filter(m=>!m.fired||m.effect>0);}

  updateSpawns(dt){
    if(this.phase==='wave'){this.waveElapsed+=dt;for(const q of this.spawnQueue.filter(q=>q.due<=this.waveElapsed)){this.addSpawnWarning(q.type,q.source);q.done=true;}this.spawnQueue=this.spawnQueue.filter(q=>!q.done);}
    for(const w of this.spawnWarnings)w.left-=dt;for(const w of this.spawnWarnings.filter(w=>w.left<=0)){if(this.activeEnemies.length<C.limits.enemies)this.createEnemy(w.type,w.pos);else w.left=.15;}this.spawnWarnings=this.spawnWarnings.filter(w=>w.left>0);
  }
  updateProjectiles(dt){
    for(const p of this.heroProjectiles){p.life-=dt;if(p.kind==='boomerang')this.updateBoomerang(p,dt);else{p.pos.x+=p.dir.x*p.speed*dt;p.pos.y+=p.dir.y*p.speed*dt;if(this.offworld(p.pos)||this.isBlocked(p.pos.x,p.pos.y,p.radius)){p.life=0;continue;}for(const e of [...this.activeEnemies])if(!p.hit.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){p.hit.add(e.id);this.damageEnemy(e,p.damage,p.dir,8);if(p.hit.size>=p.pierce)p.life=0;}}}
    this.heroProjectiles=this.heroProjectiles.filter(p=>p.life>0);
    for(const p of this.enemyProjectiles){p.life-=dt;p.pos.x+=p.dir.x*(p.speed||C.projectile.enemySpeed)*dt;p.pos.y+=p.dir.y*(p.speed||C.projectile.enemySpeed)*dt;if(this.offworld(p.pos)||this.isBlocked(p.pos.x,p.pos.y,p.radius)||dist(p.pos,this.hero)>C.projectile.maxWorldRange){p.life=0;continue;}if(dist(p.pos,this.hero)<p.radius+C.radius){this.damageHero(p.damage||C.projectile.enemyDamage,p.pos);p.life=0;}}
    this.enemyProjectiles=this.enemyProjectiles.filter(p=>p.life>0).slice(-C.projectile.maxEnemy);
  }
  updateBoomerang(p,dt){
    if(!p.returning){p.pos.x+=p.dir.x*C.boomerang.speed*dt;p.pos.y+=p.dir.y*C.boomerang.speed*dt;p.travel+=C.boomerang.speed*dt;if(p.travel>=p.range||this.isBlocked(p.pos.x,p.pos.y,p.radius))p.returning=true;}
    else{const d=norm(this.hero.x-p.pos.x,this.hero.y-p.pos.y);p.dir=d;p.pos.x+=d.x*C.boomerang.speed*dt;p.pos.y+=d.y*C.boomerang.speed*dt;if(dist(p.pos,this.hero)<18){p.life=0;return;}}
    const hits=p.returning?p.backHits:p.outHits;for(const e of [...this.activeEnemies])if(!hits.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){hits.add(e.id);this.damageEnemy(e,p.damage,p.dir,6);}
  }
  offworld(p){return p.x<-20||p.x>this.worldWidth+20||p.y<-20||p.y>this.worldHeight+20;}
  shootFan(pos,dir,count,spread,kind='mail',damage=C.projectile.enemyDamage){const start=-(count-1)*spread/2;for(let i=0;i<count&&this.enemyProjectiles.length<C.projectile.maxEnemy;i++)this.enemyProjectiles.push({kind,pos:copy(pos),dir:rotate(dir,start+i*spread),life:C.projectile.enemyLife,radius:kind==='boss'?8:7,damage,speed:kind==='boss'?C.projectile.bossSpeed:C.projectile.enemySpeed});this.events.push('shoot');}

  moveEnemy(e,target,speed,dt){e.repath-=dt;if(this.clearLine(e.pos,target)){const d=norm(target.x-e.pos.x,target.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);return;}if(e.repath<=0){e.path=this.nav.findPath(e.pos,target);e.repath=.32;}while(e.path.length&&dist(e.pos,e.path[0])<10)e.path.shift();const p=e.path[0];if(p){const d=norm(p.x-e.pos.x,p.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt);}}
  updateEnemies(dt){for(const e of [...this.activeEnemies]){e.flash=Math.max(0,e.flash-dt);e.contactLeft=Math.max(0,e.contactLeft-dt);if(e.type==='slime')this.updateSlime(e,dt);else if(e.type==='bat')this.updateBat(e,dt);else if(e.type==='ghost')this.updateGhost(e,dt);else if(e.type==='brute')this.updateBrute(e,dt);else if(e.type==='sentry')this.updateSentry(e,dt);else if(e.type==='manager')this.updateManager(e,dt);else this.updatePresident(e,dt);}this.enemies=this.enemies.filter(e=>!e.dead);}
  canEnemyAttack(e){return this.inCamera(e.pos,C.danger.activeMargin);}
  updateSlime(e,dt){this.moveEnemy(e,this.hero,C.enemies.slime.speed+(this.stage-1)*2,dt);this.contactHero(e,C.enemies.slime.damage);}
  updateBat(e,dt){
    const d=C.enemies.bat,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='warn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanByStage[this.stage],d.spread);e.state='move';e.left=d.shootInterval-Math.max(0,this.stage-1)*.08;}return;}
    if(range<d.desired-28)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+35)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateSentry(e,dt){
    const d=C.enemies.sentry,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='warn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanCount,d.spread,'drone',d.damage);e.state='move';e.left=d.shootInterval;}return;}
    if(range<d.desired-35)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+40)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateGhost(e,dt){
    const d=C.enemies.ghost;e.left-=dt;if(e.state==='warn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;}return;}if(e.state==='charge'){const x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;if(this.isBlocked(x,y,e.radius)){e.state='recover';e.left=d.recovery;}else{e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage,true);}if(e.left<=0){e.state='recover';e.left=d.recovery;}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.chargeInterval;}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage,true);if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateBrute(e,dt){
    const d=C.enemies.brute,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='areaWarn'){if(e.left<=0){if(range<=d.areaRadius)this.damageHero(d.damage,e.pos);e.state='recover';e.left=d.recovery;this.events.push('danger');}return;}if(e.state==='rangedWarn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.rangedCount,d.rangedSpread,'heavy',d.damage-3);e.state='recover';e.left=d.recovery;this.events.push('danger');}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.areaInterval;}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage);if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else if(range>d.rangedDistance){e.state='rangedWarn';e.left=d.rangedWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}else{e.state='areaWarn';e.left=d.warning;this.events.push('warn');}}
  }
  dangerBusy(except){return this.activeEnemies.filter(e=>e.id!==except.id&&(['warn','charge','areaWarn','rangedWarn'].includes(e.state))).length>=C.danger.maxConcurrent;}

  bossPhaseFor(hp){return hp>C.boss.hp*C.boss.phaseAt[1]?1:hp>C.boss.hp*C.boss.phaseAt[2]?2:3;}
  updateManager(e,dt){
    const d=C.boss,nextPhase=this.bossPhaseFor(e.hp),required={1:['charge','meeting'],2:['fan','summon']}[e.bossPhase]||[];
    if(nextPhase!==e.bossPhase&&required.every(kind=>e.phaseDone.has(kind))){e.bossPhase=nextPhase;e.pattern=0;e.phaseSeen=new Set();e.phaseDone=new Set();e.state='phaseShift';e.left=1.05;const lines={2:['魔王部長・第2形態','「全員、この資料を見て！」'],3:['魔王部長・第3形態','「最終確認を始める！」']}[nextPhase];this.banner={title:lines[0],detail:lines[1],left:2.4};this.events.push('bossPhase');}
    e.weak=['stunned','recover'].includes(e.state);e.left-=dt;if(e.state==='phaseShift'){if(e.left<=0){e.state='chase';e.left=0;this.startManagerAttack(e);}return;}if(e.state==='stunned'||e.state==='recover'||e.state==='floorSequence'){if(e.left<=0){if(e.state==='floorSequence')e.phaseDone.add('floor');e.state='chase';e.left=d.intervals[e.bossPhase];}return;}
    if(e.state==='chargeWarn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;this.events.push('danger');}return;}if(e.state==='charge'||e.state==='multiCharge'){const kind=e.state==='charge'?'charge':'multi',duration=e.state==='charge'?d.chargeDuration:d.multiDuration,x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;if(this.isBlocked(x,y,e.radius)){e.phaseDone.add(kind);e.state='stunned';e.left=d.stun;e.chargesLeft=0;this.notice='机に激突！ 弱点露出！';this.events.push('stun');return;}e.pos.x=x;e.pos.y=y;this.contactHero(e,d.damage);if(e.left<=0){if(e.state==='multiCharge'&&--e.chargesLeft>0){e.state='multiWarn';e.left=d.multiWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);}else{e.phaseDone.add(kind);e.state='recover';e.left=duration+.3;}}return;}
    if(e.state==='multiWarn'){if(e.left<=0){e.state='multiCharge';e.left=d.multiDuration;}return;}if(e.state==='meetingWarn'){if(e.left<=0){if(dist(e.pos,this.hero)<=d.meetingRadius)this.damageHero(d.damage,e.pos);e.phaseDone.add('meeting');e.state='recover';e.left=d.meetingRecovery;this.events.push('danger');}return;}if(e.state==='fanWarn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanCount,d.fanSpread,'boss',11);e.phaseDone.add('fan');e.state='recover';e.left=.9;}return;}if(e.state==='summonWarn'){if(e.left<=0){for(let i=0;i<d.summonCount;i++)this.addSpawnWarning(i===d.summonCount-1?'bat':'slime','boss');e.phaseDone.add('summon');e.state='recover';e.left=.95;this.events.push('summon');}return;}
    this.moveEnemy(e,this.hero,d.speed*(1+(e.bossPhase-1)*.1),dt);if(e.left<=0)this.startManagerAttack(e);
  }
  startManagerAttack(e){const patterns={1:['charge','meeting'],2:['fan','summon','charge','meeting'],3:['multi','floor','fan','summon','meeting']}[e.bossPhase],kind=patterns[e.pattern++%patterns.length],d=C.boss;e.phaseSeen.add(kind);
    if(kind==='charge'){e.state='chargeWarn';e.left=d.chargeWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='「ちょっといい？」赤い進路から横へ！';}
    else if(kind==='meeting'){e.state='meetingWarn';e.left=d.meetingWarning;this.notice='「5分だけ会議」紫の円から出よう！';}
    else if(kind==='fan'){e.state='fanWarn';e.left=d.fanWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='扇状の書類弾！ 隙間か背後へ！';}
    else if(kind==='summon'){e.state='summonWarn';e.left=d.summonWarning;this.notice='「担当者を呼んで！」増援予告！';}
    else if(kind==='multi'){e.state='multiWarn';e.left=d.multiWarning;e.chargesLeft=d.multiCharges;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='連続突進！ 方向は毎回予告！';}
    else{e.state='floorSequence';this.createBossFloorAreas();e.left=d.floorWarning+(d.floorCount-1)*d.floorGap+d.floorRecovery;this.notice='床の数字順に爆発！';}this.events.push('warn');
  }
  createBossFloorAreas(){const d=C.boss,spots=[copy(this.hero),{x:100,y:140},{x:380,y:140},{x:100,y:500},{x:380,y:500},{x:240,y:320}];for(let i=0;i<d.floorCount;i++)this.enemyAreas.push({kind:'bossFloor',pos:spots[i%spots.length],radius:d.floorRadius,left:d.floorWarning+i*d.floorGap,order:i+1,damage:d.damage,fired:false,effect:0});this.enemyAreas=this.enemyAreas.slice(-C.limits.enemyAreas);}

  updatePresident(e,dt){
    const d=C.president,next=e.hp<=d.hp*d.phaseAt?2:1;if(next!==e.bossPhase){e.bossPhase=2;e.pattern=0;e.state='phaseShift';e.left=1.15;this.banner={title:'魔王社長・最終決裁',detail:'「全社を再編する！」',left:2.4};this.events.push('bossPhase');}
    e.weak=['recover','stunned'].includes(e.state);e.left-=dt;if(e.state==='phaseShift'){if(e.left<=0){e.state='chase';e.left=0;}return;}if(e.state==='recover'||e.state==='stunned'){if(e.left<=0){e.state='chase';e.left=d.intervals[e.bossPhase];}return;}
    if(e.state==='laserWarn'){if(e.left<=0){this.firePresidentLaser(e);e.state='recover';e.left=d.laserRecovery;this.events.push('danger');}return;}
    if(e.state==='reorgWarn'){if(e.left<=0){this.reorganize();e.state='recover';e.left=d.reorgRecovery;this.events.push('reorg');}return;}
    if(e.state==='summonWarn'){if(e.left<=0){const existing=this.activeEnemies.filter(x=>!this.isBoss(x)).length;for(let i=0;i<Math.min(d.summonCount,d.summonCap-existing);i++)this.addSpawnWarning(i%2?'sentry':'slime','president');e.state='recover';e.left=d.weakTime;this.events.push('summon');}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage);if(e.left<=0)this.startPresidentAttack(e);
  }
  startPresidentAttack(e){const patterns=e.bossPhase===1?['laser','reorg','summon']:['laser','summon','laser','reorg'],kind=patterns[e.pattern++%patterns.length],d=C.president;e.phaseSeen.add(kind);
    if(kind==='laser'){e.state='laserWarn';e.left=d.laserWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice='稟議レーザー：赤い直線から歩いて離れよう！';}
    else if(kind==='reorg'){e.state='reorgWarn';e.left=d.reorgWarning;this.notice='組織再編：机の配置が切り替わる！';}
    else{e.state='summonWarn';e.left=d.summonWarning;this.notice='緊急招集：増援が来る！';}this.events.push('warn');
  }
  firePresidentLaser(e){const d=C.president,a=e.pos,b={x:a.x+e.dir.x*d.laserRange,y:a.y+e.dir.y*d.laserRange};this.enemyAreas.push({kind:'laser',pos:copy(a),end:b,radius:d.laserWidth/2,left:0,order:'LASER',damage:d.damage,fired:true,effect:.32});if(this.pointLineDistance(this.hero,a,b)<=d.laserWidth/2+C.radius)this.damageHero(d.damage,a);}
  pointLineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return dist(p,{x:a.x+dx*t,y:a.y+dy*t});}
  reorganize(){
    this.layoutIndex=1-this.layoutIndex;this.solids=makeSolids(5,this.layoutIndex);this.nav=navigation(this.solids,this.worldWidth,this.worldHeight);
    for(const body of [this.hero,...this.activeEnemies.map(e=>e.pos)])if(this.isBlocked(body.x,body.y,C.radius))Object.assign(body,this.nearestFree(body));
    for(const e of this.activeEnemies){e.path=[];e.repath=0;}this.notice=`組織再編完了：配置 ${this.layoutIndex+1}`;
  }
  nearestFree(p){for(let r=1;r<10;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(Math.abs(x)!==r&&Math.abs(y)!==r)continue;const q=center([Math.floor(p.x/C.tile)+x,Math.floor(p.y/C.tile)+y]);if(!this.isBlocked(q.x,q.y,C.radius))return q;}return center(this.stageConfig.start);}
  updateEnemyAreas(dt){for(const a of this.enemyAreas){if(!a.fired){a.left-=dt;if(a.left<=0){a.fired=true;a.effect=.32;if(dist(a.pos,this.hero)<=a.radius)this.damageHero(a.damage,a.pos);this.events.push('danger');}}else a.effect-=dt;}this.enemyAreas=this.enemyAreas.filter(a=>!a.fired||a.effect>0);}

  contactHero(e,damage,slow=false){const d=C.enemies[e.type];if(e.contactLeft>0||dist(e.pos,this.hero)>=e.radius+C.radius)return;e.contactLeft=this.isBoss(e)?0.6:(d?.contactCooldown||.75);if(this.damageHero(damage,e.pos)&&slow)this.hero.slowLeft=C.hero.slowDuration;}
  damageHero(amount,source){const h=this.hero;if(h.invulnerable>0)return false;if(this.ultimateChoice==='rush'&&this.ultimateEffectLeft>0)amount*=C.ultimate.rush.damageReduction;h.energy=Math.max(0,h.energy-amount);h.invulnerable=C.hero.hitInvulnerability;h.hurtFlash=.25;this.hitsTaken++;this.shake=C.screenShake?0.12:0;const d=norm(h.x-source.x,h.y-source.y);this.nav.move(h,d.x*16,d.y*16);this.events.push('hurt');if(h.energy===0)this.finish('energy');return true;}
  damageEnemy(e,amount,dir,knock=0){
    if(e.dead||e.state==='phaseShift')return false;let floor=0;if(e.type==='manager'){amount*=e.weak?C.boss.weakMultiplier:C.boss.armorMultiplier;if(e.bossPhase===1)floor=C.boss.hp*C.boss.phaseAt[1];else if(e.bossPhase===2)floor=C.boss.hp*C.boss.phaseAt[2];else if(!['multi','floor'].every(kind=>e.phaseDone.has(kind)))floor=1;}else if(e.type==='president')amount*=e.weak?C.president.weakMultiplier:C.president.armorMultiplier;
    e.hp=Math.max(floor,e.hp-amount);e.flash=.11;this.shake=C.screenShake?0.055:0;this.events.push('hit');if(knock&&!this.isBoss(e)){const resistance=e.type==='brute'?C.enemies.brute.knockResistance:1;this.nav.move(e.pos,dir.x*knock*resistance,dir.y*knock*resistance);}if(e.hp===0)this.killEnemy(e);return true;
  }
  killEnemy(e){
    if(e.dead)return;e.dead=true;this.kills++;if(!this.isBoss(e)&&this.ultimateEffectLeft<=0){const gain=C.enemies[e.type].ult*(this.selectedUltimate?.gain||1);this.ultimate=clamp(this.ultimate+gain,0,C.ultimate.max);}for(let i=0;i<(this.isBoss(e)?34:9)&&this.particles.length<C.limits.particles;i++)this.particles.push({pos:copy(e.pos),vel:{x:(this.random()-.5)*160,y:(this.random()-.5)*160},left:.65+this.random()*.5,color:this.isBoss(e)?'#f4ca62':'#f3ecda'});this.events.push(this.isBoss(e)?'bossDown':'defeat');
    if(e.type==='manager'){this.gateOpen=true;this.elevatorPending=true;this.phase='elevator';this.banner={title:'魔王部長、撃破！',detail:'エレベーターで深夜フロアへ',left:3};this.notice='右上のエレベーターへ！';}
    if(e.type==='president'){this.gateOpen=true;this.phase='escape';this.banner={title:'魔王社長、撃破！',detail:'最終退勤ゲートへ走れ！',left:3};this.notice='右上の退勤ゲートへ！';}
  }
  separateEnemies(){const list=this.activeEnemies;for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy),need=(a.radius+b.radius)*.7;if(d>0&&d<need){const p=(need-d)/2,nx=dx/d,ny=dy/d;this.nav.move(a.pos,-nx*p,-ny*p);this.nav.move(b.pos,nx*p,ny*p);}}}
  collectCoffee(){if(this.coffee&&dist(this.hero,this.coffee)<C.coffee.pickupRange){const before=this.hero.energy;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+C.coffee.heal);this.notice=`コーヒーで気力 ${Math.round(this.hero.energy-before)} 回復`;this.coffee=null;this.events.push('heal');}}
  updateEffects(dt){for(const p of this.particles){p.left-=dt;p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.vel.y+=80*dt;}this.particles=this.particles.filter(p=>p.left>0);for(const t of this.thunders)t.left-=dt;this.thunders=this.thunders.filter(t=>t.left>0);}

  checkWaveClear(dt){if(this.spawnQueue.length||this.spawnWarnings.length||this.activeEnemies.length){this.waveClearLeft=0;return;}this.waveClearLeft+=dt;if(this.waveClearLeft<C.waveCompleteDelay)return;this.clearedWaves++;
    if(this.wave===1){const next=this.stageConfig.arenas?{kind:'travel',stage:this.stage,wave:2}:{kind:'wave',stage:this.stage,wave:2};this.openUpgrade(next,'evolution');}
    else{let next;if(this.stageConfig.boss)next={kind:this.stage===3?'boss':'president'};else next={kind:'stage',stage:this.stage+1};this.openUpgrade(next,'new');}
  }
  buildOffers(type=this.upgradeType){
    if(type==='evolution'){const evolvable=SKILL_IDS.filter(id=>(id==='slash'||this.skills[id]>0)&&this.skills[id]<3);const result=shuffled(evolvable,this.random).slice(0,3);return result.length?result:['heal','gauge'];}
    const available=NEW_SKILL_IDS.filter(id=>this.skills[id]===0),result=[];if(this.stage===1&&available.includes('reply'))result.push('reply');result.push(...shuffled(available.filter(id=>!result.includes(id)),this.random).slice(0,3-result.length));return result.length?result:['heal','gauge'];
  }
  openUpgrade(next,type='evolution',source='wave'){this.state='upgrade';this.phase='upgrade';this.afterUpgrade=next;this.upgradeType=type;this.offers=this.buildOffers(type);this.banner=null;this.notice=source==='wave'?'ウェーブ突破！':'ボス撃破報酬！';this.events.push('upgrade');}
  chooseUpgrade(index){
    if(this.state!=='upgrade'||!this.offers[index])return false;const id=this.offers[index];if(id==='heal'){const before=this.hero.energy;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+40);this.notice=`気力 ${Math.round(this.hero.energy-before)} 回復`;}else if(id==='gauge'){this.ultimate=C.ultimate.max;this.notice='必殺技ゲージ 100%';}else{if(this.skills[id]>=3)return false;this.skills[id]++;this.notice=`${C.skills[id].name} Lv.${this.skills[id]}`;}
    this.upgradeCount++;this.coffee={...this.hero};this.auto.thunder=0;this.auto.meteor=0;this.auto.drone=0;const next=this.afterUpgrade;this.resolveNext(next);return true;
  }
  resolveNext(next){
    if(next.kind==='wave')this.beginWave(next.stage,next.wave);else if(next.kind==='travel')this.startTravel(next.wave);else if(next.kind==='stage'){
      this.transitionHeal=Math.min(C.hero.energy-this.hero.energy,C.hero.energy*C.hero.stageHealRatio);this.hero.energy+=this.transitionHeal;this.loadStage(next.stage,true);this.clearCombat();this.state='stageIntro';this.phase='stageIntro';this.notice=`フロア移動で気力${Math.round(this.transitionHeal)}回復`;if(this.transitionHeal>0)this.events.push('heal');
    }else if(next.kind==='boss'){this.state='bossIntro';this.phase='bossIntro';this.wave=0;this.notice='魔王部長が待っている';}
    else{this.state='presidentIntro';this.phase='presidentIntro';this.wave=0;this.notice='魔王社長が待っている';}
  }
  clearCombat(){this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];this.enemyAreas=[];this.meteors=[];this.thunders=[];this.orbitHits.clear();this.boss=null;this.gateOpen=false;this.travelTarget=null;this.ultimateEffectLeft=0;}
  isBlocked(x,y,r=C.radius){return blocked(x,y,r,this.solids);}
  clearLine(a,b){return clearLine(a,b,this.solids);}
  skillSummary(){return SKILL_IDS.filter(id=>id==='slash'||this.skills[id]>0).map(id=>this.skills[id]?`${C.skills[id].name} Lv.${this.skills[id]}`:`${C.skills[id].name} 初期`);}
  finish(reason){this.outcome=reason==='success'?'success':'failure';this.reason=reason;this.state='result';this.phase='result';this.ultimateEffectLeft=0;this.events.push(this.outcome);}
}
