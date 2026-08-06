import { useEffect, useState } from 'react'
import { continueRender, delayRender, staticFile } from 'remotion'

export type TakeTap = Readonly<{
  atMs: number
  x: number
  y: number
}>

export type TakeCatalog = Readonly<{
  loaded: boolean
  videoPath: string | null
  audioPath: string | null
  /** Milliseconds between the first video frame and the first audio sample. */
  audioOffsetMs: number
  taps: readonly TakeTap[]
  /** When each recorded step happened, in milliseconds from the first frame. */
  steps: Readonly<Record<string, number>>
  /** CSS pixel size of the captured phone viewport. */
  viewport: Readonly<{ width: number; height: number }>
}>

const EMPTY_CATALOG: TakeCatalog = {
  loaded: false,
  videoPath: null,
  audioPath: null,
  audioOffsetMs: 0,
  taps: [],
  steps: {},
  viewport: { width: 390, height: 844 },
}

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null
)

const asNumber = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

const readArtifactPath = (value: unknown): string | null => {
  const record = asRecord(value)
  const candidate = record?.path
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

const readSteps = (value: unknown): Record<string, number> => {
  if (!Array.isArray(value)) return {}
  const steps: Record<string, number> = {}
  for (const entry of value) {
    const record = asRecord(entry)
    const label = record?.label
    const atMs = asNumber(record?.atMs, Number.NaN)
    if (typeof label !== 'string' || !Number.isFinite(atMs)) continue
    if (!(label in steps)) steps[label] = atMs
  }
  return steps
}

const readTaps = (value: unknown): TakeTap[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const record = asRecord(entry)
    if (!record) return []
    const atMs = asNumber(record.atMs, Number.NaN)
    const x = asNumber(record.x, Number.NaN)
    const y = asNumber(record.y, Number.NaN)
    if (!Number.isFinite(atMs) || !Number.isFinite(x) || !Number.isFinite(y)) return []
    return [{ atMs, x, y }]
  })
}

const parseCatalog = (manifest: unknown): TakeCatalog => {
  const root = asRecord(manifest)
  const take = asRecord(root?.take)
  if (!take) return { ...EMPTY_CATALOG, loaded: true }

  const device = asRecord(root?.device)
  const viewport = asRecord(device?.viewport)
  const audio = asRecord(take.audio)

  return {
    loaded: true,
    videoPath: readArtifactPath(take.video),
    audioPath: readArtifactPath(take.audio),
    audioOffsetMs: asNumber(audio?.offsetMs, 0),
    taps: readTaps(take.taps),
    steps: readSteps(take.steps),
    viewport: {
      width: asNumber(viewport?.width, EMPTY_CATALOG.viewport.width),
      height: asNumber(viewport?.height, EMPTY_CATALOG.viewport.height),
    },
  }
}

export const useCaptureManifest = (): TakeCatalog => {
  const [catalog, setCatalog] = useState<TakeCatalog>(EMPTY_CATALOG)
  const [renderHandle] = useState(() => delayRender('Loading capture manifest'))

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch(staticFile('captures/manifest.json'))
        if (!response.ok) throw new Error(`Capture manifest returned ${response.status}`)
        const manifest: unknown = await response.json()
        if (active) setCatalog(parseCatalog(manifest))
      } catch {
        if (active) setCatalog({ ...EMPTY_CATALOG, loaded: true })
      } finally {
        if (active) continueRender(renderHandle)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [renderHandle])

  return catalog
}
