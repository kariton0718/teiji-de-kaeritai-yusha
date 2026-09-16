// One transparent atlas: fixed 7 x 3 cells, each sprite keeps a padded silhouette.
export const SPRITE_IDS=['hero','slime','bat','ghost','brute','sentry','returnBird','chair','cc','bomb','guardian','smog','hyena','chameleon','boss-leader','boss-chief','boss-manager','boss-director','boss-executive','boss-president','boss-auditor'];
const atlas=typeof Image==='undefined'?null:new Image();
if(atlas){atlas.decoding='async';atlas.src=new URL('../assets/combat-sprites-v1.webp',import.meta.url).href;}
export function drawCombatSprite(ctx,id,x,y,size,{flip=false,alpha=1}={}){
 if(!atlas?.complete||!atlas.naturalWidth)return false;
 const index=SPRITE_IDS.indexOf(id);if(index<0)return false;
 const cellW=atlas.naturalWidth/7,cellH=atlas.naturalHeight/3;
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha*=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 ctx.drawImage(atlas,(index%7)*cellW,Math.floor(index/7)*cellH,cellW,cellH,-size/2,-size*.68,size,size);ctx.restore();return true;
}
export const BOSS_SPRITES=SPRITE_IDS.slice(14);
