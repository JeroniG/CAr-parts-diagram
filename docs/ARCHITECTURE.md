> Current workspace correction (18 October 2026): `SceneCanvas` is permanent across modes. `ReferenceDialog` hosts photos separately. An original, labeled hatch sample is the only default fallback; the old whole-vehicle fixture remains explicit development-only. Published geometry coverage remains independent. Directional, bounds-aware cutaway logic lives in `scene/controls/cutaway.ts`; X-ray uses explicit exterior IDs. No radial whole-vehicle explosion is generated. Details and limitations: `ASSET_SOURCING.md`, `WORKSPACE_VALIDATION.md`.

# Architecture

The existing React/TypeScript/Vite/raw Three.js stack is retained. There is one application, not a separate page or viewer for each vehicle. The dark/blue shell surrounds a persistent WebGL scene. Supporting photographs and diagrams open in a separate dialog, preserving the model and camera.

## Active data and vehicle resolution

`ApplicationRoot` owns the active `VehiclePackage`, supported registry, load/error state and request cancellation. `CatalogProvider` supplies package-scoped search, hierarchy, visibility, source and fitment helpers. `createCatalog` builds indexes from any catalog dataset. Static exports remain for legacy development generators and tests, not for the live selection context.

A registry entry pins configuration, revision, manifest URL and hash. A package pins catalog content, photos, diagrams, model variants, assembly definitions, source/provider revisions and service links. `VehicleDataService` validates both hashes and exact configuration identity before committing a switch. Superseded requests cannot replace the selected package. A keyed workspace resets selection, camera, isolation, hidden IDs, animation and assembly state on a vehicle/revision change. The previous catalog remains usable if a new download fails.

Local search returns all matching configurations; the user explicitly selects a candidate. Optional NHTSA vPIC supplies identity attributes only. Unsupported requests are stored locally and exportable; VIN requests are masked. The production registry contains one real configuration. Browser tests inject a synthetic second package to prove the same UI and services work with distinct identities and two physical instances sharing one definition.

## Independent data boundaries

- `VehicleConfiguration`: model year, generation, market, powertrain, trim, dimensions or null, and source references. Not a fitment assertion.
- `Component`: tree node with stable ID and vehicle/system/parent scope. `PartDefinition` is a catalog identity; `PartInstance` is an independently selectable physical occurrence.
- `SourceRecord`, `OEMPart`, `PartFitment`: source, manufacturer identifier and configuration-scoped applicability are distinct. Verified fitment requires dated evidence. No part number is derived from a callout.
- `PhotoAsset` / `DiagramAsset`: original source, license, hash, dimensions and applicability. Authored photo markers and revision-specific diagram callouts map to stable instance IDs.
- `ModelAsset` / `MeshBinding`: source rights, review record, units, hash, semantic roots and original bounds/transforms. Geometry evidence is distinct from catalog identity and replacement compatibility.
- `AssemblyDefinition`: independently loaded variants, component relationships, authored separation and motion metadata. `repair_procedure` is separate and empty in this release.

Coverage is computed from the active published package. C means reference/catalog coverage and D identification only. B requires reviewed mapped models. A requires every catalog part instance and assembly to have corresponding model coverage; it describes only that catalog's scope, not a factory-complete vehicle. The baseline has 148 catalog parts and zero reviewed model bindings. Development geometry never contributes to public coverage.

## View state and rendering

`App` owns typed `ViewState` plus presentation mode, active camera preset and panel state. State explicitly tracks selection, assembly, visibility/isolation, opacity, explosion, clipping, animation, quality and fixture opt-in. All panels and viewport callbacks use the same stable IDs.

`PhotoViewport` displays actual raster references; it is not a fake 3D image. Selection, authored markers, zoom, pan and catalog navigation work without WebGL. Gallery scope and rights stay visible. Diagram callouts are figure-specific and do not identify OEM numbers. No Smart service diagram has been licensed.

`SceneCanvas` is loaded lazily. It creates and disposes `Viewer` with a package-scoped dataset. A labeled original hatch interaction sample is available in development and production builds, outside published geometry coverage. The original primitive whole vehicle is available only through explicit development opt-in. Production builds still reject synthetic vehicle packages and ignore the legacy vehicle query parameter.

Scene lifecycle:

1. Load a self-contained GLB/manifest with configuration, license, units, hash and semantic validation; abort superseded requests. Locally hosted Meshopt/KTX2 decoders are supported.
2. Preserve source node and animation transforms inside centered origin shims. Reject ambiguous or nested selectable roots. Meshes inherit their exact instance ID, not a substring or material name.
3. Clone materials per part/material; cache original PBR properties. Selection, dimming and transparency do not replace every surface with one generic material.
4. Cache immutable original positions. Authored assembly targets and elapsed-time explosion controllers interpolate without cumulative drift. 0% restores exact endpoints. Inventory layout is a display arrangement, not a repair trajectory. Mechanical separation always uses authored vectors; there is no generated radial fallback.
5. Use bounded orbit/pan/zoom and smooth reduced-motion-aware camera transitions. Raycasting excludes hidden/clipped objects; the component tree supports small/unmodeled parts and keyboard selection.
6. Load assembly geometry only when requested. Swap complete validated content, retain selection across detail changes, expose retry on failure, and dispose the old assembly after a successful swap. Exiting cancels pending loads.
7. Render on demand; reuse shadows for camera-only movement. Low/medium/high quality control resolution and material/shadow cost. High hardware rendering may enable lazy GTAO/MSAA/output passes; software rendering uses the simpler path.
8. Unmount releases geometry, materials, textures, render targets, animation controllers, decoder workers, event listeners and animation frames.

`ExplodedViewController`, `MaterialManager`, `MeasurementController`, `RenderPipeline`, loader and animation modules separate transformations, appearance, input and resource lifetime. Measurement uses actual raycast endpoints, and clears when transforms change. Production measurement requires scale validation. The sample's distances and hinged hatch/strut motion are explicitly illustrative.

## Persistence and publication

The public app boots from `initialVehicle.json` and refreshes the registry. Imports publish local versioned directories and atomically update `registry.json`; reports and staging live under ignored `.imports`. The importer checks actual files, hashes, rights records, hierarchy, identities, geometry and mappings. It cannot verify that an editorial assertion is true. Revisions are immutable; retries reuse identical staged files. Run one publisher at a time.

PostgreSQL migrations 001–003 provide normalized catalog/source/fitment, assembly/repair, part definitions/instances, versions, registry and private import-job tables. Twenty tables have RLS; public content has SELECT-only policies and job reports have no public policy. The seed remains an educational catalog including development asset evidence; the production manifest independently excludes those models. The filesystem importer does not synchronize a remote database.

No external database, paid parts/service connector, authenticated editorial server or production CAD asset is provisioned. See PROVIDERS, VEHICLE_IMPORT, ASSET_PIPELINE and PROGRESS for connection and asset requirements.
