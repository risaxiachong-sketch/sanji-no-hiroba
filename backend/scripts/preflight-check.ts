/**
 * preflight-check.ts
 *
 * デプロイ前の安全確認スクリプト。
 * AWS認証状態、リージョン、既存リソースの存在、ローカルビルドの成功をすべて検証し、
 * 1つでも失敗した場合はデプロイを止める。
 *
 * 使い方:
 *   npm run preflight --workspace=backend
 */
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';

const REGION = process.env.AWS_REGION ?? 'ap-northeast-1';

// ─── 設定 ───────────────────────────────────────────────
const EXPECTED_TABLES = [
  process.env.TABLE_POSTS ?? 'sanji-demo-posts',
  process.env.TABLE_REACTIONS ?? 'sanji-demo-reactions',
  process.env.TABLE_EVENTS ?? 'sanji-demo-events',
];

const NEW_TABLES = [
  process.env.TABLE_USERS ?? 'sanji-demo-users',
  process.env.TABLE_SAVED_EVENTS ?? 'sanji-demo-saved-events',
];

const EXPECTED_BUCKET = process.env.S3_BUCKET ?? 'sanji-demo-images-797664194911';

// ─── ユーティリティ ───────────────────────────────────────
const green = (s: string) => `\x1b[32m✓\x1b[0m ${s}`;
const red = (s: string) => `\x1b[31m✗\x1b[0m ${s}`;
const yellow = (s: string) => `\x1b[33m⚠\x1b[0m ${s}`;
const header = (s: string) => `\n\x1b[1m── ${s} ──\x1b[0m`;

let errors = 0;
let warnings = 0;

function pass(msg: string) { console.log(green(msg)); }
function fail(msg: string) { console.log(red(msg)); errors += 1; }
function warn(msg: string) { console.log(yellow(msg)); warnings += 1; }

// ─── 1. AWS認証チェック ──────────────────────────────────
console.log(header('1. AWS認証'));

const sts = new STSClient({ region: REGION });
let accountId: string;
try {
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  accountId = identity.Account ?? 'unknown';
  pass(`認証済み: Account=${accountId}, Arn=${identity.Arn}`);
} catch {
  fail('AWS認証に失敗しました。aws sso login を実行してください。');
  console.log('\n結果: 認証エラーのため中断します。');
  process.exit(1);
}

// ─── 2. リージョン確認 ───────────────────────────────────
console.log(header('2. リージョン'));

if (REGION === 'ap-northeast-1') {
  pass(`リージョン: ${REGION} (東京)`);
} else {
  fail(`リージョンが ap-northeast-1 ではありません (現在: ${REGION})`);
  console.log('  → $env:AWS_REGION = "ap-northeast-1" を設定してください。');
}

// ─── 3. 既存DynamoDBテーブル確認 ─────────────────────────
console.log(header('3. 既存DynamoDBテーブル'));

const ddb = new DynamoDBClient({ region: REGION });

for (const tableName of EXPECTED_TABLES) {
  try {
    const desc = await ddb.send(new DescribeTableCommand({ TableName: tableName }));
    const status = desc.Table?.TableStatus;
    if (status === 'ACTIVE') {
      pass(`${tableName} (ACTIVE, ${desc.Table?.ItemCount ?? '?'} items)`);
    } else {
      fail(`${tableName} が存在しますがステータスが ${status} です`);
    }
  } catch (e: unknown) {
    if ((e as { name?: string }).name === 'ResourceNotFoundException') {
      fail(`${tableName} が見つかりません。テーブル名を確認してください。`);
    } else {
      fail(`${tableName} の確認中にエラー: ${(e as Error).message}`);
    }
  }
}

// ─── 4. 新規テーブルの衝突チェック ───────────────────────
console.log(header('4. 新規テーブル(衝突チェック)'));

for (const tableName of NEW_TABLES) {
  try {
    await ddb.send(new DescribeTableCommand({ TableName: tableName }));
    warn(`${tableName} は既に存在します。CDKデプロイで衝突する可能性があります。`);
    console.log('  → 初回デプロイではない場合は問題ありません。');
  } catch (e: unknown) {
    if ((e as { name?: string }).name === 'ResourceNotFoundException') {
      pass(`${tableName} は未作成(CDKが作成します)`);
    } else {
      fail(`${tableName} の確認中にエラー: ${(e as Error).message}`);
    }
  }
}

// ─── 5. S3バケット確認 ───────────────────────────────────
console.log(header('5. S3バケット'));

const s3 = new S3Client({ region: REGION });
try {
  await s3.send(new HeadBucketCommand({ Bucket: EXPECTED_BUCKET }));
  pass(`${EXPECTED_BUCKET} (アクセス可)`);
} catch (e: unknown) {
  if ((e as { name?: string }).name === 'NotFound') {
    fail(`${EXPECTED_BUCKET} が見つかりません。バケット名を確認してください。`);
  } else if ((e as { name?: string }).name === 'Forbidden' || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 403) {
    warn(`${EXPECTED_BUCKET} は存在しますがアクセス権がありません。IAMポリシーを確認してください。`);
  } else {
    fail(`${EXPECTED_BUCKET} の確認中にエラー: ${(e as Error).message}`);
  }
}

// ─── 6. ローカルビルド確認 ───────────────────────────────
console.log(header('6. バックエンドビルド'));

try {
  execSync('npm run build', { cwd: process.cwd().replace(/[\\/]scripts$/, ''), stdio: 'pipe' });
  pass('バックエンドビルド成功');
} catch (e: unknown) {
  fail('バックエンドビルドに失敗しました');
  const stderr = (e as { stderr?: Buffer }).stderr?.toString();
  if (stderr) console.log('  → ' + stderr.split('\n').slice(0, 5).join('\n    '));
}

// ─── 7. CDK依存関係チェック ──────────────────────────────
console.log(header('7. CDKツールチェーン'));

try {
  const ver = execSync('npx cdk --version', { stdio: 'pipe' }).toString().trim();
  pass(`AWS CDK: ${ver}`);
} catch {
  fail('CDK CLIが見つかりません。npm install を実行してください。');
}

// ─── 8. CDK diff (変更差分プレビュー) ───────────────────
console.log(header('8. CDK diff (変更プレビュー)'));

try {
  const diff = execSync('npx cdk diff --no-color 2>&1', {
    cwd: process.cwd().replace(/[\\/]scripts$/, '').replace(/[\\/]backend$/, '') + '/infra',
    stdio: 'pipe',
    env: { ...process.env, CDK_DEFAULT_REGION: REGION },
  }).toString();
  if (diff.includes('There were no differences')) {
    pass('既にデプロイ済み: 変更なし');
  } else {
    const lines = diff.split('\n').filter(l => l.startsWith('[+]') || l.startsWith('[-]') || l.startsWith('[~]'));
    pass(`変更あり (${lines.length} リソース変更)`);
    lines.slice(0, 15).forEach(l => console.log(`  ${l}`));
    if (lines.length > 15) console.log(`  ... 他 ${lines.length - 15} 件`);
  }
} catch (e: unknown) {
  const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
  if (output.includes('Has the environment been bootstrapped')) {
    warn('CDK Bootstrap が未実行です。初回デプロイ前に cdk bootstrap が必要です。');
    console.log(`  → npx cdk bootstrap aws://${accountId}/${REGION}`);
  } else {
    warn('CDK diff を実行できませんでした（初回デプロイの場合は正常）');
  }
}

// ─── 結果サマリー ────────────────────────────────────────
console.log(header('結果サマリー'));

if (errors === 0 && warnings === 0) {
  console.log(green('すべてのチェックに合格しました。デプロイに進めます。'));
  process.exit(0);
} else if (errors === 0) {
  console.log(yellow(`警告 ${warnings} 件。確認の上、デプロイに進めます。`));
  process.exit(0);
} else {
  console.log(red(`エラー ${errors} 件、警告 ${warnings} 件。上記の問題を解決してからデプロイしてください。`));
  process.exit(1);
}
