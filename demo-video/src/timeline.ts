export const VIDEO_FPS = 30
export const VIDEO_DURATION_SECONDS = 90
export const VIDEO_DURATION_FRAMES = VIDEO_FPS * VIDEO_DURATION_SECONDS

/**
 * The app footage is a single continuous take. There is no scene list any more:
 * scripts/scenario.ts owns the recorded length and scripts/capture.ts owns the
 * order of operations inside it.
 */
export const TAKE_SECONDS = 85

/** The ending card fades in over the tail of the take. */
export const ENDING_START_SECONDS = 84
export const ENDING_DURATION_SECONDS = VIDEO_DURATION_SECONDS - ENDING_START_SECONDS

export const secondsToFrames = (seconds: number): number => Math.round(seconds * VIDEO_FPS)

if (TAKE_SECONDS > VIDEO_DURATION_SECONDS) {
  throw new Error('The take cannot be longer than the video.')
}

if (ENDING_START_SECONDS >= TAKE_SECONDS) {
  throw new Error('The ending card must overlap the end of the take.')
}

if (secondsToFrames(ENDING_START_SECONDS + ENDING_DURATION_SECONDS) !== VIDEO_DURATION_FRAMES) {
  throw new Error(`Timeline must end at ${VIDEO_DURATION_FRAMES} frames.`)
}
