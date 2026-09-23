export const WORLD = { width: 480, height: 620, maxEnemies: 128, maxEffects: 150, maxDrops: 24 };
export const NIGHT = [
  { name: 'リビングの大平原', room: 'living', boss: '散らかしゴーレム', prop: 'block', color: '#c79274', quota: 160, hp: 620, line: 'ただいま！ ……まずは、この床から。', action: 'おもちゃをまとめて、お片づけ！' },
  { name: 'キッチンの戦場', room: 'kitchen', boss: '焦げつきフライパン魔人', prop: 'plate', color: '#86b7a3', quota: 200, hp: 820, line: 'ママ「ごはんの準備、手分けしよう！」', action: '泡の連鎖で、洗い物をピカピカに！' },
  { name: '洗濯物の山脈', room: 'laundry', boss: '洗濯マウンテン', prop: 'sock', color: '#a4a5ce', quota: 240, hp: 1020, line: 'ポチ、靴下はおもちゃじゃないよ！', action: '洗濯物の群れを一気に片づけよう。' },
  { name: 'お風呂の大冒険', room: 'bath', boss: '水あかドラゴン', prop: 'bubble', color: '#71b9c1', quota: 280, hp: 1220, line: '子ども「アヒルさんも一緒に入る！」', action: '水流の予告をよけて、お風呂の支度！' },
  { name: '明日の準備', room: 'entry', boss: '忘れ物魔人「アレガナイ」', prop: 'bag', color: '#d5af6b', quota: 320, hp: 1420, line: '明日の自分を、今の自分が助ける。', action: 'ポチと一緒に忘れ物を探そう！' },
  { name: 'ふたりの寝かしつけ最終決戦', room: 'bedroom', boss: 'ふたりとも、ねむくない！', prop: 'star', color: '#8c94c6', quota: 0, hp: 0, line: '男の子「もう1冊！」 女の子「うさちゃんも一緒！」', action: 'お願いの輪に入って、ふたりのおやすみをお手伝い。' },
];
export const MORNING = [
  { name: 'おはようの攻防', room: 'bedroom', action: 'カーテンを開け、やさしく起こそう。', request: 'おはよう！', prop: 'pillow', color: '#e4b780', child: 'あと、5ふん……' },
  { name: '朝ごはん大作戦', room: 'kitchen', action: '朝ごはんを運んで、いただきます！', request: 'ごはんを運ぶ', prop: 'bread', color: '#d9b382', child: 'こっちのお皿がいい！' },
  { name: 'ピカピカ歯磨き', room: 'bath', action: '虫歯の魔物を片づけ、歯磨きをお手伝い。', request: '仕上げみがき', prop: 'bubble', color: '#8fc6c8', child: 'あーん！' },
  { name: 'お着替えラストスパート', room: 'entry', action: '着替えをそろえて、出発の準備！', request: '着替えを渡す', prop: 'sock', color: '#c5bd90', child: 'この服で行く！' },
];
export const SKILLS = [
  { id: 'mop', icon: '🧹', name: 'モップ旋風', detail: '振り幅と威力アップ。Lv.3で全周お片づけ。' },
  { id: 'bubble', icon: '🫧', name: '泡バブル', detail: '近くの敵から泡がはじけて連鎖する。' },
  { id: 'vacuum', icon: '🌀', name: 'お片づけ吸引', detail: '離れた魔物を引き寄せ、まとめて片づける。' },
  { id: 'clip', icon: '📎', name: '洗濯ばさみ連射', detail: '離れた魔物にも連続で届く。' },
  { id: 'heart', icon: '💛', name: '家族のチームワーク', detail: '気力の上限＋20。ママの回復もパワーアップ。' },
  { id: 'iron', icon: '✨', name: 'アイロン貫通ビーム', detail: '一直線に並んだ魔物をまとめて貫通！' },
  { id: 'towel', icon: '🪃', name: 'タオルブーメラン', detail: '敵を貫き、手元へ戻る。レベルで枚数アップ。' },
  { id: 'meteor', icon: '🧺', name: '洗濯かごメテオ', detail: 'かごをドーン！ 広い範囲を一気に片づける。' },
];
export const BED_REQUESTS = ['絵本を読む', 'お水を渡す', 'トントンする', '毛布をかける', '子守歌'];
export const STORY = {
  opening: [
    ['18:00 / 退勤', '今日も、定時で帰れた。今夜こそ、ふかふかの布団へ一直線……のはずだった。', 'office', 'story-01'],
    ['18:30 / ただいま', '「おかえり！」「パパ、遊ぼ！」ポチもしっぽを振る。この声を聞くために、帰ってきた。', 'home', 'story-02'],
    ['おうちは、冒険でいっぱい', '洗い物の山。脱走する靴下。床いっぱいのおもちゃ。布団までの道のりは、まだまだ長い！', 'family', 'story-03'],
    ['家族で、おやすみを勝ち取ろう', 'ママ「回復と援護は任せて！」ポチ「ワン！」勇者はモップを握る。もうひとつの冒険が、はじまる。', 'family', 'story-04'],
  ],
  night: [
    ['すう、すう……', '小さな寝息。そっと、毛布をかけた。', 'sleep'],
    ['今日も、おつかれさま', 'ママと目が合って、小さく笑う。ポチも丸くなった。', 'familySleep'],
    ['おやすみ、勇者。', 'やっと、自分も布団へ。家族みんなの夜が、静かに更ける。', 'nightEnd'],
  ],
  dawn: [
    ['翌朝 6:30', 'ピピピピ……。勇者「……もう朝！？」', 'alarm'],
    ['裏ステージ / 朝の総力戦', 'ママ「朝ごはんは任せて！」 ポチも、しっぽを振っている。', 'morning'],
  ],
  sendoff: [
    ['いってきます！', '靴を履いて、元気に手を振る。よし、今日も送り出せた。', 'sendoff'],
    ['……今、何時！？', 'ほっとした瞬間、時計を見た。次は、自分の出番だ！', 'rush'],
  ],
  true: [
    ['出社、間に合った。', '肩で息をしながら、身なりを整える。', 'office'],
    ['家族の朝を、乗り切った。', '「無事に着いたよ」のひと言に、ほっとする。', 'memory'],
    ['今日も、定時で帰ろう。', '夜も、朝も。勇者の冒険は、毎日の中にある。', 'trueEnd'],
  ],
};
