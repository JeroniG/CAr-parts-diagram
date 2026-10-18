# Free model-authoring workflow

The current route uses **Bforartists**, at the user's request to try free tools first. The existing React/Three.js application and its catalog remain intact. This adds an editable source and a tested path back into the viewer; it does **not** create accurate Smart geometry automatically.

## Open the editable hatch

Download [Bforartists from its official site](https://www.bforartists.de/download/), then open [assembly.blend](../assets/authoring/smart-451-hatch/assembly.blend). It contains the original **unverified 21-part high-detail hatch sample**, with named component roots, PBR materials and an `AUTOATLAS_README` text block. No manufacturer CAD or scan is included. License: repository MIT.

Tested with **Bforartists 5.2.0**, whose bundled engine reports Blender **5.3.0 Alpha**. Earlier Blender/Bforartists versions are not covered by this test; the official download page describes compatibility limits. The portable Linux editor was run from `/tmp/autoatlas-tools`, not installed into the application or committed to Git. Its official release archive SHA-256 was checked: `cbd3ddfd1c2a9e6e9659461ba35949d22e06eabfa8b386bdd1c8b501f502aaab`.

## Edit and export

Keep each physical part under its existing named root. Edit or replace the mesh children; do not join unrelated service parts or rename their roots. Keep installed positions. Source coordinates are metres, Z up, -Y vehicle front; glTF converts to viewer +Y up, +Z front, +X vehicle left.

Root custom properties `explodedTranslation` and `explodedRotation` are editable **viewer-space** offsets (world metres and XYZ Euler radians). They control presentation separation, not an official removal procedure. Material custom properties `autoatlasAlphaMode` and `autoatlasDoubleSided` retain explicit transparency/culling intent across editor versions; update these if deliberately changing the surface behavior.

Save an edited copy of the project, then stage an export (replace the editor path for your computer):

```sh
mkdir -p .imports
npm run author:assembly -- export \
  --editor /path/to/bforartists \
  --project assets/authoring/smart-451-hatch/assembly.blend \
  --mapping assets/authoring/smart-451-hatch/component-map.json \
  --out .imports/hatch-edit-1
```

The output includes an uncompressed editor export, a Meshopt-compressed `high.glb`, updated bounds/hash/bindings, a manifest and an authoring report. The command requires a new output directory, leaves the source `.blend` unchanged, disables embedded script auto-execution, and keeps editor preferences inside the output directory. It does not publish files or change catalog coverage. Edited geometry is Tier C until reviewed again; previous verification evidence and the sample's hardcoded motion-rig flag are removed. Export an authored animation if new geometry needs opening motion.

Stage the result through the existing assembly importer:

```sh
npm run import:assembly -- \
  --model .imports/hatch-edit-1/high.glb \
  --manifest .imports/hatch-edit-1/high.manifest.json \
  --out .imports/hatch-review-1
```

The manifest retains proposed publication URLs from its source. They are **not** live URLs for the staged output. Review matching high/low geometry, actual fitment, dimensions and rights before replacing any shipped assets or publishing a vehicle package.

## Prepare another mapped GLB

```sh
npm run author:assembly -- prepare \
  --editor /path/to/bforartists \
  --model public/models/smart-451/rear-hatch/low.glb \
  --manifest public/models/smart-451/rear-hatch/low.manifest.json \
  --out .imports/hatch-low-source
```

This validates provenance/hash and part roots, decodes Meshopt/quantized vertex buffers for editor compatibility, then creates a `.blend`, component map and source manifest. It preserves hierarchy instead of flattening parts. Both detail levels were tested, but only the high-detail editable project is checked in. Use a high-detail source for substantive modeling; prepare a separately reviewed low-detail derivative afterward. The `prepare` command currently accepts a self-contained GLB, not STEP, FBX or external-resource glTF.

## FreeCAD handoff

[FreeCAD's official format documentation](https://github.com/FreeCAD/FreeCAD-documentation/blob/main/wiki/Manual_Import_and_export_to_other_filetypes.md) describes STEP for retaining solids/NURBS and mesh exports for graphics applications. Use FreeCAD for dimensioned parts when measurements or authorized CAD are available. Preserve the native `.FCStd`/STEP source, export individual named bodies to a mesh format, import into Bforartists, and put each under its matching semantic root. Check a known dimension and axis orientation after transfer; OBJ does not reliably convey physical units, so a millimetre source needs an explicit, validated conversion to metres. Do not merge an entire assembly into one STL.

FreeCAD was **not installed or executed** in this delivery. This handoff is guidance, not a claimed tested CAD conversion. Bforartists was the first free tool tested because the immediate task is surface geometry, materials and GLB delivery.

## Verification evidence

Both unedited GLB → Bforartists → GLB round trips passed a comparison of every surface vertex in both directions within **0.01 model mm**, triangle counts, part identities, named nodes and material assignments. PBR checks cover base color, roughness, metalness, effective emission, clearcoat, glass transmission/volume/IOR, alpha mode and sidedness. Maximum component-bound drift was below `0.0000001` metres. This is conversion preservation, **not real-world dimensional accuracy**. Reports: [high](authoring/high-roundtrip.json), [low](authoring/low-roundtrip.json), [export provenance](authoring/high-export.json).

The checks caught and corrected editor changes to glass alpha mode and sidedness. The initial run also exposed editor preferences attempting to write outside the workspace; the command now gives the editor its own resource directory.

```sh
npm run verify:authoring -- \
  --source public/models/smart-451/rear-hatch/high.glb \
  --exported .imports/hatch-edit-1/high.glb \
  --mapping assets/authoring/smart-451-hatch/component-map.json \
  --report .imports/roundtrip-report.json

# With the dev server running; routes only this browser session to staged assets:
node scripts/verify-authoring-browser.mjs \
  --asset-dir .imports/hatch-edit-1 --out .imports/browser-review
```

The surface comparison is intentionally for an **unchanged round trip**; intentional modeling changes should fail it and receive a new dimensional/visual review. Actual browser tests exercise selection, highlight, isolate/rotate/return, X-ray, cutaway and exact reassembly on the exported GLB. The screenshots under `docs/authoring` show the running application with the staged sample, not a photorealistic full vehicle.

The remaining dependency is accurate geometry/reference data: measured hatch outlines and curvature, mounting surfaces/pivots, real strut dimensions and end fittings, and verified 2015 U.S. equipment applicability. The coverage counter correctly remains **0/148 reviewed parts**. Free authoring software provides the means to build these assets; it does not supply those facts.
