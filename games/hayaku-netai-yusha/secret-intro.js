// Seven-second, bounded Canvas cinematic; existing boss art has a vector fallback.
export function drawSecretIntro(p,g){
  const c=p.ctx,t=g.secretIntroTime, reveal=Math.max(0,Math.min(1,(t-1.8)/1.2));
  const grad=c.createLinearGradient(0,0,480,620);grad.addColorStop(0,'#091327');grad.addColorStop(.55,'#241b46');grad.addColorStop(1,'#631e41');
  p.rect(0,0,480,620,0,grad);
  c.save();c.translate(240,285);c.rotate(t*(t<1.8?.9:.18));
  for(let i=0;i<60;i++){const a=i*Math.PI/30;const r=i%5?202:191;p.line(Math.sin(a)*r,Math.cos(a)*r,Math.sin(a)*213,Math.cos(a)*213,i%5?'#867793':'#ffd78b',i%5?1:4);}
  for(const r of [169,220,231])p.circle(0,0,r,'#00000000','#ddab6655');
  const angle=t*t*1.4;p.line(0,0,Math.sin(angle)*158,-Math.cos(angle)*158,'#ffe4a6',6);p.line(0,0,Math.cos(angle*.4)*115,Math.sin(angle*.4)*115,'#ef7094',8);c.restore();
  for(let i=0;i<32;i++){const a=i*2.4+t*.3,r=70+(i*37+t*26)%220;p.circle(240+Math.cos(a)*r,285+Math.sin(a)*r,1+i%3,'#ffe5a888');}
  p.rect(0,0,480,55,0,'#050b19');p.rect(0,553,480,67,0,'#050b19');
  if(t<1.8){p.text('その朝、時計が牙をむいた。',240,275,23,'#fff1d4');p.text('チク、タク。 もう、逃がさない。',240,320,15,'#d5b9ca');}
  else{
    c.save();c.globalAlpha=reveal;c.translate(240,300);c.scale(.8+reveal*.2,.8+reveal*.2);
    c.shadowColor='#ffbc63';c.shadowBlur=24;
    if(!p.sprite('boss-clock',0,105,290))p.prop('clock',0,0,96,true);c.restore();
    p.text('SECRET BOSS / 最終決戦',240,94,16,'#ffd791');
    p.text('朝の時間ドロボウ',240,450,32,'#fff3ce');
    p.text(t<4.3?'奪われた朝を、取り戻せ。':'大群襲来 × 三段階の暴走',240,490,18,'#f0bbce');
    if(t>=5.4){const count=Math.max(1,3-Math.floor((t-5.4)/.6));p.text(String(count),240,185,56,'#fff5d3');}
  }
  p.rect(45,579,390,3,0,'#50405e');p.rect(45,579,390*Math.min(1,t/7.2),3,0,'#ffd791');
  p.text('予告をかわし、大群を突破しろ',240,603,13,'#e6cfb5');
}
