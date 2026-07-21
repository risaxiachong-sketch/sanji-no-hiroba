"""Build the immersive, street-level plaza prototype and export it for the web."""

from __future__ import annotations

import contextlib
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "3d"
BLEND_PATH = OUTPUT_DIR / "plaza-immersive.blend"
GLB_PATH = OUTPUT_DIR / "plaza-immersive.glb"
RENDER_PATH = OUTPUT_DIR / "plaza-immersive.png"

random.seed(31)


def reset_scene() -> None:
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


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.82):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    return mat


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    if hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return obj


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def rounded_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float = 0.12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Soft edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return assign(obj, mat)


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    segments: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=max(8, segments // 2),
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat)
    smooth(obj)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    vertices: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def cone(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    vertices: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        depth=depth,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=24,
        minor_segments=8,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    assign(obj, mat)
    smooth(obj)
    return obj


def parent_local(obj: bpy.types.Object, root: bpy.types.Object) -> None:
    obj.parent = root


def add_gable_roof(
    name: str,
    center: tuple[float, float, float],
    width: float,
    depth: float,
    height: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    x, y, z = center
    hw = width / 2
    hd = depth / 2
    vertices = [
        (x - hw, y - hd, z),
        (x + hw, y - hd, z),
        (x, y - hd, z + height),
        (x - hw, y + hd, z),
        (x + hw, y + hd, z),
        (x, y + hd, z + height),
    ]
    faces = [
        (0, 1, 2),
        (3, 5, 4),
        (0, 3, 4, 1),
        (1, 4, 5, 2),
        (2, 5, 3, 0),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat)
    return obj


def add_flower_emblem(
    prefix: str,
    center: tuple[float, float, float],
    petal_mat: bpy.types.Material,
    center_mat: bpy.types.Material,
) -> None:
    x, y, z = center
    for index in range(6):
        angle = math.tau * index / 6
        petal = sphere(
            f"{prefix}_Petal_{index}",
            (x + math.cos(angle) * 0.19, y, z + math.sin(angle) * 0.19),
            (0.12, 0.055, 0.17),
            petal_mat,
            12,
        )
        petal.rotation_euler[1] = math.radians(90)
    sphere(f"{prefix}_Center", (x, y - 0.015, z), (0.12, 0.07, 0.12), center_mat, 12)


def add_building(
    prefix: str,
    x: float,
    y: float,
    width: float,
    depth: float,
    wall_height: float,
    wall_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
    trim_mat: bpy.types.Material,
    door_mat: bpy.types.Material,
    window_mat: bpy.types.Material,
    sign_mat: bpy.types.Material,
    flower_mat: bpy.types.Material,
    awning: bool = False,
    rotation: float = 0,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation

    created_before = set(bpy.context.scene.objects)
    rounded_box(
        f"{prefix}_Walls",
        (0, 0, wall_height / 2 + 0.24),
        (width / 2, depth / 2, wall_height / 2),
        wall_mat,
        0.18,
    )
    add_gable_roof(
        f"{prefix}_Roof",
        (0, 0, wall_height + 0.2),
        width + 0.55,
        depth + 0.55,
        1.25,
        roof_mat,
    )
    front_y = -depth / 2 - 0.04
    rounded_box(
        f"{prefix}_Door",
        (0, front_y - 0.02, 1.2),
        (0.55, 0.08, 0.96),
        door_mat,
        0.14,
    )
    sphere(f"{prefix}_DoorKnob", (0.32, front_y - 0.13, 1.18), (0.06, 0.045, 0.06), trim_mat, 12)

    for side in (-1, 1):
        window_x = side * width * 0.3
        rounded_box(
            f"{prefix}_Window_{side}",
            (window_x, front_y - 0.02, 1.78),
            (0.5, 0.07, 0.58),
            trim_mat,
            0.1,
        )
        rounded_box(
            f"{prefix}_Glass_{side}",
            (window_x, front_y - 0.1, 1.78),
            (0.39, 0.04, 0.47),
            window_mat,
            0.06,
        )
        rounded_box(
            f"{prefix}_WindowBarV_{side}",
            (window_x, front_y - 0.15, 1.78),
            (0.025, 0.025, 0.45),
            trim_mat,
            0.01,
        )

    sign_z = wall_height - 0.48
    rounded_box(
        f"{prefix}_Sign",
        (0, front_y - 0.12, sign_z),
        (width * 0.31, 0.065, 0.32),
        sign_mat,
        0.12,
    )
    add_flower_emblem(f"{prefix}_Emblem", (0, front_y - 0.21, sign_z), flower_mat, trim_mat)

    if awning:
        for stripe in range(9):
            stripe_x = -width * 0.42 + stripe * width * 0.105
            stripe_mat = roof_mat if stripe % 2 == 0 else sign_mat
            awning_piece = rounded_box(
                f"{prefix}_Awning_{stripe}",
                (stripe_x, front_y - 0.42, 2.75),
                (width * 0.057, 0.38, 0.11),
                stripe_mat,
                0.05,
            )
            awning_piece.rotation_euler[0] = math.radians(-8)

    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_tree(
    prefix: str,
    x: float,
    y: float,
    height: float,
    trunk_mat: bpy.types.Material,
    leaf_mats: list[bpy.types.Material],
) -> None:
    cylinder(f"{prefix}_Trunk", (x, y, height * 0.42), 0.22, height * 0.84, trunk_mat, 14)
    crown_z = height * 0.88
    offsets = [(-0.45, 0, 0), (0.4, 0.08, 0.05), (0, -0.16, 0.34), (0, 0.28, -0.08)]
    for index, (dx, dy, dz) in enumerate(offsets):
        sphere(
            f"{prefix}_Leaves_{index}",
            (x + dx, y + dy, crown_z + dz),
            (0.76, 0.68, 0.7),
            leaf_mats[index % len(leaf_mats)],
            12,
        )


def add_fruit(
    prefix: str,
    x: float,
    y: float,
    height: float,
    fruit_mat: bpy.types.Material,
) -> None:
    """Three berries tucked into a tree crown, the way a village orchard reads."""

    crown_z = height * 0.88
    for index, (dx, dy, dz) in enumerate([(-0.52, -0.3, 0.1), (0.48, -0.24, -0.05), (0.05, -0.42, 0.36)]):
        sphere(f"{prefix}_Fruit_{index}", (x + dx, y + dy, crown_z + dz), (0.14, 0.14, 0.14), fruit_mat, 10)


def add_lamp_post(
    prefix: str,
    x: float,
    y: float,
    post_mat: bpy.types.Material,
    glass_mat: bpy.types.Material,
    cap_mat: bpy.types.Material,
) -> None:
    cylinder(f"{prefix}_Base", (x, y, 0.34), 0.24, 0.28, post_mat, 12)
    cylinder(f"{prefix}_Post", (x, y, 1.5), 0.075, 2.3, post_mat, 10)
    sphere(f"{prefix}_Lamp", (x, y, 2.82), (0.24, 0.24, 0.28), glass_mat, 14)
    sphere(f"{prefix}_Cap", (x, y, 3.04), (0.17, 0.17, 0.1), cap_mat, 12)


def add_mailbox(
    prefix: str,
    x: float,
    y: float,
    rotation: float,
    post_mat: bpy.types.Material,
    body_mat: bpy.types.Material,
    flag_mat: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation

    created_before = set(bpy.context.scene.objects)
    cylinder(f"{prefix}_Post", (0, 0, 0.62), 0.09, 1.05, post_mat, 10)
    rounded_box(f"{prefix}_Body", (0, 0, 1.36), (0.28, 0.36, 0.26), body_mat, 0.16)
    rounded_box(f"{prefix}_Slot", (0, -0.38, 1.4), (0.16, 0.03, 0.05), post_mat, 0.02)
    rounded_box(f"{prefix}_Flag", (0.31, 0.06, 1.52), (0.03, 0.09, 0.16), flag_mat, 0.03)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_mushroom(
    prefix: str,
    x: float,
    y: float,
    scale: float,
    stem_mat: bpy.types.Material,
    cap_mat: bpy.types.Material,
) -> None:
    cylinder(f"{prefix}_Stem", (x, y, 0.62 + 0.12 * scale), 0.09 * scale, 0.3 * scale, stem_mat, 10)
    sphere(f"{prefix}_Cap", (x, y, 0.74 + 0.26 * scale), (0.26 * scale, 0.26 * scale, 0.19 * scale), cap_mat, 12)


def add_stump(
    prefix: str,
    x: float,
    y: float,
    bark_mat: bpy.types.Material,
    top_mat: bpy.types.Material,
) -> None:
    cylinder(f"{prefix}_Body", (x, y, 0.78), 0.44, 0.62, bark_mat, 16)
    cylinder(f"{prefix}_Rings", (x, y, 1.1), 0.38, 0.05, top_mat, 16)


def add_flower_patch(
    prefix: str,
    x: float,
    y: float,
    count: int,
    stem_mat: bpy.types.Material,
    flower_mats: list[bpy.types.Material],
) -> None:
    """A loose scatter of blooms on the grass ring, rather than a tidy planter."""

    for index in range(count):
        angle = math.tau * index / count + random.random() * 0.6
        radius = 0.35 + random.random() * 1.15
        flower_x = x + math.cos(angle) * radius
        flower_y = y + math.sin(angle) * radius
        cylinder(f"{prefix}_Stem_{index}", (flower_x, flower_y, 0.58), 0.022, 0.3, stem_mat, 6)
        for petal_index in range(5):
            petal_angle = math.tau * petal_index / 5
            sphere(
                f"{prefix}_Petal_{index}_{petal_index}",
                (
                    flower_x + math.cos(petal_angle) * 0.08,
                    flower_y + math.sin(petal_angle) * 0.08,
                    0.76,
                ),
                (0.07, 0.07, 0.05),
                flower_mats[index % len(flower_mats)],
                8,
            )


def add_fence_arc(
    prefix: str,
    radius: float,
    start_angle: float,
    end_angle: float,
    posts: int,
    wood_mat: bpy.types.Material,
) -> None:
    """Picket fencing following the grass ring between the buildings."""

    for index in range(posts):
        angle = start_angle + (end_angle - start_angle) * index / max(posts - 1, 1)
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        facing = angle + math.pi / 2
        for side in (-0.22, 0.22):
            cylinder(
                f"{prefix}_Picket_{index}_{side}",
                (x + math.cos(facing) * side, y + math.sin(facing) * side, 0.72),
                0.055,
                0.86,
                wood_mat,
                8,
            )
        rail = rounded_box(f"{prefix}_Rail_{index}", (x, y, 0.92), (0.34, 0.05, 0.055), wood_mat, 0.02)
        rail.rotation_euler[2] = facing


def add_pond(
    prefix: str,
    x: float,
    y: float,
    radius: float,
    water_mat: bpy.types.Material,
    rim_mat: bpy.types.Material,
    lily_mat: bpy.types.Material,
) -> None:
    cylinder(f"{prefix}_Water", (x, y, 0.16), radius, 0.2, water_mat, 40)
    torus(f"{prefix}_Rim", (x, y, 0.24), radius + 0.06, 0.16, rim_mat)
    for index, (dx, dy) in enumerate([(-0.6, 0.3), (0.7, -0.2), (0.1, 0.75)]):
        cylinder(f"{prefix}_Lily_{index}", (x + dx, y + dy, 0.27), 0.32, 0.04, lily_mat, 14)


def add_arch(
    prefix: str,
    x: float,
    y: float,
    span: float,
    wood_mat: bpy.types.Material,
    leaf_mat: bpy.types.Material,
    flower_mat: bpy.types.Material,
) -> None:
    """Flowered entrance arch, the first thing a visitor walks through."""

    for side in (-1, 1):
        cylinder(f"{prefix}_Leg_{side}", (x + side * span / 2, y, 1.7), 0.12, 3.0, wood_mat, 10)
    rounded_box(f"{prefix}_Beam", (x, y, 3.3), (span / 2 + 0.22, 0.13, 0.12), wood_mat, 0.05)
    for index in range(9):
        bloom_x = x - span / 2 + index * span / 8
        sphere(f"{prefix}_Vine_{index}", (bloom_x, y, 3.42), (0.21, 0.17, 0.15), leaf_mat, 10)
        if index % 2 == 0:
            sphere(f"{prefix}_Bloom_{index}", (bloom_x, y - 0.13, 3.54), (0.12, 0.1, 0.12), flower_mat, 8)


def add_planter(
    prefix: str,
    x: float,
    y: float,
    width: float,
    planter_mat: bpy.types.Material,
    soil_mat: bpy.types.Material,
    stem_mat: bpy.types.Material,
    flower_mats: list[bpy.types.Material],
) -> None:
    rounded_box(prefix, (x, y, 0.35), (width / 2, 0.68, 0.34), planter_mat, 0.16)
    rounded_box(f"{prefix}_Soil", (x, y, 0.7), (width * 0.43, 0.56, 0.08), soil_mat, 0.1)
    for index in range(9):
        flower_x = x - width * 0.36 + index * width * 0.09
        flower_y = y - 0.25 + (index % 3) * 0.22
        flower_z = 0.92 + (index % 2) * 0.08
        cylinder(f"{prefix}_Stem_{index}", (flower_x, flower_y, flower_z - 0.1), 0.025, 0.34, stem_mat, 8)
        for petal_index in range(5):
            angle = math.tau * petal_index / 5
            sphere(
                f"{prefix}_Flower_{index}_{petal_index}",
                (
                    flower_x + math.cos(angle) * 0.09,
                    flower_y + math.sin(angle) * 0.05,
                    flower_z + math.sin(angle) * 0.09,
                ),
                (0.075, 0.045, 0.075),
                flower_mats[index % len(flower_mats)],
                8,
            )


def add_bench(
    prefix: str,
    x: float,
    y: float,
    rotation: float,
    wood_mat: bpy.types.Material,
    metal_mat: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation
    pieces = [
        rounded_box(f"{prefix}_Seat", (0, 0, 0.62), (1.15, 0.32, 0.11), wood_mat, 0.08),
        rounded_box(f"{prefix}_Back", (0, 0.27, 1.15), (1.15, 0.1, 0.43), wood_mat, 0.08),
        rounded_box(f"{prefix}_LegL", (-0.82, 0, 0.31), (0.1, 0.24, 0.3), metal_mat, 0.05),
        rounded_box(f"{prefix}_LegR", (0.82, 0, 0.31), (0.1, 0.24, 0.3), metal_mat, 0.05),
    ]
    for piece in pieces:
        parent_local(piece, root)


def add_noticeboard(
    x: float,
    y: float,
    rotation: float,
    wood_mat: bpy.types.Material,
    panel_mat: bpy.types.Material,
    paper_mats: list[bpy.types.Material],
) -> None:
    root = bpy.data.objects.new("TownNoticeboard", None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation
    parts = [
        rounded_box("BoardPanel", (0, 0, 1.75), (1.25, 0.13, 0.82), wood_mat, 0.11),
        rounded_box("BoardInset", (0, -0.15, 1.75), (1.05, 0.04, 0.64), panel_mat, 0.07),
        cylinder("BoardPostL", (-0.82, 0, 0.7), 0.09, 1.4, wood_mat, 12),
        cylinder("BoardPostR", (0.82, 0, 0.7), 0.09, 1.4, wood_mat, 12),
    ]
    for index, (px, pz) in enumerate([(-0.55, 1.95), (0.1, 1.82), (0.58, 1.55), (-0.42, 1.42)]):
        parts.append(
            rounded_box(
                f"BoardPaper_{index}",
                (px, -0.21, pz),
                (0.23, 0.02, 0.18),
                paper_mats[index % len(paper_mats)],
                0.025,
            )
        )
    for part in parts:
        parent_local(part, root)


def add_fountain(
    x: float,
    y: float,
    stone_mat: bpy.types.Material,
    water_mat: bpy.types.Material,
    accent_mat: bpy.types.Material,
) -> None:
    cylinder("FountainBase", (x, y, 0.28), 1.55, 0.42, stone_mat, 32)
    cylinder("FountainWater", (x, y, 0.52), 1.28, 0.12, water_mat, 32)
    torus("FountainRim", (x, y, 0.59), 1.36, 0.14, stone_mat)
    cylinder("FountainStem", (x, y, 1.14), 0.2, 1.2, stone_mat, 20)
    sphere("FountainBowl", (x, y, 1.55), (0.66, 0.66, 0.2), stone_mat, 20)
    torus("FountainBowlRim", (x, y, 1.58), 0.63, 0.09, stone_mat)
    sphere("FountainHeart", (x, y - 0.04, 2.05), (0.22, 0.15, 0.25), accent_mat, 16)
    sphere("FountainDrop", (x, y - 0.02, 1.82), (0.08, 0.08, 0.25), water_mat, 12)


def add_chibi(
    name: str,
    location: tuple[float, float, float],
    hood_mat: bpy.types.Material,
    body_mat: bpy.types.Material,
    skin_mat: bpy.types.Material,
    dark_mat: bpy.types.Material,
    cream_mat: bpy.types.Material,
    animal: str,
    accent_mat: bpy.types.Material,
    rotation: float = 0,
    is_user: bool = False,
    start_location: tuple[float, float, float] | None = None,
) -> bpy.types.Object:
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.location = location
    root.rotation_euler[2] = rotation

    parts: list[bpy.types.Object] = []
    parts.append(sphere(f"{name}_Body", (0, 0, 0.94), (0.38, 0.29, 0.52), body_mat, 14))
    parts.append(sphere(f"{name}_Hood", (0, 0, 1.63), (0.46, 0.37, 0.46), hood_mat, 16))
    parts.append(sphere(f"{name}_Face", (0, -0.22, 1.59), (0.34, 0.22, 0.34), skin_mat, 16))
    parts.append(sphere(f"{name}_FootL", (-0.19, -0.03, 0.35), (0.16, 0.23, 0.13), cream_mat, 12))
    parts.append(sphere(f"{name}_FootR", (0.19, -0.03, 0.35), (0.16, 0.23, 0.13), cream_mat, 12))
    parts.append(sphere(f"{name}_ArmL", (-0.42, -0.03, 1.04), (0.13, 0.13, 0.34), body_mat, 12))
    parts.append(sphere(f"{name}_ArmR", (0.42, -0.03, 1.04), (0.13, 0.13, 0.34), body_mat, 12))
    parts[-1].rotation_euler[1] = math.radians(-22 if int(abs(location[0]) * 10) % 2 else 22)

    for side in (-1, 1):
        parts.append(sphere(f"{name}_Eye_{side}", (side * 0.13, -0.425, 1.64), (0.04, 0.035, 0.055), dark_mat, 10))
        parts.append(sphere(f"{name}_Cheek_{side}", (side * 0.22, -0.405, 1.52), (0.055, 0.025, 0.035), accent_mat, 10))
    parts.append(sphere(f"{name}_Mouth", (0, -0.435, 1.51), (0.035, 0.025, 0.035), dark_mat, 10))

    if animal == "rabbit":
        for side in (-1, 1):
            parts.append(sphere(f"{name}_Ear_{side}", (side * 0.22, 0.02, 2.09), (0.13, 0.12, 0.38), hood_mat, 12))
    elif animal == "cat":
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.24, depth=0.4, location=(side * 0.24, 0.02, 2.0))
            ear = bpy.context.object
            ear.name = f"{name}_Ear_{side}"
            assign(ear, hood_mat)
            parts.append(ear)
    else:
        for side in (-1, 1):
            parts.append(sphere(f"{name}_Ear_{side}", (side * 0.29, 0.01, 1.96), (0.16, 0.13, 0.18), hood_mat, 12))

    parts.append(rounded_box(f"{name}_Bag", (0.31, -0.23, 0.82), (0.16, 0.08, 0.22), accent_mat, 0.07))
    parts.append(cylinder(f"{name}_Bottle", (-0.28, -0.25, 0.75), 0.075, 0.28, cream_mat, 10))

    if is_user:
        parts.append(torus(f"{name}_UserRing", (0, 0, 0.16), 0.55, 0.07, accent_mat))

    for part in parts:
        parent_local(part, root)

    if is_user and start_location is not None:
        root.location = start_location
        root.keyframe_insert(data_path="location", frame=1)
        root.location = location
        root.keyframe_insert(data_path="location", frame=52)
        root.location = start_location

    return root


def add_field(
    prefix: str,
    x: float,
    y: float,
    width: float,
    depth: float,
    crop_mat: bpy.types.Material,
    ridge_mat: bpy.types.Material,
) -> None:
    """One paddy: a low slab of crop inside a raised earth ridge."""

    rounded_box(f"{prefix}_Ridge", (x, y, -0.16), (width / 2, depth / 2, 0.16), ridge_mat, 0.12)
    rounded_box(
        f"{prefix}_Crop",
        (x, y, -0.06),
        (width / 2 - 0.55, depth / 2 - 0.55, 0.13),
        crop_mat,
        0.1,
    )


def add_farmhouse(
    prefix: str,
    x: float,
    y: float,
    rotation: float,
    wall_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation

    created_before = set(bpy.context.scene.objects)
    rounded_box(f"{prefix}_Walls", (0, 0, 1.5), (2.4, 1.7, 1.5), wall_mat, 0.2)
    add_gable_roof(f"{prefix}_Roof", (0, 0, 2.9), 5.5, 3.9, 1.5, roof_mat)
    rounded_box(f"{prefix}_Shed", (3.4, 0.4, 0.95), (1.1, 1.2, 0.95), roof_mat, 0.16)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_far_tree(
    prefix: str,
    x: float,
    y: float,
    height: float,
    trunk_mat: bpy.types.Material,
    leaf_mat: bpy.types.Material,
) -> None:
    """Cheap stand-in for a tree seen from across the valley."""

    cylinder(f"{prefix}_Trunk", (x, y, height * 0.3), height * 0.09, height * 0.6, trunk_mat, 6)
    sphere(
        f"{prefix}_Crown",
        (x, y, height * 0.78),
        (height * 0.34, height * 0.34, height * 0.36),
        leaf_mat,
        8,
    )


def add_tower(
    prefix: str,
    x: float,
    y: float,
    width: float,
    depth: float,
    height: float,
    wall_mat: bpy.types.Material,
    glass_mat: bpy.types.Material,
) -> None:
    rounded_box(prefix, (x, y, height / 2), (width / 2, depth / 2, height / 2), wall_mat, 0.3)
    # A few window bands are enough to read as a tower at this distance.
    for index in range(max(int(height / 4.5), 1)):
        band_z = 2.6 + index * 4.2
        if band_z > height - 1.4:
            break
        rounded_box(
            f"{prefix}_Band_{index}",
            (x, y - depth / 2 - 0.06, band_z),
            (width * 0.38, 0.06, 0.85),
            glass_mat,
            0.08,
        )


def add_mountain(
    prefix: str,
    x: float,
    y: float,
    radius: float,
    height: float,
    rock_mat: bpy.types.Material,
    snow_mat: bpy.types.Material | None,
) -> None:
    cone(f"{prefix}_Peak", (x, y, height / 2 - 1.2), radius, height, rock_mat, 14)
    if snow_mat is not None:
        cone(f"{prefix}_Snow", (x, y, height - 1.2 - height * 0.11), radius * 0.3, height * 0.22, snow_mat, 14)


def build_surrounding_world(materials: dict[str, bpy.types.Material]) -> None:
    """Everything past the town wall: paddies, a river, the city and the mountains.

    The plaza camera looks north, so the view is layered for depth — countryside
    first, then the river and its bridge, the city skyline behind that, and the
    mountains closing the horizon. The sides and the back are dressed more
    loosely, since they are only seen when the visitor turns the camera.
    """

    far_grass = materials["far_grass"]
    field_a = materials["field_a"]
    field_b = materials["field_b"]
    field_c = materials["field_c"]
    ridge = materials["ridge"]
    river = materials["river"]
    sand = materials["sand"]
    road = materials["road"]
    forest = materials["forest"]
    wood = materials["wood"]
    city_a = materials["city_a"]
    city_b = materials["city_b"]
    city_c = materials["city_c"]
    city_glass = materials["city_glass"]
    hill = materials["hill"]
    mountain_near = materials["mountain_near"]
    mountain_far = materials["mountain_far"]
    snow = materials["snow"]
    cream = materials["cream"]
    salmon = materials["salmon"]

    # The land the whole world sits on. The town disc covers the middle of it.
    cylinder("Countryside", (0, 40, -0.5), 620, 0.4, far_grass, 64)

    # Roads out of the town: north across the bridge, south into the fields.
    rounded_box("RoadNorth", (0, 62, -0.28), (2.8, 42, 0.1), road, 0.2)
    rounded_box("RoadSouth", (0, -58, -0.28), (2.6, 36, 0.1), road, 0.2)

    # The river, running east to west between the town and the city.
    rounded_box("River", (0, 48, -0.42), (620, 6.5, 0.24), river, 0.3)
    rounded_box("RiverBankNear", (0, 41.0, -0.3), (620, 1.2, 0.2), sand, 0.2)
    rounded_box("RiverBankFar", (0, 55.0, -0.3), (620, 1.2, 0.2), sand, 0.2)

    # The bridge only goes up once the town has reason to cross the river.
    with growth(92):
        rounded_box("BridgeDeck", (0, 48, 0.5), (3.4, 9.0, 0.22), wood, 0.12)
        for side in (-1, 1):
            rounded_box(f"BridgeRail_{side}", (side * 3.2, 48, 1.05), (0.16, 8.8, 0.34), cream, 0.1)
            for post_index in range(6):
                cylinder(
                    f"BridgePost_{side}_{post_index}",
                    (side * 3.2, 40.4 + post_index * 3.1, 0.82),
                    0.16,
                    0.9,
                    wood,
                    8,
                )

    # Paddies on the near bank, laid out in a grid the road cuts through.
    field_mats = [field_a, field_b, field_c]
    field_index = 0
    with growth(86):
        for row, y in enumerate([27.0, 36.0]):
            for column, x in enumerate([-46, -33, -20, 20, 33, 46]):
                add_field(
                    f"NearField_{field_index}",
                    x,
                    y,
                    11.6,
                    7.4,
                    field_mats[(row + column) % len(field_mats)],
                    ridge,
                )
                field_index += 1

    # More paddies on the far bank, thinning out as they approach the city.
    with growth(88):
        for row, y in enumerate([60.0, 71.0, 82.0]):
            for column, x in enumerate([-62, -46, -30, 30, 46, 62]):
                add_field(
                    f"FarField_{field_index}",
                    x,
                    y,
                    13.4,
                    8.6,
                    field_mats[(row + column + 1) % len(field_mats)],
                    ridge,
                )
                field_index += 1

    # Fields to the sides and behind, for when the camera turns away from the city.
    with growth(90):
        for index, (x, y) in enumerate(
            [(-52, 8), (-54, -12), (52, 8), (54, -12), (-32, -48), (32, -48), (0, -70), (-64, -34), (64, -34)]
        ):
            add_field(f"SideField_{index}", x, y, 16.0, 10.0, field_mats[index % len(field_mats)], ridge)

    farmhouse_layout = [
        (-36, 20, 0.4), (37, 19, -0.5), (-46, -22, 1.1), (47, -21, -1.2),
        (10, -56, 0.2), (-20, 66, 0.7), (22, 78, -0.6),
    ]
    with growth(86):
        for index in (0, 1):
            x, y, rotation = farmhouse_layout[index]
            add_farmhouse(f"Farmhouse_{index}", x, y, rotation, cream, salmon if index % 2 else wood)
    with growth(90):
        for index in range(2, len(farmhouse_layout)):
            x, y, rotation = farmhouse_layout[index]
            add_farmhouse(f"Farmhouse_{index}", x, y, rotation, cream, salmon if index % 2 else wood)

    # Windbreaks and copses scattered over the countryside.
    with growth(86):
        for index in range(64):
            angle = math.tau * index / 64 + random.random() * 0.12
            radius = 30 + random.random() * 68
            x = math.cos(angle) * radius
            y = math.sin(angle) * radius + 6
            # Keep the river, the roads and the paddy grid clear.
            if 24 < y < 90 and abs(x) < 70:
                continue
            if abs(x) < 6:
                continue
            add_far_tree(f"FarTree_{index}", x, y, 3.6 + random.random() * 3.0, wood, forest)

    # The city, far enough north that it reads as a skyline rather than a wall.
    city_mats = [city_a, city_b, city_c]
    tower_layout = [
        (-104, 268, 13, 12, 20),
        (-82, 258, 12, 12, 28),
        (-62, 272, 14, 13, 35),
        (-42, 256, 13, 12, 42),
        (-22, 270, 14, 13, 30),
        (0, 260, 15, 14, 46),
        (22, 272, 13, 12, 36),
        (44, 258, 12, 12, 26),
        (66, 270, 14, 12, 21),
        (92, 262, 12, 12, 17),
        (-118, 302, 13, 13, 23),
        (-70, 308, 14, 14, 31),
        (-24, 312, 13, 13, 39),
        (24, 306, 15, 14, 34),
        (72, 310, 13, 13, 27),
        (116, 300, 13, 13, 20),
    ]
    # The skyline fills in over the last stretch, one wave of towers per step.
    for level, tower_range in ((94, range(0, 7)), (96, range(7, 13)), (98, range(13, len(tower_layout)))):
        with growth(level):
            for index in tower_range:
                x, y, width, depth, height = tower_layout[index]
                add_tower(
                    f"Tower_{index}",
                    x,
                    y,
                    width,
                    depth,
                    height,
                    city_mats[index % len(city_mats)],
                    city_glass,
                )

    # Low hills between the city and the mountains, softening the transition.
    for index, (x, y, radius, height) in enumerate(
        [(-210, 344, 78, 34), (-84, 356, 86, 40), (62, 350, 82, 37), (204, 340, 77, 33)]
    ):
        sphere(f"Hill_{index}", (x, y, -4.0), (radius, radius * 0.6, height), hill, 14)

    # The skyline. Near peaks are greener, far peaks fade toward the sky colour.
    for index, (x, y, radius, height) in enumerate(
        [(-272, 396, 92, 86), (-144, 412, 104, 106), (-8, 426, 92, 94), (120, 404, 100, 101), (260, 388, 90, 83)]
    ):
        add_mountain(f"MountainNear_{index}", x, y, radius, height, mountain_near, None)

    for index, (x, y, radius, height) in enumerate(
        [(-372, 492, 114, 130), (-202, 516, 128, 158), (-12, 532, 116, 141), (178, 510, 125, 152), (350, 484, 111, 124)]
    ):
        add_mountain(f"MountainFar_{index}", x, y, radius, height, mountain_far, snow)

    # Peaks behind the visitor, so the horizon is closed all the way round.
    for index, (x, y, radius, height) in enumerate(
        [(-286, -322, 102, 97), (-48, -378, 116, 114), (216, -339, 108, 105), (-411, 56, 111, 108), (417, 42, 108, 103)]
    ):
        add_mountain(f"MountainBack_{index}", x, y, radius, height, mountain_far, None)


def flat_box(name, location, scale, mat):
    """A cube with no bevel modifier — cheap, for the many distant town buildings."""
    return rounded_box(name, location, scale, mat, 0)


def add_townhouse(
    prefix: str,
    x: float,
    y: float,
    rotation: float,
    wall_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
    door_mat: bpy.types.Material,
    window_mat: bpy.types.Material,
    floors: int = 2,
    awning_mat: bpy.types.Material | None = None,
) -> None:
    """A compact two-or-three storey house that faces the plaza, smaller than the
    core buildings so a whole neighbourhood of them reads as a denser town."""

    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation

    created_before = set(bpy.context.scene.objects)
    height = 1.5 + floors * 1.15
    flat_box(f"{prefix}_Walls", (0, 0, height / 2 + 0.24), (1.15, 1.0, height / 2), wall_mat)
    add_gable_roof(f"{prefix}_Roof", (0, 0, height + 0.2), 2.7, 2.4, 0.85, roof_mat)
    flat_box(f"{prefix}_Door", (0, -1.02, 0.96), (0.32, 0.06, 0.72), door_mat)
    # One window strip per floor keeps the part count low across a whole district.
    for floor in range(floors):
        flat_box(
            f"{prefix}_Win_{floor}",
            (0, -1.02, 1.4 + floor * 1.15),
            (0.82, 0.05, 0.32),
            window_mat,
        )
    if awning_mat is not None:
        awning = flat_box(f"{prefix}_Awning", (0, -1.24, 1.5), (1.0, 0.42, 0.09), awning_mat)
        awning.rotation_euler[0] = math.radians(-9)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_block(
    prefix: str,
    x: float,
    y: float,
    width: float,
    depth: float,
    floors: int,
    wall_mat: bpy.types.Material,
    glass_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
) -> None:
    """A mid-rise block. One window band per side reads as a storeyed building
    from a distance without a box per floor."""

    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)

    created_before = set(bpy.context.scene.objects)
    height = floors * 1.35
    flat_box(f"{prefix}_Body", (0, 0, height / 2 + 0.2), (width / 2, depth / 2, height / 2), wall_mat)
    flat_box(f"{prefix}_Cap", (0, 0, height + 0.24), (width / 2 - 0.1, depth / 2 - 0.1, 0.16), roof_mat)
    band_h = height * 0.42
    for sign in (-1, 1):
        flat_box(f"{prefix}_BandY_{sign}", (0, sign * (depth / 2 + 0.03), 0.9 + band_h),
                 (width * 0.4, 0.04, band_h), glass_mat)
        flat_box(f"{prefix}_BandX_{sign}", (sign * (width / 2 + 0.03), 0, 0.9 + band_h),
                 (0.04, depth * 0.4, band_h), glass_mat)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_clock_tower(
    prefix: str,
    x: float,
    y: float,
    wall_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
    clock_mat: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)

    created_before = set(bpy.context.scene.objects)
    flat_box(f"{prefix}_Shaft", (0, 0, 4.4), (1.05, 1.05, 4.2), wall_mat)
    for side in (-1, 1):
        cylinder(f"{prefix}_Clock_{side}", (side * 1.08, 0, 7.6), 0.55, 0.12, clock_mat, 16)
        cylinder(f"{prefix}_Clock_y_{side}", (0, side * 1.08, 7.6), 0.55, 0.12, clock_mat, 16)
    add_gable_roof(f"{prefix}_Roof", (0, 0, 8.6), 2.7, 2.7, 1.8, roof_mat)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def add_station(
    prefix: str,
    x: float,
    y: float,
    rotation: float,
    wall_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
    glass_mat: bpy.types.Material,
) -> None:
    root = bpy.data.objects.new(prefix, None)
    bpy.context.collection.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler[2] = rotation

    created_before = set(bpy.context.scene.objects)
    flat_box(f"{prefix}_Hall", (0, 0, 2.0), (5.5, 2.6, 1.8), wall_mat)
    add_gable_roof(f"{prefix}_Roof", (0, 0, 3.6), 12.0, 6.0, 1.6, roof_mat)
    flat_box(f"{prefix}_Entrance", (0, -2.7, 1.7), (2.4, 0.1, 1.5), glass_mat)
    for index in range(5):
        flat_box(f"{prefix}_Window_{index}", (-4.2 + index * 2.1, -2.66, 2.3), (0.7, 0.06, 0.6), glass_mat)
    add_flower_emblem(f"{prefix}_Clock", (0, -2.75, 3.2), roof_mat, wall_mat)
    for obj in set(bpy.context.scene.objects) - created_before:
        parent_local(obj, root)


def build_town_expansion(materials: dict[str, bpy.types.Material]) -> None:
    """Levels 101-200: the village grows into a city.

    Development spreads from the plaza toward the entrance and along the flanks,
    so the northern vista — fields, river, distant city, mountains — stays open
    and instead deepens as the far city is enlarged. Each wave is tagged with the
    level that reveals it; `src/types/townLevel.ts` mirrors the milestones.
    """

    wall_a = materials["wall_a"]
    wall_b = materials["wall_b"]
    wall_c = materials["wall_c"]
    roof_a = materials["roof_a"]
    roof_b = materials["roof_b"]
    roof_c = materials["roof_c"]
    door = materials["door"]
    window_mat = materials["window"]
    awning = materials["awning"]
    block_a = materials["block_a"]
    block_b = materials["block_b"]
    block_glass = materials["block_glass"]
    block_roof = materials["block_roof"]
    stone = materials["stone"]
    lamp_glow = materials["lamp_glow"]
    mint_dark = materials["mint_dark"]
    cream = materials["cream"]
    city_a = materials["city_a"]
    city_b = materials["city_b"]
    city_glass = materials["city_glass"]

    walls = [wall_a, wall_b, wall_c, cream]
    roofs = [roof_a, roof_b, roof_c]
    rng = random.Random(200)

    def forbidden(x: float, y: float) -> bool:
        r = math.hypot(x, y)
        if r < 23.5:
            return True  # keep the plaza and its fence clear
        if r > 190:
            return True  # mountains
        if 38 < y < 58:
            return True  # river
        if 22 < y < 96 and abs(x) < 72:
            return True  # the paddy fields and their approach
        if y > 240:
            return True  # the distant-city zone
        if abs(x) < 7 and y < -16:
            return True  # the entrance path
        return False

    def ring(level: int, radius: float, count: int, builder, jitter: float = 1.6) -> int:
        placed = 0
        for index in range(count):
            angle = math.tau * index / count + rng.uniform(-0.05, 0.05)
            x = math.cos(angle) * radius + rng.uniform(-jitter, jitter)
            y = math.sin(angle) * radius + rng.uniform(-jitter, jitter)
            if forbidden(x, y):
                continue
            facing = math.atan2(-y, -x) + math.pi / 2  # front toward the plaza
            builder(f"Town{level}_{index}", x, y, facing, index)
            placed += 1
        return placed

    def house(prefix, x, y, facing, index, floors=2, awn=None):
        add_townhouse(
            prefix, x, y, facing,
            walls[index % len(walls)],
            roofs[index % len(roofs)],
            door, window_mat, floors=floors, awning_mat=awn,
        )

    # --- Waves. The counts here are what the townLevel.ts unlocks report. ---

    # A ring of houses spreads out from the plaza, then thickens.
    with growth(103):
        ring(103, 27, 14, lambda p, x, y, f, i: house(p, x, y, f, i))
    with growth(108):
        ring(108, 27, 14, lambda p, x, y, f, i: house(p, x, y, f, i, awn=awning), jitter=2.2)
    with growth(113):
        ring(113, 33, 18, lambda p, x, y, f, i: house(p, x, y, f, i))
    with growth(118):
        ring(118, 39, 20, lambda p, x, y, f, i: house(p, x, y, f, i, floors=3))

    # Street lamps line the new roads.
    with growth(123):
        for index in range(16):
            angle = math.tau * index / 16
            x, y = math.cos(angle) * 30, math.sin(angle) * 30
            if forbidden(x, y):
                continue
            add_lamp_post(f"TownLamp_{index}", x, y, mint_dark, lamp_glow, cream)

    # A second neighbourhood green, away from the main plaza.
    with growth(128):
        cylinder("SecondGreen", (-30, -30, 0.14), 4.6, 0.24, materials["grass"], 40)
        torus("SecondGreenRim", (-30, -30, 0.28), 4.5, 0.12, mint_dark)
        add_tree("SecondGreenTree", -30, -30, 4.0, door, [roof_a, roof_b, roof_c])

    # Mid-rise blocks begin the town's core.
    def block(prefix, x, y, facing, index):
        add_block(
            prefix, x, y,
            3.2 + (index % 3) * 0.5, 3.0 + (index % 2) * 0.5,
            3 + index % 3,
            block_a if index % 2 else block_b, block_glass, block_roof,
        )

    with growth(134):
        ring(134, 47, 18, block, jitter=2.4)
    with growth(140):
        add_station("Station", 0, -34, 0, wall_b, roof_b, block_glass)
    with growth(146):
        add_clock_tower("ClockTower", 30, -14, wall_a, roof_a, lamp_glow)
    with growth(152):
        ring(152, 56, 20, block, jitter=2.6)
    with growth(158):
        # A riverside promenade of lamps and benches along the near bank.
        for index in range(9):
            x = -32 + index * 8
            add_lamp_post(f"PromLamp_{index}", x, 39.5, mint_dark, lamp_glow, cream)

    # Outer housing and taller blocks push toward the countryside.
    with growth(164):
        ring(164, 68, 22, lambda p, x, y, f, i: house(p, x, y, f, i, floors=3), jitter=3.0)
    with growth(170):
        ring(170, 82, 22, block, jitter=3.2)
    with growth(176):
        ring(176, 98, 20, lambda p, x, y, f, i: add_block(
            p, x, y, 4.0, 3.6, 5 + i % 3, block_a if i % 2 else city_a, city_glass, block_roof), jitter=3.4)

    # The distant city is enlarged and brought closer, growing tall at the end.
    def tower(prefix, x, y, floors, w=6.0, d=6.0):
        add_tower(prefix, x, y, w, d, floors * 3.2, city_a if hash(prefix) % 2 else city_b, city_glass)

    with growth(182):
        for index, (x, y, floors) in enumerate(
            [(-84, 150, 7), (-56, 156, 9), (-28, 150, 11), (0, 158, 12),
             (28, 150, 11), (56, 156, 9), (84, 150, 7)]
        ):
            tower(f"NearTower_{index}", x, y, floors, 8, 8)
    with growth(188):
        for index, (x, y, floors) in enumerate(
            [(-120, 190, 9), (-88, 196, 12), (-52, 200, 15), (-16, 204, 13),
             (20, 202, 16), (56, 198, 13), (92, 194, 11), (124, 188, 9)]
        ):
            tower(f"CityGrow_{index}", x, y, floors, 9, 9)
    with growth(193):
        for index, (x, y, floors) in enumerate(
            [(-64, 230, 20), (-24, 236, 24), (12, 234, 22), (48, 230, 19), (88, 226, 16)]
        ):
            tower(f"Skyscraper_{index}", x, y, floors, 10, 10)
    with growth(200):
        # The metropolis is finished: a crown of the tallest towers on the skyline.
        for index, (x, y, floors) in enumerate(
            [(-40, 250, 30), (0, 256, 34), (40, 250, 30)]
        ):
            tower(f"Landmark_{index}", x, y, floors, 12, 12)


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def collapse_chibi_to_single_mesh(root: bpy.types.Object, name: str) -> bpy.types.Object:
    """Flatten a chibi hierarchy into one multi-material mesh usable as an instance source.

    The frontend clones these templates into InstancedMeshes, so each visitor has to
    be a single object. Joining keeps every material slot, which preserves the colors.
    """

    parts = [child for child in root.children_recursive if child.type == "MESH"]
    for part in parts:
        world_matrix = part.matrix_world.copy()
        part.parent = None
        part.matrix_world = world_matrix

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    active = parts[0]
    bpy.context.view_layer.objects.active = active
    if len(parts) > 1:
        bpy.ops.object.join()
    bpy.ops.object.select_all(action="DESELECT")

    active.name = name
    active.data.name = name
    # The frontend positions visitors by their feet, so bake the origin to the ground.
    active.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")

    bpy.data.objects.remove(root, do_unlink=True)
    return active


GROWTH_KEY = "growth_level"


@contextlib.contextmanager
def growth(level: int):
    """Tag everything created inside the block with the town level that reveals it.

    The frontend hides batches whose level is above the town's current level, so
    the plaza grows as posts come in. Level 0 is the permanent world — the ground,
    the river and the mountains — which is there from the first visit. Do not nest
    these blocks; the outer one would overwrite the inner tags.
    """

    before = set(bpy.context.scene.objects)
    try:
        yield
    finally:
        for obj in set(bpy.context.scene.objects) - before:
            obj[GROWTH_KEY] = level


def join_static_meshes_by_material(*movable_roots: bpy.types.Object) -> int:
    """Reduce web draw calls while keeping the avatars and growth batches separate.

    Static geometry is merged per (growth level, material). Batching by material
    alone would be fewer draw calls, but it would also fuse level 3's benches into
    the same mesh as level 90's farmhouses, leaving nothing for the frontend to
    reveal one step at a time.
    """

    def is_movable(obj: bpy.types.Object) -> bool:
        current = obj
        while current is not None:
            if current in movable_roots:
                return True
            current = current.parent
        return False

    groups: dict[tuple[int, str], list[bpy.types.Object]] = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH" or is_movable(obj):
            continue
        level = int(obj.get(GROWTH_KEY, 0))
        world_matrix = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world_matrix
        material_name = obj.material_slots[0].material.name if obj.material_slots else "Unassigned"
        groups.setdefault((level, material_name), []).append(obj)

    joined_count = 0
    for (level, material_name), objects in groups.items():
        if not objects:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        if len(objects) > 1:
            bpy.ops.object.join()
        active.name = (
            f"Static_{material_name}" if level == 0 else f"Growth{level:03d}_{material_name}"
        )
        joined_count += 1

    bpy.ops.object.select_all(action="DESELECT")
    return joined_count


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()

    cream = material("Cream", (0.96, 0.91, 0.79, 1))
    warm_white = material("WarmWhite", (0.98, 0.96, 0.91, 1))
    paving_a = material("PavingBlush", (0.86, 0.72, 0.65, 1))
    paving_b = material("PavingCream", (0.91, 0.82, 0.72, 1))
    grass = material("Grass", (0.48, 0.67, 0.43, 1))
    garden_grass = material("GardenGrass", (0.30, 0.58, 0.32, 1))
    mint = material("Mint", (0.48, 0.73, 0.62, 1))
    mint_dark = material("MintDark", (0.25, 0.52, 0.44, 1))
    leaf_a = material("LeafA", (0.38, 0.61, 0.33, 1))
    leaf_b = material("LeafB", (0.51, 0.71, 0.40, 1))
    leaf_c = material("LeafC", (0.65, 0.78, 0.45, 1))
    wood = material("Wood", (0.49, 0.29, 0.18, 1))
    peach = material("Peach", (0.94, 0.65, 0.49, 1))
    salmon = material("Salmon", (0.90, 0.44, 0.43, 1))
    pink = material("Pink", (0.94, 0.56, 0.66, 1))
    lilac = material("Lilac", (0.64, 0.53, 0.82, 1))
    blue = material("Blue", (0.43, 0.66, 0.80, 1))
    sky_blue = material("SkyBlue", (0.58, 0.78, 0.87, 1))
    yellow = material("Yellow", (0.94, 0.72, 0.28, 1))
    stone = material("Stone", (0.72, 0.76, 0.72, 1))
    water = material("Water", (0.29, 0.69, 0.82, 1), 0.32)
    soil = material("Soil", (0.30, 0.18, 0.12, 1))
    dark = material("Dark", (0.12, 0.09, 0.08, 1))
    skin = material("Skin", (0.91, 0.66, 0.50, 1))
    purple = material("UserPurple", (0.39, 0.30, 0.70, 1))
    window = material("Window", (0.42, 0.70, 0.78, 1), 0.22)
    flower_blue = material("FlowerBlue", (0.45, 0.62, 0.93, 1))
    flower_white = material("FlowerWhite", (0.96, 0.92, 0.83, 1))

    # The town is a real circle, not a square plane with rounded corners. The
    # outer grass ring holds the buildings and the inner stone circle is the
    # shared plaza. A small opening at the front acts as the entrance.
    cylinder("TownGround", (0, 0, -0.18), 21.2, 0.56, grass, 96)
    torus("TownGroundEdge", (0, 0, 0.1), 20.84, 0.24, mint_dark)
    cylinder("PlazaFoundation", (0, 0, 0.06), 16.1, 0.24, cream, 96)
    torus("PlazaOuterRim", (0, 0, 0.21), 15.84, 0.16, stone)
    torus("PlazaInnerWalkRing", (0, 0, 0.29), 9.0, 0.075, warm_white)

    tile_index = 0
    for row, y in enumerate([i * 1.08 - 14.58 for i in range(28)]):
        offset = 0.58 if row % 2 else 0
        for x_index in range(25):
            x = x_index * 1.26 - 15.12 + offset
            if x * x + y * y > 14.92 * 14.92:
                continue
            tile = rounded_box(
                f"Paver_{tile_index:03d}",
                (x, y, 0.2 + (tile_index % 3) * 0.003),
                (0.64, 0.51, 0.055),
                paving_a if (row + x_index) % 3 == 0 else paving_b,
                0.07,
            )
            tile.rotation_euler[2] = math.radians((tile_index % 3 - 1) * 1.2)
            tile_index += 1

    build_surrounding_world(
        {
            "far_grass": material("FarGrass", (0.55, 0.72, 0.45, 1)),
            "field_a": material("FieldA", (0.62, 0.76, 0.42, 1)),
            "field_b": material("FieldB", (0.76, 0.80, 0.46, 1)),
            "field_c": material("FieldC", (0.48, 0.67, 0.40, 1)),
            "ridge": material("FieldRidge", (0.52, 0.44, 0.32, 1)),
            "river": material("RiverWater", (0.44, 0.73, 0.85, 1), 0.28),
            "sand": material("RiverSand", (0.85, 0.80, 0.66, 1)),
            "road": material("Road", (0.80, 0.73, 0.60, 1)),
            "forest": material("FarForest", (0.36, 0.55, 0.36, 1)),
            "wood": wood,
            "city_a": material("CityA", (0.80, 0.84, 0.89, 1)),
            "city_b": material("CityB", (0.85, 0.85, 0.88, 1)),
            "city_c": material("CityC", (0.75, 0.80, 0.87, 1)),
            "city_glass": material("CityGlass", (0.66, 0.79, 0.88, 1), 0.24),
            "hill": material("FarHill", (0.50, 0.66, 0.52, 1)),
            "mountain_near": material("MountainNear", (0.58, 0.70, 0.70, 1)),
            "mountain_far": material("MountainFar", (0.70, 0.79, 0.87, 1)),
            "snow": material("MountainSnow", (0.95, 0.96, 0.98, 1)),
            "cream": cream,
            "salmon": salmon,
        }
    )

    build_town_expansion(
        {
            "wall_a": warm_white,
            "wall_b": material("TownWallB", (0.90, 0.86, 0.94, 1)),
            "wall_c": material("TownWallC", (0.86, 0.90, 0.88, 1)),
            "roof_a": salmon,
            "roof_b": sky_blue,
            "roof_c": mint,
            "door": wood,
            "window": window,
            "awning": material("TownAwning", (0.88, 0.55, 0.52, 1)),
            "block_a": material("BlockA", (0.83, 0.85, 0.90, 1)),
            "block_b": material("BlockB", (0.88, 0.84, 0.80, 1)),
            "block_glass": material("BlockGlass", (0.58, 0.76, 0.86, 1), 0.24),
            "block_roof": material("BlockRoof", (0.70, 0.72, 0.78, 1)),
            "stone": stone,
            "lamp_glow": material("LampGlow", (0.98, 0.90, 0.62, 1)),
            "mint_dark": mint_dark,
            "cream": cream,
            "grass": grass,
            "city_a": material("CityA", (0.80, 0.84, 0.89, 1)),
            "city_b": material("CityB", (0.85, 0.85, 0.88, 1)),
            "city_glass": material("CityGlass", (0.66, 0.79, 0.88, 1), 0.24),
        }
    )

    add_fountain(0, 0, stone, water, pink)
    torus("FountainGatheringRing", (0, 0, 0.3), 2.05, 0.065, warm_white)

    # --- Town growth ------------------------------------------------------
    # Each block is revealed at the town level named below. Levels are spread so
    # the plaza keeps changing all the way to 100; the mapping is mirrored in
    # `src/types/townLevel.ts` and the two must be kept in step.
    tree_positions = [
        (-12.6, -14.6, 4.35),
        (12.7, -14.5, 4.3),
        (-17.2, -9.2, 4.15),
        (17.25, -9.1, 4.1),
        (-19.3, -2.0, 4.5),
        (19.3, -1.8, 4.55),
        (-18.0, 6.1, 4.25),
        (18.0, 6.2, 4.3),
        (-14.3, 12.8, 4.45),
        (14.3, 12.7, 4.4),
        (-8.2, 17.4, 4.2),
        (8.2, 17.35, 4.25),
        (-3.8, 19.4, 4.05),
        (3.8, 19.35, 4.1),
    ]
    fruit_mats = [salmon, yellow, peach, pink]

    def plant_trees(level: int, indices: list[int]) -> None:
        with growth(level):
            for index in indices:
                x, y, height = tree_positions[index]
                add_tree(f"Tree_{index}", x, y, height, wood, [leaf_a, leaf_b, leaf_c])
                # Every third tree bears fruit, so the ring reads as a village orchard.
                if index % 3 == 0:
                    add_fruit(f"Tree_{index}", x, y, height, fruit_mats[(index // 3) % len(fruit_mats)])

    garden_islands = [
        (-9.6, -4.2, 2.15),
        (9.6, -4.1, 2.15),
        (-9.1, 7.1, 2.0),
        (9.1, 7.0, 2.0),
    ]

    def raise_island(level: int, index: int) -> None:
        x, y, radius = garden_islands[index]
        with growth(level):
            cylinder(f"GardenIsland_{index}", (x, y, 0.32), radius, 0.16, garden_grass, 40)
            torus(f"GardenIslandRim_{index}", (x, y, 0.41), radius - 0.08, 0.08, mint_dark)
            add_tree(f"InnerTree_{index}", x, y + 0.15, 3.65, wood, [leaf_a, leaf_b, leaf_c])

    lamp_angles = [25, 70, 115, 160, 205, 240, 300, 335]
    # Its own material, so the frontend can make the lamps glow after dark without
    # lighting up every other yellow surface in the town.
    lamp_glow = material("LampGlow", (0.98, 0.90, 0.62, 1))

    def raise_lamps(level: int, indices: list[int]) -> None:
        with growth(level):
            for index in indices:
                angle = math.radians(lamp_angles[index])
                add_lamp_post(
                    f"Lamp_{index}",
                    math.cos(angle) * 15.3,
                    math.sin(angle) * 15.3,
                    mint_dark,
                    lamp_glow,
                    cream,
                )

    flower_patches = [
        (-17.4, 3.9),
        (17.5, 4.1),
        (-11.9, -17.1),
        (12.1, -17.0),
        (-19.6, 8.4),
        (19.6, 8.2),
    ]

    def sow_flowers(level: int, indices: list[int]) -> None:
        with growth(level):
            for index in indices:
                x, y = flower_patches[index]
                add_flower_patch(
                    f"FlowerPatch_{index}",
                    x,
                    y,
                    7,
                    leaf_a,
                    [pink, flower_blue, yellow, flower_white, lilac],
                )

    fence_arcs = [(-64, -26), (26, 64), (116, 154), (206, 244), (296, 334)]

    def raise_fences(level: int, indices: list[int]) -> None:
        with growth(level):
            for index in indices:
                start_angle, end_angle = fence_arcs[index]
                add_fence_arc(
                    f"Fence_{index}",
                    18.6,
                    math.radians(start_angle),
                    math.radians(end_angle),
                    7,
                    wood,
                )

    with growth(3):
        add_bench("LeftBench", -9.9, -10.6, math.radians(-28), mint_dark, cream)
        add_bench("RightBench", 9.9, -10.5, math.radians(28), wood, cream)
    plant_trees(5, [0, 1])
    with growth(7):
        add_noticeboard(-15.8, -3.1, math.radians(76), wood, cream, [pink, flower_blue, yellow, warm_white])
    raise_island(9, 0)
    with growth(11):
        add_building("SupportCenter", 0, 15.8, 5.1, 2.65, 4.15, cream, mint, mint_dark, wood, window, warm_white, peach)
    plant_trees(14, [2, 3])
    with growth(16):
        add_planter("FrontPlanterL", -3.4, -15.5, 3.2, peach, soil, leaf_a, [flower_blue, flower_white, pink])
        add_planter("FrontPlanterR", 3.4, -15.5, 3.2, peach, soil, leaf_a, [pink, flower_white, lilac])
    raise_island(18, 1)
    with growth(20):
        add_building(
            "CommunityHouse", -12.5, 10.7, 3.75, 2.45, 3.25, peach, yellow,
            warm_white, mint_dark, window, cream, flower_blue,
            rotation=math.radians(49),
        )
    with growth(23):
        add_bench("IslandBenchL", -8.8, -6.65, math.radians(-8), mint_dark, cream)
        add_bench("IslandBenchR", 8.8, -6.55, math.radians(8), wood, cream)
    plant_trees(25, [4, 5])
    with growth(27):
        add_building(
            "Cafe", 12.5, 10.5, 3.75, 2.5, 3.45, warm_white, salmon, cream,
            wood, window, peach, flower_white, True,
            rotation=math.radians(-49),
        )
    raise_island(30, 2)
    raise_lamps(32, [0, 1, 2, 3])
    with growth(35):
        add_building(
            "FamilyHouse", -16.5, 1.1, 3.15, 2.3, 2.95, warm_white, lilac,
            cream, wood, window, mint, flower_white,
            rotation=math.radians(86),
        )
    plant_trees(38, [6, 7])
    raise_island(40, 3)
    with growth(42):
        add_bench("GardenBenchL", -8.8, 11.9, math.radians(24), wood, cream)
        add_bench("GardenBenchR", 8.8, 11.8, math.radians(-24), mint_dark, cream)
    with growth(44):
        add_building(
            "GardenHouse", 16.5, 1.3, 3.15, 2.3, 2.95, cream, sky_blue,
            warm_white, mint_dark, window, peach, flower_blue,
            rotation=math.radians(-86),
        )
    raise_lamps(46, [4, 5, 6, 7])
    plant_trees(48, [8, 9])
    with growth(50):
        add_building(
            "Clinic", -14.5, -8.5, 3.4, 2.4, 3.05, warm_white, mint,
            cream, mint_dark, window, salmon, flower_white,
            rotation=math.radians(120),
        )
    with growth(53):
        add_planter("CafePlanter", 14.3, 5.9, 2.8, cream, soil, leaf_a, [yellow, pink, flower_white])
        add_planter("CommunityPlanter", -14.4, 6.1, 2.8, cream, soil, leaf_a, [flower_blue, flower_white, lilac])
    with growth(55):
        add_building(
            "Nursery", 14.5, -8.4, 3.6, 2.45, 3.15, cream, yellow,
            warm_white, wood, window, leaf_b, flower_blue,
            rotation=math.radians(-120),
        )
    plant_trees(58, [10, 11])
    with growth(60):
        add_building(
            "Library", -7.5, -16.2, 3.5, 2.4, 3.35, peach, mint_dark,
            cream, wood, window, warm_white, flower_white,
            rotation=math.radians(155),
        )
    sow_flowers(62, [0, 1, 2])
    with growth(64):
        add_building(
            "Bakery", 7.5, -16.1, 3.2, 2.3, 2.9, warm_white, peach,
            cream, wood, window, yellow, pink, True,
            rotation=math.radians(-155),
        )
    plant_trees(66, [12, 13])
    with growth(68):
        add_building(
            "Playroom", -6.6, 17.6, 3.3, 2.35, 3.0, mint, warm_white,
            cream, wood, window, sky_blue, flower_blue,
            rotation=math.radians(20),
        )
    raise_fences(70, [0, 1, 2])
    with growth(72):
        add_building(
            "Kitchen", 6.6, 17.5, 3.3, 2.35, 3.0, lilac, cream,
            warm_white, wood, window, peach, flower_white,
            rotation=math.radians(-20),
        )
    raise_fences(74, [3, 4])
    with growth(76):
        add_pond("Pond", -18.4, -13.2, 2.9, water, garden_grass, leaf_b)
    with growth(78):
        add_mailbox("Mailbox", 2.9, -15.9, math.radians(180), wood, salmon, cream)
        add_stump("Stump", 17.6, -13.4, wood, peach)
    with growth(80):
        for index, (x, y, scale) in enumerate(
            [(-16.2, -15.4, 1.0), (-15.4, -16.3, 0.75), (15.9, -15.9, 0.95), (16.8, -15.1, 0.7)]
        ):
            add_mushroom(f"Mushroom_{index}", x, y, scale, cream, salmon)
    sow_flowers(82, [3, 4, 5])
    with growth(100):
        # The town gate goes up last, once everything it leads to is finished.
        add_arch("EntranceArchL", -5.2, -18.2, 3.2, wood, leaf_a, pink)
        add_arch("EntranceArchR", 5.2, -18.2, 3.2, wood, leaf_a, flower_blue)

    # Visitors are no longer baked into fixed clusters. The frontend clones these
    # templates into InstancedMeshes and steers them, so groups form and dissolve
    # by topic at runtime instead of standing on four permanent pads.
    visitor_variants = [
        (mint, mint_dark, "bear", pink),
        (lilac, lilac, "rabbit", flower_blue),
        (yellow, peach, "cat", salmon),
        (blue, sky_blue, "bear", warm_white),
        (pink, salmon, "rabbit", lilac),
        (leaf_b, leaf_a, "cat", yellow),
    ]
    visitor_templates: list[bpy.types.Object] = []
    for index, (hood_mat, body_mat, animal, accent_mat) in enumerate(visitor_variants):
        chibi_root = add_chibi(
            f"VisitorSource_{index}",
            (0, 0, 0),
            hood_mat,
            body_mat,
            skin,
            dark,
            warm_white,
            animal,
            accent_mat,
        )
        template = collapse_chibi_to_single_mesh(chibi_root, f"VisitorTemplate_{index}")
        # Hidden from the preview render only; the glTF export still carries it so the
        # web build can read the geometry, then removes it from the live scene.
        template.hide_render = True
        visitor_templates.append(template)

    user_avatar = add_chibi(
        "You_Avatar",
        (-2.3, -5.0, 0.34),
        purple,
        lilac,
        skin,
        dark,
        warm_white,
        "rabbit",
        purple,
        start_location=(0, -14.1, 0.34),
        is_user=True,
    )

    # Soft studio lighting for the preview render. Web lighting is configured separately.
    bpy.ops.object.light_add(type="AREA", location=(-5.5, -4.5, 10.5))
    key = bpy.context.object
    key.name = "WarmKey"
    key.data.energy = 1250
    key.data.shape = "DISK"
    key.data.size = 7.5
    point_at(key, (0, 1, 1.5))

    bpy.ops.object.light_add(type="AREA", location=(7, 1, 8))
    fill = bpy.context.object
    fill.name = "SoftFill"
    fill.data.energy = 900
    fill.data.size = 7
    point_at(fill, (0, 2, 1.4))

    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    sun = bpy.context.object
    sun.name = "AfternoonSun"
    sun.rotation_euler = (math.radians(28), math.radians(-22), math.radians(-24))
    sun.data.energy = 1.4
    sun.data.angle = math.radians(16)

    bpy.ops.object.camera_add(location=(0, -24.0, 7.4))
    camera = bpy.context.object
    camera.name = "ImmersiveCamera"
    camera.data.type = "PERSP"
    camera.data.lens = 40
    point_at(camera, (0, 0.35, 1.35))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 72
    scene.frame_set(1)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1125
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.45, 0.72, 0.88, 1)
    background.inputs["Strength"].default_value = 0.55
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.5
    bpy.context.preferences.filepaths.save_version = 0

    static_batches = join_static_meshes_by_material(user_avatar, *visitor_templates)

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

    print(f"IMMERSIVE_EXPORT blend={BLEND_PATH}")
    print(f"IMMERSIVE_EXPORT glb={GLB_PATH}")
    print(f"IMMERSIVE_EXPORT render={RENDER_PATH}")
    print(
        f"IMMERSIVE_STATS objects={len(scene.objects)} pavers={tile_index} "
        f"visitor_templates={len(visitor_templates)} static_batches={static_batches}"
    )


if __name__ == "__main__":
    build_scene()
