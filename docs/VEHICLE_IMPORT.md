# Vehicle package import and publication

This is a local administrator CLI, not a public upload endpoint. It requires authorized source material and an editorial review before publication. It never purchases assets, generates vehicle CAD or upgrades inferred data to verified data.

## Package contract

Use `src/types/vehiclePackage.ts` and the published baseline manifest/catalog as schema examples. Place `manifest.json` and its catalog, raster references, GLBs and model manifests in a package directory. Every imported URL must start with `/vehicles/{configuration.id}/{revision}/`; the remainder resolves inside that directory. Copy licensed media into this versioned package and update its URL and SHA-256. The maintained baseline exporter uses shared photo paths; third-party import packages use self-contained version directories.

Each configuration includes model year, platform, market, body, engine, transmission, trim, source IDs and unknown/null fields. Use a separate ID for different equipment configurations. Configuration identity is immutable once registered. Part definitions can be reused; every physical part instance needs a unique component ID. Instances must reference an existing definition and assembly. Do not use diagram figure numbers as instance IDs or OEM identifiers.

Photo/diagram records require author, original source, license URL, redistribution permission, attribution, dimensions, applicability scope and hash. Raster JPG/PNG/WebP/AVIF only: active SVG/HTML is rejected. Diagrams have revision-specific callout mappings. Photographs have explicitly authored location markers; neither establishes replacement compatibility.

Production model entries require human-reviewed geometry evidence, semantic bindings and explicit mode coverage. Each high/low GLB has an asset manifest with vehicle/assembly applicability, metres, source/license evidence, SHA-256, finite transforms/bounds and recorded reviewer/source/date for Tier A/B geometry. Repeated mesh/material names are not identity. Selectable roots must be disjoint. Embed all textures and buffers; preserve glTF animation targets. Set `scaleValidated` only with dimensional evidence and Tier A geometry. Do not list internal modes for an exterior shell. Model coverage cannot exceed the semantic bindings. The importer checks records and geometry; it cannot establish the truth of a human review.

Assembly definitions reference the matching model variants and stable component IDs. Original transforms remain immutable; explosion translation/rotation is authored in vehicle axes. See ASSET_PIPELINE for normalization and Blender preparation. Do not attach the sample hatch rig to unrelated assets. Use valid authored glTF clips for other mechanisms.

Service references are separate from model data. They must identify the applicable component, source and scope. Link complete authorized source instructions, including prerequisites. No service procedures are included with the current package.

## Commands

```sh
npm run import:vehicle -- --package /absolute/path/reviewed-package
npm run import:vehicle -- --package /absolute/path/reviewed-package --publish
npm run validate:assets
npm run build
```

The first command writes `.imports/{id}/{revision}/report.json` and validated staged files. It reports identity/hierarchy, evidence, image rights/signatures/hashes, geometry, mappings, scale declarations and textures. Size budgets: manifest 5 MB, each file 200 MB, complete package 500 MB. Path traversal, encoded escapes and symlinks outside the package are rejected.

Run the same command to resume after fixing errors. Identical staged files are reused. Repeated publication does not duplicate catalog records or registry entries. A changed already-published revision is rejected; publish a new revision. Corrupt existing published files are rejected rather than silently declaring success. Publication first prepares a complete version directory, then atomically renames the registry file. A failure before registry replacement leaves the previous registry authoritative. A crash can leave an unreferenced version directory; it is not an active vehicle.

Run one publisher at a time. This filesystem workflow is not a distributed locking/transaction service; put an exclusive queue and administrative authentication around a future server implementation. Never run a browser-supplied shell command. External provider credentials belong in that future server, not `VITE_*` variables.

`--public-root /tmp/test-output` is for isolated verification. Development fixtures cannot be published to the normal public root, and production clients reject manifests marked `fixture`. This package rule does not prohibit the separately labeled, original built-in hatch interaction sample, which never contributes to reviewed coverage. `tests/fixtures/vehiclePackage.ts` supplies a synthetic second vehicle solely for import/UI tests. It deliberately has no real automotive specifications or OEM numbers.

## Updates and stale content

A registry entry pins the manifest hash/revision; the manifest pins its catalog hash and media/model evidence. Provider revisions include retrieval and optional stale dates, visible in Settings. The browser caches up to four complete packages by manifest hash. Requests have a 12-second timeout, retry HTTP 429/503 once with a bounded delay, and honor cancellation. Switching vehicles only commits a fully validated package. Offline registry failure retains the bundled baseline and reports this in vehicle search.

The baseline `export:vehicle` command is an authoring/build generator, not an editorial publication history service. Once distributing new baseline content, increment its revision before release. PostgreSQL migration 003 supplies separate definitions/instances, version/registry records and private import-job storage for a future server adapter; the local CLI does not synchronize that database.

### Authored viewpoints and memory budgets

`cameraPresets` stores position/target vectors in vehicle coordinates; `modeCameras` selects a preset for a presentation. Production interior mode requires an authored cabin camera. `exteriorComponentIds` defines groups that can become transparent; a different vehicle does not inherit Smart-specific exterior IDs or the Smart cabin viewpoint. Assembly URLs must match the reviewed model declaration, and exploded/disassembly modes require a separation transform for every bound instance.

The full-vehicle overview starts with its low-detail variant. Detailed assemblies select actual low/high GLBs according to graphics quality. Model textures must report finite dimensions at most 8192 pixels per edge, with at most 512 MiB estimated decoded RGBA storage per asset. Reference images have the same maximum declared edge size. These budgets are safeguards, not target performance or permission to use oversized textures everywhere; prefer 1K/2K overview textures and load detailed material maps only where justified.
