// Action RPG prototype balance. Distances are logical pixels, times are seconds.
export const CONFIG=Object.freeze({
  width:480,height:640,tile:40,cols:12,rows:16,radius:12,
  timeLimit:300,startMinute:1065,deadlineMinute:1080,maxDelta:.1,step:1/120,
  hero:{energy:100,speed:170,hitInvulnerability:.8,slowDuration:.5,slowMultiplier:.58},
  attack:{damage:20,range:64,arc:Math.PI*100/180,cooldown:.35,duration:.16,knockback:18,followDamage:12,followDelay:.13},
  dash:{duration:.18,cooldown:1.2,speed:480},
  shield:{charges:2,duration:1.5},
  ultimate:{max:100,damage:60,range:132,duration:.7},
  coffee:{heal:24,pickupRange:24},
  projectile:{heroSpeed:300,heroDamage:11,heroLife:1.2,enemySpeed:155,enemyDamage:10,enemyLife:4,maxEnemy:8},
  spawnWarning:.8,waveCompleteDelay:.65,
  waves:[
    [{type:'slime',count:4,stagger:.45}],
    [{type:'slime',count:4,stagger:.38},{type:'bat',count:2,stagger:.55}],
    [{type:'slime',count:3,stagger:.34},{type:'bat',count:2,stagger:.5},{type:'ghost',count:2,stagger:.65}]
  ],
  enemies:{
    slime:{name:'タスクスライム',hp:40,speed:72,damage:12,radius:14,contactCooldown:.75,ult:16},
    bat:{name:'未読メールバット',hp:30,speed:62,damage:10,radius:13,desired:145,shootInterval:2.25,warning:.6,ult:18},
    ghost:{name:'電話ゴースト',hp:50,speed:44,damage:14,radius:15,chargeInterval:3.1,warning:.75,chargeSpeed:275,chargeDuration:.55,recovery:.85,ult:22}
  },
  boss:{name:'魔王部長',hp:500,speed:55,damage:18,radius:25,attackInterval:2.7,enragedInterval:2.1,
    chargeWarning:1,chargeSpeed:310,chargeDuration:.8,stun:1.5,armorMultiplier:.35,
    meetingWarning:1.2,meetingRadius:112,meetingRecovery:.7,ult:0},
  upgrades:{
    double:{name:'二連タスク斬り',detail:'斬撃のあとに弱い追撃。軌跡も二重になる'},
    wide:{name:'広域処理',detail:'斬撃の射程＋24px、角度＋50°'},
    swift:{name:'迅速退勤',detail:'移動速度＋20%、回避待ち時間－30%'},
    reply:{name:'一斉返信',detail:'斬撃ごとに前方へ貫通メールを飛ばす'},
    vacation:{name:'有給追加',detail:'盾＋1、気力を25回復'},
    resolve:{name:'定時への執念',detail:'必殺ゲージ獲得＋50%、必殺威力＋30'}
  },
  screenShake:true,
  gate:[10,1],heroStart:[2,13],bossStart:[6,3],coffeeSpot:[6,8],
  desks:[
    {from:2,to:4,row:5},{from:7,to:9,row:5},
    {from:2,to:3,row:10},{from:8,to:9,row:10}
  ],
  spawnPoints:[[2,2],[6,2],[9,2],[2,7],[9,7],[2,12],[6,12],[9,12]]
});

export const center=([col,row])=>({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});

export function makeSolids(){
  const result=[];
  for(let row=0;row<CONFIG.rows;row++)for(let col=0;col<CONFIG.cols;col++){
    const wall=col===0||row===0||col===CONFIG.cols-1||row===CONFIG.rows-1;
    const desk=CONFIG.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to);
    if(wall||desk)result.push({x:col*CONFIG.tile,y:row*CONFIG.tile,w:CONFIG.tile,h:CONFIG.tile,wall,col,row});
  }
  return result;
}

export const solids=makeSolids();
export const UPGRADE_IDS=Object.keys(CONFIG.upgrades);
