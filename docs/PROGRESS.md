# AutoAtlas upgrade progress

Updated October 18, 2026. The latest attached brief and approved reference supersede the earlier default demonstration-car presentation.

## Implemented

- Retained React 19 / TypeScript / Vite 7 / raw Three.js 0.180, existing catalog/inspector functions, WebGL interactions, lesson, deployment configuration and tests. No framework migration.
- Charcoal/blue shell, light theme, large reference/model viewport, compact contextual controls, resizable desktop panels and mobile sheets.
- Public photo/catalog fallback with two attributed CC BY-SA photographs, authored linked hotspots, zoom/pan, source links and explicit European 2011 reference scope. The old car is opt-in development geometry, unavailable in production.
- Package-scoped catalog services, versioned vehicle registry and exact-identity/hash validation. Local search returns candidates; optional vPIC identifies VIN attributes without establishing fitment. Missing coverage requests can be saved/exported locally without storing a full VIN.
- Typed definitions and physical instances; figure-specific diagram callouts; coverage computed separately from fitment. All approved presentation modes share one state and give an honest fallback if content is missing.
- Local provider adapters and configuration states; bounded/retryable/cancelable HTTP, memory cache, recorded provider revisions and stale dates.
- Local administrator import, staging reports, resumable copies, immutable revisions and atomic registry publication. Synthetic second vehicle tests the same workflow/UI, including two instances sharing one definition; never added to the production registry.
- 21-part original hatch sample with high/low Meshopt GLBs, stable mappings, HDR/PBR materials, controlled reversible separation, individual rotation, isolated view, context return, two-surface measurement and illustrative hinge/strut kinematics. Separate animation, material, measurement and rendering modules.
- Three PostgreSQL migrations: source/fitment evidence, assembly/repair boundaries, part definitions/instances, versions, registry and private import jobs. Static JSON remains the active backend; no remote service has been provisioned.

## Verification

Baseline before this upgrade: 29 unit/database tests and 29 browser passes with one intentional mobile-only skip. New hatch integration initially found a slider-step issue and duplicate glTF strut node names; both were corrected. New registry tests caught a VIN-query filtering issue, also corrected.

Current unit result: **59 passed across 7 files**, including import CLI staging/repeat publication/revision immutability/hash rejection, schema/coverage/provider boundaries, original interactions and PostgreSQL migrations/seed. Asset validation passes for 3 GLBs, 75 unique development component groups, 216 mesh primitives, 162 catalog records, both hatch LODs, HDR/license and the public photo/catalog package. Full browser suite: 57 passed and one intentional desktop skip; after component extraction, 16 affected desktop/mobile scenarios passed again. Production build passes. Production safeguards passed; real desktop/mobile screenshots were captured with zero page errors. The current low-detail hatch benchmark measured 1.85 FPS on SwiftShader; physical GPU targets remain unverified. See VALIDATION.md.

## Missing content and external dependencies

- No redistribution-approved, accurate 2015 U.S. 451 gasoline full-vehicle or rear-hatch CAD/scan. **The photorealistic asset milestone is not complete.** Public coverage is C: 148 catalog parts, two reference photos, zero reviewed 3D parts.
- No licensed Smart service diagram or repair procedure; no verified VIN/equipment-specific fitment dataset. All three existing OEM fitment records remain unknown.
- No paid provider credentials, external catalog synchronization, authenticated editorial UI or production database/deployment. vPIC is an optional identity service only; automated tests mock its responses.
- No physical-GPU/phone performance benchmark, Safari/Firefox or assistive-technology user validation. Blender was unavailable. KTX2 infrastructure is present but no KTX2 production model has been tested.

## Next concrete tasks

1. Acquire a properly licensed 451 gasoline coupe exterior and separated hatch model with independent geometry/scale review; preserve exact configuration, instance mappings, PBR textures and both LODs.
2. Run the documented import, compare measured/reference views, and enable only the modes supported by actual published geometry. Never relabel the sample as verified.
3. License applicable diagrams, service information and fitment sources; implement server-side provider access and editorial review before publication.
4. Benchmark real GPUs/phones, validate compressed textures and Blender exports, and audit keyboard, screen-reader and physical-touch behavior.

The supplied concept collage guides the interface only. Its mechanical placement, part numbers and repair text are not evidence. Exact implementation, import and rights instructions are in README, ARCHITECTURE, VEHICLE_IMPORT, PROVIDERS, ASSET_PIPELINE and ASSET_LICENSES.

## Permanent 3D correction — current work

The later correction supersedes the photo-first default described above. The canvas now remains mounted across modes and reference dialogs. The default is the clearly labeled 21-part hatch sample, including production preview, until reviewed assets arrive; the old primitive vehicle remains explicit development-only. Front/rear/left/right/upper cutaways use installed bounds with exterior-only clipping by default. X-ray uses explicit exterior IDs, blue selection retains per-part materials, and unsupported whole-vehicle explosion is disabled instead of generating radial scatter. Supporting photographs, all 148 catalog parts and source evidence remain intact. See WORKSPACE_VALIDATION.md for current checks and ASSET_SOURCING.md for the asset dependency.
