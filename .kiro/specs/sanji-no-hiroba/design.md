# 技術設計書：さんじのひろば

**バージョン：** 1.0  
**作成日：** 2026年7月17日  
**対象：** 発表用プロトタイプ（MVP）

---

## 1. 技術スタック

既存プロジェクトの構成をそのまま使用する。外部UIライブラリは導入しない。

| 項目 | 採用技術 | バージョン |
|---|---|---|
| フレームワーク | React | ^19.2.7 |
| 言語 | TypeScript | ~6.0.2 |
| ビルドツール | Vite | ^8.1.1 |
| スタイリング | CSS Modules | — |
| ルーティング | React組み込みの状態管理（画面遷移） | — |
| データ永続化 | localStorage（ブラウザ標準） | — |
| パッケージ管理 | npm | — |

**ルーティングの方針：** 発表用MVPではページ数が少なく、外部ルーターを追加しない。`App.tsx` 内でグローバルな `page` 状態を管理し、状態に応じてコンポーネントを切り替える方式（フラットなシングルページ構成）とする。

---

## 2. ディレクトリ構成

```
src/
├── App.tsx                   # ルート：画面切り替えロジック
├── App.css                   # ルートの最小スタイル
├── index.css                 # グローバルスタイル・CSS変数
├── main.tsx                  # エントリポイント
│
├── assets/
│   └── hero.png              # 既存のヒーロー画像（流用）
│
├── components/               # 各画面コンポーネント
│   ├── TopPage/
│   │   ├── TopPage.tsx
│   │   └── TopPage.module.css
│   ├── AvatarSelect/
│   │   ├── AvatarSelect.tsx
│   │   └── AvatarSelect.module.css
│   ├── MoodSelect/
│   │   ├── MoodSelect.tsx
│   │   └── MoodSelect.module.css
│   ├── Plaza/
│   │   ├── Plaza.tsx
│   │   └── Plaza.module.css
│   ├── PostArea/
│   │   ├── PostArea.tsx
│   │   └── PostArea.module.css
│   ├── BulletinBoard/
│   │   ├── BulletinBoard.tsx
│   │   └── BulletinBoard.module.css
│   ├── EventDetail/
│   │   ├── EventDetail.tsx
│   │   └── EventDetail.module.css
│   ├── SavedEvents/
│   │   ├── SavedEvents.tsx
│   │   └── SavedEvents.module.css
│   ├── AiSearch/
│   │   ├── AiSearch.tsx
│   │   └── AiSearch.module.css
│   ├── SupportInfo/
│   │   ├── SupportInfo.tsx
│   │   └── SupportInfo.module.css
│   └── ExitResult/
│       ├── ExitResult.tsx
│       └── ExitResult.module.css
│
├── data/
│   ├── avatars.ts            # アバター定義（6種類）
│   ├── events.ts             # ダミーイベントデータ
│   ├── dummyUsers.ts         # ダミーアバター・吹き出しデータ
│   └── supportLinks.ts       # 相談・支援機関データ
│
├── hooks/
│   └── useSavedEvents.ts     # localStorageとの同期フック
│
└── types/
    └── index.ts              # 共通型定義
```

---

## 3. 画面遷移フロー

```
TopPage
  └─[ひろばに入る]─→ AvatarSelect
                         └─[次へ]─→ MoodSelect
                                       └─[ひろばへ入る]─→ Plaza（メイン広場）
                                                              ├─[掲示板]─→ BulletinBoard
                                                              │               ├─[カードタップ]─→ EventDetail
                                                              │               │                    └─[行ってみたい]─（保存）
                                                              │               └─[AI検索タブ]─→ AiSearch
                                                              ├─[保存一覧]─→ SavedEvents
                                                              │               └─[カードタップ]─→ EventDetail
                                                              ├─[案内所]─→ SupportInfo
                                                              ├─[投稿]─→ PostArea（モーダル or 下部シート）
                                                              └─[退出]─→ ExitResult
                                                                             └─[もう一度/終わる]─→ TopPage
```

各画面への遷移はすべて `App.tsx` の `page` 状態の切り替えで実現する。

---

## 4. グローバル状態の設計

`App.tsx` で以下の状態を保持し、各コンポーネントへ `props` で渡す。

```typescript
// 現在の画面
type Page =
  | 'top'
  | 'avatarSelect'
  | 'moodSelect'
  | 'plaza'
  | 'bulletinBoard'
  | 'eventDetail'
  | 'savedEvents'
  | 'aiSearch'
  | 'supportInfo'
  | 'postArea'
  | 'exitResult';

// セッション情報
interface SessionState {
  selectedAvatar: Avatar | null;      // FR-02
  selectedMood: Mood | null;          // FR-03
  currentPage: Page;                  // 画面管理
  selectedEventId: string | null;     // 詳細表示中のイベントID
  previousPage: Page | null;          // 戻るボタン用
}
```

`savedEvents`（行ってみたいリスト）は `useSavedEvents` フックで管理し、`localStorage` と同期する。

---

## 5. 型定義（`src/types/index.ts`）

```typescript
export interface Avatar {
  id: string;
  emoji: string;       // アバターを絵文字で表現
  label: string;       // アクセシビリティ用のラベル
  color: string;       // アバター背景色（パステル）
}

export type Mood =
  | 'tired'
  | 'presence'
  | 'outing'
  | 'talk'
  | 'observe';

export interface MoodOption {
  value: Mood;
  label: string;
  emoji: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;              // "YYYY-MM-DD"
  time: string;              // "HH:MM〜HH:MM"
  ageRange: string;          // "0〜3歳" など
  ageMin: number;            // 絞り込み用（歳）
  ageMax: number;
  location: string;
  address: string;
  facilityType: FacilityType;
  price: 'free' | 'paid';
  priceLabel: string;        // "無料" / "500円" など
  indoor: boolean;
  reservationRequired: boolean;
  nursingRoom: boolean;
  diaperChange: boolean;
  strollerOk: boolean;
  source: string;            // 情報提供元
  officialUrl: string;
  lastConfirmed: string;     // "YYYY-MM-DD"
  description: string;
}

export type FacilityType =
  | 'community-center'   // 公民館
  | 'library'            // 図書館
  | 'museum'             // 博物館・科学館
  | 'childcare-center'   // 子育て支援施設・児童館
  | 'other';

export interface DummyUser {
  id: string;
  avatar: Avatar;
  message: string;           // 吹き出しテキスト
  x: number;                 // 広場内の横位置（%）
  y: number;                 // 広場内の縦位置（%）
}

export interface Post {
  id: string;
  avatar: Avatar;
  text: string;
  reactions: Record<ReactionType, number>;
  timestamp: string;
}

export type ReactionType =
  | 'otsukare'     // おつかれさま
  | 'wakaru'       // わかるよ
  | 'koko'         // ここにいるよ
  | 'sotto';       // そっと見守る

export interface SupportLink {
  id: string;
  name: string;
  description: string;
  phone?: string;
  url: string;
}
```

---

## 6. コンポーネント設計

### 6-1. TopPage

- 役割：FR-01。既存の `App.tsx` の内容を移植・整理する。
- Props：`onEnter: () => void`
- ヒーロー画像、サービス名、キャッチコピー、概要文、「ひろばに入る」ボタンを表示。

### 6-2. AvatarSelect

- 役割：FR-02。6種類のアバターをグリッド表示。
- Props：`onSelect: (avatar: Avatar) => void`
- 選択済みアバターは枠線・スケールで強調表示。「次へ」ボタンは未選択時に `disabled`。

### 6-3. MoodSelect

- 役割：FR-03。5種類の気分・目的をカード選択。
- Props：`avatar: Avatar; onSelect: (mood: Mood) => void`
- 選択済みはハイライト。「ひろばへ入る」ボタンは未選択時に `disabled`。

### 6-4. Plaza

- 役割：FR-04・FR-05・FR-06の入口。
- Props：`avatar: Avatar; mood: Mood; onNavigate: (page: Page) => void; onExit: () => void`
- 広場の背景はCSSで草地・空をイメージした絵。アバターはabsolute配置。
- 広場内に「まちの掲示板」「案内所」「投稿する」「退出する」「保存一覧」ボタンを配置。
- ダミーユーザー（`dummyUsers.ts`）を読み込み、吹き出しと共に表示。
- 在室人数＝ダミーユーザー数＋1（自分）で表示。

### 6-5. PostArea

- 役割：FR-05。投稿フォームとリアクション送信。
- Props：`avatar: Avatar; onClose: () => void`
- テキストエリア（`maxLength={60}`）、文字カウンター、送信ボタン。
- 4種類のリアクションボタン。
- 投稿後はフォームをリセットしてモーダルを閉じる。

### 6-6. BulletinBoard

- 役割：FR-07・FR-08。イベント一覧と絞り込み。
- Props：`onSelectEvent: (id: string) => void; onNavigate: (page: Page) => void; onBack: () => void`
- タブ：「イベント一覧」「AI検索」
- 絞り込みパネル：今日・明日・対象年齢・無料・屋内・予約不要・施設の種類。
- イベントリストは `events.ts` から読み込み、選択条件で `filter` する。
- 0件時は専用メッセージを表示。

### 6-7. EventDetail

- 役割：FR-09・FR-10。
- Props：`eventId: string; savedIds: string[]; onSave: (id: string) => void; onBack: () => void`
- `events.ts` から対象IDのデータを取得して表示。
- 「行ってみたい」ボタン：保存済みなら「保存済み ✓」のトグル表示。

### 6-8. SavedEvents

- 役割：FR-10。保存済みイベント一覧。
- Props：`savedIds: string[]; onSelectEvent: (id: string) => void; onBack: () => void`
- `savedIds` で `events.ts` を引き、カード一覧で表示。

### 6-9. AiSearch

- 役割：FR-11。自然文検索UI（モック実装）。
- Props：`onSelectEvent: (id: string) => void; onBack: () => void`
- テキスト入力 → モック関数が入力文字列を解析（キーワードマッチ）→ `events.ts` の該当イベントを返す。
- 将来的にAmazon Bedrock APIへの差し替えを容易にするため、検索ロジックを `parseNaturalQuery(text: string): FilterCondition` という関数に切り出す。

### 6-10. SupportInfo

- 役割：FR-12。相談・支援機関の案内。
- Props：`onBack: () => void`
- `supportLinks.ts` から読み込み、機関名・説明・電話番号・リンクをカード表示。

### 6-11. ExitResult

- 役割：FR-06。すれ違い結果の表示。
- Props：`onRestart: () => void`
- ダミー人数（3〜8のランダム整数）を表示。
- 「もう一度あそぶ」と「終わる（トップへ）」ボタンを表示。

---

## 7. データ設計

### 7-1. アバターデータ（`src/data/avatars.ts`）

6種類のアバターを絵文字ベースで実装する。将来的に独自SVGへ差し替え可能な構造とする。

```typescript
export const AVATARS: Avatar[] = [
  { id: 'bear',   emoji: '🐻', label: 'くまさん',   color: '#f5e6d3' },
  { id: 'bunny',  emoji: '🐰', label: 'うさぎさん', color: '#fde8ec' },
  { id: 'duck',   emoji: '🐥', label: 'ひよこさん', color: '#fdf6d3' },
  { id: 'cat',    emoji: '🐱', label: 'ねこさん',   color: '#e8f4ec' },
  { id: 'panda',  emoji: '🐼', label: 'ぱんださん', color: '#e8eef5' },
  { id: 'koala',  emoji: '🐨', label: 'こあらさん', color: '#ece8f5' },
];
```

### 7-2. イベントダミーデータ（`src/data/events.ts`）

成功条件デモに必要な多様なデータを用意する。最低10件、各カテゴリから1件以上。

| 施設種別 | 件数の目安 |
|---|---|
| 公民館（親子イベント） | 3件 |
| 図書館（読み聞かせ） | 2件 |
| 博物館・科学館 | 2件 |
| 子育て支援施設・児童館 | 2件 |
| 相談会 | 1件 |

- 日付は「今日」「明日」「来週」など絞り込みテストが機能するよう分散させる。
- `date` フィールドは実装時にシステム日付から相対計算した文字列を入れる。

### 7-3. ダミーユーザーデータ（`src/data/dummyUsers.ts`）

7体のダミーユーザーを定義する。吹き出しは子育て中の保護者が自然に発する短い一言とする。

```
例：
・「おやすみなさい〜」
・「今日もよく頑張った」
・「眠れない夜は広場に来てます」
・「離乳食、難しいな」
・「図書館の読み聞かせ楽しかった！」
```

### 7-4. 相談・支援リンク（`src/data/supportLinks.ts`）

福岡県・市の公式機関を中心に5件程度を定義する。

| 機関名（例） | 種別 |
|---|---|
| 福岡市子育て情報サイト「はぐはぐ」 | 総合情報 |
| 福岡市子ども総合相談センター（えがお館） | 相談窓口 |
| よりそいホットライン | 電話相談 |
| 福岡県子育て支援センター | 支援施設 |
| こども家庭庁 相談窓口まとめ | 国の案内 |

---

## 8. カスタムフック

### `useSavedEvents`（`src/hooks/useSavedEvents.ts`）

```typescript
const STORAGE_KEY = 'sanji-saved-events';

function useSavedEvents(): {
  savedIds: string[];
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
}
```

- 初期値は `localStorage.getItem(STORAGE_KEY)` から読み込む。
- `toggleSave` でIDを追加または削除し、`localStorage.setItem` で保存する。

---

## 9. AIイベント検索モック（`src/components/AiSearch/AiSearch.tsx`）

将来のBedrock接続を考慮し、検索ロジックを関数として分離する。

```typescript
// 将来はこの関数をBedrock API呼び出しに差し替える
function parseNaturalQuery(text: string): FilterCondition {
  return {
    date: detectDate(text),        // "today" | "tomorrow" | null
    childAge: detectAge(text),     // number | null
    price: detectPrice(text),      // "free" | null
    indoor: detectIndoor(text),    // boolean | null
  };
}
```

- `detectDate`：「今日」「明日」などのキーワードを検出する。
- `detectAge`：「0歳」「1歳」「2歳」「3歳」などを検出する。
- `detectPrice`：「無料」「タダ」などを検出する。
- `detectIndoor`：「屋内」「室内」「雨の日」などを検出する。

---

## 10. デザイントークン

既存の `index.css` をベースに、CSS カスタムプロパティを追加して統一する。

```css
:root {
  /* カラーパレット（パステル） */
  --color-primary:        #7166b5;   /* メインアクション */
  --color-primary-dark:   #6257a6;   /* ホバー */
  --color-primary-light:  #ece8f5;   /* 背景・選択状態 */
  --color-accent-pink:    #f2a6a0;   /* アクセント */
  --color-accent-green:   #83bfb0;   /* アクセント */
  --color-text-main:      #403c4a;   /* 本文 */
  --color-text-sub:       #6c6678;   /* 補足テキスト */
  --color-surface:        rgba(255, 255, 255, 0.88);  /* カード背景 */
  --color-border:         rgba(113, 102, 181, 0.14);  /* 枠線 */

  /* タイポグラフィ */
  --font-size-base:    1rem;        /* 16px（NFR-02-1） */
  --font-size-sm:      0.875rem;    /* 14px（補足） */
  --font-size-lg:      1.125rem;    /* 18px */
  --font-size-xl:      1.5rem;      /* 24px */

  /* スペーシング */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  36px;

  /* ボタン最小タップサイズ（NFR-01-2） */
  --tap-min: 44px;

  /* 角丸 */
  --radius-sm:   8px;
  --radius-md:  16px;
  --radius-lg:  24px;
  --radius-full: 999px;
}
```

---

## 11. スマートフォン対応方針

- 最大幅 `min(100%, 430px)` のカードレイアウトをページ単位で適用する。
- ボトムナビゲーション・固定フッターボタンは `position: sticky; bottom: 0` で実装する。
- `font-size` は `clamp()` または固定値（16px以上）を使用し、OS設定の文字拡大に追従させる。
- フォームの `input` / `textarea` は `font-size: 16px` 以上を必須とし、iOSの自動ズームを防ぐ。

---

## 12. アクセシビリティ方針（NFR-02）

- インタラクティブ要素には `aria-label` または可視テキストを必ず付与する。
- 選択状態は `aria-pressed` または `aria-selected` で表現する。
- 色だけで状態を表すことを避け、アイコン・テキストを必ず併用する。
- フォーカスリングを `:focus-visible` で明示的に定義する（既存の `.enter-button` の実装に倣う）。

---

## 13. 将来拡張への考慮

| 将来機能 | 今回の準備 |
|---|---|
| Amazon Bedrockとの接続 | `parseNaturalQuery` 関数を差し替え可能な形で分離 |
| DynamoDBへのデータ移行 | イベントデータを `events.ts` に集約し、APIレスポンスと同形の型を定義 |
| AppSyncによるリアルタイム通信 | ダミーユーザー・投稿データを外部から注入できるPropsベース設計 |
| 本格認証（Cognito等） | セッション情報をコンテキストで管理し、認証状態を差し込みやすい構造 |
