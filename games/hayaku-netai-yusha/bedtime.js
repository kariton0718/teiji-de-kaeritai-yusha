import {hazard} from './combat.js';
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const BED_MISSIONS=[
  {name:'第1幕・もう1冊！',kind:'carry',label:'絵本を探す',deliver:'絵本を届ける',x:95,y:430,hold:1.3},
  {name:'第1幕・おもちゃ大行進',kind:'tidy',label:'ここで12体お片づけ',x:240,y:345,hold:12},
  {name:'第2幕・おみずがほしい！',kind:'carry',label:'お水をくむ',deliver:'こぼさず届ける',x:390,y:460,hold:1.5},
  {name:'第2幕・まだ走れるよ！',kind:'chase',label:'近くで寝床へ誘う',x:240,y:230,hold:3.5},
  {name:'最終幕・子守歌の時間',kind:'sing',label:'輪の中で子守歌',x:240,y:285,hold:5},
  {name:'最終幕・ふたりとも、おやすみ',kind:'blanket',label:'男の子にお布団',x:190,y:215,hold:2.5},
];
export function nextBedRequest(g){
  const m=BED_MISSIONS[Math.min(g.helped,5)];
  g.request={...m,fill:0,step:0,kills:0};g.requestIndex=g.helped+1;
  g.bedBanner=m.name;g.bedBannerLife=2.2;g.child.mood=['まだぜんぜん眠くない！','おもちゃも連れてきた！','ふたりで夜ふかし！','つかまえてみて！','もう少しだけ……','おふとん、かけて？'][g.helped];
  g.spawn(14+g.bedPhase*4);g.emit('boss');
}
export function updateBedtime(g,dt){
  g.bedBannerLife=Math.max(0,g.bedBannerLife-dt);g.bedAttackCd-=dt;
  const phase=g.bedPhase;
  g.bedKids[0].x=185+Math.sin(g.roomTime*1.6)*28;g.bedKids[1].x=295+Math.sin(g.roomTime*1.9+1)*28;
  if(g.request?.kind==='chase'){g.bedKids[0].x=240+Math.sin(g.roomTime*.75)*125;g.bedKids[0].y=235+Math.cos(g.roomTime*.75)*45;}
  else g.bedKids[0].y=145;
  if(g.bedAttackCd<=0){
    const turn=g.bedTurn++%6,boy=g.bedKids[0],girl=g.bedKids[1],target={x:g.hero.x,y:g.hero.y};
    const lines=['ぼくの特急、しゅっぱつ！','まくら、ぽーん！','お星さま、いっぱい！','毛布でかくれんぼ！','ふたりでおもちゃパレード！','まだまだ寝ないもん！'];
    g.child.mood=lines[turn];g.bedSpeaker=turn%2;g.bedSpeechLife=1.8;
    if(turn===0){g.spawn(phase+2,'train');hazard(g,{...boy,kind:'volley',count:3+phase*2,life:1,r:25,prop:'star'});}
    if(turn===1)for(let i=0;i<phase+2;i++)hazard(g,{x:Math.max(40,Math.min(440,target.x+(i-1)*70)),y:Math.max(100,Math.min(550,target.y+(i%2)*60)),r:33,life:.95+i*.3,damage:14});
    if(turn===2)for(const k of [boy,girl])hazard(g,{...k,kind:'gapRing',angle:Math.atan2(target.y-k.y,target.x-k.x),count:12+phase*2,life:1.25,r:25,prop:'star'});
    if(turn===3){const safe=Math.floor(target.x/120);for(let i=0;i<4;i++)if(i!==safe)hazard(g,{x:60+i*120,y:80,x2:60+i*120,y2:580,shape:'line',r:32,life:1.35,damage:15});}
    if(turn===4){g.spawn(10+phase*4,'star');g.spawn(phase+1,'pillow');}
    if(turn===5){hazard(g,{...target,r:55,life:1.4,damage:16});g.spawn(4+phase,'robot');}
    g.bedAttackCd=[0,2.8,2.25,1.85][phase];g.emit('warning');
  }
  g.bedSpeechLife=Math.max(0,g.bedSpeechLife-dt);
  g.noise=Math.max(0,Math.min(100,g.noise+(g.enemies.filter(e=>!e.dead).length>55?5:-8)*dt));
  if(g.noise>=100){g.noise=45;g.child.mood='にぎやかで眠れなーい！';g.bedAttackCd=0;}
  if(!g.request){g.requestWait-=dt;if(g.requestWait<=0)nextBedRequest(g);return;}
  const r=g.request;
  if(r.kind==='chase'){r.x=g.bedKids[0].x;r.y=g.bedKids[0].y+35;}
  if(r.kind==='tidy'){r.fill=r.kills;}else if(d(g.hero,r)<46){r.fill+=dt;}else if(r.kind==='sing')r.fill=Math.max(0,r.fill-dt*.3);
  if(r.fill<r.hold)return;
  if(r.kind==='carry'&&r.step===0){r.step=1;r.fill=0;r.x=g.helped===0?170:310;r.y=225;r.label=r.deliver;r.hold=2;g.child.mood='こっち、こっち！';return;}
  if(r.kind==='blanket'&&r.step===0){r.step=1;r.fill=0;r.x=310;r.label='女の子にもお布団';g.child.mood='わたしも、かけて？';return;}
  g.helped++;g.child.progress=g.helped/6*100;g.hero.energy=Math.min(g.hero.maxEnergy,g.hero.energy+6);g.request=null;g.requestWait=2;
  g.effect('label',240,210,0,`${g.helped}/6 お世話完了！`,1.5);g.emit('help');
  if(g.helped>=6){g.child.mood='すう、すう……';g.completedNight=true;g.state='nightEnding';g.emit('ending');}
}
