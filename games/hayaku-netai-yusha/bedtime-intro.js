// Fixed-size Canvas choreography: no particle allocations or extra downloaded art.
export function drawBedtimeIntro(p,g){
  const c=p.ctx,t=g.bedtimeIntroTime,open=Math.min(1,t/1.5),reveal=Math.max(0,Math.min(1,(t-1.3)/1.1));
  const sky=c.createLinearGradient(0,0,0,620);sky.addColorStop(0,'#17233e');sky.addColorStop(.65,'#665779');sky.addColorStop(1,'#cc9b9a');
  p.rect(0,0,480,620,0,sky);
  p.circle(365,125,48,'#ffedba');p.circle(384,109,44,'#253049');
  for(let i=0;i<36;i++){const x=24+(i*97)%432,y=62+(i*53)%295,r=1.2+(1+Math.sin(t*2+i))*.9;p.circle(x,y,r,'#ffe8b5');}
  // Soft spotlights frame the family without obscuring their faces.
  c.save();c.globalAlpha=.12;c.fillStyle='#fff3ce';
  for(const x of [135,345]){c.beginPath();c.moveTo(x,70);c.lineTo(x-115,462);c.lineTo(x+115,462);c.closePath();c.fill();}c.restore();
  p.rect(35,366,410,112,25,'#8f7399','#e9c0c2');p.rect(53,381,374,79,18,'#cfacc7');
  for(let i=0;i<9;i++)p.circle(65+i*44,474+Math.sin(t*3+i)*7,5,'#ffd995');
  c.save();c.globalAlpha=reveal;
  const slide=(1-reveal)*130,bob=Math.sin(t*3)*5;
  p.person(166-slide,320+bob,'child',1.85);p.person(314+slide,320-bob,'girl',1.85);
  if(t>2.5){p.rect(78,166,324,42,18,'#fff1db');p.text(t<4?'まだまだ、遊びたい！':'もう1冊！ あとちょっと！',240,188,19,'#634c71');}c.restore();
  // Opening velvet curtains, then a persistent cinema frame.
  const curtain=240*(1-open);p.rect(0,0,curtain,620,0,'#513350');p.rect(480-curtain,0,curtain,620,0,'#513350');
  p.rect(0,0,480,55,0,'#18223a');p.rect(0,536,480,84,0,'#18223a');
  p.text('FINAL STAGE  /  寝かしつけ最終決戦',240,29,17,'#ffe3a8');
  if(t<1.5)p.text('今夜いちばんの、大仕事。',240,280,24,'#fff0cf');
  else{p.text('夜ふかしキッズ、登場！',240,417,27,'#fff6dd');p.text('おもちゃの大群も、まだ眠らない。',240,505,17,'#fff0d4');}
  const acts=['第一幕  もう1冊！','第二幕  まだ遊ぶ！','第三幕  おやすみ！'];
  p.text(t<4.2?'3幕・6つのお願いを乗り越えよう':acts[Math.min(2,Math.floor((t-4.2)/.8))],240,568,20,'#ffe3a8');
  p.rect(60,598,360,3,0,'#655775');p.rect(60,598,360*Math.min(1,t/6.6),3,0,'#ffe3a8');
}
