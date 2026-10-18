"""Export mapped components from Blender/Bforartists, without saving over the source.

bforartists --background --disable-autoexec source.blend --python-exit-code 1 \
  --python scripts/prepare_blender.py -- --mapping component-map.json --output prepared.glb
New mappings use componentRoots: {stable_id: existing_object_name}, preserving hierarchy.
Legacy mappings use components: {stable_id: [mesh_names]}, for static meshes only.
"""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy


def read_mapping(path):
    def unique_keys(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'Duplicate mapping key: {key}')
            result[key] = value
        return result
    return json.loads(Path(path).read_text(), object_pairs_hook=unique_keys)


def export_project(args):
    manifest = read_mapping(args.mapping)
    if not manifest.get('license') or manifest.get('redistributionAllowed') is not True:
        raise ValueError('Explicit license and browser redistribution approval required.')
    if not manifest.get('vehicleConfigId'):
        raise ValueError('Vehicle configuration required.')
    output = Path(args.output).resolve()
    if output.exists() or output.suffix.lower() != '.glb':
        raise ValueError('Output must be a new .glb file. Source files are never overwritten.')
    if args.report and Path(args.report).exists():
        raise ValueError('Report already exists; use a new export directory.')
    if abs(bpy.context.scene.unit_settings.scale_length - 1.0) > 1e-6:
        raise ValueError('Normalize and verify source units to metres (unit scale 1).')

    roots = {}
    mapping = manifest.get('componentRoots')
    if mapping:
        if manifest.get('components'):
            raise ValueError('Use componentRoots OR legacy components, not both.')
        for component_id, name in mapping.items():
            obj = bpy.data.objects.get(name)
            if obj is None or obj not in bpy.context.scene.objects.values():
                raise ValueError(f'Missing component root: {component_id} / {name}')
            if obj in roots.values():
                raise ValueError(f'Root assigned to multiple components: {name}')
            roots[component_id] = obj
    else:
        used = set()
        for component_id, names in manifest.get('components', {}).items():
            if not names or bpy.data.objects.get(component_id):
                raise ValueError(f'Empty mapping or existing object named {component_id}')
            group = bpy.data.objects.new(component_id, None)
            bpy.context.collection.objects.link(group)
            roots[component_id] = group
            for name in names:
                obj = bpy.data.objects.get(name)
                if obj is None or obj.type != 'MESH' or name in used:
                    raise ValueError(f'Missing or multiply assigned mesh: {name}')
                ancestors = [obj]
                while ancestors[-1].parent:
                    ancestors.append(ancestors[-1].parent)
                if any(o.animation_data or o.constraints for o in ancestors):
                    raise ValueError('Use componentRoots for animated/constrained hierarchies.')
                used.add(name)
                world = obj.matrix_world.copy()
                obj.parent = group
                obj.matrix_world = world
    if not roots:
        raise ValueError('At least one mapped physical component is required.')

    selected = set()
    for component_id, root in roots.items():
        parent = root.parent
        while parent:
            if parent in roots.values():
                raise ValueError('Semantic component roots must not be nested.')
            selected.add(parent)
            parent = parent.parent
        members = {root, *root.children_recursive}
        meshes = [obj for obj in members if obj.type == 'MESH']
        if not meshes:
            raise ValueError(f'Component has no mesh: {component_id}')
        selected.update(members)
        root['componentId'] = component_id
        root['accuracyStatus'] = 'C'
        for obj in meshes:
            if not obj.data.vertices or not obj.data.polygons:
                raise ValueError(f'Empty mesh: {obj.name}')
            if not all(math.isfinite(v) for row in obj.matrix_world for v in row):
                raise ValueError(f'Non-finite transform: {obj.name}')
            if not all(math.isfinite(c) for v in obj.data.vertices for c in v.co):
                raise ValueError(f'Non-finite vertices: {obj.name}')
            for material in obj.data.materials:
                if material and material.node_tree:
                    for node in material.node_tree.nodes:
                        if node.type == 'TEX_IMAGE' and node.image and not node.image.packed_file:
                            if not Path(bpy.path.abspath(node.image.filepath)).is_file():
                                raise ValueError(f'Missing texture on {obj.name}')
    for obj in selected:
        for modifier in obj.modifiers:
            if modifier.type == 'ARMATURE' and modifier.object not in selected:
                raise ValueError(f'Unmapped armature dependency on {obj.name}')
        for constraint in obj.constraints:
            target = getattr(constraint, 'target', None)
            if target and target not in selected:
                raise ValueError(f'Unmapped constraint target on {obj.name}')
    # glTF maps Blender +Z up / -Y front to viewer +Y up / +Z front.
    if args.front == 'Y':
        if any(o.animation_data or o.constraints for o in selected):
            raise ValueError('Normalize animated source axes before export.')
        from mathutils import Matrix
        rotation = Matrix.Rotation(math.pi, 4, 'Z')
        for obj in selected:
            if obj.parent not in selected:
                obj.matrix_world = rotation @ obj.matrix_world
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:
        obj.hide_set(False)
        obj.hide_select = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next(iter(roots.values()))
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format='GLB', use_selection=True,
        export_extras=True, export_yup=True, export_animations=True,
        export_materials='EXPORT', export_apply=False,
    )
    report = {'editorVersion': bpy.app.version_string, 'components': {}}
    for component_id, root in roots.items():
        values = {}
        fallback = manifest.get('explodedTransforms', {}).get(component_id, {})
        for key, prop in [('translation', 'explodedTranslation'), ('rotation', 'explodedRotation')]:
            vector = list(root.get(prop, fallback.get(key, [0, 0, 0])))
            if len(vector) != 3 or not all(math.isfinite(v) for v in vector):
                raise ValueError(f'Invalid separation {key}: {component_id}')
            values[key] = vector
        report['components'][component_id] = {'node': root.name, 'explodedTransform': values}
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
    print(f'Exported {len(roots)} components to {output}; geometry review remains pending.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--mapping', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--report')
    parser.add_argument('--source-up', choices=['Z'], default='Z')
    parser.add_argument('--front', choices=['Y', '-Y'], default='-Y')
    export_project(parser.parse_args(sys.argv[sys.argv.index('--') + 1:]))
