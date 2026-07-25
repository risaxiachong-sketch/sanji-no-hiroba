# 実装タスク一覧：さんじのひろば

**バージョン：** 2.0
**作成日：** 2026年7月17日
**最終更新：** 2026年7月24日
**対象：** AWS本番環境へデプロイするMVP

各タスクは依存関係の順に並んでいる。
タスクを完了したら `[x]` にチェックを入れる。

---

## フェーズ 1　AWS基盤・インフラ構築

### TASK-01　プロジェクト構成の整備（モノレポ）

**対応要件：** design.md §2
**対応ファイル：** プロジェクトルート

- [x] モノレポ構成を作成する
  ```
  /
  ├── frontend/          # React SPA（既存 src/ を移動）
  ├── backend/           # Lambda関数群
  │   ├── functions/
  │   └── shared/        # 共通ユーティリティ・型
  └── infra/             # AWS CDK
  ```
- [x] `frontend/package.json` を作成する（既存の依存関係を移行）
- [x] `backend/package.json` を作成する（`@aws-sdk/*`、`ulid`）
- [x] `infra/package.json` を作成する（`aws-cdk-lib`、`constructs`）
- [x] ルートに `package.json`（workspaces設定）を作成する
- [x] `.gitignore` にCDK出力（`cdk.out/`）を追加する

**完了条件：** 各ディレクトリで `npm install` が成功する

---

### TASK-02　AWS CDK AuthStack（Cognito）

**対応要件：** FR-AUTH-01、FR-AUTH-02、NFR-SECURITY-01
**対応ファイル：** `infra/lib/auth-stack.ts`

- [x] `infra/` でCDKプロジェクトを初期化する（TypeScript）
- [x] Cognito User Poolを定義する
  - サインイン属性: メールアドレス
  - パスワードポリシー: 最小8文字
  - メール検証: 有効
  - セルフサインアップ: 有効
- [x] User Pool Clientを定義する（SRPフロー）
- [x] スタック出力としてUser Pool IDとClient IDをエクスポートする

**完了条件：** `cdk synth` でCloudFormationテンプレートが生成される

---

### TASK-03　AWS CDK DataStack（DynamoDB）

**対応要件：** design.md §4
**対応ファイル：** `infra/lib/data-stack.ts`

- [x] DynamoDBテーブル `SanjiHiroba` を定義する
  - パーティションキー: `PK`（文字列）
  - ソートキー: `SK`（文字列）
  - 課金モード: オンデマンド
  - TTL属性: `expiresAt`
- [x] GSI1を定義する
  - パーティションキー: `GSI1PK`（文字列）
  - ソートキー: `GSI1SK`（文字列）
- [x] スタック出力としてテーブル名とARNをエクスポートする

**完了条件：** `cdk synth` でテーブル定義が含まれるテンプレートが生成される

---

### TASK-04　AWS CDK ApiStack（API Gateway + Lambda）

**対応要件：** design.md §3-2、§3-3、§5
**対応ファイル：** `infra/lib/api-stack.ts`

- [x] REST API（API Gateway）を定義する
- [x] Cognito User Pool Authorizerを設定する
- [x] 以下のLambda関数を定義する（NodejsFunction、バンドル設定）
  - `api-user`
  - `api-post`
  - `api-reaction`
  - `api-event`
  - `api-saved`
  - `api-ai-search`
  - `api-plaza`
  - `api-admin`
- [x] 各Lambda関数にDynamoDBテーブルへのアクセス権限を付与する
- [x] `api-ai-search` にBedrock InvokeModel権限を付与する
- [x] CORS設定を追加する（CloudFrontオリジンのみ許可）
- [x] APIエンドポイントURLをスタック出力としてエクスポートする

**完了条件：** `cdk synth` でAPI Gateway + Lambda定義が含まれるテンプレートが生成される

---

### TASK-05　AWS CDK FrontendStack（S3 + CloudFront）

**対応要件：** FR-AUTH-03、NFR-AWS-01
**対応ファイル：** `infra/lib/frontend-stack.ts`

- [ ] S3バケットを定義する（パブリックアクセスブロック有効）
- [ ] CloudFront Distributionを定義する
  - OAC（Origin Access Control）でS3へアクセス
  - デフォルトルートオブジェクト: `index.html`
  - SPAフォールバック: 404 → `/index.html`（200応答）
  - HTTPS強制
- [ ] S3バケットポリシーでCloudFrontからのアクセスのみ許可する
- [ ] CloudFront URLをスタック出力としてエクスポートする

**完了条件：** `cdk synth` でS3 + CloudFront定義が含まれるテンプレートが生成される

---

### TASK-06　AWS CDK CollectorStack（EventBridge + Lambda）

**対応要件：** FR-COLLECT-01、design.md §3-6
**対応ファイル：** `infra/lib/collector-stack.ts`

- [ ] collector Lambda関数を定義する
- [ ] EventBridge Schedulerルールを定義する
  - スケジュール: `cron(0 18 * * ? *)`（UTC 18:00 = JST 03:00）
  - ターゲット: collector Lambda
- [ ] collector LambdaにDynamoDB書き込み権限を付与する
- [ ] collector LambdaにBedrock InvokeModel権限を付与する

**完了条件：** `cdk synth` でEventBridge + Lambda定義が含まれるテンプレートが生成される

---

## フェーズ 2　バックエンド実装（認証・ユーザー・広場）

### TASK-07　共通型定義・ユーティリティ（バックエンド）

**対応要件：** design.md §4
**対応ファイル：** `backend/shared/types.ts`、`backend/shared/dynamo.ts`

- [ ] `backend/shared/types.ts` を作成する
  - `UserProfile`、`UserAvatar`、`Post`、`PostTheme`
  - `ReactionType`（8種類）、`ReactionRecord`、`ReactionCounts`
  - `EventClassification`、`EventCategory`、`EventStatus`、`AttributeTag`
  - `EventRecord`、`CollectLog`
- [ ] `backend/shared/dynamo.ts` を作成する
  - DynamoDBクライアントのシングルトン
  - `putItem`、`getItem`、`queryItems`、`updateItem`、`deleteItem` ヘルパー
  - テーブル名を環境変数から取得する処理

**完了条件：** TypeScriptコンパイルエラーなし

---

### TASK-08　api-user Lambda実装

**対応要件：** FR-PROFILE-01、FR-AVATAR-01
**対応ファイル：** `backend/functions/api-user/`

- [ ] `POST /users/profile` — プロフィール登録
  - ニックネーム: 1〜20文字バリデーション
  - 年齢区分: `0-1` / `2-3` / `4-preschool` のみ許可
  - DynamoDB書き込み（PK: `USER#<userId>`, SK: `PROFILE`）
- [ ] `GET /users/profile` — 自分のプロフィール取得
- [ ] `PUT /users/profile` — プロフィール更新
- [ ] `POST /users/avatar` — アバター登録
  - baseType: 6種類のIDバリデーション
  - 各カスタマイズ項目の存在チェック
- [ ] `GET /users/avatar` — アバター取得
- [ ] `PUT /users/avatar` — アバター更新
- [ ] userId はCognito JWT claims.subから取得する

**完了条件：** ローカル呼び出し（`sam local invoke` or 手動テスト）でCRUD動作を確認

---

### TASK-09　api-plaza Lambda実装

**対応要件：** FR-PLAZA-01
**対応ファイル：** `backend/functions/api-plaza/`

- [ ] `POST /plaza/visit` — 訪問記録
  - DynamoDB書き込み（PK: `VISIT#<date>`, SK: `<userId>`）
  - 同日の重複書き込みは条件付き書き込み（ConditionExpression）で制御
- [ ] `GET /plaza/today-count` — 今日の訪問者数取得
  - JST日付で `VISIT#<date>` のアイテム数をカウント
- [ ] `GET /plaza/avatars` — 広場表示用アバター一覧
  - 直近アクティブユーザーから最大7体のアバター＋ニックネームを返す
  - 実ユーザーが不足する場合、デモ用アバターで補完する
  - デモ用アバターには `isDemo: true` フラグを付与する

**完了条件：** 訪問記録が重複なく保存され、カウントが正しく返る

---

### TASK-10　api-post Lambda実装

**対応要件：** FR-POST-01、FR-POST-02、NFR-SECURITY-03
**対応ファイル：** `backend/functions/api-post/`

- [ ] `POST /posts` — 投稿作成
  - テキスト: 1〜60文字バリデーション
  - テーマ: 11種類 or null バリデーション
  - 禁止パターン検証（URL、メールアドレス、電話番号、SNS ID）
  - 拒否時レスポンス: 400 + `「連絡先情報を含む投稿は送信できません」`
  - TTL設定: 作成から24時間後のUnixタイムスタンプ
  - GSI1PK: `POSTS`、GSI1SK: タイムスタンプ
- [ ] `GET /posts` — 投稿一覧取得
  - GSI1を使用して時系列降順で取得
  - `isDeleted: false` かつ `isHidden: false` のみ返す
  - ページネーション（limit + nextToken）
  - 各投稿にリアクション合計数を含める
- [ ] `DELETE /posts/{postId}` — 自分の投稿を削除
  - userId一致チェック（不一致は403）
  - `isDeleted: true` に更新（論理削除）

**完了条件：** 禁止パターンを含む投稿が拒否され、正常投稿はTTL付きで保存される

---

## フェーズ 3　バックエンド実装（リアクション・イベント・保存）

### TASK-11　api-reaction Lambda実装

**対応要件：** FR-REACTION-01、design.md §7
**対応ファイル：** `backend/functions/api-reaction/`

- [ ] `POST /posts/{postId}/reactions` — リアクション送信
  - body: `{ type: ReactionType }`（8種類バリデーション）
  - 自分の投稿への送信を禁止する（投稿のuserIdと照合、一致は403）
  - 同一種類の重複送信を禁止する（既存レコードチェック）
  - DynamoDBトランザクション:
    1. 個別記録の書き込み（PK: `POST#<postId>`, SK: `REACTION#<userId>#<type>`）
    2. 合計数のアトミック加算（PK: `POST#<postId>`, SK: `REACTION_COUNT`、`counts.<type>` を +1）
- [ ] `DELETE /posts/{postId}/reactions/{type}` — リアクション取消
  - DynamoDBトランザクション:
    1. 個別記録の削除
    2. 合計数のアトミック減算
- [ ] `GET /posts/{postId}/reactions/counts` — 種類別合計数取得
  - `REACTION_COUNT` レコードを返す
- [ ] `GET /posts/{postId}/reactions/mine` — 自分の送信済みリアクション取得
  - `REACTION#<userId>#*` のクエリで取得

**完了条件：** 複数種類送信可、同一種類重複不可、取消で合計数が減算される

---

### TASK-12　api-event Lambda実装

**対応要件：** FR-EVENT-01、FR-EVENT-02、design.md §8
**対応ファイル：** `backend/functions/api-event/`

- [ ] `GET /events` — 一覧取得（絞り込み）
  - クエリパラメータ処理:
    - `classification`: `event` / `facility` / `support`
    - `date`: `today` / `tomorrow` / `this-week`（JST計算）
    - `city`: 市区町村フィルタ
    - `ageGroup`: 年齢区分フィルタ
    - `category`: カテゴリフィルタ
    - `price`: `free` / `paid`
    - `reservationRequired`: `true` / `false`
    - `indoor`: `true` / `false`
    - `limit`、`nextToken`
  - 表示対象ステータス: `published`、`updated`、`postponed`、`closed` のみ
  - GSI1を使用した分類別・日付順クエリ
- [ ] `GET /events/{eventId}` — 詳細取得
  - 全フィールド（属性タグ11種類含む）を返す

**完了条件：** 分類フィルタ、日付フィルタ、複合条件が正しく動作する

---

### TASK-13　api-saved Lambda実装

**対応要件：** FR-EVENT-03
**対応ファイル：** `backend/functions/api-saved/`

- [ ] `POST /saved-events/{eventId}` — 保存
  - DynamoDB書き込み（PK: `USER#<userId>`, SK: `SAVED#<eventId>`）
- [ ] `DELETE /saved-events/{eventId}` — 保存取消
  - DynamoDB削除
- [ ] `GET /saved-events` — 保存一覧取得
  - PK: `USER#<userId>` のSKプレフィクス `SAVED#` でクエリ
  - 各eventIdに対応するイベント詳細を取得して返す

**完了条件：** 保存・取消・一覧取得が正しく動作する

---

## フェーズ 4　バックエンド実装（AI案内所・自動収集）

### TASK-14　api-ai-search Lambda実装（手動検索：Must）

**対応要件：** FR-AI-01、design.md §9-1
**対応ファイル：** `backend/functions/api-ai-search/`

- [ ] `POST /ai-search/manual` — 手動条件検索
  - リクエストbody: 悩みカテゴリ、年齢区分、地域、日時、活動種類、屋内/屋外、料金、予約要否、施設カテゴリ
  - 悩みと紹介先の基本対応表をLambda内定数として実装する
    | 悩みカテゴリ | 優先検索category/classification |
    |---|---|
    | 孤独・話し相手がほしい | childcare-center, community-center |
    | 子どもの遊び場を探したい | play-experience, library, museum |
    | 発達・言葉が気になる | consultation, support |
    | 一時預かり・休息がほしい | support, childcare-center |
    | 経済的に困っている | support |
    | 引っ越し・転入したばかり | childcare-center, community-center, support |
    | 食事・栄養が心配 | consultation, support |
    | 就学前の準備が不安 | consultation, support |
  - 対応表に基づきDynamoDBフィルタ条件を組み立てて検索する
  - 該当なし: `「条件に合う情報が見つかりませんでした」`を返す

**完了条件：** 対応表に基づいた検索結果が正しく返る

---

### TASK-15　api-ai-search Lambda実装（AI自然文検索：Should）

**対応要件：** FR-AI-02、FR-AI-03、FR-AI-04、design.md §9-2〜9-4
**対応ファイル：** `backend/functions/api-ai-search/`

- [ ] `POST /ai-search/natural` — AI自然文検索
- [ ] **Step 1: 深刻・緊急入力の検出**（Bedrock呼び出し前に実行）
  - キーワードマッチによる6カテゴリ検出:
    - self-harm: 「死にたい」「消えたい」「自分を傷つけたい」
    - abuse-self: 「子どもを叩いてしまう」「手が出そう」「怒りが止まらない」
    - abuse-report: 「虐待を見た」「泣き続けている」
    - dv: 「殴られる」「暴力を受けている」「逃げたい」
    - economic-crisis: 「食べるものがない」「電気が止まる」「住む場所がない」
    - mental-crisis: 「眠れない日が続く」「何も感じない」「限界」
  - 検出時: 対応する公的相談窓口情報を即時返却（AI検索は実行しない）
  - 窓口情報に名称・電話番号・受付時間・URLを含める
- [ ] **Step 2: Bedrockによる条件抽出**
  - 入力テキスト（最大200文字）から条件を抽出するプロンプトを設計する
  - 抽出対象: 悩みカテゴリ、年齢区分、地域、日時、活動種類、屋内/屋外、料金、予約条件、施設カテゴリ
- [ ] **Step 3: DynamoDB検索**
  - 抽出条件でクエリを構築し、最大3件を取得する
- [ ] **Step 4: 紹介理由の生成**
  - Bedrockプロンプト制約:
    - 登録済みデータの属性のみに基づいて理由を記述する
    - データに記載のない情報を推測しない
    - 「おそらく」「かもしれません」を使用しない
    - 根拠のない属性に言及しない
- [ ] **Step 5: 0件時の一般的育児情報（FR-AI-04）**
  - DynamoDB検索結果が0件の場合のみ実行
  - Bedrockプロンプト制約:
    - 情報源: 厚生労働省、こども家庭庁、福岡県・福岡市公式ガイドのみ
    - 最大2件
    - 各件に情報源URL・資料名を付記
    - 医療的助言・診断・治療法の提示は禁止
  - 注記を付与:「この情報は一般的な育児情報であり、個別の相談・診断ではありません」

**完了条件：** 深刻入力で窓口表示、通常入力で最大3件紹介、0件で育児情報表示

---

### TASK-16　collector Lambda実装（自動収集）

**対応要件：** FR-COLLECT-01〜06、design.md §8-3〜8-6
**対応ファイル：** `backend/functions/collector/`

- [ ] EventBridgeからの起動を受けて処理を開始する
- [ ] 情報源定義をDynamoDBまたは環境変数から取得する（3件）
- [ ] 各情報源について以下を実行する（1つの失敗で他は中断しない）:
  1. Webページ取得（公開API/RSS優先）
  2. Bedrock呼び出しによる構造化（FR-COLLECT-02の全項目）
     - 元ページに記載のない情報はnull
  3. 検証ロジック（FR-COLLECT-03）:
     - 全条件Pass → `published`
     - 曖昧・矛盾あり → `review_required`
  4. 重複判定（FR-COLLECT-04）:
     - officialUrl一致 → 重複
     - title + startDate + venueName一致 → 重複
  5. 変更検知（FR-COLLECT-05）:
     - 既存レコードの差分チェック
     - `manualOverrideFields` は上書きしない
     - 変更あれば `status: updated`
  6. DynamoDB書き込み
- [ ] 収集ログをDynamoDBに記録する
  - 実行日時、情報源ごとの成功/失敗、取得件数、新規/更新/スキップ/確認待ち件数
- [ ] CloudWatch Logsに詳細ログを出力する

**完了条件：**
- 3つの情報源から収集処理が実行される
- 1つの失敗で他が中断しない
- 同じ処理を2回実行しても重複登録されない
- 収集ログがDynamoDBに記録される

---

## フェーズ 5　フロントエンド基盤

### TASK-17　フロントエンド認証基盤

**対応要件：** FR-AUTH-01、FR-AUTH-02、design.md §6-3、§10-1
**対応ファイル：** `frontend/src/auth/`

- [ ] `@aws-amplify/auth` をインストールする
- [ ] `frontend/src/auth/AuthProvider.tsx` を作成する
  - Amplify Auth設定（User Pool ID、Client ID を環境変数から取得）
  - AuthContext: `isAuthenticated`、`user`、`accessToken`
  - `signUp`、`confirmSignUp`、`signIn`、`signOut` ラッパー関数
- [ ] `frontend/src/auth/LoginPage.tsx` を作成する
  - メールアドレス＋パスワード入力フォーム
  - エラーメッセージ: 「メールアドレスまたはパスワードが正しくありません」
  - 新規登録ページへのリンク
- [ ] `frontend/src/auth/RegisterPage.tsx` を作成する
  - メールアドレス＋パスワード入力フォーム
  - パスワード8文字以上バリデーション
  - 同一メールアドレス重複エラー表示
  - 利用規約・プライバシーポリシー同意チェックボックス
  - メール検証コード入力画面
- [ ] `frontend/src/hooks/useAuth.ts` を作成する

**完了条件：** 登録→メール検証→ログイン→ログアウトの一連フローが動作する

---

### TASK-18　API通信クライアント

**対応要件：** design.md §6-1
**対応ファイル：** `frontend/src/api/client.ts`

- [ ] `frontend/src/api/client.ts` を作成する
  - API Gateway URLを環境変数から取得
  - CognitoアクセストークンをAuthorizationヘッダーに付与
  - `get`、`post`、`put`、`delete` メソッド
  - エラーハンドリング（401時にログアウト遷移）
- [ ] 環境変数ファイル `.env.production` のテンプレートを作成する
  - `VITE_USER_POOL_ID`
  - `VITE_USER_POOL_CLIENT_ID`
  - `VITE_API_URL`
  - `VITE_DEMO_MODE`

**完了条件：** 認証付きAPIリクエストが送信できる

---

### TASK-19　共通型定義・デザイントークン（フロントエンド）

**対応要件：** design.md §4、§12
**対応ファイル：** `frontend/src/types/index.ts`、`frontend/src/index.css`

- [ ] `frontend/src/types/index.ts` を作成する
  - バックエンドと共通の型定義（UserProfile、UserAvatar、Post、PostTheme、ReactionType、EventRecord、EventClassification、EventCategory、AttributeTag 等）
  - フロントエンド固有の型: `Page`、`AppState`
- [ ] `frontend/src/index.css` のCSS変数を更新する
  - design.md §12のデザイントークンを反映
  - `--color-danger` を追加
  - `--font-size-xs` を追加
- [ ] `:focus-visible` スタイル、最大幅ラッパー、ベースリセットを確認する

**完了条件：** TypeScriptコンパイルエラーなし、CSS変数が設計書と一致

---

### TASK-20　App.tsx リファクタリング（認証ガード＋画面遷移）

**対応要件：** design.md §6-2、§6-3
**対応ファイル：** `frontend/src/App.tsx`

- [ ] AuthProviderで全体をラップする
- [ ] 認証状態に応じた画面振り分けを実装する
  - 未認証: LoginPage / RegisterPage
  - 認証済み・プロフィール未登録: ProfileSetup → AvatarSelect
  - 認証済み・登録済み: Plaza
- [ ] AppContextを作成する（`profile`、`avatar`、`currentPage`、`previousPage`、`selectedEventId`）
- [ ] `currentPage` に応じた条件レンダリングの骨格を作成する
- [ ] ログアウト後にブラウザの戻るボタンで認証済みページに戻れない制御を実装する

**完了条件：** 認証フローと画面遷移の基本動作が確認できる

---

## フェーズ 6　フロントエンド画面実装

### TASK-21　ProfileSetup コンポーネント

**対応要件：** FR-PROFILE-01
**対応ファイル：** `frontend/src/components/ProfileSetup/`

- [ ] ニックネーム入力フォーム（1〜20文字バリデーション、0文字/21文字以上は不可）
- [ ] 子どもの年齢区分選択（0〜1歳 / 2〜3歳 / 4歳〜小学校入学前）
- [ ] 未入力・未選択状態では「次へ」ボタンを `disabled` にする
- [ ] 注意書き:「本名・住所・園名などを書かないようにしてください」
- [ ] 送信時に `POST /users/profile` を呼び出す
- [ ] 成功後にアバター選択画面へ遷移する

**完了条件：** バリデーション動作、API保存、画面遷移が正しく動作する

---

### TASK-22　AvatarSelect コンポーネント（AWS対応）

**対応要件：** FR-AVATAR-01
**対応ファイル：** `frontend/src/components/AvatarSelect/`

- [ ] 6種類の基本アバターをグリッド表示する
- [ ] 選択状態を `aria-pressed` で表現する
- [ ] カスタマイズ項目を実装する
  - 髪型（最低3種類）
  - 髪色（最低3種類）
  - 服装（最低3種類）
  - 服の色（最低3種類）
  - 小物（最低3種類）
- [ ] 「おまかせ」ボタンで全項目ランダム組み合わせ
- [ ] 送信時に `POST /users/avatar` を呼び出す
- [ ] 成功後に広場へ遷移する

**完了条件：** アバター作成→AWS保存→広場遷移が完了する

---

### TASK-23　Plaza コンポーネント（AWS対応）

**対応要件：** FR-PLAZA-01、FR-PLAZA-02、FR-PROFILE-01
**対応ファイル：** `frontend/src/components/Plaza/`

- [ ] 広場入室時に `POST /plaza/visit` を呼び出す
- [ ] `GET /plaza/today-count` で今日の訪問者数を取得・表示する
- [ ] `GET /plaza/avatars` で他ユーザーのアバター＋ニックネームを取得する
- [ ] 自分を含む最大8体のアバターを広場内に配置する
- [ ] 各アバターの下にニックネームを表示する（12px、overflow省略記号）
- [ ] デモ用アバターで不足分を補完する（`isDemo` フラグで管理者が区別可能）
- [ ] 以下の導線を配置する
  - 投稿ボタン（常時視認可能な位置）
  - 「まちの掲示板」ボタン
  - 「AI案内所」ボタン
  - ログアウト操作
- [ ] デモモード時: ランダム訪問者数 + 「デモ表示」表記

**完了条件：** アバター＋ニックネーム表示、訪問者数表示、各導線が動作する

---

### TASK-24　PostArea コンポーネント（AWS対応）

**対応要件：** FR-POST-01、FR-POST-02、FR-REACTION-01
**対応ファイル：** `frontend/src/components/PostArea/`

- [ ] 投稿フォーム
  - テキストエリア（maxLength=60）
  - 文字カウンター「X/60」形式
  - テーマ選択（11種類、任意）
  - 注意書き:「本名・住所・園名などを書かないようにしてください」
  - 送信時に `POST /posts` を呼び出す
  - 拒否レスポンス時にエラーメッセージ表示
- [ ] 投稿一覧表示
  - `GET /posts` で24時間以内の投稿を取得
  - 各投稿にテーマ名を表示（設定されている場合）
  - 自分の投稿に削除ボタン表示（`DELETE /posts/{postId}`）
- [ ] リアクションUI
  - 8種類のリアクションボタン（絵文字＋文章セット表示）
  - 各ボタンに `aria-label="{label} リアクション {count}件"` を付与
  - 送信済みの種類はハイライト＋ `aria-pressed="true"`
  - 自分の投稿にはリアクションボタンを非活性にする
  - タップで送信/取消のトグル動作
  - 種類ごとの合計数を表示

**完了条件：**
- 投稿の作成・表示・削除が動作する
- リアクションの送信・取消・合計数表示が動作する
- aria-labelが正しく設定される

---

### TASK-25　BulletinBoard コンポーネント（AWS対応）

**対応要件：** FR-EVENT-01
**対応ファイル：** `frontend/src/components/BulletinBoard/`

- [ ] 分類タブ: 全て / イベント / 常設公共施設 / 公的支援
- [ ] 絞り込みパネル
  - 日付: 今日 / 明日 / 今週（イベント分類のみ有効）
  - 市区町村
  - 年齢区分（0〜1歳 / 2〜3歳 / 4歳〜就学前）
  - カテゴリ（7種類）
  - 料金（無料/有料）
  - 予約要否
  - 屋内/屋外
- [ ] `GET /events` にクエリパラメータを渡して結果を取得する
- [ ] イベントカード表示（名称、日時、地域、年齢、料金、属性タグ）
- [ ] 0件時: 「該当する情報がありません」メッセージ
- [ ] カードタップで EventDetail へ遷移
- [ ] 「AI検索」タブへの切り替え

**完了条件：** 3分類フィルタ＋複合条件絞り込みが動作する

---

### TASK-26　EventDetail コンポーネント（AWS対応）

**対応要件：** FR-EVENT-02、FR-EVENT-03
**対応ファイル：** `frontend/src/components/EventDetail/`

- [ ] `GET /events/{eventId}` でイベント詳細を取得する
- [ ] 以下の全項目を表示する
  - イベント名、概要、主催者、カテゴリ、属性タグ（11種類対応）
  - 市区町村、会場名、住所
  - 開始日時・終了日時、申込期限
  - 対象年齢、料金、予約要否
  - 公式URL、情報提供元、最終確認日時
  - 中止・延期・受付終了の状態
- [ ] 属性タグをバッジ表示する（「初参加歓迎」「途中入退室可能」含む）
- [ ] 公式URLタップで新しいタブで開く
- [ ] 「行ってみたい」ボタン
  - 未保存: `POST /saved-events/{eventId}`
  - 保存済み: `DELETE /saved-events/{eventId}`
  - 状態を視覚的に区別

**完了条件：** 全項目表示、属性タグ11種、保存トグルが動作する

---

### TASK-27　SavedEvents コンポーネント（AWS対応）

**対応要件：** FR-EVENT-03
**対応ファイル：** `frontend/src/components/SavedEvents/`

- [ ] `GET /saved-events` で保存済み一覧を取得する
- [ ] カード形式で表示する
- [ ] 0件時:「まだ保存したイベントはありません」メッセージ
- [ ] カードタップでEventDetailへ遷移する
- [ ] 保存取消操作を実装する

**完了条件：** 保存一覧の表示、再ログイン後もデータが保持される

---

### TASK-28　AiSearch コンポーネント（AWS対応）

**対応要件：** FR-AI-01、FR-AI-02
**対応ファイル：** `frontend/src/components/AiSearch/`

- [ ] 手動条件検索タブ
  - 条件選択UI（悩みカテゴリ、年齢区分、地域、日時、活動種類、屋内/屋外、料金、予約要否、施設カテゴリ）
  - `POST /ai-search/manual` を呼び出す
  - 結果表示（名称、対象年齢、地域、日時、料金、予約要否、公式URL、情報提供元、最終確認日時）
- [ ] AI自然文検索タブ（Should）
  - テキスト入力フォーム（maxLength=200、201文字以上入力不可）
  - 入力例6件をプレースホルダーまたはヒントとして表示
  - `POST /ai-search/natural` を呼び出す
  - 通常結果: 最大3件＋紹介理由
  - 深刻入力検出時: 相談窓口情報の優先表示
  - 0件時: 一般的育児情報表示 + 注記
  - 「条件に合う情報が見つかりませんでした」メッセージ

**完了条件：** 手動検索・AI検索の両方が動作する

---

### TASK-29　SupportInfo コンポーネント（AWS対応）

**対応要件：** NFR-SECURITY-04
**対応ファイル：** `frontend/src/components/SupportInfo/`

- [ ] 相談窓口データを表示する（名称、説明、電話番号、受付時間、URL）
- [ ] 「本サービスは緊急相談・医療相談・心理診断の代替ではありません」と記載する
- [ ] 外部リンクは `target="_blank" rel="noopener noreferrer"` で開く

**完了条件：** 窓口情報が表示され、注意書きが存在する

---

## フェーズ 7　管理者機能・デモデータ

### TASK-30　api-admin Lambda実装（Should）

**対応要件：** FR-ADMIN-01、FR-ADMIN-02、FR-ADMIN-03
**対応ファイル：** `backend/functions/api-admin/`

- [ ] `GET /admin/reports` — 通報一覧取得
- [ ] `POST /admin/posts/{postId}/hide` — 投稿の全利用者向け非表示
- [ ] `GET /admin/events/review` — review_required一覧取得
- [ ] `POST /admin/events/{eventId}/publish` — 公開に変更
- [ ] `POST /admin/events/{eventId}/hide` — 非公開に変更
- [ ] `GET /admin/collect-logs` — 収集ログ一覧
- [ ] Cognitoグループ `admin` のチェックを実装する

**完了条件：** adminグループのみ操作可能、状態変更が即時反映される

---

### TASK-31　通報・非表示機能（フロントエンド、Should）

**対応要件：** FR-ADMIN-01
**対応ファイル：** `frontend/src/components/PostArea/`

- [ ] 各投稿に通報ボタンを追加する
- [ ] 利用者が自分の画面で投稿を非表示にできる機能を追加する（他の利用者には影響しない）
- [ ] 通報成功時のフィードバック表示

**完了条件：** 通報操作と自画面非表示が動作する

---

### TASK-32　デモイベントデータの投入

**対応要件：** requirements.md §13 デモデータ要件
**対応ファイル：** `backend/scripts/seed-demo-data.ts`

- [ ] デモデータ投入スクリプトを作成する
- [ ] デモイベントデータ20件以上を生成する
  - 分類: event（イベント）、facility（常設公共施設）、support（公的支援）を含む
  - 今日開催3件以上、明日開催3件以上
  - 無料5件以上、屋内5件以上、予約不要5件以上
  - 各年齢区分に対応3件以上
  - 属性タグ11種類がいずれかのデータに含まれる
  - 「初参加歓迎」「途中入退室可能」を含むデータが各1件以上
- [ ] 日付はスクリプト実行日を基準とした相対日付で生成する
- [ ] DynamoDBへ一括書き込み（BatchWriteItem）
- [ ] デモ用アバターデータ7体を投入する

**完了条件：** スクリプト実行後、API経由で20件以上のデータが取得できる

---

## フェーズ 8　デプロイ・検証

### TASK-33　初回デプロイ

**対応要件：** FR-AUTH-03、NFR-AWS-01
**対応ファイル：** `infra/`、デプロイスクリプト

- [ ] `cdk deploy --all` でAWSリソースを作成する
- [ ] CDK出力からCognito ID、API URL、CloudFront URLを取得する
- [ ] `frontend/.env.production` に環境変数を設定する
- [ ] `npm run build` でフロントエンドをビルドする
- [ ] S3にビルド成果物をアップロードする
- [ ] CloudFrontキャッシュを無効化する
- [ ] デモデータ投入スクリプトを実行する

**完了条件：** CloudFront URLへHTTPSでアクセスし、ログイン画面が表示される

---

### TASK-34　Must成功条件の検証（22項目）

**対応要件：** requirements.md §16 Must成功条件

- [ ] 1. AWS上の公開URLへ実機スマートフォンからHTTPSでアクセスできる
- [ ] 2. メールアドレスとパスワードで新規登録・ログインできる
- [ ] 3. ニックネームと子どもの年齢区分を登録できる
- [ ] 4. ニックネームが広場内でアバターの近くに表示される
- [ ] 5. 6種類の基本アバターからアバターを作成できる
- [ ] 6. 登録開始から広場入室まで3分以内を目標に完了できる
- [ ] 7. 広場に自分を含む最大8体のアバターが表示される
- [ ] 8. 最大60文字の投稿を作成できる
- [ ] 9. 投稿がAWS上へ保存され、ページ更新後も表示される
- [ ] 10. 投稿が作成から24時間後に公開対象外となる
- [ ] 11. 8種類の定型リアクションを送信できる（絵文字＋文章セットで表示される）
- [ ] 12. 1投稿に複数種類のリアクションを送信でき、種類ごとの合計数が表示される
- [ ] 13. リアクションボタンにスクリーンリーダー対応のaria-labelが付与されている
- [ ] 14. コメント・個別チャット・DMへ進む操作が存在しない
- [ ] 15. 地域情報一覧を分類（イベント/常設公共施設/公的支援）・日付・地域・年齢・料金で絞り込める
- [ ] 16. イベント詳細に公式URLと最終確認日時が表示される
- [ ] 17. イベントを「行ってみたい」に保存できる（AWS保存・再ログイン後も保持）
- [ ] 18. 登録済みの3つの公式情報源に対して自動収集処理を実行できる
- [ ] 19. 少なくとも1件の新規イベントをイベントDBへ登録できる
- [ ] 20. 同じ収集処理を2回行っても同一イベントが重複登録されない
- [ ] 21. 元情報に変更がある場合、既存イベントを更新できる
- [ ] 22. 1つの情報源の取得に失敗しても他の情報源の処理が継続する

**完了条件：** 22項目すべてPass

---

### TASK-35　Should受け入れ条件の検証（8項目）

**対応要件：** requirements.md §16 Should受け入れ条件

- [ ] 1. AI案内所でテキスト入力から条件を抽出し、登録済みデータから最大3件を紹介できる
- [ ] 2. 紹介理由が登録済みデータの属性のみに基づき、推測表現を含まない
- [ ] 3. 深刻・緊急入力（6カテゴリ）を検出した場合に公的相談窓口が優先表示される
- [ ] 4. 登録済みデータの検索結果が0件の場合に一般的育児情報が最大2件表示される
- [ ] 5. 通報された投稿を管理者が全利用者向けに非表示にできる
- [ ] 6. `review_required` 状態のイベントを管理者が公開・棄却できる
- [ ] 7. 開催終了イベントが通常の利用者向け一覧に表示されない
- [ ] 8. 自動収集の成功・失敗・処理件数・実行日時を確認できる

**完了条件：** 8項目すべてPass（Must完了後に実施）

---

### TASK-36　スマートフォン表示・アクセシビリティ検証

**対応要件：** NFR-UI-01、design.md §13

- [ ] 画面幅375px〜428pxでレイアウト崩れがないことを確認する
- [ ] iOS Safari最新版で主要操作が完了できることを確認する
- [ ] Android Chrome最新版で主要操作が完了できることを確認する
- [ ] ボタンのタップ領域が44×44px以上であることを確認する
- [ ] リアクションボタンのaria-labelが正しく読み上げられることを確認する
- [ ] 色だけで状態を示している箇所がないことを確認する
- [ ] フォームの入力フィールドが16px以上であることを確認する（iOSズーム防止）

**完了条件：** iOS Safari + Android Chrome で全項目Pass

---

### TASK-37　セキュリティ・安全要件の最終確認

**対応要件：** NFR-SECURITY-02、NFR-SECURITY-03、NFR-SECURITY-04

- [ ] AWSアクセスキーがフロントエンドソースに含まれないことを確認する
- [ ] 認証なしのリクエストが保護APIエンドポイントへアクセスできないことを確認する
- [ ] 本名・顔写真・子どもの名前・正確な住所の入力フィールドが存在しないことを確認する
- [ ] GPS位置情報の取得許可を要求しないことを確認する
- [ ] URL・メールアドレス・電話番号・SNS IDを含む投稿が拒否されることを確認する
- [ ] DM・写真投稿・フォロー・決済UIが存在しないことを確認する
- [ ] 「本サービスは緊急相談・医療相談・心理診断の代替ではありません」が記載されていることを確認する
- [ ] ログアウト後にブラウザ戻るボタンで認証済みページに戻れないことを確認する

**完了条件：** 全項目Pass

---

## タスク一覧サマリ

| タスクID | 内容 | フェーズ | 対応要件 |
|---|---|---|---|
| TASK-01 | プロジェクト構成整備 | 1. AWS基盤 | design §2 |
| TASK-02 | CDK AuthStack (Cognito) | 1. AWS基盤 | FR-AUTH-01/02 |
| TASK-03 | CDK DataStack (DynamoDB) | 1. AWS基盤 | design §4 |
| TASK-04 | CDK ApiStack (API GW + Lambda) | 1. AWS基盤 | design §3/5 |
| TASK-05 | CDK FrontendStack (S3 + CF) | 1. AWS基盤 | FR-AUTH-03 |
| TASK-06 | CDK CollectorStack (EventBridge) | 1. AWS基盤 | FR-COLLECT-01 |
| TASK-07 | バックエンド共通型・ユーティリティ | 2. BE認証・ユーザー | design §4 |
| TASK-08 | api-user Lambda | 2. BE認証・ユーザー | FR-PROFILE-01, FR-AVATAR-01 |
| TASK-09 | api-plaza Lambda | 2. BE認証・ユーザー | FR-PLAZA-01 |
| TASK-10 | api-post Lambda | 2. BE認証・ユーザー | FR-POST-01/02 |
| TASK-11 | api-reaction Lambda | 3. BEリアクション・イベント | FR-REACTION-01 |
| TASK-12 | api-event Lambda | 3. BEリアクション・イベント | FR-EVENT-01/02 |
| TASK-13 | api-saved Lambda | 3. BEリアクション・イベント | FR-EVENT-03 |
| TASK-14 | api-ai-search (手動検索 Must) | 4. BE AI・収集 | FR-AI-01 |
| TASK-15 | api-ai-search (AI検索 Should) | 4. BE AI・収集 | FR-AI-02/03/04 |
| TASK-16 | collector Lambda (自動収集) | 4. BE AI・収集 | FR-COLLECT-01〜06 |
| TASK-17 | FE認証基盤 | 5. FE基盤 | FR-AUTH-01/02 |
| TASK-18 | API通信クライアント | 5. FE基盤 | design §6 |
| TASK-19 | FE共通型・デザイントークン | 5. FE基盤 | design §4/12 |
| TASK-20 | App.tsx リファクタリング | 5. FE基盤 | design §6 |
| TASK-21 | ProfileSetup | 6. FE画面 | FR-PROFILE-01 |
| TASK-22 | AvatarSelect (AWS) | 6. FE画面 | FR-AVATAR-01 |
| TASK-23 | Plaza (AWS) | 6. FE画面 | FR-PLAZA-01/02 |
| TASK-24 | PostArea (AWS) | 6. FE画面 | FR-POST-01/02, FR-REACTION-01 |
| TASK-25 | BulletinBoard (AWS) | 6. FE画面 | FR-EVENT-01 |
| TASK-26 | EventDetail (AWS) | 6. FE画面 | FR-EVENT-02/03 |
| TASK-27 | SavedEvents (AWS) | 6. FE画面 | FR-EVENT-03 |
| TASK-28 | AiSearch (AWS) | 6. FE画面 | FR-AI-01/02 |
| TASK-29 | SupportInfo (AWS) | 6. FE画面 | NFR-SECURITY-04 |
| TASK-30 | api-admin Lambda (Should) | 7. 管理者・デモ | FR-ADMIN-01/02/03 |
| TASK-31 | 通報・非表示 FE (Should) | 7. 管理者・デモ | FR-ADMIN-01 |
| TASK-32 | デモイベントデータ投入 | 7. 管理者・デモ | §13 デモデータ |
| TASK-33 | 初回デプロイ | 8. デプロイ・検証 | FR-AUTH-03 |
| TASK-34 | Must成功条件検証 (22項目) | 8. デプロイ・検証 | §16 Must |
| TASK-35 | Should受け入れ条件検証 (8項目) | 8. デプロイ・検証 | §16 Should |
| TASK-36 | スマホ・アクセシビリティ検証 | 8. デプロイ・検証 | NFR-UI-01 |
| TASK-37 | セキュリティ・安全要件検証 | 8. デプロイ・検証 | NFR-SECURITY-02/03/04 |
