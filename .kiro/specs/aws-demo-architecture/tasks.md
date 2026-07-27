# Implementation Plan: AWS Demo Architecture（さんじのひろば）

## Overview

「さんじのひろば」のAWSデモ構成を実装するためのタスクリスト。フロントエンドの不要機能削除→バックエンドLambda実装→API接続→デプロイ設定の順で進める。

## Tasks

- [x] 1. フロントエンド整理（不要機能の削除）
  - [x] 1.1 不要コンポーネントフォルダの削除
    - `frontend/src/components/MoodSelect/` フォルダを削除
    - `frontend/src/components/AiSearch/` フォルダを削除
    - `frontend/src/components/SupportInfo/` フォルダを削除
    - `frontend/src/components/ExitResult/` フォルダを削除
    - `frontend/src/data/supportLinks.ts` を削除
    - _Requirements: 1（推奨構成に含まれない画面の除去）_

  - [x] 1.2 型定義の整理（types/index.ts）
    - `Page` 型から `'moodSelect' | 'aiSearch' | 'supportInfo' | 'exitResult'` を削除
    - `Mood` 型を削除
    - `MoodOption` インターフェースを削除
    - `SupportLink` インターフェースを削除
    - _Requirements: 1（不要な型定義の除去）_

  - [x] 1.3 App.tsx の画面遷移整理
    - `MoodSelect` / `SupportInfo` / `ExitResult` の import を削除
    - `selectedMood` state を削除
    - アバター選択後は直接 `plaza` に遷移するよう変更（`moodSelect` をスキップ）
    - `supportInfo` / `exitResult` の画面分岐を削除
    - `Plaza` コンポーネントに渡す `mood` prop を削除
    - _Requirements: 4（トップ→アバター選択→広場の画面フロー）_

  - [x] 1.4 Plaza.tsx の修正
    - `Mood` 型の import と `mood` prop を削除
    - `MOOD_BUBBLE` 定数を削除（吹き出しテキストは固定文字列に変更、例: "こんにちは"）
    - ナビゲーションの「案内所」ボタン（`supportInfo`）を削除
    - 施設カードの「案内所」ボタンを削除
    - 退出ボタンの動作を `onExit` → トップページ遷移に変更（`exitResult` 画面なし）
    - _Requirements: 4（広場画面の簡素化）_

  - [x] 1.5 BulletinBoard.tsx の修正
    - `AiSearch` コンポーネントの import を削除
    - タブ切り替え UI（`list` / `ai` タブ）を削除
    - `tab` state を削除し、常にイベント一覧のみ表示
    - _Requirements: 5（掲示板はイベント一覧のみ）_

  - [x] 1.6 プロフィール入力画面の追加
    - 新規コンポーネント `frontend/src/components/ProfileSetup/ProfileSetup.tsx` を作成
    - 新規CSS `frontend/src/components/ProfileSetup/ProfileSetup.module.css` を作成
    - 入力項目:
      - ニックネーム（1〜20文字、テキスト入力）
      - 子どもの年齢区分（セレクト: 0〜1歳 / 2〜3歳 / 4歳〜就学前）
    - 入力値をLocalStorageに保存する（キー: `sanji-profile`）
    - バリデーション: ニックネーム未入力・年齢区分未選択では次に進めない
    - 画面フロー: トップ → プロフィール入力 → アバター選択 → 広場
    - `App.tsx` に `profileSetup` 画面の遷移を追加
    - `types/index.ts` の `Page` 型に `'profileSetup'` を追加
    - LocalStorageに既にプロフィールが保存済みの場合は、プロフィール入力をスキップしてアバター選択に遷移する
    - 既存のCSS Modulesパターン・btn-primary/btn-secondaryクラスを踏襲
    - _Requirements: 10（プロフィール情報をLocalStorageに保存）_

- [x] 2. チェックポイント - フロントエンド整理の確認
  - `npm run build`（frontend）が成功することを確認
  - 削除対象のコンポーネントへの参照が残っていないことを確認
  - 画面遷移: トップ→アバター選択→広場→各機能が動作すること
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. バックエンド共通モジュールの実装
  - [x] 3.1 backend/package.json の更新とテストフレームワーク追加
    - `@aws-sdk/s3-request-presigner` と `@aws-sdk/client-s3` を dependencies に追加
    - `vitest` を devDependencies に追加
    - `scripts` に `"test": "vitest --run"` を追加
    - esbuild のビルドスクリプトを追加
    - _Requirements: 3（Lambda関数のランタイム環境）_

  - [x] 3.2 backend/shared/dynamodb.ts の実装
    - DynamoDBDocumentClient の初期化コード
    - テーブル名の環境変数参照（`TABLE_POSTS`, `TABLE_REACTIONS`, `TABLE_EVENTS`）
    - _Requirements: 5, 6, 8（DynamoDB操作の共通基盤）_

  - [x] 3.3 backend/shared/response.ts の実装
    - `success(body, statusCode)` ヘルパー関数
    - `error(statusCode, error, message)` ヘルパー関数
    - CORSヘッダーの付与（`Content-Type`, `Access-Control-Allow-Origin` 等）
    - _Requirements: 17（エラーハンドリング方針）_

  - [x] 3.4 backend/shared/validation.ts の実装
    - `validatePost(body)`: text 1〜60文字、空白のみ不可、nickname・avatarId・userId必須
    - `validateReaction(body)`: postId・emoji（8種のいずれか: wakaru, otsukare, kokoniiruyo, watashimo, ouen, kyoumo, yokattane, hitoiki）・userId必須
    - `validateEvent(body)`: eventName 1〜100文字、eventDate YYYY-MM-DD形式、必須フィールド確認
    - `validateUpload(body)`: contentType（image/jpeg or image/png）、fileSize（1〜5,242,880）
    - `validateApiKey(event)`: x-api-key ヘッダーと環境変数 ADMIN_API_KEY の一致確認
    - _Requirements: 8, 9, 17（入力バリデーション）_

  - [x]* 3.5 backend/__tests__/validation.test.ts の実装
    - validatePost: 空文字拒否、空白のみ拒否、60文字超拒否、正常値許可
    - validateReaction: 無効emoji拒否、正常値許可
    - validateEvent: eventName空拒否、eventDate不正形式拒否、正常値許可
    - validateUpload: 不正contentType拒否、サイズ超過拒否、正常値許可
    - _Requirements: 17（バリデーションの単体テスト）_

- [x] 4. Lambda関数の実装（posts-handler）
  - [x] 4.1 backend/functions/posts-handler/index.ts の実装
    - `GET /posts`: DynamoDB Query（PK="POSTS", SK降順）、limit/cursor対応のページネーション
    - `POST /posts`: ULID生成、バリデーション、DynamoDB PutItem
    - レスポンスの `reactions` フィールド: リアクションテーブルからの集計（Query + 集計ロジック）
    - routeKey ベースのルーティング
    - _Requirements: 5（投稿の登録・取得）_

- [x] 5. Lambda関数の実装（reactions-handler）
  - [x] 5.1 backend/functions/reactions-handler/index.ts の実装
    - `POST /reactions`: ULID生成、バリデーション、DynamoDB PutItem（PK="POST#{postId}", SK="REACTION#{userId}"）
    - `PUT /reactions/{id}`: emoji フィールドの更新
    - `DELETE /reactions/{id}`: DynamoDB DeleteItem
    - `GET /reactions`: クエリパラメータ（postId, emoji）でフィルタ、ユーザー情報込みで返却
    - _Requirements: 6, 7（リアクションの登録・変更・取消・グループ表示）_

- [x] 6. Lambda関数の実装（events-handler）
  - [x] 6.1 backend/functions/events-handler/index.ts の実装
    - `GET /events`: GSI gsi-date で日付順取得。クエリパラメータ `ids` 指定時は BatchGetItem
    - `GET /events/{id}`: GetItem で単一イベント取得、imageUrl がある場合は署名付き取得URLを生成
    - `POST /admin/events`: APIキー検証 → バリデーション → ULID生成 → PutItem（status="開催予定"）
    - `PATCH /admin/events/{id}/status`: APIキー検証 → status更新 → UpdateItem
    - _Requirements: 8, 9, 10（イベントの登録・取得・状態変更・行ってみたい一覧）_

- [x] 7. Lambda関数の実装（upload-url-handler）
  - [x] 7.1 backend/functions/upload-url-handler/index.ts の実装
    - `POST /admin/events/upload-url`: APIキー検証 → contentType・fileSize検証 → S3 PutObject署名付きURL生成
    - S3キーの命名規則: `events/{ulid}/image.{ext}`
    - 有効期限 300秒
    - _Requirements: 8（画像アップロード用署名付きURL生成）_

- [x] 8. チェックポイント - バックエンド実装の確認
  - `cd backend && npx vitest --run` でバリデーションテストが通ること
  - 各 Lambda 関数のコードが TypeScript として型エラーなくコンパイルできること
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. フロントエンド API接続
  - [x] 9.1 frontend/src/api/client.ts の実装
    - `API_BASE` を `import.meta.env.VITE_API_BASE_URL` から取得
    - `VITE_API_BASE_URL` が未設定の場合はダミーデータにフォールバックするフラグを export
    - `apiGet<T>(path)`, `apiPost<T>(path, body, options?)`, `apiPut<T>(path, body)`, `apiPatch<T>(path, body, options?)`, `apiDelete(path)` 関数
    - APIキー付きリクエスト: `x-api-key` ヘッダー付与
    - エラーハンドリング: ApiError クラス定義
    - _Requirements: 4, 5, 6, 8（APIクライアントの共通基盤）_

  - [x] 9.2 frontend/src/api/posts.ts の実装
    - `fetchPosts(cursor?)`: GET /posts → ダミーデータフォールバック対応
    - `createPost(body)`: POST /posts → ダミーデータフォールバック対応
    - _Requirements: 5（投稿のAPI呼び出し）_

  - [x] 9.3 frontend/src/api/reactions.ts の実装
    - `fetchReactions(postId, emoji?)`: GET /reactions
    - `createReaction(body)`: POST /reactions
    - `updateReaction(id, body)`: PUT /reactions/{id}
    - `deleteReaction(id)`: DELETE /reactions/{id}
    - ダミーデータフォールバック対応
    - _Requirements: 6, 7（リアクションのAPI呼び出し）_

  - [x] 9.4 frontend/src/api/events.ts の実装
    - `fetchEvents(ids?)`: GET /events（ids指定時はクエリパラメータ付き）
    - `fetchEvent(id)`: GET /events/{id}
    - `createEvent(body, apiKey)`: POST /admin/events
    - `updateEventStatus(id, status, apiKey)`: PATCH /admin/events/{id}/status
    - `getUploadUrl(contentType, fileSize, apiKey)`: POST /admin/events/upload-url
    - ダミーデータフォールバック対応
    - _Requirements: 8, 9, 10（イベントのAPI呼び出し）_

  - [x] 9.5 各コンポーネントのAPI呼び出し対応
    - `PostArea.tsx`: `createPost` API呼び出しに変更（ダミー追加→API POST）
    - `BulletinBoard.tsx`: `fetchEvents` でイベント一覧取得（ダミーデータ→API GET、フォールバック対応）
    - `EventDetail.tsx`: `fetchEvent` で個別取得 + リアクション操作API呼び出し
    - `SavedEvents.tsx`: `fetchEvents(savedIds)` で保存イベントの最新情報取得
    - `AdminEventForm.tsx`: `createEvent` / `getUploadUrl` + S3直接アップロード
    - _Requirements: 5, 6, 8, 10（画面とAPIの結合）_

- [x] 10. チェックポイント - API接続の確認
  - `npm run build`（frontend）が成功すること
  - `VITE_API_BASE_URL` 未設定時にダミーデータで画面が表示されること
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. デプロイ設定ファイルの作成
  - [x] 11.1 amplify.yml の作成（プロジェクトルート）
    - preBuild: `cd frontend && npm ci`
    - build: `npm run build`
    - artifacts: `frontend/dist/**/*`
    - cache: `frontend/node_modules/**/*`
    - _Requirements: 4（Amplify Hostingビルド設定）_

  - [x] 11.2 .env.example の作成（プロジェクトルート）
    - `VITE_API_BASE_URL=https://{api-id}.execute-api.ap-northeast-1.amazonaws.com`
    - `VITE_ADMIN_API_KEY=your-admin-api-key`
    - コメントで各変数の説明を記載
    - _Requirements: 4（環境変数テンプレート）_

  - [x] 11.3 backend/build.mjs の作成（esbuildビルドスクリプト）
    - 各Lambda関数を個別にバンドル（`functions/*/index.ts` → `dist/*/index.mjs`）
    - `platform: 'node'`, `target: 'node20'`, `format: 'esm'`
    - `external: ['@aws-sdk/*']`（Lambda環境に含まれるためバンドル不要）
    - _Requirements: 3（Lambda関数のバンドル設定）_

  - [x] 11.4 backend/tsconfig.json の作成
    - `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`
    - `strict: true`, `outDir: "./dist"`
    - `include: ["shared/**/*", "functions/**/*"]`
    - _Requirements: 3（TypeScript設定）_

- [x] 12. 最終チェックポイント
  - frontend: `npm run build` が成功すること
  - backend: `npx vitest --run` が成功すること
  - backend: `node build.mjs` でバンドルが生成されること
  - `.env.example` と `amplify.yml` が正しい内容であること
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- タスクはフェーズ1（フロントエンド整理）→フェーズ2（バックエンド実装）→フェーズ3（API接続）→フェーズ4（デプロイ設定）の順で実施
- フェーズ1完了後すぐにブラウザで動作確認可能（ダミーデータのまま画面遷移が正常に動く）
- `VITE_API_BASE_URL` 未設定時はダミーデータにフォールバックする設計のため、AWS環境なしでもフロントエンド開発・確認が可能
- タスク `*` マーク付きはオプション（テスト関連）で、スキップしてもMVPとして動作する
- バックエンドのAWSリソース作成（DynamoDB テーブル、S3 バケット、API Gateway、IAMロール等）はAWSコンソールで手動実施する前提（コード対象外）
- 各Lambda関数のデプロイも手動（AWSコンソール or AWS CLI でzipアップロード）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "4.1", "5.1", "7.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 8, "tasks": ["9.5"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3", "11.4"] }
  ]
}
```
