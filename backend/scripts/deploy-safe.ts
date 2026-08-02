/**
 * deploy-safe.ts
 *
 * 段階的デプロイスクリプト。各ステップの間に確認ゲートを挟み、
 * 問題が起きたら即座に中断できる安全なデプロイフローを提供する。
 *
 * 使い方:
 *   npm run deploy:safe --workspace=backend
 *   npm run deploy:safe --workspace=backend -- --step=4   (特定ステップから再開)
 *   npm run deploy:safe --workspace=backend -- --yes      (確認プロンプトをスキップ)
 *
 * ステップ:
 *   1. Preflight チェック
 *   2. バックアップ作成
 *   3. CDK synth (テンプレート生成)
 *   4. CDK deploy (AWS へデプロイ)
 *   5. リアクション移行
 *   6. イベント登録
 *   7. デプロイ後検証
 */
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// ─── 設定 ───────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, '../..');
const BACKEND = path.resolve(ROOT, 'backend');
const INFRA = path.resolve(ROOT, 'infra');
const LOG_DIR = path.resolve(ROOT, '.deploy-logs');

const args = process.argv.slice(2);
const startStep = Number(args.find(a => a.startsWith('--step='))?.split('=')[1] ?? 1);
const autoYes = args.includes('--yes');
const adminKey = args.find(a => a.startsWith('--key='))?.split('=')[1];

// ─── ユーティリティ ───────────────────────────────────────
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function logToFile(step: number, name: string, output: string) {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(LOG_DIR, `step${step}-${name}-${timestamp}.log`);
  writeFileSync(file, output);
  console.log(`  📄 ログ保存: ${path.relative(ROOT, file)}`);
}

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env } }).toString();
}

function runInteractive(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env } });
}

async function confirm(message: string): Promise<boolean> {
  if (autoYes) {
    console.log(`  ${message} → --yes により自動続行`);
    return true;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function banner(step: number, title: string) {
  console.log(`\n${bold(`═══ ステップ ${step}/7: ${title} ═══`)}`);
}

function success(msg: string) { console.log(green(`  ✓ ${msg}`)); }
function abort(msg: string) { console.log(red(`\n  ✗ 中断: ${msg}`)); process.exit(1); }

// ─── ステップ実行 ────────────────────────────────────────

async function step1() {
  banner(1, 'Preflight チェック');
  console.log('  環境・リソースの事前確認を実行します...\n');
  try {
    const output = run('npx tsx scripts/preflight-check.ts', BACKEND);
    console.log(output);
    logToFile(1, 'preflight', output);
    success('Preflight チェック完了');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    console.log(output);
    logToFile(1, 'preflight-FAILED', output);
    abort('Preflightチェックに失敗しました。上記のエラーを解決してください。');
  }
}

async function step2() {
  banner(2, 'バックアップ作成');
  console.log('  既存3テーブルのDynamoDBバックアップを作成します。');
  console.log('  対象: sanji-demo-posts, sanji-demo-reactions, sanji-demo-events\n');

  // ドライラン表示
  try {
    const dry = run('npx tsx scripts/backup-tables.ts', BACKEND);
    console.log(dry);
  } catch { /* ignore */ }

  if (!await confirm('バックアップを作成しますか？')) {
    abort('ユーザーにより中断されました。');
  }

  try {
    const output = run('npx tsx scripts/backup-tables.ts --apply', BACKEND);
    console.log(output);
    logToFile(2, 'backup', output);
    success('バックアップ作成完了');
    console.log('  💡 AWSコンソール > DynamoDB > バックアップ で確認できます。');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    logToFile(2, 'backup-FAILED', output);
    abort('バックアップ作成に失敗しました。');
  }
}

async function step3() {
  banner(3, 'CDK synth (テンプレート生成)');
  console.log('  CloudFormationテンプレートを生成し、変更内容を確認します。\n');

  try {
    const output = run('npm run build', BACKEND);
    logToFile(3, 'build-backend', output);
    success('バックエンドビルド成功');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    logToFile(3, 'build-FAILED', output);
    abort('バックエンドビルドに失敗しました。');
  }

  try {
    const output = run('npx cdk synth', INFRA);
    logToFile(3, 'synth', output);
    success('CDK synth 成功');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    logToFile(3, 'synth-FAILED', output);
    abort('CDK synth に失敗しました。テンプレートにエラーがあります。');
  }

  // diff表示
  console.log('\n  変更差分:');
  try {
    const diff = run('npx cdk diff 2>&1', INFRA);
    console.log(diff.split('\n').map(l => `    ${l}`).join('\n'));
    logToFile(3, 'diff', diff);
  } catch (e: unknown) {
    const diff = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    console.log(diff.split('\n').map(l => `    ${l}`).join('\n'));
    logToFile(3, 'diff', diff);
  }

  if (!await confirm('この変更内容でデプロイに進みますか？')) {
    abort('ユーザーにより中断されました。synth結果を確認してください。');
  }
}

async function step4() {
  banner(4, 'CDK deploy (AWSへデプロイ)');

  if (!adminKey) {
    console.log(red('  施設コード(AdminApiKey)が必要です。'));
    console.log('  → --key=<施設コード> を付けて再実行してください。');
    console.log('  例: npm run deploy:safe --workspace=backend -- --key=alpaca-facility-2026-demo');
    abort('AdminApiKey が指定されていません。');
  }

  if (adminKey.length < 16) {
    abort(`AdminApiKeyは16文字以上が必要です (現在: ${adminKey.length}文字)`);
  }

  console.log('  以下のリソースを作成/更新します:');
  console.log('    - DynamoDB: sanji-demo-users (新規)');
  console.log('    - DynamoDB: sanji-demo-saved-events (新規)');
  console.log('    - Lambda: 7関数 (sanji-v2-*)');
  console.log('    - API Gateway: sanji-no-hiroba-api-v2');
  console.log('    - IAM: Lambda実行ロール + テーブルアクセス権限');
  console.log('');
  console.log('  ⚠️  既存テーブル・旧APIは変更しません。');
  console.log('');

  if (!await confirm('AWSへデプロイを実行しますか？(課金が発生する可能性があります)')) {
    abort('ユーザーにより中断されました。');
  }

  console.log('\n  デプロイ中... (数分かかります)\n');

  try {
    runInteractive(
      `npx cdk deploy --all --require-approval never --parameters SanjiHiroba-ApiV2:AdminApiKey=${adminKey}`,
      INFRA,
    );
    success('CDK deploy 完了');

    // API URL取得
    try {
      const outputs = run(
        'aws cloudformation describe-stacks --stack-name SanjiHiroba-ApiV2 --query "Stacks[0].Outputs[?OutputKey==\'ApiUrl\'].OutputValue" --output text',
        ROOT,
      ).trim();
      if (outputs) {
        console.log(`\n  ${bold('API URL')}: ${cyan(outputs)}`);
        console.log('  → この値をAmplifyのVITE_API_BASE_URLに設定してください。');
        logToFile(4, 'api-url', outputs);
      }
    } catch { /* output retrieval is best-effort */ }
  } catch {
    console.log(red('\n  デプロイに失敗しました。'));
    console.log('  CDKのエラーメッセージを確認してください。');
    console.log('  ロールバック: npm run rollback --workspace=backend');
    abort('CDK deploy に失敗しました。');
  }
}

async function step5() {
  banner(5, 'リアクション移行');
  console.log('  旧リアクションデータを新しい複数リアクション形式へコピーします。');
  console.log('  ⚠️  旧データは削除しません。再実行しても重複しません。\n');

  // ドライラン
  try {
    const dry = run('npx tsx scripts/migrate-reactions.ts', BACKEND);
    console.log(dry);
  } catch { /* ignore */ }

  if (!await confirm('リアクション移行を実行しますか？')) {
    console.log('  → スキップ。後から個別に実行できます:');
    console.log('    npm run migrate:reactions --workspace=backend -- --apply');
    return;
  }

  try {
    const output = run('npx tsx scripts/migrate-reactions.ts --apply', BACKEND);
    console.log(output);
    logToFile(5, 'migrate-reactions', output);
    success('リアクション移行完了');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    logToFile(5, 'migrate-FAILED', output);
    console.log(red('  移行に失敗しました。再実行可能です。'));
    if (!await confirm('続行しますか？')) abort('ユーザーにより中断。');
  }
}

async function step6() {
  banner(6, 'イベント登録');
  console.log('  掲示板用のイベントデータを登録します。');
  console.log('  ⚠️  既存のイベントは上書きしません。\n');

  // ドライラン
  try {
    const dry = run('npx tsx scripts/seed-events.ts', BACKEND);
    console.log(dry);
  } catch { /* ignore */ }

  if (!await confirm('イベントを登録しますか？')) {
    console.log('  → スキップ。後から個別に実行できます:');
    console.log('    npm run seed:events --workspace=backend -- --apply');
    return;
  }

  try {
    const output = run('npx tsx scripts/seed-events.ts --apply', BACKEND);
    console.log(output);
    logToFile(6, 'seed-events', output);
    success('イベント登録完了');
  } catch (e: unknown) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() ?? '';
    logToFile(6, 'seed-FAILED', output);
    console.log(red('  登録に失敗しました。再実行可能です。'));
    if (!await confirm('続行しますか？')) abort('ユーザーにより中断。');
  }
}

async function step7() {
  banner(7, 'デプロイ後検証');
  console.log('  デプロイされたAPIの基本動作を確認します。\n');

  let apiUrl: string | undefined;
  try {
    apiUrl = run(
      'aws cloudformation describe-stacks --stack-name SanjiHiroba-ApiV2 --query "Stacks[0].Outputs[?OutputKey==\'ApiUrl\'].OutputValue" --output text',
      ROOT,
    ).trim();
  } catch {
    console.log('  API URLを取得できませんでした。手動で確認してください。');
    return;
  }

  if (!apiUrl) {
    console.log('  API URLが見つかりません。スタックのデプロイ状態を確認してください。');
    return;
  }

  console.log(`  API: ${cyan(apiUrl)}\n`);

  const checks = [
    { name: 'GET /posts', path: 'posts' },
    { name: 'GET /events', path: 'events' },
    { name: 'GET /plaza/recent-users', path: 'plaza/recent-users' },
  ];

  for (const check of checks) {
    try {
      const url = `${apiUrl}${check.path}`;
      const result = run(`curl -s -o NUL -w "%{http_code}" "${url}"`, ROOT).trim();
      const code = Number.parseInt(result, 10);
      if (code >= 200 && code < 400) {
        success(`${check.name} → ${code}`);
      } else {
        console.log(red(`  ✗ ${check.name} → HTTP ${code}`));
      }
    } catch {
      console.log(red(`  ✗ ${check.name} → リクエスト失敗`));
    }
  }

  console.log(`\n${bold('═══ デプロイ完了 ═══')}`);
  console.log(`\n  次のステップ:`);
  console.log(`  1. S3バケット(sanji-demo-images)のCORS設定`);
  console.log(`  2. AmplifyのVITE_API_BASE_URL環境変数を設定:`);
  console.log(`     ${cyan(apiUrl)}`);
  console.log(`  3. Amplifyで再デプロイ`);
  console.log(`  4. 動作確認（手順書の11項目）`);
  console.log(`\n  問題が発生した場合:`);
  console.log(`    npm run rollback --workspace=backend`);
}

// ─── メイン実行 ──────────────────────────────────────────
console.log(bold('\n🚀 さんじのひろば AWS連動版 安全デプロイ'));
console.log(`  開始ステップ: ${startStep}`);
console.log(`  確認モード: ${autoYes ? '自動続行' : '都度確認'}`);
console.log(`  ログ出力先: ${path.relative(ROOT, LOG_DIR)}/`);

const steps = [step1, step2, step3, step4, step5, step6, step7];

for (let i = startStep - 1; i < steps.length; i++) {
  await steps[i]();
}
