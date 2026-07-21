# 3D prototype assets

This directory contains the first Blender capability test for the plaza.

- `plaza-prototype.blend`: editable Blender source
- `plaza-prototype.glb`: web-ready glTF binary with the user avatar animation
- `plaza-prototype.png`: 900 × 900 preview render

The scene contains 18 dummy visitors in four topic clusters plus one movable
user bear. The frontend positions that bear beside the cluster selected from
the prototype post text.

The immersive revision is the version used by the frontend:

- `plaza-immersive.blend`: editable Blender source generated through BlenderMCP
- `plaza-immersive.glb`: perspective plaza, eleven buildings, village dressing
  (lamp posts, picket fencing, fruit trees, a pond, a mailbox, flower patches,
  mushrooms and flowered entrance arches), the surrounding world, a movable user
  avatar and six hidden `VisitorTemplate_*` meshes
- `plaza-immersive.png`: 900 × 1125 street-level preview render

The town is not built all at once. `with growth(<level>)` blocks in the build
script tag everything they create, and the export merges static geometry per
(growth level, material) into `Growth<level>_<Material>` batches. `PlazaGrowth.tsx`
shows the batches at or below the town's current level, so the plaza builds itself
as posts come in; `src/types/townLevel.ts` holds the matching level table and the
two must be kept in step. Untagged geometry — the ground, the river, the mountains
— stays visible from level 1.

Levels run 1–200. Levels 1–100 grow the village into a town (built by the code
around `build_scene`); `build_town_expansion()` covers 101–200, where the town
becomes a city — rings of townhouses and mid-rise blocks spread from the plaza
toward the entrance and flanks while the northern vista deepens and the distant
city is enlarged. Town-expansion buildings skip the bevel modifier (`flat_box`);
with bevels they made the build run out of memory. Even so the full build now
takes ~10 minutes and produces ~340 static batches — the cost of revealing the
world one step at a time. Append `?level=150` to the app URL to preview any stage.

Lighting is not baked either. `src/components/plazaSky.ts` derives the sun's
position, the sky and fog colour, the moon and the lamp glow from the visitor's
own clock, and `PlazaDaylight.tsx` applies it. Three materials are named so they
can be lit from the frontend after dark: `LampGlow` (the street lamp heads),
`Window` (the town buildings) and `CityGlass` (the distant towers). Keep those
names if you rework the materials. Append `?hour=22` to the app URL to pin the
sky to a given hour without waiting for it.

Visitors are no longer baked into the scene. The plaza ships only the six visitor
templates; `src/components/plazaCrowd.ts` simulates the crowd and
`PlazaCrowd3D.tsx` clones each template into an `InstancedMesh`. Every visitor
carries a topic and drifts back toward whoever shares it, so gatherings form,
thin out and re-form elsewhere instead of standing on fixed pads. The templates
are `hide_render = True` so they stay out of the preview render, and the web
build hides them once the geometry has been copied.

`build_surrounding_world()` lays the world out in depth away from that camera,
which looks north: paddies and farmhouses, then the river and its bridge at
y=48, the city skyline around y=260-310, and the mountains from y=390 out to
y=530. Distant materials are mixed toward the sky colour, and the frontend adds
linear fog from 90 to 620 units, so the layers separate by haze. The camera's
far plane (`Plaza3D.tsx`) has to stay beyond the furthest peak.

Its starting camera is a close, human-scale view toward the fountain and the
community buildings. Static geometry is joined into 24 material batches before
export, reducing the scene to 70 objects while preserving the user avatar and
the visitor templates as independently movable meshes.

Regenerate the prototype files from the project root:

```sh
blender --background --python scripts/blender/create_plaza_prototype.py
```

Regenerate the immersive files the same way:

```sh
blender --background --python scripts/blender/create_plaza_immersive.py
```

The immersive source can also be executed through `execute_blender_code` using
`scripts/blender/mcp_call.py` and `scripts/blender/create_plaza_immersive.py`.

The prototype is built only from Blender primitives and procedural materials.
It does not download or depend on Poly Haven, Sketchfab, Hyper3D, or Hunyuan assets.

The BlenderMCP server is pinned locally to `blender-mcp` 1.6.4. The installed
Blender add-on source had SHA-256
`bba60831f5f89a74deda0294b131668a086cf46eb35a6a01abbd0d21d9e92630`
when this prototype was created.
