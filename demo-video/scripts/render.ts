import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const DEMO_ROOT = path.resolve(import.meta.dirname, '..')
const ENTRY_POINT = 'src/index.ts'
const COMPOSITION_ID = 'SanjiFeatureDemo4x3'
const OUTPUT_DIR = path.join(DEMO_ROOT, 'out')
const FPS = 30
const PREVIEW_SECONDS = [3, 20, 37, 45, 63, 75, 88] as const

type RenderMode = 'draft' | 'final' | 'previews-only'

function runRemotion(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const child = spawn(executable, ['--no-install', 'remotion', ...args], {
      cwd: DEMO_ROOT,
      env: process.env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`Remotion exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}.`))
    })
  })
}

function getMode(argv: string[]): RenderMode {
  const allowed = new Set(['--draft', '--final', '--previews-only'])
  const unknown = argv.filter((argument) => !allowed.has(argument))
  if (unknown.length > 0) throw new Error(`Unknown render option: ${unknown.join(', ')}`)
  if (argv.includes('--previews-only')) return 'previews-only'
  return argv.includes('--draft') ? 'draft' : 'final'
}

async function renderVideo(mode: Exclude<RenderMode, 'previews-only'>) {
  const draft = mode === 'draft'
  const output = path.join(
    OUTPUT_DIR,
    draft ? 'sanji-feature-demo-4x3-draft.mp4' : 'sanji-feature-demo-4x3.mp4',
  )
  const args = [
    'render',
    ENTRY_POINT,
    COMPOSITION_ID,
    output,
    '--codec=h264',
    '--pixel-format=yuv420p',
    `--fps=${FPS}`,
    '--width=1440',
    '--height=1080',
    '--overwrite',
    // Keeps the take's own sound effects on the output.
    '--muted=false',
    '--audio-codec=aac',
    // remotion.config.ts already sets a CRF; a bitrate cap here would conflict.
    `--crf=${draft ? 28 : 18}`,
    ...(draft ? ['--scale=0.5'] : []),
  ]

  console.log(`\nRendering ${mode} video -> ${path.relative(DEMO_ROOT, output)}`)
  await runRemotion(args)
}

async function renderPreviews() {
  console.log('\nRendering required review stills')
  for (const seconds of PREVIEW_SECONDS) {
    const output = path.join(OUTPUT_DIR, `preview-${String(seconds).padStart(2, '0')}s.png`)
    await runRemotion([
      'still',
      ENTRY_POINT,
      COMPOSITION_ID,
      output,
      `--frame=${seconds * FPS}`,
      '--image-format=png',
      '--width=1440',
      '--height=1080',
      '--overwrite',
    ])
  }
}

async function main() {
  const mode = getMode(process.argv.slice(2))
  await mkdir(OUTPUT_DIR, { recursive: true })
  if (mode !== 'previews-only') await renderVideo(mode)
  await renderPreviews()

  console.log('\nRender outputs are ready in demo-video/out/.')
  if (mode === 'final') {
    console.log('Run `npm run demo:check` to validate codec, dimensions, frame rate, duration, and decodability.')
  }
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause)
  process.exitCode = 1
})
