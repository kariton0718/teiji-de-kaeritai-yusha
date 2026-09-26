import { MOBS, ITEMS, BOSS_MOVES } from './combat-data.js?v=0.4.1';
export const PROFILES = [
  {
    "id": "hero",
    "group": "family",
    "name": "早く寝たい勇者",
    "quote": "今日こそ、早く寝る！",
    "description": "定時で帰った後も冒険は続く。モップを手に、家族と家事を乗り切る。",
    "where": "移動＋自動攻撃＋必殺"
  },
  {
    "id": "mama",
    "group": "family",
    "name": "ママ",
    "quote": "こっちは任せて！",
    "description": "気力を回復し、周りの家事も片づけてくれる心強いパートナー。",
    "where": "味方・回復と家事のお手伝い"
  },
  {
    "id": "pochi",
    "group": "family",
    "name": "ポチ",
    "quote": "わんっ！",
    "description": "落ちたアイテムを運ぶ、元気なお助け犬。お願いの準備もお手伝い。",
    "where": "味方・アイテム回収"
  },
  {
    "id": "child",
    "group": "family",
    "name": "男の子",
    "quote": "もう1冊だけ！",
    "description": "黄色の星柄パジャマに、くまのぬいぐるみ。お話が大好きな、かわいい強敵。",
    "where": "寝かしつけ・朝の支度／攻撃対象外"
  },
  {
    "id": "girl",
    "group": "family",
    "name": "女の子",
    "quote": "うさちゃんも一緒！",
    "description": "紫の月柄パジャマとミントのリボン。うさぎを抱いて、まだまだ遊びたい！",
    "where": "寝かしつけ・朝の支度／攻撃対象外"
  },
  {
    "id": "mob-block",
    "group": "mob",
    "name": "おもちゃブロック兵",
    "quote": "お片づけ？ まだ遊べるよ！",
    "description": "足元に集まるカラフルなブロックたち。モップでまとめてお片づけ。",
    "where": "リビング"
  },
  {
    "id": "mob-plate",
    "group": "mob",
    "name": "よごれ皿ランナー",
    "quote": "ごちそうさま、のその後に。",
    "description": "ソースを付けたお皿が大集合。晩ごはんの余韻は、洗い物の山！",
    "where": "キッチン"
  },
  {
    "id": "mob-sock",
    "group": "mob",
    "name": "くつしたジャンパー",
    "quote": "もう片方、どこ行った？",
    "description": "ふわふわ跳ねるしましま靴下。洗濯も朝の準備も、最後はこれ探し。",
    "where": "洗濯・朝の着替え"
  },
  {
    "id": "mob-bubble",
    "group": "mob",
    "name": "あわあわスライム",
    "quote": "ぷくぷく、まだまだ！",
    "description": "お風呂や歯磨きに現れる泡の魔物。丸い体と泡の帽子が目印。",
    "where": "お風呂・朝の歯磨き"
  },
  {
    "id": "mob-bag",
    "group": "mob",
    "name": "わすれものバッグ",
    "quote": "明日の準備、できてる？",
    "description": "タオルや持ち物を詰めた黄色いバッグ。玄関で最後の確認を待っている。",
    "where": "明日の準備"
  },
  {
    "id": "mob-star",
    "group": "mob",
    "name": "おめめぱっちりスター",
    "quote": "夜は、これから！",
    "description": "寝室に集まるきらきら星。にぎやかにしすぎず、おやすみを目指そう。",
    "where": "寝かしつけ"
  },
  {
    "id": "mob-pillow",
    "group": "mob",
    "name": "ねぼすけまくら",
    "quote": "あと5分だけ……。",
    "description": "やわらかい枕の誘惑。朝になっても、お布団から離れたくない！",
    "where": "朝の起床"
  },
  {
    "id": "mob-bread",
    "group": "mob",
    "name": "トーストダッシュ",
    "quote": "焼けたよ、急いで！",
    "description": "バターを乗せた元気なトースト。忙しい朝の食卓を駆け回る。",
    "where": "朝ごはん"
  },
  {
    "id": "boss-block",
    "group": "boss",
    "name": "散らかしゴーレム",
    "quote": "全部、まだ使うんだもん！",
    "description": "おもちゃ箱から生まれた大きな家事ボス。積み木の拳と汽車が目印。",
    "where": "第1戦・リビング"
  },
  {
    "id": "boss-plate",
    "group": "boss",
    "name": "焦げつきフライパン魔人",
    "quote": "ひと晩、つけ置きしたら？",
    "description": "頑固な焦げつきをまとったフライパン。大きな取っ手とヘラを構える。",
    "where": "第2戦・キッチン"
  },
  {
    "id": "boss-sock",
    "group": "boss",
    "name": "洗濯マウンテン",
    "quote": "たたんでも、たたんでも！",
    "description": "シャツ・タオル・靴下が積み重なった洗濯の山。家族で立ち向かおう。",
    "where": "第3戦・洗濯"
  },
  {
    "id": "boss-bubble",
    "group": "boss",
    "name": "水あかドラゴン",
    "quote": "ピカピカまでは、もうひと洗い！",
    "description": "泡と水あかをまとったお風呂のドラゴン。シャワーのしっぽがチャームポイント。",
    "where": "第4戦・お風呂"
  },
  {
    "id": "boss-bag",
    "group": "boss",
    "name": "忘れ物魔人「アレガナイ」",
    "quote": "鍵！ タオル！ あと何だっけ？",
    "description": "持ち物が集まった大きな魔物。準備したはずの「あれ」を探す最後の大仕事。",
    "where": "第5戦・明日の準備"
  }
];
for (const [id, mob] of Object.entries(MOBS)) {
  const existing = PROFILES.find(p => p.id === 'mob-' + id);
  if (existing) { existing.name = mob.name; existing.description += ' ' + mob.tip; }
  else PROFILES.push({id:'mob-'+id,group:'mob',name:mob.name,quote:mob.tip,description:`速さ ${mob.speed} ／ タフさ ${mob.hp}。部屋の進行に合わせ、ほかの魔物と混ざって登場。`,where:'家事の魔物・個性で見分けよう'});
}
PROFILES.find(p => p.id === 'mama').description = '勇者のそばへ移動。12秒ごとに気力18回復、5秒ごとにタオルで周囲の敵と飛び道具を片づける。チームワークで回復量もアップ！';
PROFILES.filter(p => p.group === 'boss').forEach((p,i) => p.description += ' 技：' + BOSS_MOVES[i].join('・') + '。HP60%・25%で攻撃が激化！');
PROFILES.push(
  {id:'boss-children',artId:'child',companion:'girl',group:'boss',name:'ふたりとも、ねむくない！',quote:'もう1冊！ うさちゃんも一緒！',description:'第6戦はふたりの寝かしつけ。3幕6ミッション。絵本と水を運び、おもちゃ12体を片づけ、逃げる子を誘い、子守歌とふたりのお布団へ。男の子の列車、女の子の枕、連携星弾幕の妨害が激化！子どもに攻撃は当たりません。',where:'第6戦・寝かしつけ／すやすやゲージ'},
  {id:'boss-clock',group:'boss',name:'朝の時間ドロボウ',quote:'あと5分？ もう出発の時間だよ！',description:'朝の4つのお支度のあとに現れる裏ボス。時計弾・交差針・家事総攻撃・秒針・連続弾幕・振り子・時間差プレス・三重奏の8技。大群の増援と、後半ほど短い攻撃間隔に注意。家族で乗り越え、送り出しと出社へ！',where:'裏ボス・翌朝の玄関'},
  ...Object.entries(ITEMS).map(([id,item]) => ({id:'item-'+id,group:'item',name:item.name,quote:item.label,description:'魔物を片づけると出現。近づいて拾うか、ポチがお届け。' + (['rice','milk'].includes(id) ? 'おにぎりは気力回復。ミルクは充填中のみ必殺＋12、必殺で発生したミルクは充填対象外。上限分は持ち越しません。' : '同じ効果は重ならず、残り時間が8秒に戻ります。'),where:'役立ちアイテム・効果は画面上に表示'}))
);
export const categories = [['all','全員'],['family','家族'],['mob','雑魚'],['boss','ボス'],['item','道具']];
export const profilesFor = group => PROFILES.filter(p => group === 'all' || p.group === group);
