/**
 * rollback.ts
 *
 * 新API(V2)に問題が発生した場合に、フロントエンドを旧APIへ戻すための
 * ロールバック手順を案内し、必要に応じて自動実行する。
 *
 * 重要: このスクリプトは既存データを一切削除しない。
 *       旧API・旧テーブルはデプロイ後も残っているため、
 *       フロントの接続先を戻すだけで旧版に復帰できる。
 *
 * 使い方:
 *   npm run rollback --workspace=backend            (状態確認のみ)
 *   npm run rollback --workspace=backend -- --apply (V2スタックを無効化)
 */
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const apply = process.argv.includes('--apply');
const REGION = process.env.AWS_REGION ?? 'ap-northeast-1';

// ─── ユーティリティ ───────────────────────────────────────
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function run(cmd: string): string {
  return execSync(cmd, { stdio: 'pipe', env: { ...process.env } }).toString().trim();
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ─── メイン ──────────────────────────────────────────────
console.log(bold('\n🔄 さんじのひろば ロールバック手順\n'));

// 1. 現在のスタック状態を確認
console.log(bold('── 現在のスタック状態 ──'));

let apiStackExists = false;
let dataStackExists = false;
let apiUrl = '';

try {
  const status = run(
    `aws cloudformation describe-stacks --stack-name SanjiHiroba-ApiV2 --region ${REGION} --query "Stacks[0].StackStatus" --output text`
  );
  apiStackExists = true;
  console.log(green(`  SanjiHiroba-ApiV2: ${status}`));

  try {
    apiUrl = run(
      `aws cloudformation describe-stacks --stack-name SanjiHiroba-ApiV2 --region ${REGION} --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text`
    );
    console.log(`  API URL: ${cyan(apiUrl)}`);
  } catch { /* best effort */ }
} catch {
  console.log('  SanjiHiroba-ApiV2: 未デプロイ');
}

try {
  const status = run(
    `aws cloudformation describe-stacks --stack-name SanjiHiroba-DataV2 --region ${REGION} --query "Stacks[0].StackStatus" --output text`
  );
  dataStackExists = true;
  console.log(green(`  SanjiHiroba-DataV2: ${status}`));
} catch {
  console.log('  SanjiHiroba-DataV2: 未デプロイ');
}

// 2. 復旧手順の表示
console.log(bold('\n── ロールバック手順 ──'));
console.log(`
  ${bold('方法A: フロントのみ切り戻し (推奨・即時復旧)')}
  ─────────────────────────────────────────────
  1. Amplifyコンソールで環境変数 VITE_API_BASE_URL を旧APIのURLに変更
     (または変数自体を削除してモック動作に戻す)
  2. Amplifyで再デプロイ（ビルド実行）
  
  これだけでユーザーは旧APIを使用します。
  新APIのリソースは残りますが課金は最小限(オンデマンド)です。

  ${bold('方法B: 新APIスタックを削除 (完全クリーンアップ)')}
  ─────────────────────────────────────────────
  1. 方法Aを先に実行してユーザー影響を止める
  2. このスクリプトを --apply で実行
  
  削除されるもの:
    - API Gateway (sanji-no-hiroba-api-v2)
    - Lambda関数 (sanji-v2-*)
    - IAMロール
  
  ${red('削除されないもの (RETAIN設定):')}
    - sanji-demo-users テーブル
    - sanji-demo-saved-events テーブル
    - 既存の3テーブル (posts, reactions, events)
    - S3バケット (sanji-demo-images)
`);

// 3. バックアップ一覧
console.log(bold('── 利用可能なバックアップ ──'));
try {
  const backups = run(
    `aws dynamodb list-backups --region ${REGION} --query "BackupSummaries[?contains(BackupName, 'before-v2')].{Name:BackupName, Status:BackupStatus, Created:BackupCreationDateTime}" --output table`
  );
  if (backups && !backups.includes('None')) {
    console.log(backups);
  } else {
    console.log('  バックアップが見つかりません。');
  }
} catch {
  console.log('  バックアップ一覧を取得できませんでした。');
}

// 4. --apply 実行
if (!apply) {
  console.log(bold('\n── 次のアクション ──'));
  console.log('  方法Aのみ: Amplifyコンソールで手動変更してください。');
  console.log('  方法B実行: npm run rollback --workspace=backend -- --apply');
  console.log('');
  process.exit(0);
}

// apply モード: 新スタック削除
console.log(bold('\n── スタック削除モード ──'));

if (!apiStackExists && !dataStackExists) {
  console.log('  V2スタックは存在しません。ロールバック不要です。');
  process.exit(0);
}

console.log(red('  ⚠️  以下のCloudFormationスタックを削除します:'));
if (apiStackExists) console.log(red('    - SanjiHiroba-ApiV2 (API Gateway + Lambda)'));
if (dataStackExists) console.log(red('    - SanjiHiroba-DataV2 (テーブル定義のみ、RETAIN設定のためデータは残る)'));
console.log('');
console.log('  データは削除されません:');
console.log('    - usersテーブル、saved-eventsテーブルはRETAINで残ります');
console.log('    - 既存3テーブルは参照しているだけなので影響なし');
console.log('');

if (!await confirm('本当にV2スタックを削除しますか？')) {
  console.log('  中断しました。');
  process.exit(0);
}

// APIスタック削除 (依存関係上、先に削除)
if (apiStackExists) {
  console.log('\n  SanjiHiroba-ApiV2 を削除中...');
  try {
    execSync(
      `aws cloudformation delete-stack --stack-name SanjiHiroba-ApiV2 --region ${REGION}`,
      { stdio: 'inherit' },
    );
    console.log('  削除リクエスト送信。完了を待機中...');
    execSync(
      `aws cloudformation wait stack-delete-complete --stack-name SanjiHiroba-ApiV2 --region ${REGION}`,
      { stdio: 'inherit' },
    );
    console.log(green('  ✓ SanjiHiroba-ApiV2 削除完了'));
  } catch {
    console.log(red('  ✗ APIスタック削除に失敗。AWSコンソールで確認してください。'));
  }
}

// Dataスタック削除
if (dataStackExists) {
  console.log('\n  SanjiHiroba-DataV2 を削除中...');
  console.log('  (テーブルはRETAIN設定のため実データは残ります)');
  try {
    execSync(
      `aws cloudformation delete-stack --stack-name SanjiHiroba-DataV2 --region ${REGION}`,
      { stdio: 'inherit' },
    );
    console.log('  削除リクエスト送信。完了を待機中...');
    execSync(
      `aws cloudformation wait stack-delete-complete --stack-name SanjiHiroba-DataV2 --region ${REGION}`,
      { stdio: 'inherit' },
    );
    console.log(green('  ✓ SanjiHiroba-DataV2 削除完了'));
  } catch {
    console.log(red('  ✗ Dataスタック削除に失敗。AWSコンソールで確認してください。'));
  }
}

console.log(bold('\n── ロールバック完了 ──'));
console.log('  新APIは削除されました。');
console.log('  Amplifyの接続先が旧APIに戻っていることを確認してください。');
console.log('  テーブルデータはすべて残っています。');
console.log('  再デプロイする場合: npm run deploy:safe --workspace=backend\n');
