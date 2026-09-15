// Six-rank Action RPG balance. Distances are logical pixels, times are seconds.
export const CONFIG=Object.freeze({
  width:480,height:640,tile:40,radius:12,timeLimit:540,startMinute:1065,deadlineMinute:1080,maxDelta:.1,step:1/120,
  hero:{energy:100,speed:170,hitInvulnerability:1.2,slowDuration:.5,slowMultiplier:.68,stageHealRatio:.3},
  attack:{damage:24,cooldown:.35,duration:.18,knockback:24,followDamage:14,followDelay:.13,maxVisuals:42,ranges:[64,88,100,112],arcs:[100,145,165,190],fullCircleEvery:4,fullCircleDamage:22,fullCircleRange:146},
  ultimate:{max:100,invulnerability:.7,
    exit:{name:'本日は退勤します',mobDamage:90,bossDamage:45,duration:.85,gain:1},
    clones:{name:'分身出勤',duration:8,count:2,damageMultiplier:.5,gain:.92,offset:28},
    rush:{name:'定時ラッシュ',duration:6,damageReduction:.5,minCooldown:.16,gain:.88,range:112,damage:24},
    blackhole:{name:'残業ブラックホール',duration:4,range:145,pullSpeed:92,tick:.28,damage:9,blastDamage:52,radius:54,gain:.9},
    cannon:{name:'稟議キャノン',duration:2.8,range:430,width:68,tick:.22,mobDamage:18,bossDamage:13,moveMultiplier:.48,gain:.85}},
  coffee:{heal:22,pickupRange:24},reply:{damage:14,speed:330,life:1.7,angles:[[],[0],[-18,0,18],[-32,-16,0,16,32]],pierce:[0,1,1,4],radius:10,max:52},
  shredder:{damage:10,blades:[0,1,3,4],radius:[0,48,58,72],hitInterval:.42,size:11},thunder:{damage:20,interval:[0,2.3,2,1.55],bolts:[0,1,1,2],chains:[0,1,2,4],range:210,chainRange:125,effect:.28,maxEffects:24},
  meteor:{damage:34,interval:[0,4.2,3.7,3.1],count:[0,1,1,3],radius:[0,48,70,78],warning:1.05,effect:.45,max:10},boomerang:{damage:[0,16,20,24],speed:255,range:[0,170,210,250],radius:[0,10,13,16],cooldown:[0,1.4,1.15,.9],max:10},
  drone:{damage:[0,10,12,15],count:[0,1,2,2],interval:[0,1.15,.9,.62],range:220,shotSpeed:310,radius:7,maxShots:24},projectile:{enemySpeed:132,bossSpeed:152,enemyDamage:8,enemyLife:4,maxEnemy:60,maxWorldRange:580},
  limits:{enemies:64,particles:220,enemyAreas:20},spawnWarning:.68,waveCompleteDelay:.5,groupGap:.12,
  enemies:{slime:{name:'書類束スライム',hp:40,speed:76,damage:9,radius:14,contactCooldown:.82,ult:8},bat:{name:'封筒バット',hp:30,speed:64,damage:8,radius:13,desired:150,shootInterval:2.7,warning:.8,fanByStage:[1,1,2,3,3,4,5],spread:18,ult:10},ghost:{name:'電話ゴースト',hp:50,speed:48,damage:10,radius:15,chargeInterval:3.2,warning:1,chargeSpeed:240,chargeDuration:.58,recovery:.85,ult:12},brute:{name:'締切オーガ',hp:140,speed:41,damage:14,radius:22,areaInterval:2.9,warning:1.25,areaRadius:70,recovery:.8,rangedDistance:150,rangedCount:3,rangedSpread:23,rangedWarning:1,knockResistance:.25,ult:18},sentry:{name:'監視ドローン',hp:58,speed:56,damage:9,radius:15,desired:185,shootInterval:2.25,warning:.9,fanCount:3,spread:25,ult:12}},
  danger:{maxConcurrent:3,activeMargin:80},
  rankBosses:[
    {rank:'リーダー',prop:'megaphone',hp:360,radius:25,speed:67,damage:12,interval:2.45,phases:1,patterns:[['charge','summon']],chargeWarning:1.15,summonCount:4},
    {rank:'係長',prop:'stamp',hp:480,radius:27,speed:58,damage:13,interval:2.2,phases:1,patterns:[['slam','shockwave']],slamCount:3,areaRadius:58},
    {rank:'課長',prop:'copier',hp:600,radius:28,speed:56,damage:14,interval:2.0,phases:2,patterns:[['fan','clone'],['fan','clone','fan']],fanCount:5,fanSpread:22,cloneCount:2},
    {rank:'部長',prop:'ruler',hp:760,radius:30,speed:64,damage:15,interval:1.85,phases:2,patterns:[['sweep','charge'],['multi','sweep','charge']],sweepRadius:125,multiCount:3,chargeWarning:1.1},
    {rank:'専務',prop:'drones',hp:900,radius:31,speed:52,damage:16,interval:1.65,phases:2,patterns:[['crossLaser','surround'],['surround','crossLaser','summon']],summonCount:4},
    {rank:'社長',prop:'throne',hp:1200,radius:35,speed:48,damage:17,interval:1.45,phases:3,patterns:[['beam','fan'],['fan','floor','beam'],['beam','floor','fan','floor']],fanCount:7,fanSpread:18,floorCount:7,areaRadius:66}
  ],
  bossAttack:{warning:1.15,recovery:.72,chargeSpeed:280,chargeDuration:.7,beamWidth:64,beamRange:650,shockwaveSpeed:150,armorMultiplier:.72,weakMultiplier:1,summonCap:8},
  skills:{slash:{name:'タスク斬り',levels:['初期：射程64px・角度100°','射程88px・角度145°','二連斬撃を追加','4回ごとに全周斬撃']},reply:{name:'一斉返信',levels:['未取得','衝撃波を1方向へ発射','衝撃波を3方向へ発射','5方向・各4体まで貫通']},shredder:{name:'書類シュレッダー',levels:['未取得','周囲を回る書類刃×1','書類刃×3','刃×4・回転半径拡大']},thunder:{name:'承認サンダー',levels:['未取得','近い敵へ自動落雷','別の敵へ2連鎖','2本発動・最大4連鎖']},meteor:{name:'締切メテオ',levels:['未取得','敵の密集地点へ落下','着弾範囲拡大','3地点へ同時落下']},boomerang:{name:'差し戻しブーメラン',levels:['未取得','往路と復路で各1回命中','大型化・射程延長','威力・射程・発射頻度上昇']},drone:{name:'自動処理ドローン',levels:['未取得','追従ドローン1機が射撃','2機へ増加','2機が高速射撃']}},
  stages:[
    {id:1,name:'新人研修フロア',rank:'リーダー',rule:'小隊長の号令をかわし、基本の反撃を覚えよう。',size:[480,640],start:[5,13],gate:[10,1],desks:[{from:2,to:4,row:5},{from:7,to:9,row:5},{from:2,to:3,row:10},{from:8,to:9,row:10}],waves:[[{type:'slime',count:6}],[{type:'slime',count:8},{type:'bat',count:2}]]},
    {id:2,name:'承認フロア',rank:'係長',rule:'順番に落ちる巨大ハンコの予告を読む。',size:[480,640],start:[5,13],gate:[10,1],desks:[{from:2,to:3,row:4},{from:7,to:9,row:4},{from:3,to:5,row:10},{from:8,to:9,row:12}],waves:[[{type:'slime',count:12},{type:'bat',count:3}],[{type:'slime',count:15},{type:'bat',count:3},{type:'ghost',count:2}]]},
    {id:3,name:'複写フロア',rank:'課長',rule:'コピー分身と扇状書類弾をまとめて処理。',size:[480,640],start:[5,13],gate:[10,1],desks:[{from:2,to:4,row:5},{from:7,to:9,row:5},{from:2,to:4,row:10},{from:7,to:9,row:10}],waves:[[{type:'slime',count:18},{type:'bat',count:4},{type:'ghost',count:2}],[{type:'slime',count:22},{type:'bat',count:5},{type:'brute',count:2}]]},
    {id:4,name:'管理職フロア',rank:'部長',rule:'定規の薙ぎ払いと連続突進を誘導せよ。',size:[720,960],start:[8,17],gate:[16,2],desks:[{from:3,to:6,row:13},{from:11,to:14,row:13},{from:6,to:11,row:8},{from:3,to:5,row:19},{from:12,to:15,row:19}],waves:[[{type:'slime',count:24},{type:'bat',count:5},{type:'ghost',count:4},{type:'brute',count:2}],[{type:'slime',count:30},{type:'bat',count:6},{type:'ghost',count:4},{type:'brute',count:3}]]},
    {id:5,name:'役員フロア',rank:'専務',rule:'監視ドローンを壊して交差レーザーの安全地帯を作る。',size:[720,960],start:[8,17],gate:[16,2],desks:[{from:3,to:6,row:13},{from:11,to:14,row:13},{from:7,to:10,row:8},{from:3,to:7,row:19},{from:11,to:15,row:19}],waves:[[{type:'slime',count:28},{type:'sentry',count:8},{type:'brute',count:3}],[{type:'slime',count:36},{type:'bat',count:6},{type:'sentry',count:8},{type:'brute',count:4}]]},
    {id:6,name:'社長決裁フロア',rank:'社長',rule:'玉座機械の極太レーザーと弾幕を突破せよ。',size:[720,960],start:[8,17],gate:[16,2],desks:[{from:3,to:6,row:13},{from:11,to:14,row:13},{from:7,to:10,row:8},{from:4,to:6,row:19},{from:12,to:14,row:19}],waves:[[{type:'slime',count:34},{type:'bat',count:7},{type:'sentry',count:8},{type:'brute',count:4}],[{type:'slime',count:42},{type:'bat',count:8},{type:'ghost',count:6},{type:'sentry',count:8},{type:'brute',count:5}]]}
  ],screenShake:true,coffeeSpot:[6,8]
});
export const SKILL_IDS=Object.keys(CONFIG.skills),NEW_SKILL_IDS=SKILL_IDS.filter(id=>id!=='slash'),ULTIMATE_IDS=['exit','clones','rush','blackhole','cannon'];
export const center=([col,row])=>({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});export const rotate=(v,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:v.x*c-v.y*s,y:v.x*s+v.y*c};};
export function makeSolids(stageId=1){const stage=CONFIG.stages[stageId-1],cols=stage.size[0]/CONFIG.tile,rows=stage.size[1]/CONFIG.tile,result=[];for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const wall=col===0||row===0||col===cols-1||row===rows-1,desk=stage.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to);if(wall||desk)result.push({x:col*CONFIG.tile,y:row*CONFIG.tile,w:CONFIG.tile,h:CONFIG.tile,wall,col,row});}return result;}export const solids=makeSolids(1);
