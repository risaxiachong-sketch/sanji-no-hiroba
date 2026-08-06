import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { VIDEO_FPS } from '../timeline'
import type { TakeCatalog, TakeTap } from '../useCaptureManifest'
import { COLORS, FONT_STACK, PHONE_SCREEN } from './DeviceFrames'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** How long a touch ripple stays on screen. */
const RIPPLE_FRAMES = 16

/**
 * The video is a real capture of the app. When it is missing the surface says
 * so instead of drawing a mock-up, so a broken capture run can never be
 * mistaken for the product.
 */
const MissingCapture = () => (
  <AbsoluteFill
    style={{
      display: 'grid',
      placeItems: 'center',
      gap: 10,
      padding: 24,
      color: COLORS.inkSoft,
      background: COLORS.creamDeep,
      fontFamily: FONT_STACK,
      fontSize: 20,
      fontWeight: 700,
      textAlign: 'center',
    }}
  >
    <span>撮影データがありません</span>
    <span style={{ fontSize: 15, fontWeight: 600 }}>npm run demo:capture</span>
  </AbsoluteFill>
)

/**
 * Marks where the finger actually touched. The positions come from the taps the
 * capture performed, not from anything drawn by hand.
 */
const TouchRipple = ({ tap }: Readonly<{ tap: TakeTap }>) => {
  const frame = useCurrentFrame()
  const startFrame = (tap.atMs / 1_000) * VIDEO_FPS
  const age = frame - startFrame
  if (age < 0 || age > RIPPLE_FRAMES) return null

  const progress = age / RIPPLE_FRAMES
  const scale = interpolate(progress, [0, 1], [0.35, 1.5], clamp)
  const opacity = interpolate(progress, [0, 0.25, 1], [0, 0.85, 0], clamp)

  return (
    <div
      style={{
        position: 'absolute',
        left: tap.x,
        top: tap.y,
        zIndex: 20,
        width: 76,
        height: 76,
        border: `4px solid ${COLORS.coral}`,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.22)',
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  )
}

export const CaptureSurface = ({ catalog }: Readonly<{ catalog: TakeCatalog }>) => {
  if (!catalog.videoPath) return <MissingCapture />

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(catalog.videoPath)}
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: COLORS.cream,
        }}
      />
      <AbsoluteFill
        style={{
          width: PHONE_SCREEN.width,
          height: PHONE_SCREEN.height,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {catalog.taps.map((tap) => (
          <TouchRipple key={`${tap.atMs}-${tap.x}-${tap.y}`} tap={tap} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
