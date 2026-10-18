"""Prepare user-supplied, licensed geometry for AutoAtlas. Run inside Blender 4+.
blender licensed-source.blend --background --python scripts/prepare_blender.py -- \
  --mapping component-map.json --output prepared.glb --source-up Z --front Y
Mapping: {"vehicleConfigId":"...", "license":"...", "redistributionAllowed":true,
          "components":{"semantic-id":["SourceMeshName", ...]}}
Source geometry is never automatically upgraded to verified geometry.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--mapping', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--source-up', choices=['Z'], default='Z')
parser.add_argument('--front', choices=['Y', '-Y'], default='-Y')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
manifest = json.loads(Path(args.mapping).read_text())
if not manifest.get('license') or manifest.get('redistributionAllowed') is not True:
    raise ValueError('Explicit license and browser redistribution approval required.')
if not manifest.get('vehicleConfigId'):
    raise ValueError('Vehicle configuration required.')
# Blender is Z-up. Its glTF exporter maps +Z to +Y, -Y to +Z.
root = bpy.data.objects.new(manifest['vehicleConfigId'], None)
bpy.context.collection.objects.link(root)
used = set()
for component_id, names in manifest['components'].items():
    if not names or component_id in used:
        raise ValueError(f'Empty or duplicate component {component_id}')
    group = bpy.data.objects.new(component_id, None)
    bpy.context.collection.objects.link(group)
    group.parent = root
    group['componentId'] = component_id
    group['accuracyStatus'] = 'C'  # reviewed evidence is required before promotion
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None or obj.type != 'MESH':
            raise ValueError(f'Missing mesh {name}')
        if name in used:
            raise ValueError(f'Mesh assigned to multiple components: {name}')
        used.add(name)
        if not obj.data.vertices or not obj.data.polygons:
            raise ValueError(f'Empty mesh {name}')
        transform = obj.matrix_world.copy()
        obj.parent = group
        obj.matrix_world = transform
        obj['componentId'] = component_id
        for material in obj.data.materials:
            if material and material.use_nodes:
                for node in material.node_tree.nodes:
                    if node.type == 'TEX_IMAGE' and node.image and not node.image.packed_file:
                        if not Path(bpy.path.abspath(node.image.filepath)).exists():
                            raise ValueError(f'Missing texture on {name}')
# glTF exporter respects scene scale; do not silently rescale an unverified source.
if abs(bpy.context.scene.unit_settings.scale_length - 1.0) > 1e-6:
    raise ValueError('Normalize and verify source units to metres before export (unit scale 1).')
if args.front == 'Y':
    root.rotation_euler.z = 3.141592653589793
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for obj in root.children_recursive:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=args.output, export_format='GLB', use_selection=True,
                         export_extras=True, export_yup=True, export_animations=True,
                         export_materials='EXPORT', export_apply=False)
print(f'Exported {len(manifest["components"])} mapped components to {args.output}')
