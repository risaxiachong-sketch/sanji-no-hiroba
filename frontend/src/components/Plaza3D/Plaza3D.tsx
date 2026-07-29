import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import plazaPoster from '../../assets/3d/plaza-immersive.png'
import type { ClusterId, PlazaViewMode } from '../../types/plaza'
import { PlazaCameraControls } from './PlazaCameraControls'
import { Plaza3DModel } from './Plaza3DModel'
import type { CrowdGathering } from './plazaCrowd'
import type { BubblePosition, SpeechAssignment } from './PlazaSpeechBubbles3D'
import styles from './Plaza3D.module.css'

type Plaza3DProps = {
  assignedCluster: ClusterId
  viewMode: PlazaViewMode
  totalVisitors: number
  speechAssignments: SpeechAssignment[]
  onGatheringsChange?: (gatherings: CrowdGathering[]) => void
  onBubblePositionsChange?: (positions: BubblePosition[]) => void
}

const CAMERA_POSITION: [number, number, number] = [0, 6.3, 15.5]
const PIXEL_RATIO: [number, number] = [1, 1.5]
// The far plane has to clear the mountain range that closes the horizon.
const CAMERA_SETTINGS = { position: CAMERA_POSITION, fov: 50, near: 0.1, far: 900 }
const WEB_GL_SETTINGS = { antialias: true, powerPreference: 'high-performance' as const }
const BACKGROUND_COLOR: [string] = ['#b7d4e2']
/** Starts past the town wall, so the plaza itself stays crisp. */
const FOG_SETTINGS: [string, number, number] = ['#b7d4e2', 90, 620]

export function Plaza3D({
  assignedCluster,
  viewMode,
  totalVisitors,
  speechAssignments,
  onGatheringsChange,
  onBubblePositionsChange,
}: Plaza3DProps) {
  return (
    <div
      className={styles.frame}
      role="img"
      aria-label="似た気持ちの人たちが広場を歩き回り、話したいことが近い人どうしで自然に集まっている3Dの広場"
    >
      <Canvas
        frameloop="always"
        dpr={PIXEL_RATIO}
        camera={CAMERA_SETTINGS}
        gl={WEB_GL_SETTINGS}
        fallback={<img className={styles.fallback} src={plazaPoster} alt="" />}
        onCreated={({ camera }) => camera.lookAt(0, 1.25, -0.15)}
        aria-hidden="true"
      >
        <color attach="background" args={BACKGROUND_COLOR} />
        {/* Haze over the countryside, so the city and the mountains read as distance. */}
        <fog attach="fog" args={FOG_SETTINGS} />
        {/* Lighting lives in PlazaDaylight, which tracks the visitor's own clock. */}
        <PlazaCameraControls viewMode={viewMode} />
        <Suspense fallback={null}>
          <Plaza3DModel
            assignedCluster={assignedCluster}
            totalVisitors={totalVisitors}
            speechAssignments={speechAssignments}
            onGatheringsChange={onGatheringsChange}
            onBubblePositionsChange={onBubblePositionsChange}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
