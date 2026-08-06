# 「アルパカのあくび」機能紹介動画

## 目的と仕様

このディレクトリには、`risaxiachong-sketch/sanji-no-hiroba`の実装済み機能をPowerPoint投影で紹介するRemotion動画を収録しています。
スマートフォン1台を画面いっぱいに置き、アプリを通しで操作した1カットの映像を見せます。

- Composition: `SanjiFeatureDemo4x3`
- サイズ: 1440×1080px（4:3）
- フレームレート: 30fps
- 尺: 90秒（実機映像85秒＋エンドカード）
- 最終形式: H.264 MP4、`yuv420p`、AAC音声トラックあり
- サイズ目標: 100MB未満

4:3は、4:3のPowerPointスライドに全面配置しても黒帯を出さないために採用しています。

### サービス名

動画内の名称は「アルパカのあくび」に統一します。
この名称は、現行トップ画面の表示を根拠に選びました。
リポジトリ名、HTML title、API名と一部のシェルUIには`sanji-no-hiroba`または「さんじのひろば」が残っていますが、動画制作のための一括改名は行いません。

## 必要環境とインストール

- Node.js 22以上
- npm
- Remotionが利用するChromium（初回実行時に自動用意される場合があります）

リポジトリルートで依存関係を取得します。

```bash
npm ci
```

システムのFFmpegとFFprobeは必須ではありません。
検査スクリプトはRemotion 4のバンドル版を`remotion ffmpeg`と`remotion ffprobe`経由で使用します。

## Git運用

制作物は最新の`origin/main`を基点とする`feature/remotion-demo-video-4x3`ブランチ上で管理します。
このディレクトリの撮影、レンダリング、検査コマンドはcommit、push、force pushを実行しません。
既存の作業を保護するため、`reset`や`clean`も実行しません。

## 画面に映るもの

動画に映るアプリ画面は、すべて`origin/main`のfrontendを実際に操作して撮影した1本の映像です。
動画のために作った擬似画面やモックUIは含みません。
撮影用にアプリのソースを書き換えることもしません。

撮影時のfrontendは`VITE_USE_MOCK=true`で起動します。
これはリポジトリに実装済みのオフラインモックで、`frontend/src/data/`のデータをそのまま表示します。
投稿文やイベントの内容を動画側で用意することはありません。

fixtureは「人が画面に入力する値」だけを持ちます。

- `fixtures/profile.json`: 撮影中に入力するニックネーム「ひなた」、子どもの年齢、選ぶアバター
- `fixtures/posts.json`: 撮影中に入力するつぶやき「今日は公園に行ってきました」
- `fixtures/reactions.json`: 押すリアクションの種類と、押す前に必要な最小件数
- `fixtures/events.json`: 撮影結果の記録。掲示板が実際に先頭へ並べたイベントを`scripts/capture.ts`が書き戻します

デモデータは本番APIへ送信しません。
撮影はlocalhostのfrontendのみを使用し、公式サイトやGoogleカレンダーの外部ページは開きません。
`scripts/verify-assets.ts`は撮影マニフェストの外部メディア参照、撮影レポートの外部リクエスト、撮影スクリプトの外部遷移を検査します。

## 1カット撮影

`scripts/capture.ts`はPlaywrightでスマートフォン1台を操作し、**screencastを1回だけ開始・停止**します。
シーンの切り貼りもカット割りもありません。

- 端末: 430×932のviewport、タッチ操作
- 入力: CDPの`Input.dispatchTouchEvent`による実際のタッチ。スワイプは約16ms刻みで中間点を送るため、アプリ側の慣性計算が実機と同じように働きます
- スクロール: `Input.synthesizeScrollGesture`（ブラウザ自身のフリック挙動）
- 尺: `TAKE_SECONDS`（85秒）ちょうど。操作が早く終わったぶんは最後のひろばで待ちます

viewportが430×932なのは、screencastがCSS解像度で記録されるためです。
小さいviewportで撮ると1080pxへ拡大したときに眠い絵になります。
アプリのタブレット用ブレークポイント（600px）には届かないので、レイアウトはスマートフォンのままです。

Chromiumは`--overscroll-history-navigation=0`付きで起動します。
これを外すと、アバターの横スワイプがブラウザの「戻る」ジェスチャーになり、撮影中にアプリが破棄されます。

### 効果音の録り方

アプリの効果音は音声ファイルではなく、`frontend/src/audio/soundEffects.ts`がWeb Audioでその場で合成しています。
そのため、コピーできる音源はありません。

撮影スクリプトは`addInitScript`で`AudioContext`を差し替え、アプリが作る音声グラフの出口を`MediaStreamAudioDestinationNode`に向けて`MediaRecorder`で録音します。
アプリのコードには一切触れません。

- 出口には極小音量の`ConstantSourceNode`を常時つないでいます。これが無いとChromiumが無音区間を捨て、録音が数秒に縮んで映像と合わなくなります
- 録音開始と最初の映像フレームの時間差は`performance.now()`（単調時計）で測り、manifestの`take.audio.offsetMs`に記録します。ページのDateは撮影時に固定しているため、壁時計は基準に使えません
- 録音したwebmは`remotion ffmpeg`でWAV（`pcm_s16le`）に変換し、ピークが取れているかを撮影時に確認します。無音ならその場で失敗します

音量は`src/SanjiFeatureDemo4x3.tsx`の`SOUND_GAIN`で調整します。

## 撮影の実行

```bash
npm run demo:capture
```

通しの操作なので、部分的な再撮影はできません。
失敗したときはスクリプトを直して丸ごと撮り直します。

撮影結果は次のとおりです。

```text
public/captures/take/video.webm   映像
public/captures/take/audio.wav    効果音
public/captures/manifest.json     テイクの記録（尺、音のオフセット、操作ログ、タップ座標、掲示板イベント）
public/captures/report.json       撮影成否とネットワーク診断
```

`manifest.json`の`take.steps`に、どの操作が何秒地点で起きたかが残ります。
尺の調整は`scripts/capture.ts`の`runTake()`にある`take.at(ミリ秒)`を書き換えます。

## テイクの流れ

画面には見出しやテロップを重ねません。スマートフォンの実画面だけを見せます。

| 秒 | 操作 |
|---|---|
| 0-7 | トップ画面から「ひろばに入る」、ニックネームと子どもの年齢を入力 |
| 7-15 | アバターを左右にスワイプして選び、「この子にする」 |
| 15-27 | 2Dひろばを眺める（この間にキャラクター同士の立ち話を探す） |
| 27-33 | ドラッグで広場を見渡す |
| 33-41 | 「つぶやく」から投稿して広場に戻る |
| 41-48 | キャラクターをタップして、その子のつぶやきを開く |
| 48-52 | リアクションを押す |
| 52-61 | まちの掲示板へ移動し、スクロールと「今日」の絞り込み、イベントを保存 |
| 61-68 | 行ってみたい一覧からイベント詳細を開いてスクロール |
| 68-72 | カレンダー追加のダイアログを表示して閉じる |
| 72-80 | 設定で効果音のオン・オフとキャラクターの大きさを変更 |
| 80-85 | ひろばに戻って締める |
| 85-90 | エンドカード |

広場に入った直後はカメラを動かしません。
キャラクターは広場のどこでも会話を始めますが、画面にはマップの3分の1程度しか映らないため、カメラを振ると会話から離れてしまいます。
`scripts/capture.ts`はcanvasの画素から吹き出し（幅92px以上、「あなた」の名札は56px）を探し、見つかれば`plaza-talk`として記録します。
見つからなかった場合、「ひろばの会話」の説明はキャラクターをタップしてつぶやきを開く場面に付きます。

## Remotion側

- `src/components/DeviceFrames.tsx`: 端末枠。内側の画面は撮影viewportと同じ430:932で、余白が出ないようにしています。ノッチやホームバーは描きません（アプリの表示を隠すため）
- `src/components/CaptureSurface.tsx`: 映像の再生と、撮影時に実際に触った座標へ出すタップ波紋
- `src/SanjiFeatureDemo4x3.tsx`: 背景、端末、音声、エンドカード
- `src/timeline.ts`: 尺の定数のみ（シーン一覧は廃止）
- `src/chapters.ts`: 右側に出す機能名と紹介文。各章の開始時刻は`manifest.json`の`take.steps`から取るので、撮り直しても文章と画面がズレません

タップ波紋の座標と時刻は`manifest.json`の`take.taps`、つまり実際の入力から来ています。
右側のパネルは、スマートフォンの左配置とあわせて`src/SanjiFeatureDemo4x3.tsx`の`PHONE_LEFT`／`PANEL_LEFT`で位置を決めています。

## Studio、レンダリング、検査

Remotion Studio:

```bash
npm run demo:studio
```

低解像度のラフ版（720×540、最終版と同じ4:3）:

```bash
npm run demo:render:draft
```

最終版:

```bash
npm run demo:render
```

どちらのレンダリングも、3、20、37、45、63、75、88秒の1440×1080 PNGを同時に書き出します。
プレビューだけを再生成する場合は、次のコマンドを実行します。

```bash
cd demo-video
npm run render -- --previews-only
```

レンダリングは`--muted=false`を明示しています。
`remotion.config.ts`の`Config.setMuted(false)`はCLIに反映されず、音声トラックが落ちるためです。

統合検査:

```bash
npm run demo:check
```

`demo:check`はTypeScript、Lint、fixture、撮影素材、タイムライン、Composition、短い静止画と動画のレンダリングを検査します。
最終MP4が存在する場合は、Remotionバンドル版FFprobeで次も検査します。

- 1440×1080、4:3、30fps
- H.264、`yuv420p`
- 75〜100秒
- AAC音声トラックが1本あること
- 100MB未満
- 全フレームをデコードできること

個別のメタデータ確認:

```bash
cd demo-video
npx remotion ffprobe -v error \
  -show_entries stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,display_aspect_ratio:format=duration \
  -of json out/sanji-feature-demo-4x3.mp4
```

## 出力先

- 最終版: `out/sanji-feature-demo-4x3.mp4`
- ラフ版: `out/sanji-feature-demo-4x3-draft.mp4`
- 必須プレビュー: `out/preview-03s.png`, `preview-20s.png`, `preview-37s.png`, `preview-45s.png`, `preview-63s.png`, `preview-75s.png`, `preview-88s.png`
- スモークテスト: `out/check/`

`out/`は生成物です。
修正時は撮影またはタイムラインを更新して再レンダリングします。

## 音

ナレーションとBGMは使用しません。
入っているのはアプリの効果音だけです。

設定画面では効果音をオフにしてすぐオンへ戻します。
オフのままだと、それ以降のテイクが無音になります。

## 未実装機能と既知の制約

- 掲示板は条件絞り込みを実装していますが、フリーワード検索は未実装です。
  動画では「検索」と誇張せず、絞り込みと一覧閲覧を見せます。
- ひろばのキャラクターは自律移動し、ユーザーのドラッグはカメラ操作です。
  クリック移動として見せません。
- ひろばの立ち話はfrontendの自律会話UIによるもので、投稿への返信ではありません。
- リアクション相手のキャラクターはcanvas上を歩いているためDOMから掴めません。
  撮影スクリプトは合成クリックで位置だけ探り、実際のタップはその1回だけ行います。
- Googleカレンダーと公式ページは外部通信を行わず、アプリ内の追加先選択の表示までに留めます。
- キャプチャはブラウザのフォントレンダリングに依存するため、OS間で微小な差が出る場合があります。

## 再制作で変更しやすい項目

- 操作の順序と各操作の時刻: `scripts/capture.ts`の`runTake()`
- 右側の機能名と紹介文: `src/chapters.ts`
- テイクの尺、撮影viewport: `scripts/scenario.ts`
- 端末枠の大きさと余白: `src/components/DeviceFrames.tsx`
- 効果音の音量、エンドカード、背景: `src/SanjiFeatureDemo4x3.tsx`
- タップ波紋の見た目: `src/components/CaptureSurface.tsx`
- 撮影中に入力する値: `fixtures/profile.json`, `fixtures/posts.json`, `fixtures/reactions.json`

撮影viewportを変えるときは`src/components/DeviceFrames.tsx`の`PHONE_SCREEN`も同じ値に合わせてください。
片方だけ変えると映像に余白が出ます。

変更後は`npm run demo:capture`、ラフ版、必須プレビュー、最終版、`npm run demo:check`の順で確認してください。
