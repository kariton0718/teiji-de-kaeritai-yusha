import {makeSolids} from '../config.js';
import {drawCombatSprite} from '../sprites.js';
const solids=makeSolids(1);
const colors=['#72dcff','#ffc96b'];
export function renderCoop(ctx,s,localId,time=0){
 ctx.clearRect(0,0,480,640);ctx.fillStyle='#d3c8b1';ctx.fillRect(0,0,480,640);
 for(let y=0;y<640;y+=40)for(let x=0;x<480;x+=40){ctx.strokeStyle='#b9b5a4';ctx.strokeRect(x,y,40,40);}
 for(const r of solids){ctx.fillStyle=r.wall?'#294553':'#819696';ctx.fillRect(r.x,r.y,r.w,r.h);if(!r.wall){ctx.fillStyle='#203f50';ctx.fillRect(r.x+7,r.y+6,26,18);ctx.fillStyle='#b9e4dc';ctx.fillRect(r.x+11,r.y+9,18,10);}}
 const circle=(x,y,r,color,fill=false)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;fill?ctx.fill():ctx.stroke();};
 const text=(t,x,y,color='#173746',size=12)=>{ctx.fillStyle=color;ctx.font=`bold ${size}px sans-serif`;ctx.textAlign='center';ctx.fillText(t,x,y);};
 const beam=(e,color,width,length)=>{ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(e.angle)*length,e.y+Math.sin(e.angle)*length);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 ctx.fillStyle=s?.phase==='escape'?'#bdea85':'#566764';ctx.fillRect(398,40,40,42);text(s?.phase==='escape'?'退勤':'出口',420,68);
 if(!s){text('2人で力を合わせて、定時退勤。',240,290);return;}
 for(const a of s.areas)circle(a.x,a.y,a.radius,a.fired?'#d6346766':'#a6195160',true);
 for(const e of s.enemies){if(e.state==='spawn'){circle(e.x,e.y,e.radius+8,'#a33465');text('!',e.x,e.y+5);continue;}if(e.state==='warn'){if(e.attack==='area')circle(e.x,e.y,e.type==='boss'?105:76,'#ab174b');else if(e.dir)beam({...e,angle:Math.atan2(e.dir.y,e.dir.x)},'#a71c5770',e.attack==='charge'?40:3,185);text('注意',e.x,e.y-52,'#9c1949');}}
 for(const item of s.pickups){circle(item.x,item.y,18,'#eec576',true);text('☕',item.x,item.y+5);}
 for(const e of s.effects){if(e.kind==='slash'){ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.arc(e.x,e.y,e.radius,e.angle-1.7,e.angle+1.7);ctx.closePath();ctx.fillStyle=e.owner===0?'#a1eeff50':'#ffe39a50';ctx.fill();}else if(e.kind==='beam')beam(e,'#ffe89e90',62,e.radius);else circle(e.x,e.y,e.radius,e.kind==='blackhole'?'#56378566':e.kind==='hurt'?'#ed476d':e.kind==='heal'?'#71d6ac':'#fff0a399',e.kind==='blackhole');}
 for(const shot of s.shots)circle(shot.x,shot.y,shot.radius,shot.owner<0?'#a02c62':colors[shot.owner],true);
 for(const e of s.enemies){if(e.state==='spawn')continue;const boss=e.type==='boss';if(!drawCombatSprite(ctx,boss?'boss-leader':e.type,e.x,e.y,boss?100:e.type==='brute'?84:64,{alpha:e.flash>0?.65:1}))circle(e.x,e.y,e.radius,boss?'#88576e':'#548b77',true);ctx.fillStyle='#4c3941';ctx.fillRect(e.x-20,e.y-47,40,4);ctx.fillStyle='#df5d77';ctx.fillRect(e.x-20,e.y-47,40*Math.max(0,e.hp/e.maxHp),4);}
 for(const p of s.players){const color=colors[p.id];circle(p.x,p.y+8,20,color);if(p.down){circle(p.x,p.y,18,'#4f516499',true);text('救助して！',p.x,p.y-28,'#9a2543');text(`${Math.min(100,Math.round(p.revive/3*100))}%`,p.x,p.y+5,'#fff');continue;}
  if(p.ultimate==='clones'&&p.effect>0)for(const dx of [-28,28])drawCombatSprite(ctx,'hero',p.x+dx,p.y,68,{alpha:.45});
  if(!drawCombatSprite(ctx,'hero',p.x,p.y,76,{flip:p.facing.x<0,alpha:p.invulnerable>0?.75:1}))circle(p.x,p.y,15,color,true);
  if(p.skills.orbit)for(let i=0;i<1+p.skills.orbit;i++){const angle=time*4+i*Math.PI;circle(p.x+Math.cos(angle)*54,p.y+Math.sin(angle)*54,7,color,true);}
  text(`${p.id+1}P${p.id===localId?' あなた':''}`,p.x,p.y-56,p.id===0?'#075a7a':'#79500e');
 }
 const boss=s.enemies.find(e=>e.type==='boss');if(boss){ctx.fillStyle='#322736';ctx.fillRect(85,15,310,15);ctx.fillStyle='#cb4778';ctx.fillRect(85,15,310*boss.hp/boss.maxHp,15);text('魔王リーダー',240,27,'#fff',11);}
 if(s.banner){ctx.fillStyle='#12313edd';ctx.fillRect(28,595,424,30);text(s.banner,240,615,'#ffebbc',13);}
}
