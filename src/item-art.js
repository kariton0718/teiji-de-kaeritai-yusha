// Keep the original IDs for existing drops, saves, and tests.
const sources={drink:'chocolate',lunch:'onigiri'};
const images=Object.fromEntries(Object.entries(sources).map(([id,name])=>{const img=typeof Image==='undefined'?null:new Image();if(img){img.decoding='async';img.src=new URL(`../assets/items/${name}.webp`,import.meta.url).href;}return [id,img];}));
export function drawItemArt(ctx,type,x,y,size=48){const img=images[type];if(!img?.complete||!img.naturalWidth)return false;ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,x-size/2,y-size/2,size,size);ctx.restore();return true;}
