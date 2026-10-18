# Rear hatch: references, geometry and missing evidence

Reviewed October 18, 2026. The selected catalog baseline remains the **2015 U.S. Smart Fortwo 451 gasoline coupé**. Calendar/model-year labels differ by market; a generic 2015 Smart search can return 453 vehicles. The existing configuration and its source limitations are preserved.

## References used

- [Smart USA model 451 technical introduction, printed page 88 / PDF page 89](https://manuals.plus/m/5dfbeec2a8ea90b6b0f31005726b7b352bd997e56e40236270814d95e7507d90.pdf#page=89), diagram P72.20-2599-00. Indexed text identifies upper/lower doors, trim, spoiler, hinges, gas strut, glass, locks, seal, center stop lamp, motor and handle switch. This is a platform introduction, not a VIN-specific 2015 EPC. The hosted PDF blocked direct download; component relationships were checked from indexed text, not claimed as a visual inspection of the original diagram.
- [Used Smart 451 hatch listing and photographs](https://www.ebay.co.uk/itm/156615030681). The viewed external photograph shows a top-mounted rear wiper, high central brake light, spoiler and sloping glazing. The listing specifies 2008–2014; it does **not** confirm 2015 U.S. compatibility or OEM identity.
- [Global Parts rear-glazing photograph](https://globalparts.co.uk/car-glass/A4517540075/smart-fortwo-c451-rear-window-glass-boot-trunk-tailgate-window-glazing-as2-green). Viewed to compare the curved outline, dark ceramic border and surrounding trim. Retailer part-number text was not adopted as a verified OEM reference.

Photographs were inspected as references only. They are not packaged in the repository. Diagram callout labels in the inspector are identification aids, never OEM numbers.

## What is implemented

The original sample has 21 independent component roots: upper carrier and trim, spoiler, two upper hinges, two telescoping struts, glazing, lower exterior panel and carrier, three locks, lower trim, two lower hinges, perimeter seal, center brake lamp, wiper motor, handle switch and wiper arm. Hardware remains searchable but unmodeled because the references do not verify its quantity, dimensions or mounting positions.

The sample adds a curved window outline with ceramic border/heater lines, shaped spoiler, trim ribs, rounded panels, lens grooves, metal pins, rods and differentiated metal/rubber/polymer/paint/glass finishes. These are original authored representations. Measurements, exact curvature, internal latch/motor construction, material grades, pivot coordinates, strut travel/force and 2015 equipment applicability remain **not yet verified**. More polygons or realistic lighting do not change that status.

Opening is a geometric teaching rig: the upper leaf rotates around an upper axis, the lower leaf rotates downward, and struts connect a stationary body endpoint to a rotating hatch endpoint. It illustrates joint relationships. It is not manufacturer motion data, a load simulation or a safe removal sequence. Exploded layers are controlled presentation offsets, not collision-checked repair trajectories.

## Asset package required for an accurate replacement

Supply a properly licensed CAD model or dimensionally reviewed scan of the supported configuration, with explicit browser redistribution rights, author/source/license records and preserved source files. Include:

1. Separately named parts matching the 21 stable IDs, plus verified hardware entries as they become available.
2. Metre-scale geometry in the common vehicle coordinate system, correct installed positions, pivot/contact surfaces and comparison measurements.
3. PBR textures/materials with redistribution rights; a low-detail and high-detail GLB with identical semantic identities.
4. Reviewed separation vectors/rotations; an authored glTF animation for valid hinge/strut behavior. Do not reuse the sample rig flag for unrelated geometry.
5. Evidence mapping each component to equipment/production/VIN restrictions and verified OEM identities where available. Repair instructions require their own licensed, reviewed source.

Use the staging/import workflow in [ASSET_PIPELINE.md](ASSET_PIPELINE.md). No suitable redistributable engineering asset was found during this implementation; current geometry remains Tier C and all hatch part fitments/OEM numbers remain unknown.
