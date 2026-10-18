# Permanent 3D workspace validation

18 October 2026. The later correction replaces the earlier photo-first default. This document records actual application behavior, not manufacturer geometry validation.

## Captured application evidence

Run `npm run capture:workspace` against the development server. The checked-in images were captured from Chromium 156.0.8078.4 at 1440×1000, plus 390×844 mobile, using SwiftShader and medium quality. The script uses UI controls and captures the rendered canvas; it does not generate or composite imagery. `screenshots/workspace-metadata.json` records state and zero page errors. All six captures share one canvas ID.

| Required view | Actual capture | Scope |
| --- | --- | --- |
| A — Main | [Main 3D sample](screenshots/workspace-a-sample.png) | **Hatch interaction sample, not a photorealistic complete vehicle.** That asset milestone remains unmet. |
| B — X-ray | [Exterior transparency](screenshots/workspace-b-xray.png) | Explicit sample exterior groups ghosted; available internal sample parts remain opaque. No invented engine/internals added. |
| C — Exploded | [Authored separation](screenshots/workspace-c-exploded.png) | 21 sample parts, authored translations, adjustable 0–100%. No generated radial scatter. |
| D — Cutaway | [Left cutaway](screenshots/workspace-d-cutaway.png) | Bounds-aware exterior clipping, retained internal parts, custom position and all-component option. Visual clipping is not a capped engineering section. |
| E — Focus | [Isolated strut](screenshots/workspace-e-focus.png) | Blue selection, catalog details, independent rotation, precise unknown-OEM disclosure. |
| Mobile | [Mobile exploded sample](screenshots/workspace-mobile.png) | Responsive controls with an unobstructed canvas; the sample warning remains visible. |

## Comparison with the supplied reference

The reference shows a complete realistic vehicle and much richer mechanical detail. Current geometry covers a hatch interaction sample only, with approximate shapes and no validated physical dimensions. It is visibly less realistic and cannot establish fitment or repair procedure. See ASSET_SOURCING.md for exact missing deliverables and reviewed source leads.

The interface now follows the reference's dark blue workspace, left systems tree, center 3D inspection area, right component inspector and bottom controls. The initial screenshot review found detached-part ground shadows and toolbar overlap. Those were corrected: ground shadows are suppressed in detached assembly views, and a ResizeObserver reserves the toolbar's actual height as sliders appear. The header was condensed to give the model more room. The sample uses neutral white paint and blue selection instead of the previous green appearance; neither color claims an OEM specification.

Realism, full-vehicle size in the viewport and detailed full-vehicle X-ray remain limited by missing assets. This is not visual acceptance of the finished digital twin. GPU-only ambient occlusion/transmission and real phone/GPU performance are not proven by software-rendered captures.

## Checks

- TypeScript, ESLint and production build pass. Vite retains its existing large-chunk advisory.
- 65 unit/database/import tests pass across 8 files. New tests verify the correct removed side for all five cut directions, shifted bounds, custom-position clamping and empty bounds.
- Asset validation passes: 3 GLBs, 75 unique development mappings, 216 mesh primitives, 162 catalog rows, both hatch LODs, hashes, semantic roots and HDR provenance. Published coverage remains 148 parts, 2 licensed photographs and 0 reviewed models.
- Production preview passes with the legacy query parameter: one persistent canvas, the labeled 21-part hatch sample, working explosion and reference photographs; no legacy vehicle request and no development snapshot API.
- Final targeted desktop/mobile regression: **8 passed** (2.1 minutes). Covers reference reset, retained canvas across available/unavailable modes, all five cut directions, opacity scope, exact 0% reassembly, slider reopening, strut highlight/isolation/rotation and restoration. Full CI runs the complete 62-scenario suite on the pull request; see its checks for the latest result.

An early development run caught reference reset incorrectly closing its dialog; this was fixed. Live edits interrupted an early canvas-ID/visibility check, so that run is not reported as passing verification. Final checks run against unchanged application code.
