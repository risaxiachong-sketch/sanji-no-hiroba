import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Locator,
  type Page,
  type Request,
} from 'playwright'
import { EVENTS } from '../../frontend/src/data/events.js'
import {
  AUDIO_PUBLIC_PATH,
  CAPTURE_SCHEMA_VERSION,
  DEVICE,
  DEV_SERVER_HOST,
  DEV_SERVER_PORT,
  DEV_SERVER_URL,
  FIXED_BROWSER_TIME,
  MANIFEST_JSON_SCHEMA,
  REPORT_JSON_SCHEMA,
  TAKE_DIRECTORY,
  TAKE_SECONDS,
  VIDEO_PUBLIC_PATH,
  type AudioArtifact,
  type BlockedRequestRecord,
  type CaptureFixtures,
  type CaptureManifest,
  type CaptureReport,
  type CaptureTake,
  type ConsoleRecord,
  type EventFixture,
  type PageErrorRecord,
  type RequestFailureRecord,
  type TakeStep,
  type TakeTap,
  type VideoArtifact,
} from './scenario.js'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DEMO_DIR = path.resolve(SCRIPT_DIR, '..')
const REPOSITORY_ROOT = path.resolve(DEMO_DIR, '..')
const FIXTURE_DIR = path.join(DEMO_DIR, 'fixtures')
const CAPTURE_DIR = path.join(DEMO_DIR, 'public', 'captures')
const TAKE_DIR = path.join(CAPTURE_DIR, TAKE_DIRECTORY)
const SCREENCAST_QUALITY = 92
const DEFAULT_TIMEOUT_MS = 20_000
const VITE_READY_TIMEOUT_MS = 45_000
const LOG_TAIL_LIMIT = 80
const PLAZA_LABEL = 'キャラクターが散歩し、立ち話をしている2Dの広場'
const REACTION_BAR_SELECTOR = '[aria-label$="の投稿へのリアクション"]'

/**
 * tsx compiles this file with esbuild, which wraps named functions in a `__name`
 * helper. That helper does not exist inside the page, so any evaluated snippet
 * containing one would throw. Providing an identity version keeps the snippets
 * readable.
 */
const ESBUILD_HELPER_SCRIPT = `globalThis.__name = globalThis.__name || ((target) => target)`

/**
 * Routes the app's Web Audio output into a MediaRecorder so the real sound
 * effects end up on the video. The app itself is untouched: this only swaps the
 * AudioContext the page constructs.
 *
 * The constant source keeps the stream producing samples while nothing is
 * playing. Without it Chromium drops the silent gaps and the recording collapses
 * into a few seconds of back-to-back sounds.
 */
const AUDIO_INIT_SCRIPT = `(() => {
  const Native = window.AudioContext || window.webkitAudioContext
  if (!Native) return
  const state = { chunks: [], startedAt: null, error: null, recorder: null }
  window.__demoAudio = state
  class RecordingAudioContext extends Native {
    constructor(...args) {
      super(...args)
      try {
        const sink = this.createMediaStreamDestination()
        Object.defineProperty(this, 'destination', { value: sink, configurable: true })
        const keepAlive = this.createConstantSource()
        const keepAliveGain = this.createGain()
        keepAliveGain.gain.value = 0.000001
        keepAlive.connect(keepAliveGain)
        keepAliveGain.connect(sink)
        keepAlive.start()
        const recorder = new MediaRecorder(sink.stream, { mimeType: 'audio/webm;codecs=opus' })
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) state.chunks.push(event.data)
        }
        // performance.now() is monotonic and unaffected by the page's mocked
        // wall clock, so it is the only usable reference for the sound offset.
        recorder.onstart = () => { state.startedAt = performance.now() }
        recorder.onerror = (event) => { state.error = String(event.error || event) }
        state.recorder = recorder
        recorder.start(200)
      } catch (cause) {
        state.error = String(cause)
      }
    }
  }
  window.AudioContext = RecordingAudioContext
  window.webkitAudioContext = RecordingAudioContext
})()`

interface ServerState {
  process?: ChildProcess
  command: string
  readyAt?: string
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdoutTail: string[]
  stderrTail: string[]
}

interface Diagnostics {
  blockedRequests: BlockedRequestRecord[]
  failedRequests: RequestFailureRecord[]
  consoleMessages: ConsoleRecord[]
  pageErrors: PageErrorRecord[]
}

function nowIso() {
  return new Date().toISOString()
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

function asError(cause: unknown) {
  if (cause instanceof Error) return cause
  return new Error(typeof cause === 'string' ? cause : JSON.stringify(cause))
}

function appendLogTail(target: string[], chunk: Buffer | string) {
  const lines = chunk.toString().split(/\r?\n/).filter(Boolean)
  target.push(...lines)
  if (target.length > LOG_TAIL_LIMIT) target.splice(0, target.length - LOG_TAIL_LIMIT)
}

function runCommand(executable: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { cwd: DEMO_DIR, env: process.env, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${executable} ${args.join(' ')} failed with code ${code ?? 'unknown'}\n${stderr}`))
    })
  })
}

async function assertPortAvailable() {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', (cause) => {
      reject(new Error(`Capture port ${DEV_SERVER_PORT} is unavailable: ${asError(cause).message}`))
    })
    probe.listen(DEV_SERVER_PORT, DEV_SERVER_HOST, () => {
      probe.close((cause) => cause ? reject(cause) : resolve())
    })
  })
}

async function startVite(server: ServerState) {
  await assertPortAvailable()

  const args = [
    'run', 'dev', '--workspace=frontend', '--',
    '--host', DEV_SERVER_HOST,
    '--port', String(DEV_SERVER_PORT),
    '--strictPort',
  ]

  const child = spawn('npm', args, {
    cwd: REPOSITORY_ROOT,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      VITE_API_BASE_URL: '',
      // The app's own offline mock data. The capture never adds demo-only
      // content of its own; everything on screen comes from this repository.
      VITE_USE_MOCK: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  server.process = child
  child.stdout?.on('data', (chunk: Buffer) => appendLogTail(server.stdoutTail, chunk))
  child.stderr?.on('data', (chunk: Buffer) => appendLogTail(server.stderrTail, chunk))
  child.once('exit', (code, signal) => {
    server.exitCode = code
    server.signal = signal
  })

  const deadline = Date.now() + VITE_READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signal !== null) {
      throw new Error([
        `Vite exited before becoming ready (${server.exitCode ?? server.signal ?? 'unknown'}).`,
        ...server.stderrTail.slice(-8),
      ].join('\n'))
    }

    try {
      const response = await fetch(DEV_SERVER_URL, { signal: AbortSignal.timeout(1_000) })
      if (response.ok) {
        server.readyAt = nowIso()
        return child
      }
    } catch {
      // The fixed port is reserved for this child; retry while Vite compiles.
    }
    await delay(250)
  }

  throw new Error(`Vite did not become ready at ${DEV_SERVER_URL} within ${VITE_READY_TIMEOUT_MS}ms.`)
}

async function terminateVite(server: ServerState) {
  const child = server.process
  if (!child || child.exitCode !== null || server.signal !== null) return

  const sendSignal = (signal: NodeJS.Signals) => {
    if (!child.pid) return
    try {
      if (process.platform === 'win32') child.kill(signal)
      else process.kill(-child.pid, signal)
    } catch (cause) {
      const error = asError(cause)
      if (!error.message.includes('ESRCH')) throw error
    }
  }

  sendSignal('SIGTERM')
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once('exit', () => resolve(true))),
    delay(5_000).then(() => false),
  ])

  if (!exited && child.exitCode === null) {
    sendSignal('SIGKILL')
    await Promise.race([
      new Promise<void>((resolve) => child.once('exit', () => resolve())),
      delay(2_000),
    ])
  }
}

function isLocalCaptureUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return true
  const localHostname = url.hostname === DEV_SERVER_HOST
    || url.hostname === 'localhost'
    || url.hostname === '[::1]'
    || url.hostname === '::1'
  return localHostname && url.port === String(DEV_SERVER_PORT)
}

async function createContext(browser: Browser, diagnostics: Diagnostics) {
  const context = await browser.newContext({
    viewport: DEVICE.viewport,
    screen: DEVICE.viewport,
    deviceScaleFactor: DEVICE.deviceScaleFactor,
    hasTouch: DEVICE.hasTouch,
    isMobile: DEVICE.isMobile,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    serviceWorkers: 'block',
  })
  await context.addInitScript(ESBUILD_HELPER_SCRIPT)
  await context.addInitScript(AUDIO_INIT_SCRIPT)

  const blockedRequests = new WeakSet<Request>()
  await context.route('**/*', async (route) => {
    const request = route.request()
    if (isLocalCaptureUrl(request.url())) {
      await route.continue()
      return
    }

    blockedRequests.add(request)
    diagnostics.blockedRequests.push({
      timestamp: nowIso(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    })
    await route.abort('blockedbyclient')
  })

  const page = await context.newPage()
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS)
  page.on('requestfailed', (request) => {
    diagnostics.failedRequests.push({
      timestamp: nowIso(),
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      errorText: request.failure()?.errorText ?? 'unknown request failure',
      blockedByCapture: blockedRequests.has(request),
    })
  })
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    diagnostics.consoleMessages.push({ timestamp: nowIso(), type: message.type(), text: message.text() })
  })
  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push({ timestamp: nowIso(), message: error.message, stack: error.stack })
  })

  await page.clock.setFixedTime(new Date(FIXED_BROWSER_TIME))
  return { context, page }
}

async function readJson<T>(fileName: string) {
  const contents = await fs.readFile(path.join(FIXTURE_DIR, fileName), 'utf8')
  return JSON.parse(contents) as T
}

async function loadFixtures(): Promise<CaptureFixtures> {
  const [profile, post, reaction] = await Promise.all([
    readJson<CaptureFixtures['profile']>('profile.json'),
    readJson<CaptureFixtures['post']>('posts.json'),
    readJson<CaptureFixtures['reaction']>('reactions.json'),
  ])

  if (!profile.nickname || !profile.childAgeGroup || !profile.avatarId || !profile.avatarLabel) {
    throw new Error('Profile capture fixture is incomplete.')
  }
  if (!post.text || post.text.length > 60) {
    throw new Error('Post capture fixture is invalid or exceeds the 60-character UI limit.')
  }
  if (!reaction.label || reaction.expectedInitialMinimum < 0) {
    throw new Error('Reaction capture fixture is invalid.')
  }

  return { profile, post, reaction }
}

async function waitForPlaza(page: Page) {
  const plaza = page.getByRole('region', { name: PLAZA_LABEL, exact: true })
  await plaza.waitFor({ state: 'visible' })
  await page.getByText('広場を準備しています…', { exact: true }).waitFor({ state: 'hidden', timeout: 30_000 })
  await page.waitForFunction((label) => {
    const region = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)
    const canvas = region?.querySelector('canvas')
    return canvas instanceof HTMLCanvasElement && canvas.width > 10 && canvas.height > 10
  }, PLAZA_LABEL)
}

async function waitForAttribute(locator: Locator, name: string, expected: string) {
  const deadline = Date.now() + DEFAULT_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (await locator.getAttribute(name) === expected) return
    await locator.page().waitForTimeout(50)
  }
  throw new Error(`Timed out waiting for ${name}=${JSON.stringify(expected)}.`)
}

function reactionCount(accessibleName: string | null) {
  if (!accessibleName) return 0
  const match = accessibleName.match(/（(\d+)件）/)
  return match ? Number(match[1]) : 0
}

/**
 * Drives the take: real touch input, a clock measured from the first video
 * frame, and a log of everything that happened.
 */
class Take {
  readonly steps: TakeStep[] = []
  readonly taps: TakeTap[] = []
  startedAtMs = 0

  constructor(readonly page: Page, readonly cdp: CDPSession) {}

  begin() {
    this.startedAtMs = Date.now()
  }

  get elapsedMs() {
    return Date.now() - this.startedAtMs
  }

  mark(label: string) {
    this.steps.push({ label, atMs: Math.round(this.elapsedMs) })
    console.log(`  ${(this.elapsedMs / 1000).toFixed(1).padStart(5)}s  ${label}`)
  }

  /** Waits until the take reaches the given moment. Returns immediately when late. */
  async at(milliseconds: number) {
    const remaining = milliseconds - this.elapsedMs
    if (remaining > 0) await delay(remaining)
  }

  private recordTap(x: number, y: number) {
    this.taps.push({ atMs: Math.round(this.elapsedMs), x: Math.round(x), y: Math.round(y) })
  }

  async tapPoint(x: number, y: number) {
    this.recordTap(x, y)
    await this.cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
    })
    await delay(70)
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  async tap(locator: Locator, label?: string) {
    await locator.waitFor({ state: 'visible' })
    // Touch coordinates are viewport based, so the target has to be on screen.
    await locator.scrollIntoViewIfNeeded()
    let box = await locator.boundingBox()
    if (!box) throw new Error(`${label ?? 'target'} has no visible bounds.`)

    // The navigation bar floats above the page, so a target resting underneath
    // it would hand the tap to the wrong control.
    const navigationBox = await this.page.evaluate(() => {
      const navigation = document.querySelector('nav[aria-label="メインナビゲーション"]')
      if (!navigation) return null
      const rect = navigation.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
    if (navigationBox && box.y + box.height / 2 > navigationBox.y - 6) {
      await locator.evaluate((element) => {
        element.scrollIntoView({ block: 'center', inline: 'nearest' })
      })
      await this.page.waitForTimeout(260)
      box = await locator.boundingBox() ?? box
    }

    await this.tapPoint(box.x + box.width / 2, box.y + box.height / 2)
    if (label) this.mark(label)
  }

  /** A real finger drag. The intermediate moves give the app a usable velocity. */
  async swipe(
    from: { x: number; y: number },
    to: { x: number; y: number },
    options: { steps?: number; stepMs?: number; releaseDelayMs?: number } = {},
  ) {
    const steps = options.steps ?? 12
    const stepMs = options.stepMs ?? 16
    this.recordTap(from.x, from.y)
    await this.cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from.x, y: from.y, radiusX: 12, radiusY: 12, force: 1 }],
    })
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      await delay(stepMs)
      await this.cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
          radiusX: 12,
          radiusY: 12,
          force: 1,
        }],
      })
    }
    if (options.releaseDelayMs) await delay(options.releaseDelayMs)
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  /** Touch scrolling with the browser's own fling physics. */
  async scroll(x: number, y: number, distance: number, speed = 900) {
    await this.cdp.send('Input.synthesizeScrollGesture', {
      x,
      y,
      xDistance: 0,
      yDistance: -distance,
      gestureSourceType: 'touch',
      speed,
      preventFling: false,
    })
  }
}

/**
 * Finds a walking character without showing a trail of missed taps: the probe
 * uses synthetic clicks, which the app handles exactly like a tap but which
 * leave no visible cursor, and it closes the reaction bar again on the next
 * frame. The tap that actually opens the bar afterwards is a real touch.
 */
async function probeVisitorPoint(
  page: Page,
  reaction: Readonly<{ label: string; expectedInitialMinimum: number }>,
) {
  return page.evaluate(async ({ label, barSelector, reactionLabel, minimumCount }) => {
    const frame = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)
    if (!frame) return null
    const rect = frame.getBoundingClientRect()
    const nextFrame = () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const fractions: Array<[number, number]> = []
    for (let row = 0.16; row <= 0.74; row += 0.06) {
      for (let column = 0.12; column <= 0.9; column += 0.08) {
        fractions.push([column, row])
      }
    }

    const clickAt = (x: number, y: number) => {
      const element = document.elementFromPoint(x, y)
      if (!element || !frame.contains(element) || element.tagName === 'BUTTON') return false
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }))
      return true
    }

    for (const [fx, fy] of fractions) {
      const x = rect.left + rect.width * fx
      const y = rect.top + rect.height * fy
      if (!clickAt(x, y)) continue
      await nextFrame()
      const bar = document.querySelector(barSelector)
      if (!bar) continue

      // Keep looking until the tapped character's post already carries the
      // reaction the scenario is about to add.
      const button = bar.querySelector(`[aria-label^="${reactionLabel}"]`)
      const match = button?.getAttribute('aria-label')?.match(/（(\d+)件）/)
      const count = match ? Number(match[1]) : 0
      clickAt(rect.left + rect.width * 0.5, rect.top + 10)
      if (count >= minimumCount) return { x, y }
    }
    return null
  }, {
    label: PLAZA_LABEL,
    barSelector: REACTION_BAR_SELECTOR,
    reactionLabel: reaction.label,
    minimumCount: reaction.expectedInitialMinimum,
  })
}

type Box = { x: number; y: number; width: number; height: number }

function covers(box: Box | null, x: number, y: number) {
  if (!box) return false
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

/**
 * The plaza's post button and reaction bar float above the board hotspot, so a
 * tap on its centre can land on the wrong control. Picks a point that belongs to
 * the hotspot alone.
 */
async function boardTapPoint(page: Page) {
  await page.getByRole('button', { name: 'まちの掲示板を開く', exact: true })
    .waitFor({ state: 'visible' })

  // Measured in one pass: waiting on locators that may not exist would stall the
  // take for the full locator timeout.
  const rects = await page.evaluate((barSelector) => {
    const rectOf = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }
    return {
      hotspot: rectOf('[aria-label="まちの掲示板を開く"]'),
      post: rectOf('[aria-label="つぶやく"]'),
      recenter: rectOf('[aria-label="あなたを探す"]'),
      bar: rectOf(barSelector),
    }
  }, REACTION_BAR_SELECTOR)

  const box = rects.hotspot
  if (!box) return null
  const blockers = [rects.post, rects.recenter, rects.bar]

  const fractions: Array<[number, number]> = [
    [0.5, 0.5], [0.28, 0.5], [0.28, 0.28], [0.5, 0.25],
    [0.72, 0.28], [0.28, 0.72], [0.5, 0.75], [0.72, 0.72],
  ]
  const margin = 28
  for (const [fx, fy] of fractions) {
    const x = box.x + box.width * fx
    const y = box.y + box.height * fy
    if (x < margin || y < margin) continue
    if (x > DEVICE.viewport.width - margin || y > DEVICE.viewport.height - margin) continue
    if (blockers.some((blocker) => covers(blocker, x, y))) continue
    return { x, y }
  }
  return null
}

/** Drags the plaza so the board hotspot sits comfortably inside the screen. */
async function panTowardsBoard(take: Take) {
  const box = await take.page.evaluate(() => {
    const element = document.querySelector('[aria-label="まちの掲示板を開く"]')
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  if (!box) return

  const target = { x: DEVICE.viewport.width * 0.42, y: DEVICE.viewport.height * 0.45 }
  const deltaX = Math.max(-190, Math.min(190, target.x - (box.x + box.width / 2)))
  const deltaY = Math.max(-150, Math.min(150, target.y - (box.y + box.height / 2)))
  if (Math.abs(deltaX) < 24 && Math.abs(deltaY) < 24) return

  const startX = Math.max(40, Math.min(DEVICE.viewport.width - 40, target.x - deltaX / 2))
  const startY = Math.max(120, Math.min(DEVICE.viewport.height - 160, target.y - deltaY / 2))
  await take.swipe(
    { x: startX, y: startY },
    { x: startX + deltaX, y: startY + deltaY },
    { steps: 16, stepMs: 22, releaseDelayMs: 140 },
  )
}

/**
 * True when a conversation bubble is on screen. Characters talk on their own
 * timers anywhere on the map, and the phone only shows about a third of it, so
 * the scenario has to look around until it finds a pair that is talking.
 *
 * Bubbles and the 「あなた」 name tag share a fill colour, but a bubble is never
 * narrower than 92px while the tag is 56px, so the run length separates them.
 */
async function longestBubbleRun(page: Page) {
  return page.evaluate((label) => {
    const region = document.querySelector(`[aria-label="${label}"]`)
    const canvas = region?.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) return -1
    const context = canvas.getContext('2d')
    if (!context) return -2

    const { width, height } = canvas
    const pixels = context.getImageData(0, 0, width, height).data
    const ratio = width / (canvas.clientWidth || width)

    let longest = 0
    for (let y = 0; y < height; y += 2) {
      let run = 0
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        // The bubble fill is rgba(255,253,247,.96) composited over the map, so
        // the exact values shift with whatever is behind it.
        const isBubbleFill = pixels[index] >= 245
          && pixels[index + 1] >= 243
          && pixels[index + 2] >= 230
        run = isBubbleFill ? run + 1 : 0
        if (run > longest) longest = run
      }
    }
    return longest / ratio
  }, PLAZA_LABEL)
}

async function openBoardFromPlaza(take: Take) {
  const page = take.page
  const heading = page.getByRole('heading', { name: 'まちの掲示板', exact: true })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    // A real touch anywhere in the plaza clears the camera drag state; the app
    // ignores the board hotspot while it still thinks a drag is in progress.
    const frame = await page.getByRole('region', { name: PLAZA_LABEL, exact: true }).boundingBox()
    if (frame) await take.tapPoint(frame.x + frame.width * 0.5, frame.y + 12)

    let point = await boardTapPoint(page)
    if (!point) {
      // The board can sit off screen depending on where the camera settled.
      await panTowardsBoard(take)
      point = await boardTapPoint(page)
    }
    if (point) {
      await take.tapPoint(point.x, point.y)
    } else {
      await page.getByRole('button', { name: 'まちの掲示板を開く', exact: true }).dispatchEvent('click')
    }

    try {
      await heading.waitFor({ state: 'visible', timeout: 2_500 })
      take.mark('board')
      return
    } catch {
      // A mis-hit opens the post sheet instead; step back into the plaza and retry.
      const back = page.getByRole('button', { name: '広場に戻る', exact: true }).first()
      if (await back.isVisible()) {
        await back.click()
        await waitForPlaza(page)
      }
    }
  }

  throw new Error('Could not open the bulletin board from the plaza.')
}

/**
 * The bulletin board event is never authored here: the scenario uses whichever
 * event the app itself lists first, and the matching record from
 * frontend/src/data/events.ts describes it.
 */
async function discoverListedEvent(page: Page): Promise<EventFixture> {
  const save = page.getByRole('button', { name: /を保存する$/ }).first()
  await save.waitFor({ state: 'visible' })
  const label = await save.getAttribute('aria-label')
  const title = label?.replace(/を保存する$/, '')
  if (!title) throw new Error('The bulletin board listed no saveable event.')

  const known = EVENTS.find((candidate) => candidate.title === title)
  return {
    id: known?.id ?? '',
    title,
    dateRelation: 'today',
    location: known?.location ?? '',
    officialUrl: known?.officialUrl ?? '',
  }
}

async function runTake(take: Take, fixtures: CaptureFixtures): Promise<EventFixture> {
  const { page } = take
  const { width, height } = DEVICE.viewport

  // ── トップ画面 → プロフィール登録 ────────────────────────────────
  await take.at(1_400)
  await take.tap(page.getByRole('button', { name: 'ひろばに入る', exact: true }), 'enter')
  await page.getByRole('heading', { name: 'はじめまして', exact: true }).waitFor({ state: 'visible' })

  await take.at(2_600)
  const nickname = page.getByRole('textbox', { name: 'ニックネーム', exact: true })
  await take.tap(nickname)
  await nickname.pressSequentially(fixtures.profile.nickname, { delay: 190 })
  take.mark('nickname')

  await take.at(4_400)
  await take.tap(page.getByRole('button', { name: 'お子さんの年齢', exact: true }))
  await take.at(5_400)
  await take.tap(
    page.getByRole('option', { name: fixtures.profile.childAgeGroup, exact: true }),
    'child-age',
  )

  await take.at(6_600)
  await take.tap(page.getByRole('button', { name: '次へ', exact: true }), 'next')
  await page.getByRole('heading', { name: 'どの子でひろばに行く？', exact: true }).waitFor({ state: 'visible' })

  // ── アバター選択: 実際に左右へスワイプして選ぶ ──────────────────
  const carousel = page.getByRole('radiogroup', { name: 'アバター選択', exact: true })
  const carouselBox = await carousel.boundingBox()
  if (!carouselBox) throw new Error('The avatar carousel has no visible bounds.')
  const carouselY = carouselBox.y + carouselBox.height / 2
  const swipeFrom = { x: width * 0.78, y: carouselY }
  const swipeTo = { x: width * 0.22, y: carouselY }

  await take.at(8_200)
  await take.swipe(swipeFrom, swipeTo, { steps: 10, stepMs: 16 })
  take.mark('avatar-swipe-1')

  await take.at(10_400)
  await take.swipe(swipeTo, swipeFrom, { steps: 12, stepMs: 18 })
  take.mark('avatar-swipe-2')

  await take.at(12_600)
  await take.swipe(swipeFrom, swipeTo, { steps: 14, stepMs: 20 })
  take.mark('avatar-swipe-3')

  await take.at(15_000)
  await take.tap(page.getByRole('button', { name: 'この子にする', exact: true }), 'avatar-confirm')
  await waitForPlaza(page)
  take.mark('plaza')

  // ── ひろばの立ち話を待つ ────────────────────────────────────────
  // The plaza opens with its default framing, which is where the characters
  // gather. Moving the camera walks away from the conversation, so the take
  // stays put until a bubble appears and only pans afterwards.
  const conversationDeadlineMs = 26_000
  let attempts = 0
  let foundConversation = false
  // A bubble is at least 92px wide; the 「あなた」 name tag is only 56px.
  while (!foundConversation && take.elapsedMs < conversationDeadlineMs) {
    const run = await longestBubbleRun(page)
    foundConversation = run >= 80
    if (foundConversation) break
    attempts += 1
    if (attempts % 8 === 0) console.log(`    (waiting for a conversation: widest run ${run.toFixed(0)}px)`)
    await delay(700)
  }
  if (foundConversation) take.mark('plaza-talk')
  else console.warn('No conversation became visible during the plaza watch.')

  // ── ひろば: ドラッグで見渡す ────────────────────────────────────
  await take.at(27_000)
  await take.swipe(
    { x: width * 0.78, y: height * 0.45 },
    { x: width * 0.24, y: height * 0.4 },
    { steps: 18, stepMs: 22, releaseDelayMs: 120 },
  )
  take.mark('plaza-pan-1')

  await take.at(30_000)
  await take.swipe(
    { x: width * 0.3, y: height * 0.35 },
    { x: width * 0.72, y: height * 0.55 },
    { steps: 18, stepMs: 22, releaseDelayMs: 120 },
  )
  take.mark('plaza-pan-2')

  // ── つぶやく ────────────────────────────────────────────────────
  await take.at(33_000)
  await take.tap(page.getByRole('button', { name: 'つぶやく', exact: true }).first(), 'post-open')
  await page.getByRole('heading', { name: 'つぶやく', exact: true }).waitFor({ state: 'visible' })

  await take.at(34_600)
  const postBox = page.getByRole('textbox', { name: 'つぶやきを投稿', exact: true })
  await take.tap(postBox)
  await postBox.pressSequentially(fixtures.post.text, { delay: 130 })
  take.mark('post-text')

  await take.at(38_000)
  await take.tap(page.getByRole('button', { name: 'つぶやく', exact: true }).last(), 'post-send')
  await page.getByRole('status').filter({ hasText: 'つぶやきを送りました' }).waitFor({ state: 'visible' })

  await take.at(41_000)
  await take.tap(page.getByRole('button', { name: '広場に戻る', exact: true }).first(), 'plaza-return')
  await waitForPlaza(page)


  // ── キャラクターにリアクション ──────────────────────────────────
  const plaza = page.getByRole('region', { name: PLAZA_LABEL, exact: true })
  const plazaBox = await plaza.boundingBox()
  if (!plazaBox) throw new Error('The plaza has no visible bounds.')
  // Resets the drag gesture state so the following taps count as taps.
  await take.tapPoint(plazaBox.x + plazaBox.width * 0.5, plazaBox.y + 12)

  const reactionBar = page.locator(REACTION_BAR_SELECTOR).first()
  let visitorPoint = await probeVisitorPoint(page, fixtures.reaction)
  await take.at(43_500)
  if (visitorPoint) {
    await take.tapPoint(visitorPoint.x, visitorPoint.y)
    take.mark('visitor-tap')
  }
  if (!await reactionBar.isVisible()) {
    visitorPoint = await probeVisitorPoint(page, fixtures.reaction)
    if (!visitorPoint) throw new Error('No plaza character could be found to react to.')
    await take.tapPoint(visitorPoint.x, visitorPoint.y)
    take.mark('visitor-tap-retry')
  }
  await reactionBar.waitFor({ state: 'visible' })

  await take.at(48_500)
  const reaction = reactionBar.getByRole('button', {
    name: new RegExp(`^${fixtures.reaction.label}(?:（\\d+件）)?$`),
  })
  await reaction.waitFor({ state: 'visible' })
  if (reactionCount(await reaction.getAttribute('aria-label')) < fixtures.reaction.expectedInitialMinimum) {
    throw new Error('The selected post has fewer reactions than the fixture requires.')
  }
  await take.tap(reaction, 'reaction')
  await waitForAttribute(reaction, 'aria-pressed', 'true')

  // ── まちの掲示板 ────────────────────────────────────────────────
  await take.at(52_000)
  await openBoardFromPlaza(take)
  await page.getByRole('main', { name: 'イベント一覧', exact: true }).waitFor({ state: 'visible' })

  await take.at(54_500)
  await take.scroll(width / 2, height * 0.6, 620)
  take.mark('board-scroll')

  await take.at(56_500)
  await take.scroll(width / 2, height * 0.5, -620)

  await take.at(58_000)
  await take.tap(page.getByRole('button', { name: '今日', exact: true }), 'filter-today')

  await take.at(59_500)
  const listedEvent = await discoverListedEvent(page)
  await take.tap(
    page.getByRole('button', { name: `${listedEvent.title}を保存する`, exact: true }),
    'save-event',
  )
  await page.getByRole('button', { name: `${listedEvent.title}の保存を解除する`, exact: true })
    .waitFor({ state: 'visible' })

  // ── 保存イベント → 詳細 ─────────────────────────────────────────
  await take.at(61_500)
  await take.tap(page.getByRole('button', { name: '保存イベント', exact: true }), 'saved-list')
  await page.getByRole('heading', { name: '行ってみたい一覧', exact: true }).waitFor({ state: 'visible' })

  await take.at(63_500)
  await take.tap(
    page.getByRole('button', { name: `${listedEvent.title}の詳細を見る`, exact: true }),
    'event-detail',
  )
  await page.getByRole('heading', { name: 'イベント詳細', exact: true }).waitFor({ state: 'visible' })

  await take.at(66_000)
  await take.scroll(width / 2, height * 0.6, 460)
  take.mark('detail-scroll')

  await take.at(68_000)
  const addToCalendar = page.getByRole('button', { name: 'カレンダーに追加', exact: true })
  await addToCalendar.scrollIntoViewIfNeeded()
  await take.tap(addToCalendar, 'calendar')
  await page.getByRole('dialog', { name: 'カレンダーに追加', exact: true }).waitFor({ state: 'visible' })

  await take.at(70_500)
  await take.tap(page.getByRole('button', { name: 'カレンダー選択を閉じる', exact: true }))

  // The detail page only carries the navigation bar on wide layouts.
  await take.at(71_800)
  await take.tap(page.getByRole('button', { name: '前の画面に戻る', exact: true }))
  await page.getByRole('heading', { name: '行ってみたい一覧', exact: true }).waitFor({ state: 'visible' })

  // ── 設定 ────────────────────────────────────────────────────────
  await take.at(74_000)
  await take.tap(page.getByRole('button', { name: '設定', exact: true }), 'settings')
  await page.getByRole('heading', { name: '設定', exact: true }).waitFor({ state: 'visible' })

  const soundSwitch = page.getByRole('switch').first()
  await take.at(75_500)
  await take.tap(soundSwitch, 'sound-off')
  await take.at(76_700)
  // Turned straight back on: the rest of the take needs the sound effects.
  await take.tap(soundSwitch, 'sound-on')

  await take.at(78_000)
  const largeCharacters = page.getByRole('radio', { name: '大', exact: true })
  await largeCharacters.scrollIntoViewIfNeeded()
  await take.tap(largeCharacters, 'character-size')
  await waitForAttribute(largeCharacters, 'aria-checked', 'true')

  // ── ひろばへ戻って終わる ────────────────────────────────────────
  await take.at(80_500)
  await take.tap(page.getByRole('button', { name: 'ひろば', exact: true }), 'plaza-final')
  await waitForPlaza(page)

  const overrun = take.elapsedMs - TAKE_SECONDS * 1_000
  if (overrun > 0) {
    throw new Error(
      `The take ran ${(overrun / 1_000).toFixed(1)}s past ${TAKE_SECONDS}s. `
      + 'Shorten the waits in runTake() so the whole flow fits.',
    )
  }
  await take.at(TAKE_SECONDS * 1_000)
  take.mark('end')

  return listedEvent
}

async function stopAudioRecording(page: Page) {
  return page.evaluate(async () => {
    const state = (window as unknown as {
      __demoAudio?: {
        chunks: Blob[]
        recorder: MediaRecorder | null
        startedAt: number | null
        error: string | null
      }
    }).__demoAudio
    if (!state?.recorder) return { base64: '', startedAt: null, error: state?.error ?? 'no audio recorder' }

    await new Promise<void>((resolve) => {
      state.recorder!.onstop = () => resolve()
      state.recorder!.stop()
    })
    const blob = new Blob(state.chunks, { type: 'audio/webm' })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    }
    return { base64: btoa(binary), startedAt: state.startedAt, error: state.error }
  })
}

function measureWav(buffer: Buffer) {
  let offset = 12
  let dataOffset = -1
  let dataLength = 0
  while (offset < buffer.length - 8) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    if (id === 'data') {
      dataOffset = offset + 8
      dataLength = Math.min(size, buffer.length - dataOffset)
      break
    }
    offset += 8 + size + (size % 2)
  }
  if (dataOffset === -1) throw new Error('The recorded WAV has no data chunk.')

  const channels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const samples = Math.floor(dataLength / 2)
  let peak = 0
  for (let index = 0; index < samples; index += 1) {
    const value = Math.abs(buffer.readInt16LE(dataOffset + index * 2))
    if (value > peak) peak = value
  }
  return {
    peak: peak / 32_768,
    durationSeconds: samples / Math.max(1, channels) / Math.max(1, sampleRate),
  }
}

async function describeFile(filePath: string) {
  const stat = await fs.stat(filePath)
  if (stat.size < 1) throw new Error(`Capture artifact is empty: ${filePath}`)
  return {
    bytes: stat.size,
    sha256: createHash('sha256').update(await fs.readFile(filePath)).digest('hex'),
  }
}

async function writeJson(filePath: string, value: unknown) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryPath, filePath)
}

async function main() {
  const runId = randomUUID()
  const startedAt = nowIso()
  const startedTimestamp = Date.now()
  const diagnostics: Diagnostics = {
    blockedRequests: [],
    failedRequests: [],
    consoleMessages: [],
    pageErrors: [],
  }
  const server: ServerState = {
    command: `npm run dev --workspace=frontend -- --host ${DEV_SERVER_HOST} --port ${DEV_SERVER_PORT} --strictPort`,
    exitCode: null,
    signal: null,
    stdoutTail: [],
    stderrTail: [],
  }
  let browser: Browser | undefined
  let context: BrowserContext | undefined
  let take: CaptureTake | null = null
  let failure: Error | undefined

  await fs.rm(CAPTURE_DIR, { recursive: true, force: true })
  await fs.mkdir(TAKE_DIR, { recursive: true })
  await Promise.all([
    writeJson(path.join(CAPTURE_DIR, 'manifest.schema.json'), MANIFEST_JSON_SCHEMA),
    writeJson(path.join(CAPTURE_DIR, 'report.schema.json'), REPORT_JSON_SCHEMA),
  ])

  try {
    const fixtures = await loadFixtures()
    await startVite(server)
    browser = await chromium.launch({
      headless: true,
      // Horizontal swipes on the avatar carousel would otherwise overscroll into
      // Chromium's back gesture and unload the app mid-take.
      args: ['--overscroll-history-navigation=0', '--disable-pull-to-refresh-effect'],
    })
    const session = await createContext(browser, diagnostics)
    context = session.context
    const { page } = session

    await page.goto(DEV_SERVER_URL, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'ひろばに入る', exact: true }).waitFor({ state: 'visible' })

    const cdp = await context.newCDPSession(page)
    const runner = new Take(page, cdp)

    // A neutral touch on the page background creates the app's AudioContext and
    // starts the sound recorder before the first frame is captured.
    await runner.tapPoint(6, DEVICE.viewport.height - 6)
    await page.waitForFunction(() => Boolean(
      (window as unknown as { __demoAudio?: { startedAt: number | null } }).__demoAudio?.startedAt,
    ), undefined, { timeout: 10_000 })
    const audioStartedAt = await page.evaluate(() => (
      (window as unknown as { __demoAudio: { startedAt: number } }).__demoAudio.startedAt
    ))

    const videoPath = path.join(TAKE_DIR, 'video.webm')
    // The screencast frames arrive at CSS resolution; asking for anything
    // larger just pads the frame with empty space.
    const videoSize = { width: DEVICE.viewport.width, height: DEVICE.viewport.height }
    await page.screencast.start({ path: videoPath, size: videoSize, quality: SCREENCAST_QUALITY })
    runner.begin()
    const takeStartedAt = nowIso()
    const takeStartedPerfMs = await page.evaluate(() => performance.now())

    let listedEvent: EventFixture
    try {
      listedEvent = await runTake(runner, fixtures)
    } finally {
      await page.screencast.stop()
    }
    const finishedAt = nowIso()

    const recording = await stopAudioRecording(page)
    let audio: AudioArtifact | null = null
    if (recording.base64) {
      const webmPath = path.join(TAKE_DIR, 'audio.webm')
      const wavPath = path.join(TAKE_DIR, 'audio.wav')
      await fs.writeFile(webmPath, Buffer.from(recording.base64, 'base64'))
      await runCommand(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
        '--no-install', 'remotion', 'ffmpeg',
        '-v', 'error', '-i', webmPath,
        '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le',
        wavPath, '-y',
      ])
      await fs.rm(webmPath, { force: true })
      const measurements = measureWav(await fs.readFile(wavPath))
      if (measurements.peak < 0.005) {
        throw new Error(`The recorded sound is silent (peak ${measurements.peak.toFixed(5)}).`)
      }
      audio = {
        kind: 'audio',
        mimeType: 'audio/wav',
        path: AUDIO_PUBLIC_PATH,
        ...await describeFile(wavPath),
        durationSeconds: measurements.durationSeconds,
        peak: measurements.peak,
        offsetMs: Math.round(audioStartedAt - takeStartedPerfMs),
      }
      console.log(
        `Sound: ${measurements.durationSeconds.toFixed(1)}s, peak ${(20 * Math.log10(measurements.peak)).toFixed(1)}dBFS, `
        + `offset ${audio.offsetMs}ms`,
      )
    } else if (recording.error) {
      throw new Error(`Sound recording failed: ${recording.error}`)
    }

    const video: VideoArtifact = {
      kind: 'video',
      mimeType: 'video/webm',
      path: VIDEO_PUBLIC_PATH,
      ...await describeFile(videoPath),
      width: videoSize.width,
      height: videoSize.height,
    }

    take = {
      startedAt: takeStartedAt,
      finishedAt,
      durationMs: Math.round(runner.elapsedMs),
      video,
      audio,
      steps: runner.steps,
      taps: runner.taps,
      event: listedEvent,
    }
  } catch (cause) {
    failure = asError(cause)
  } finally {
    if (context) {
      try {
        await context.close()
      } catch (cause) {
        failure ??= asError(cause)
      }
    }
    if (browser) {
      try {
        await browser.close()
      } catch (cause) {
        failure ??= asError(cause)
      }
    }
    try {
      await terminateVite(server)
    } catch (cause) {
      failure ??= asError(cause)
    }

    const finishedAt = nowIso()
    const complete = !failure && take !== null && take.audio !== null
    const manifest: CaptureManifest = {
      $schema: './manifest.schema.json',
      schemaVersion: CAPTURE_SCHEMA_VERSION,
      complete,
      generatedAt: finishedAt,
      runId,
      source: { baseUrl: DEV_SERVER_URL, fixedTime: FIXED_BROWSER_TIME },
      device: DEVICE,
      take,
    }
    const report: CaptureReport = {
      $schema: './report.schema.json',
      schemaVersion: CAPTURE_SCHEMA_VERSION,
      runId,
      success: complete,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedTimestamp,
      ...(failure ? {
        error: { name: failure.name, message: failure.message, stack: failure.stack },
      } : {}),
      server: {
        command: server.command,
        cwd: REPOSITORY_ROOT,
        baseUrl: DEV_SERVER_URL,
        readyAt: server.readyAt,
        exitCode: server.exitCode,
        signal: server.signal,
        stdoutTail: server.stdoutTail,
        stderrTail: server.stderrTail,
      },
      network: {
        blockedRequests: diagnostics.blockedRequests,
        failedRequests: diagnostics.failedRequests,
      },
      browser: {
        consoleMessages: diagnostics.consoleMessages,
        pageErrors: diagnostics.pageErrors,
      },
    }

    await Promise.all([
      writeJson(path.join(CAPTURE_DIR, 'manifest.json'), manifest),
      writeJson(path.join(CAPTURE_DIR, 'report.json'), report),
    ])
  }

  if (failure) throw failure
  console.log(`Captured a ${TAKE_SECONDS}s take with sound into ${TAKE_DIR}`)
}

void main().catch((cause) => {
  const error = asError(cause)
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
