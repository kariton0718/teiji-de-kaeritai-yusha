export function updateCommute(g,dt,input){
  const r=g.commuteRun;
  if(!r)return;
  if(r.arrival>0){r.arrival+=dt;if(r.arrival>=2.2){g.completedMorning=true;g.state='trueEnding';g.emit('ending');}return;}
  const x=Math.max(0,Math.min(1,input.x||0));r.moving=x>0;
  r.distance=Math.min(r.length,r.distance+x*220*dt);
  g.hero.x=130+r.distance/r.length*200;
  g.hero.y=Math.max(445,Math.min(530,g.hero.y+(input.y||0)*90*dt));
  const phase=r.distance<r.length*.34?0:r.distance<r.length*.72?1:2;
  if(phase!==r.phase){r.phase=phase;g.emit('commute');}
  if(r.distance>=r.length){r.arrival=.001;r.moving=false;g.emit('arrival');}
}

export function drawCommute(p,g){
  const c=p.ctx,r=g.commuteRun||{distance:0,length:1600,phase:0,arrival:0,moving:false},t=r.distance/r.length;
  const bg=p.art.get('commute-city'),runner=p.art.get('commute-hero');
  if(bg){const sw=Math.min(bg.width,bg.height*480/620),sx=(bg.width-sw)*t;c.drawImage(bg,sx,0,sw,bg.height,0,0,480,620);}
  else{const grad=c.createLinearGradient(0,0,0,620);grad.addColorStop(0,'#acd8e8');grad.addColorStop(1,'#fbe5b5');c.fillStyle=grad;c.fillRect(0,0,480,620);for(let i=0;i<9;i++){const x=((i*105-t*850)%650+650)%650-100;p.rect(x,170+(i%3)*25,85,190,5,i%2?'#9ab8be':'#75929f');}p.rect(0,365,480,255,0,'#d7c2a0');}
  // Foreground leaves, glints and speed streaks move with actual travel, not with idle input.
  for(let i=0;i<18;i++){const x=((i*71-r.distance*(.35+i%3*.2))%540+540)%540-30,y=100+i*29;c.globalAlpha=.25+(i%3)*.12;p.circle(x,y,2+i%3,'#fff4c2');if(r.moving)p.line(x,y,x-22,y+3,'#fff4c2',1);}
  c.globalAlpha=1;
  const arrival=Math.min(1,r.arrival/1.7),x=g.hero.x+(365-g.hero.x)*arrival,y=g.hero.y+(355-g.hero.y)*arrival;
  p.shadow(x,y+5,30*(1-arrival*.4));
  const size=(r.moving?155:148)*(1-arrival*.32),bob=r.moving?Math.sin(p.time*22)*5:0;
  if(runner)p.sprite('commute-hero',x,y+bob,size);else p.person(x,y-25,'hero',1.2);
  if(r.arrival>0){c.globalAlpha=Math.min(.75,r.arrival*.22);c.fillStyle='#fff4cf';c.fillRect(0,0,480,620);c.globalAlpha=1;for(let i=0;i<16;i++){const a=i*Math.PI/8,rad=45+r.arrival*90;p.text('✦',240+Math.cos(a)*rad,260+Math.sin(a)*rad,16,'#fff2a9');}}
  p.rect(0,0,480,76,0,'#233a50e8');p.text('LAST RUN  /  家族の朝を、つないで',240,26,13,'#ffe2a0');
  p.text(['住宅街 — 「いってらっしゃい！」','朝の並木道 — あと少し！','会社の前 — 今日も、間に合う！'][r.phase],240,52,14,'#fff2d8');
  p.rect(30,574,420,7,4,'#25384fa8');p.rect(30,574,420*t,7,4,'#f4d485');
  p.label(r.arrival>0?'出社！ 朝の冒険、完全クリア。':r.moving?'家族の声を背に、もうひと走り！':'右へスライドして会社へ →',240,546,'#fff3d6');
  if(r.arrival>0){p.rect(35,233,410,64,14,'#253950ed');p.text('間に合った……！',240,264,28,'#ffe5ac');}
}
