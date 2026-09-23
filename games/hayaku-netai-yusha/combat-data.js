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
export const NIGHT_MIX = [
  ['block','block','block','sock','dust','train','robot'],
  ['plate','plate','block','sock','bubble','bread','robot'],
  ['sock','sock','dust','block','towel','bag','alarm'],
  ['bubble','bubble','duck','brush','towel','dust','plate'],
  ['bag','block','train','robot','alarm','brush','sock','towel'],
  ['star','star','pillow','dust','sock','alarm'],
];
export const MORNING_MIX = [
  ['pillow','star','alarm','dust'], ['bread','plate','robot','bag'],
  ['brush','bubble','duck','towel'], ['sock','bag','train','alarm','dust'],
];
export const ITEMS = {
  rice: { name: 'おにぎり', label: '気力＋25', color: '#82d4a0' },
  milk: { name: 'ホットミルク', label: '必殺＋25', color: '#f2d376' },
  shoes: { name: '軽やかスニーカー', label: '8秒 スピードUP', color: '#8ed5ed' },
  gloves: { name: '家事グローブ', label: '8秒 威力UP', color: '#ffb17a' },
  apron: { name: 'お守りエプロン', label: '8秒 ダメージ半減', color: '#c7b2f4' },
};
export const SECRET_BOSS = { name: '出発前の最終決戦', room: 'entry', boss: '朝の時間ドロボウ', prop: 'clock', hp: 1800, quota: 0, action: '時計の予告をよけて、家族の朝を取り戻そう！' };
export const BOSS_MOVES = [
  ['ブロック落とし','おもちゃ大突進','積み木の行進'],
  ['ソース3連弾','焦げつき十字焼き','フライパン大噴火'],
  ['洗濯もの雪崩','ぐるぐる脱水','靴下大脱走'],
  ['水しぶき扇風','ウォーターライン','あわあわ大洪水'],
  ['忘れ物シャワー','通学バッグ突進','あれもこれも！'],
  ['まくらコロコロ','おもちゃパレード','まだ遊びたい！'],
  ['チクタク時計弾','遅刻の針','朝の総力戦'],
];
