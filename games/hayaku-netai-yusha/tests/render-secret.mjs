// Optional bounded native Canvas QA, not an actual browser or device performance test.
import {createRequire} from 'node:module';
import {Painter} from '../render.js';
import {SleepGame} from '../game.js';
import {ART_IDS,artURL} from '../character-art.js';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {writeFileSync}=await import('node:fs');
const images=new Map(await Promise.all(ART_IDS.map(async id=>[id,await loadImage(new URL(artURL(id)).pathname)])));
const out=createCanvas(1440,620),ctx=out.getContext('2d');
for(let n=0;n<3;n++){
 const g=new SleepGame(()=>.41),canvas=createCanvas(480,620),p=new Painter(canvas,{get:id=>images.get(id)});
 g.begin();g.route='morning';g.morning=3;g.startSecretBoss();
 if(n<2)g.secretIntroTime=n?5.7:3.5;
 else{g.enterSecretBattle();g.hero.invulnerable=999;g.spawnCd=0;for(let i=0;i<50;i++)g.update(.05);g.mama.cooldown=0;g.updateAllies(.05);}
 p.draw(g,2,null);ctx.drawImage(canvas,n*480,0);
}
writeFileSync(process.argv[2]||'/tmp/secret-overdrive-preview.png',out.toBuffer('image/png'));
