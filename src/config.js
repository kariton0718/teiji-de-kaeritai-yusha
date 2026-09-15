// Five-stage Action RPG balance. Distances are logical pixels, times are seconds.
export const CONFIG=Object.freeze({
  width:480,height:640,tile:40,radius:12,
  timeLimit:480,startMinute:1065,deadlineMinute:1080,maxDelta:.1,step:1/120,
  hero:{energy:100,speed:170,hitInvulnerability:1.2,slowDuration:.5,slowMultiplier:.68,stageHealRatio:.3},
  attack:{damage:24,cooldown:.35,duration:.18,knockback:24,followDamage:14,followDelay:.13,maxVisuals:34,
    ranges:[64,88,100,112],arcs:[100,145,165,190],fullCircleEvery:4,fullCircleDamage:22,fullCircleRange:146},
  ultimate:{max:100,invulnerability:.7,
    exit:{name:'本日は退勤します',mobDamage:90,bossDamage:45,duration:.85,gain:1},
    clones:{name:'分身出勤',duration:8,count:2,damageMultiplier:.5,gain:.92,offset:28},
    rush:{name:'定時ラッシュ',duration:6,damageReduction:.5,minCooldown:.16,gain:.88,range:112,damage:24}},
  coffee:{heal:22,pickupRange:24},
  reply:{damage:14,speed:330,life:1.7,angles:[[],[0],[-18,0,18],[-32,-16,0,16,32]],pierce:[0,1,1,4],radius:10,max:44},
  shredder:{damage:10,blades:[0,1,3,4],radius:[0,48,58,72],hitInterval:.42,size:11},
  thunder:{damage:20,interval:[0,2.3,2,1.55],bolts:[0,1,1,2],chains:[0,1,2,4],range:210,chainRange:125,effect:.28,maxEffects:20},
  meteor:{damage:34,interval:[0,4.2,3.7,3.1],count:[0,1,1,3],radius:[0,48,70,78],warning:1.05,effect:.45,max:8},
  boomerang:{damage:[0,16,20,24],speed:255,range:[0,170,210,250],radius:[0,10,13,16],cooldown:[0,1.4,1.15,.9],max:8},
  drone:{damage:[0,10,12,15],count:[0,1,2,2],interval:[0,1.15,.9,.62],range:220,shotSpeed:310,radius:7,maxShots:20},
  projectile:{enemySpeed:132,bossSpeed:145,enemyDamage:8,enemyLife:4,maxEnemy:44,maxWorldRange:620},
  limits:{enemies:34,particles:190,enemyAreas:14},spawnWarning:.78,waveCompleteDelay:.55,groupGap:.45,
  enemies:{
    slime:{name:'タスクスライム',hp:40,speed:72,damage:9,radius:14,contactCooldown:.82,ult:10},
    bat:{name:'未読メールバット',hp:30,speed:62,damage:8,radius:13,desired:150,shootInterval:2.65,warning:.8,fanByStage:[1,1,3,5,3,5],spread:17,ult:12},
    ghost:{name:'電話ゴースト',hp:50,speed:45,damage:10,radius:15,chargeInterval:3.25,warning:1,chargeSpeed:240,chargeDuration:.58,recovery:.9,ult:14},
    brute:{name:'締切オーガ',hp:140,speed:39,damage:14,radius:22,areaInterval:2.95,warning:1.3,areaRadius:70,recovery:.85,rangedDistance:150,rangedCount:3,rangedSpread:22,rangedWarning:1,knockResistance:.25,ult:22},
    sentry:{name:'監視ドローン',hp:58,speed:54,damage:9,radius:15,desired:190,shootInterval:2.25,warning:.9,fanCount:3,spread:24,ult:14}
  },
  danger:{maxConcurrent:1,activeMargin:90},
  boss:{name:'魔王部長',hp:760,speed:60,damage:14,radius:27,phaseAt:[1,.66,.33],intervals:[0,2.58,2.34,2.12],armorMultiplier:.6,weakMultiplier:1,
    chargeWarning:1.25,chargeSpeed:270,chargeDuration:.78,stun:1.55,meetingWarning:1.45,meetingRadius:108,meetingRecovery:.9,
    fanWarning:1,fanCount:5,fanSpread:22,summonWarning:1.1,summonCount:3,multiCharges:3,multiWarning:1,multiDuration:.5,
    floorWarning:1.35,floorCount:6,floorGap:.48,floorRadius:64,floorRecovery:1.15},
  president:{name:'魔王社長',hp:980,speed:54,damage:16,radius:31,phaseAt:.5,intervals:[0,2.8,2.35],armorMultiplier:.7,weakMultiplier:1,
    laserWarning:1.35,laserWidth:42,laserRange:700,laserRecovery:1.05,reorgWarning:1.1,reorgRecovery:1.25,
    summonWarning:1.1,summonCount:3,summonCap:6,weakTime:1.05},
  skills:{
    slash:{name:'タスク斬り',levels:['初期：射程64px・角度100°','射程88px・角度145°','二連斬撃を追加','4回ごとに全周斬撃']},
    reply:{name:'一斉返信',levels:['未取得','衝撃波を1方向へ発射','衝撃波を3方向へ発射','5方向・各4体まで貫通']},
    shredder:{name:'書類シュレッダー',levels:['未取得','周囲を回る書類刃×1','書類刃×3','刃×4・回転半径拡大']},
    thunder:{name:'承認サンダー',levels:['未取得','近い敵へ自動落雷','別の敵へ2連鎖','2本発動・最大4連鎖']},
    meteor:{name:'締切メテオ',levels:['未取得','敵の密集地点へ落下','着弾範囲拡大','3地点へ同時落下']},
    boomerang:{name:'差し戻しブーメラン',levels:['未取得','往路と復路で各1回命中','大型化・射程延長','威力・射程・発射頻度上昇']},
    drone:{name:'自動処理ドローン',levels:['未取得','追従ドローン1機が射撃','2機へ増加','2機が高速射撃']}
  },
  stages:[
    {id:1,name:'営業フロア',rule:'狭い斬撃を当て、進化と新技の違いを覚えよう。',size:[480,640],start:[2,13],gate:[10,1],desks:[{from:2,to:4,row:5},{from:7,to:9,row:5},{from:2,to:3,row:10},{from:8,to:9,row:10}],spawnPoints:[[2,2],[6,2],[9,2],[2,7],[5,7],[9,7],[2,12],[6,12],[9,12]],waves:[
      [{type:'slime',count:5,stagger:.38}],
      [{type:'slime',count:6,stagger:.34},{type:'bat',count:2,stagger:.58}]
    ]},
    {id:2,name:'業務集中フロア',rule:'扇状メールと予告突進。取得した技を使い分けよう。',size:[480,640],start:[2,13],gate:[10,1],desks:[{from:2,to:3,row:4},{from:6,to:9,row:4},{from:2,to:5,row:9},{from:8,to:9,row:12}],spawnPoints:[[2,2],[6,2],[9,2],[3,6],[7,6],[9,8],[2,12],[6,13],[9,13]],waves:[
      [{type:'slime',count:7,stagger:.4},{type:'bat',count:3,stagger:.58}],
      [{type:'slime',count:7,stagger:.37},{type:'bat',count:4,stagger:.54},{type:'ghost',count:3,stagger:.7}]
    ]},
    {id:3,name:'役員フロア',rule:'大型敵の近距離範囲と遠距離射撃を見切れ。',size:[480,640],start:[2,13],gate:[10,1],desks:[{from:2,to:4,row:5},{from:7,to:9,row:5},{from:2,to:3,row:10},{from:8,to:9,row:10}],spawnPoints:[[2,2],[6,2],[9,2],[2,7],[5,7],[9,7],[2,12],[6,12],[9,12]],waves:[
      [{type:'slime',count:9,stagger:.35},{type:'bat',count:4,stagger:.5},{type:'brute',count:2,stagger:.85}],
      [{type:'slime',count:10,stagger:.33},{type:'bat',count:4,stagger:.48},{type:'ghost',count:4,stagger:.62},{type:'brute',count:2,stagger:.82}]
    ],boss:'manager'},
    {id:4,name:'深夜サーバー室',rule:'広い通路を進み、指定戦闘エリアを順番に制圧せよ。',size:[960,1280],start:[2,28],gate:[21,2],arenas:[[6,21],[17,8]],desks:[{from:4,to:8,row:24},{from:14,to:19,row:24},{from:7,to:16,row:17},{from:3,to:8,row:10},{from:15,to:20,row:10},{from:11,to:12,row:5}],spawnPoints:[[4,20],[8,20],[14,20],[19,20],[5,14],[12,14],[18,14],[4,7],[10,7],[17,7],[20,4]],waves:[
      [{type:'bat',count:5,stagger:.52},{type:'sentry',count:4,stagger:.65},{type:'brute',count:2,stagger:.9}],
      [{type:'slime',count:8,stagger:.38},{type:'bat',count:5,stagger:.5},{type:'sentry',count:5,stagger:.62},{type:'brute',count:2,stagger:.88}]
    ]},
    {id:5,name:'社長室前エリア',rule:'最終区画。地形が変わる戦場で魔王社長へ挑め。',size:[960,1280],start:[2,28],gate:[21,2],arenas:[[6,21],[17,9]],desks:[{from:3,to:8,row:24},{from:15,to:20,row:24},{from:10,to:13,row:20},{from:4,to:7,row:14},{from:16,to:19,row:14},{from:9,to:14,row:7}],reorgLayouts:[
      [{from:3,to:8,row:24},{from:15,to:20,row:24},{from:10,to:13,row:20},{from:4,to:7,row:14},{from:16,to:19,row:14},{from:9,to:14,row:7}],
      [{from:5,to:6,row:24},{from:11,to:16,row:23},{from:3,to:8,row:16},{from:14,to:20,row:16},{from:9,to:14,row:9}]
    ],spawnPoints:[[4,20],[8,20],[14,20],[19,20],[5,13],[11,13],[18,13],[4,7],[10,6],[18,7],[20,3]],waves:[
      [{type:'slime',count:8,stagger:.38},{type:'ghost',count:4,stagger:.62},{type:'sentry',count:4,stagger:.65},{type:'brute',count:2,stagger:.9}],
      [{type:'slime',count:10,stagger:.35},{type:'bat',count:5,stagger:.5},{type:'sentry',count:5,stagger:.6},{type:'brute',count:3,stagger:.85}]
    ],boss:'president'}
  ],
  screenShake:true,bossStart:[6,3],presidentStart:[17,4],coffeeSpot:[6,8]
});

export const SKILL_IDS=Object.keys(CONFIG.skills);
export const NEW_SKILL_IDS=SKILL_IDS.filter(id=>id!=='slash');
export const ULTIMATE_IDS=['exit','clones','rush'];
export const center=([col,row])=>({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});
export const rotate=(v,degrees)=>{const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:v.x*c-v.y*s,y:v.x*s+v.y*c};};
export function makeSolids(stageId=1,layoutIndex=0){
  const stage=CONFIG.stages[stageId-1],cols=stage.size[0]/CONFIG.tile,rows=stage.size[1]/CONFIG.tile,desks=stage.reorgLayouts?.[layoutIndex]||stage.desks,result=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const wall=col===0||row===0||col===cols-1||row===rows-1,desk=desks.some(d=>row===d.row&&col>=d.from&&col<=d.to);
    if(wall||desk)result.push({x:col*CONFIG.tile,y:row*CONFIG.tile,w:CONFIG.tile,h:CONFIG.tile,wall,col,row});
  }
  return result;
}
export const solids=makeSolids(1);
