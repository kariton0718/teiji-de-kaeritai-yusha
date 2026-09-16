// Host-authoritative, fixed-step two-player prototype. Independent of the solo save/state.
import {CONFIG as C,ENEMIES,makeSolids} from '../config.js';
import {navigation} from '../pathfinding.js';
export const COOP_VERSION=1;
export const COOP_RULES={step:1/30,time:240,maxEnemies:38,maxShots:90,reviveSeconds:3,reviveRadius:54,inputTimeout:.4};
export const COOP_SKILLS={slash:'タスク斬り強化',reply:'一斉返信',orbit:'書類シュレッダー'};
export const COOP_ULTIMATES=['exit','clones','rush','blackhole','cannon'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:-1};};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function safeInput(value){return {x:Number.isFinite(value?.x)?clamp(value.x,-1,1):0,y:Number.isFinite(value?.y)?clamp(value.y,-1,1):0,ultimate:value?.ultimate===true};}
export class CoopGame{
 constructor(ultimates=['exit','blackhole'],random=Math.random){
  this.random=random;this.nav=navigation(makeSolids(1));this.solids=makeSolids(1);this.state='playing';this.phase='wave';this.wave=1;this.elapsed=0;this.remaining=COOP_RULES.time;this.kills=0;this.id=0;this.tickId=0;this.accumulator=0;this.spawnLeft=.4;this.queue=[];this.enemies=[];this.shots=[];this.areas=[];this.effects=[];this.pickups=[];this.choice=[null,null];this.reason='';this.boss=null;this.banner='2人で定時退勤！';this.bannerLeft=3;
  this.players=ultimates.map((ult,i)=>({id:i,x:200+i*70,y:540,hp:100,down:false,revive:0,invulnerable:1,cd:0,facing:{x:0,y:-1},gauge:35,ultimate:COOP_ULTIMATES.includes(ult)?ult:'exit',effect:0,lock:0,ultTick:0,slow:0,skills:{slash:0,reply:0,orbit:0},orbitCd:0,input:{x:0,y:0,ultimate:false},inputAge:0}));
  this.buildWave(1);
 }
 setInput(id,value){const p=this.players[id];if(!p)return;const input=safeInput(value);p.input={...input,ultimate:p.input.ultimate||input.ultimate};p.inputAge=0;}
 buildWave(wave){this.wave=wave;this.phase='wave';this.queue=wave===1?Array.from({length:28},(_,i)=>i%7===6?'bat':'slime'):Array.from({length:40},(_,i)=>i%10===9?'brute':i%5===4?'ghost':i%4===3?'bat':'slime');this.spawnLeft=.4;}
 choose(id,skill){if(this.state!=='upgrade'||!COOP_SKILLS[skill]||this.choice[id]!==null)return false;this.choice[id]=skill;this.players[id].skills[skill]++;if(this.choice.every(Boolean)){this.choice=[null,null];this.state='playing';for(const p of this.players){p.input={x:0,y:0,ultimate:false};p.inputAge=1;p.hp=Math.min(100,p.hp+20);}if(this.wave===1)this.buildWave(2);else this.spawnBoss();}return true;}
 update(delta){if(!Number.isFinite(delta)||delta<=0)return;this.accumulator+=Math.min(delta,.1);while(this.accumulator>=COOP_RULES.step){this.accumulator-=COOP_RULES.step;if(this.state==='playing')this.step(COOP_RULES.step);}}
 step(dt){
  this.tickId++;this.elapsed+=dt;this.remaining=Math.max(0,COOP_RULES.time-this.elapsed);if(!this.remaining){this.end('failure','時間切れ');return;}
  this.bannerLeft=Math.max(0,this.bannerLeft-dt);
  for(const p of this.players){p.inputAge+=dt;const input=p.inputAge>COOP_RULES.inputTimeout?{x:0,y:0}:p.input;p.cd=Math.max(0,p.cd-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.lock=Math.max(0,p.lock-dt);p.effect=Math.max(0,p.effect-dt);p.slow=Math.max(0,p.slow-dt);p.orbitCd-=dt;p.ultTick-=dt;if(p.down){p.input.ultimate=false;continue;}
   if(input.x||input.y){p.facing=norm(input.x,input.y);const speed=170*(p.ultimate==='cannon'&&p.effect>0?.55:1)*(p.slow>0?.55:1);this.nav.move(p,p.facing.x*speed*dt,p.facing.y*speed*dt,12);p.x=clamp(p.x,52,428);p.y=clamp(p.y,52,588);}
   if(input.ultimate)this.useUltimate(p);p.input.ultimate=false;
   if(this.phase!=='escape'){if(p.cd<=0)this.swing(p);this.ongoingUltimate(p);if(p.skills.orbit&&p.orbitCd<=0){p.orbitCd=.45;for(const e of this.enemies)if(distance(p,e)<64&&this.nav.clearLine(p,e,2))this.hit(e,10+6*p.skills.orbit,p);}}
  }
  if(this.phase==='wave'&&this.queue.length){this.spawnLeft-=dt;if(this.spawnLeft<=0&&this.enemies.length<COOP_RULES.maxEnemies){this.spawn(this.queue.shift());this.spawnLeft=.32;}}
  this.updateEnemies(dt);this.updateShots(dt);this.updateAreas(dt);this.revive(dt);
  for(const item of this.pickups){item.left-=dt;const p=this.players.filter(p=>!p.down&&p.hp<100&&distance(p,item)<27).sort((a,b)=>a.hp-b.hp)[0];if(p){p.hp=Math.min(100,p.hp+25);item.left=0;this.effect('heal',p,35,.5);}}
  this.pickups=this.pickups.filter(p=>p.left>0);for(const e of this.effects)e.left-=dt;this.effects=this.effects.filter(e=>e.left>0).slice(-65);
  this.enemies=this.enemies.filter(e=>e.hp>0);
  if(this.players.every(p=>p.down)){this.end('failure','2人とも気力が尽きた');return;}
  if(this.phase==='wave'&&!this.queue.length&&!this.enemies.length){this.state='upgrade';this.choice=[null,null];this.shots=[];this.areas=[];for(const p of this.players){p.input={x:0,y:0,ultimate:false};if(p.down){p.down=false;p.hp=35;p.revive=0;}}}
  if(this.phase==='escape'&&this.players.every(p=>!p.down&&distance(p,{x:420,y:60})<42))this.end('success','2人で定時退勤！');
 }
 spawn(type,pos){if(this.enemies.filter(e=>e.hp>0).length>=COOP_RULES.maxEnemies)return;let spot=pos;const points=[{x:76,y:76},{x:404,y:76},{x:76,y:300},{x:404,y:300},{x:220,y:76}];if(!spot){const candidates=points.filter(s=>this.players.every(p=>p.down||distance(p,s)>110));spot=(candidates.length?candidates:points)[Math.floor(this.random()*(candidates.length||points.length))];}const d=ENEMIES[type];const e={id:++this.id,type,x:spot.x,y:spot.y,hp:d.hp,maxHp:d.hp,radius:d.radius,speed:d.speed,state:'spawn',left:.8,dir:{x:0,y:1},path:[],repath:0,contact:0,cd:1.4,flash:0};this.enemies.push(e);return e;}
 spawnBoss(){this.phase='boss';this.banner='魔王リーダーを2人で倒せ！';this.bannerLeft=3;const e={id:++this.id,type:'boss',x:220,y:100,hp:1100,maxHp:1100,radius:25,speed:65,state:'spawn',left:1.5,dir:{x:0,y:1},path:[],repath:0,contact:0,cd:1.4,flash:0,pattern:0,phase:1,summon:5};this.boss=e;this.enemies.push(e);}
 target(e){return this.players.filter(p=>!p.down).sort((a,b)=>distance(e,a)-distance(e,b))[0];}
 moveEnemy(e,target,dt){if(this.nav.clearLine(e,target,e.radius)){const d=norm(target.x-e.x,target.y-e.y);this.nav.move(e,d.x*e.speed*dt,d.y*e.speed*dt,e.radius);}else{e.repath-=dt;if(e.repath<=0){e.path=this.nav.findPath(e,target);e.repath=.4;}while(e.path.length&&distance(e,e.path[0])<12)e.path.shift();if(e.path[0]){const d=norm(e.path[0].x-e.x,e.path[0].y-e.y);this.nav.move(e,d.x*e.speed*dt,d.y*e.speed*dt,e.radius);}}}
 updateEnemies(dt){for(const e of this.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.contact-=dt;e.left-=dt;const target=this.target(e);if(!target)continue;
   if(e.state==='spawn'){if(e.left<=0)e.state='move';continue;}
   if(e.type==='boss'&&e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.state='recover';e.left=1.2;e.cd=.8;this.banner='リーダー本気モード！';this.bannerLeft=2;}
   if(e.type==='boss'){e.summon-=dt;if(e.summon<=0){e.summon=7;for(let i=0;i<4;i++)this.spawn(i===3?'bat':'slime');}}
   if(e.state==='warn'){if(e.left<=0){if(e.attack==='charge'){e.state='charge';e.left=.6;}else{e.state='recover';e.left=.65;if(e.attack==='fan')this.fan(e,5,e.type==='boss'?20:15);else this.areas.push({x:e.x,y:e.y,radius:e.type==='boss'?105:76,left:0,fired:false,damage:e.type==='boss'?26:22});}}continue;}
   if(e.state==='charge'){const before={x:e.x,y:e.y};this.nav.move(e,e.dir.x*280*dt,e.dir.y*280*dt,e.radius);if(e.left<=0||distance(e,before)<1){e.state='recover';e.left=.9;}for(const p of this.players)if(distance(e,p)<e.radius+12)this.hurt(p,e.type==='boss'?26:20);continue;}
   if(e.state==='recover'){if(e.left<=0)e.state='move';continue;}
   e.cd-=dt;if(e.type!=='slime'&&e.cd<=0){e.cd=e.type==='boss'?(e.phase===2?1.1:1.6):2.8;e.state='warn';e.left=e.type==='boss'?.85:.9;e.dir=norm(target.x-e.x,target.y-e.y);e.attack=e.type==='bat'?'fan':e.type==='ghost'?'charge':e.type==='brute'?'area':['charge','fan','area'][e.pattern++%3];continue;}
   if(e.type!=='bat'||distance(e,target)>165)this.moveEnemy(e,target,dt);for(const p of this.players)if(!p.down&&distance(e,p)<e.radius+12&&e.contact<=0){this.hurt(p,e.type==='boss'?24:ENEMIES[e.type].damage);e.contact=.7;}
  }}
 fan(e,count,damage){for(let i=0;i<count;i++){const a=Math.atan2(e.dir.y,e.dir.x)+(i-(count-1)/2)*.22;this.addShot({x:e.x,y:e.y,dx:Math.cos(a),dy:Math.sin(a),speed:145,life:3,damage,owner:-1,pierce:1,hits:[],radius:8});}}
 addShot(shot){if(this.shots.length<COOP_RULES.maxShots)this.shots.push(shot);}
 swing(p){const targets=this.enemies.filter(e=>e.hp>0&&e.state!=='spawn'&&distance(p,e)<180&&this.nav.clearLine(p,e,2)).sort((a,b)=>distance(p,a)-distance(p,b));if(targets[0])p.facing=norm(targets[0].x-p.x,targets[0].y-p.y);const rush=p.ultimate==='rush'&&p.effect>0,range=rush?120:78+p.skills.slash*15;const damage=26+p.skills.slash*8;p.cd=rush?.18:.38;this.effect('slash',p,range,.16,Math.atan2(p.facing.y,p.facing.x));for(const e of this.enemies){const d=norm(e.x-p.x,e.y-p.y);if(distance(p,e)<range+e.radius&&(rush||d.x*p.facing.x+d.y*p.facing.y>-.1)&&this.nav.clearLine(p,e,2))this.hit(e,damage,p);}
   const origins=[p];if(p.ultimate==='clones'&&p.effect>0){origins.push({x:p.x-26,y:p.y},{x:p.x+26,y:p.y});for(const e of this.enemies)if(e.hp>0&&distance(p,e)<range+e.radius&&this.nav.clearLine(p,e,2))this.hit(e,damage,p);}
   if(p.skills.reply)for(const origin of origins)for(const offset of (p.skills.reply>1?[-.18,0,.18]:[0])){const a=Math.atan2(p.facing.y,p.facing.x)+offset;this.addShot({x:origin.x,y:origin.y,dx:Math.cos(a),dy:Math.sin(a),speed:330,life:1.2,damage:16,owner:p.id,pierce:3,hits:[],radius:8});}
 }
 useUltimate(p){if(p.down||p.gauge<100||p.lock>0)return false;p.gauge=0;p.effect=C.ultimate[p.ultimate].duration;p.lock=p.effect+2;p.ultTick=0;p.invulnerable=Math.max(p.invulnerable,.7);this.effect('ultimate',p,220,.65);if(p.ultimate==='exit'){for(const e of this.enemies)this.hit(e,e.type==='boss'?80:100,p);this.shots=this.shots.filter(s=>s.owner>=0);}return true;}
 ongoingUltimate(p){if(p.effect<=0||p.ultTick>0)return;p.ultTick=.23;if(p.ultimate==='blackhole'){const center={x:clamp(p.x+p.facing.x*90,55,425),y:clamp(p.y+p.facing.y*90,55,585)};this.effect('blackhole',center,135,.25);for(const e of this.enemies)if(e.hp>0&&distance(e,center)<145&&this.nav.clearLine(center,e,2)){if(e.type!=='boss'&&e.type!=='brute'){const d=norm(center.x-e.x,center.y-e.y);this.nav.move(e,d.x*18,d.y*18,e.radius);}this.hit(e,p.effect<.25?52:12,p);}}
  if(p.ultimate==='cannon'){const dir=p.facing;this.effect('beam',p,380,.24,Math.atan2(dir.y,dir.x));for(const e of this.enemies){const x=e.x-p.x,y=e.y-p.y,along=x*dir.x+y*dir.y,cross=Math.abs(x*dir.y-y*dir.x);if(along>=0&&along<380&&cross<35+e.radius&&this.nav.clearLine(p,e,2))this.hit(e,e.type==='boss'?18:26,p);}this.shots=this.shots.filter(s=>s.owner>=0||Math.abs((s.x-p.x)*dir.y-(s.y-p.y)*dir.x)>35);}}
 hit(e,damage,p){if(e.hp<=0||e.state==='spawn')return;e.hp=Math.max(0,e.hp-damage);e.flash=.12;if(e.hp>0)return;this.kills++;if(p.lock<=0)p.gauge=Math.min(100,p.gauge+(e.type==='boss'?0:12)*C.ultimate[p.ultimate].gain);if(e.type==='boss'){this.phase='escape';this.queue=[];for(const other of this.enemies)other.hp=0;this.shots=[];this.areas=[];this.banner='2人そろって右上の退勤ゲートへ！';this.bannerLeft=99;}else if(this.pickups.length<4&&this.random()<.16)this.pickups.push({x:e.x,y:e.y,left:15});}
 hurt(p,damage){if(p.down||p.invulnerable>0)return false;if(p.ultimate==='rush'&&p.effect>0)damage*=.5;p.hp=Math.max(0,p.hp-damage);p.invulnerable=1.2;this.effect('hurt',p,24,.25);if(!p.hp){p.down=true;p.effect=0;p.revive=0;p.input={x:0,y:0,ultimate:false};}return true;}
 updateShots(dt){for(const s of this.shots){s.life-=dt;s.x+=s.dx*s.speed*dt;s.y+=s.dy*s.speed*dt;if(this.phase==='escape'){s.life=0;continue;}if(s.life<=0||s.x<40||s.x>440||s.y<40||s.y>600||!this.nav.clearLine(s,s,s.radius)){s.life=0;continue;}if(s.owner<0){for(const p of this.players)if(!p.down&&distance(s,p)<s.radius+12){this.hurt(p,s.damage);s.life=0;break;}}else{const p=this.players[s.owner];for(const e of this.enemies)if(e.hp>0&&!s.hits.includes(e.id)&&distance(s,e)<s.radius+e.radius){s.hits.push(e.id);this.hit(e,s.damage,p);if(s.hits.length>=s.pierce){s.life=0;break;}}}}this.shots=this.shots.filter(s=>s.life>0);}
 updateAreas(dt){for(const a of this.areas){a.left-=dt;if(!a.fired&&a.left<=0){a.fired=true;a.left=.3;for(const p of this.players)if(distance(p,a)<a.radius+12)this.hurt(p,a.damage);}}this.areas=this.areas.filter(a=>!a.fired||a.left>0).slice(-16);}
 revive(dt){for(const p of this.players){if(!p.down)continue;const ally=this.players[1-p.id];if(!ally.down&&distance(ally,p)<=COOP_RULES.reviveRadius&&this.nav.clearLine(ally,p,2)){p.revive+=dt;if(p.revive>=COOP_RULES.reviveSeconds){p.down=false;p.hp=40;p.invulnerable=2;p.revive=0;this.effect('heal',p,50,.7);}}else p.revive=0;}}
 effect(kind,p,radius,left,angle=0){this.effects.push({kind,x:p.x,y:p.y,radius,left,angle,owner:p.id??0});}
 end(state,reason){this.state=state;this.reason=reason;this.shots=[];this.areas=[];}
 snapshot(){return {v:COOP_VERSION,tick:this.tickId,state:this.state,phase:this.phase,wave:this.wave,remaining:this.remaining,kills:this.kills,reason:this.reason,banner:this.bannerLeft>0?this.banner:'',choice:[...this.choice],players:this.players.map(({input,inputAge,...p})=>structuredClone(p)),enemies:this.enemies.map(({path,repath,...e})=>({...e})),shots:this.shots.map(({hits,...s})=>({...s})),areas:this.areas.map(a=>({...a})),effects:this.effects.map(e=>({...e})),pickups:this.pickups.map(p=>({...p}))};}
}
