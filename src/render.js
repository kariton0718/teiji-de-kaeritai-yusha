import {CONFIG as C,center,solids,rotate} from './config.js';
import {blocked} from './pathfinding.js';

export function render(ctx,g,time=0,effects=true){
  ctx.save();ctx.imageSmoothingEnabled=false;const shake=effects?g.shake*18:0;if(shake)ctx.translate(Math.sin(time*89)*shake,Math.cos(time*73)*shake);
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(s,x,y,c='#fff2d0',size=12)=>{ctx.fillStyle=c;ctx.font=`bold ${size}px "Yu Gothic UI",sans-serif`;ctx.textAlign='center';ctx.fillText(s,x,y);};
  const circle=(x,y,r,fill=null,stroke=null,line=2)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}};
  const floors=['#ddd1b9','#d0d2c2','#c9c7bd'],floor=floors[g.stage-1]||floors[0];rect(-8,-8,C.width+16,C.height+16,floor);
  for(let y=40;y<600;y+=40)for(let x=40;x<440;x+=40){rect(x,y,39,39,(x+y)%80?floor:'#e5dac4');rect(x+7,y+32,17,1,'#bcae98');}
  for(const s of solids){if(s.wall){rect(s.x,s.y,40,40,'#344b56');rect(s.x+2,s.y+2,36,29,g.stage===3?'#675c67':'#526a72');rect(s.x+2,s.y+31,36,7,'#213842');}else{rect(s.x+1,s.y+5,38,32,'#60787d');rect(s.x+4,s.y+8,32,21,'#91a39f');rect(s.x+7,s.y+11,20,10,'#294650');rect(s.x+9,s.y+13,16,6,'#9dd6ca');rect(s.x+6,s.y+30,5,10,'#40555c');rect(s.x+30,s.y+30,5,10,'#40555c');}}
  for(const x of [80,160,240]){rect(x,5,56,24,'#1d3640');rect(x+3,8,50,18,g.stage===3?'#c4a9c3':'#94c4c5');rect(x+26,8,3,18,'#58727a');}
  const gate=center(C.gate);rect(gate.x-21,gate.y-22,42,44,g.gateOpen?'#2b7b60':'#5a6165');rect(gate.x-15,gate.y-16,30,36,g.gateOpen?'#cbefa4':'#343e43');if(g.gateOpen){circle(gate.x,gate.y,25+Math.sin(time*5)*3,'#fff3a747','#fff0a8',3);text('退勤',gate.x,gate.y+5,'#235442',13);}else text('LOCK',gate.x,gate.y+5,'#d9c8aa',10);
  if(g.coffee){const p=g.coffee;circle(p.x,p.y,22,'#fff1b94d','#b67b39',2);rect(p.x-11,p.y-9,19,20,'#fff7df');rect(p.x+8,p.y-4,7,11,'#fff7df');rect(p.x-7,p.y-5,12,10,'#684331');text('COFFEE',p.x,p.y-28,'#744a2e',10);}

  // Enemy danger is always red/purple with outlines and labels.
  for(const a of g.enemyAreas){const pulse=1+Math.sin(time*12)*.04;if(!a.fired){circle(a.pos.x,a.pos.y,a.radius*pulse,'#b6385030','#a51f3c',4);text(String(a.order),a.pos.x,a.pos.y+7,'#8f1834',18);}else circle(a.pos.x,a.pos.y,a.radius,'#d82c5155','#6f1730',6);}
  for(const w of g.spawnWarnings){const color=w.type==='slime'?'#478d72':w.type==='bat'?'#7359a0':w.type==='ghost'?'#bc4e7d':'#a44b3d';circle(w.pos.x,w.pos.y,21+w.left*9,`${color}35`,color,3);text(w.type==='slime'?'TASK':w.type==='bat'?'MAIL':w.type==='ghost'?'TEL':'BIG',w.pos.x,w.pos.y+4,color,9);}
  for(const e of g.activeEnemies)drawWarnings(e);

  // Friendly automatic attacks use blue, gold and white and stay translucent.
  for(const m of g.meteors){if(!m.fired){circle(m.pos.x,m.pos.y,m.radius,'#f3cf5630','#e8bd42',3);ctx.strokeStyle='#fff3ae';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(m.pos.x-9,m.pos.y);ctx.lineTo(m.pos.x+9,m.pos.y);ctx.moveTo(m.pos.x,m.pos.y-9);ctx.lineTo(m.pos.x,m.pos.y+9);ctx.stroke();}else{circle(m.pos.x,m.pos.y,m.radius,'#ffe78955','#fff2bd',6);circle(m.pos.x,m.pos.y,m.radius*(m.effect/C.meteor.effect),null,'#7bd0df',3);}}
  for(const t of g.thunders){ctx.globalAlpha=Math.max(.25,t.left/C.thunder.effect);ctx.strokeStyle='#bff5ff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(t.from.x,t.from.y);const mx=(t.from.x+t.to.x)/2+Math.sin(t.to.x)*10;ctx.lineTo(mx,(t.from.y+t.to.y)/2);ctx.lineTo(t.to.x,t.to.y);ctx.stroke();ctx.strokeStyle='#f7d96e';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;}

  for(const p of g.heroProjectiles)drawHeroShot(p);for(const p of g.enemyProjectiles)drawEnemyShot(p);
  for(const a of g.afterimages){ctx.globalAlpha=a.left/.26*.3;drawHero(a.pos,a.facing,'#5ebbd6');ctx.globalAlpha=1;}
  for(const e of [...g.activeEnemies].sort((a,b)=>a.pos.y-b.pos.y))drawEnemy(e);

  for(const b of g.orbitPositions()){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(time*8+b.index);rect(-8,-5,16,10,'#f7f1db');ctx.strokeStyle='#5ab5cc';ctx.lineWidth=2;ctx.strokeRect(-8,-5,16,10);ctx.restore();}
  if(!(g.hero.invulnerable>0&&Math.floor(g.hero.invulnerable*18)%2))drawHero(g.hero,g.hero.facing,g.hero.hurtFlash?'#fff0a0':'#317fab');
  if(g.hero.shieldLeft>0){circle(g.hero.x,g.hero.y,25+Math.sin(time*11)*2,'#8cdae543','#d9fbff',3);text('有給',g.hero.x,g.hero.y-32,'#24586d',10);}
  for(const a of g.attacks)drawAttack(a);
  for(const p of g.particles){ctx.globalAlpha=Math.min(1,p.left*2);rect(p.pos.x,p.pos.y,5,8,p.color);ctx.globalAlpha=1;}
  if(g.outcome==='success'&&effects){const colors=['#f5c85f','#70c4a0','#e98296','#77aee0','#fff0ae'];for(let i=0;i<58;i++)rect((i*83+Math.sin(time*2+i)*18)%C.width,(i*47+time*72)%C.height,5+(i%2)*3,9,colors[i%colors.length]);}
  ctx.restore();

  function drawWarnings(e){
    if(e.type==='bat'&&e.state==='warn'){const n=C.enemies.bat.fanByStage[g.stage],spread=C.enemies.bat.spread;for(let i=0;i<n;i++){const d=rotate(e.dir,(i-(n-1)/2)*spread);ctx.strokeStyle='#a3284f';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(e.pos.x+d.x*170,e.pos.y+d.y*170);ctx.stroke();}ctx.setLineDash([]);text('送信予告',e.pos.x,e.pos.y-29,'#922040',10);}
    if(e.type==='ghost'&&e.state==='warn'){ctx.strokeStyle='#b4265d55';ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(e.pos.x+e.dir.x*190,e.pos.y+e.dir.y*190);ctx.stroke();ctx.strokeStyle='#9d174d';ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.stroke();ctx.setLineDash([]);text('R R R…',e.pos.x,e.pos.y-31,'#991746',11);}
    if(e.type==='brute'&&e.state==='warn'){circle(e.pos.x,e.pos.y,C.enemies.brute.areaRadius,'#b02d4930','#a51c3c',4);text('締切！',e.pos.x,e.pos.y-C.enemies.brute.areaRadius-7,'#8e1734',12);}
    if(e.type==='boss')drawBossWarning(e);
  }
  function drawBossWarning(e){
    if(['chargeWarn','multiWarn'].includes(e.state)){let p={...e.pos};for(let n=0;n<520;n+=4){const q={x:p.x+e.dir.x*4,y:p.y+e.dir.y*4};if(blocked(q.x,q.y,e.radius,solids))break;p=q;}ctx.strokeStyle='#d1364c52';ctx.lineWidth=58;ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle='#a71935';ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.stroke();ctx.setLineDash([]);text(e.state==='multiWarn'?`連続突進 ${e.chargesLeft}`:'ちょっといい？',e.pos.x,e.pos.y-52,'#94132f',13);}
    if(e.state==='meetingWarn'){circle(e.pos.x,e.pos.y,C.boss.meetingRadius,'#933e9b32','#7e2188',4);text('5分だけ会議',e.pos.x,e.pos.y-C.boss.meetingRadius-7,'#6e1b78',13);}
    if(e.state==='fanWarn'){const n=C.boss.fanCount;for(let i=0;i<n;i++){const d=rotate(e.dir,(i-(n-1)/2)*C.boss.fanSpread);ctx.strokeStyle='#9d2053';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(e.pos.x+d.x*190,e.pos.y+d.y*190);ctx.stroke();}ctx.setLineDash([]);text('書類弾！',e.pos.x,e.pos.y-52,'#8c1645',13);}
    if(e.state==='summonWarn')text('増援を要請中！',e.pos.x,e.pos.y-52,'#8d1a49',13);
  }
  function drawHeroShot(p){ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.dir.y,p.dir.x));circle(0,0,8,'#88dbea88','#eafcff',2);rect(-4,-2,13,4,'#fff0a8');ctx.restore();}
  function drawEnemyShot(p){ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.dir.y,p.dir.x));const boss=p.kind==='boss';rect(-8,-5,16,10,boss?'#e387b4':'#f3d9df');ctx.strokeStyle=boss?'#7c1e5a':'#9f355e';ctx.lineWidth=2;ctx.strokeRect(-8,-5,16,10);ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(0,1);ctx.lineTo(8,-5);ctx.stroke();ctx.restore();}
  function drawHero(p,facing,color){const walk=Math.floor(time*9)%2;rect(p.x-13,p.y+13,26,5,'#9c927f');rect(p.x-10,p.y-3,20,17,color);rect(p.x-13,p.y,5,13,'#65b7d0');rect(p.x+9,p.y,5,13,'#65b7d0');rect(p.x-8,p.y+12,6,7+walk,'#273f4c');rect(p.x+3,p.y+12,6,8-walk,'#273f4c');rect(p.x-9,p.y-19,18,17,'#f0c99a');rect(p.x-12,p.y-21,24,6,'#d2d9d1');rect(p.x-3,p.y-25,7,10,'#73b9b2');rect(p.x-5,p.y-11,3,3,'#283d49');rect(p.x+4,p.y-11,3,3,'#283d49');ctx.strokeStyle='#fff1bc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+facing.x*14,p.y+facing.y*14);ctx.lineTo(p.x+facing.x*25,p.y+facing.y*25);ctx.stroke();}
  function hp(e,w){rect(e.pos.x-w/2,e.pos.y-e.radius-17,w,5,'#49383d');rect(e.pos.x-w/2,e.pos.y-e.radius-17,w*e.hp/e.maxHp,5,e.type==='boss'&&e.bossPhase===3?'#f04c5d':'#64bf7b');}
  function drawEnemy(e){const p=e.pos,flash=e.flash>0;
    if(e.type==='slime'){circle(p.x,p.y+5,17,flash?'#fff4a2':'#61b68e','#2d6c60',2);rect(p.x-13,p.y-7,26,15,flash?'#fff4a2':'#82d1a9');rect(p.x-7,p.y-3,4,4,'#214f4b');rect(p.x+5,p.y-3,4,4,'#214f4b');text('TASK',p.x,p.y+10,'#24534d',8);hp(e,28);}
    else if(e.type==='bat'){ctx.fillStyle=flash?'#fff4a2':'#73579e';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-22,p.y-12);ctx.lineTo(p.x-15,p.y+8);ctx.lineTo(p.x,p.y+4);ctx.lineTo(p.x+15,p.y+8);ctx.lineTo(p.x+22,p.y-12);ctx.closePath();ctx.fill();circle(p.x,p.y,10,'#9872bc');text('@',p.x,p.y+5,'#fff',9);hp(e,28);}
    else if(e.type==='ghost'){circle(p.x,p.y-2,16,flash?'#fff4a2':'#d9769e','#8d3968',2);ctx.fillStyle=flash?'#fff4a2':'#d9769e';ctx.beginPath();ctx.moveTo(p.x-16,p.y);ctx.lineTo(p.x-13,p.y+19);ctx.lineTo(p.x-5,p.y+12);ctx.lineTo(p.x+2,p.y+20);ctx.lineTo(p.x+9,p.y+12);ctx.lineTo(p.x+16,p.y+18);ctx.lineTo(p.x+16,p.y);ctx.fill();text('☎',p.x,p.y+4,'#663052',15);hp(e,30);}
    else if(e.type==='brute'){circle(p.x,p.y+10,24,'#744139');rect(p.x-20,p.y-15,40,36,flash?'#fff4a2':'#a85b43');rect(p.x-15,p.y-33,30,21,'#c9946c');rect(p.x-12,p.y-37,8,8,'#5f4b44');rect(p.x+4,p.y-37,8,8,'#5f4b44');text('〆',p.x,p.y+8,'#fff0c1',20);hp(e,43);}
    else{const colors=['','#70405f','#8d3e61','#b43751'],col=flash?'#fff0a2':colors[e.bossPhase];circle(p.x,p.y+10,28,'#554158');rect(p.x-23,p.y-10,46,35,col);rect(p.x-18,p.y-32,36,24,'#d5a77f');rect(p.x-23,p.y-41,46,9,'#e8bc4d');rect(p.x-23,p.y-48,7,8,'#e8bc4d');rect(p.x-3,p.y-51,7,11,'#e8bc4d');rect(p.x+16,p.y-48,7,8,'#e8bc4d');rect(p.x-11,p.y-23,8,5,'#29313f');rect(p.x+4,p.y-23,8,5,'#29313f');text(`魔王部長・第${e.bossPhase}形態`,p.x,p.y-62,colors[e.bossPhase],13);if(e.weak)text('★ 弱点露出 ★',p.x,p.y+48,'#9a6416',12);else{text('防御中',p.x,p.y+48,'#5e345a',10);circle(p.x,p.y,34,null,'#815078',2);}hp(e,64);}
  }
  function drawAttack(a){if(a.kind==='ultimate'){const t=1-a.left/a.total;circle(a.pos.x,a.pos.y,Math.hypot(C.width,C.height)*t,'#fff0a315',`rgba(255,239,160,${1-t})`,9);return;}if(a.kind==='circle'){const t=1-a.left/a.total;circle(a.pos.x,a.pos.y,a.range*t,'#78d7e32b','#fff0a9',6);return;}const alpha=Math.max(0,a.left/a.total),angle=Math.atan2(a.dir.y,a.dir.x);ctx.beginPath();ctx.moveTo(a.pos.x,a.pos.y);ctx.arc(a.pos.x,a.pos.y,a.range,angle-a.arc/2,angle+a.arc/2);ctx.closePath();ctx.fillStyle=a.kind==='follow'?`rgba(105,215,225,${alpha*.38})`:`rgba(255,236,145,${alpha*.55})`;ctx.fill();ctx.strokeStyle=a.kind==='follow'?'#91ebee':'#fff1a5';ctx.lineWidth=a.kind==='follow'?3:5;ctx.stroke();}
}
