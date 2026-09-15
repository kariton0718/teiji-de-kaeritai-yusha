// Only this game's own key is touched. Invalid/unavailable storage degrades to memory.
export const SAVE_KEY='leave-on-time-hero.progress.v1';
export const RANKS=['議事録に敗れし者','魔王商事の新たな管理職','ギリギリ退勤兵','盾を使い切った帰宅王','有給を守りし仕事人','華麗なる引き継ぎ職人','伝説の定時勇者'];
export const blank=()=>({version:1,unlocked:1,best:{}});
export function validate(raw){
  if(!raw||raw.version!==1)return blank();
  const result=blank();
  result.unlocked=Number.isInteger(raw.unlocked)?Math.min(3,Math.max(1,raw.unlocked)):1;
  for(const id of [1,2,3]){
    const b=raw.best?.[id];
    if(b&&RANKS.includes(b.rank)&&Number.isFinite(b.time)&&b.time>=0)result.best[id]={rank:b.rank,time:b.time};
  }
  return result;
}
export class ProgressStore {
  constructor(storage,key=SAVE_KEY){this.storage=storage;this.key=key;this.available=true;this.data=blank();this.load();}
  load(){
    try{const raw=this.storage?.getItem(this.key);this.data=raw?validate(JSON.parse(raw)):blank();if(!this.storage)this.available=false;}
    catch{this.data=blank();this.available=false;}
    return this.data;
  }
  save(){try{if(!this.storage)throw Error('No storage');this.storage.setItem(this.key,JSON.stringify(this.data));this.available=true;}catch{this.available=false;}}
  record(game){
    let unlocked=false;
    if(game.outcome==='success'&&game.stageId<3&&this.data.unlocked<game.stageId+1){this.data.unlocked=game.stageId+1;unlocked=true;}
    const old=this.data.best[game.stageId],rank=game.rank,time=game.elapsed;
    if(!old||RANKS.indexOf(rank)>RANKS.indexOf(old.rank)||(rank===old.rank&&time<old.time))this.data.best[game.stageId]={rank,time};
    this.save();return unlocked;
  }
  reset(){this.data=blank();try{this.storage?.removeItem(this.key);this.available=!!this.storage;}catch{this.available=false;}}
}
