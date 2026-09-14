// Gameplay values and stage layout: logical pixels / seconds, zero-based tiles.
export const CONFIG = Object.freeze({width:480,height:640,tile:40,cols:12,rows:16,
  timeLimit:30,heroSpeed:160,bossSpeed:115,radius:12,warningTime:2,
  stunTime:1.2,penalty:3,protectionTime:2,repathTime:.25,maxDelta:.1,step:1/120,
  heroStart:[2,13],bossStart:[8,11],exit:[9,1],
  desks:[{from:3,to:7,row:10},{from:4,to:8,row:7},{from:2,to:6,row:4}]});
export const center = ([col,row]) => ({x:(col+.5)*CONFIG.tile,y:(row+.5)*CONFIG.tile});
export const solids=[];
for(let row=0;row<CONFIG.rows;row++) for(let col=0;col<CONFIG.cols;col++) {
  const wall=col===0||row===0||col===CONFIG.cols-1||row===CONFIG.rows-1;
  if(wall||CONFIG.desks.some(d=>row===d.row&&col>=d.from&&col<=d.to)) solids.push({x:col*40,y:row*40,w:40,h:40,wall,col,row});
}
