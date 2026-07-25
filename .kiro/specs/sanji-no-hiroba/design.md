# 技術設計書：さんじのひろば

**バージョン：** 2.0
**作成日：** 2026年7月17日
**最終更新：** 2026年7月24日
**対象：** AWS本番環境へデプロイするMVP

---

## 1. 文書情報

本文書は requirements.md v4.0 に基づく技術設計書である。

すべてのコンポーネントはAWS上へデプロイし、実機スマートフォンからHTTPSでアクセスできる状態を前提とする。

**v2.0での主な変更点：**
- localStorage前提からAWS本番環境前提へ全面移行
- 認証をAWS Cognitoへ移行
- データ永続化をDynamoDBへ移行
- リアクション設計を複数種類送信・合計数表示・aria-label対応に更新
- イベントデータを「イベント／常設公共施設／公的支援」の3分類に対応
- 属性タグに「初参加歓迎」「途中入退室可能」を追加
- AI案内所設計を追加（対応表・入力例・紹介理由制約・検出カテゴリ・一般育児情報）
- 自動収集パイプライン設計を追加
- セキュリティ・デプロイ・運用設計を追加

---

## 2. 技術スタック

| 項目 | 採用技術 | 備考 |
|---|---|---|
| フレームワーク | React 19 + TypeScript | Vite 8 でビルド |
| スタイリング | CSS Modules | 外部UIライブラリ不使用 |
| 認証 | Amazon Cognito User Pools | メール＋パスワード認証 |
| API | Amazon API Gateway (REST) | Lambda統合 |
| バックエンド | AWS Lambda (Node.js 20) | TypeScript |
| データベース | Amazon DynamoDB | シングルテーブル設計 |
| ファイル配信 | Amazon S3 + CloudFront | HTTPS配信 |
| AI | Amazon Bedrock (Claude) | FR-AI-02/03/04、FR-COLLECT-02 |
| スケジューラ | Amazon EventBridge Scheduler | 日次自動収集 |
| ログ | Amazon CloudWatch Logs | バックエンドエラー＋収集ログ |
| IaC | AWS CDK (TypeScript) | インフラ定義 |
| パッケージ管理 | npm | モノレポ構成 |


---

## 3. AWSアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront                            │
│  (HTTPS配信 + カスタムドメイン or *.cloudfront.net)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
      ┌───────▼────────┐         ┌────────▼────────┐
      │   S3 Bucket    │         │  API Gateway    │
      │ (React SPA)    │         │  (REST API)     │
      └────────────────┘         └────────┬────────┘
                                          │ Cognito Authorizer
                                 ┌────────▼────────┐
                                 │   Lambda群       │
                                 │ (Node.js 20)    │
                                 └────────┬────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
           ┌────────▼────────┐   ┌────────▼────────┐  ┌────────▼────────┐
           │   DynamoDB      │   │   Bedrock       │  │  CloudWatch     │
           │ (シングルテーブル) │   │ (Claude)        │  │  Logs           │
           └─────────────────┘   └─────────────────┘  └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EventBridge Scheduler → Lambda (自動収集)                   │
│  毎日JST 03:00実行                                           │
└─────────────────────────────────────────────────────────────┘
```

### 3-1. Cognito User Pools

| 設定項目 | 値 |
|---|---|
| サインイン属性 | メールアドレス |
| パスワードポリシー | 最小8文字 |
| MFA | 無効（MVP） |
| メール検証 | 有効 |
| トークン有効期限 | アクセストークン 1時間、リフレッシュトークン 30日 |

フロントエンドは `@aws-amplify/auth` を使用してCognitoと通信する。

### 3-2. API Gateway

- REST API（リージョナルエンドポイント）
- Cognito User Pool Authorizer で全保護エンドポイントを認証
- CORS設定：CloudFrontのオリジンのみ許可
- スロットリング：1000 req/sec（MVP）

### 3-3. Lambda関数群

| 関数名 | 役割 | トリガー |
|---|---|---|
| api-user | プロフィール登録・取得・更新 | API Gateway |
| api-post | 投稿CRUD・24時間制御 | API Gateway |
| api-reaction | リアクション送信・取消・集計取得 | API Gateway |
| api-event | イベント一覧・詳細・絞り込み | API Gateway |
| api-saved | 「行ってみたい」保存・削除・一覧 | API Gateway |
| api-ai-search | AI案内所（手動検索＋AI条件抽出） | API Gateway |
| api-admin | 管理者操作（通報・非表示・review） | API Gateway |
| collector | 日次自動収集処理 | EventBridge |
| collector-structurize | AI構造化処理 | collector内部呼出 |

### 3-4. DynamoDB

シングルテーブル設計。パーティションキー `PK`、ソートキー `SK`、GSI1（`GSI1PK` / `GSI1SK`）を使用する。

### 3-5. S3 + CloudFront

- S3バケット：React SPAの静的ファイルを格納
- CloudFront：HTTPS配信、OAC（Origin Access Control）でS3直接アクセスを禁止
- キャッシュ：HTML = no-cache、JS/CSS/画像 = 1年（ハッシュ付きファイル名）

### 3-6. EventBridge Scheduler

- スケジュール：`cron(0 18 * * ? *)`（UTC 18:00 = JST 03:00）
- ターゲット：collector Lambda
- リトライ：最大2回


---

## 4. データモデル設計

### 4-1. DynamoDBテーブル設計（シングルテーブル）

**テーブル名：** `SanjiHiroba`

| PK | SK | 用途 |
|---|---|---|
| `USER#<userId>` | `PROFILE` | ユーザープロフィール |
| `USER#<userId>` | `AVATAR` | アバター設定 |
| `USER#<userId>` | `SAVED#<eventId>` | 行ってみたい保存 |
| `POST#<postId>` | `META` | 投稿本文・メタ情報 |
| `POST#<postId>` | `REACTION#<userId>#<type>` | 個別リアクション記録 |
| `POST#<postId>` | `REACTION_COUNT` | リアクション種類別合計 |
| `EVENT#<eventId>` | `META` | イベント・施設・支援データ |
| `SOURCE#<sourceId>` | `META` | 情報源定義 |
| `COLLECT_LOG#<date>` | `<sourceId>` | 収集ログ |
| `REPORT#<reportId>` | `META` | 通報データ |
| `VISIT#<date>` | `<userId>` | 広場訪問記録（日次） |

**GSI1（グローバルセカンダリインデックス）：**

| GSI1PK | GSI1SK | 用途 |
|---|---|---|
| `POSTS` | `<timestamp>` | 投稿の時系列取得 |
| `EVENTS#<classification>` | `<date>#<eventId>` | 分類別イベント日付順取得 |
| `EVENTS#AREA#<city>` | `<date>#<eventId>` | 地域別イベント取得 |
| `USER_POSTS#<userId>` | `<timestamp>` | ユーザー別投稿取得 |
| `VISIT_DATE#<date>` | `<userId>` | 日別訪問者集計 |

### 4-2. ユーザープロフィール

```typescript
interface UserProfile {
  userId: string;          // Cognito sub
  nickname: string;        // 1〜20文字
  childAgeGroup: '0-1' | '2-3' | '4-preschool';
  createdAt: string;       // ISO 8601
  updatedAt: string;
}
```

### 4-3. アバター

```typescript
interface UserAvatar {
  userId: string;
  baseType: string;        // 6種類の基本アバターID
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  updatedAt: string;
}
```

### 4-4. 投稿

```typescript
interface Post {
  postId: string;          // ULID
  userId: string;
  text: string;            // 1〜60文字
  theme: PostTheme | null; // 11種類のテーマ（任意）
  createdAt: string;       // ISO 8601
  expiresAt: number;       // TTL（作成から24時間後のUnixタイムスタンプ）
  isDeleted: boolean;
  isHidden: boolean;       // 管理者非表示
}

type PostTheme =
  | 'feeling' | 'sleep' | 'meal' | 'terrible-twos'
  | 'development' | 'nursery' | 'siblings' | 'work-life'
  | 'parent-fatigue' | 'outing' | 'pre-school';
```

### 4-5. リアクション

```typescript
type ReactionType =
  | 'wakaru'       // 🫶 わかるよ
  | 'otsukare'     // ☕ おつかれさま
  | 'koko'         // 🌿 ここにいるよ
  | 'watashi-mo'   // 🙋 私も同じ
  | 'ouen'         // 📣 応援してるよ
  | 'oyasumi'      // 🌙 今日もおつかれさま
  | 'yokattane'    // 🎉 よかったね
  | 'hitoiki';     // 🍀 ひと息ついてね

// 個別リアクション記録
interface ReactionRecord {
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
}

// 投稿ごとのリアクション合計（種類別）
interface ReactionCounts {
  postId: string;
  counts: Record<ReactionType, number>;
}
```

### 4-6. イベント・施設・支援（3分類統合）

```typescript
type EventClassification = 'event' | 'facility' | 'support';

type EventCategory =
  | 'childcare-center' | 'community-center' | 'library'
  | 'museum' | 'play-experience' | 'consultation' | 'other';

type EventStatus =
  | 'candidate' | 'review_required' | 'published' | 'updated'
  | 'canceled' | 'postponed' | 'closed' | 'expired'
  | 'hidden' | 'source_unavailable';

type AttributeTag =
  | 'free' | 'no-reservation' | 'indoor' | 'outdoor'
  | 'rainy-day' | 'stroller-ok' | 'nursing-room'
  | 'diaper-change' | 'siblings-ok'
  | 'beginner-welcome' | 'mid-entry-exit-ok';

interface EventRecord {
  eventId: string;             // ULID
  classification: EventClassification;
  title: string;
  description: string;
  organizer: string;
  category: EventCategory;
  attributeTags: AttributeTag[];
  city: string;                // 市区町村
  venueName: string;
  address: string;
  startDate: string | null;    // ISO 8601（施設・支援はnull可）
  endDate: string | null;
  applicationDeadline: string | null;
  targetAgeMin: number | null; // 歳
  targetAgeMax: number | null;
  price: 'free' | 'paid';
  priceLabel: string;
  reservationRequired: boolean | null;
  capacity: number | null;
  officialUrl: string;
  sourceId: string;
  sourceUrl: string;
  contactInfo: string;
  status: EventStatus;
  lastConfirmedAt: string;     // ISO 8601
  manualOverrideFields: string[]; // 手動修正済みフィールド名
  createdAt: string;
  updatedAt: string;
}
```


---

## 5. API設計

### 5-1. 認証

すべてのAPIエンドポイントはCognito User Pool Authorizerで保護する（公開エンドポイントは存在しない）。

ベースURL: `https://<api-id>.execute-api.<region>.amazonaws.com/prod`

### 5-2. エンドポイント一覧

#### ユーザー

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/users/profile` | プロフィール登録 |
| GET | `/users/profile` | 自分のプロフィール取得 |
| PUT | `/users/profile` | プロフィール更新 |
| POST | `/users/avatar` | アバター登録 |
| GET | `/users/avatar` | 自分のアバター取得 |
| PUT | `/users/avatar` | アバター更新 |

#### 投稿

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/posts` | 投稿作成（60文字制限・禁止パターン検証） |
| GET | `/posts` | 投稿一覧取得（24時間以内、ページネーション） |
| DELETE | `/posts/{postId}` | 自分の投稿を削除 |

#### リアクション

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/posts/{postId}/reactions` | リアクション送信（type指定） |
| DELETE | `/posts/{postId}/reactions/{type}` | リアクション取消 |
| GET | `/posts/{postId}/reactions/counts` | 種類別合計数取得 |
| GET | `/posts/{postId}/reactions/mine` | 自分の送信済みリアクション取得 |

#### イベント（3分類統合）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/events` | 一覧取得（クエリパラメータで絞り込み） |
| GET | `/events/{eventId}` | 詳細取得 |

**絞り込みクエリパラメータ：**
- `classification`: `event` / `facility` / `support`
- `date`: `today` / `tomorrow` / `this-week`
- `city`: 市区町村名
- `ageGroup`: `0-1` / `2-3` / `4-preschool`
- `category`: EventCategory値
- `price`: `free` / `paid`
- `reservationRequired`: `true` / `false`
- `indoor`: `true` / `false`
- `limit`: 件数（デフォルト20、最大50）
- `nextToken`: ページネーション用

#### 行ってみたい

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/saved-events/{eventId}` | 保存 |
| DELETE | `/saved-events/{eventId}` | 保存取消 |
| GET | `/saved-events` | 保存一覧取得 |

#### AI案内所

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/ai-search/manual` | 手動条件検索（FR-AI-01） |
| POST | `/ai-search/natural` | AI自然文検索（FR-AI-02、Should） |

#### 広場

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/plaza/visit` | 訪問記録 |
| GET | `/plaza/today-count` | 今日の訪問者数取得 |
| GET | `/plaza/avatars` | 広場内表示用アバター一覧（最大7体） |

#### 管理者（Should）

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/admin/reports` | 通報一覧 |
| POST | `/admin/posts/{postId}/hide` | 投稿非表示 |
| GET | `/admin/events/review` | review_required一覧 |
| POST | `/admin/events/{eventId}/publish` | 公開 |
| POST | `/admin/events/{eventId}/hide` | 非公開 |
| GET | `/admin/collect-logs` | 収集ログ一覧 |


---

## 6. フロントエンド設計

### 6-1. ディレクトリ構成

```
src/
├── App.tsx                   # ルート：ルーティング＋認証ガード
├── App.css
├── index.css                 # グローバルスタイル・CSS変数
├── main.tsx                  # エントリポイント
│
├── auth/
│   ├── AuthProvider.tsx      # Cognito認証コンテキスト
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── auth.module.css
│
├── components/
│   ├── TopPage/
│   ├── ProfileSetup/         # ニックネーム＋年齢区分登録
│   ├── AvatarSelect/
│   ├── Plaza/
│   ├── PostArea/
│   ├── BulletinBoard/
│   ├── EventDetail/
│   ├── SavedEvents/
│   ├── AiSearch/
│   ├── SupportInfo/
│   └── ExitResult/
│
├── data/
│   ├── avatars.ts            # 6種類の基本アバター定義
│   ├── reactions.ts          # 8種類のリアクション定義
│   ├── themes.ts             # 11種類の投稿テーマ定義
│   ├── demoEvents.ts         # デモイベントデータ（20件以上）
│   ├── demoAvatars.ts        # デモ用アバターデータ
│   └── supportLinks.ts      # 相談窓口データ
│
├── hooks/
│   ├── useAuth.ts            # 認証状態フック
│   ├── useApi.ts             # API呼び出し共通フック
│   ├── usePosts.ts           # 投稿CRUD
│   ├── useReactions.ts       # リアクション操作
│   ├── useEvents.ts          # イベント検索
│   └── useSavedEvents.ts    # 行ってみたい
│
├── api/
│   └── client.ts             # API Gateway通信クライアント（Cognito JWT付与）
│
└── types/
    └── index.ts              # 共通型定義
```

### 6-2. 画面遷移フロー

```
[未認証]
  LoginPage ←→ RegisterPage
      │（ログイン成功）
      ▼
[初回のみ]
  ProfileSetup → AvatarSelect → Plaza
      │
[認証済み・登録済み]
      ▼
  Plaza（メイン広場）
    ├─[投稿]─→ PostArea（モーダル）
    ├─[掲示板]─→ BulletinBoard
    │               ├─[カードタップ]─→ EventDetail
    │               └─[AI検索タブ]─→ AiSearch
    ├─[保存一覧]─→ SavedEvents
    │               └─[カードタップ]─→ EventDetail
    ├─[案内所]─→ SupportInfo
    └─[退出]─→ ExitResult → TopPage
```

### 6-3. 状態管理

React Contextを使用する。外部状態管理ライブラリは導入しない。

```typescript
// AuthContext（認証）
interface AuthState {
  isAuthenticated: boolean;
  user: CognitoUser | null;
  accessToken: string | null;
}

// AppContext（アプリ状態）
interface AppState {
  profile: UserProfile | null;
  avatar: UserAvatar | null;
  currentPage: Page;
  previousPage: Page | null;
  selectedEventId: string | null;
}

type Page =
  | 'login' | 'register'
  | 'profileSetup' | 'avatarSelect'
  | 'plaza' | 'postArea' | 'bulletinBoard'
  | 'eventDetail' | 'savedEvents'
  | 'aiSearch' | 'supportInfo' | 'exitResult';
```

### 6-4. ニックネーム表示

- 広場内で各アバターの下にニックネームを表示する（FR-PROFILE-01）
- 自分のニックネームも他の利用者のニックネームも同様に表示する
- フォントサイズ: 12px、最大幅: アバター幅と同等、overflow時は省略記号


---

## 7. リアクション設計

### 7-1. リアクション定義

```typescript
const REACTIONS = [
  { type: 'wakaru',     emoji: '🫶', label: 'わかるよ' },
  { type: 'otsukare',   emoji: '☕', label: 'おつかれさま' },
  { type: 'koko',       emoji: '🌿', label: 'ここにいるよ' },
  { type: 'watashi-mo', emoji: '🙋', label: '私も同じ' },
  { type: 'ouen',       emoji: '📣', label: '応援してるよ' },
  { type: 'oyasumi',    emoji: '🌙', label: '今日もおつかれさま' },
  { type: 'yokattane',  emoji: '🎉', label: 'よかったね' },
  { type: 'hitoiki',    emoji: '🍀', label: 'ひと息ついてね' },
] as const;
```

### 7-2. 動作仕様

- 1投稿に対して同一利用者が**複数種類**のリアクションを送信できる
- 同一種類は1回まで。再度押すと取り消し（トグル動作）
- 自分の投稿にはリアクションボタンを非活性にする
- 各投稿の下に種類ごとの合計送信数を表示する

### 7-3. 表示形式

```
[🫶 3] [☕ 5] [🌿 1] [🙋 2] ...
```

- 合計数0の種類も表示する（押下可能であることを示す）
- 自分が送信済みの種類はボタンをハイライト（`aria-pressed="true"`）

### 7-4. アクセシビリティ

- 各リアクションボタンに `aria-label` を付与する
- 形式: `"{label} リアクション {count}件"`
- 例: `aria-label="わかるよ リアクション 3件"`
- 自分が送信済みの場合: `aria-label="わかるよ リアクション 3件 送信済み"`

### 7-5. バックエンド処理

- リアクション送信: `POST /posts/{postId}/reactions` body: `{ type: "wakaru" }`
- DynamoDBトランザクション: 個別記録の書き込み＋合計数のアトミック更新（`ADD`）
- 取り消し: `DELETE /posts/{postId}/reactions/{type}`
- DynamoDBトランザクション: 個別記録の削除＋合計数のアトミック減算

---

## 8. イベント3分類・属性タグ・自動収集パイプライン

### 8-1. 3分類の定義

| classification | 説明 | 日付の扱い |
|---|---|---|
| `event` | 開催日時が定められた単発・期間限定の催し | startDate必須 |
| `facility` | 常時利用可能な公共施設 | startDate = null（常設） |
| `support` | 行政が提供する制度的支援 | startDate = null（通年） |

### 8-2. 属性タグ（11種類）

| タグキー | 表示名 |
|---|---|
| `free` | 無料 |
| `no-reservation` | 予約不要 |
| `indoor` | 屋内 |
| `outdoor` | 屋外 |
| `rainy-day` | 雨の日対応 |
| `stroller-ok` | ベビーカー可 |
| `nursing-room` | 授乳室あり |
| `diaper-change` | おむつ交換設備あり |
| `siblings-ok` | きょうだい参加可 |
| `beginner-welcome` | 初参加歓迎 |
| `mid-entry-exit-ok` | 途中入退室可能 |

### 8-3. 自動収集パイプライン

```
EventBridge (JST 03:00)
  → collector Lambda
      ├─ 情報源1: fetch → parse → structurize (Bedrock)
      ├─ 情報源2: fetch → parse → structurize (Bedrock)
      └─ 情報源3: fetch → parse → structurize (Bedrock)
          │
          ▼
      検証ロジック
          ├─ 全条件Pass → status: published
          ├─ 曖昧・矛盾あり → status: review_required
          └─ 重複検出 → スキップ
          │
          ▼
      DynamoDB書き込み + ログ記録
```

### 8-4. 重複判定ロジック

1. `officialUrl` が既存レコードと完全一致 → 重複
2. `title` + `startDate` + `venueName` がすべて既存と一致 → 重複
3. 重複判定されたデータは新規登録しない

### 8-5. 変更検知と更新

- 再収集時、既存レコードのURL一致で同定
- `startDate`、`endDate`、`venueName`、`price`、`reservationRequired`、`status` に差分があれば更新
- `manualOverrideFields` に含まれるフィールドは上書きしない
- 更新時に `status` を `updated` に変更

### 8-6. 収集ログ

```typescript
interface CollectLog {
  date: string;             // "YYYY-MM-DD"
  sourceId: string;
  status: 'success' | 'failure';
  fetchedCount: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  reviewRequiredCount: number;
  errorMessage: string | null;
  executedAt: string;       // ISO 8601
}
```


---

## 9. AI案内所設計

### 9-1. FR-AI-01 手動条件検索

手動検索はLambda内でDynamoDBクエリを実行する。AIは使用しない。

**悩みと紹介先の基本対応表（検索ロジック内蔵）：**

| 悩み・希望カテゴリ | 優先検索対象のcategory / classification |
|---|---|
| 孤独・話し相手がほしい | `childcare-center`, `community-center` |
| 子どもの遊び場を探したい | `play-experience`, `library`, `museum` |
| 発達・言葉が気になる | `consultation`, classification=`support` |
| 一時預かり・休息がほしい | classification=`support`, `childcare-center` |
| 経済的に困っている | classification=`support` |
| 引っ越し・転入したばかり | `childcare-center`, `community-center`, classification=`support` |
| 食事・栄養が心配 | `consultation`, classification=`support` |
| 就学前の準備が不安 | `consultation`, classification=`support` |

この対応表をLambda内の定数として実装し、選択されたカテゴリに応じてDynamoDBのフィルタ条件を組み立てる。

### 9-2. FR-AI-02 AIによる条件抽出と紹介

**処理フロー：**

```
利用者入力（最大200文字）
  → Lambda (api-ai-search)
    → Bedrock (Claude) に条件抽出を依頼
      プロンプト:
        - 入力テキストから条件を抽出する
        - 抽出する条件: 悩みカテゴリ、年齢区分、地域、日時、活動種類、
          屋内/屋外、料金、予約条件、施設カテゴリ
    → 抽出した条件でDynamoDBを検索
    → 最大3件の結果を取得
    → Bedrock (Claude) に紹介理由の生成を依頼
      プロンプト制約:
        - 登録済みデータの属性のみに基づいて理由を記述する
        - データに記載のない情報を推測しない
        - 「おそらく」「かもしれません」を使用しない
        - 根拠のない属性に言及しない
    → レスポンス返却
```

**入力例（UIヒント表示用）：**

1. 「1歳の子どもと雨の日に室内で遊べる場所を探しています」
2. 「引っ越してきたばかりで近所にママ友がいません。気軽に行ける場所はありますか」
3. 「2歳の子が言葉が遅いかもしれず不安です。相談できるところを知りたい」
4. 「無料で予約なしで行ける子育て広場を博多区で探しています」
5. 「3歳のきょうだいも一緒に参加できるイベントはありますか」
6. 「来年小学校に上がるので就学前に準備できることを知りたい」

### 9-3. FR-AI-03 深刻・緊急入力の検出

**検出はBedrock呼び出し前にLambda内のキーワードマッチで実施する。**

```typescript
const CRISIS_KEYWORDS: Record<string, string[]> = {
  'self-harm': ['死にたい', '消えたい', '自分を傷つけたい'],
  'abuse-self': ['子どもを叩いてしまう', '手が出そう', '怒りが止まらない'],
  'abuse-report': ['虐待を見た', '泣き続けている'],
  'dv': ['殴られる', '暴力を受けている', '逃げたい'],
  'economic-crisis': ['食べるものがない', '電気が止まる', '住む場所がない'],
  'mental-crisis': ['眠れない日が続く', '何も感じない', '限界'],
};
```

検出時はAI検索を行わず、対応する相談窓口情報を即時返却する。

| カテゴリ | 優先表示窓口 |
|---|---|
| self-harm | いのちの電話、よりそいホットライン |
| abuse-self | 児童相談所虐待対応ダイヤル（189）、子育て支援相談 |
| abuse-report | 児童相談所虐待対応ダイヤル（189） |
| dv | DV相談ナビ（#8008）、配偶者暴力相談支援センター |
| economic-crisis | 生活困窮者自立支援窓口、福祉事務所 |
| mental-crisis | こころの健康相談統一ダイヤル、精神保健福祉センター |

### 9-4. FR-AI-04 一般的育児情報の提供

**条件：** DynamoDB検索結果が0件の場合のみ実行する。

**処理フロー：**

```
DynamoDB検索結果 = 0件
  → Bedrock (Claude) に一般的育児情報の提供を依頼
    プロンプト制約:
      - 情報源: 厚生労働省、こども家庭庁、福岡県・福岡市公式ガイドのみ
      - 最大2件
      - 各件に情報源URL・資料名を必ず付記
      - 医療的助言・診断・治療法の提示は禁止
  → 注記を付与:「この情報は一般的な育児情報であり、個別の相談・診断ではありません」
  → レスポンス返却
```


---

## 10. セキュリティ・認証・プライバシー設計

### 10-1. 認証フロー

```
RegisterPage
  → Cognito SignUp (email + password)
  → メール検証コード送信
  → 検証コード入力
  → アカウント確認完了
  → ログイン画面へ

LoginPage
  → Cognito SignIn (email + password)
  → アクセストークン + リフレッシュトークン取得
  → AuthContext にセット
  → プロフィール有無を確認 → 広場 or 初回設定
```

### 10-2. API認可

- API Gatewayの全エンドポイントにCognito Authorizerを設定
- Lambda内で `event.requestContext.authorizer.claims.sub` からuserId取得
- 管理者エンドポイントはCognitoグループ `admin` のメンバーのみアクセス可

### 10-3. 投稿の禁止パターン検証（Lambda内）

```typescript
const BLOCKED_PATTERNS = [
  /https?:\/\//i,                    // URL
  /[\w.+-]+@[\w-]+\.[\w.]+/,        // メールアドレス
  /\d{10,11}/,                       // 電話番号（10〜11桁連続数字）
  /@[\w]+/,                          // SNS ID
];
```

- 投稿作成API内で全パターンを検査し、1つでも該当すればステータス400を返す
- エラーメッセージ: `「連絡先情報を含む投稿は送信できません」`

### 10-4. データアクセス制御

| 操作 | 制御 |
|---|---|
| 投稿削除 | 自分の投稿のみ（userId一致チェック） |
| リアクション送信 | 自分の投稿には不可（postのuserId ≠ リクエストのuserId） |
| プロフィール取得 | 自分のプロフィールのみ取得可（他者のニックネームは広場API経由で取得） |
| 管理者操作 | Cognitoグループ `admin` のメンバーのみ |

### 10-5. 収集しない個人情報

以下の情報はCognito・DynamoDBのいずれにも保存しない。
- 本名、子どもの実名、正確な住所、GPS位置情報、園名・学校名、子どもの正確な生年月日、医療・健康情報

### 10-6. フロントエンドセキュリティ

- AWSアクセスキーをフロントエンドに含めない
- Cognitoのアクセストークンのみを使用してAPIを呼び出す
- トークンはメモリ内保持（localStorageにリフレッシュトークンのみ保存、Amplifyデフォルト挙動）

---

## 11. デプロイ・運用設計

### 11-1. インフラ定義

AWS CDK (TypeScript) で以下のスタックを定義する。

| スタック | リソース |
|---|---|
| AuthStack | Cognito User Pool, User Pool Client |
| DataStack | DynamoDB テーブル, GSI |
| ApiStack | API Gateway, Lambda関数群, IAMロール |
| FrontendStack | S3バケット, CloudFront Distribution, OAC |
| CollectorStack | EventBridge Scheduler, collector Lambda, Bedrock権限 |
| MonitoringStack | CloudWatch Log Groups, アラーム |

### 11-2. デプロイフロー

```
1. CDK deploy (インフラ)
2. Lambda コードをデプロイ（CDK内で自動バンドル）
3. React ビルド (npm run build)
4. S3 へアップロード (aws s3 sync)
5. CloudFront キャッシュ無効化
```

### 11-3. 環境変数管理

| 変数 | 格納先 |
|---|---|
| Cognito User Pool ID | CDK出力 → フロントエンド環境変数 |
| Cognito Client ID | CDK出力 → フロントエンド環境変数 |
| API Gateway URL | CDK出力 → フロントエンド環境変数 |
| DynamoDB テーブル名 | Lambda環境変数 |
| Bedrock モデルID | Lambda環境変数 |
| 情報源URL一覧 | Lambda環境変数 or DynamoDB |

フロントエンド環境変数は `VITE_` プレフィックスで `.env.production` に記載し、ビルド時に埋め込む。

### 11-4. モニタリング

- Lambda エラーログ → CloudWatch Logs
- 自動収集ログ → DynamoDB + CloudWatch Logs
- API Gateway 4xx/5xx → CloudWatch メトリクス
- CloudWatch Alarm: 収集Lambda失敗時にメール通知（SNS）

### 11-5. デモモード

AWS未接続時（ローカル開発時）のデモモード実装方針：

- 環境変数 `VITE_DEMO_MODE=true` でデモモードを有効化
- デモモード時はAPIを呼ばず、`src/data/` のデモデータを使用する
- 広場の訪問者数は3〜8のランダム整数を表示し、「デモ表示」と明記する
- 投稿・リアクションはメモリ内で完結する（永続化しない）

---

## 12. デザイントークン

既存の `index.css` をベースに、CSS カスタムプロパティを統一する。

```css
:root {
  /* カラーパレット */
  --color-primary:        #7166b5;
  --color-primary-dark:   #6257a6;
  --color-primary-light:  #ece8f5;
  --color-accent-pink:    #f2a6a0;
  --color-accent-green:   #83bfb0;
  --color-text-main:      #403c4a;
  --color-text-sub:       #6c6678;
  --color-surface:        rgba(255, 255, 255, 0.88);
  --color-border:         rgba(113, 102, 181, 0.14);
  --color-danger:         #d94f4f;

  /* タイポグラフィ */
  --font-size-base:    1rem;
  --font-size-sm:      0.875rem;
  --font-size-lg:      1.125rem;
  --font-size-xl:      1.5rem;
  --font-size-xs:      0.75rem;

  /* スペーシング */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  36px;

  /* ボタン最小タップサイズ */
  --tap-min: 44px;

  /* 角丸 */
  --radius-sm:   8px;
  --radius-md:  16px;
  --radius-lg:  24px;
  --radius-full: 999px;
}
```

---

## 13. アクセシビリティ方針

- インタラクティブ要素に `aria-label` または可視テキストを必ず付与する
- リアクションボタン: `aria-label="{label} リアクション {count}件"` 形式
- 選択状態は `aria-pressed` または `aria-selected` で表現する
- 色だけで状態を表さず、アイコン・テキストを必ず併用する
- フォーカスリングを `:focus-visible` で明示する
- フォームの `input` / `textarea` は `font-size: 16px` 以上（iOSズーム防止）

---

## 14. 未決定事項

| 事項 | 確定タイミング |
|---|---|
| AWSリージョン（ap-northeast-1想定） | デプロイ時に確定 |
| カスタムドメイン名 | 運営側が別途決定 |
| Bedrock使用モデルの具体バージョン | tasks.md作成時に確定 |
| 承認済み公式情報源3件の具体的URL | 運営側が別途決定 |
| 利用規約・プライバシーポリシー本文 | 運営側が別途作成 |
| アバターの具体的ビジュアル（SVG/画像） | tasks.mdで確定 |
| Cognito メール送信元ドメイン | デプロイ時に確定 |
