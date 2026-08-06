export const CAPTURE_SCHEMA_VERSION = '2.0.0' as const
export const DEV_SERVER_HOST = '127.0.0.1' as const
export const DEV_SERVER_PORT = 4173 as const
export const DEV_SERVER_URL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}` as const
export const FIXED_BROWSER_TIME = '2026-08-04T01:00:00.000Z' as const

/**
 * A single phone. The capture is one continuous take, so there is no second
 * device to keep in sync any more.
 */
export const DEVICE = {
  /**
   * A current large phone. The screencast records at CSS resolution, so a
   * roomier viewport is what keeps the footage sharp once it is scaled to fill
   * the 1080px canvas; it stays well under the app's 600px tablet breakpoint.
   */
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
} as const

/** Recorded length of the take. The composition places the ending card over its tail. */
export const TAKE_SECONDS = 85

export const TAKE_DIRECTORY = 'take' as const
export const VIDEO_PUBLIC_PATH = 'captures/take/video.webm' as const
export const AUDIO_PUBLIC_PATH = 'captures/take/audio.wav' as const

export interface ProfileFixture {
  nickname: string
  childAgeGroup: string
  avatarId: string
  avatarLabel: string
}

export interface PostFixture {
  text: string
}

export interface ReactionFixture {
  value: string
  label: string
  expectedInitialMinimum: number
}

export interface EventFixture {
  id: string
  title: string
  dateRelation: 'today' | 'tomorrow'
  location: string
  officialUrl: string
}

/**
 * Only the values a person types during the capture live in fixtures.
 * Everything the app itself renders comes from the app's own data.
 */
export interface CaptureFixtures {
  profile: ProfileFixture
  post: PostFixture
  reaction: ReactionFixture
}

export interface CaptureArtifact {
  kind: 'video' | 'audio'
  mimeType: 'video/webm' | 'audio/wav'
  path: string
  bytes: number
  sha256: string
}

export interface VideoArtifact extends CaptureArtifact {
  kind: 'video'
  mimeType: 'video/webm'
  width: number
  height: number
}

export interface AudioArtifact extends CaptureArtifact {
  kind: 'audio'
  mimeType: 'audio/wav'
  durationSeconds: number
  peak: number
  /**
   * Milliseconds between the first video frame and the first audio sample.
   * Negative means the sound recording started before the screencast.
   */
  offsetMs: number
}

/** A named moment inside the take, measured from the first video frame. */
export interface TakeStep {
  label: string
  atMs: number
}

/** A real tap performed during the take, in CSS pixels of the phone viewport. */
export interface TakeTap {
  atMs: number
  x: number
  y: number
}

export interface CaptureTake {
  startedAt: string
  finishedAt: string
  durationMs: number
  video: VideoArtifact
  audio: AudioArtifact | null
  steps: TakeStep[]
  taps: TakeTap[]
  /** The bulletin board event the app itself listed first under the 「今日」 filter. */
  event: EventFixture
}

export interface CaptureManifest {
  $schema: './manifest.schema.json'
  schemaVersion: typeof CAPTURE_SCHEMA_VERSION
  complete: boolean
  generatedAt: string
  runId: string
  source: {
    baseUrl: string
    fixedTime: string
  }
  device: typeof DEVICE
  take: CaptureTake | null
}

export interface BlockedRequestRecord {
  timestamp: string
  method: string
  resourceType: string
  url: string
}

export interface RequestFailureRecord {
  timestamp: string
  method: string
  resourceType: string
  url: string
  errorText: string
  blockedByCapture: boolean
}

export interface ConsoleRecord {
  timestamp: string
  type: string
  text: string
}

export interface PageErrorRecord {
  timestamp: string
  message: string
  stack?: string
}

export interface CaptureReport {
  $schema: './report.schema.json'
  schemaVersion: typeof CAPTURE_SCHEMA_VERSION
  runId: string
  success: boolean
  startedAt: string
  finishedAt: string
  durationMs: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  server: {
    command: string
    cwd: string
    baseUrl: string
    readyAt?: string
    exitCode: number | null
    signal: NodeJS.Signals | null
    stdoutTail: string[]
    stderrTail: string[]
  }
  network: {
    blockedRequests: BlockedRequestRecord[]
    failedRequests: RequestFailureRecord[]
  }
  browser: {
    consoleMessages: ConsoleRecord[]
    pageErrors: PageErrorRecord[]
  }
}

const artifactBase = {
  path: { type: 'string', pattern: '^captures/take/(video\\.webm|audio\\.wav)$' },
  bytes: { type: 'integer', minimum: 1 },
  sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
} as const

const videoArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'mimeType', 'path', 'bytes', 'sha256', 'width', 'height'],
  properties: {
    ...artifactBase,
    kind: { const: 'video' },
    mimeType: { const: 'video/webm' },
    width: { type: 'integer', minimum: 1 },
    height: { type: 'integer', minimum: 1 },
  },
} as const

const audioArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'mimeType', 'path', 'bytes', 'sha256', 'durationSeconds', 'peak', 'offsetMs'],
  properties: {
    ...artifactBase,
    kind: { const: 'audio' },
    mimeType: { const: 'audio/wav' },
    durationSeconds: { type: 'number', exclusiveMinimum: 0 },
    peak: { type: 'number', minimum: 0, maximum: 1 },
    offsetMs: { type: 'number' },
  },
} as const

export const MANIFEST_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://sanji-no-hiroba.local/capture-manifest.schema.json',
  title: 'Sanji no Hiroba single-take capture manifest',
  type: 'object',
  additionalProperties: false,
  required: ['$schema', 'schemaVersion', 'complete', 'generatedAt', 'runId', 'source', 'device', 'take'],
  properties: {
    $schema: { const: './manifest.schema.json' },
    schemaVersion: { const: CAPTURE_SCHEMA_VERSION },
    complete: { type: 'boolean' },
    generatedAt: { type: 'string', format: 'date-time' },
    runId: { type: 'string', minLength: 1 },
    source: {
      type: 'object',
      additionalProperties: false,
      required: ['baseUrl', 'fixedTime'],
      properties: {
        baseUrl: { type: 'string', format: 'uri' },
        fixedTime: { type: 'string', format: 'date-time' },
      },
    },
    device: {
      type: 'object',
      additionalProperties: false,
      required: ['viewport', 'deviceScaleFactor', 'hasTouch', 'isMobile'],
      properties: {
        viewport: {
          type: 'object',
          additionalProperties: false,
          required: ['width', 'height'],
          properties: {
            width: { type: 'integer', minimum: 1 },
            height: { type: 'integer', minimum: 1 },
          },
        },
        deviceScaleFactor: { type: 'integer', minimum: 1, maximum: 3 },
        hasTouch: { type: 'boolean' },
        isMobile: { type: 'boolean' },
      },
    },
    take: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['startedAt', 'finishedAt', 'durationMs', 'video', 'audio', 'steps', 'taps', 'event'],
      properties: {
        startedAt: { type: 'string', format: 'date-time' },
        finishedAt: { type: 'string', format: 'date-time' },
        durationMs: { type: 'integer', minimum: 1 },
        video: videoArtifactSchema,
        audio: { anyOf: [audioArtifactSchema, { type: 'null' }] },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'atMs'],
            properties: {
              label: { type: 'string', minLength: 1 },
              atMs: { type: 'integer' },
            },
          },
        },
        taps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['atMs', 'x', 'y'],
            properties: {
              atMs: { type: 'integer' },
              x: { type: 'number' },
              y: { type: 'number' },
            },
          },
        },
        event: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'title', 'dateRelation', 'location', 'officialUrl'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string', minLength: 1 },
            dateRelation: { enum: ['today', 'tomorrow'] },
            location: { type: 'string' },
            officialUrl: { type: 'string' },
          },
        },
      },
    },
  },
} as const

export const REPORT_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://sanji-no-hiroba.local/capture-report.schema.json',
  title: 'Sanji no Hiroba capture diagnostics report',
  type: 'object',
  additionalProperties: false,
  required: [
    '$schema',
    'schemaVersion',
    'runId',
    'success',
    'startedAt',
    'finishedAt',
    'durationMs',
    'server',
    'network',
    'browser',
  ],
  properties: {
    $schema: { const: './report.schema.json' },
    schemaVersion: { const: CAPTURE_SCHEMA_VERSION },
    runId: { type: 'string', minLength: 1 },
    success: { type: 'boolean' },
    startedAt: { type: 'string', format: 'date-time' },
    finishedAt: { type: 'string', format: 'date-time' },
    durationMs: { type: 'integer', minimum: 0 },
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'message'],
      properties: {
        name: { type: 'string' },
        message: { type: 'string' },
        stack: { type: 'string' },
      },
    },
    server: { type: 'object' },
    network: { type: 'object' },
    browser: { type: 'object' },
  },
} as const
