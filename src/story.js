export const OPENING=[
  {image:'assets/story-opening-v2.webp',className:'sheet q1 opening-scene',symbol:'17:45 / 魔王商事',heading:'終業まで、あと15分。',text:'今日も仕事の山は、勇者の机を城壁のように囲んでいた。だが、ここで諦めれば残業が始まる。'},
  {image:'assets/story-opening-v2.webp',className:'sheet q2 opening-scene',symbol:'6 RANKS',heading:'退勤を阻む、6人の役職魔王。',text:'リーダー、係長、課長、部長、専務――そして玉座機械の社長。上へ行くほど、攻撃も増援も激しくなる。'},
  {image:'assets/story-opening-v2.webp',className:'sheet q3 opening-scene',symbol:'帰る理由がある',heading:'剣を取る理由は、出世ではない。',text:'机の写真に目を向ける。待っている人のもとへ、今日という冒険を終えて帰るためだ。'},
  {image:'assets/story-opening-v2.webp',className:'sheet q4 opening-scene',symbol:'MISSION / 18:00',heading:'すべての仕事を、定時までに斬れ。',text:'移動しながら自動攻撃。技を重ね、6役職を突破し、黄金の退勤ゲートを目指せ。'}
];
export const ENDING=[
  {image:'assets/story-ending-v2.webp',className:'sheet q1 ending-scene',symbol:'FINAL APPROVAL',heading:'魔王社長、沈黙。',text:'玉座機械の光が消え、最後の書類が床へ落ちた。勇者は剣を支えに立ち上がる。'},
  {image:'assets/story-ending-v2.webp',className:'sheet q2 ending-scene',symbol:'GATE OPEN',heading:'退勤ゲートが、夕焼け色に開く。',text:'背後では魔王商事がまだ煙を上げている。それでも今日の仕事は、ここで終わりだ。'},
  {image:'assets/story-ending-v2.webp',className:'sheet q3 ending-scene',symbol:'18:00',heading:'勇者は街へ走り出した。',text:'風が青いマントを大きく揺らす。会社の魔物より速く、待っている灯りへ。'},
  {image:'assets/story-ending-v2.webp',className:'sheet q4 ending-scene',symbol:'ただいま / THE END',heading:'今日の冒険は、ちゃんと終わった。',text:'剣より大切なものを抱きしめる。定時退勤達成――ただし、月曜日はまたやってくる。'}
];
export const TRUE_ENDING=[
 {heading:'特命監査、これにて終了。',symbol:'FINAL AUDIT / COMPLETE',text:'銀髪の監査役は剣を下ろし、鞄を閉じた。「……追加業務は、ありません」勇者はようやく、深く息をついた。'},
 {heading:'開いたのは、みんなの帰り道。',symbol:'ALL EMPLOYEES / GATE OPEN',text:'退勤ゲートを縛っていた書類の鎖が、光になってほどけていく。勇者の後ろから、社員たちも一人、また一人と歩き出した。'},
 {heading:'「お疲れさま。また明日」',symbol:'THANK YOU / TEAM',text:'小春が笑って手を振る。黒沢は鞄を肩に掛け、「今日は俺も帰る」とうなずいた。誰かを置いていかない退勤も、悪くない。'},
 {heading:'守りたかった時間が、ここにある。',symbol:'ただいま / TRUE END',text:'「今日は早いね！」駆け寄る小さな手を抱きとめる。強くなった理由は、もっと働くためじゃない。この「ただいま」を、守るためだった。'}
].map((slide,i)=>({...slide,image:'assets/story-true-ending-v1.webp',className:`square-sheet q${i+1} true-ending-scene`}));
export function getStorySlides(mode,secretBossDefeated=false){return mode==='ending'?(secretBossDefeated?TRUE_ENDING:ENDING):OPENING;}
