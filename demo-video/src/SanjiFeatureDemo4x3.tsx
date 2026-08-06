import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion'
import { CaptureSurface } from './components/CaptureSurface'
import { COLORS, FONT_STACK, PhoneFrame } from './components/DeviceFrames'
import { FeaturePanel } from './components/FeaturePanel'
import { Wordmark } from './components/Wordmark'
import {
  ENDING_DURATION_SECONDS,
  ENDING_START_SECONDS,
  TAKE_SECONDS,
  VIDEO_FPS,
  secondsToFrames,
} from './timeline'
import { useCaptureManifest, type TakeCatalog } from './useCaptureManifest'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** The app's sound effects sit well below full scale, so they are lifted a little. */
const SOUND_GAIN = 1.8

/** Phone on the left, feature captions on the right. */
const PHONE_LEFT = 38
const PHONE_TOP = 12
const PANEL_LEFT = 590
const PANEL_RIGHT = 52

const DecorativeBackground = () => {
  const frame = useCurrentFrame()
  const drift = interpolate(frame, [0, VIDEO_FPS * 90], [-10, 18], clamp)

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 8% 12%, rgba(248,197,194,.44), transparent 25%), radial-gradient(circle at 92% 84%, rgba(158,203,151,.36), transparent 28%), radial-gradient(circle at 76% 8%, rgba(201,194,244,.2), transparent 23%), linear-gradient(145deg, #fff6e8 0%, #fffaf1 46%, #f4f2e7 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.26,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(117,82,62,.025) 0, rgba(117,82,62,.025) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0, rgba(255,255,255,.28) 1px, transparent 1px, transparent 7px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -70 + drift,
          top: 164,
          width: 260,
          height: 260,
          border: '32px solid rgba(255,255,255,.26)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -45 - drift * 0.4,
          bottom: 120,
          color: 'rgba(239,157,150,.28)',
          fontFamily: FONT_STACK,
          fontSize: 168,
          lineHeight: 1,
          transform: 'rotate(12deg)',
        }}
      >
        ✿
      </div>
      <div
        style={{
          position: 'absolute',
          left: 74,
          bottom: 96,
          color: 'rgba(158,203,151,.25)',
          fontFamily: FONT_STACK,
          fontSize: 104,
          lineHeight: 1,
          transform: 'rotate(-13deg)',
        }}
      >
        ✦
      </div>
    </AbsoluteFill>
  )
}

const TakeScene = ({ catalog }: Readonly<{ catalog: TakeCatalog }>) => {
  const frame = useCurrentFrame()
  const settle = spring({
    frame,
    fps: VIDEO_FPS,
    config: { damping: 28, mass: 0.8, stiffness: 150 },
    durationInFrames: 30,
  })
  const lift = interpolate(settle, [0, 1], [12, 0])
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp)

  return (
    <AbsoluteFill style={{ opacity, transform: `translateY(${lift}px)` }}>
      <div style={{ position: 'absolute', left: PHONE_LEFT, top: PHONE_TOP }}>
        <PhoneFrame>
          <CaptureSurface catalog={catalog} />
        </PhoneFrame>
      </div>
      <div
        style={{
          position: 'absolute',
          left: PANEL_LEFT,
          right: PANEL_RIGHT,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <FeaturePanel steps={catalog.steps} />
      </div>
    </AbsoluteFill>
  )
}

/** Plays the sound recorded during the take, lined up with the first video frame. */
const TakeSound = ({ catalog }: Readonly<{ catalog: TakeCatalog }>) => {
  if (!catalog.audioPath) return null

  const offsetFrames = Math.round((catalog.audioOffsetMs / 1_000) * VIDEO_FPS)
  const from = Math.max(0, offsetFrames)
  const trimBefore = offsetFrames < 0 ? -offsetFrames : 0
  const durationInFrames = secondsToFrames(TAKE_SECONDS) - from

  return (
    <Sequence from={from} durationInFrames={durationInFrames} name="sound">
      <Audio
        src={staticFile(catalog.audioPath)}
        trimBefore={trimBefore}
        volume={(frame) => (
          SOUND_GAIN * interpolate(frame, [durationInFrames - 24, durationInFrames], [1, 0], clamp)
        )}
      />
    </Sequence>
  )
}

const FloatingAvatar = ({
  emoji,
  left,
  top,
  color,
  delay,
}: Readonly<{
  emoji: string
  left: string
  top: string
  color: string
  delay: number
}>) => {
  const frame = useCurrentFrame()
  const enter = spring({
    frame: frame - delay,
    fps: VIDEO_FPS,
    config: { damping: 20, stiffness: 130 },
    durationInFrames: 35,
  })
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 3,
        width: 94,
        height: 94,
        display: 'grid',
        placeItems: 'center',
        border: '5px solid rgba(255,255,255,.88)',
        borderRadius: '50%',
        background: color,
        boxShadow: '0 16px 32px rgba(72,51,39,.24)',
        fontSize: 52,
        opacity: enter,
        transform: `translate(-50%, -50%) scale(${0.65 + enter * 0.35})`,
      }}
    >
      {emoji}
    </div>
  )
}

const EndingScene = () => {
  const frame = useCurrentFrame()
  const durationInFrames = secondsToFrames(ENDING_DURATION_SECONDS)
  const opacity = interpolate(frame, [0, 26], [0, 1], clamp)
  const overlay = interpolate(frame, [8, 42], [0, 1], clamp)
  const copyEnter = spring({
    frame: frame - 29,
    fps: VIDEO_FPS,
    config: { damping: 24, mass: 0.9, stiffness: 120 },
    durationInFrames: 44,
  })
  const logoEnter = spring({
    frame: frame - 47,
    fps: VIDEO_FPS,
    config: { damping: 25, mass: 0.8, stiffness: 135 },
    durationInFrames: 42,
  })
  const zoom = interpolate(frame, [0, durationInFrames], [1.02, 1.075], clamp)

  return (
    <AbsoluteFill style={{ opacity, overflow: 'hidden', color: COLORS.ink, fontFamily: FONT_STACK }}>
      <Img
        src={staticFile('assets/plaza-day.png')}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'saturate(.84) brightness(1.08)',
          transform: `scale(${zoom})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,252,244,.94) 0%, rgba(255,249,237,.9) 32%, rgba(255,244,224,.58) 64%, rgba(255,239,215,.44) 100%)',
          opacity: overlay,
        }}
      />
      <FloatingAvatar emoji="🐻" left="16%" top="62%" color="#dfeee0" delay={8} />
      <FloatingAvatar emoji="🐱" left="84%" top="58%" color="#f8e1e4" delay={15} />
      <FloatingAvatar emoji="🐰" left="23%" top="27%" color="#eee3f7" delay={23} />
      <FloatingAvatar emoji="🐏" left="77%" top="25%" color="#f5ecdc" delay={29} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '48%',
          zIndex: 7,
          width: 1040,
          minHeight: 390,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '52px 72px 58px',
          border: '3px solid rgba(239,157,150,.3)',
          borderRadius: 50,
          background: 'rgba(255,253,247,.9)',
          boxShadow: '0 28px 74px rgba(91,57,39,.18), inset 0 0 0 9px rgba(255,255,255,.42)',
          textAlign: 'center',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          style={{
            marginBottom: 38,
            opacity: copyEnter,
            transform: `translateY(${(1 - copyEnter) * 16}px)`,
          }}
        >
          <p
            style={{
              margin: 0,
              color: COLORS.ink,
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '0.03em',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            子育ての途中に、ひとりじゃない時間を。
          </p>
          <div
            style={{
              width: 110,
              height: 5,
              margin: '22px auto 0',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #ef9d96, #f5c268, #9ecb97, #78bdd4)',
            }}
          />
        </div>
        <div style={{ opacity: logoEnter, transform: `scale(${0.84 + logoEnter * 0.16})` }}>
          <Wordmark compact={false} />
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const SanjiFeatureDemo4x3 = () => {
  const catalog = useCaptureManifest()

  return (
    <AbsoluteFill style={{ background: COLORS.cream }}>
      <DecorativeBackground />
      <Sequence durationInFrames={secondsToFrames(TAKE_SECONDS)} name="take">
        <TakeScene catalog={catalog} />
      </Sequence>
      <TakeSound catalog={catalog} />
      <Sequence from={secondsToFrames(ENDING_START_SECONDS)} name="ending">
        <EndingScene />
      </Sequence>
    </AbsoluteFill>
  )
}
