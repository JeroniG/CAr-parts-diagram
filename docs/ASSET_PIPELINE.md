# Adding licensed vehicle geometry

## Acquisition gate

Obtain a creator-approved CAD/scan/artistic model that explicitly permits redistribution in a downloadable web GLB. Keep invoice/license version, author, source URL, acquisition date, attribution requirements and any restrictions. Obtain independent confirmation that the source is actually a U.S. 451 gasoline coupé, not a 453 or Electric Drive vehicle. A screenshot or listing title alone does not validate every component.

The current original asset is Tier C. To move a component to Tier B, retain legitimate photographs/measurements or illustrations, record comparison views and reviewer limitations. Tier A requires licensed engineering data or dimensional verification with evidence. Overall vehicle dimensions do not make internal geometry verified.

## Prepare

1. Review `docs/REFERENCE_REVIEW.md` and acquire a physical/reference asset, with rights recorded in `ASSET_LICENSES.md`.
2. In Blender, normalize source units to metres, Z-up, front toward -Y. Validate vehicle envelope and wheelbase against configuration-specific references. The glTF export converts to +Y up, +Z front.
3. Model physically meaningful components with measured pivots and contact surfaces. Preserve original transforms. Avoid labeling arbitrary mesh islands as service parts.
4. Create a mapping JSON containing `vehicleConfigId`, `license`, `redistributionAllowed` and a `components` object mapping stable IDs to Blender mesh names.
5. Use the tested [free Bforartists workflow](FREE_AUTHORING.md) to prepare an editable project and stage a compressed export. The lower-level `prepare_blender.py` also accepts an existing source `.blend`: `blender --background --disable-autoexec source.blend --python-exit-code 1 --python scripts/prepare_blender.py -- --mapping component-map.json --output prepared.glb`. Prefer `componentRoots: {stableId: objectName}` to preserve existing hierarchy and animation; the older `components` mesh-list mapping is restricted to static, unconstrained sources. Source units, mesh existence, duplicate/nested assignments, dependencies and texture paths are checked. The source blend is never overwritten. Actual Bforartists round-trip results are recorded in FREE_AUTHORING; standalone Blender versions have not been run here.
6. Write an asset manifest with the same contract as the current manifest: provenance, permission, version, SHA-256, units, orientation, geometry tier and semantic bindings with original bounds/transforms. Map the GLB's top-level semantic roots; a component may contain many mesh children.
7. Validate before and after compression. The original demonstration is rebuilt with:

```sh
npm run export:model
npm run optimize:model
npm run export:catalog
npm run validate:assets
```

Optimization deduplicates and welds geometry, quantizes and Meshopt-compresses it while verifying that all named nodes survive. Do not flatten or merge across component boundaries. Local Meshopt decoding avoids a CDN dependency. Current sample materials use no image textures. A local KTX2 decoder is configured for imported assets; Draco is not configured. Verify any imported texture compression with the actual asset before release.

## Validate

`validate:assets` checks rights, hash, units, envelope, duplicate bindings, missing semantic nodes, finite vertices and normals, valid vertex indices, referenced textures, animation targets, declared modeled coverage and fitment evidence. These checks do not establish correct physical shapes, manifoldness, topology, exact normals or actual OEM fitment. Have a qualified reviewer compare each component with the source before upgrading a tier.

Keep high/low detail versions bound to the same component identity. Quality settings adjust pixel density, clearcoat, shadows and high-quality GPU ambient occlusion; the hatch has two geometry LODs, both educational rather than dimensionally validated. A new asset should carry per-tier/per-LOD evidence and original file preservation, never silently substitute simplified illustrative geometry for an engineering-verified part.

## On-demand hatch assemblies

`rearHatch.ts` registers high/low manifests and stable part IDs. Both GLBs are Meshopt compressed; low detail is ~567 KiB / 36,890 source triangles and high detail ~1,925 KiB / 147,150 source triangles. Low quality loads the efficient asset; medium/high load the detailed asset. Runtime cancellation prevents stale loads from replacing the current workspace. Replacement assets are SHA-256 checked before parsing. Loading progress, retry, disposal and semantic identity checks apply to both variants.

Rebuild the original **demonstration** assets with:

```sh
npm run export:hatch
npm run export:catalog
npm run validate:assets
```

For licensed replacements, use a manifest based on the current `high.manifest.json`/`low.manifest.json`. Set the real author, source, license evidence, redistribution permission, hash, component bounds/transforms, `assemblyId`, `lod` and `asset.fileUrl`. Every binding must include `explodedTransform.translation` in world metres and `explodedTransform.rotation` in radians. A/B claims require `verificationEvidence` records containing source URL, reviewer and review date; a human still needs to verify the evidence and update corresponding catalog accuracy metadata. The validator cannot determine whether a license or dimension is truthful.

Export a self-contained glTF 2.0 **GLB**, with all textures embedded. The runtime uses GLTFLoader; the import command intentionally accepts the self-contained binary form to avoid silently copying external resources. Keep semantic roots disjoint and normalized; do not nest a bound service part inside another bound part. The importer checks all 21 IDs, unique node names, finite geometry, units, rights metadata, hash and separation transforms. It stages files without overwriting existing files:

```sh
npm run import:assembly -- --model /path/reviewed.glb --manifest /path/reviewed.json --out /tmp/hatch-review
```

After visual/dimensional and rights review, copy both accepted LODs and manifests into the registry's paths (or change those paths), update catalog tiers/evidence, then export the catalog and run asset/unit/browser checks. Do not replace only one LOD with a differently verified model. Stage outputs outside the published directory; this keeps accidental CLI imports from replacing working models.

Keep `motionRig: "illustrative-hatch-v1"` only for the original sample's named strut rig. For replacement geometry, remove that flag and export a normalized animation clip with valid joints. The first imported clip drives the opening slider; the opening control is disabled when no supported rig/clip exists. Repair content is a separate data contract and must not be embedded in animation claims.

KTX2/Basis textures are supported by a local Three.js KTX2Loader, a one-worker transcoder and the shipped Apache-licensed JS/WASM decoder. Author texture compression offline with a suitable Basis/KTX tool; check color spaces, normals and fine labels after compression. No KTX2 image texture or Draco-compressed geometry is shipped or claimed in this sample. Preserve mechanical identifying detail when creating LODs; the original high-resolution source remains authoritative.

## Production package boundary

The existing original car and hatch GLBs are **unverified development geometry**. The permanent 3D workspace displays the explicitly labeled hatch sample until reviewed assets are imported; photos are supporting references. The old primitive car is restricted to an explicit development-only opt-in. To make an additional vehicle searchable, use the vehicle-package CLI in [VEHICLE_IMPORT](VEHICLE_IMPORT.md), not a new React page or a hardcoded viewer import. Both LODs must retain the same physical instance identities. Preserve actual left/right asymmetry; do not mirror steering, intake or fuel hardware for visual convenience.

Provide a reviewed exterior envelope, separate panel/glass/lamp/wheel groups, material/texture evidence and assembly-specific internals. An exterior shell cannot enable internal inspection merely by setting a UI flag. For the first hatch, the expected component catalog, approximate relationships and unresolved geometry are listed in HATCH_REFERENCES. Never promote the original procedural sample to Tier A/B by changing a label; record independent dimensional/visual review and replace inaccurate geometry.

Official API references checked against the installed Three.js 0.180 code: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) and [color management](https://threejs.org/manual/en/color-management.html). The stack was retained; no dependency/framework migration was necessary.
