import {center} from '../src/config.js';
// This driver uses movement, work and choice commands only; it never edits progress/position/time.
export function pilotInput(g){
  const C=g.config,job=g.jobs.find(j=>j.progress<j.duration);
  const target=job?center(C.stations.find(s=>s.id===job.station).spot):center(C.exit);
  if(job&&g.nearJob()?.id===job.id)return {x:0,y:0,action:true};
  const path=g.nav.findPath(g.hero,target);
  while(path.length>1&&g.nav.clearLine(g.hero,path[1]))path.shift();
  const next=g.nav.clearLine(g.hero,target)?target:path[0];
  return next?{x:next.x-g.hero.x,y:next.y-g.hero.y,action:false}:{x:0,y:0};
}
export function pilotChoice(g){return g.catches===1?'accept':g.shields?'shield':g.canChoose('tomorrow')?'tomorrow':'deflect';}
