import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Fog,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Vector3,
  type AmbientLight,
  type DirectionalLight,
  type Object3D,
} from 'three'
import { createSkyState, sunPositionFor, updateSkyState } from './plazaSky'

type PlazaDaylightProps = {
  /** The loaded plaza, whose materials pick up the glow after dark. */
  sceneRoot: Object3D
}

/** Matches the distance `plazaSky` places the sun at. */
const SUN_DISTANCE = 60
/** A soft fill from the side, so the town never goes completely flat. */
const FILL_LIGHT_POSITION: [number, number, number] = [7, 8, 4]

/** How far out the moon and the stars sit; both stay inside the camera's far plane. */
const MOON_DISTANCE = 430
const STAR_DISTANCE = 620
const STAR_COUNT = 240

/** Materials that light up at night, and how brightly. */
const GLOWING_MATERIALS: Array<[string, number]> = [
  ['LampGlow', 1.9],
  ['Window', 0.85],
  ['CityGlass', 1.15],
]

/** The clock only needs re-reading occasionally; the light moves slowly. */
const CLOCK_INTERVAL_SECONDS = 10

export function PlazaDaylight({ sceneRoot }: PlazaDaylightProps) {
  const { scene } = useThree()
  const keyLightRef = useRef<DirectionalLight>(null)
  const ambientLightRef = useRef<AmbientLight>(null)
  const moonRef = useRef<Mesh>(null)
  const starsRef = useRef<Points>(null)

  const sky = useMemo(() => createSkyState(), [])
  const scratch = useMemo(() => ({ position: new Vector3() }), [])
  const clock = useRef(CLOCK_INTERVAL_SECONDS)

  // `?hour=22` pins the sky to a given hour, so the night can be checked without waiting.
  const previewHour = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('hour')
    const parsed = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(parsed) ? ((parsed % 24) + 24) % 24 : null
  }, [])

  const starField = useMemo(() => {
    // Seeded rather than random, so the same sky comes back on every reload.
    let seed = 987654321
    const nextRandom = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }

    const positions = new Float32Array(STAR_COUNT * 3)
    for (let index = 0; index < STAR_COUNT; index += 1) {
      // Upper hemisphere only, so no stars end up under the ground.
      const theta = nextRandom() * Math.PI * 2
      const height = 0.08 + nextRandom() * 0.92
      const ring = Math.sqrt(1 - height * height)
      positions[index * 3] = Math.cos(theta) * ring * STAR_DISTANCE
      positions[index * 3 + 1] = height * STAR_DISTANCE
      positions[index * 3 + 2] = Math.sin(theta) * ring * STAR_DISTANCE
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    return geometry
  }, [])

  useEffect(() => () => starField.dispose(), [starField])

  const glowingMaterials = useMemo(() => {
    const byName = new Map<string, MeshStandardMaterial>()
    sceneRoot.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const candidate of materials) {
        if (candidate instanceof MeshStandardMaterial) byName.set(candidate.name, candidate)
      }
    })

    return GLOWING_MATERIALS.flatMap(([name, strength]) => {
      const material = byName.get(name)
      return material ? [{ material, strength }] : []
    })
  }, [sceneRoot])

  // The frame loop drives three.js objects imperatively — lights, materials and the
  // scene background are all mutated in place.
  useFrame((_, delta) => {
    clock.current += delta
    if (clock.current < CLOCK_INTERVAL_SECONDS) return
    clock.current = 0

    const now = new Date()
    if (previewHour !== null) {
      now.setHours(Math.floor(previewHour), Math.round((previewHour % 1) * 60), 0, 0)
    }
    updateSkyState(sky, now)

    if (scene.background instanceof Color) scene.background.copy(sky.skyColor)
    if (scene.fog instanceof Fog) scene.fog.color.copy(sky.skyColor)

    const keyLight = keyLightRef.current
    if (keyLight) {
      // Once the sun is down the moon takes over as the key, from the opposite side.
      keyLight.position.copy(
        sky.phase === 'night'
          ? scratch.position.copy(sky.moonDirection).multiplyScalar(SUN_DISTANCE)
          : sunPositionFor(sky, scratch.position),
      )
      keyLight.color.copy(sky.keyColor)
      keyLight.intensity = sky.keyIntensity
    }

    const ambientLight = ambientLightRef.current
    if (ambientLight) {
      ambientLight.color.copy(sky.ambientColor)
      ambientLight.intensity = sky.ambientIntensity
    }

    const moon = moonRef.current
    if (moon) {
      moon.position.copy(sky.moonDirection).multiplyScalar(MOON_DISTANCE)
      moon.visible = sky.moonOpacity > 0.01
      const material = moon.material as MeshStandardMaterial
      material.opacity = sky.moonOpacity
    }

    const stars = starsRef.current
    if (stars) {
      stars.visible = sky.starOpacity > 0.01
      ;(stars.material as PointsMaterial).opacity = sky.starOpacity
    }

    for (const { material, strength } of glowingMaterials) {
      material.emissive.copy(material.color)
      material.emissiveIntensity = sky.lampGlow * strength
    }
  })

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={sky.ambientIntensity} />
      <directionalLight ref={keyLightRef} intensity={sky.keyIntensity} />
      <directionalLight position={FILL_LIGHT_POSITION} intensity={0.4} />

      <mesh ref={moonRef} visible={false}>
        <sphereGeometry args={[16, 20, 20]} />
        <meshStandardMaterial
          color="#f4f1e2"
          emissive="#f4f1e2"
          emissiveIntensity={1.4}
          transparent
          fog={false}
        />
      </mesh>

      <points ref={starsRef} geometry={starField} visible={false}>
        <pointsMaterial
          size={2.6}
          color="#eef2ff"
          transparent
          sizeAttenuation={false}
          blending={AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </points>
    </>
  )
}
