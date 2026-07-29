import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { PlazaCrowd } from './plazaCrowd'

type PlazaCrowd3DProps = {
  crowd: PlazaCrowd
  /** The exported plaza scene, which carries the hidden VisitorTemplate_* meshes. */
  sceneRoot: Object3D
}

/** Matches the height the baked avatars stood at, so visitors sit on the pavers. */
const GROUND_Y = 0.34

/**
 * glTF splits a multi-material mesh into one primitive per material, so a single
 * template arrives as several meshes sharing a leading index (VisitorTemplate_2,
 * VisitorTemplate_2_1, ...). They all belong to the same visitor and must move together.
 */
const TEMPLATE_NAME = /^VisitorTemplate_(\d+)/

type CrowdVariant = {
  meshes: InstancedMesh[]
  visitorIndices: number[]
}

export function PlazaCrowd3D({ crowd, sceneRoot }: PlazaCrowd3DProps) {
  const variants = useMemo<CrowdVariant[]>(() => {
    const partsByVariant = new Map<number, Mesh[]>()
    sceneRoot.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const match = TEMPLATE_NAME.exec(mesh.name)
      if (!match) return
      const variant = Number(match[1])
      const parts = partsByVariant.get(variant)
      if (parts) parts.push(mesh)
      else partsByVariant.set(variant, [mesh])
    })
    if (partsByVariant.size === 0) return []

    const variantIds = [...partsByVariant.keys()].sort((a, b) => a - b)

    // Every visitor of a given variant shares one InstancedMesh per body part, so
    // the whole crowd costs a few dozen draw calls instead of one per person.
    const membersByVariant = new Map<number, number[]>()
    crowd.visitors.forEach((visitor, index) => {
      const variant = variantIds[visitor.variant % variantIds.length]
      const members = membersByVariant.get(variant)
      if (members) members.push(index)
      else membersByVariant.set(variant, [index])
    })

    const built: CrowdVariant[] = []
    membersByVariant.forEach((visitorIndices, variant) => {
      const parts = partsByVariant.get(variant) ?? []
      const meshes = parts.map((part, partIndex) => {
        // Bake the part's own transform (including the glTF Z-up to Y-up
        // conversion) into the geometry, since instances supply their own matrix.
        part.updateWorldMatrix(true, false)
        const geometry = part.geometry.clone()
        geometry.applyMatrix4(part.matrixWorld)

        const instanced = new InstancedMesh(geometry, part.material, visitorIndices.length)
        instanced.name = `VisitorCrowd_${variant}_${partIndex}`
        instanced.frustumCulled = false
        return instanced
      })

      // The templates themselves are only a geometry source; keep them out of the view.
      parts.forEach((part) => {
        part.visible = false
      })

      built.push({ meshes, visitorIndices })
    })

    return built
  }, [crowd, sceneRoot])

  useEffect(() => {
    return () => {
      variants.forEach(({ meshes }) => {
        meshes.forEach((mesh) => {
          mesh.geometry.dispose()
          mesh.dispose()
        })
      })
    }
  }, [variants])

  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      position: new Vector3(),
      quaternion: new Quaternion(),
      scale: new Vector3(1, 1, 1),
      axis: new Vector3(0, 1, 0),
    }),
    [],
  )

  useFrame((_, delta) => {
    crowd.step(delta)

    for (const { meshes, visitorIndices } of variants) {
      visitorIndices.forEach((visitorIndex, instanceIndex) => {
        const visitor = crowd.visitors[visitorIndex]
        const moving = Math.hypot(visitor.velocityX, visitor.velocityZ)
        const bob = moving > 0.08 ? Math.abs(Math.sin(visitor.bobPhase)) * 0.045 : 0

        scratch.position.set(visitor.x, GROUND_Y + bob, visitor.z)
        scratch.quaternion.setFromAxisAngle(scratch.axis, visitor.facing)
        scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale)
        for (const mesh of meshes) mesh.setMatrixAt(instanceIndex, scratch.matrix)
      })
      // three.js uploads instance buffers by flipping this flag; there is no immutable form.
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {variants.flatMap(({ meshes }) =>
        meshes.map((mesh) => <primitive key={mesh.name} object={mesh} />),
      )}
    </>
  )
}
