import { useEffect, useMemo } from 'react'
import { Mesh, type Object3D } from 'three'

type PlazaGrowthProps = {
  sceneRoot: Object3D
  /** The town's current level, 1 to 100. */
  level: number
}

/**
 * Blender tags each static batch with the town level that reveals it, as
 * `Growth<level>_<Material>`. Anything without the prefix is the permanent
 * world — the ground, the river, the mountains — and stays visible from level 1.
 */
const GROWTH_NAME = /^Growth(\d+)_/

export function PlazaGrowth({ sceneRoot, level }: PlazaGrowthProps) {
  const batches = useMemo(() => {
    const found: Array<{ mesh: Mesh; level: number }> = []
    sceneRoot.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const match = GROWTH_NAME.exec(mesh.name)
      if (match) found.push({ mesh, level: Number(match[1]) })
    })
    return found
  }, [sceneRoot])

  useEffect(() => {
    for (const batch of batches) {
      // three.js visibility is a flag on the object; there is no immutable form.
      // eslint-disable-next-line react-hooks/immutability
      batch.mesh.visible = batch.level <= level
    }
  }, [batches, level])

  return null
}
