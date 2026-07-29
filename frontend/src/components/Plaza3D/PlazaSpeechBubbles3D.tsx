import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { PlazaCrowd } from './plazaCrowd'

export type SpeechAssignment = {
  visitorIndex: number
  postId: string
  text: string
}

export type BubblePosition = {
  postId: string
  text: string
  xPct: number
  yPct: number
  visible: boolean
}

type PlazaSpeechBubbles3DProps = {
  crowd: PlazaCrowd
  assignments: SpeechAssignment[]
  onPositionsChange: (positions: BubblePosition[]) => void
}

/** Head height above a chibi's feet, so the bubble sits above the visitor, not inside them. */
const BUBBLE_HEIGHT = 2.0
/** How often the screen-space projection is recomputed; matches onGatheringsChange's cadence. */
const UPDATE_INTERVAL_SECONDS = 0.15

/**
 * Projects a handful of crowd members' positions into screen space every few
 * frames, so `Plaza.tsx` can render real post text as HTML speech bubbles that
 * track walking visitors. Must live inside <Canvas> for camera access.
 */
export function PlazaSpeechBubbles3D({
  crowd,
  assignments,
  onPositionsChange,
}: PlazaSpeechBubbles3DProps) {
  const { camera } = useThree()
  const throttle = useRef(0)
  const scratch = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (assignments.length === 0) return
    throttle.current -= delta
    if (throttle.current > 0) return
    throttle.current = UPDATE_INTERVAL_SECONDS

    onPositionsChange(
      assignments.map(({ visitorIndex, postId, text }) => {
        const visitor = crowd.visitors[visitorIndex]
        if (!visitor) return { postId, text, xPct: 0, yPct: 0, visible: false }

        scratch.set(visitor.x, BUBBLE_HEIGHT, visitor.z).project(camera)
        return {
          postId,
          text,
          xPct: (scratch.x * 0.5 + 0.5) * 100,
          yPct: (1 - (scratch.y * 0.5 + 0.5)) * 100,
          visible: scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05,
        }
      }),
    )
  })

  return null
}
