# アルパカのあくび — Landing Page

宮崎県の子育て中の学生・保護者に向けた、オンライン子育て広場の紹介サイト。

- 配信: Sites
- 公開URL: https://alpaca-no-akubi.openvenus130.chatgpt.site/
- 構成: ビルド不要のHTML / CSS / JavaScript
- 公開ファイル: dist/
- アプリ: https://sanji-no-hiroba.vercel.app/
- ローカル確認: python3 -m http.server 4381 --directory dist --bind 127.0.0.1
- ホスティング設定: .openai/hosting.json

## 編集するファイル

- `dist/index.html`: ページ構成と文章
- `dist/styles.css`: デザインとスマホ対応
- `dist/script.js`: 紹介動画と案内ダイアログの操作
- `dist/assets/`: 画像と紹介動画

このフォルダーに移動してローカル確認コマンドを実行すると、`http://127.0.0.1:4381/` で確認できます。ビルドやnpmパッケージのインストールは不要です。

Sitesで公開内容を更新するときは、`.openai/hosting.json` に記録した既存サイトを使います。GitHubへの保存とSitesでの公開更新は、それぞれ行います。

既存アプリの素材と開発版の紹介映像を使用。掲示板の例はサンプルであることを明示。
個人情報の入力フォーム・独自アクセス解析はありません。
