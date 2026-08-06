import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AUDIO_PUBLIC_PATH, VIDEO_PUBLIC_PATH } from './scenario'

const DEMO_ROOT = path.resolve(import.meta.dirname, '..')
const CAPTURE_ROOT = path.join(DEMO_ROOT, 'public', 'captures')

const REQUIRED_FIXTURES = ['profile.json', 'posts.json', 'reactions.json', 'events.json'] as const
const REQUIRED_STATIC_ASSETS = ['plaza-day.png'] as const

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface AssetVerificationSummary {
  captureFiles: number
  fixtureFiles: number
  staticAssets: number
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function parseJson(file: string): Promise<JsonValue> {
  const source = await readFile(file, 'utf8')
  try {
    return JSON.parse(source) as JsonValue
  } catch (cause) {
    throw new Error(`${path.relative(DEMO_ROOT, file)} is not valid JSON: ${String(cause)}`)
  }
}

async function assertNonEmptyFile(file: string) {
  const metadata = await stat(file).catch(() => null)
  if (!metadata?.isFile() || metadata.size === 0) {
    throw new Error(`Missing or empty asset: ${path.relative(DEMO_ROOT, file)}`)
  }
}

async function assertFileSignature(file: string, kind: 'png' | 'webm' | 'wav') {
  await assertNonEmptyFile(file)
  const bytes = await readFile(file)
  const signatures = { png: '89504e47', webm: '1a45dfa3', wav: '52494646' } as const
  if (bytes.subarray(0, 4).toString('hex') !== signatures[kind]) {
    throw new Error(`Invalid ${kind.toUpperCase()} signature: ${path.relative(DEMO_ROOT, file)}`)
  }
}

function assertFixtureShape(name: string, value: JsonValue) {
  if (!isRecord(value) || Object.keys(value).length === 0) throw new Error(`Fixture must be a JSON object: fixtures/${name}`)
  const serialized = JSON.stringify(value)
  if (name === 'profile.json') {
    for (const expected of ['ひなた', 'avatarId', 'childAgeGroup']) {
      if (!serialized.includes(expected)) throw new Error(`fixtures/${name} is missing ${expected}.`)
    }
  }
  if (name === 'posts.json' && !serialized.includes('今日は公園に行ってきました')) {
    throw new Error('fixtures/posts.json is missing the tweet typed during the capture.')
  }
  if (name === 'reactions.json') {
    const knownTypes = ['wakaru', 'otsukare', 'kokoniiruyo', 'watashimo', 'ouen']
    if (!knownTypes.some((type) => serialized.includes(type))) {
      throw new Error('fixtures/reactions.json has no implemented reaction type.')
    }
  }
  if (name === 'events.json') {
    for (const expected of ['id', 'title', 'dateRelation', 'location']) {
      if (!serialized.includes(expected)) throw new Error(`fixtures/${name} is missing ${expected}.`)
    }
  }
}

function assertManifestIsLocal(value: JsonValue, key = 'manifest') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertManifestIsLocal(item, `${key}[${index}]`))
    return
  }
  if (!isRecord(value)) return

  for (const [childKey, childValue] of Object.entries(value)) {
    const location = `${key}.${childKey}`
    // The recorded event carries the official page the app links to. It is
    // documentation of what was on screen, never fetched by the video.
    if (childKey === 'officialUrl') continue
    if (
      typeof childValue === 'string'
      && /(?:src|path|file|video|audio|image|capture|asset|url)/i.test(childKey)
      && /^https?:\/\//i.test(childValue)
      && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(childValue)
    ) {
      throw new Error(`Capture manifest references external media at ${location}: ${childValue}`)
    }
    assertManifestIsLocal(childValue, location)
  }
}

function collectCaptureFailures(value: JsonValue, location = 'report'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectCaptureFailures(item, `${location}[${index}]`))
  }
  if (!isRecord(value)) return []

  const failures: string[] = []
  if (value.success === false || value.status === 'failed' || value.status === 'error') failures.push(location)
  if (Array.isArray(value.failed) && value.failed.length > 0) failures.push(`${location}.failed`)
  for (const [key, child] of Object.entries(value)) {
    failures.push(...collectCaptureFailures(child, `${location}.${key}`))
  }
  return failures
}

function assertNoExternalRequests(value: JsonValue, location = 'report') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoExternalRequests(item, `${location}[${index}]`))
    return
  }
  if (!isRecord(value)) return

  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`
    if (/^externalRequests?$/i.test(key)) {
      const isEmpty = child === null
        || (Array.isArray(child) && child.length === 0)
        || (typeof child === 'number' && child === 0)
      if (!isEmpty) throw new Error(`Capture report contains external requests at ${childLocation}.`)
    }
    if (/^(?:blocked|failed)Requests$/i.test(key) && Array.isArray(child)) {
      const externalUrls = child
        .filter(isRecord)
        .map((request) => request.url)
        .filter((url): url is string => (
          typeof url === 'string'
          && /^https?:\/\//i.test(url)
          && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(url)
        ))
      if (externalUrls.length > 0) {
        throw new Error(`Capture report contains external requests at ${childLocation}: ${externalUrls.join(', ')}`)
      }
    }
    assertNoExternalRequests(child, childLocation)
  }
}

async function verifyCaptureSourcesAreOffline() {
  for (const relative of ['scripts/capture.ts', 'scripts/scenario.ts']) {
    const file = path.join(DEMO_ROOT, relative)
    const source = await readFile(file, 'utf8')
    const remoteNavigation = [...source.matchAll(/(?:goto|src|url)\s*[:=(]\s*['"](https?:\/\/[^'"]+)/gi)]
      .map((match) => match[1])
      .filter((url) => !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(url))
    if (remoteNavigation.length > 0) {
      throw new Error(`${relative} contains external navigation: ${remoteNavigation.join(', ')}`)
    }
  }
}

/** The take must carry audible sound, otherwise the video silently loses it. */
function assertAudioIsAudible(audio: JsonValue) {
  if (!isRecord(audio)) throw new Error('Capture manifest has no recorded sound for the take.')
  const peak = audio.peak
  if (typeof peak !== 'number' || peak < 0.005) {
    throw new Error(`The recorded sound is silent (peak ${String(peak)}).`)
  }
  if (typeof audio.offsetMs !== 'number') {
    throw new Error('Capture manifest is missing the sound offset for the take.')
  }
}

export async function verifyAssets(): Promise<AssetVerificationSummary> {
  let fixtureFiles = 0
  for (const name of REQUIRED_FIXTURES) {
    const value = await parseJson(path.join(DEMO_ROOT, 'fixtures', name))
    assertFixtureShape(name, value)
    fixtureFiles += 1
  }

  let staticAssets = 0
  for (const name of REQUIRED_STATIC_ASSETS) {
    await assertFileSignature(path.join(DEMO_ROOT, 'public', 'assets', name), 'png')
    staticAssets += 1
  }

  const manifest = await parseJson(path.join(CAPTURE_ROOT, 'manifest.json'))
  const report = await parseJson(path.join(CAPTURE_ROOT, 'report.json'))
  if (!isRecord(manifest)) throw new Error('public/captures/manifest.json must contain a JSON object.')
  if (!isRecord(report)) throw new Error('public/captures/report.json must contain a JSON object.')
  assertManifestIsLocal(manifest)
  const failures = collectCaptureFailures(report)
  if (failures.length > 0) throw new Error(`Capture report contains failures: ${failures.join(', ')}`)
  assertNoExternalRequests(report)

  const take = manifest.take
  if (!isRecord(take)) throw new Error('Capture manifest has no take.')
  if (!isRecord(take.video) || take.video.path !== VIDEO_PUBLIC_PATH) {
    throw new Error(`Capture manifest does not list ${VIDEO_PUBLIC_PATH}.`)
  }
  if (!isRecord(take.audio) || take.audio.path !== AUDIO_PUBLIC_PATH) {
    throw new Error(`Capture manifest does not list ${AUDIO_PUBLIC_PATH}.`)
  }
  assertAudioIsAudible(take.audio)

  await assertFileSignature(path.join(DEMO_ROOT, 'public', VIDEO_PUBLIC_PATH), 'webm')
  await assertFileSignature(path.join(DEMO_ROOT, 'public', AUDIO_PUBLIC_PATH), 'wav')

  await verifyCaptureSourcesAreOffline()
  return { captureFiles: 2, fixtureFiles, staticAssets }
}

async function main() {
  const result = await verifyAssets()
  console.log(
    `Assets verified: ${result.captureFiles} take files, ${result.fixtureFiles} fixtures, ${result.staticAssets} static assets.`,
  )
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedFile === fileURLToPath(import.meta.url)) {
  main().catch((cause: unknown) => {
    console.error(cause instanceof Error ? cause.message : cause)
    process.exitCode = 1
  })
}
