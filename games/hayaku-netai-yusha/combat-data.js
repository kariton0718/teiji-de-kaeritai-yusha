// Silhouette, movement and attacks stay tied to the same character in every room.
export const MOBS = {
  block: { name: 'ころころブロック', hp: 22, speed: 42, radius: 12, behavior: 'chase', tip: '群れで押し寄せる。モップでまとめて！' },
  plate: { name: 'お皿フリスビー', hp: 24, speed: 38, radius: 13, behavior: 'ranged', tip: '少し離れてお皿を投げる。横によけよう。' },
  sock: { name: '脱走くつした', hp: 18, speed: 79, radius: 11, behavior: 'zigzag', tip: '左右に揺れながらすばやく接近。' },
  bubble: { name: 'ぷくぷく泡', hp: 16, speed: 34, radius: 12, behavior: 'spread', tip: 'ゆっくり広がる3方向の泡を出す。' },
  bag: { name: 'ぱんぱんバッグ', hp: 100, speed: 23, radius: 23, behavior: 'tank', tip: '大きくてタフ。連鎖や貫通技が有効。' },
  star: { name: '夜ふかしスター', hp: 20, speed: 64, radius: 11, behavior: 'orbit', tip: '周囲を回って近づく。全周攻撃で片づけよう。' },
  pillow: { name: 'もちもち枕', hp: 70, speed: 30, radius: 21, behavior: 'bounce', tip: 'ふくらんでから跳びこむ。着地予告に注意。' },
  bread: { name: 'トーストダッシュ', hp: 27, speed: 48, radius: 14, behavior: 'charge', tip: '一度止まり、まっすぐダッシュ！' },
  train: { name: '特急おもちゃ号', hp: 45, speed: 36, radius: 18, behavior: 'charge', tip: '赤い進路を見て横へ。突進後はすきだらけ。' },
  robot: { name: 'おもちゃシューター', hp: 42, speed: 24, radius: 16, behavior: 'ranged', tip: '離れた場所からボールを発射する。' },
  dust: { name: 'ほこりラビット', hp: 12, speed: 98, radius: 10, behavior: 'zigzag', tip: '最速だけどひ弱。吸引でまとめ取り！' },
  towel: { name: 'タオルガード', hp: 140, speed: 19, radius: 25, behavior: 'tank', tip: '最大級の耐久力。押し返されにくい。' },
  duck: { name: 'アヒル艦長', hp: 45, speed: 28, radius: 17, behavior: 'spread', tip: '3方向の水しぶき。近づきすぎないで。' },
  alarm: { name: 'おせっかい目覚まし', hp: 38, speed: 30, radius: 15, behavior: 'support', tip: '近くの魔物を加速する。先に片づけよう。' },
  brush: { name: '歯ブラシスナイパー', hp: 32, speed: 27, radius: 14, behavior: 'sniper', tip: '狙い線のあとに速いしぶき。予告中に移動！' },
};
// Persistent silhouettes, badges and attack families make roles readable in a crowd.
export const MOB_ROLES={
  chase:{badge:'群',color:'#bb6846'},ranged:{badge:'射',color:'#bc4a69'},zigzag:{badge:'速',color:'#227cb6'},
  spread:{badge:'散',color:'#9566bb'},tank:{badge:'硬',color:'#566782'},orbit:{badge:'回',color:'#ad8525'},
  bounce:{badge:'跳',color:'#b04c93'},charge:{badge:'突',color:'#df6232'},support:{badge:'援',color:'#308860'},sniper:{badge:'狙',color:'#a42e46'},
};
Object.assign(MOBS.dust,{speed:138,radius:9,tip:'青い「速」。小さく最速、耐久は最低。長い残像を残して接近！'});
Object.assign(MOBS.sock,{speed:88,tip:'青い「速」。大きなジグザグで横から回り込む。'});
Object.assign(MOBS.bag,{hp:190,radius:30,speed:17,tip:'灰色の「硬」。大きな体でゆっくり接近、近づくと地面をたたく。'});
Object.assign(MOBS.towel,{hp:240,radius:34,speed:13,tip:'最大サイズの「硬」。非常にタフで押し返しにくく、近くへ衝撃波。'});
Object.assign(MOBS.plate,{tip:'赤い「射」。投げたお皿が一度戻る。往復に注意！'});
Object.assign(MOBS.robot,{tip:'赤い「射」。止まって3発の速いボールを連射する。'});
Object.assign(MOBS.bubble,{tip:'紫の「散」。大きく遅い泡を5方向へ。すき間をくぐろう。'});
Object.assign(MOBS.duck,{tip:'紫の「散」。小さく速い水弾を7方向に広げる。'});
Object.assign(MOBS.pillow,{radius:25,tip:'桃色の「跳」。膨らんで飛び上がり、予告の丸へ本当に着地する。'});
Object.assign(MOBS.train,{tip:'橙の「突」。太い予告線のあと、長い直線突進。停止したら反撃！'});
Object.assign(MOBS.bread,{tip:'橙の「突」。短距離を猛ダッシュ。止まったところがチャンス！'});
Object.assign(MOBS.star,{tip:'金色の「回」。周回しながら星を3方向に飛ばす。'});
Object.assign(MOBS.brush,{tip:'赤い「狙」。長い照準線を固定して、最速の一発。横へ移動！'});
export const NIGHT_MIX = [
  ['block','block','block','sock','dust','train','robot'],
  ['plate','plate','block','sock','bubble','bread','robot'],
  ['sock','sock','dust','block','towel','bag','alarm'],
  ['bubble','bubble','duck','brush','towel','dust','plate'],
  ['bag','block','train','robot','alarm','brush','sock','towel'],
  ['star','star','pillow','dust','sock','alarm','train','robot','bubble','towel'],
];
export const MORNING_MIX = [
  ['pillow','star','alarm','dust'], ['bread','plate','robot','bag'],
  ['brush','bubble','duck','towel'], ['sock','bag','train','alarm','dust'],
];
export const SECRET_MIX=['bread','brush','robot','train','alarm','duck','towel','bag','sock','star'];
export const HOSTILE_DAMAGE_SCALE=1.3;
export const ITEMS = {
  rice: { name: 'おにぎり', label: '気力＋25', color: '#82d4a0' },
  milk: { name: 'ホットミルク', label: '必殺＋12（充填中）', color: '#f2d376' },
  shoes: { name: '軽やかスニーカー', label: '8秒 スピードUP', color: '#8ed5ed' },
  gloves: { name: '家事グローブ', label: '8秒 威力UP', color: '#ffb17a' },
  apron: { name: 'お守りエプロン', label: '8秒 ダメージ半減', color: '#c7b2f4' },
};
export const SECRET_BOSS = { name: '出発前の最終決戦', room: 'entry', boss: '朝の時間ドロボウ', prop: 'clock', hp: 1800, quota: 0, action: '時計の予告をよけて、家族の朝を取り戻そう！' };
export const BOSS_MOVES = [
  ['ブロック落とし','おもちゃ大突進','積み木の行進','積み木のドミノ','おもちゃ列車クロス'],
  ['ソース3連弾','焦げつき十字焼き','フライパン大噴火','フライパンブーメラン','焦げつきホットゾーン'],
  ['洗濯もの雪崩','ぐるぐる脱水','靴下大脱走','タオル竜巻','時間差お洗濯プレス'],
  ['水しぶき扇風','ウォーターライン','あわあわ大洪水','うずしおリング','交互のシャワーカーテン'],
  ['忘れ物シャワー','通学バッグ突進','あれもこれも！','鍵束ブーメラン','忘れ物ジグザグ便'],
  ['まくらコロコロ','おもちゃパレード','まだ遊びたい！','毛布ひらひら','もう一周あそぼ！'],
  ['チクタク時計弾','遅刻の針','朝の総力戦','秒針の追いかけっこ','ラストミニット','振り子ブーメラン','時間差タイムプレス','最終ベルの三重奏'],
];
