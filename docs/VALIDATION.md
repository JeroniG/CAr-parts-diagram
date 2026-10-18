# Validation record

Validation performed October 17, 2026 (America/Los_Angeles) in the supplied Linux workspace, Node 24.21.0.

## Completed checks

- TypeScript strict checking and ESLint pass.
- Asset validation passes for 56 component mappings, 140 deduplicated mesh primitives and 139 catalog records. Checks include source/license metadata, redistribution permission, SHA-256, finite geometry and normals, units/envelope, indices, semantic node mapping, textures/animation targets and fitment evidence.
- Vitest: catalog/search/hierarchy/fitment/VIN boundaries, collision-separated inventory/radial target bounds, exact reassembly, mechanism states and touch selection.
- PGlite PostgreSQL: migration and seed load successfully. Tests reject cycles, missing source foreign keys, configuration mismatch and verification without a date; RLS is enabled on all 12 tables with no public write policy.
- Production build succeeds. Three.js is a separate chunk; the build reports its expected >500 kB uncompressed chunk warning. GLB is approximately 0.64 MB and has 91,744 source triangles before floor/grid rendering.
- Dependency audit after updates reports zero known vulnerabilities at validation time.

## Browser coverage

Playwright uses Chromium 156.0.8078.4 with SwiftShader software rendering and the reduced-motion preference for deterministic camera assertions. Representative captures use normal motion. Desktop viewport: 1440 × 1000. Mobile emulation: iPhone 13, 390 × 844. Functional tests inspect actual Three.js visibility, original/current positions and camera state through a development-only read-only snapshot API; this API is not enabled in production.

Scenarios cover startup/rendering, search, sourced OEM evidence with unknown fitment, unmodeled components, inherited system hiding, isolation, explosion and reassembly, inventory, camera presets/zoom, lesson playback/scrubbing, X-ray/sections/theme/quality, keyboard focus, mocked VIN mismatch, missing asset and WebGL failure. Mobile tests keep the 3D viewport visible above sheets. No real VIN is sent by automated tests.

Final browser run: **29 passed, 1 intentionally skipped, 0 failures, 0 flaky tests** across 30 desktop/mobile cases. The skipped desktop case verifies mobile-only sheet layout. The CI artifact retains failure traces if a future regression occurs. Screenshots are actual application renders under `docs/screenshots/`; they are not substituted for interactive geometry.

## Performance and limits

The initial procedural spring paths unnecessarily produced 221,632 triangles. After capping curve sampling and reducing redundant subdivisions, the model is 91,744 triangles while retaining all 56 semantic groups. Meshopt reduces the 5.43 MB raw GLB to roughly 0.64 MB. Camera-only motion reuses the shadow map and idle frames skip rendering. Model quality adapts to software rendering and slow auto-rotation; users can override it.

The final production-build capture measured **8 animation frames over 8.54 seconds (0.94 frames/second)** during auto-rotation at low quality and a 1440 × 1000 viewport; the status bar rounded this to 1 render FPS. This constrained SwiftShader environment is slow. These measurements are software-renderer observations, not validation of the 60 FPS desktop or 30 FPS phone targets. Raw measurements are in `docs/screenshots/metadata.json`. Physical GPU desktop/mobile testing is still required. FPS appears in the app during continuous auto-rotation; idle on-demand rendering is not represented as an active frame-rate benchmark.

Not executed: Blender preparation script (Blender unavailable), external Supabase project migration, live production deployment, real VIN service integration, Safari/Firefox, physical pinch gestures, screen-reader user testing, exact CAD dimensional verification, factory mechanical timing and exact OEM fitment. The original geometry remains Tier C regardless of automated test results.

## Final unit result

29 tests passed across four files, including six PostgreSQL tests and an imported-animation timeline test. Competing Chromium processes previously caused memory-related worker termination in this constrained workspace; the final run passed with no browser tests running. The committed configuration uses one unit-test worker.
