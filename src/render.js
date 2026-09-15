import {CONFIG as C,center,solids} from './config.js';
import {blocked} from './pathfinding.js';

export function render(ctx,g,time=0,effects=true){
  ctx.save();ctx.imageSmoothingEnabled=false;
  const shake=effects?g.shake*18:0;if(shake)ctx.translate(Math.sin(time*93)*shake,Math.cos(time*77)*shake);
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const text=(s,x,y,c='#f8f0d5',size=12,align='center')=>{ctx.fillStyle=c;ctx.font=`bold ${size}px "Yu Gothic UI",sans-serif`;ctx.textAlign=align;ctx.fillText(s,x,y);};
  const circle=(x,y,r,fill,stroke=null,line=2)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}};
  rect(-8,-8,C.width+16,C.height+16,'#d9ceb6');
  for(let y=40;y<600;y+=40)for(let x=40;x<440;x+=40){rect(x,y,39,39,(x+y)%80?'#d9ceb6':'#e1d6bf');rect(x+7,y+32,17,1,'#c4b79e');}
  for(const s of solids){
    if(s.wall){rect(s.x,s.y,40,40,'#344955');rect(s.x+2,s.y+2,36,29,'#526b74');rect(s.x+2,s.y+31,36,7,'#213943');}
    else {rect(s.x+1,s.y+5,38,32,'#60777d');rect(s.x+4,s.y+8,32,21,'#92a2a0');rect(s.x+7,s.y+11,20,10,'#294650');rect(s.x+9,s.y+13,16,6,'#9ed6ca');rect(s.x+6,s.y+30,5,10,'#40555c');rect(s.x+30,s.y+30,5,10,'#40555c');}
  }
  for(const x of [80,160,240]){rect(x,5,56,24,'#1f3742');rect(x+3,8,50,18,'#94c4c5');rect(x+26,8,3,18,'#58727a');}
  const gate=center(C.gate);rect(gate.x-21,gate.y-22,42,44,g.gateOpen?'#2d7a61':'#5a6165');rect(gate.x-15,gate.y-16,30,36,g.gateOpen?'#c8efa9':'#363f44');
  if(g.gateOpen){circle(gate.x,gate.y,25+Math.sin(time*5)*3,'#fff4a943','#fff0aa',3);text('退勤',gate.x,gate.y+5,'#235543',13);text('OPEN',gate.x,gate.y+37,'#245b4b',12);}else{text('LOCK',gate.x,gate.y+5,'#d9c9ab',11);}
  if(g.coffee){const p=g.coffee;circle(p.x,p.y,22,'#fff2ba55','#b97e3d',2);rect(p.x-11,p.y-9,19,20,'#fff7df');rect(p.x+8,p.y-4,7,11,'#fff7df');rect(p.x-7,p.y-5,12,10,'#684331');text('COFFEE',p.x,p.y-28,'#744a2e',10);}

  for(const w of g.spawnWarnings){const color=w.type==='slime'?'#54a786':w.type==='bat'?'#7b65aa':'#d3749a';circle(w.pos.x,w.pos.y,22+w.left*8,`${color}35`,color,3);text(w.type==='slime'?'S':w.type==='bat'?'MAIL':'TEL',w.pos.x,w.pos.y+4,color,10);}

  for(const e of g.activeEnemies){
    if(e.type==='bat'&&e.state==='warn'){
      ctx.strokeStyle='#e4a44f';ctx.lineWidth=3;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(e.pos.x+e.dir.x*145,e.pos.y+e.dir.y*145);ctx.stroke();ctx.setLineDash([]);text('送信！',e.pos.x,e.pos.y-27,'#9a5d18',11);
    }
    if(e.type==='ghost'&&e.state==='warn'){
      ctx.strokeStyle='#d45377';ctx.lineWidth=26;ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(e.pos.x+e.dir.x*180,e.pos.y+e.dir.y*180);ctx.stroke();ctx.globalAlpha=1;text('R R R…',e.pos.x,e.pos.y-30,'#a62e57',12);
    }
    if(e.type==='boss'&&e.state==='chargeWarn'){
      let p={...e.pos};for(let n=0;n<500;n+=4){const q={x:p.x+e.dir.x*4,y:p.y+e.dir.y*4};if(blocked(q.x,q.y,e.radius,solids))break;p=q;}
      ctx.strokeStyle='#d1394a55';ctx.lineWidth=56;ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle='#a31d36';ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.beginPath();ctx.moveTo(e.pos.x,e.pos.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);text('ちょっといい？',e.pos.x,e.pos.y-45,'#9b1933',14);
    }
    if(e.type==='boss'&&e.state==='meetingWarn'){
      circle(e.pos.x,e.pos.y,C.boss.meetingRadius,'#a24aa636','#8c2e91',4);text('5分だけ会議',e.pos.x,e.pos.y-C.boss.meetingRadius-8,'#74247d',14);
    }
  }

  for(const a of g.afterimages){ctx.globalAlpha=a.left/.28*.28;hero(a.pos,g.hero.facing,'#5bb7d5');ctx.globalAlpha=1;}
  for(const p of g.heroProjectiles){ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.dir.y,p.dir.x));rect(-7,-4,14,8,'#d9f4e8');rect(-5,-2,10,1,'#4c8e83');ctx.restore();}
  for(const p of g.enemyProjectiles){ctx.save();ctx.translate(p.pos.x,p.pos.y);ctx.rotate(Math.atan2(p.dir.y,p.dir.x));rect(-8,-5,16,10,'#fff2d2');ctx.strokeStyle='#af7139';ctx.strokeRect(-8,-5,16,10);ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(0,1);ctx.lineTo(8,-5);ctx.stroke();ctx.restore();}

  for(const e of [...g.activeEnemies].sort((a,b)=>a.pos.y-b.pos.y))drawEnemy(e);
  if(!(g.hero.invulnerable>0&&Math.floor(g.hero.invulnerable*16)%2))hero(g.hero,g.hero.facing,g.hero.hurtFlash?'#fff0b0':'#327fad');
  if(g.hero.shieldLeft>0){circle(g.hero.x,g.hero.y,24+Math.sin(time*10)*2,'#91d6e245','#d9fbff',3);text('有給',g.hero.x,g.hero.y-31,'#24586e',10);}

  for(const a of g.attacks){
    if(a.ultimate){const t=1-a.left/a.total;circle(a.pos.x,a.pos.y,C.ultimate.range*t,null,`rgba(255,231,126,${1-t})`,7);continue;}
    const alpha=Math.max(0,a.left/a.total),angle=Math.atan2(a.dir.y,a.dir.x);ctx.beginPath();ctx.moveTo(a.pos.x,a.pos.y);ctx.arc(a.pos.x,a.pos.y,a.range,angle-a.arc/2,angle+a.arc/2);ctx.closePath();ctx.fillStyle=a.follow?`rgba(117,223,210,${alpha*.45})`:`rgba(255,239,161,${alpha*.62})`;ctx.fill();ctx.strokeStyle=a.follow?'#7ce0d3':'#fff0a4';ctx.lineWidth=a.follow?3:5;ctx.stroke();
  }
  for(const p of g.particles){ctx.globalAlpha=Math.min(1,p.left*2);rect(p.pos.x,p.pos.y,5,8,p.color);ctx.globalAlpha=1;}
  if(g.outcome==='success'&&effects){const colors=['#f5c85f','#70c4a0','#e98296','#77aee0','#fff0ae'];for(let i=0;i<52;i++){const x=(i*83+Math.sin(time*2+i)*18)%C.width,y=(i*47+time*72)%C.height;rect(x,y,5+(i%2)*3,9,colors[i%colors.length]);}}
  ctx.restore();

  function hero(p,facing,color){
    const walk=Math.floor(time*9)%2;rect(p.x-13,p.y+13,26,5,'#9c927f');rect(p.x-10,p.y-3,20,17,color);rect(p.x-13,p.y,5,13,'#65b7d0');rect(p.x+9,p.y,5,13,'#65b7d0');rect(p.x-8,p.y+12,6,7+walk,'#273f4c');rect(p.x+3,p.y+12,6,8-walk,'#273f4c');rect(p.x-9,p.y-19,18,17,'#f0c99a');rect(p.x-12,p.y-21,24,6,'#d2d9d1');rect(p.x-3,p.y-25,7,10,'#73b9b2');rect(p.x-5,p.y-11,3,3,'#283d49');rect(p.x+4,p.y-11,3,3,'#283d49');ctx.strokeStyle='#fff1bc';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+facing.x*14,p.y+facing.y*14);ctx.lineTo(p.x+facing.x*25,p.y+facing.y*25);ctx.stroke();
  }
  function hpBar(e,w){rect(e.pos.x-w/2,e.pos.y-e.radius-17,w,5,'#4b3b3d');rect(e.pos.x-w/2,e.pos.y-e.radius-17,w*e.hp/e.maxHp,5,e.enraged?'#ff5c55':'#6cc27e');}
  function drawEnemy(e){const p=e.pos,flash=e.flash>0;
    if(e.type==='slime'){circle(p.x,p.y+5,17,flash?'#fff5a4':'#64b891','#2c6d61',2);rect(p.x-13,p.y-7,26,15,flash?'#fff5a4':'#82d2ad');rect(p.x-7,p.y-3,4,4,'#214f4b');rect(p.x+5,p.y-3,4,4,'#214f4b');text('TASK',p.x,p.y+10,'#24534d',8);hpBar(e,28);}
    else if(e.type==='bat'){ctx.fillStyle=flash?'#fff5a4':'#765aa0';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-22,p.y-12);ctx.lineTo(p.x-15,p.y+8);ctx.lineTo(p.x,p.y+4);ctx.lineTo(p.x+15,p.y+8);ctx.lineTo(p.x+22,p.y-12);ctx.closePath();ctx.fill();circle(p.x,p.y,10,'#9a75bd');rect(p.x-5,p.y-2,3,3,'#fff3bd');rect(p.x+3,p.y-2,3,3,'#fff3bd');text('@',p.x,p.y+6,'#fff',9);hpBar(e,28);}
    else if(e.type==='ghost'){circle(p.x,p.y-2,16,flash?'#fff5a4':'#dc79a2','#8e3a69',2);ctx.fillStyle=flash?'#fff5a4':'#dc79a2';ctx.beginPath();ctx.moveTo(p.x-16,p.y);ctx.lineTo(p.x-13,p.y+19);ctx.lineTo(p.x-5,p.y+12);ctx.lineTo(p.x+2,p.y+20);ctx.lineTo(p.x+9,p.y+12);ctx.lineTo(p.x+16,p.y+18);ctx.lineTo(p.x+16,p.y);ctx.fill();text('☎',p.x,p.y+4,'#663052',15);hpBar(e,30);}
    else {circle(p.x,p.y+9,26,'#57445d');rect(p.x-21,p.y-9,42,32,flash?'#fff0a2':e.enraged?'#b93d55':'#743f67');rect(p.x-17,p.y-30,34,24,'#d6a983');rect(p.x-22,p.y-38,44,9,'#e9bd4f');rect(p.x-22,p.y-45,7,8,'#e9bd4f');rect(p.x-3,p.y-48,7,11,'#e9bd4f');rect(p.x+15,p.y-45,7,8,'#e9bd4f');rect(p.x-10,p.y-21,8,5,'#2a3140');rect(p.x+3,p.y-21,8,5,'#2a3140');text(e.enraged?'最終確認！':'魔王部長',p.x,p.y-57,e.enraged?'#b5213b':'#493648',13);if(e.state==='stunned')text('★ 気絶 ★',p.x,p.y+45,'#8b631d',13);hpBar(e,58);}
  }
}
