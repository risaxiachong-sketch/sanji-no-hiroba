import { interpolate, useCurrentFrame } from 'remotion'
import { resolveChapters, type ResolvedChapter } from '../chapters'
import { TAKE_SECONDS, VIDEO_FPS } from '../timeline'
import { COLORS, FONT_STACK } from './DeviceFrames'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/**
 * Names the feature the take is currently showing and explains it in a couple of
 * sentences. Every chapter boundary comes from the capture's own step log, so
 * the caption cannot drift from the footage.
 */
export const FeaturePanel = ({ steps }: Readonly<{ steps: Readonly<Record<string, number>> }>) => {
  const frame = useCurrentFrame()
  const seconds = frame / VIDEO_FPS
  const chapters = resolveChapters(steps)
  const current = chapters.reduce<ResolvedChapter>(
    (found, chapter) => (seconds >= chapter.startSeconds ? chapter : found),
    chapters[0],
  )
  if (!current) return null

  const startFrame = current.startSeconds * VIDEO_FPS
  const enter = interpolate(frame, [startFrame, startFrame + 13], [0, 1], clamp)
  const progress = interpolate(seconds, [0, TAKE_SECONDS], [0, 1], clamp)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        color: COLORS.ink,
        fontFamily: FONT_STACK,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
        <span
          style={{
            padding: '6px 14px 7px',
            borderRadius: 999,
            color: '#fff',
            background: COLORS.coral,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '0.12em',
          }}
        >
          FEATURE
        </span>
        <span style={{ color: '#9d8374', fontSize: 16, fontWeight: 800, letterSpacing: '0.06em' }}>
          {String(current.index + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
        </span>
      </div>

      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 12}px)` }}>
        <h1
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: '0.01em',
            lineHeight: 1.26,
            textShadow: '0 3px 0 rgba(255,255,255,.7)',
          }}
        >
          {current.title}
        </h1>
        <div
          style={{
            width: 96,
            height: 6,
            margin: '26px 0 30px',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #ef9d96, #f5c268, #9ecb97)',
          }}
        />
        <p
          style={{
            margin: 0,
            maxWidth: 720,
            color: COLORS.inkSoft,
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: '0.02em',
            lineHeight: 1.95,
          }}
        >
          {current.description}
        </p>
      </div>

      <div
        style={{
          width: '100%',
          height: 6,
          marginTop: 54,
          borderRadius: 999,
          background: 'rgba(196,170,152,.24)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #ef9d96, #f5c268, #9ecb97)',
          }}
        />
      </div>
    </div>
  )
}
