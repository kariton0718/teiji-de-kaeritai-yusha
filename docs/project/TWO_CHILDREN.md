# 子ども2人のイラスト追加

2026-09-22 / 未公開 / ブランチ codex/hayaku-two-children

既存の男の子をそのまま採用し、女の子を追加。男の子は黄色の星柄パジャマとくま、女の子は紫の月柄パジャマとうさぎ。2人ともかわいい人間の姿で、悪魔化・被ダメージなし。

| 追加素材 | 画像 |
|---|---|
| 女の子・通常 | ![女の子](../../games/hayaku-netai-yusha/assets/characters/girl.webp) |
| 女の子・寝顔 | ![寝顔](../../games/hayaku-netai-yusha/assets/characters/girl-sleep.webp) |

組み込み画像生成（built-in imagegen）で1点ずつ作成。通常姿は採用済み男の子を絵柄の参照にし、寝顔は女の子の通常姿を編集。512px透過WebP、alpha最小0・最大255を確認。

生成指示全文：[girl-prompts.json](../../games/hayaku-netai-yusha/assets/characters/girl-prompts.json)

## ゲームへの反映

- 寝かしつけ・朝の支度で2人が並ぶ。家族の物語、通常エンディング、見送りも2人。
- 進行は既存の共通ゲージを使用。2人それぞれへの独立したお願い、個別ゲージ、年齢差、名前は未実装／未設定。
- 男の子と既存18点の画像は変更しない。第1作も変更しない。
- 自動テスト32件成功。実ブラウザー・スマホの操作感は未確認。
- 今回もmainへ反映・公開していない。
