// All balance values use logical pixels and real seconds. Tiles are zero-based.
export const CONFIG=Object.freeze({
  width:480,height:640,tile:40,cols:12,rows:16,
  timeLimit:75,startMinute:1065,deadlineMinute:1080,heroSpeed:160,radius:12,
  dashMultiplier:1.2,warningTime:4,protectionTime:3,bossResponseRest:1.2,
  workRange:25,extraDuration:4,failedExtraDuration:7,shieldCharges:1,
  acceptSlowTime:8,acceptSlowMultiplier:.45,maxAnger:3,
  angerSpeeds:[85,105,125,148],angerRepath:[.3,.22,.14,.08],angerPrediction:[0,.15,.35,.55],
  timing:{duration:4,period:1.4,successStart:.4,successEnd:.62,stopTime:4},
  slime:{speed:65,interval:7,firstDelay:4.5,warning:2.2,radius:95,meetingTime:3,protectionAfter:1.5},
  director:{interval:7,firstDelay:3,warning:1.8,speed:330,duration:1.6,stunTime:3.5},
  maxDelta:.1,step:1/120,dangerDistance:100,noticeTime:2.8,celebrationTime:3,urgentTime:15,
  developer:{unlockAllStages:false},
  titleRules:{legendSeconds:45,legendMaxCatches:1,clutchSeconds:10,managerExtras:3,craftMaxCatches:3},
  requests:[
    {text:'この資料、今日中にいける？',station:'report',job:'追加資料の作成'},
    {text:'会議の議事録だけお願い',station:'report',job:'会議の議事録'},
    {text:'5分だけ打ち合わせしよう',station:'handoff',job:'打ち合わせの共有'},
    {text:'念のため全部確認しておいて',station:'print',job:'印刷資料の再確認'}
  ]
});
const station=(id,name,tile,spot,duration)=>({id,name,tile,spot,duration});
export const STAGES=[
  {id:1,day:'月曜',name:'いつもの魔王商事',rule:'3つの仕事を完了。返答で上司との距離を作ろう。',enemy:'boss',
    heroStart:[2,13],bossStart:[8,11],exit:[9,1],
    desks:[{from:3,to:7,row:10},{from:4,to:8,row:7},{from:2,to:6,row:4}],
    stations:[station('report','報告書',[2,11],[2,12],7),station('print','資料印刷',[10,7],[10,8],6),station('handoff','引き継ぎ',[2,2],[2,3],5)]},
  {id:2,day:'水曜',name:'会議地獄',rule:'黄色い会議予告の円から逃げよう。残ると3秒間、会議に拘束！',enemy:'slime',timeLimit:80,
    heroStart:[2,13],bossStart:[9,3],exit:[9,1],
    desks:[{from:4,to:6,row:10},{from:3,to:6,row:6},{from:5,to:9,row:4}],
    stations:[station('report','報告書',[2,11],[2,12],7),station('print','資料印刷',[9,6],[9,7],6),station('handoff','引き継ぎ',[2,2],[2,3],5)],
    patrol:[[8,12],[8,8],[1,8],[1,12]]},
  {id:3,day:'金曜',name:'魔王部長の最終確認',rule:'赤い突進予告を見て横へ！ 机や壁にぶつけると部長が気絶。',enemy:'director',timeLimit:85,
    heroStart:[2,13],bossStart:[8,12],exit:[9,1],
    desks:[{from:3,to:6,row:11},{from:5,to:8,row:8},{from:2,to:5,row:5}],
    stations:[station('report','報告書',[2,9],[2,10],7),station('print','資料印刷',[9,5],[9,6],6),station('handoff','引き継ぎ',[3,2],[3,3],5)]}
];
export const getStageConfig=id=>({...CONFIG,...(STAGES.find(s=>s.id===id)||STAGES[0])});
export const center=([col,row])=>({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});
export function makeSolids(c){
  const result=[];
  for(let row=0;row<c.rows;row++)for(let col=0;col<c.cols;col++){
    const wall=col===0||row===0||col===c.cols-1||row===c.rows-1;
    const station=c.stations.find(s=>s.tile[0]===col&&s.tile[1]===row);
    if(wall||station||c.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to))
      result.push({x:col*c.tile,y:row*c.tile,w:c.tile,h:c.tile,wall,station:station?.id,col,row});
  }
  return result;
}
export const solids=makeSolids(getStageConfig(1));
