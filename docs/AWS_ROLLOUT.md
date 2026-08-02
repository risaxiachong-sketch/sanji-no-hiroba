# AWS連動版の実行手順

この切り替えは既存データを削除せず、追加方式で行います。既存の投稿、リアクション、イベント、画像バケット、旧APIは残すため、問題が発生した場合はフロントの接続先を旧APIへ戻せます。

## 対象リソース

既存リソースはCDKで新規作成せず、名前を指定して参照します。

- sanji-demo-posts
- sanji-demo-reactions
- sanji-demo-events
- sanji-demo-images

今回、新しく作成するテーブルは次の2つだけです。

- sanji-demo-users
- sanji-demo-saved-events

実際のAWSで名前が異なる場合は、CDKのコンテキスト指定で変更できます。必ずデプロイ前に実際のテーブル名とバケット名を確認してください。

## 1. AWSへログインする

PowerShellで次を実行します。

    aws login

ログイン後、接続先のAWSアカウントを確認します。

    aws sts get-caller-identity

表示されたAccountが、このアプリを動かしているAWSアカウントであることを確認してください。

リージョンを東京に設定します。

    $env:AWS_REGION = 'ap-northeast-1'
    $env:CDK_DEFAULT_REGION = 'ap-northeast-1'

## 2. 実際のリソース名を確認する

DynamoDBテーブルを確認します。

    aws dynamodb list-tables --region ap-northeast-1

S3バケットを確認します。

    aws s3api list-buckets

次の名前が存在するか確認してください。

- sanji-demo-posts
- sanji-demo-reactions
- sanji-demo-events
- sanji-demo-images

名前が異なる場合は、その時点でデプロイを止めてCDK設定を実環境に合わせます。

## 3. 既存テーブルをバックアップする

最初にドライランを実行します。この段階ではAWSを変更しません。

    npm run backup:tables --workspace=backend

対象テーブル名に問題がなければ、実際にバックアップを作成します。

    npm run backup:tables --workspace=backend -- --apply

AWSコンソールのDynamoDBにある「バックアップ」で、3つのバックアップが作成されたことを確認してください。

## 4. ローカルでビルドとCDK確認を行う

Lambdaをビルドします。

    npm run build:backend

CDKテンプレートを生成します。

    npm run synth

エラーが出ず、SanjiHiroba-DataV2とSanjiHiroba-ApiV2が表示されれば準備完了です。

## 5. 施設コードを用意する

施設担当者画面で使用する16文字以上のコードを決めます。このコードはGitへ保存しないでください。

例として次のような形式を使用します。

    alpaca-facility-2026-demo

本番では、推測されにくい十分に長い文字列を使用してください。

## 6. AWSへデプロイする

REPLACE_WITH_SECRETを、手順5で決めた施設コードへ置き換えて実行します。

    npm run deploy -- --parameters SanjiHiroba-ApiV2:AdminApiKey=REPLACE_WITH_SECRET

このデプロイで行われることは次のとおりです。

- ユーザーテーブルの作成
- 保存イベントテーブルの作成
- 実処理が入ったLambdaの作成
- 新しいAPI Gatewayの作成
- 既存の投稿、リアクション、イベントテーブルへの権限設定

既存の3テーブルと旧APIは削除しません。

## 7. S3のCORS設定を確認する

施設担当者画面から画像を直接アップロードするため、sanji-demo-imagesバケットにAmplifyドメインからのPUTを許可するCORS設定が必要です。

許可する内容は次のとおりです。

- メソッド: PUT、GET
- ヘッダー: Content-Type
- オリジン: 利用中のAmplifyドメイン

ローカルでも画像登録を試す場合は、http://127.0.0.1:5173も一時的に許可します。

## 8. 旧リアクションを移行する

最初にドライランを実行します。

    npm run migrate:reactions --workspace=backend

バックアップが作成済みであることを確認してから、実際に移行します。

    npm run migrate:reactions --workspace=backend -- --apply

旧データは削除せず、新しい複数リアクション形式へコピーします。同じ処理を再実行しても重複しない設計です。

## 9. 掲示板用イベントを登録する

最初にドライランを実行します。

    npm run seed:events --workspace=backend

問題がなければ登録します。

    npm run seed:events --workspace=backend -- --apply

安定したイベントIDを使用し、すでに存在するイベントは上書きしません。

## 10. Amplifyの接続先を変更する

CDKデプロイ結果に表示されたSanjiHiroba-ApiV2のApiUrlを確認します。

Amplifyの環境変数へ次を設定します。

    VITE_API_BASE_URL=<CDKで表示されたApiUrl>

AmplifyではVITE_USE_MOCKを設定しないでください。これはローカル開発専用です。

環境変数を設定後、Amplifyで再デプロイします。

## 11. 動作を確認する

通常ブラウザとシークレットブラウザなど、保存領域が別の2つのブラウザで確認します。

1. 同じニックネームで登録しても別のユーザーになる
2. 設定変更が再読み込み後も残る
3. 一方のブラウザで投稿すると、もう一方にも表示される
4. 同じ投稿へ複数のリアクションを付けられる
5. リアクションを種類ごとに解除できる
6. 保存イベントが別ユーザーと混ざらない
7. 過去7日以内に投稿した利用者が広場へ表示される
8. 施設担当者画面で登録したイベントが掲示板へ表示される
9. イベント詳細と保存一覧でも同じイベントが表示される
10. API障害時に入力内容が消えず、エラーと再試行が表示される

## 問題が発生した場合

AmplifyのVITE_API_BASE_URLを以前のAPI URLへ戻し、フロントだけ再デプロイします。

新API、旧API、既存データは削除していないため、データを消さずに旧版へ戻せます。