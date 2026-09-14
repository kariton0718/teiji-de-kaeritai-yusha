import {CONFIG as C,center} from '../src/config.js';
import {findPath,clearLine} from '../src/pathfinding.js';

// Test driver uses only normal movement/work/choice inputs. No teleport or timer edits.
export function pilotInput(g){
  const job=g.jobs.find(j=>j.progress<j.duration);
  const target=job?center(C.stations.find(s=>s.id===job.station).spot):center(C.exit);
  if(job&&g.nearJob()?.id===job.id)return {x:0,y:0,action:true};
  const path=findPath(g.hero,target);
  while(path.length>1&&clearLine(g.hero,path[1]))path.shift();
  const next=clearLine(g.hero,target)?target:path[0];
  if(!next)return {x:0,y:0};
  const dx=next.x-g.hero.x,dy=next.y-g.hero.y;
  return {x:dx,y:dy,action:false};
}
