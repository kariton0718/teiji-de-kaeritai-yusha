// Balance durations, movement, odds, rewards and positions here.
// Distances: logical pixels. Durations: real seconds. Tiles: zero-based.
export const CONFIG = Object.freeze({
  width:480, height:640, tile:40, cols:12, rows:16,
  timeLimit:75, startMinute:17*60+45, deadlineMinute:18*60,
  heroSpeed:160, bossSpeed:85, bossSpeedStep:15, bossMaxSpeed:145,
  dashMultiplier:1.2, radius:12, warningTime:4,
  protectionTime:3, bossResponseRest:1.2, workRange:25,
  extraDuration:4, deflectChance:.5, shieldCharges:1,
  repathTime:.25, maxDelta:.1, step:1/120, dangerDistance:100,
  noticeTime:2.8, celebrationTime:3, urgentTime:15,
  titleRules:{legendSeconds:45,legendMaxCatches:1,clutchSeconds:10,managerExtras:3,craftMaxCatches:3},
  heroStart:[2,13], bossStart:[8,11], exit:[9,1],
  desks:[{from:3,to:7,row:10},{from:4,to:8,row:7},{from:2,to:6,row:4}],
  stations:[
    {id:'report',name:'報告書',verb:'報告書を作成中',icon:'PC',tile:[2,11],spot:[2,12],duration:7},
    {id:'print',name:'資料印刷',verb:'資料を印刷中',icon:'COPY',tile:[10,7],spot:[10,8],duration:6},
    {id:'handoff',name:'引き継ぎ',verb:'同僚に引き継ぎ中',icon:'同僚',tile:[2,2],spot:[2,3],duration:5}
  ],
  requests:[
    {text:'この資料、今日中にいける？',station:'report',job:'追加資料の作成'},
    {text:'会議の議事録だけお願い',station:'report',job:'会議の議事録'},
    {text:'5分だけ打ち合わせしよう',station:'handoff',job:'打ち合わせの共有'},
    {text:'念のため全部確認しておいて',station:'print',job:'印刷資料の再確認'}
  ]
});
export const center = ([col,row]) => ({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});
export const solids=[];
for(let row=0;row<CONFIG.rows;row++) for(let col=0;col<CONFIG.cols;col++) {
  const wall=col===0||row===0||col===CONFIG.cols-1||row===CONFIG.rows-1;
  const station=CONFIG.stations.find(s=>s.tile[0]===col&&s.tile[1]===row);
  if(wall||station||CONFIG.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to)) {
    solids.push({x:col*CONFIG.tile,y:row*CONFIG.tile,w:CONFIG.tile,h:CONFIG.tile,wall,station:station?.id,col,row});
  }
}
