# Asset provenance and licensing

Research checked October 17–18, 2026. A publicly downloadable asset is not automatically approved for browser redistribution.

## Shipped assets

| Asset                                        | Creator and source                                                   | License / evidence                                                                                                                                   | Adaptation and accuracy                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/models/smart-451/educational-v1.glb` | AutoAtlas 3D contributors; generated from `src/vehicles/smart451.ts` | MIT, repository `LICENSE`; redistribution permitted                                                                                                  | Original procedural geometry, exported to glTF and Meshopt compressed. **Tier C only**. No copied OEM/CAD meshes, textures or reference-project model assets. |
| Procedural environment lighting              | Three.js `RoomEnvironment`                                           | Three.js MIT, [shipped MIT notice](public/licenses/Three-MIT.txt)                                                                                    | Generated at runtime as the fallback when the licensed HDR is unavailable.                                                                                    |
| UI icons                                     | Lucide contributors                                                  | ISC, [shipped ISC notice](public/licenses/Lucide-ISC.txt)                                                                                            | Used as an npm dependency; no custom vehicle emblem copied.                                                                                                   |
| DM Sans Variable                             | Google Fonts / font authors; Fontsource package                      | SIL OFL 1.1, [shipped OFL notice](public/licenses/DM-Sans-OFL.txt)                                                                                   | Self-hosted WOFF2.                                                                                                                                            |
| Manrope Variable                             | Mikhail Sharanda and contributors; Fontsource package                | SIL OFL 1.1, [shipped OFL notice](public/licenses/Manrope-OFL.txt)                                                                                   | Self-hosted WOFF2.                                                                                                                                            |
| App screenshots                              | AutoAtlas UI; M 93 photographs where shown                           | Original UI/sample renders: MIT. Public photo screenshots also contain CC BY-SA 3.0 DE photographs; preserve their attribution and applicable terms. | Actual application captures; see individual metadata and photo notices below.                                                                                 |

License texts in `public/licenses/` accompany the static deployment, including React, React DOM, Scheduler and the Meshopt decoder.

Manifest records author, source path, license evidence, permission to redistribute, configuration, version, geometry tier, limitations, SHA-256 and semantic mesh bindings. Source geometry was created for this delivery; no third-party 3D model was acquired.

## Candidates reviewed but NOT imported

- [PixelPoint Smart Fortwo 451](https://www.renderhub.com/pixelpoint/smart-fortwo): paid exterior/interior asset; page states an editorial-use restriction. Browser-extractable redistribution and component-level suitability are not established. No purchase or import.
- [fishermans garage W451 2011 printing model](https://sketchfab.com/3d-models/smart-fortwo-w451-2011-scale1-75-for-3d-printing-525001dbb1b54bdf92b989df7e4e0259): page displays CC BY but creator says the original SketchUp author is unknown. Upstream provenance unresolved; watertight print geometry is not a segmented 2015 mechanical model. Excluded.
- [Spiicy photoscanned Fortwo](https://sketchfab.com/3d-models/photoscanned-smart-fortwo-9ba3eacbb62c4adb9fe04657c0cf7428): search indexed CC BY; exact platform, acquisition path, geometry suitability and complete license evidence not verified. Excluded.
- [TurboSquid C451](https://www.turbosquid.com/3d-models/smart-fortwo-c451-3d-model-1192780): candidate for direct licensing inquiry. Browser redistribution, service-part segmentation and exact U.S. configuration need explicit confirmation. Not acquired.
- Human Atlas BodyParts3D data: unrelated anatomy data, never downloaded or imported.
- Auto Atlas vehicle assets and Model X Studio BlendKit asset: not this vehicle; source/app access is not redistribution permission. Never downloaded or imported.

## Reference code

The three requested projects were read to understand interaction architecture. This application is independently implemented; no reference-project source files were copied into this repository. Human Atlas identifies its original app code as MIT; Auto Atlas and Model X Studio had no applicable code-license file identified during review, so their code and assets were not reused. If future work reuses MIT source, preserve its original copyright notice and license.

## Manufacturer material

Owner manual, introduction manual, ZF article and manufacturer parts pages are linked in `SourceRecord`. No proprietary diagrams, photographs, procedures, manuals or catalog datasets are redistributed. OEM identifiers are limited factual references with explicit source and fitment limitations. Vehicle and manufacturer names remain their owners' marks; this independent project has no affiliation or endorsement.

## Rear-hatch upgrade — October 18, 2026

| Asset                                               | Creator / source                                                                        | License and use                                                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/models/smart-451/rear-hatch/{low,high}.glb` | AutoAtlas contributors, `src/vehicles/rearHatchModel.ts`                                | Original MIT geometry, generated at two detail levels; **Tier C reference-guided sample**, not CAD or scanned OEM parts. Separate manifest hashes and semantic bindings.                                                      |
| `public/environments/studio-small-09-1k.hdr`        | Sergej Majboroda, [Poly Haven Studio Small 09](https://polyhaven.com/a/studio_small_09) | [CC0](https://polyhaven.com/license). Self-hosted 1K HDR; source, download URL, byte count and SHA-256 in `public/environments/manifest.json`. Used for reflections/lighting; procedural studio remains the failure fallback. |
| `public/decoders/basis/*`                           | Binomial LLC / Basis Universal, distributed with Three.js 0.180                         | Apache-2.0; full [license](public/decoders/basis/LICENSE) and upstream README accompany the local JS/WASM transcoder. Supports imported KTX2 textures; shipped sample materials have no compressed image textures.            |

Online photographs and the technical introduction were used to identify broad relationships and appearance, **not embedded in the website or redistributed**. See [the hatch reference review](docs/HATCH_REFERENCES.md) for sources and limits. No copyright-restricted manufacturer mesh, scan or photograph was imported.

Additional candidates reviewed: [TurboSquid Smart model 2635203](https://www.turbosquid.com/FullPreview/2635203) and [Free3D Smart Fortwo 2013](https://free3d.com/3d-model/smart-fortwo-2013-5709.html). No explicit license for distributing an extractable web assembly or evidence of separately modeled rear-hatch service components was established. No purchase was made. Aftermarket printed tailgate spacers were excluded as substitutes for an OEM hatch model.

## Public vehicle reference photographs

`public/photos/smart-451/front.jpg` and `rear.jpg` are original, unmodified photographs by **M 93**, distributed under **CC BY-SA 3.0 DE**, separately from this repository's MIT code license. Attribution, license and original-source links appear beneath the viewer and in each published manifest. The interface adds authored markers; the source JPEG files are unchanged.

- [Front source](<https://commons.wikimedia.org/wiki/File:Smart_Fortwo_Coup%C3%A9_Pulse_(C_451,_Facelift)_%E2%80%93_Frontansicht,_17._Juli_2011,_D%C3%BCsseldorf.jpg>): SHA-256 `74575603e58244e1270d448ec4c7fc2c4ec117471ea76c9060aeb02ef8667733`.
- [Rear source](<https://commons.wikimedia.org/wiki/File:Smart_Fortwo_Coup%C3%A9_Pulse_(C_451,_Facelift)_%E2%80%93_Heckansicht,_17._Juli_2011,_D%C3%BCsseldorf.jpg>): SHA-256 `4064221621d0b5473dfb8957d75128a95f825a78c5f701f8b2208b415d183a4c`.
- [License terms](https://creativecommons.org/licenses/by-sa/3.0/de/deed.en), [legal code](https://creativecommons.org/licenses/by-sa/3.0/de/legalcode). Preserve attribution and the applicable share-alike terms when redistributing or adapting these photographs, including screenshots containing them.

These show a **2011 European 451 facelift**, not verified 2015 U.S. equipment. The source title says Pulse while its description says Passion; the app explicitly records this discrepancy and makes no trim determination from the image. Neither photograph verifies replacement-part compatibility. Retrieved October 18, 2026.

The supplied UI collage is design direction only; no mechanical detail, OEM identifier or repair instruction in it is treated as evidence. No paid marketplace vehicle asset was purchased or redistributed. No generated image is presented as a real vehicle photograph or interactive geometry.
