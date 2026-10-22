
## 追加の生成画像：触れる・動く絵本

### alpaca-wave

保存先：`art/soft/alpaca-wave.png`

生成方法：組み込み image_gen ツール。透過PNG。

```text
Use case: illustration-story. Create a NEW isolated watercolor illustration on a TRUE TRANSPARENT background for a very cute Japanese picture-book website. Image 1 is the exact character identity reference, Image 2 is the watercolor medium and softness reference. Keep the same round white alpaca, tiny brown facial features, puffy wool, long soft ears, peach cheeks, warm delicate brown details. Pale ivory, peach, powder blue and sage. Hand-painted textured watercolor, kind and playful, no generic shiny 3D, no hard vector outline, no rectangles, cards, frames, lettering, logos or watermarks. Full body visible, no rectangular ground, generous transparent margins. One fluffy alpaca stands on a tiny puffy cloud, smiling with open happy eyes and gently waving one front paw hello. Short little legs, soft chubby body, very endearing and friendly. A few loose watercolor flower petals float nearby. Make the pose read clearly at small size. Portrait-ish isolated character.
```

### alpaca-heart

保存先：`art/soft/alpaca-heart.png`

生成方法：組み込み image_gen ツール。透過PNG。

```text
Use case: illustration-story. Create a NEW isolated watercolor illustration on a TRUE TRANSPARENT background for a very cute Japanese picture-book website. Image 1 is the exact character identity reference, Image 2 is the watercolor medium and softness reference. Keep the same round white alpaca, tiny brown facial features, puffy wool, long soft ears, peach cheeks, warm delicate brown details. Pale ivory, peach, powder blue and sage. Hand-painted textured watercolor, kind and playful, no generic shiny 3D, no hard vector outline, no rectangles, cards, frames, lettering, logos or watermarks. Full body visible, no rectangular ground, generous transparent margins. One baby alpaca hugs a big soft peach-pink heart, cheeks rosy, eyes curved in a joyful smile. Sitting comfortably on a small powder-blue cloud. A couple of tiny warm hearts float nearby. Tender and extremely cute without shiny or plastic rendering. Portrait-ish isolated character.
```

### cloud-flowers

保存先：`art/soft/cloud-flowers.png`

生成方法：組み込み image_gen ツール。透過PNG。

```text
Use case: illustration-story. Asset: a wide airy decorative garland for a Japanese watercolor picture-book website, TRUE TRANSPARENT background. Two very fluffy little pastel clouds at the outer edges with loose tiny hand-painted daisies, rounded peach and yellow flowers, sage leaves, a few floating soft flower petals, a warm miniature star. A long delicate organic curve of watercolor dots and leaves links them across a largely empty center. Very soft paper texture, pale warm cream, peach, powder blue, sage. No characters, no words, no rectangle, no hard outline, no frame or UI. Wide panorama 3:1 with generous transparent space.
```

## フォント

Zen Maru Gothic の Bold（700）と Black（900）を、掲載テキストに合わせたGoogle FontsのWOFF2サブセットとして同梱。CSS上では Alpaca Maru という名前で参照しています。

- `dist/assets/fonts/alpaca-maru-bold.woff2`
- `dist/assets/fonts/alpaca-maru-black.woff2`
- ライセンス全文：`dist/assets/fonts/OFL.txt`
- 一次配布元：https://github.com/google/fonts/tree/main/ofl/zenmarugothic
- ライセンス：SIL Open Font License 1.1

サブセットには、ページ・スクリプトで使う全文字に加えて、ひらがな・カタカナ・ASCIIを全部含めています。新しい漢字や記号を足したときは、`tools/subset-fonts.py` を実行し直してください（手順はスクリプト冒頭に記載）。フォントに含まれない文字は、端末の丸ゴシック等へフォールバックします。
