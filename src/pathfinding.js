import {CONFIG,solids,center} from './config.js';
export function blocked(x,y,r=CONFIG.radius){
  return solids.some(s=>Math.hypot(x-Math.max(s.x,Math.min(x,s.x+s.w)),y-Math.max(s.y,Math.min(y,s.y+s.h)))<r-.00001);
}
export function clearLine(a,b){
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
  for(let i=0;i<=n;i++){const t=n?i/n:0;if(blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}
  return true;
}
export function findPath(a,b){
  const tile=p=>[Math.floor(p.x/40),Math.floor(p.y/40)];
  const start=tile(a),goal=tile(b),key=p=>p.join(',');
  const queue=[start],parents=new Map([[key(start),null]]);
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(key(p)===key(goal))break;
    for(const [dx,dy] of [[1,0],[0,-1],[-1,0],[0,1]]){
      const q=[p[0]+dx,p[1]+dy],c=center(q);
      if(q[0]<1||q[0]>10||q[1]<1||q[1]>14||parents.has(key(q))||blocked(c.x,c.y))continue;
      parents.set(key(q),p);queue.push(q);
    }
  }
  if(!parents.has(key(goal)))return [];
  const path=[];for(let p=goal;p;p=parents.get(key(p)))path.unshift(center(p));
  path.push({...b});return path;
}
export function move(body,dx,dy){
  if(!blocked(body.x+dx,body.y))body.x+=dx;
  if(!blocked(body.x,body.y+dy))body.y+=dy;
}
