// Chaos Action RPG balance. Distances are logical pixels, times are seconds.
export const CONFIG=Object.freeze({
  width:480,height:640,tile:40,cols:12,rows:16,radius:12,
  timeLimit:300,startMinute:1065,deadlineMinute:1080,maxDelta:.1,step:1/120,
  hero:{energy:100,speed:170,hitInvulnerability:1.2,slowDuration:.5,slowMultiplier:.68,stageHealRatio:.3},
  attack:{damage:24,cooldown:.35,duration:.18,knockback:26,followDamage:14,followDelay:.13,maxVisuals:28,
    ranges:[104,132,138,146],arcs:[190,240,250,270],fullCircleEvery:4,fullCircleDamage:22,fullCircleRange:156},
  ultimate:{max:100,mobDamage:90,bossDamage:45,duration:.85,invulnerability:.7},coffee:{heal:22,pickupRange:24},
  reply:{damage:14,speed:330,life:1.7,angles:[[],[0],[-18,0,18],[-32,-16,0,16,32]],pierce:[0,1,1,4],radius:10,max:38},
  shredder:{damage:10,blades:[0,1,3,4],radius:[0,52,60,74],hitInterval:.42,size:11},
  thunder:{damage:20,interval:[0,2.3,2,1.55],bolts:[0,1,1,2],chains:[0,1,2,4],range:185,chainRange:125,effect:.28,maxEffects:18},
  meteor:{damage:34,interval:[0,4.2,3.7,3.1],count:[0,1,1,3],radius:[0,48,70,78],warning:1.05,effect:.45,max:8},
  projectile:{enemySpeed:132,bossSpeed:145,enemyDamage:8,enemyLife:4,maxEnemy:36},
  limits:{enemies:30,particles:180,enemyAreas:12},
  spawnWarning:.78,waveCompleteDelay:.55,groupGap:.45,
  enemies:{
    slime:{name:'タスクスライム',hp:40,speed:75,damage:9,radius:14,contactCooldown:.82,ult:10},
    bat:{name:'未読メールバット',hp:30,speed:62,damage:8,radius:13,desired:150,shootInterval:2.65,warning:.8,fanByStage:[1,1,3,5],spread:17,ult:12},
    ghost:{name:'電話ゴースト',hp:50,speed:45,damage:10,radius:15,chargeInterval:3.25,warning:1,chargeSpeed:240,chargeDuration:.58,recovery:.9,ult:14},
    brute:{name:'締切オーガ',hp:120,speed:37,damage:14,radius:21,areaInterval:3.85,warning:1.3,areaRadius:70,recovery:.85,ult:20}
  },
  danger:{maxConcurrent:1},
  boss:{name:'魔王部長',hp:720,speed:58,damage:14,radius:27,phaseAt:[1,.66,.33],intervals:[0,3.1,2.8,2.5],armorMultiplier:.6,weakMultiplier:1,
    chargeWarning:1.25,chargeSpeed:270,chargeDuration:.78,stun:1.65,meetingWarning:1.45,meetingRadius:108,meetingRecovery:1,
    fanWarning:1,fanCount:5,fanSpread:22,summonWarning:1.1,summonCount:3,
    multiCharges:3,multiWarning:1,multiDuration:.5,floorWarning:1.35,floorCount:6,floorGap:.48,floorRadius:64,floorRecovery:1.3},
  skills:{
    slash:{name:'タスク斬り',levels:['初期：正面斬撃','範囲＋24px、角度＋40°','弱い追撃を追加','4回ごとに全周斬撃']},
    reply:{name:'一斉返信',levels:['未取得','衝撃波を1方向へ発射','衝撃波を3方向へ発射','5方向・各4体まで貫通']},
    shredder:{name:'書類シュレッダー',levels:['未取得','周囲を回る書類刃×1','書類刃×3','刃×4・回転半径拡大']},
    thunder:{name:'承認サンダー',levels:['未取得','近い敵へ自動落雷','別の敵へ2連鎖','2本発動・最大4連鎖']},
    meteor:{name:'締切メテオ',levels:['未取得','敵の密集地点へ落下','着弾範囲拡大','3地点へ同時落下']}
  },
  stages:[
    {id:1,name:'営業フロア',rule:'近接敵と単発メール。攻撃強化を覚えよう。',waves:[
      [{type:'slime',count:6,stagger:.34}],
      [{type:'slime',count:6,stagger:.3},{type:'bat',count:2,stagger:.55}]
    ]},
    {id:2,name:'業務集中フロア',rule:'扇状メールと突進。広域技で包囲を崩そう。',waves:[
      [{type:'slime',count:8,stagger:.36},{type:'bat',count:4,stagger:.5}],
      [{type:'slime',count:7,stagger:.34},{type:'bat',count:5,stagger:.48},{type:'ghost',count:3,stagger:.65}]
    ]},
    {id:3,name:'役員フロア',rule:'大量の敵、弾幕、締切範囲、増援を処理せよ。',waves:[
      [{type:'slime',count:12,stagger:.28},{type:'bat',count:5,stagger:.4},{type:'ghost',count:3,stagger:.55},{type:'brute',count:2,stagger:.8}],
      [{type:'slime',count:14,stagger:.27},{type:'bat',count:6,stagger:.38},{type:'ghost',count:5,stagger:.52},{type:'brute',count:3,stagger:.75}]
    ]}
  ],
  screenShake:true,gate:[10,1],heroStart:[2,13],bossStart:[6,3],coffeeSpot:[6,8],
  desks:[{from:2,to:4,row:5},{from:7,to:9,row:5},{from:2,to:3,row:10},{from:8,to:9,row:10}],
  spawnPoints:[[2,2],[6,2],[9,2],[2,7],[5,7],[9,7],[2,12],[6,12],[9,12]]
});

export const SKILL_IDS=Object.keys(CONFIG.skills);
export const center=([col,row])=>({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});
export const rotate=(v,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:v.x*c-v.y*s,y:v.x*s+v.y*c};};
export function makeSolids(){const result=[];for(let row=0;row<CONFIG.rows;row++)for(let col=0;col<CONFIG.cols;col++){const wall=col===0||row===0||col===CONFIG.cols-1||row===CONFIG.rows-1,desk=CONFIG.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to);if(wall||desk)result.push({x:col*CONFIG.tile,y:row*CONFIG.tile,w:CONFIG.tile,h:CONFIG.tile,wall,col,row});}return result;}
export const solids=makeSolids();
