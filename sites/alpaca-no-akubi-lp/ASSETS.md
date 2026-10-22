# ふわふわの世界観：画像とプロンプト

生成方法：組み込み image_gen ツール。生成画像9点をプロジェクトへ保存。追加分の詳細は `MOTION_ASSETS.md` と `FAQ_ASSETS.md` を参照。
表紙のロゴとアルパカは、ユーザー提供PowerPointの1枚目に埋め込まれた元画像をそのまま使用。CSSで表紙と同様に表示範囲を調整しており、文字やキャラクターは描き直していません。

## 元画像と公開用画像

- 元画像（透過PNG・フルサイズ）は `art/soft/` に置き、公開フォルダーには含めません。
- 公開するのは `tools/make-images.py` で書き出したWebPです（`dist/assets/soft/*-<幅>.webp`）。画面幅に合わせて小さい版も用意し、`srcset` で選ばせています。スマホの表紙の空は、中央だけを切り出した `hero-sky-620.webp` を使います。
- 共有用カード `dist/assets/og-image.jpg`（1200×630）と、アイコン `dist/apple-touch-icon.png`・`dist/favicon-48.png` も同じスクリプトで、表紙の元画像から作ります。
- `dist/assets/soft/cover-original.png` は、以前に共有されたリンクのカード画像として残しています。ページ本体では使っていません。

## 元画像

- `art/soft/cover-original.png`：PowerPoint表紙の元画像（1536×1024、透過PNG）

## 生成画像と最終プロンプト

### cloud-hero

保存先：`art/soft/cloud-hero.png`

透過背景：なし

```text
Use case: illustration-story. The attached image is a CHARACTER AND PALETTE REFERENCE ONLY. Create a new scene, not a redesign of its Japanese logo. Match the very cute yawning white alpaca: round fluffy wool, peach cheeks, long soft ears, closed peaceful eyes, warm delicate brown details. Hand-painted Japanese picture-book watercolor, softly textured paper, irregular feathered pigment, airy pale cream, peach, sage and powder blue. Warm and kind for tired parents. Avoid shiny generic 3D, plastic, stock vector icons, hard outlines, sharp edges, boxes, panels, frames, typography, letters, logos, watermarks. No text anywhere. Asset: a very wide panoramic landing-page sky, landscape composition. Huge soft cotton-candy clouds and an airy pale ivory/blue sky occupy the central upper two thirds, with abundant genuinely quiet negative space for the original brand image to be overlaid later. At the far lower edge a small dreamy garden village with round treetops, tiny peach roof houses and a sleepy alpaca among flowers, all sitting on a bank of billowy clouds. More sky than village. Light watercolor edges dissolve into almost-white paper. No rectangular border; organic illustration that can blend into the web page.
```

### alpaca-rest

保存先：`art/soft/alpaca-rest.png`

透過背景：あり

```text
Use case: illustration-story. The attached image is a CHARACTER AND PALETTE REFERENCE ONLY. Create a new scene, not a redesign of its Japanese logo. Match the very cute yawning white alpaca: round fluffy wool, peach cheeks, long soft ears, closed peaceful eyes, warm delicate brown details. Hand-painted Japanese picture-book watercolor, softly textured paper, irregular feathered pigment, airy pale cream, peach, sage and powder blue. Warm and kind for tired parents. Avoid shiny generic 3D, plastic, stock vector icons, hard outlines, sharp edges, boxes, panels, frames, typography, letters, logos, watermarks. No text anywhere. Asset: a large isolated storybook spot illustration on TRUE TRANSPARENT BACKGROUND, generous empty transparent margins. A parent white alpaca sitting on a soft fluffy cloud with a little alpaca curled up beside them, quietly sharing a peaceful rest, a small pastel heart and a few loose watercolor leaves. Keep the parent close to the reference alpaca design, yawning gently, paws sinking into woolly cloud. Asymmetric organic silhouette, no solid backdrop or ground line. Warm tender sleepy feeling. Landscape-oriented scene.
```

### alpaca-town

保存先：`art/soft/alpaca-town.png`

透過背景：なし

```text
Use case: illustration-story. The attached image is a CHARACTER AND PALETTE REFERENCE ONLY. Create a new scene, not a redesign of its Japanese logo. Match the very cute yawning white alpaca: round fluffy wool, peach cheeks, long soft ears, closed peaceful eyes, warm delicate brown details. Hand-painted Japanese picture-book watercolor, softly textured paper, irregular feathered pigment, airy pale cream, peach, sage and powder blue. Warm and kind for tired parents. Avoid shiny generic 3D, plastic, stock vector icons, hard outlines, sharp edges, boxes, panels, frames, typography, letters, logos, watermarks. No text anywhere. Asset: a wide landscape picture-book spread introducing local parent-and-child outings. A soft winding footpath through a gentle Miyazaki-inspired sunny garden, small fountain, round trees, tiny flowers and distant hazy green hills. The reference fluffy white alpaca walks with a smaller alpaca along the path toward a small leafy village. Open and friendly; no actual identifiable facility, no signs or text. Give the illustration detail and personality but soft generous spacing. Outer edges feather into warm ivory paper on every side, especially the top and bottom, no straight rectangular image boundary.
```

### alpaca-goodnight

保存先：`art/soft/alpaca-goodnight.png`

透過背景：あり

```text
Use case: illustration-story. The attached image is a CHARACTER AND PALETTE REFERENCE ONLY. Create a new scene, not a redesign of its Japanese logo. Match the very cute yawning white alpaca: round fluffy wool, peach cheeks, long soft ears, closed peaceful eyes, warm delicate brown details. Hand-painted Japanese picture-book watercolor, softly textured paper, irregular feathered pigment, airy pale cream, peach, sage and powder blue. Warm and kind for tired parents. Avoid shiny generic 3D, plastic, stock vector icons, hard outlines, sharp edges, boxes, panels, frames, typography, letters, logos, watermarks. No text anywhere. Asset: an extra-wide transparent foreground illustration for the bottom of a web page. A bank of fluffy pillowy watercolor clouds, mostly pale peach and powder blue, with the original white alpaca asleep at the left side and a tiny bunny resting at the right edge, a very small warm crescent moon and a few faint stars. Keep the entire central upper area transparent to leave space for web page copy and a button. Organic scalloped cloud silhouette, clouds are soft and irregular like cotton wool. No text. True alpha transparency.
```

### cloud-button

保存先：`art/soft/cloud-button.png`

透過背景：あり

```text
Use case: illustration-story. Asset: a single pillowy watercolor cloud for a website button, wide horizontal composition roughly 3:1, centered on a TRUE TRANSPARENT background. One simple organic fluffy cloud silhouette made of irregular rounded lobes, pale warm peach at the bottom fading into ivory at the top, subtle hand-painted paper texture and an extremely soft natural watercolor shadow. Empty center with generous space for separate HTML Japanese button text. No alpaca, no objects, no lettering, no outline, no rectangle, no hard shadow, no UI panel, no frame. It must look like a light cozy cloud, not a pill or speech bubble.
```
