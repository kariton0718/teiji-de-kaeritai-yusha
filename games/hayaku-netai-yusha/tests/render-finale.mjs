// Optional native Canvas visual QA; not part of node --test.
import {createRequire} from 'node:module';
import {Painter} from '../render.js';
import {SleepGame} from '../game.js';
import {ART_IDS,artURL} from '../character-art.js';
import {MOBS} from '../combat-data.js';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),sharp=require('sharp');
const images=new Map(await Promise.all(ART_IDS.map(async id=>[id,await loadImage(new URL(artURL(id)).pathname)])));
const out=createCanvas(1440,620),c=out.getContext('2d');
for(let n=0;n<3;n++){
  const g=new SleepGame(()=>.41),canvas=createCanvas(480,620),p=new Painter(canvas,{get:id=>images.get(id)});
  g.begin();g.stage=5;g.enterRoom();g.warnings=[];
  if(n===0){g.helped=2;g.nextRequest();g.bedTurn=2;g.bedAttackCd=0;g.updateTask(.01);Object.entries(MOBS).forEach(([prop,s],i)=>g.enemies.push({...s,prop,x:50+i%5*95,y:290+Math.floor(i/5)*92,maxHp:s.hp,flash:0}));g.hero.y=490;g.bedBannerLife=0;}
  else{g.route='morning';g.state='sendoff';g.beginCommute();g.commuteRun.distance=n===1?850:1600;g.commuteRun.phase=n===1?1:2;g.commuteRun.moving=n===1;g.commuteRun.arrival=n===2?1:0;g.hero.x=n===1?240:330;}
  p.draw(g,1,null);c.drawImage(canvas,n*480,0);
}
await sharp(out.toBuffer('image/png')).webp({quality:90}).toFile(new URL('../../../docs/project/finale-commute-preview.webp',import.meta.url).pathname);
console.log('Saved finale-commute-preview.webp');
