# Adding licensed vehicle geometry

## Acquisition gate

Obtain a creator-approved CAD/scan/artistic model that explicitly permits redistribution in a downloadable web GLB. Keep invoice/license version, author, source URL, acquisition date, attribution requirements and any restrictions. Obtain independent confirmation that the source is actually a U.S. 451 gasoline coupé, not a 453 or Electric Drive vehicle. A screenshot or listing title alone does not validate every component.

The current original asset is Tier C. To move a component to Tier B, retain legitimate photographs/measurements or illustrations, record comparison views and reviewer limitations. Tier A requires licensed engineering data or dimensional verification with evidence. Overall vehicle dimensions do not make internal geometry verified.

## Prepare

1. Review `docs/REFERENCE_REVIEW.md` and acquire a physical/reference asset, with rights recorded in `ASSET_LICENSES.md`.
2. In Blender, normalize source units to metres, Z-up, front toward -Y. Validate vehicle envelope and wheelbase against configuration-specific references. The glTF export converts to +Y up, +Z front.
3. Model physically meaningful components with measured pivots and contact surfaces. Preserve original transforms. Avoid labeling arbitrary mesh islands as service parts.
4. Create a mapping JSON containing `vehicleConfigId`, `license`, `redistributionAllowed` and a `components` object mapping stable IDs to Blender mesh names.
5. Run `blender source.blend --background --python scripts/prepare_blender.py -- --mapping component-map.json --output prepared.glb`. The script validates basic source units, mesh existence, duplicate assignments and texture paths, creates semantic roots and exports materials, extras and animations. It never saves over the source blend. Blender was not available for execution in this delivery; validate the script with your installed Blender version.
6. Write an asset manifest with the same contract as the current manifest: provenance, permission, version, SHA-256, units, orientation, geometry tier and semantic bindings with original bounds/transforms. Map the GLB's top-level semantic roots; a component may contain many mesh children.
7. Validate before and after compression. The original demonstration is rebuilt with:

```sh
npm run export:model
npm run optimize:model
npm run export:catalog
npm run validate:assets
```

Optimization deduplicates and welds geometry, quantizes and Meshopt-compresses it while verifying that all named nodes survive. Do not flatten or merge across component boundaries. Local Meshopt decoding avoids a CDN dependency. Current materials use no image textures; KTX2 and Draco are not configured or claimed. Introduce those only alongside checked-in decoders and texture/animation/identity regression checks.

## Validate

`validate:assets` checks rights, hash, units, envelope, duplicate bindings, missing semantic nodes, finite vertices and normals, valid vertex indices, referenced textures, animation targets, declared modeled coverage and fitment evidence. These checks do not establish correct physical shapes, manifoldness, topology, exact normals or actual OEM fitment. Have a qualified reviewer compare each component with the source before upgrading a tier.

Keep high/low detail versions bound to the same component identity. Quality settings currently adjust pixel density, clearcoat and shadows; there are no independently validated LOD models yet. A new asset should carry per-tier/per-LOD evidence and original file preservation, never silently substitute simplified illustrative geometry for an engineering-verified part.
