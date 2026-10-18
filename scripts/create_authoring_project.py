"""Create an editable Blender/Bforartists source from a decoded, mapped GLB."""
import argparse
import json
import sys
from pathlib import Path
import bpy
from mathutils import Quaternion, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
parser.add_argument('--mapping', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
output = Path(args.output).resolve()
if output.exists() or output.suffix != '.blend':
    raise ValueError('Choose a new .blend output file.')
mapping = json.loads(Path(args.mapping).read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1.0
bpy.ops.import_scene.gltf(filepath=str(Path(args.model).resolve()))
material_intent = json.loads((Path(args.mapping).parent / 'material-intent.json').read_text())
for name, intent in material_intent.items():
    material = bpy.data.materials.get(name)
    if material:
        material['autoatlasAlphaMode'] = intent['alphaMode']
        material['autoatlasDoubleSided'] = intent['doubleSided']
        material.use_backface_culling = not intent['doubleSided']
        material.id_properties_ui('autoatlasAlphaMode').update(
            description='glTF alpha mode: OPAQUE, MASK or BLEND. Retained by the AutoAtlas exporter.')
        material.id_properties_ui('autoatlasDoubleSided').update(
            description='Render both sides in AutoAtlas; preserve for thin glass and lens surfaces.')
for component_id, name in mapping['componentRoots'].items():
    root = bpy.data.objects.get(name)
    if root is None:
        raise ValueError(f'GLB importer did not preserve component root: {name}')
    root['componentId'] = component_id
    root['accuracyStatus'] = 'C'
    separation = mapping['explodedTransforms'][component_id]
    root['explodedTranslation'] = separation['translation']
    root['explodedRotation'] = separation['rotation']
    root.id_properties_ui('explodedTranslation').update(
        description='VIEWER axes: +X left, +Y up, +Z front. World metres at 100% explosion.')
    root.id_properties_ui('explodedRotation').update(
        description='VIEWER axes: XYZ Euler radians at 100% explosion; not a repair trajectory.')
scene = bpy.context.scene
scene['vehicleConfigId'] = mapping['vehicleConfigId']
scene['geometryStatus'] = 'demonstration'
scene['license'] = mapping['license']
scene['sourceHash'] = mapping['sourceHash']
scene['authoringNotice'] = 'Unverified development geometry. Editing does not verify shape or fitment.'
text = bpy.data.texts.new('AUTOATLAS_README')
text.write('''AUTOATLAS — EDITABLE ASSEMBLY

This is the original unverified interaction sample, not manufacturer CAD.
Keep mapped root names and componentId properties. Edit meshes beneath those roots.
Do not join different service parts. Preserve installed positions and real asymmetry.
Blender coordinates: metres, Z up, -Y vehicle front. Export converts to viewer axes.
Root custom properties explodedTranslation / explodedRotation use VIEWER coordinates.
Material autoatlasAlphaMode and autoatlasDoubleSided preserve transparency and culling.
The export command stages a new GLB and manifest; it never publishes or verifies it.
Read docs/FREE_AUTHORING.md for commands, FreeCAD handoff and evidence requirements.
''')
points = [obj.matrix_world @ Vector(corner)
          for obj in scene.objects if obj.type == 'MESH' for corner in obj.bound_box]
if points:
    minimum = Vector([min(p[i] for p in points) for i in range(3)])
    maximum = Vector([max(p[i] for p in points) for i in range(3)])
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_location = (minimum + maximum) / 2
                area.spaces.active.region_3d.view_distance = (maximum - minimum).length * 1.5
                area.spaces.active.region_3d.view_rotation = Quaternion((0.82, 0.55, 0.08, 0.12)).normalized()
                area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.file.pack_all()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output), compress=True)
print(f'Saved editable assembly: {output}')
