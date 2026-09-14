import {CONFIG as C,solids,center} from './config.js';
export function render(ctx,g,time=0,effects=true){
  ctx.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const label=(text,x,y,color='#f5efdf',size=12)=>{ctx.fillStyle=color;ctx.font=`bold ${size}px "Meiryo",sans-serif`;ctx.textAlign='center';ctx.fillText(text,x,y);};
  const dash=g.phase==='dash';
  rect(0,0,480,640,dash?'#eee1b3':'#d5c7a9');
  for(let y=40;y<600;y+=40)for(let x=40;x<440;x+=40){rect(x,y,39,39,(x+y)%80?(dash?'#ead9a7':'#d5c7a9'):(dash?'#f3e8c5':'#ddcfb4'));rect(x+6,y+32,16,1,'#cbbc9f');}
  for(const s of solids){if(s.wall){rect(s.x,s.y,40,40,'#354b56');rect(s.x+2,s.y+2,36,28,'#526672');rect(s.x+2,s.y+30,36,7,'#263d47');}}
  // Windows and a tiny company clock decorate the outer wall only.
  for(const x of [80,160,240]){rect(x,5,56,24,'#263d47');rect(x+3,8,50,18,'#9ac2c1');rect(x+26,8,3,18,'#526672');rect(x+4,8,18,3,'#d5e4d6');}
  rect(346,6,66,24,'#20343e');label(g.clock,379,24,'#e8d5aa',14);
  const exit=center(C.exit);
  rect(exit.x-20,exit.y-20,40,40,dash?'#2d6756':'#5c6262');
  rect(exit.x-15,exit.y-15,30,33,dash?'#cfe8a4':'#838783');
  rect(exit.x-10,exit.y-10,20,28,dash?'#fff4c7':'#454f53');
  if(dash){label('↑',exit.x,exit.y+12,'#356451',25);label('退勤！',exit.x,exit.y+39,'#2d6756',14);}
  else {rect(exit.x-6,exit.y,12,9,'#e2ba75');rect(exit.x-4,exit.y-5,8,5,'#e2ba75');label('業務待ち',exit.x,exit.y+39,'#535f57',12);}
  label('EXIT',exit.x,exit.y-23,'#e2efce',12);
  for(const d of C.desks){
    for(let col=d.from;col<=d.to;col++){
      const x=col*40,y=d.row*40;rect(x+3,y+5,38,39,'#aa9f89');rect(x+3,y+30,5,10,'#52616a');rect(x+31,y+30,5,10,'#52616a');rect(x,y,40,31,'#657a80');rect(x+2,y+2,36,24,'#87999a');rect(x+3,y+27,34,4,'#445b65');rect(x+8,y+4,23,15,'#2a424d');rect(x+10,y+6,19,10,'#acd4cc');rect(x+12,y+8,11,2,'#e5ebca');rect(x+17,y+19,5,3,'#3b515c');rect(x+10,y+23,19,3,'#d9dcd0');
    }
  }
  // Fixtures are solid; the numbered circle in front is the work position.
  C.stations.forEach((s,i)=>{
    const p=center(s.tile),spot=center(s.spot),jobs=g.jobs.filter(j=>j.station===s.id);
    const done=jobs.every(j=>j.progress>=j.duration),progress=jobs.reduce((a,j)=>a+j.progress,0)/jobs.reduce((a,j)=>a+j.duration,0);
    ctx.strokeStyle=done?'#447d5e':'#94723a';ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(spot.x,spot.y,C.workRange,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    rect(spot.x-11,spot.y-10,22,22,done?'#41765b':'#8f7546');label(done?'✓':String(i+1),spot.x,spot.y+6,'#fff9dd',16);
    rect(p.x-18,p.y-18,36,36,s.id==='handoff'?'#b2baa1':'#6a8186');
    if(s.id==='report'){
      rect(p.x-14,p.y-15,28,21,'#294951');rect(p.x-11,p.y-12,22,14,'#a7dfd2');
      rect(p.x-8,p.y-9,14,2,'#438784');rect(p.x-8,p.y-5,10,2,'#438784');rect(p.x-12,p.y+10,25,4,'#f3efd8');
    }else if(s.id==='print'){
      rect(p.x-15,p.y-11,30,24,'#e1e0d4');rect(p.x-10,p.y-16,20,9,'#fcf5df');rect(p.x-11,p.y+2,22,7,'#425f66');rect(p.x+7,p.y-7,5,4,'#68a781');
    }else{
      rect(p.x-10,p.y-4,20,18,'#3f886b');rect(p.x-8,p.y-18,16,16,'#e7c99b');rect(p.x-9,p.y-20,18,6,'#626153');
      rect(p.x-5,p.y-11,3,3,'#293e49');rect(p.x+3,p.y-11,3,3,'#293e49');rect(p.x+2,p.y+1,6,9,'#f5ead0');
    }
    const name=s.id==='print'?'② 印刷':s.id==='handoff'?'③ 引き継ぎ':'① 報告書';
    label(name,p.x,p.y-26,'#264d48',13);
    rect(spot.x-22,spot.y+28,44,5,'#9a947b');rect(spot.x-22,spot.y+28,Math.round(44*progress),5,done?'#3d8059':'#f2cc74');
  });
  function actor(p,boss){
    const x=Math.round(p.x),y=Math.round(p.y),walk=g.state==='playing'&&!g.working?Math.floor(g.elapsed*8)%2:0;
    rect(x-13,y+12,27,5,'#a89e87');
    if(!boss&&g.protection>0){ctx.strokeStyle='#fef6c9';ctx.lineWidth=3;ctx.strokeRect(x-17,y-24,34,43);label('対応済み',x,y-31,'#245845',12);}
    rect(x-10,y-2,20,16,boss?'#823f67':'#2d72a0');rect(x-13,y+1,5,13,boss?'#a64f77':'#509ccd');rect(x+9,y+1,5,13,boss?'#a64f77':'#509ccd');
    rect(x-7,y+11,6,7+walk*2,'#293f4b');rect(x+3,y+11,6,9-walk*2,'#293f4b');
    rect(x-9,y-19,18,18,boss?'#b79aab':'#f2cd9d');rect(x-7,y-22,14,6,boss?'#52394f':'#c19a4c');
    if(boss){rect(x-13,y-24,5,10,'#e7cd9c');rect(x+8,y-24,5,10,'#e7cd9c');rect(x-9,y-11,8,5,'#263947');rect(x+2,y-11,8,5,'#263947');rect(x-1,y-10,3,2,'#263947');rect(x-2,y+1,5,8,'#e7ccaa');}
    else{rect(x-12,y-20,24,6,'#c2d1d0');rect(x-7,y-23,15,4,'#e9e9ce');rect(x-2,y-24,4,9,'#78aaa9');rect(x-5,y-10,3,3,'#293e49');rect(x+4,y-10,3,3,'#293e49');rect(x+3,y+2,5,7,'#f3eed7');rect(x+4,y+3,3,2,'#83b7b0');}
  }
  if(g.working){
    const job=g.jobs.find(j=>j.id===g.working);
    ctx.strokeStyle='#fff6c7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(g.hero.x,g.hero.y,21,-Math.PI/2,-Math.PI/2+Math.PI*2*job.progress/job.duration);ctx.stroke();
  }
  [ [g.hero,false],[g.boss,true] ].sort((a,b)=>g.protection>0?(a[1]?-1:1):a[0].y-b[0].y).forEach(([p,b])=>actor(p,b));
  if(g.state==='encounter'){label('ちょっといい？',g.boss.x,Math.max(45,g.boss.y-38),'#803d64',14);}
  else if(g.elapsed<C.warningTime&&g.state==='playing')label('上司はまだメールを読んでいる…',240,625,'#fff0c5',13);
  else if(g.state==='playing')label(dash?'業務完了 → 右上の出口へ！':g.working?'作業中：離して逃げても進捗保存':'番号の丸に立って E / Space 長押し',240,625,'#fff0c5',12);
  if((g.celebration>0||g.outcome==='success')&&effects){
    const colors=['#f5c66f','#78bca0','#fbf0bd','#d697a9','#82b8d0'];
    for(let i=0;i<44;i++){const x=(i*73+Math.sin(time*1.8+i)*17)%480,y=(i*47+time*65)%640;rect(x,y,5,9,colors[i%colors.length]);}
  }
}
