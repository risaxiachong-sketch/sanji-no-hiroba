import { Color, Vector3 } from 'three'

/**
 * Time-of-day lighting for the plaza, driven by the visitor's own clock.
 *
 * This is a readable arc rather than real astronomy: the sun rises at 06:00,
 * peaks at noon and sets at 18:00, every day of the year. Everything else —
 * sky colour, light warmth, the moon, the lamps — is derived from the sun's
 * altitude, so the transitions stay consistent with each other.
 */

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk'

export type SkyState = {
  sunDirection: Vector3
  moonDirection: Vector3
  keyColor: Color
  keyIntensity: number
  ambientColor: Color
  ambientIntensity: number
  skyColor: Color
  /** 0 while the sun is up, 1 once it is properly dark. */
  lampGlow: number
  moonOpacity: number
  starOpacity: number
  phase: SkyPhase
}

type Keyframe = {
  altitude: number
  sky: number
  key: number
  keyIntensity: number
  ambient: number
  ambientIntensity: number
}

/** Sampled by sun altitude, from the middle of the night up to noon. */
const KEYFRAMES: Keyframe[] = [
  {
    altitude: -1,
    sky: 0x121a33,
    key: 0x9fb4e6,
    keyIntensity: 0.32,
    ambient: 0x3d4a70,
    ambientIntensity: 0.5,
  },
  {
    altitude: -0.2,
    sky: 0x1d2745,
    key: 0xa8bbe8,
    keyIntensity: 0.38,
    ambient: 0x46557d,
    ambientIntensity: 0.58,
  },
  {
    altitude: -0.05,
    sky: 0x5b5f86,
    key: 0xd8a7a0,
    keyIntensity: 0.7,
    ambient: 0x7d7f9e,
    ambientIntensity: 0.85,
  },
  {
    altitude: 0.06,
    sky: 0xd79a86,
    key: 0xffb887,
    keyIntensity: 1.25,
    ambient: 0xc6a6a2,
    ambientIntensity: 1.1,
  },
  {
    altitude: 0.22,
    sky: 0xc7cbd6,
    key: 0xffd7ab,
    keyIntensity: 1.7,
    ambient: 0xdcd7d2,
    ambientIntensity: 1.35,
  },
  {
    altitude: 0.45,
    sky: 0xb7d4e2,
    key: 0xfff4e0,
    keyIntensity: 2.1,
    ambient: 0xffffff,
    ambientIntensity: 1.55,
  },
  {
    altitude: 1,
    sky: 0xb7d4e2,
    key: 0xfffaf0,
    keyIntensity: 2.2,
    ambient: 0xffffff,
    ambientIntensity: 1.6,
  },
]

const SUN_DISTANCE = 60
/** The sun's arc leans slightly north, matching the way the plaza camera faces. */
const ARC_TILT = -0.3

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function sampleKeyframes(altitude: number, state: SkyState): void {
  let upper = KEYFRAMES.length - 1
  for (let index = 1; index < KEYFRAMES.length; index += 1) {
    if (KEYFRAMES[index].altitude >= altitude) {
      upper = index
      break
    }
  }
  const lower = Math.max(0, upper - 1)
  const from = KEYFRAMES[lower]
  const to = KEYFRAMES[upper]
  const span = to.altitude - from.altitude
  const t = span === 0 ? 0 : Math.min(1, Math.max(0, (altitude - from.altitude) / span))

  state.skyColor.setHex(from.sky).lerp(TEMP_COLOR.setHex(to.sky), t)
  state.keyColor.setHex(from.key).lerp(TEMP_COLOR.setHex(to.key), t)
  state.ambientColor.setHex(from.ambient).lerp(TEMP_COLOR.setHex(to.ambient), t)
  state.keyIntensity = from.keyIntensity + (to.keyIntensity - from.keyIntensity) * t
  state.ambientIntensity =
    from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * t
}

const TEMP_COLOR = new Color()

export function createSkyState(): SkyState {
  return {
    sunDirection: new Vector3(0, 1, 0),
    moonDirection: new Vector3(0, -1, 0),
    keyColor: new Color(0xfff4e0),
    keyIntensity: 2.1,
    ambientColor: new Color(0xffffff),
    ambientIntensity: 1.55,
    skyColor: new Color(0xb7d4e2),
    lampGlow: 0,
    moonOpacity: 0,
    starOpacity: 0,
    phase: 'day',
  }
}

/** Hours since midnight, as a fraction, in the visitor's own timezone. */
export function hoursOfDay(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}

/** Recomputes `state` in place, so the frame loop allocates nothing. */
export function updateSkyState(state: SkyState, date: Date): SkyState {
  const angle = ((hoursOfDay(date) - 6) / 24) * Math.PI * 2
  const altitude = Math.sin(angle)

  state.sunDirection.set(Math.cos(angle), altitude, ARC_TILT).normalize()
  state.moonDirection.copy(state.sunDirection).multiplyScalar(-1)

  // The sine climbs away from the horizon fast, which would flick the plaza from
  // dawn to full daylight inside an hour. Easing it keeps the warm twilight band
  // open for a while either side of sunrise and sunset. Only the colours are
  // eased — the sun's actual direction stays on its true arc.
  const easedAltitude = Math.sign(altitude) * Math.abs(altitude) ** 1.7
  sampleKeyframes(easedAltitude, state)

  // Lamps and stars come up as the sun goes down, and the moon fades in with them.
  state.lampGlow = 1 - smoothstep(-0.04, 0.22, altitude)
  state.moonOpacity = 1 - smoothstep(-0.02, 0.3, altitude)
  state.starOpacity = 1 - smoothstep(-0.2, 0.04, altitude)

  // Judged on the eased altitude too, so the phase always agrees with the colours.
  if (easedAltitude > 0.16) {
    state.phase = 'day'
  } else if (easedAltitude > -0.1) {
    // Before noon the sun is climbing; after it, the light is going.
    state.phase = Math.cos(angle) > 0 ? 'dawn' : 'dusk'
  } else {
    state.phase = 'night'
  }

  return state
}

export function sunPositionFor(state: SkyState, target: Vector3): Vector3 {
  return target.copy(state.sunDirection).multiplyScalar(SUN_DISTANCE)
}
