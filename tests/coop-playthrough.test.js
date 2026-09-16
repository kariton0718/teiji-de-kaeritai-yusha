import test from 'node:test';
import assert from 'node:assert/strict';
import {CoopGame} from '../src/coop/game.js';
let seed=123;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
for(const loadout of [['exit','rush'],['blackhole','cannon'],['exit','clones']]){
test(`cooperative input-only full run: ${loadout.join(' + ')}`,()=>{const g=new CoopGame(loadout,rng);let steps=0;for(;steps<240*30&&['playing','upgrade'].includes(g.state);steps++){
 if(g.state==='upgrade'){g.choose(0,g.wave===1?'reply':'slash');g.choose(1,g.wave===1?'slash':'orbit');continue;}
 for(const p of g.players){let goal;const ally=g.players[1-p.id];if(ally.down)goal=ally;else if(g.phase==='escape')goal={x:420,y:65};else{const item=g.pickups.find(i=>p.hp<70);goal=item||g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||{x:220,y:320};}
 const range=Math.hypot(goal.x-p.x,goal.y-p.y);let dx=goal.x-p.x,dy=goal.y-p.y;if(!g.nav.clearLine(p,goal,12)){if(!p.pilotPath||steps%12===0)p.pilotPath=g.nav.findPath(p,goal);while(p.pilotPath.length&&Math.hypot(p.pilotPath[0].x-p.x,p.pilotPath[0].y-p.y)<9)p.pilotPath.shift();const next=p.pilotPath[0];if(next){dx=next.x-p.x;dy=next.y-p.y;}}else if(goal.type&&range<65){dx=-dx;dy=-dy;}else if(ally.down&&range<42){dx=0;dy=0;}
 const n=Math.hypot(dx,dy)||1;g.setInput(p.id,{x:dx/n,y:dy/n,ultimate:p.gauge>=100&&g.enemies.length>0});}
 g.update(1/30);
 }
assert.equal(g.state,'success');assert.equal(g.phase,'escape');assert.ok(g.boss.hp===0);assert.ok(g.elapsed<240);assert.ok(g.kills>=69);});
}
