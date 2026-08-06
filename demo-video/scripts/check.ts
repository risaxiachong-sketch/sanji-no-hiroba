import { spawn } from 'node:child_process'
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { verifyAssets } from './verify-assets'
import { TAKE_SECONDS, VIDEO_DURATION_FRAMES, VIDEO_DURATION_SECONDS, VIDEO_FPS } from '../src/timeline'

const DEMO_ROOT = path.resolve(import.meta.dirname, '..')
const ENTRY_POINT = 'src/index.ts'
const COMPOSITION_ID = 'SanjiFeatureDemo4x3'
const CHECK_DIR = path.join(DEMO_ROOT, 'out', 'check')
const FINAL_VIDEO = path.join(DEMO_ROOT, 'out', 'sanji-feature-demo-4x3.mp4')
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')

interface CommandResult {
  stdout: string
  stderr: string
}

interface ProbeStream {
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  pix_fmt?: string
  r_frame_rate?: string
  display_aspect_ratio?: string
}

interface ProbeResult {
  streams?: ProbeStream[]
  format?: { duration?: string }
}

function run(executable: string, args: string[], options: { capture?: boolean } = {}) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: DEMO_ROOT,
      env: process.env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let stdout = ''
    let stderr = ''
    if (options.capture) {
      child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
      child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    }
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(
        `${executable} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}\n${stderr}`,
      ))
    })
  })
}

function npmCommand(args: string[], capture = false) {
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { capture })
}

function remotionCommand(args: string[], capture = false) {
  return run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--no-install', 'remotion', ...args],
    { capture },
  )
}

function stripAnsi(value: string) {
  return value.replace(ANSI_ESCAPE, '')
}

function parseFrameRate(value: string | undefined) {
  if (!value) return Number.NaN
  const [numeratorText, denominatorText] = value.split('/')
  const numerator = Number(numeratorText)
  const denominator = Number(denominatorText ?? '1')
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return Number.NaN
  return numerator / denominator
}

async function probeVideo(file: string): Promise<ProbeResult> {
  const result = await remotionCommand([
    'ffprobe',
    '-v', 'error',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,display_aspect_ratio:format=duration',
    '-of', 'json',
    file,
  ], true)
  const output = result.stdout.trim()
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`ffprobe returned invalid JSON for ${file}.`)
  return JSON.parse(output.slice(start, end + 1)) as ProbeResult
}

/**
 * Decodes every frame and confirms the count. The bundled FFmpeg has no null
 * encoder, so `-f null -` cannot be used as a decode check here.
 */
async function assertDecodesEveryFrame(file: string, expectedFrames: number) {
  const result = await remotionCommand([
    'ffprobe',
    '-v', 'error',
    '-count_frames',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_frames',
    '-of', 'json',
    file,
  ], true)
  const output = result.stdout.trim()
  const start = output.indexOf('{')
  const end = output.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`ffprobe returned invalid JSON for ${file}.`)
  const parsed = JSON.parse(output.slice(start, end + 1)) as {
    streams?: Array<{ nb_read_frames?: string }>
  }
  const decoded = Number(parsed.streams?.[0]?.nb_read_frames)
  if (decoded !== expectedFrames) {
    throw new Error(`Decoded ${parsed.streams?.[0]?.nb_read_frames ?? 'no'} frames from ${path.basename(file)}; expected ${expectedFrames}.`)
  }
}

function assertVideoMetadata(
  result: ProbeResult,
  expected: { width: number; height: number; durationMin: number; durationMax: number },
) {
  const video = result.streams?.find((stream) => stream.codec_type === 'video')
  if (!video) throw new Error('No video stream found.')
  if (video.codec_name !== 'h264') throw new Error(`Expected H.264, received ${video.codec_name ?? 'unknown'}.`)
  if (video.pix_fmt !== 'yuv420p') throw new Error(`Expected yuv420p, received ${video.pix_fmt ?? 'unknown'}.`)
  if (video.width !== expected.width || video.height !== expected.height) {
    throw new Error(`Expected ${expected.width}x${expected.height}, received ${video.width}x${video.height}.`)
  }
  const fps = parseFrameRate(video.r_frame_rate)
  if (Math.abs(fps - 30) > 0.001) throw new Error(`Expected 30fps, received ${video.r_frame_rate ?? 'unknown'}.`)
  if (video.display_aspect_ratio && !['4:3', '0:1', 'N/A'].includes(video.display_aspect_ratio)) {
    throw new Error(`Expected 4:3 display aspect ratio, received ${video.display_aspect_ratio}.`)
  }
  const duration = Number(result.format?.duration)
  if (!Number.isFinite(duration) || duration < expected.durationMin || duration > expected.durationMax) {
    throw new Error(`Duration ${result.format?.duration ?? 'unknown'}s is outside the expected range.`)
  }
  const audio = result.streams?.filter((stream) => stream.codec_type === 'audio') ?? []
  if (audio.length !== 1) {
    throw new Error(`Expected exactly one audio stream carrying the app's sound effects, found ${audio.length}.`)
  }
  if (audio[0].codec_name !== 'aac') {
    throw new Error(`Expected AAC audio, received ${audio[0].codec_name ?? 'unknown'}.`)
  }
}

async function assertComposition() {
  const result = await remotionCommand(['compositions', ENTRY_POINT], true)
  const output = stripAnsi(`${result.stdout}\n${result.stderr}`)
  const row = output.split(/\r?\n/).find((line) => line.includes(COMPOSITION_ID))
  if (!row) throw new Error(`Composition ${COMPOSITION_ID} was not discovered.`)

  // `remotion compositions` prints "<id> <fps> <width>x<height> <frames> (<seconds> sec)".
  const details = row.match(/(\d+(?:\.\d+)?)\s+(\d+)x(\d+)\s+([\d,]+)/)
  if (!details) throw new Error(`Could not read composition metadata from: ${row.trim()}`)
  const [, fps, width, height, frameCount] = details

  if (Number(fps) !== VIDEO_FPS) throw new Error(`Composition runs at ${fps}fps; expected ${VIDEO_FPS}fps.`)
  if (Number(width) !== 1440 || Number(height) !== 1080) {
    throw new Error(`Composition is ${width}x${height}; expected 1440x1080.`)
  }
  const frames = Number(frameCount.replaceAll(',', ''))
  if (frames !== VIDEO_DURATION_FRAMES) {
    throw new Error(`Composition has ${frames} frames; timeline declares ${VIDEO_DURATION_FRAMES}.`)
  }
}

async function assertTimelineSource() {
  const source = await readFile(path.join(DEMO_ROOT, 'src', 'timeline.ts'), 'utf8')
  if (!source.includes(COMPOSITION_ID) && !source.match(/(?:SCENES|TIMELINE|scene)/i)) {
    throw new Error('src/timeline.ts does not expose recognizable timeline data.')
  }
  if (/Date\.now\s*\(|Math\.random\s*\(/.test(source)) {
    throw new Error('src/timeline.ts contains nondeterministic time or randomness.')
  }
  if (VIDEO_FPS !== 30) throw new Error(`Timeline declares ${VIDEO_FPS}fps; expected 30fps.`)
  if (VIDEO_DURATION_SECONDS < 75 || VIDEO_DURATION_SECONDS > 100) {
    throw new Error(`Timeline duration ${VIDEO_DURATION_SECONDS}s is outside 75–100s.`)
  }
  if (VIDEO_DURATION_FRAMES !== VIDEO_FPS * VIDEO_DURATION_SECONDS) {
    throw new Error('Timeline frame and second constants disagree.')
  }
  if (TAKE_SECONDS <= 0 || TAKE_SECONDS > VIDEO_DURATION_SECONDS) {
    throw new Error(`Take length ${TAKE_SECONDS}s does not fit inside the ${VIDEO_DURATION_SECONDS}s video.`)
  }
}

async function renderSmokeTest() {
  const still = path.join(CHECK_DIR, 'test-still.png')
  const video = path.join(CHECK_DIR, 'test-render.mp4')
  await remotionCommand([
    'still', ENTRY_POINT, COMPOSITION_ID, still,
    '--frame=0', '--image-format=png', '--scale=0.25', '--overwrite',
  ])
  await remotionCommand([
    'render', ENTRY_POINT, COMPOSITION_ID, video,
    '--frames=0-29', '--scale=0.25', '--codec=h264', '--pixel-format=yuv420p',
    '--fps=30', '--muted=false', '--audio-codec=aac', '--overwrite',
  ])
  assertVideoMetadata(await probeVideo(video), {
    width: 360,
    height: 270,
    durationMin: 0.9,
    durationMax: 1.1,
  })
  await assertDecodesEveryFrame(video, 30)
}

async function verifyFinalWhenPresent() {
  const metadata = await stat(FINAL_VIDEO).catch(() => null)
  if (!metadata?.isFile()) {
    console.log('\nFinal MP4 not found; render it with `npm run demo:render`, then rerun this check.')
    console.log('Standalone metadata command:')
    console.log('npx remotion ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,display_aspect_ratio:format=duration -of json out/sanji-feature-demo-4x3.mp4')
    return
  }
  if (metadata.size >= 100_000_000) throw new Error(`Final MP4 is ${(metadata.size / 1_000_000).toFixed(1)}MB; expected under 100MB.`)
  assertVideoMetadata(await probeVideo(FINAL_VIDEO), {
    width: 1440,
    height: 1080,
    durationMin: 75,
    durationMax: 100,
  })
  await assertDecodesEveryFrame(FINAL_VIDEO, VIDEO_DURATION_FRAMES)
}

async function main() {
  await mkdir(CHECK_DIR, { recursive: true })

  console.log('1/7 TypeScript')
  await npmCommand(['run', 'typecheck'])
  console.log('\n2/7 Lint')
  await npmCommand(['run', 'lint'])
  console.log('\n3/7 Fixtures and captures')
  const assets = await verifyAssets()
  console.log(`Verified ${assets.fixtureFiles} fixtures and ${assets.captureFiles} capture surfaces.`)
  console.log('\n4/7 Timeline')
  await assertTimelineSource()
  console.log('\n5/7 Composition')
  await assertComposition()
  console.log('\n6/7 Short still and render')
  await renderSmokeTest()
  console.log('\n7/7 Final MP4 metadata (when present)')
  await verifyFinalWhenPresent()
  console.log('\nDemo video checks passed.')
}

main().catch((cause: unknown) => {
  console.error(cause instanceof Error ? cause.message : cause)
  process.exitCode = 1
})
