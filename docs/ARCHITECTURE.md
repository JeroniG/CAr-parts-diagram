# Architecture

`App` owns the serializable interaction state. `Viewer` owns renderer, GPU resources, camera, controls, picking and model transforms. React does not rebuild scene geometry during state changes. `SceneCanvas` creates/disposes the scene and forwards events through refs. The source generator is used only during asset preparation; the browser loads a local GLB.

## Data boundaries

- `VehicleConfiguration` defines an exact baseline. It is not a VIN-derived fitment assertion.
- `VehicleSystem` and `Component` define arbitrary-depth catalog structure; stable IDs are not mesh UUIDs.
- `ModelAsset` records rights, version and hash. `MeshBinding` maps a semantic group containing multiple mesh nodes to one component and records assembled bounds/transforms. Unmodeled entries have no binding.
- `OEMPart` records a sourced manufacturer identifier. `PartFitment` is a separate, configuration-scoped evidence claim. `SourceRecord` documents where a statement came from and what may be redistributed.
- `ComponentRelationship` records a physical/functional relationship independently of parentage. `MechanismAnimation` documents explanatory or verified animation separately from mesh accuracy.

## Scene lifecycle

1. Registry supplies configuration, model URL and manifest URL.
2. Loader checks units and license permission, loads GLB using the locally bundled Meshopt decoder, checks semantic paths and preserves world-space transforms while creating centered selection groups.
3. Scene clones materials for independent selection/transparency. It caches original positions and bounding sizes.
4. Inherited visibility and isolation produce the current visible set. Explosion uses that set only. Radial targets resolve bounding-box intersections; inventory slots guarantee separated horizontal bounds. Intermediate positions are interpolation, not collision-free mechanical removal trajectories.
5. Camera fits projected bounds. The interior preset is an intentional interior viewpoint. Ground is hidden in underbody view.
6. Pointer raycasting excludes hidden and clipped geometry. Mostly transparent exterior surfaces allow selection through them. The keyboard-accessible tree selects small and unmodeled entries.
7. Rendering happens when controls, camera transitions or model state change. Idle frames skip GPU rendering. Camera-only movement reuses the shadow map.
8. Unmount disposes geometry, materials, render targets, controls, listeners, observer and animation frame.

The current educational lesson uses a normalized timeline. An `ImportedClipController` adapts an actual glTF clip to the same normalized timeline; component origin shims preserve source node transforms and animated roots must have normalized parent transforms; no factory glTF animation is shipped. The model does not depict gear internals or actuator internals. Exploded positions remain reversible and do not overwrite original positions.

## Persistence

`catalog.source.ts` is the reviewed authoring source. `npm run export:catalog` emits the bundled `catalog.snapshot.json`, public JSON export and normalized PostgreSQL seed. The UI reads the bundled JSON with no network dependency. `db/migrations/001_catalog.sql` is a PostgreSQL/Supabase-compatible schema with foreign keys, indexes, deferred cycle detection, verification checks and public read-only RLS. No external database is required or provisioned. A future server endpoint can assemble the same snapshot from those tables; this preview does not claim a live Supabase synchronization layer.

## Extension contract

Add a configuration and registry definition, audited asset manifest, stable components, bindings and source-backed metadata. A future multi-vehicle release must swap the active catalog alongside the scene and dispose the previous model. Only the 2015 U.S. Passion coupé gasoline configuration is selectable in this release; the registry is extensible, but cross-vehicle switching is not falsely advertised.

Current limitations: no validated per-part LOD meshes, textures or CAD surfaces; quality levels change pixel density, clearcoat and shadows, with software-renderer detection and adaptive reduction during slow auto-rotation. No heavy AO postprocessing, KTX2 texture pipeline, authenticated editorial workflow, backend fitment API or repair procedure repository is shipped. See the roadmap for acceptance criteria.
