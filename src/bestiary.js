import {CONFIG as C,ENEMIES,stageWaves} from './config.js';

// Public roster only. The optional encounter is intentionally never enumerated here.
export const MOB_PROFILES=[
 ['slime','「その書類、もう一部。」','じわじわ接近する基本の敵。まとめて斬って気持ちよく処理しよう。'],
 ['bat','「全員に共有しました。」','封筒の羽から扇状のメール弾を放つ。予告の隙間を抜けよう。'],
 ['ghost','「今、お電話よろしいですか？」','呼び出し音の後に一直線に突進。横へ動いてかわそう。'],
 ['brute','「締切は、今日です。」','大型の耐性持ち。近くでは範囲攻撃、遠くでは督促弾を使う。'],
 ['sentry','「進捗、見ています。」','距離を取りながら三方向に射撃。囲まれる前に倒したい。'],
 ['returnBird','「ここ、直して再提出で。」','赤字の書類が飛んで戻る。往路を避けても帰り道に注意。'],
 ['chair','「その会議、立って済ませませんか？」','椅子に乗って一直線に猛突進。壁にぶつかった隙に反撃しよう。'],
 ['cc','「念のため、CCを追加します。」','小さな封筒バットを増やす。増殖する前に優先して倒そう。'],
 ['bomb','「あと、3秒です。」','近づくとカウントダウン。先に倒せば爆発で周囲の敵を巻き込める。'],
 ['guardian','「承認が下りるまで、お待ちください。」','正面の盾でダメージを軽減。振り下ろし後の隙や背後を狙おう。'],
 ['smog','「まだ、みんな残っていますよ。」','紫の沼を残し、踏むと移動速度が40％になる。明るい床を選んで進もう。'],
 ['hyena','「その差し入れ、いただきます。」','回復アイテムを盗んで逃げる。倒せば回収、逃げても5秒後に手放す。'],
 ['chameleon','「やっぱり、仕様が変わりました。」','青は三方向射撃、橙は突進。予告中の色と向きを見よう。']
].map(([id,quote,description])=>({id,name:ENEMIES[id].name,quote,description,image:`assets/bestiary/${id}.webp`,stages:C.stages.filter(s=>stageWaves(s.id).flat().some(g=>g.type===id)).map(s=>s.id)}));
const BOSS_COPY=[
 ['leader','「全員、集合！」','横移動からの突進と小隊の増援。最初の指揮官。'],
 ['chief','「承認印を受けろ！」','巨大ハンコで着地し、連続スタンプと衝撃波を放つ。'],
 ['manager','「複写しておいた！」','コピー分身を残して移動。紙の弾幕を広げる。'],
 ['director','「寸法どおりに働け！」','体力半分で鬼神部長へ覚醒。赤いオーラと高速三連突進、巨大定規の薙ぎ払いに注意。'],
 ['executive','「ドローン、包囲しろ！」','体力半分で機動要塞専務へ変形。6機のドローンを展開し、番号順の連続爆撃と交差レーザーで追い詰める。'],
 ['president','「最終決裁を下す！」','玉座機械から極太レーザー。弾幕、床攻撃、机の再配置を操る。']
];
export const BOSS_PROFILES=C.stages.map((stage,index)=>({id:`boss-${BOSS_COPY[index][0]}`,name:`魔王${stage.rank}`,quote:BOSS_COPY[index][1],description:BOSS_COPY[index][2],image:`assets/bestiary/boss-${BOSS_COPY[index][0]}.webp`,stages:[stage.id]}));

export const ALLY_PROFILES=[
 {id:'ally-healer',name:'総務の小春',quote:'「少し休憩しましょう♪」',description:'たまに駆けつける回復役。7秒間ついてきて、気力を12ずつ最大3回回復。差し入れのコーヒーで、もうひと頑張り。'},
 {id:'ally-striker',name:'営業の黒沢',quote:'「ここは俺に任せろ。先に帰れ。」',description:'渋いベテランの攻撃役。10秒間、書類キャノンの5方向貫通弾を高速連射。射程も長く、敵の群れをまとめて押し返す。助っ人の撃破では必殺ゲージは増えない。'}
].map(p=>({...p,image:`assets/${p.id}.webp`,stages:C.stages.map(s=>s.id)}));

export function mountBestiary(root){
 const heading=document.createElement('h2');heading.textContent='魔王商事・社員名鑑';root.append(heading);
 const lead=document.createElement('p');lead.className='bestiary-lead';lead.textContent='頼れる助っ人2人、仕事の魔物13種と、6人の役職魔王。横にスワイプしてチェック。';root.append(lead);
 const filters=document.createElement('div');filters.className='bestiary-filters';filters.setAttribute('aria-label','登場フロアで絞り込み');root.append(filters);
 const cards=[],galleries=[];
 function navigation(rail,title){
  const nav=document.createElement('div');nav.className='bestiary-navigation';
  const prev=document.createElement('button'),next=document.createElement('button'),info=document.createElement('span'),count=document.createElement('b'),hint=document.createElement('small');
  rail.id=`bestiary-rail-${galleries.length}`;
  for(const [button,label,text] of [[prev,'前のキャラクター','‹ 前へ'],[next,'次のキャラクター','次へ ›']]){button.type='button';button.textContent=text;button.setAttribute('aria-label',`${title}：${label}`);button.setAttribute('aria-controls',rail.id);}
  info.className='bestiary-position';count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');hint.textContent='← 横にスワイプ →';info.append(count,hint);nav.append(prev,info,next);root.insertBefore(nav,rail);
  const visible=()=>[...rail.children].filter(card=>!card.hidden);
  function current(items){if(!items.length)return 0;const edge=rail.getBoundingClientRect().left+parseFloat(getComputedStyle(rail).paddingLeft||0);let best=0,distance=Infinity;items.forEach((card,i)=>{const d=Math.abs(card.getBoundingClientRect().left-edge);if(d<distance){distance=d;best=i;}});return best;}
  function update(){const items=visible(),index=current(items);count.textContent=items.length?`${index+1} / ${items.length}`:'0 / 0';prev.disabled=index===0;next.disabled=index>=items.length-1;hint.textContent=items.length>1?'← 横にスワイプ →':'このフロアは1キャラクター';}
  function move(delta){const items=visible(),target=items[Math.max(0,Math.min(items.length-1,current(items)+delta))];if(!target)return;const edge=rail.getBoundingClientRect().left+parseFloat(getComputedStyle(rail).paddingLeft||0);rail.scrollTo({left:rail.scrollLeft+target.getBoundingClientRect().left-edge,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  prev.onclick=()=>move(-1);next.onclick=()=>move(1);let pending=false;rail.addEventListener('scroll',()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update();});},{passive:true});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(rail);galleries.push({rail,update});update();
 }

 function section(title,profiles){const heading=document.createElement('h3');heading.textContent=title;root.append(heading);const rail=document.createElement('div');rail.className='bestiary-rail';rail.tabIndex=0;rail.setAttribute('aria-label',title);root.append(rail);for(const profile of profiles){const card=document.createElement('article');card.className='bestiary-card';const img=document.createElement('img');img.src=profile.image;img.alt=profile.name;img.width=512;img.height=512;img.loading='lazy';img.decoding='async';const name=document.createElement('h4');name.textContent=profile.name;const quote=document.createElement('p');quote.className='bestiary-quote';quote.textContent=profile.quote;const description=document.createElement('p');description.textContent=profile.description;const stages=document.createElement('small');stages.textContent=profile.id.startsWith('ally-')?'全フロアにまれに登場・各階最大1人':profile.stages.map(id=>`${id}F ${C.stages[id-1].name}`).join(' / ');card.append(img,name,quote,description,stages);rail.append(card);cards.push({card,profile,rail});}navigation(rail,title);}
 section('たまに助けに来る社員',ALLY_PROFILES);section('仕事の魔物',MOB_PROFILES);section('立ちはだかる役職魔王',BOSS_PROFILES);
 for(const id of [0,...C.stages.map(s=>s.id)]){const button=document.createElement('button');button.type='button';button.textContent=id?`${id}F ${C.stages[id-1].rank}`:'全フロア';button.setAttribute('aria-pressed',String(id===0));button.addEventListener('click',()=>{for(const b of filters.children)b.setAttribute('aria-pressed',String(b===button));for(const {card,profile,rail} of cards){card.hidden=!!id&&!profile.stages.includes(id);rail.scrollLeft=0;}for(const gallery of galleries)gallery.update();});filters.append(button);}
}
