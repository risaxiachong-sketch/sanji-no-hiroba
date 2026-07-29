import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { MathUtils, Vector3, type Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import plazaModelUrl from '../../assets/3d/plaza-immersive.glb?url'
import type { ClusterId } from '../../types/plaza'
import { PlazaCrowd, type CrowdGathering } from './plazaCrowd'
import { PlazaCrowd3D } from './PlazaCrowd3D'
import { PlazaDaylight } from './PlazaDaylight'
import { PlazaSpeechBubbles3D, type BubblePosition, type SpeechAssignment } from './PlazaSpeechBubbles3D'

type Plaza3DModelProps = {
  assignedCluster: ClusterId
  /** How many visitors make up the crowd (mirrors the plaza's presence count). */
  totalVisitors: number
  /** Real posts pinned to specific crowd members, for the speech-bubble overlay. */
  speechAssignments: SpeechAssignment[]
  onGatheringsChange?: (gatherings: CrowdGathering[]) => void
  onBubblePositionsChange?: (positions: BubblePosition[]) => void
}

const START_POSITION = new Vector3(0, 0.34, 14.1)
/** How close the user stands to the middle of the group they joined. */
const JOIN_OFFSET = 1.5

export function Plaza3DModel({
  assignedCluster,
  totalVisitors,
  speechAssignments,
  onGatheringsChange,
  onBubblePositionsChange,
}: Plaza3DModelProps) {
  const { scene } = useLoader(GLTFLoader, plazaModelUrl)
  const sceneInstance = useMemo(() => scene.clone(true), [scene])
  const crowd = useMemo(() => new PlazaCrowd(totalVisitors), [totalVisitors])
  const userAvatarRef = useRef<Object3D | null>(null)
  const target = useRef(START_POSITION.clone())
  const reportTimer = useRef(0)

  useEffect(() => {
    const userAvatar = sceneInstance.getObjectByName('You_Avatar') ?? null
    userAvatarRef.current = userAvatar
    if (!userAvatar) return

    userAvatar.position.copy(START_POSITION)

    return () => {
      userAvatarRef.current = null
    }
  }, [assignedCluster, sceneInstance])

  useFrame((_, delta) => {
    const userAvatar = userAvatarRef.current
    if (!userAvatar) return

    // The gathering the user belongs to keeps moving, so re-read it every frame
    // instead of walking to a position that was fixed when they posted.
    const gathering = crowd.gatheringPoint(assignedCluster)
    if (gathering) {
      const towardX = userAvatar.position.x - gathering.x
      const towardZ = userAvatar.position.z - gathering.z
      const distance = Math.hypot(towardX, towardZ) || 1
      target.current.set(
        gathering.x + (towardX / distance) * JOIN_OFFSET,
        START_POSITION.y,
        gathering.z + (towardZ / distance) * JOIN_OFFSET,
      )
    } else {
      target.current.copy(START_POSITION)
    }

    const smoothing = 1 - Math.exp(-delta * 1.8)
    userAvatar.position.x = MathUtils.lerp(userAvatar.position.x, target.current.x, smoothing)
    userAvatar.position.y = MathUtils.lerp(userAvatar.position.y, target.current.y, smoothing)
    userAvatar.position.z = MathUtils.lerp(userAvatar.position.z, target.current.z, smoothing)

    if (onGatheringsChange) {
      reportTimer.current -= delta
      if (reportTimer.current <= 0) {
        reportTimer.current = 1
        onGatheringsChange(crowd.gatherings())
      }
    }
  })

  return (
    <>
      <primitive object={sceneInstance} />
      <PlazaCrowd3D crowd={crowd} sceneRoot={sceneInstance} />
      <PlazaDaylight sceneRoot={sceneInstance} />
      {onBubblePositionsChange && (
        <PlazaSpeechBubbles3D
          crowd={crowd}
          assignments={speechAssignments}
          onPositionsChange={onBubblePositionsChange}
        />
      )}
    </>
  )
}

useLoader.preload(GLTFLoader, plazaModelUrl)
