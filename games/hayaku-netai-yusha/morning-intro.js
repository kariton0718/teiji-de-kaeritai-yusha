// Bounded Canvas scene using the existing family illustrations.
export function drawMorningIntro(p,kind,t){
 const c=p.ctx,alarm=kind==='alarm';
 const sky=c.createLinearGradient(0,0,0,620);sky.addColorStop(0,'#719fb7');sky.addColorStop(.4,'#ffe1a6');sky.addColorStop(1,'#be947c');p.rect(0,0,480,620,0,sky);
 const glow=c.createRadialGradient(363,100,4,363,100,240);glow.addColorStop(0,'#fffbe4');glow.addColorStop(.35,'#ffe9aacc');glow.addColorStop(1,'#ffe5a000');p.rect(0,0,480,450,0,glow);
 c.save();c.translate(363,100);c.rotate(Math.sin(t*.15)*.08);c.fillStyle='#fff5ce25';
 for(let i=0;i<9;i++){c.rotate(Math.PI*2/9);c.beginPath();c.moveTo(0,0);c.lineTo(-30,530);c.lineTo(35,530);c.closePath();c.fill();}c.restore();
 // Layered town beyond the window, with morning clouds.
 for(let i=0;i<8;i++){const x=i*68-20,h=35+i*17%65;p.rect(x,236-h,60,h,3,i%2?'#b9bac0':'#a6b8bd');for(let j=0;j<3;j++)p.rect(x+10+j*15,244-h,7,10,1,'#fff0c6');}
 for(let i=0;i<3;i++){const x=(i*183+t*5)%620-70;p.rect(x,67+i*39,90,15,9,'#ffffff66');}
 p.rect(20,20,440,238,12,'#ffffff00','#fbeac9');p.rect(28,28,424,222,8,'#ffffff00','#a97e59');p.line(240,29,240,245,'#f2dfb9',7);p.line(30,166,450,166,'#f2dfb9',6);
 for(const x of [0,414]){p.rect(x,0,66,280,0,'#547981');for(let j=0;j<4;j++)p.line(x+9+j*15,0,x+9+j*15,270,'#6c959c',6);p.rect(x,202,66,12,4,'#e5bc72');}
 p.rect(0,262,480,358,0,'#b78c70');for(let i=0;i<8;i++)p.line(0,282+i*34,480,282+i*34,'#97745e55',2);
 p.rect(26,280,428,116,22,'#6f8387','#eed3a1');p.rect(35,287,410,100,18,'#8ea4a4','#bfc4a8');
 // Large ringing brass alarm: 6:30, with subtle shake instead of flashing.
 c.save();c.translate(240,139);c.rotate(alarm?Math.sin(t*20)*.025:0);c.shadowColor='#fff1c2';c.shadowBlur=18;
 p.circle(0,0,79,'#ab7855','#ffdea0');p.circle(0,0,70,'#f6d997');p.circle(0,0,61,'#fff6d9','#c49658');c.shadowBlur=0;
 for(let i=0;i<12;i++){const a=i*Math.PI/6;p.line(Math.sin(a)*51,-Math.cos(a)*51,Math.sin(a)*56,-Math.cos(a)*56,'#7b6552',i%3?2:4);}
 p.line(0,0,0,43,'#3c5263',4);p.line(0,0,-8,29,'#3c5263',6);p.circle(0,0,5,'#b7804f');p.text('6:30',0,-18,23,'#3c5263');
 p.circle(-52,-66,20,'#eac281','#96704e');p.circle(52,-66,20,'#eac281','#96704e');p.line(-42,66,-50,83,'#a37551',8);p.line(42,66,50,83,'#a37551',8);c.restore();
 if(alarm)for(const side of [-1,1])for(let i=0;i<3;i++){const x=240+side*(99+i*13);p.line(x,104+i*8,x+side*6,122+i*8,'#fff4c4',3);}
 p.person(103,327+Math.sin(t*2)*2,'hero',1.65);p.person(363,322,'mama',1.55);
 p.person(194,343+Math.sin(t*3)*3,'child',1.2);p.person(277,343+Math.sin(t*3+1)*3,'girl',1.2);p.dog(403,378,1.1);
 for(let i=0;i<20;i++){const x=20+i*71%440,y=35+(i*47+t*12)%360;p.circle(x,y,1+i%2,'#fff4d199');}
 p.rect(104,404,272,35,17,'#304a60dd','#e7c789');p.text(alarm?'朝が来た。家族の冒険、再開！':'家族総出の、朝の総力戦！',240,422,16,'#fff1c9');
}
