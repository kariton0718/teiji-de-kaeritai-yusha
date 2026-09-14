import {CONFIG as C,solids,center} from './config.js';
export function render(ctx,g){
  ctx.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const label=(text,x,y,color='#f5efdf',size=12)=>{ctx.fillStyle=color;ctx.font=`bold ${size}px "Meiryo",sans-serif`;ctx.textAlign='center';ctx.fillText(text,x,y);};
  rect(0,0,480,640,'#d5c7a9');
  for(let y=40;y<600;y+=40)for(let x=40;x<440;x+=40){rect(x,y,39,39,(x+y)%80?'#d5c7a9':'#ddcfb4');rect(x+6,y+32,16,1,'#cbbc9f');}
  for(const s of solids){if(s.wall){rect(s.x,s.y,40,40,'#354b56');rect(s.x+2,s.y+2,36,28,'#526672');rect(s.x+2,s.y+30,36,7,'#263d47');}}
  // Windows and a tiny company clock decorate the outer wall only.
  for(const x of [80,160,240]){rect(x,5,56,24,'#263d47');rect(x+3,8,50,18,'#9ac2c1');rect(x+26,8,3,18,'#526672');rect(x+4,8,18,3,'#d5e4d6');}
  rect(346,6,66,24,'#20343e');label('17:59',379,24,'#e8d5aa',14);
  const exit=center(C.exit);rect(exit.x-20,exit.y-20,40,40,'#2d6756');rect(exit.x-15,exit.y-15,30,33,'#83b98b');rect(exit.x-10,exit.y-10,20,28,'#285346');rect(exit.x+6,exit.y+5,3,3,'#ffe5a4');label('EXIT',exit.x,exit.y-23,'#e2efce',12);label('退勤 ↓',exit.x,exit.y+38,'#2d6756',12);
  for(const d of C.desks){
    for(let col=d.from;col<=d.to;col++){
      const x=col*40,y=d.row*40;rect(x+3,y+5,38,39,'#aa9f89');rect(x+3,y+30,5,10,'#52616a');rect(x+31,y+30,5,10,'#52616a');rect(x,y,40,31,'#657a80');rect(x+2,y+2,36,24,'#87999a');rect(x+3,y+27,34,4,'#445b65');rect(x+8,y+4,23,15,'#2a424d');rect(x+10,y+6,19,10,'#acd4cc');rect(x+12,y+8,11,2,'#e5ebca');rect(x+17,y+19,5,3,'#3b515c');rect(x+10,y+23,19,3,'#d9dcd0');
    }
  }
  // A marked starting mat makes the hero easy to find.
  rect(81,544,38,15,'#b7bca3');label('START',100,568,'#667c70',9);
  function actor(p,boss){
    const x=Math.round(p.x),y=Math.round(p.y),walk=g.state==='playing'&&g.stun===0?Math.floor(g.elapsed*8)%2:0;
    rect(x-13,y+12,27,5,'#a89e87');
    if(!boss&&g.protection>0){ctx.strokeStyle='#fef6c9';ctx.lineWidth=3;ctx.strokeRect(x-17,y-24,34,43);label('対応済み',x,y-31,'#245845',12);}
    rect(x-10,y-2,20,16,boss?'#823f67':'#2d72a0');rect(x-13,y+1,5,13,boss?'#a64f77':'#509ccd');rect(x+9,y+1,5,13,boss?'#a64f77':'#509ccd');
    rect(x-7,y+11,6,7+walk*2,'#293f4b');rect(x+3,y+11,6,9-walk*2,'#293f4b');
    rect(x-9,y-19,18,18,boss?'#b79aab':'#f2cd9d');rect(x-7,y-22,14,6,boss?'#52394f':'#c19a4c');
    if(boss){rect(x-13,y-24,5,10,'#e7cd9c');rect(x+8,y-24,5,10,'#e7cd9c');rect(x-9,y-11,8,5,'#263947');rect(x+2,y-11,8,5,'#263947');rect(x-1,y-10,3,2,'#263947');rect(x-2,y+1,5,8,'#e7ccaa');}
    else{rect(x-12,y-20,24,6,'#c2d1d0');rect(x-7,y-23,15,4,'#e9e9ce');rect(x-2,y-24,4,9,'#78aaa9');rect(x-5,y-10,3,3,'#293e49');rect(x+4,y-10,3,3,'#293e49');rect(x+3,y+2,5,7,'#f3eed7');rect(x+4,y+3,3,2,'#83b7b0');}
  }
  [ [g.hero,false],[g.boss,true] ].sort((a,b)=>a[0].y-b[0].y).forEach(([p,b])=>actor(p,b));
  if(g.stun>0){const x=Math.max(105,Math.min(375,g.boss.x)),y=Math.max(42,g.boss.y-65);rect(x-101,y-19,202,43,'#fff7e5');rect(x-4,y+24,8,8,'#fff7e5');label('ちょっといい？ 5分だけ！',x,y,'#56384c',13);label(`−${C.penalty}秒`,x,y+18,'#b04654',14);}
  else if(g.elapsed<C.warningTime&&g.state==='playing'){label('上司がこちらを見ている…',240,625,'#fff0c5',13);}
}
