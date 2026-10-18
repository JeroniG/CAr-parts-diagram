# Complete-vehicle milestones

Both milestones are required. **Neither is complete.** The software can inspect mapped models, but no reviewed 2015 U.S. gasoline 451 vehicle geometry is published. The whole-vehicle inventory is still open.

The app now starts at **Whole Vehicle**, with a visible missing-geometry state. Use **Vehicle progress** to inspect both milestones, required areas, sourced catalog coverage and component modeling tasks. The 21-part hatch remains an explicitly selected development sample.

## Current evidence

- 162 catalog part records / definitions / instance records, plus 14 assembly records. Some records describe groups, so this is not a proven count of distinct physical pieces.
- 14 newly referenced identities from the [manufacturer's 2015 gasoline manual](https://www.mbusa.com/content/dam/mb-nafta/us/smart/manuals/2015/owners_manual.pdf), each with a printed-page locator. Identity references do not establish OEM numbers, exact equipment fitment, dimensions or quantity.
- 0 reviewed, scaled production part models; 0 validated installed part transforms; 0 confirmed replacement fitments; 0 published verified service procedures.
- 3 development GLBs, 75 distinct sample component groups. The editable Bforartists hatch project duplicates an existing sample; it adds no verified geometry.
- The new versioned package is `2026-10-18.2`; `2026-10-18.1` remains available unchanged.

## Missing deliverables

| Required area | Missing asset and evidence |
| --- | --- |
| M1 complete exterior | Licensed 451 facelift coupe body surfaces, separate panels, glass, lamps, wheels/tires, selected U.S. equipment and validated installed datums. Manufacturer exterior dimensions alone do not define surfaces. |
| Engine | Correct engine variant, complete internal inventory, casting/internal geometry, measured axes, mounting geometry and material references. |
| Transmission/clutch | Correct gearbox variant; case, gears, shafts, bearings, differential, clutch and actuator geometry; measured linkage and installation datums. |
| Front/rear suspension | Springs, dampers, arms, axle, hubs/bearings and bushings, with pivot coordinates, limits and mounting dimensions. |
| Braking | Front disc and rear drum internals, hydraulic units, lines, cables, brackets and installed routing. |
| Steering | Column, rack, joints, tie rods and controls; axes, travel limits and mounting coordinates. |
| Cooling/HVAC | Radiators, housing, ducts, compressor and heat exchangers; hose/pipe routing and connections. |
| Electrical | Variant-specific modules, connectors, harness routes, clips and equipment inventory. |
| Chassis/underbody | Structural surfaces/cross-sections, underbody panels and mounting hole patterns referenced to body datums. |
| Interior | Trim-specific dash, controls, seats, restraints, carpet, trim, brackets and attachment locations. |
| Doors/glass/hatch | Accurate shell and trim surfaces, glass curvature, hinge/latch coordinates, seals, strut end fittings and hardware. febi 30351 dimensions are a reference lead, not validated installed geometry or selected-vehicle fitment. |
| Fuel/exhaust | Tank/filler/vapor inventory, lines, pipes, heat shields, hangers and attachment coordinates. |
| Wheels/tires | Correct wheel design, tire surfaces, hub interface and offsets. |
| Hardware | Configuration-specific quantities, thread/size/length, bracket geometry and mounting locations. No invented fasteners or torque values. |

For every area, obtain redistribution rights for browser-delivered source geometry/textures, configuration/VIN restrictions, component IDs and hierarchy, measured scale/placement, and recorded human review. Photo references alone cannot establish these requirements.

## Discovery and authoring workflow

Run `npm run audit:vehicle` to scan `public/models`, `public/vehicles`, `assets` and `.imports`. It checks mapped asset metadata and hashes, lists local geometry files, and produces [the per-component report](reports/smart-451-completion.json). It does not certify shape, fitment or measurements and does not perform online searches.

Each task records missing geometry/placement/applicability, system-specific measurements, source references and discovery findings. A system-level reference is explicitly **not** a completed component-specific CAD search. Remaining individual searches are labeled pending. Search failures are not silently converted into successful modeling steps.

Use legitimate free, no-sign-in sources first. Record candidate license, compatible variant, geometry inventory, scale and placement evidence. Reuse [the sourcing audit](ASSET_SOURCING.md) rather than repeating excluded downloads. No model was imported during this expansion: available local assets remain unverified samples; reviewed external candidates still fail access, rights, variant or geometry requirements.

Where no candidate exists, the task stays open for measured manual modeling. [Bforartists workflow](FREE_AUTHORING.md) supports editing the mapped hatch sample and GLB export. STEP/FreeCAD conversion and production-quality geometry still need source data and validation; installed free software does not supply the missing CAD.

Use the existing [vehicle importer](VEHICLE_IMPORT.md) and assembly importer for validated, separately mapped GLBs. Import staging cannot itself close a milestone. A completion review must establish inventory scope, identities, licensing, dimensions, installed transforms and interaction checks. Browser modeling notes are local drafts and cannot change reviewed status.

## Required visual acceptance

| Requested screenshot | Current result / exact blocker |
| --- | --- |
| 1–4: assembled front, side, rear and top | Blocked by missing accurate complete 451 exterior geometry. |
| 5: complete vehicle X-ray | Blocked by missing full vehicle and mechanical assemblies at validated installed positions. |
| 6: supported exploded assemblies | Existing hatch screenshot demonstrates the interaction on a labeled sample only. Accurate assembly geometry and authored validated exploded transforms are missing. |
| 7: engine compartment | Blocked by missing engine, surrounding compartment and mounting geometry. |
| 8: suspension and brakes | Blocked by missing axle-specific suspension/brake parts and mounting datums. |
| 9: interior | Blocked by missing selected-trim cabin geometry. |
| 10: selected matching part | Hatch strut capture demonstrates stable catalog selection on the sample. Verified physical geometry and exact selected-vehicle fitment are still missing. |

Do not substitute hatch screenshots as acceptance of accurate vehicle geometry.

Actual captures of the current Whole Vehicle missing-asset state and progress panel are software evidence only. Existing hatch captures remain labeled demonstration geometry. Physical GPU/mobile rendering and photorealistic acceptance remain unverified.

## Actual application evidence

Run `npm run capture:progress` and `npm run capture:workspace` against the development server. Captures come from Chromium/SwiftShader, not generated imagery.

- [Whole Vehicle, missing asset](screenshots/completion-whole-vehicle.png)
- [Both required milestones and coverage](screenshots/completion-milestones.png)
- [Component modeling requirements](screenshots/completion-modeling-task.png)
- [Short-phone entry](screenshots/completion-phone.png)
- [Labeled hatch explosion sample](screenshots/workspace-c-exploded.png)
- [Labeled isolated sample and matching catalog selection](screenshots/workspace-e-focus.png)

78 unit tests pass, including open-inventory false-completion guards, rejecting malformed review evidence, preserving separate definition/instance counts, requiring assembled-vehicle mapping and a 10,000-instance catalog lookup. The 22 affected desktop/mobile regressions pass; the final two modeling-queue scenarios also pass. Existing geometry validation passes with 0 reviewed production models. The initial browser failure exposed non-clickable missing-asset buttons inherited from the loading overlay; those buttons were fixed and rechecked. See the pull request for the full CI result.
