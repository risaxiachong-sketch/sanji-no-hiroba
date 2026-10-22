# 雲の上のQ&A：追加の挿絵

- 保存先：`art/soft/alpaca-book.png`
- 生成方法：組み込み image_gen ツール。透過PNG。
- 用途：はじめての方向けの案内。質問の開閉に合わせて、親子のアルパカが反応する。
- 参照画像：同サイトの `art/soft/alpaca-rest.png`。キャラクターと水彩の画風を合わせるために使用。

最終プロンプト：

```text
Use case: illustration-story. Asset type: NEW isolated transparent watercolor illustration for the frequently asked questions nook of a gentle Japanese picture-book parenting website. The input image is a character identity and watercolor style reference only. Keep this same fluffy round ivory alpaca with long soft ears, tiny warm brown facial features, peach cheeks, hand-painted paper texture and delicate irregular watercolor edges. Create a new scene: one adult alpaca sitting cozily on a broad puffy cloud, holding an open little peach-and-sage picture book with both front paws and smiling kindly toward the viewer as if answering a small question. Beside it one small baby alpaca peeks over the open book, curious and cuddly. The book is slightly rounded and handmade, blank with only faint abstract watercolor pictures and absolutely no letters. A few loose tiny daisies, sage leaves and soft peach hearts float near the cloud. Full characters and cloud visible with transparent margins. Landscape 3:2 composition, illustration occupies most of canvas, gentle lively friendly mood. Palette ivory, pale peach, powder blue, sage. TRUE TRANSPARENT background, preserve fine watercolor alpha at the edges. No rectangle background, no card, no border, no UI, no lettering, no logos, no watermark, no shiny 3D, no hard vector outline.
```

背景の雲と花飾りには既存の `cloud-button.png` と `cloud-flowers.png` を再利用。画像自体は編集せず、CSSの揺れ・移動とネイティブのdetails要素で構成しています。質問と回答は画像化せず、読み上げ・キーボード操作ができる文字で残しています。
