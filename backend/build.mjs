import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join } from 'path';

const functionsDir = 'functions';
const entries = readdirSync(functionsDir).filter(d => {
  // ディレクトリのみ（index.ts を含むもの）
  try {
    return readdirSync(join(functionsDir, d)).includes('index.ts');
  } catch {
    return false;
  }
});

for (const entry of entries) {
  await build({
    entryPoints: [join(functionsDir, entry, 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    outfile: join('dist', entry, 'index.mjs'),
    external: ['@aws-sdk/*'],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  });
  console.log(`✅ Built: ${entry}`);
}

console.log('🎉 All functions built successfully!');
