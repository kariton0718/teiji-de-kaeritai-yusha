import {CONFIG as C,ENEMIES,stageWaves,center,makeSolids,SKILL_IDS,NEW_SKILL_IDS,ULTIMATE_IDS,rotate} from './config.js';
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
    this.skills=Object.fromEntries(SKILL_IDS.map(id=>[id,0]));this.ultimateChoice=null;this.ultimate=0;this.ultimateEffectLeft=0;this.blackholes=[];this.cannon=null;
    this.hero={...center(C.stages[0].start),energy:C.hero.energy,facing:{x:0,y:-1},attackCd:0,attackCount:0,invulnerable:0,slowLeft:0,hurtFlash:0};
    this.offers=[];this.upgradeType=null;this.afterUpgrade=null;this.layoutIndex=0;this.loadStage(1,false);
    this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];
    this.particles=[];this.thunders=[];this.meteors=[];this.enemyAreas=[];this.orbitHits=new Map();this.auto={thunder:0,meteor:0,boomerang:0,drone:0};
    this.kills=0;this.hitsTaken=0;this.pickups=[];this.floatingTexts=[];this.secretBossTriggered=false;this.secretBossDefeated=false;this.exitArrivalTime=null;this.gateOpen=false;this.elevatorPending=false;this.travelTarget=null;
    this.banner=null;this.notice='Enterで操作説明へ';this.events=[];this.nextEnemyId=1;this.shake=0;this.healFreeze=0;this.boss=null;this.bossReports=[];this.transitionHeal=0;this.pendingBossRecovery=false;this.emergencyUsed=new Set();
    this.telemetry={damageByStage:Array(6).fill(0),healed:0,minEnergy:C.hero.energy,defeatedBy:null,ultimateUses:0};
  }
  loadStage(stageId,moveHero=true){
    this.stage=stageId;this.layoutIndex=0;const s=this.stageConfig;this.worldWidth=s.size[0];this.worldHeight=s.size[1];this.solids=makeSolids(stageId,0);this.nav=navigation(this.solids,this.worldWidth,this.worldHeight);
    if(moveHero)this.hero={...this.hero,...center(s.start),facing:{x:0,y:-1},attackCd:0,invulnerable:0,slowLeft:0};
  }
  get stageConfig(){return C.stages[this.stage-1];}
  get bossDefinition(){return C.rankBosses[this.secretBossTriggered&&!this.secretBossDefeated?6:this.stage-1];}
  get stageName(){return this.stageConfig.name;}
  get waveLabel(){return this.wave?`STAGE ${this.stage} / WAVE ${this.wave}`:'移動中';}
  get activeEnemies(){return this.enemies.filter(e=>!e.dead);}
  get selectedUltimate(){return this.ultimateChoice?C.ultimate[this.ultimateChoice]:null;}
  get clock(){const m=Math.min(C.deadlineMinute,C.startMinute+(C.deadlineMinute-C.startMinute)*this.elapsed/C.timeLimit);return `${Math.floor(m/60).toString().padStart(2,'0')}:${Math.floor(m%60).toString().padStart(2,'0')}`;}
  get timeText(){const n=Math.ceil(this.remaining);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
  get attackRange(){return C.attack.ranges[this.skills.slash];}
  get attackArc(){return C.attack.arcs[this.skills.slash]*Math.PI/180;}
  skillLevel(id){return this.skills[id]||0;}
  isBoss(e){return e?.type==='rankBoss';}
  camera(){return {x:clamp(this.hero.x-C.width/2,0,this.worldWidth-C.width),y:clamp(this.hero.y-C.height/2,0,this.worldHeight-C.height)};}
  inCamera(p,margin=0){const c=this.camera();return p.x>=c.x-margin&&p.x<=c.x+C.width+margin&&p.y>=c.y-margin&&p.y<=c.y+C.height+margin;}
  get objectivePoint(){
    if(this.travelTarget)return this.travelTarget;if(this.phase==='escape')return center(this.stageConfig.gate);
    if(this.worldWidth>C.width&&this.phase==='wave'){const e=this.activeEnemies.find(x=>!this.inCamera(x.pos,20));if(e)return e.pos;}
    return null;
  }

  showInstructions(){if(this.state==='title'){this.state='instructions';this.phase='instructions';}}
  startRun(){if(this.state==='instructions'){this.state='ultimateSelect';this.phase='ultimateSelect';this.notice='今回の切り札を1つ選ぼう';}}
  selectUltimate(index){
    if(this.state!=='ultimateSelect')return false;const id=typeof index==='string'?index:ULTIMATE_IDS[index];if(!ULTIMATE_IDS.includes(id))return false;
    this.ultimateChoice=id;this.loadStage(1,true);this.state='stageIntro';this.phase='stageIntro';this.notice=`必殺技：${this.selectedUltimate.name}`;return true;
  }
  enterStage(){if(this.state==='stageIntro')this.beginWave(this.stage,1);}
  pause(){if(this.state==='playing'){this.resumeState='playing';this.state='paused';}}
  resume(){if(this.state==='paused')this.state=this.resumeState;}

  startTravel(wave){this.state='playing';this.phase='travel';this.wave=wave;this.travelTarget=center(this.stageConfig.arenas[wave-1]);this.notice=`矢印の先へ移動：戦闘エリア ${wave}/2`;this.banner={title:this.stageName,detail:'目的地へ入ると戦闘開始',left:2};}
  beginWave(stage,wave){
    this.state='playing';this.phase='wave';this.stage=stage;this.wave=wave;this.travelTarget=null;this.waveElapsed=0;this.waveClearLeft=0;this.spawnQueue=[];this.spawnWarnings=[];
    let due=.12;for(const group of stageWaves(stage)[wave-1]){const stagger=group.stagger??Math.max(.035,.09-this.stage*.008);for(let i=0;i<group.count;i++){this.spawnQueue.push({type:group.type,due,source:'wave'});due+=stagger;}due+=C.groupGap;}
    this.banner={title:`${this.stageName} ${wave}/2`,detail:wave===1?this.stageConfig.rule:'増援！ 全滅させて報酬を選べ',left:2.4};this.notice=`${this.stageName}：出現予告から離れよう`;this.events.push('wave');
  }
  chooseSpawn(){
    const occupied=[...this.activeEnemies.map(e=>e.pos),...this.spawnWarnings.map(w=>w.pos)],points=[];for(const radius of [145,190,235])for(let i=0;i<12;i++){const a=i*Math.PI/6+this.random()*.2,p={x:this.hero.x+Math.cos(a)*radius,y:this.hero.y+Math.sin(a)*radius};if(p.x>55&&p.x<this.worldWidth-55&&p.y>55&&p.y<this.worldHeight-55&&!this.isBlocked(p.x,p.y,C.radius))points.push(p);}
    points.sort((a,b)=>occupied.reduce((s,p)=>s+Math.max(0,85-dist(a,p)),0)-occupied.reduce((s,p)=>s+Math.max(0,85-dist(b,p)),0));return copy(points[Math.floor(this.random()*Math.min(8,points.length))]||{x:this.hero.x+120,y:this.hero.y});
  }
  addSpawnWarning(type,source='wave'){if(this.spawnWarnings.length+this.activeEnemies.length>=C.limits.enemies)return false;this.spawnWarnings.push({type,source,pos:this.chooseSpawn(),left:C.spawnWarning});return true;}
  createEnemy(type,pos){
    if(this.activeEnemies.length>=C.limits.enemies)return null;const d=ENEMIES[type];if(!d)return null;
    const first={bat:d.shootInterval,ghost:d.chargeInterval,brute:d.areaInterval,sentry:d.shootInterval}[type]||0;
    const safe=this.findSafePosition(pos,d.radius,38),e={id:this.nextEnemyId++,type,pos:safe,hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'move',left:first,dir:{x:0,y:1},path:[],repath:0};this.enemies.push(e);return e;
  }
  bossMinionCount(){return this.activeEnemies.filter(e=>!this.isBoss(e)).length+this.spawnWarnings.filter(w=>w.source==='boss').length;}
  scheduleBossMinions(count,source='boss'){
    const boss=this.boss,d=boss?C.rankBosses[boss.rankIndex]:null,cap=Math.min(C.bossAttack.summonCap,d?.reinforcement?.cap??C.bossAttack.summonCap),room=Math.max(0,cap-this.bossMinionCount()),total=Math.min(count,room);let added=0;
    for(let i=0;i<total;i++){const ranged=d?.reinforcement?.ranged||1,type=i<ranged?(boss.rankIndex>=4?'sentry':'bat'):'slime';if(this.addSpawnWarning(type,source))added++;}
    if(boss?.report)boss.report.reinforcements+=added;if(added)this.events.push('summon');return added;
  }
  spawnBoss(){
    if(this.state!=='bossIntro')return null;const d=this.bossDefinition,wanted={x:clamp(this.hero.x,this.worldWidth*.35,this.worldWidth*.65),y:clamp(this.hero.y-180,90,this.worldHeight-90)},pos=this.findSafePosition(wanted,d.radius,130);
    const report={stage:this.stage,rank:d.rank,time:0,reinforcements:0,attacks:0,fastMoves:0};this.bossReports.push(report);
    const e={id:this.nextEnemyId++,type:'rankBoss',rankIndex:C.rankBosses.indexOf(d),prop:d.prop,pos,hp:d.hp,maxHp:d.hp,radius:d.radius,dead:false,flash:0,contactLeft:0,state:'chase',left:.8,dir:{x:0,y:1},path:[],repath:0,bossPhase:1,pattern:0,attackKind:null,chargesLeft:0,weak:false,phaseSeen:new Set(),reinforceLeft:d.reinforcement.first,moveTarget:null,moveFrom:null,afterMove:null,report};
    this.enemies.push(e);this.boss=e;this.phase='boss';this.state='playing';this.wave=0;this.banner={title:`魔王${d.rank}、接近！`,detail:`${['「全員、集合！」','「承認印を受けろ！」','「複写しておいた！」','「寸法どおりに働け！」','「ドローン、包囲しろ！」','「最終決裁を下す！」','「効率が良すぎますね。追加監査です。」'][e.rankIndex]}`,left:2.4};this.notice='赤紫の予告を避け、金色の反撃時間を狙え！';this.events.push('boss');return e;
  }

  update(delta,input={}){
    input={x:0,y:0,ultimate:false,...input};if(this.state!=='playing')return;let left=Math.min(Math.max(delta,0),C.maxDelta);
    while(left>1e-9&&this.state==='playing'){const dt=Math.min(left,C.step);this.tick(dt,input);left-=dt;input={...input,ultimate:false};}
  }
  tick(dt,input){
    if(this.healFreeze>0){this.healFreeze=Math.max(0,this.healFreeze-dt);return;}
    this.remaining=Math.max(0,this.remaining-dt);this.elapsed+=dt;if(this.remaining<=0){this.finish('timeout');return;}
    const h=this.hero;for(const k of ['attackCd','invulnerable','slowLeft','hurtFlash'])h[k]=Math.max(0,h[k]-dt);for(const k of Object.keys(this.auto))this.auto[k]=Math.max(0,this.auto[k]-dt);
    if(this.ultimateEffectLeft>0)this.ultimateEffectLeft=Math.max(0,this.ultimateEffectLeft-dt);
    if(this.banner){this.banner.left-=dt;if(this.banner.left<=0)this.banner=null;}this.shake=Math.max(0,this.shake-dt);
    const facing=norm(input.x||0,input.y||0,h.facing);if(input.x||input.y)h.facing=facing;if(input.ultimate&&this.ultimate>=C.ultimate.max&&this.ultimateEffectLeft<=0)this.useUltimate();
    const m=Math.hypot(input.x||0,input.y||0),cannonSlow=this.cannon?C.ultimate.cannon.moveMultiplier:1;h.moveX=input.x||0;h.moveY=input.y||0;if(m)this.nav.move(h,input.x/m*C.hero.speed*cannonSlow*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt,input.y/m*C.hero.speed*cannonSlow*(h.slowLeft>0?C.hero.slowMultiplier:1)*dt);
    if((this.phase==='wave'||this.phase==='boss')&&h.attackCd===0)this.autoSwing();
    if(this.phase==='travel'&&this.travelTarget&&dist(h,this.travelTarget)<48)this.beginWave(this.stage,this.wave);
    this.updateSpawns(dt);this.updateFollowups(dt);this.updateProjectiles(dt);this.updateAutomaticSkills(dt);this.updateUltimateEffects(dt);this.updateMeteors(dt);this.updateEnemyAreas(dt);this.updateEnemies(dt);this.separateEnemies();this.updateRecovery(dt);this.updateEffects(dt);
    if(this.phase==='wave')this.checkWaveClear(dt);
    if(this.state==='playing'&&this.phase==='escape'&&dist(h,center(this.stageConfig.gate))<28)this.reachExit();
  }

  reachExit(){
    if(this.state!=='playing'||this.phase!=='escape'||!this.gateOpen)return false;
    if(!this.secretBossTriggered&&this.elapsed<=C.secretBoss.unlockSeconds){
      this.exitArrivalTime=this.elapsed;this.secretBossTriggered=true;this.clearCombat();
      this.state='bossIntro';this.phase='bossIntro';this.hero.invulnerable=1.5;
      this.ultimate=C.ultimate.max;
      this.spawnRecovery('drink',this.findSafePosition({x:this.hero.x-70,y:this.hero.y+65},12,35),true);
      this.notice='好タイムを検知。外部監査により退勤ゲート封鎖！';
      this.banner={title:'裏ボス出現：特命監査役',detail:C.secretBoss.company,left:3};
      return true;
    }
    this.finish('success');return false;
  }

  autoTarget(){
    const danger=new Set(['warn','charge','fastMove','attackWarn','areaWarn','rangedWarn']);
    return this.activeEnemies.filter(e=>dist(this.hero,e.pos)<=C.attack.aimAssistRange&&this.clearStrikeLine(this.hero,e)).sort((a,b)=>(dist(this.hero,a.pos)-(danger.has(a.state)?42:0))-(dist(this.hero,b.pos)-(danger.has(b.state)?42:0)))[0]||null;
  }
  autoSwing(){const target=this.autoTarget();if(target)this.hero.facing=norm(target.pos.x-this.hero.x,target.pos.y-this.hero.y,this.hero.facing);this.swing();}

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
  applyArc(a){for(const e of [...this.activeEnemies]){const dx=e.pos.x-a.pos.x,dy=e.pos.y-a.pos.y,d=Math.hypot(dx,dy),dot=d?(dx*a.dir.x+dy*a.dir.y)/d:1;if(!a.hit.has(e.id)&&d<=a.range+e.radius&&dot>=Math.cos(a.arc/2)&&this.clearStrikeLine(a.pos,e)){a.hit.add(e.id);this.damageEnemy(e,a.damage,a.dir,this.isBoss(e)?3:C.attack.knockback);}}}
  applyRadius(a,aerial=true){for(const e of [...this.activeEnemies])if(!a.hit.has(e.id)&&dist(a.pos,e.pos)<=a.range+e.radius&&(aerial||this.clearLine(a.pos,e.pos))){a.hit.add(e.id);this.damageEnemy(e,a.damage,norm(e.pos.x-a.pos.x,e.pos.y-a.pos.y),8);}}
  fireReply(origin=this.hero,dir=this.hero.facing,multiplier=1,kind='reply'){
    const level=this.skills.reply;for(const angle of C.reply.angles[level]){const d=rotate(dir,angle);this.heroProjectiles.push({kind,pos:{x:origin.x+d.x*22,y:origin.y+d.y*22},dir:d,life:C.reply.life,radius:C.reply.radius,damage:C.reply.damage*multiplier,pierce:C.reply.pierce[level],hit:new Set(),speed:C.reply.speed});}
    this.heroProjectiles=this.heroProjectiles.slice(-C.reply.max);
  }
  fireBoomerang(){const level=this.skills.boomerang,d=copy(this.hero.facing);this.heroProjectiles.push({kind:'boomerang',pos:{x:this.hero.x+d.x*20,y:this.hero.y+d.y*20},dir:d,origin:copy(this.hero),travel:0,returning:false,life:4,radius:C.boomerang.radius[level],damage:C.boomerang.damage[level],range:C.boomerang.range[level],outHits:new Set(),backHits:new Set()});this.heroProjectiles=this.heroProjectiles.slice(-C.reply.max);}
  clonePositions(){if(!(this.ultimateChoice==='clones'&&this.ultimateEffectLeft>0))return [];const f=this.hero.facing,p={x:-f.y,y:f.x},o=C.ultimate.clones.offset;return [{x:this.hero.x+p.x*o-f.x*12,y:this.hero.y+p.y*o-f.y*12},{x:this.hero.x-p.x*o-f.x*12,y:this.hero.y-p.y*o-f.y*12}];}
  dronePositions(){const level=this.skills.drone;if(!level)return [];const count=C.drone.count[level],base=this.elapsed*2.1;return Array.from({length:count},(_,i)=>({x:this.hero.x+Math.cos(base+i*Math.PI*2/count)*34,y:this.hero.y+Math.sin(base+i*Math.PI*2/count)*34,index:i}));}
  useUltimate(){
    const id=this.ultimateChoice,d=C.ultimate[id];this.ultimate=0;this.telemetry.ultimateUses++;this.hero.invulnerable=Math.max(this.hero.invulnerable,C.ultimate.invulnerability);
    if(id==='exit'){
      const cam=this.camera();this.enemyProjectiles=this.enemyProjectiles.filter(p=>!this.inCamera(p.pos));this.pushAttack({kind:'ultimate',pos:{x:cam.x+C.width/2,y:cam.y+C.height/2},range:Math.hypot(C.width,C.height)/2,left:d.duration,total:d.duration});
      for(const e of [...this.activeEnemies].filter(e=>this.inCamera(e.pos)))this.damageEnemy(e,this.isBoss(e)?d.bossDamage:d.mobDamage,norm(e.pos.x-this.hero.x,e.pos.y-this.hero.y),22);
    }else{this.ultimateEffectLeft=d.duration;if(id==='blackhole')this.blackholes=[{pos:{x:this.hero.x+this.hero.facing.x*105,y:this.hero.y+this.hero.facing.y*105},left:d.duration,tick:0,hits:new Map(),exploded:false}];if(id==='cannon')this.cannon={dir:copy(this.hero.facing),left:d.duration,tick:0,hits:new Map()};}
    const details={exit:'画面内の仕事と敵弾を一斉処理！',clones:'8秒間、分身2体が攻撃を再現！',rush:'6秒間、高速全周斬撃＋被害半減！',blackhole:'前方の敵を吸い寄せ、最後に爆発！',cannon:'向いている方向へ太い貫通ビーム！'};
    this.banner={title:`${d.name}！`,detail:details[id],left:1.35};this.shake=C.screenShake?0.16:0;this.events.push('ultimate');
  }
  updateUltimateEffects(dt){
    for(const h of this.blackholes){h.left-=dt;h.tick-=dt;for(const [id,left] of h.hits)left<=dt?h.hits.delete(id):h.hits.set(id,left-dt);for(const e of [...this.activeEnemies]){const d=dist(h.pos,e.pos);if(d>C.ultimate.blackhole.range)continue;if(!this.isBoss(e)&&e.type!=='brute'){const v=norm(h.pos.x-e.pos.x,h.pos.y-e.pos.y);this.nav.move(e.pos,v.x*C.ultimate.blackhole.pullSpeed*dt,v.y*C.ultimate.blackhole.pullSpeed*dt,e.radius);}if(d<C.ultimate.blackhole.radius+e.radius&&!h.hits.has(e.id)){h.hits.set(e.id,C.ultimate.blackhole.tick);this.damageEnemy(e,C.ultimate.blackhole.damage,{x:0,y:0});}}if(h.left<=0&&!h.exploded){h.exploded=true;this.applyRadius({pos:h.pos,range:C.ultimate.blackhole.radius+28,damage:C.ultimate.blackhole.blastDamage,hit:new Set()},true);this.events.push('impact');}}
    this.blackholes=this.blackholes.filter(h=>h.left>0);
    if(this.cannon){const c=this.cannon,d=C.ultimate.cannon;c.left-=dt;c.tick-=dt;for(const [id,left] of c.hits)left<=dt?c.hits.delete(id):c.hits.set(id,left-dt);const end={x:this.hero.x+c.dir.x*d.range,y:this.hero.y+c.dir.y*d.range};this.enemyProjectiles=this.enemyProjectiles.filter(p=>this.pointLineDistance(p.pos,this.hero,end)>d.width/2+p.radius);for(const e of [...this.activeEnemies])if(this.pointLineDistance(e.pos,this.hero,end)<=d.width/2+e.radius&&!c.hits.has(e.id)){c.hits.set(e.id,d.tick);this.damageEnemy(e,this.isBoss(e)?d.bossDamage:d.mobDamage,c.dir,3);}if(c.left<=0)this.cannon=null;}
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
    if(this.phase==='wave'){this.waveElapsed+=dt;for(const q of this.spawnQueue.filter(q=>q.due<=this.waveElapsed)){q.done=this.addSpawnWarning(q.type,q.source);}this.spawnQueue=this.spawnQueue.filter(q=>!q.done);}
    if(this.phase==='boss'&&this.boss&&!this.boss.dead){const d=C.rankBosses[this.boss.rankIndex],r=d.reinforcement;this.boss.reinforceLeft-=dt;if(this.boss.reinforceLeft<=0){const added=this.scheduleBossMinions(r.count,'boss');this.boss.reinforceLeft=r.interval+(added===0?.75:0);if(added)this.notice=`魔王${d.rank}の増援！ ${added}体接近`;}}
    for(const w of this.spawnWarnings)w.left-=dt;for(const w of this.spawnWarnings.filter(w=>w.left<=0)){if(this.activeEnemies.length<C.limits.enemies){const enemy=this.createEnemy(w.type,w.pos);if(enemy&&w.source?.startsWith('boss'))enemy.bossSummon=true;}else w.left=.15;}this.spawnWarnings=this.spawnWarnings.filter(w=>w.left>0);
  }
  updateProjectiles(dt){
    for(const p of this.heroProjectiles){p.life-=dt;if(p.kind==='boomerang')this.updateBoomerang(p,dt);else{p.pos.x+=p.dir.x*p.speed*dt;p.pos.y+=p.dir.y*p.speed*dt;if(this.offworld(p.pos)||this.isBlocked(p.pos.x,p.pos.y,p.radius)){p.life=0;continue;}for(const e of [...this.activeEnemies])if(!p.hit.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){p.hit.add(e.id);this.damageEnemy(e,p.damage,p.dir,8);if(p.hit.size>=p.pierce)p.life=0;}}}
    this.heroProjectiles=this.heroProjectiles.filter(p=>p.life>0);
    for(const p of this.enemyProjectiles){p.life-=dt;if(p.kind==='returnPaper'&&!p.returning&&p.life<1.5){p.returning=true;p.dir=norm(p.origin.x-p.pos.x,p.origin.y-p.pos.y);}p.pos.x+=p.dir.x*(p.speed||C.projectile.enemySpeed)*dt;p.pos.y+=p.dir.y*(p.speed||C.projectile.enemySpeed)*dt;if(this.offworld(p.pos)||this.isBlocked(p.pos.x,p.pos.y,p.radius)||dist(p.pos,this.hero)>C.projectile.maxWorldRange){p.life=0;continue;}if(dist(p.pos,this.hero)<p.radius+C.radius){this.damageHero(p.damage||C.projectile.enemyDamage,p.pos);p.life=0;}}
    this.enemyProjectiles=this.enemyProjectiles.filter(p=>p.life>0).slice(-C.projectile.maxEnemy);
  }
  updateBoomerang(p,dt){
    if(!p.returning){p.pos.x+=p.dir.x*C.boomerang.speed*dt;p.pos.y+=p.dir.y*C.boomerang.speed*dt;p.travel+=C.boomerang.speed*dt;if(p.travel>=p.range||this.isBlocked(p.pos.x,p.pos.y,p.radius))p.returning=true;}
    else{const d=norm(this.hero.x-p.pos.x,this.hero.y-p.pos.y);p.dir=d;p.pos.x+=d.x*C.boomerang.speed*dt;p.pos.y+=d.y*C.boomerang.speed*dt;if(dist(p.pos,this.hero)<18){p.life=0;return;}}
    const hits=p.returning?p.backHits:p.outHits;for(const e of [...this.activeEnemies])if(!hits.has(e.id)&&dist(p.pos,e.pos)<p.radius+e.radius){hits.add(e.id);this.damageEnemy(e,p.damage,p.dir,6);}
  }
  offworld(p){return p.x<-20||p.x>this.worldWidth+20||p.y<-20||p.y>this.worldHeight+20;}
  shootFan(pos,dir,count,spread,kind='mail',damage=C.projectile.enemyDamage){const start=-(count-1)*spread/2;for(let i=0;i<count&&this.enemyProjectiles.length<C.projectile.maxEnemy;i++)this.enemyProjectiles.push({kind,pos:copy(pos),dir:rotate(dir,start+i*spread),life:C.projectile.enemyLife,radius:kind==='boss'?10:9,damage,speed:kind==='boss'?C.projectile.bossSpeed:C.projectile.enemySpeed});this.events.push('shoot');}

  moveEnemy(e,target,speed,dt){e.repath-=dt;if(this.nav.clearLine(e.pos,target,e.radius)){const d=norm(target.x-e.pos.x,target.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt,e.radius);return;}if(e.repath<=0){e.path=this.nav.findPath(e.pos,target);e.repath=.32;}while(e.path.length&&dist(e.pos,e.path[0])<10)e.path.shift();const p=e.path[0];if(p){const d=norm(p.x-e.pos.x,p.y-e.pos.y);this.nav.move(e.pos,d.x*speed*dt,d.y*speed*dt,e.radius);}}
  findBossTarget(e,kind){
    const toHero=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y),side={x:-toHero.y,y:toHero.x},sign=this.random()<.5?-1:1;let wanted;
    if(kind==='jumpSlam')wanted=copy(this.hero);else if(kind==='sidestep')wanted={x:e.pos.x+side.x*sign*135,y:e.pos.y+side.y*sign*135};else if(kind==='copyShift')wanted={x:this.hero.x+side.x*sign*175-toHero.x*55,y:this.hero.y+side.y*sign*175-toHero.y*55};else if(kind==='flank')wanted={x:this.hero.x+side.x*sign*205,y:this.hero.y+side.y*sign*205};else wanted={x:this.hero.x+side.x*sign*155-toHero.x*35,y:this.hero.y+side.y*sign*155-toHero.y*35};
    const clampPoint=p=>({x:clamp(p.x,e.radius+44,this.worldWidth-e.radius-44),y:clamp(p.y,e.radius+44,this.worldHeight-e.radius-44)}),base=clampPoint(wanted),candidates=[base];for(const radius of [40,80,120])for(let i=0;i<8;i++)candidates.push(clampPoint({x:base.x+Math.cos(i*Math.PI/4)*radius,y:base.y+Math.sin(i*Math.PI/4)*radius}));return candidates.find(p=>!this.isBlocked(p.x,p.y,e.radius))||copy(e.pos);
  }
  beginFastMove(e,afterMove){e.state='fastMove';e.left=C.bossAttack.fastMoveDuration;e.moveFrom=copy(e.pos);e.afterMove=afterMove;e.report.fastMoves++;this.events.push('dash');}
  finishFastMove(e){
    const d=C.rankBosses[e.rankIndex],after=e.afterMove;e.moveFrom=null;e.moveTarget=null;e.afterMove=null;
    if(after==='landingSlam'){if(dist(e.pos,this.hero)<=d.areaRadius+C.radius)this.damageHero(d.damage,e.pos);this.enemyAreas.push({kind:'sweep',pos:copy(e.pos),radius:d.areaRadius,left:0,order:'承',damage:d.damage,fired:true,effect:.38});e.state='recover';e.left=C.bossAttack.recovery+0.25;this.events.push('danger');return;}
    e.attackKind=after;e.state='attackWarn';e.left=C.bossAttack.chainWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.notice=`高速移動後の${{charge:'突進',fan:'書類弾',crossLaser:'挟み撃ちレーザー',sweep:'薙ぎ払い',beam:'極太レーザー'}[after]||'攻撃'}！`;this.events.push('warn');
  }
  updateFastMove(e,dt){const d=C.rankBosses[e.rankIndex],before=copy(e.pos),v=norm(e.moveTarget.x-e.pos.x,e.moveTarget.y-e.pos.y);this.nav.move(e.pos,v.x*(d.fastMoveSpeed||C.bossAttack.fastMoveSpeed)*dt,v.y*(d.fastMoveSpeed||C.bossAttack.fastMoveSpeed)*dt,e.radius);this.contactHero(e,d.damage);e.left-=dt;const stuck=dist(before,e.pos)<.05;if(e.left<=0||dist(e.pos,e.moveTarget)<8||stuck)this.finishFastMove(e);}
  updateEnemies(dt){for(const e of [...this.activeEnemies]){e.flash=Math.max(0,e.flash-dt);e.contactLeft=Math.max(0,e.contactLeft-dt);if(e.type==='slime')this.updateSlime(e,dt);else if(e.type==='bat')this.updateBat(e,dt);else if(e.type==='ghost')this.updateGhost(e,dt);else if(e.type==='brute')this.updateBrute(e,dt);else if(e.type==='sentry')this.updateSentry(e,dt);else if(this.isBoss(e))this.updateRankBoss(e,dt);else this.updateOfficeEnemy(e,dt);}this.enemies=this.enemies.filter(e=>!e.dead);}
  canEnemyAttack(e){return this.inCamera(e.pos,C.danger.activeMargin);}
  summonDamage(e,amount){return e.bossSummon?amount*C.bossAttack.summonDamageMultiplier:amount;}
  returnStolenItem(e){
    if(!e.stolen)return;
    const item=e.stolen;e.stolen=null;
    // A stolen item gets its full lifetime back; reserve a slot if new drops filled the pool.
    if(this.pickups.length>=C.recovery.maxActive)this.pickups.shift();
    this.spawnRecovery(item.type,e.pos,true);this.notice='回復アイテムを取り返した！';
  }
  updateOfficeEnemy(e,dt){
    const d=ENEMIES[e.type],range=dist(e.pos,this.hero);e.left-=dt;e.shieldFlash=Math.max(0,(e.shieldFlash||0)-dt);
    if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.interval;}return;}
    if(e.state==='charge'){
      const speed=d.chargeSpeed||260;
      if(this.isBlocked(e.pos.x+e.dir.x*speed*dt,e.pos.y+e.dir.y*speed*dt,e.radius)){e.state='recover';e.left=1.1;this.events.push('stun');return;}
      const before=copy(e.pos);this.nav.move(e.pos,e.dir.x*(d.chargeSpeed||260)*dt,e.dir.y*(d.chargeSpeed||260)*dt,e.radius);this.contactHero(e,d.damage);
      if(e.left<=0||dist(before,e.pos)<.01){e.state='recover';e.left=1.1;this.events.push('stun');}return;
    }
    if(e.state==='warn'){
      if(e.left>0)return;
      if(e.type==='chair'||(e.type==='chameleon'&&e.mode==='charge')){e.state='charge';e.left=.7;return;}
      if(e.type==='returnBird'){
        if(this.enemyProjectiles.length<C.projectile.maxEnemy)this.enemyProjectiles.push({kind:'returnPaper',pos:copy(e.pos),origin:copy(e.pos),dir:copy(e.dir),life:3,radius:10,damage:d.damage,speed:155,returning:false});
      }else if(e.type==='cc'){
        e.broods=(e.broods||0)+1;
        for(let i=0;i<2&&e.broods<=3;i++)this.addSpawnWarning('bat','cc');
      }else if(e.type==='bomb'){
        e.detonated=true;
        if(range<d.areaRadius+C.radius)this.damageHero(d.damage,e.pos);
        this.enemyAreas.push({kind:'blast',pos:copy(e.pos),radius:d.areaRadius,fired:true,effect:.4,damage:0});this.killEnemy(e);return;
      }else if(e.type==='guardian'){
        if(range<d.areaRadius+C.radius&&this.clearLine(e.pos,this.hero))this.damageHero(d.damage,e.pos);
        this.enemyAreas.push({kind:'slam',pos:copy(e.pos),radius:d.areaRadius,fired:true,effect:.3,damage:0});
      }else if(e.type==='smog'){
        if(this.enemyAreas.length<C.limits.enemyAreas)this.enemyAreas.push({kind:'smogPool',pos:copy(e.pos),radius:d.areaRadius,fired:true,effect:3.5,damage:0});
      }else if(e.type==='chameleon')this.shootFan(e.pos,e.dir,3,24,'mail',d.damage);
      e.state='recover';e.left=e.type==='guardian'?1.25:.7;return;
    }
    if(e.type==='hyena'){
      if(e.stolen){e.stolenLeft-=dt;const away=norm(e.pos.x-this.hero.x,e.pos.y-this.hero.y);this.moveEnemy(e,{x:clamp(e.pos.x+away.x*90,55,this.worldWidth-55),y:clamp(e.pos.y+away.y*90,55,this.worldHeight-55)},d.speed,dt);if(e.stolenLeft<=0)this.returnStolenItem(e);return;}
      const item=this.pickups.filter(p=>!p.collected).sort((a,b)=>dist(e.pos,a.pos)-dist(e.pos,b.pos))[0];
      this.moveEnemy(e,item?.pos||this.hero,d.speed,dt);this.contactHero(e,d.damage);
      if(item&&dist(e.pos,item.pos)<22){e.stolen={type:item.type};e.stolenLeft=5;this.pickups=this.pickups.filter(p=>p!==item);this.notice='ハイエナが回復を横取り！ 倒して取り返そう';}return;
    }
    if(e.type==='guardian')e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);
    const ranged=['returnBird','cc','smog'].includes(e.type),target=ranged&&range<150?e.pos:this.hero;
    this.moveEnemy(e,target,d.speed,dt);if(!ranged)this.contactHero(e,d.damage);
    if(e.type==='bomb'&&range>110)return;
    if(e.type==='guardian'&&range>115)return;
    if(e.type==='cc'&&(e.broods||0)>=3)return;
    if(e.left<=0&&this.canEnemyAttack(e)&&!this.dangerBusy(e)){
      e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);
      if(e.type==='chameleon')e.mode=e.mode==='shot'?'charge':'shot';
      this.events.push('warn');
    }
  }
  updateSlime(e,dt){this.moveEnemy(e,this.hero,ENEMIES.slime.speed+(this.stage-1)*2,dt);this.contactHero(e,this.summonDamage(e,ENEMIES.slime.damage));}
  updateBat(e,dt){
    const d=ENEMIES.bat,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='warn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanByStage[this.stage],d.spread,'mail',this.summonDamage(e,d.damage));e.state='move';e.left=d.shootInterval-Math.max(0,this.stage-1)*.08;}return;}
    if(range<d.desired-28)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+35)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateSentry(e,dt){
    const d=ENEMIES.sentry,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='warn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.fanCount,d.spread,'drone',this.summonDamage(e,d.damage));e.state='move';e.left=d.shootInterval;}return;}
    if(range<d.desired-35)this.moveEnemy(e,{x:e.pos.x-(this.hero.x-e.pos.x),y:e.pos.y-(this.hero.y-e.pos.y)},d.speed,dt);else if(range>d.desired+40)this.moveEnemy(e,this.hero,d.speed,dt);
    if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateGhost(e,dt){
    const d=ENEMIES.ghost,damage=this.summonDamage(e,d.damage);e.left-=dt;if(e.state==='warn'){if(e.left<=0){e.state='charge';e.left=d.chargeDuration;}return;}if(e.state==='charge'){const x=e.pos.x+e.dir.x*d.chargeSpeed*dt,y=e.pos.y+e.dir.y*d.chargeSpeed*dt;if(this.isBlocked(x,y,e.radius)){e.state='recover';e.left=d.recovery;}else{e.pos.x=x;e.pos.y=y;this.contactHero(e,damage,true);}if(e.left<=0){e.state='recover';e.left=d.recovery;}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.chargeInterval;}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,damage,true);if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else{e.state='warn';e.left=d.warning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}}
  }
  updateBrute(e,dt){
    const d=ENEMIES.brute,range=dist(e.pos,this.hero);e.left-=dt;if(e.state==='areaWarn'){if(e.left<=0){if(range<=d.areaRadius)this.damageHero(d.damage,e.pos);e.state='recover';e.left=d.recovery;this.events.push('danger');}return;}if(e.state==='rangedWarn'){if(e.left<=0){this.shootFan(e.pos,e.dir,d.rangedCount,d.rangedSpread,'heavy',d.damage-3);e.state='recover';e.left=d.recovery;this.events.push('danger');}return;}if(e.state==='recover'){if(e.left<=0){e.state='move';e.left=d.areaInterval;}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage);if(e.left<=0){if(!this.canEnemyAttack(e)||this.dangerBusy(e))e.left=.35;else if(range>d.rangedDistance){e.state='rangedWarn';e.left=d.rangedWarning;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);this.events.push('warn');}else{e.state='areaWarn';e.left=d.warning;this.events.push('warn');}}
  }
  dangerBusy(except){const dangers=this.activeEnemies.filter(e=>e.id!==except.id&&(['warn','charge','fastMove','attackWarn','areaWarn','rangedWarn'].includes(e.state)));if(!this.isBoss(except)&&this.boss&&!this.boss.dead&&['attackWarn','charge','fastMove'].includes(this.boss.state)){const allowance=this.boss.rankIndex>=3?2:1;return dangers.length>=allowance;}return dangers.length>=C.danger.maxConcurrent;}
  bossTempo(e,d){const phaseBoost=(e.bossPhase-1)*C.bossAttack.phaseTempoStep,enrage=e.hp/e.maxHp<=C.bossAttack.enrageThreshold?C.bossAttack.enrageTempo:0;return Math.max(.08,d.interval*(1-phaseBoost-enrage));}
  bossWarning(e,base){return Math.max(C.bossAttack.minWarning,base*(1-e.rankIndex*C.bossAttack.rankWarningStep-(e.bossPhase-1)*C.bossAttack.phaseWarningStep));}

  updateRankBoss(e,dt){
    const d=C.rankBosses[e.rankIndex],phase=Math.min(d.phases,1+Math.floor((1-e.hp/e.maxHp)*d.phases));if(phase!==e.bossPhase){e.bossPhase=phase;e.pattern=0;e.phaseSeen=new Set();e.left=Math.min(e.left,.2);const surge=C.bossAttack.phaseReinforcements[phase-1]||0;if(surge)this.scheduleBossMinions(surge,'bossPhase');this.banner={title:`魔王${d.rank}・第${phase}形態`,detail:e.rankIndex===6?'監査レベル上昇！ 高速連続攻撃！':phase===d.phases&&d.phases===3?'玉座機械、全開！ 攻撃速度上昇！':'増援とともに攻撃速度上昇！',left:1.5};this.events.push('bossPhase');}
    e.report.time+=dt;e.weak=e.state==='recover';if(e.state==='fastMove'){this.updateFastMove(e,dt);return;}e.left-=dt;if(e.state==='phaseShift'){if(e.left<=0)e.state='chase';return;}if(e.state==='recover'){if(e.left<=0){e.state='chase';e.left=Math.max(.08,this.bossTempo(e,d)-C.bossAttack.recovery);}return;}if(e.state==='attackWarn'){if(e.left<=0)this.executeRankAttack(e);return;}if(e.state==='charge'){const x=e.pos.x+e.dir.x*(d.chargeSpeed||C.bossAttack.chargeSpeed)*dt,y=e.pos.y+e.dir.y*(d.chargeSpeed||C.bossAttack.chargeSpeed)*dt;if(this.isBlocked(x,y,e.radius)){e.state='recover';e.left=C.bossAttack.recovery+0.45;this.notice='障害物に激突！ 反撃時間！';this.events.push('stun');return;}this.nav.move(e.pos,e.dir.x*(d.chargeSpeed||C.bossAttack.chargeSpeed)*dt,e.dir.y*(d.chargeSpeed||C.bossAttack.chargeSpeed)*dt,e.radius);this.contactHero(e,d.damage);if(e.left<=0){if(e.chargesLeft>1){e.chargesLeft--;e.state='attackWarn';e.left=.56;e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);}else{e.state='recover';e.left=C.bossAttack.recovery;}}return;}
    this.moveEnemy(e,this.hero,d.speed,dt);this.contactHero(e,d.damage);if(e.left<=0){if(this.dangerBusy(e))e.left=.24;else this.startRankAttack(e);}
  }
  startRankAttack(e){const d=C.rankBosses[e.rankIndex],patterns=d.patterns[e.bossPhase-1],kind=patterns[e.pattern++%patterns.length];e.attackKind=kind;e.state='attackWarn';const base=kind==='charge'||kind==='multi'?(d.chargeWarning||C.bossAttack.warning):C.bossAttack.warning;e.left=this.bossWarning(e,base);e.dir=norm(this.hero.x-e.pos.x,this.hero.y-e.pos.y);if(['sidestep','jumpSlam','copyShift','flank','presidentRush'].includes(kind))e.moveTarget=this.findBossTarget(e,kind);e.phaseSeen.add(kind);e.report.attacks++;this.notice=`魔王${d.rank}：${{charge:'突進',summon:'増援の号令',slam:'連続ハンコ',shockwave:'衝撃波',fan:'扇状書類弾',clone:'コピー分身',sweep:'定規薙ぎ払い',multi:'連続突進',crossLaser:'交差レーザー',surround:'包囲射撃',beam:'極太レーザー',floor:'連続床攻撃',reorg:'組織再編',sidestep:'横移動から突進',jumpSlam:'予告地点へハンコジャンプ',copyShift:'分身を残す高速移動',flank:'外周へ移動して挟み撃ち',presidentRush:'高速移動から連続攻撃'}[kind]}！`;this.events.push('warn');}
  executeRankAttack(e){const d=C.rankBosses[e.rankIndex],kind=e.attackKind;e.state='recover';e.left=C.bossAttack.recovery;
    if(kind==='sidestep'){this.beginFastMove(e,'charge');return;}
    if(kind==='jumpSlam'){this.beginFastMove(e,'landingSlam');return;}
    if(kind==='copyShift'){if(this.bossMinionCount()<d.reinforcement.cap){const clone=this.createEnemy('sentry',copy(e.pos));if(clone){clone.bossClone=true;clone.bossSummon=true;e.report.reinforcements++;}}this.beginFastMove(e,'fan');return;}
    if(kind==='flank'){this.scheduleBossMinions(2,'bossSkill');this.beginFastMove(e,'crossLaser');return;}
    if(kind==='presidentRush'){this.beginFastMove(e,e.bossPhase===1?'fan':e.bossPhase===2?'beam':'sweep');return;}
    if(kind==='charge'||kind==='multi'){e.state='charge';e.left=C.bossAttack.chargeDuration;e.chargesLeft=kind==='multi'?Math.min(d.multiCount||3,e.bossPhase+1):1;if(kind==='multi')e.report.fastMoves++;return;}
    if(kind==='summon')this.scheduleBossMinions(d.summonCount||4,'bossSkill');
    else if(kind==='slam'){for(let i=0;i<d.slamCount;i++)this.enemyAreas.push({kind:'slam',pos:i===0?copy(this.hero):{x:clamp(this.hero.x+(i%2?90:-90),60,this.worldWidth-60),y:clamp(this.hero.y-60+i*60,60,this.worldHeight-60)},radius:d.areaRadius,left:.45+i*.48,order:i+1,damage:d.damage,fired:false,effect:0});e.left=2.1;}
    else if(kind==='shockwave'){for(let i=0;i<10;i++){const v=rotate({x:1,y:0},i*36);this.enemyProjectiles.push({kind:'boss',pos:copy(e.pos),dir:v,life:4,radius:10,damage:d.damage,speed:C.bossAttack.shockwaveSpeed});}}
    else if(kind==='fan')this.shootFan(e.pos,e.dir,d.fanCount,d.fanSpread,'boss',d.damage-3);
    else if(kind==='clone'){for(let i=0;i<d.cloneCount;i++){const c=this.createEnemy('sentry',{x:e.pos.x+(i?70:-70),y:e.pos.y+35});if(c)c.bossClone=true;}}
    else if(kind==='sweep'){const radius=d.sweepRadius||125;if(dist(e.pos,this.hero)<=radius+C.radius)this.damageHero(d.damage,e.pos);this.enemyAreas.push({kind:'sweep',pos:copy(e.pos),radius,left:0,order:'薙',damage:d.damage,fired:true,effect:.32});}
    else if(kind==='crossLaser'){this.fireBossLaser(e,e.dir,d.damage);this.fireBossLaser(e,{x:-e.dir.y,y:e.dir.x},d.damage);}
    else if(kind==='surround'){for(let i=0;i<8;i++){const a=i*Math.PI/4,p={x:this.hero.x+Math.cos(a)*185,y:this.hero.y+Math.sin(a)*185},v=norm(this.hero.x-p.x,this.hero.y-p.y);this.enemyProjectiles.push({kind:'boss',pos:p,dir:v,life:3,radius:10,damage:d.damage-3,speed:C.projectile.bossSpeed});}}
    else if(kind==='beam')this.fireBossLaser(e,e.dir,d.damage,C.bossAttack.beamWidth*(e.bossPhase===3?1.35:1));
    else if(kind==='floor'){for(let i=0;i<d.floorCount;i++){const a=i*Math.PI*2/d.floorCount,p={x:clamp(this.hero.x+Math.cos(a)*95,60,this.worldWidth-60),y:clamp(this.hero.y+Math.sin(a)*95,60,this.worldHeight-60)};this.enemyAreas.push({kind:'bossFloor',pos:p,radius:d.areaRadius,left:.5+i*.34,order:i+1,damage:d.damage,fired:false,effect:0});}e.left=3;}
    else if(kind==='reorg'){this.reorganizeOffice();e.left=C.bossAttack.recovery+1;}
  }
  fireBossLaser(e,dir,damage,width=C.bossAttack.beamWidth){const end={x:e.pos.x+dir.x*C.bossAttack.beamRange,y:e.pos.y+dir.y*C.bossAttack.beamRange};this.enemyAreas.push({kind:'laser',pos:copy(e.pos),end,radius:width/2,left:0,order:'LASER',damage,fired:true,effect:.34});if(this.pointLineDistance(this.hero,e.pos,end)<=width/2+C.radius)this.damageHero(damage,e.pos);}

  pointLineDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return dist(p,{x:a.x+dx*t,y:a.y+dy*t});}
  clearStrikeLine(from,enemy){const toward=norm(enemy.pos.x-from.x,enemy.pos.y-from.y),visible={x:enemy.pos.x-toward.x*Math.max(2,enemy.radius-2),y:enemy.pos.y-toward.y*Math.max(2,enemy.radius-2)};return this.clearLine(from,visible);}
  findSafePosition(p,radius=C.radius,avoidHero=0){
    const fit=q=>({x:clamp(q.x,radius+42,this.worldWidth-radius-42),y:clamp(q.y,radius+42,this.worldHeight-radius-42)}),candidates=[fit(p)];for(const r of [32,64,96,128,176])for(let i=0;i<12;i++)candidates.push(fit({x:p.x+Math.cos(i*Math.PI/6)*r,y:p.y+Math.sin(i*Math.PI/6)*r}));return candidates.find(q=>!this.isBlocked(q.x,q.y,radius)&&(!avoidHero||dist(q,this.hero)>=avoidHero))||center(this.stageConfig.start);
  }
  nearestFree(p,radius=C.radius){return this.findSafePosition(p,radius,0);}
  reorganizeOffice(){
    if(!this.stageConfig.altDesks)return;this.layoutIndex=this.layoutIndex?0:1;this.solids=makeSolids(this.stage,this.layoutIndex);this.nav=navigation(this.solids,this.worldWidth,this.worldHeight);
    this.hero=Object.assign(this.hero,this.findSafePosition(this.hero,C.radius));for(const e of this.activeEnemies)Object.assign(e.pos,this.findSafePosition(e.pos,e.radius,e===this.boss?80:22));for(const p of this.pickups)Object.assign(p.pos,this.findSafePosition(p.pos,12,25));
    this.banner={title:'組織再編！',detail:'机が動いた。全員を安全な通路へ移動',left:1.4};this.notice='机の配置変更！ 赤い予告を確認';this.events.push('reorg');
  }
  updateEnemyAreas(dt){for(const a of this.enemyAreas){if(a.kind==='smogPool'&&dist(a.pos,this.hero)<a.radius+C.radius)this.hero.slowLeft=Math.max(this.hero.slowLeft,.15);if(!a.fired){a.left-=dt;if(a.left<=0){a.fired=true;a.effect=.32;if(dist(a.pos,this.hero)<=a.radius)this.damageHero(a.damage,a.pos);this.events.push('danger');}}else a.effect-=dt;}this.enemyAreas=this.enemyAreas.filter(a=>!a.fired||a.effect>0);}

  contactHero(e,damage,slow=false){const d=ENEMIES[e.type];if(e.contactLeft>0||dist(e.pos,this.hero)>=e.radius+C.radius)return;e.contactLeft=this.isBoss(e)?0.6:(d?.contactCooldown||.75);if(this.damageHero(damage,e.pos)&&slow)this.hero.slowLeft=C.hero.slowDuration;}
  damageHero(amount,source,cause='enemy'){const h=this.hero;if(h.invulnerable>0)return false;if(this.ultimateChoice==='rush'&&this.ultimateEffectLeft>0)amount*=C.ultimate.rush.damageReduction;amount=Math.round(amount*10)/10;h.energy=Math.max(0,h.energy-amount);h.invulnerable=this.boss&&!this.boss.dead?C.hero.bossHitInvulnerability:C.hero.hitInvulnerability;h.hurtFlash=.25;this.hitsTaken++;this.telemetry.damageByStage[this.stage-1]+=amount;this.telemetry.minEnergy=Math.min(this.telemetry.minEnergy,h.energy);this.shake=C.screenShake?0.12:0;const d=norm(h.x-source.x,h.y-source.y);this.nav.move(h,d.x*16,d.y*16);this.events.push(h.energy<=C.hero.energy*.25?'critical':h.energy<=C.hero.energy*.5?'warning':'hurt');if(h.energy<=C.hero.energy*C.recovery.emergencyThreshold&&!this.emergencyUsed.has(this.stage)){this.emergencyUsed.add(this.stage);this.spawnRecovery(this.stage>=4?'drink':'coffee',this.findSafePosition({x:h.x+70,y:h.y-45},12,35),true);this.notice='緊急補給が近くに出現！';}if(h.energy===0){this.telemetry.defeatedBy=cause;this.finish('energy');}return true;}
  damageEnemy(e,amount,dir,knock=0){
    if(e.dead||e.state==='phaseShift')return false;if(e.type==='guardian'&&e.state!=='recover'&&dir.x*e.dir.x+dir.y*e.dir.y<-.35){amount*=.3;e.shieldFlash=.15;}let floor=0;if(e.type==='rankBoss'){const d=C.rankBosses[e.rankIndex],required=new Set(d.patterns[e.bossPhase-1]);amount*=e.weak?C.bossAttack.weakMultiplier:C.bossAttack.armorMultiplier;if(e.bossPhase<d.phases&&[...required].some(kind=>!e.phaseSeen.has(kind)))floor=d.hp*(1-e.bossPhase/d.phases)+.01;}
    e.hp=Math.max(floor,e.hp-amount);e.flash=.11;this.shake=C.screenShake?0.055:0;this.events.push('hit');if(knock&&!this.isBoss(e)){const resistance=e.type==='brute'?ENEMIES.brute.knockResistance:1;this.nav.move(e.pos,dir.x*knock*resistance,dir.y*knock*resistance,e.radius);}if(e.hp===0)this.killEnemy(e);return true;
  }
  stopBossPressure(boss=null){for(const enemy of this.enemies)if(enemy!==boss)enemy.dead=true;this.enemies=boss?[boss]:[];this.spawnQueue=[];this.spawnWarnings=[];this.enemyProjectiles=[];this.enemyAreas=[];}
  killEnemy(e){
    if(e.dead)return;e.dead=true;this.kills++;if(e.stolen){this.returnStolenItem(e);}
    if(e.type==='bomb'&&!e.detonated){e.detonated=true;this.events.push('impact');for(const other of [...this.activeEnemies])if(other!==e&&dist(e.pos,other.pos)<=ENEMIES.bomb.areaRadius)this.damageEnemy(other,65,norm(other.pos.x-e.pos.x,other.pos.y-e.pos.y),12);this.enemyAreas.push({kind:'friendlyBlast',pos:copy(e.pos),radius:ENEMIES.bomb.areaRadius,fired:true,effect:.35,damage:0});}
    if(!this.isBoss(e)){if(this.ultimateEffectLeft<=0){const gain=ENEMIES[e.type].ult*(this.selectedUltimate?.gain||1);this.ultimate=clamp(this.ultimate+gain,0,C.ultimate.max);}if(e.bossSummon)this.hero.energy=Math.min(C.hero.energy,this.hero.energy+C.bossAttack.summonEnergyDrop);this.maybeDropRecovery(e);}for(let i=0;i<(this.isBoss(e)?34:9)&&this.particles.length<C.limits.particles;i++)this.particles.push({pos:copy(e.pos),vel:{x:(this.random()-.5)*160,y:(this.random()-.5)*160},left:.65+this.random()*.5,color:this.isBoss(e)?'#f4ca62':e.bossSummon?'#9af0bd':'#f3ecda'});this.events.push(this.isBoss(e)?'bossDown':'defeat');
    if(e.type==='rankBoss'){this.stopBossPressure(e);const rank=C.rankBosses[e.rankIndex].rank;if(this.stage<6){this.pendingBossRecovery=true;this.banner={title:`魔王${rank}、撃破！`,detail:'増援撤退！ 次の階にコーヒーを用意',left:2};this.openUpgrade({kind:'stage',stage:this.stage+1},'new','boss');}else{if(e.rankIndex===6)this.secretBossDefeated=true;this.gateOpen=true;this.phase='escape';this.banner={title:e.rankIndex===6?'特命監査役、撃破！ 本当の退勤へ！':'魔王社長、撃破！',detail:'増援撤退！ 退勤ゲートへ走れ！',left:3};this.notice='画面端の矢印を追って退勤！';}}
  }
  separateEnemies(){const list=this.activeEnemies;for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],dx=b.pos.x-a.pos.x,dy=b.pos.y-a.pos.y,d=Math.hypot(dx,dy),need=(a.radius+b.radius)*.7;if(d>0&&d<need){const p=(need-d)/2,nx=dx/d,ny=dy/d;this.nav.move(a.pos,-nx*p,-ny*p,a.radius);this.nav.move(b.pos,nx*p,ny*p,b.radius);}}}
  spawnRecovery(type,pos,force=false){const data=C.recovery.items[type];if(!data||this.pickups.length>=C.recovery.maxActive||(!force&&this.hero.energy>C.hero.energy*C.recovery.highEnergyCutoff))return false;const safe=this.findSafePosition(pos,12,25);this.pickups.push({id:`recovery-${this.nextEnemyId++}`,type,pos:safe,left:C.recovery.lifetime,collected:false});return true;}
  maybeDropRecovery(e){if(this.pickups.length>=C.recovery.maxActive||this.hero.energy>C.hero.energy*C.recovery.highEnergyCutoff)return;const r=this.random(),rc=C.recovery;let type=null;if(this.stage>=5&&r<rc.lunchChance)type='lunch';else if(this.stage>=3&&r<rc.drinkChance)type='drink';else{const chance=e.type==='brute'?rc.bruteCoffeeChance:e.bossSummon?rc.bossSummonCoffeeChance:rc.normalCoffeeChance;if(r<chance)type='coffee';}if(type)this.spawnRecovery(type,e.pos);}
  updateRecovery(dt){for(const p of this.pickups){p.left-=dt;if(!p.collected&&dist(this.hero,p.pos)<C.recovery.pickupRange){p.collected=true;const before=this.hero.energy,item=C.recovery.items[p.type];this.hero.energy=Math.min(C.hero.energy,this.hero.energy+C.hero.energy*item.healRatio);const healed=Math.round(this.hero.energy-before);this.telemetry.healed+=healed;this.healFreeze=.055;this.floatingTexts.push({pos:copy(p.pos),text:`+${healed}`,left:1,color:item.color});this.notice=`${item.name}で気力 ${healed} 回復`;this.events.push('heal');}}this.pickups=this.pickups.filter(p=>!p.collected&&p.left>0);for(const f of this.floatingTexts){f.left-=dt;f.pos.y-=24*dt;}this.floatingTexts=this.floatingTexts.filter(f=>f.left>0);}
  updateEffects(dt){for(const p of this.particles){p.left-=dt;p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.vel.y+=80*dt;}this.particles=this.particles.filter(p=>p.left>0);for(const t of this.thunders)t.left-=dt;this.thunders=this.thunders.filter(t=>t.left>0);}

  checkWaveClear(dt){if(this.spawnQueue.length||this.spawnWarnings.length||this.activeEnemies.length){this.waveClearLeft=0;return;}this.waveClearLeft+=dt;if(this.waveClearLeft<C.waveCompleteDelay)return;this.clearedWaves++;
    if(this.wave===1)this.openUpgrade({kind:'wave',stage:this.stage,wave:2},'evolution');else{this.state='bossIntro';this.phase='bossIntro';this.wave=0;this.notice=`魔王${this.stageConfig.rank}接近！`;this.banner={title:'BOSS 接近',detail:`魔王${this.stageConfig.rank}`,left:1.8};}
  }
  buildOffers(type=this.upgradeType){
    if(type==='evolution'){const evolvable=SKILL_IDS.filter(id=>(id==='slash'||this.skills[id]>0)&&this.skills[id]<3);const result=shuffled(evolvable,this.random).slice(0,3);return result.length?result:['heal','gauge'];}
    const available=NEW_SKILL_IDS.filter(id=>this.skills[id]===0),result=[];if(this.stage===1&&available.includes('reply'))result.push('reply');result.push(...shuffled(available.filter(id=>!result.includes(id)),this.random).slice(0,3-result.length));return result.length?result:['heal','gauge'];
  }
  openUpgrade(next,type='evolution',source='wave'){this.state='upgrade';this.phase='upgrade';this.afterUpgrade=next;this.upgradeType=type;this.offers=this.buildOffers(type);this.banner=null;this.notice=source==='wave'?'ウェーブ突破！':'ボス撃破報酬！';this.events.push('upgrade');}
  chooseUpgrade(index){
    if(this.state!=='upgrade'||!this.offers[index])return false;const id=this.offers[index];if(id==='heal'){const before=this.hero.energy;this.hero.energy=Math.min(C.hero.energy,this.hero.energy+40);this.notice=`気力 ${Math.round(this.hero.energy-before)} 回復`;}else if(id==='gauge'){this.ultimate=C.ultimate.max;this.notice='必殺技ゲージ 100%';}else{if(this.skills[id]>=3)return false;this.skills[id]++;this.notice=`${C.skills[id].name} Lv.${this.skills[id]}`;}
    this.upgradeCount++;this.auto.thunder=0;this.auto.meteor=0;this.auto.drone=0;const next=this.afterUpgrade;this.resolveNext(next);return true;
  }
  resolveNext(next){
    if(next.kind==='wave')this.beginWave(next.stage,next.wave);else if(next.kind==='travel')this.startTravel(next.wave);else if(next.kind==='stage'){
      this.transitionHeal=Math.min(C.hero.energy-this.hero.energy,C.hero.energy*C.hero.stageHealRatio);this.hero.energy+=this.transitionHeal;this.loadStage(next.stage,true);this.clearCombat();if(this.pendingBossRecovery){this.spawnRecovery('coffee',{x:this.hero.x+64,y:this.hero.y-30},true);this.pendingBossRecovery=false;}this.state='stageIntro';this.phase='stageIntro';this.notice=this.pickups.length?'ボス撃破報酬のコーヒーが近くにあります':'次のフロアへ';if(this.transitionHeal>0)this.events.push('heal');
    }else{this.state='bossIntro';this.phase='bossIntro';this.wave=0;this.notice=`魔王${this.stageConfig.rank}が待っている`;}
  }
  clearCombat(){this.enemies=[];this.enemyProjectiles=[];this.heroProjectiles=[];this.attacks=[];this.followups=[];this.spawnQueue=[];this.spawnWarnings=[];this.enemyAreas=[];this.meteors=[];this.thunders=[];this.blackholes=[];this.cannon=null;this.orbitHits.clear();this.pickups=[];this.floatingTexts=[];this.boss=null;this.gateOpen=false;this.travelTarget=null;this.ultimateEffectLeft=0;this.hero.attackCd=0;}
  isBlocked(x,y,r=C.radius){return blocked(x,y,r,this.solids);}
  clearLine(a,b){return clearLine(a,b,this.solids);}
  skillSummary(){return SKILL_IDS.filter(id=>id==='slash'||this.skills[id]>0).map(id=>this.skills[id]?`${C.skills[id].name} Lv.${this.skills[id]}`:`${C.skills[id].name} 初期`);}
  finish(reason){this.outcome=reason==='success'?'success':'failure';this.reason=reason;this.state=this.outcome==='success'?'ending':'result';this.phase=this.state;this.ultimateEffectLeft=0;this.hero.attackCd=0;if(this.outcome==='failure'){this.stopBossPressure();this.boss=null;this.pickups=[];this.telemetry.defeatedBy||=reason;}this.events.push(this.outcome);}
  completeEnding(){if(this.state!=='ending')return false;this.state='result';this.phase='result';return true;}
}
