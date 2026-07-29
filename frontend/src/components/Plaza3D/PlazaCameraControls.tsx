import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { PlazaViewMode } from '../../types/plaza'

type PlazaCameraControlsProps = {
  viewMode: PlazaViewMode
}

const VIEW_CONFIG: Record<PlazaViewMode, { position: Vector3; target: Vector3 }> = {
  immersive: {
    position: new Vector3(0, 6.3, 15.5),
    target: new Vector3(0, 1.25, -0.15),
  },
  overview: {
    position: new Vector3(26, 38, 42),
    target: new Vector3(0, 0.6, -0.5),
  },
}

export function PlazaCameraControls({ viewMode }: PlazaCameraControlsProps) {
  const { camera, gl, invalidate } = useThree()
  const cameraRef = useRef(camera)
  const controlsRef = useRef<OrbitControls | null>(null)
  const isTransitioning = useRef(true)

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = false
    controls.enablePan = false
    controls.enableRotate = true
    controls.enableZoom = true
    controls.minDistance = 7
    controls.maxDistance = 90
    controls.minPolarAngle = Math.PI * 0.16
    controls.maxPolarAngle = Math.PI * 0.47
    controls.target.copy(VIEW_CONFIG.immersive.target)
    controls.update()

    const requestFrame = () => invalidate()
    controls.addEventListener('change', requestFrame)
    controlsRef.current = controls

    return () => {
      controls.removeEventListener('change', requestFrame)
      controls.dispose()
      controlsRef.current = null
    }
  }, [camera, gl.domElement, invalidate])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    controls.enabled = false
    isTransitioning.current = true
    invalidate()
  }, [invalidate, viewMode])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls || !isTransitioning.current) return

    const config = VIEW_CONFIG[viewMode]
    const smoothing = 1 - Math.exp(-delta * 3.4)
    cameraRef.current.position.lerp(config.position, smoothing)
    controls.target.lerp(config.target, smoothing)
    controls.update()

    const cameraDistance = cameraRef.current.position.distanceToSquared(config.position)
    const targetDistance = controls.target.distanceToSquared(config.target)
    if (cameraDistance + targetDistance < 0.0008) {
      cameraRef.current.position.copy(config.position)
      controls.target.copy(config.target)
      controls.update()
      controls.enabled = true
      isTransitioning.current = false
      return
    }

    invalidate()
  })

  return null
}
