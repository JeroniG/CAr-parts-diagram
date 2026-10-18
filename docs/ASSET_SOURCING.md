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

An additional free-model search found [coupled-sim's asset table](https://github.com/bazilinskyy/coupled-sim#used-assets), which labels Filippo Citati's Smart Fortwo as MIT and links to [GrabCAD](https://grabcad.com/library/smart-fortwo-1). The original creator page returned HTTP 403, so creator-issued redistribution terms, generation, physical-part segmentation and quality could not be checked. The downstream table alone was not treated as sufficient provenance. No geometry was downloaded or published, and no creator was contacted.

## Candidates found online

These are leads, not installed assets or purchase recommendations. Prices and vendor assertions need confirmation before purchase. No account, purchase, license acceptance or creator contact was performed.

| Candidate | Evidence and limitation | Concrete next step |
| --- | --- | --- |
| [3DModels.org coupe listing](https://3dmodels.org/3d-models/smart-fortwo-coupe-2012/) | Titled 2015 despite a 2012 URL; exterior, separated main objects, GLB/Blender formats offered. Listing alone does not establish 451 U.S. equipment or mechanical internals. | Ask seller to confirm 451 gasoline coupe, provide orthographic previews and object list, and confirm browser-delivered GLB redistribution in writing. Inspect wheelbase and equipment against supplied vehicle evidence before mapping. |
| [3D Molier Smart Fortwo 2013](https://free3d.com/3d-model/smart-fortwo-2013-5709.html) | Paid model with glTF option; different year. Exact 2015 U.S. compatibility and independently selectable mechanical parts are unverified. | Obtain object hierarchy and license applicable to this web application; confirm facelift/platform and modifications required. |
| [com_surrogate Smart Fortwo SubD](https://sketchfab.com/3d-models/smart-fortwo-subd-d75bc4356ab440e7892b760546f402b2) | Search listing identifies CC BY-NC and a 2007+ vehicle; direct access returned 403. No model file acquired. | Confirm license scope with creator and inspect actual source model. Do not treat noncommercial licensing as commercial distribution permission. |
| [Spiicy photoscan](https://sketchfab.com/3d-models/photoscanned-smart-fortwo-9ba3eacbb62c4adb9fe04657c0cf7428) | Search listing identifies CC BY, but direct page returned 403. Exact generation, quality, segmentation and lawful download availability are unresolved. | Inspect through the creator's normal download workflow, establish provenance and platform, then assess whether it can supply more than an exterior shell. |

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
