"""Build a lightweight, pastel 3D prototype of Sanji no Hiroba.

Run with:
    blender --background --python scripts/blender/create_plaza_prototype.py

Outputs are written to src/assets/3d/.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "3d"
BLEND_PATH = OUTPUT_DIR / "plaza-prototype.blend"
GLB_PATH = OUTPUT_DIR / "plaza-prototype.glb"
RENDER_PATH = OUTPUT_DIR / "plaza-prototype.png"

random.seed(31)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.82,
    metallic: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return material


def apply_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if not obj.data or not hasattr(obj.data, "materials"):
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def add_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    vertices: int = 32,
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def add_ico_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    subdivisions: int = 2,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1.0,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    smooth(obj)
    return obj


def add_path(material: bpy.types.Material) -> None:
    curve_data = bpy.data.curves.new("PlazaPathCurve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 3
    curve_data.bevel_depth = 0.58
    curve_data.bevel_resolution = 3
    curve_data.resolution_u = 12
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(4)
    points = [
        (0.0, -8.4, 4.5),
        (-0.8, -4.8, 4.5),
        (0.5, -1.6, 4.5),
        (-0.2, 2.2, 4.5),
        (0.0, 5.0, 4.5),
    ]
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"

    path = bpy.data.objects.new("GentlePath", curve_data)
    bpy.context.collection.objects.link(path)
    path.scale.z = 0.1
    apply_material(path, material)


def add_tree(
    index: int,
    location: tuple[float, float, float],
    scale: float,
    trunk_material: bpy.types.Material,
    leaf_materials: list[bpy.types.Material],
) -> None:
    x, y, z = location
    add_cylinder(
        f"Tree_{index:02d}_Trunk",
        (x, y, z + 1.25 * scale),
        0.24 * scale,
        2.5 * scale,
        trunk_material,
        vertices=12,
    )

    crown_offsets = [
        (-0.35, 0.02, 2.55),
        (0.28, -0.12, 2.65),
        (0.0, 0.25, 2.92),
        (0.0, -0.15, 2.42),
    ]
    for crown_index, (ox, oy, oz) in enumerate(crown_offsets):
        add_ico_sphere(
            f"Tree_{index:02d}_Crown_{crown_index}",
            (x + ox * scale, y + oy * scale, z + oz * scale),
            (0.72 * scale, 0.68 * scale, 0.6 * scale),
            leaf_materials[(index + crown_index) % len(leaf_materials)],
            subdivisions=2,
        )


def add_flower(
    name: str,
    location: tuple[float, float, float],
    petal_material: bpy.types.Material,
    center_material: bpy.types.Material,
) -> None:
    x, y, z = location
    for index in range(5):
        angle = index * math.tau / 5
        add_ico_sphere(
            f"{name}_Petal_{index}",
            (x + math.cos(angle) * 0.12, y + math.sin(angle) * 0.12, z),
            (0.12, 0.12, 0.07),
            petal_material,
            subdivisions=1,
        )
    add_ico_sphere(
        f"{name}_Center",
        (x, y, z + 0.03),
        (0.09, 0.09, 0.08),
        center_material,
        subdivisions=1,
    )


def add_local_sphere(
    root: bpy.types.Object,
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    subdivisions: int = 2,
) -> bpy.types.Object:
    obj = add_ico_sphere(name, (0.0, 0.0, 0.0), scale, material, subdivisions)
    obj.parent = root
    obj.location = location
    return obj


def add_toy_bear(
    name: str,
    location: tuple[float, float, float],
    body_material: bpy.types.Material,
    cream_material: bpy.types.Material,
    dark_material: bpy.types.Material,
    accent_material: bpy.types.Material,
    *,
    user: bool = False,
    start_location: tuple[float, float, float] | None = None,
) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root.location = location

    add_local_sphere(root, f"{name}_Body", (0.0, 0.0, 0.78), (0.42, 0.34, 0.55), body_material)
    add_local_sphere(root, f"{name}_Belly", (0.0, -0.28, 0.77), (0.25, 0.08, 0.32), cream_material)
    add_local_sphere(root, f"{name}_Head", (0.0, -0.02, 1.42), (0.39, 0.36, 0.36), body_material)
    add_local_sphere(root, f"{name}_Ear_L", (-0.27, -0.01, 1.68), (0.16, 0.13, 0.16), body_material)
    add_local_sphere(root, f"{name}_Ear_R", (0.27, -0.01, 1.68), (0.16, 0.13, 0.16), body_material)
    add_local_sphere(root, f"{name}_Muzzle", (0.0, -0.34, 1.31), (0.22, 0.12, 0.16), cream_material)
    add_local_sphere(root, f"{name}_Eye_L", (-0.13, -0.34, 1.46), (0.045, 0.035, 0.055), dark_material, 1)
    add_local_sphere(root, f"{name}_Eye_R", (0.13, -0.34, 1.46), (0.045, 0.035, 0.055), dark_material, 1)
    add_local_sphere(root, f"{name}_Nose", (0.0, -0.46, 1.34), (0.065, 0.04, 0.05), dark_material, 1)
    add_local_sphere(root, f"{name}_Arm_L", (-0.4, -0.01, 0.84), (0.12, 0.13, 0.33), body_material)
    add_local_sphere(root, f"{name}_Arm_R", (0.4, -0.01, 0.84), (0.12, 0.13, 0.33), body_material)
    add_local_sphere(root, f"{name}_Foot_L", (-0.2, -0.08, 0.29), (0.17, 0.23, 0.16), body_material)
    add_local_sphere(root, f"{name}_Foot_R", (0.2, -0.08, 0.29), (0.17, 0.23, 0.16), body_material)

    if user:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.58,
            minor_radius=0.055,
            major_segments=32,
            minor_segments=8,
        )
        ring = bpy.context.object
        ring.name = f"{name}_UserRing"
        ring.parent = root
        ring.location = (0.0, 0.0, 0.16)
        apply_material(ring, accent_material)

        if start_location is not None:
            root.location = start_location
            root.keyframe_insert(data_path="location", frame=1)
            root.location = location
            root.keyframe_insert(data_path="location", frame=48)

    return root


def add_cluster(
    name: str,
    center: tuple[float, float],
    count: int,
    pad_material: bpy.types.Material,
    avatar_materials: list[bpy.types.Material],
    cream_material: bpy.types.Material,
    dark_material: bpy.types.Material,
    accent_material: bpy.types.Material,
    *,
    add_user: bool = False,
) -> None:
    cx, cy = center
    add_cylinder(
        f"{name}_FeelingArea",
        (cx, cy, 0.52),
        1.0,
        0.12,
        pad_material,
        vertices=48,
        scale=(1.8, 1.35, 1.0),
    )

    offsets = [
        (-0.72, 0.34),
        (0.02, 0.58),
        (0.72, 0.26),
        (-0.45, -0.42),
        (0.42, -0.48),
    ]
    for index in range(count):
        ox, oy = offsets[index % len(offsets)]
        add_toy_bear(
            f"{name}_Avatar_{index + 1:02d}",
            (cx + ox, cy + oy, 0.55),
            avatar_materials[index % len(avatar_materials)],
            cream_material,
            dark_material,
            accent_material,
        )

    if add_user:
        add_toy_bear(
            "You_Bear",
            (cx + 0.15, cy - 0.28, 0.57),
            avatar_materials[0],
            cream_material,
            dark_material,
            accent_material,
            user=True,
            start_location=(0.0, -6.3, 0.57),
        )


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()

    ground = make_material("Ground", (0.66, 0.82, 0.55, 1.0))
    ground_edge = make_material("GroundEdge", (0.46, 0.68, 0.38, 1.0))
    path = make_material("Path", (0.94, 0.84, 0.66, 1.0))
    plaza = make_material("Plaza", (0.86, 0.93, 0.75, 1.0))
    trunk = make_material("TreeTrunk", (0.46, 0.26, 0.15, 1.0))
    leaf_materials = [
        make_material("LeafMint", (0.48, 0.72, 0.48, 1.0)),
        make_material("LeafSage", (0.58, 0.76, 0.5, 1.0)),
        make_material("LeafLime", (0.68, 0.82, 0.52, 1.0)),
    ]
    board_wood = make_material("BoardWood", (0.66, 0.42, 0.26, 1.0))
    board_face = make_material("BoardFace", (0.95, 0.78, 0.54, 1.0))
    roof = make_material("BoardRoof", (0.72, 0.48, 0.68, 1.0))
    cream = make_material("AvatarCream", (0.98, 0.9, 0.74, 1.0))
    dark = make_material("AvatarDark", (0.16, 0.13, 0.18, 1.0))
    accent = make_material("UserAccent", (0.38, 0.26, 0.68, 1.0), roughness=0.55)
    avatar_materials = [
        make_material("AvatarHoney", (0.72, 0.44, 0.22, 1.0)),
        make_material("AvatarRose", (0.87, 0.55, 0.56, 1.0)),
        make_material("AvatarSky", (0.48, 0.69, 0.79, 1.0)),
        make_material("AvatarPanda", (0.28, 0.28, 0.31, 1.0)),
        make_material("AvatarLilac", (0.68, 0.58, 0.79, 1.0)),
    ]
    pad_tired = make_material("PadTired", (0.83, 0.76, 0.95, 1.0))
    pad_sleep = make_material("PadSleep", (0.72, 0.84, 0.96, 1.0))
    pad_outing = make_material("PadOuting", (0.98, 0.82, 0.65, 1.0))
    pad_feeding = make_material("PadFeeding", (0.84, 0.92, 0.7, 1.0))
    flower_pink = make_material("FlowerPink", (0.94, 0.56, 0.67, 1.0))
    flower_white = make_material("FlowerWhite", (0.98, 0.95, 0.9, 1.0))
    flower_center = make_material("FlowerCenter", (0.96, 0.72, 0.26, 1.0))

    add_cylinder("GroundBase", (0.0, 0.0, 0.0), 8.3, 0.7, ground_edge, vertices=64)
    add_cylinder("GroundTop", (0.0, 0.0, 0.38), 8.0, 0.18, ground, vertices=64)
    add_path(path)
    add_cylinder("CentralPlaza", (0.0, 0.0, 0.48), 3.8, 0.14, plaza, vertices=64)

    tree_angles = [8, 38, 72, 112, 150, 192, 228, 270, 308, 340]
    for index, degrees in enumerate(tree_angles):
        angle = math.radians(degrees)
        radius = 6.65 + random.uniform(-0.25, 0.2)
        add_tree(
            index,
            (math.cos(angle) * radius, math.sin(angle) * radius, 0.48),
            random.uniform(0.72, 1.02),
            trunk,
            leaf_materials,
        )

    add_cube("BoardPostLeft", (-1.05, 5.5, 1.55), (0.18, 0.18, 2.55), board_wood)
    add_cube("BoardPostRight", (1.05, 5.5, 1.55), (0.18, 0.18, 2.55), board_wood)
    add_cube("NoticeBoard", (0.0, 5.42, 2.25), (2.55, 0.28, 1.35), board_face)
    add_cube("NoticeBoardRoof", (0.0, 5.45, 3.02), (2.95, 0.56, 0.2), roof)
    add_ico_sphere("BoardPin", (0.0, 5.22, 2.4), (0.18, 0.1, 0.18), accent, subdivisions=1)

    add_cluster(
        "Tired",
        (-2.45, 1.65),
        5,
        pad_tired,
        avatar_materials,
        cream,
        dark,
        accent,
        add_user=True,
    )
    add_cluster(
        "Sleep",
        (2.45, 1.65),
        4,
        pad_sleep,
        avatar_materials[1:] + avatar_materials[:1],
        cream,
        dark,
        accent,
    )
    add_cluster(
        "Outing",
        (-2.35, -2.15),
        5,
        pad_outing,
        avatar_materials[2:] + avatar_materials[:2],
        cream,
        dark,
        accent,
    )
    add_cluster(
        "Feeding",
        (2.35, -2.15),
        4,
        pad_feeding,
        avatar_materials[3:] + avatar_materials[:3],
        cream,
        dark,
        accent,
    )

    flower_positions = [
        (-4.8, 3.4),
        (4.8, 3.0),
        (-4.5, -3.8),
        (4.3, -3.9),
        (-2.5, 5.4),
        (2.7, 5.2),
    ]
    for index, (x, y) in enumerate(flower_positions):
        add_flower(
            f"Flower_{index:02d}",
            (x, y, 0.62),
            flower_pink if index % 2 == 0 else flower_white,
            flower_center,
        )

    bpy.ops.object.light_add(type="AREA", location=(-4.5, -5.0, 11.0))
    key_light = bpy.context.object
    key_light.name = "SoftboxKey"
    key_light.data.energy = 1450
    key_light.data.shape = "DISK"
    key_light.data.size = 7.0
    point_camera(key_light, (0.0, 0.0, 0.0))

    bpy.ops.object.light_add(type="AREA", location=(6.0, 1.0, 7.0))
    fill_light = bpy.context.object
    fill_light.name = "SoftboxFill"
    fill_light.data.energy = 850
    fill_light.data.size = 6.0
    point_camera(fill_light, (0.0, 0.0, 1.0))

    bpy.ops.object.light_add(type="SUN", location=(0.0, 0.0, 10.0))
    sun = bpy.context.object
    sun.name = "WarmSun"
    sun.rotation_euler = (math.radians(25), math.radians(-20), math.radians(-25))
    sun.data.energy = 1.2
    sun.data.angle = math.radians(18)

    bpy.ops.object.camera_add(location=(11.8, -14.5, 13.5))
    camera = bpy.context.object
    camera.name = "IsometricCamera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 18.5
    camera.data.lens = 50
    point_camera(camera, (0.0, 0.2, 0.9))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 72
    scene.frame_set(48)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    world_background = scene.world.node_tree.nodes.get("Background")
    world_background.inputs["Color"].default_value = (0.72, 0.86, 0.92, 1.0)
    world_background.inputs["Strength"].default_value = 0.7
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = 0.3
    scene.render.image_settings.color_mode = "RGBA"
    bpy.context.preferences.filepaths.save_version = 0

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
    )

    print(f"Created {BLEND_PATH}")
    print(f"Created {GLB_PATH}")
    print(f"Created {RENDER_PATH}")
    print(f"Objects: {len(bpy.context.scene.objects)}")


if __name__ == "__main__":
    build_scene()
