# Smart 451 asset audit — 18 October 2026

Target: 2015 U.S. Smart Fortwo 451 gasoline coupe. This audit does **not** establish exact trim/VIN fitment from appearance.

## What is installed

| Asset | Scope | Status |
| --- | --- | --- |
| `educational-v1.glb` | 56 selectable vehicle groups | Old original MIT procedural fixture. Explicit local development query only; never the default vehicle. No authored whole-vehicle explosion. |
| `rear-hatch/{low,high}.glb` | 21 separate parts, authored separation offsets | Original MIT Tier C interaction sample. Default while reviewed assets are missing. Dimensions, motion, materials and fitment unverified. |
| Two licensed M93 photographs | Exterior of a European 2011 facelift 451 | Supporting references; not proof of 2015 U.S. equipment. Attribution retained. |
| Published vehicle manifest | 148 catalog part instances | No reviewed model entries. **0/148 reviewed geometry is correct.** The 21 sample mappings are reported separately. |

No accurate whole vehicle CAD, rear-hatch scan, validated interiors, engine, transmission, brake, suspension or electrical models have been acquired. The fixture is not a completed digital twin.

## Free authoring route selected

The user asked to try free programs such as Bforartists or FreeCAD before paid options. Bforartists 5.2.0 was downloaded from the official release, checksum-checked and used to create an editable hatch project. Both current LODs passed surface/material/identity round trips and the exported high-detail sample passed the actual viewer interactions. See [FREE_AUTHORING](FREE_AUTHORING.md). This resolves the previously untested authoring-tool connection, not the missing accurate geometry.

The user subsequently specified **free sources that require no sign-in**. Account-gated candidates below are retained as research history, not active download recommendations. No account was created, checkout completed or creator contacted.

## No-sign-in sourcing results

The public [coupled-sim Smart directory](https://github.com/bazilinskyy/coupled-sim/tree/master/Assets/Prefabs/Cars/Smart) does provide a direct anonymous download. `Car N170813.3DS` was downloaded into temporary research storage, parsed with Three.js and rendered from front and rear. It contains 42,302 triangles and 31 generically named mesh objects, rather than a documented physical-part hierarchy. Its body, headlights and rear lamps visually indicate the older **450**, so it is rejected for the target 451. This is a visual identification, not verified vehicle metadata. Source units and dimensions are unverified; scaling for the research renders was framing only.

The repository's [asset table](https://github.com/bazilinskyy/coupled-sim#used-assets) attributes the model to Filippo Citati and labels it MIT, but the linked [creator page](https://grabcad.com/library/smart-fortwo-1) returned HTTP 403. No creator-issued asset license was found in the repository; its Arcade Car Physics license does not establish rights to the car geometry. The original, temporary GLB conversion and research screenshots were **not added to the application or repository**. Original 3DS SHA-256: `38910585c63a3dd4ff5f9b397c3629924ceb9ce3f35891babc99fec06187f41b`.

Other publicly readable leads were checked:

| Source | Finding | Decision |
| --- | --- | --- |
| [Animium Smart Fortwo](https://animium.com/2014/08/smart-fortwo) | Public preview visually shows the older 450. The page offers a free checkout, not a direct file, and did not provide an asset-specific rights record. | Rejected for the target generation; no checkout attempted. |
| [Done3D Smart Fortwo](https://done3d.com/smart-fortwo/) | Download links to login. Footer restricts models to noncommercial use. | Excluded under the no-sign-in preference. |
| [3D CAD Browser W451](https://www.3dcadbrowser.com/3d-model/smart-fortwo-w451-2011) | Listing requires an account and explicitly prohibits source-file redistribution. | Excluded from this delivery route. |
| Public GitHub searches | Searches for Fortwo OBJ, GLB and Blender filenames and Smart Fortwo repositories produced no additional usable vehicle asset. | No new asset acquired. This does not prove none exists elsewhere. |

No suitable, redistribution-approved 451 whole vehicle or accurate separated hatch was obtained in this pass. The remaining dependency is actual geometry and its supporting measurements/provenance, not another converter or viewer control. The tested free authoring workflow can accept that geometry when available.

## Candidates found online

These are leads, not installed assets or purchase recommendations. Prices and vendor assertions need confirmation before purchase. No account, purchase, license acceptance or creator contact was performed.

| Candidate | Evidence and limitation | Concrete next step |
| --- | --- | --- |
| [3DModels.org coupe listing](https://3dmodels.org/3d-models/smart-fortwo-coupe-2012/) | Titled 2015 despite a 2012 URL; exterior, separated main objects, GLB/Blender formats offered. Listing alone does not establish 451 U.S. equipment or mechanical internals. | Ask seller to confirm 451 gasoline coupe, provide orthographic previews and object list, and confirm browser-delivered GLB redistribution in writing. Inspect wheelbase and equipment against supplied vehicle evidence before mapping. |
| [3D Molier Smart Fortwo 2013](https://free3d.com/3d-model/smart-fortwo-2013-5709.html) | Paid model with glTF option; different year. Exact 2015 U.S. compatibility and independently selectable mechanical parts are unverified. | Obtain object hierarchy and license applicable to this web application; confirm facelift/platform and modifications required. |
| [com_surrogate Smart Fortwo SubD](https://sketchfab.com/3d-models/smart-fortwo-subd-d75bc4356ab440e7892b760546f402b2) | [Public metadata](https://api.sketchfab.com/v3/models/d75bc4356ab440e7892b760546f402b2) confirms CC BY-NC 4.0, 264,749 faces and 139,694 vertices. The inspected public thumbnail resembles a detailed 451 with sport trim; exact U.S. equipment, part segmentation and internals remain unverified. Official download endpoint returned HTTP 401. | Set aside: requires authentication, contrary to the user's current preference. No geometry acquired. Noncommercial licensing is a separate limitation. |
| [Spiicy photoscan](https://sketchfab.com/3d-models/photoscanned-smart-fortwo-9ba3eacbb62c4adb9fe04657c0cf7428) | [Public metadata](https://api.sketchfab.com/v3/models/9ba3eacbb62c4adb9fe04657c0cf7428) confirms CC BY 4.0, 217,522 faces and 109,565 vertices. Creator describes two 2011/2014 reference scans, one electric. The inspected thumbnail shows missing surfaces and scan debris; claimed scale was not independently checked. Official download endpoint returned HTTP 401. | Set aside: requires authentication. At most a future modeling reference, not a ready vehicle/parts asset. No geometry acquired. |

[3DModels license terms](https://3dmodels.org/de/license-terms/) impose extraction/access restrictions on software use. An ordinary public GLB URL is extractable; a royalty-free label alone does not resolve that constraint. Obtain explicit terms permitting this delivery method before integration. Do not put purchased source files in the public Git repository without permission.

## Required delivery and acceptance

1. Rights record naming the owner, license, attribution and explicit web delivery permission; original asset and source hash.
2. Exact generation/body/market/powertrain applicability, source measurements, axes, units and review evidence. A 453 or electric vehicle is not an acceptable substitution.
3. Separate semantic nodes for supported physical components, with stable catalog instance IDs. No inferred mapping by visual resemblance alone.
4. Original installed transforms, authored separation translations/rotations, exterior component IDs, useful camera presets and real bounds. Do not fabricate missing internals.
5. PBR paint, glazing, rubber and metal materials; high and low GLB variants, Meshopt geometry and optional KTX2 textures. Preserve recognizable mechanical detail.
6. Independent dimensional and appearance review before promoting geometry to reviewed status. Fitment and repair verification remain separate.

Use `docs/VEHICLE_IMPORT.md` for the existing staged, hash-validated import workflow. The importer validates semantic IDs, transforms, rights, budgets and review records before publishing an immutable package and switching the registry pointer. The viewer reads the package's vehicle model, detailed assemblies, exterior groups and cameras; adding an approved model does not require replacing the app.

## Current acceptance gap

A photorealistic complete vehicle and full mechanical X-ray cannot be shown without those assets. Current screenshots prove actual 3D interactions on the labeled hatch sample only. Return-to-vehicle displays the precise missing asset state; it never substitutes a photograph or the old primitive car.
