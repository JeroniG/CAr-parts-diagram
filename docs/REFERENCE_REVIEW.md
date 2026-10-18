# Reference evaluation

Reviewed October 17, 2026, before implementing the scene. Files were downloaded only to a temporary research directory, not incorporated into the application.

| Project                                                     | Files reviewed                                                                                          | Relevant decisions                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Human Atlas](https://github.com/ashemag/human-atlas)       | README, LICENSE, package.json, app/scene.tsx, app/explosion-layout.ts, app/pointer-tap.ts, app/page.tsx | Raw Three.js owned by a React lifetime; on-demand rendering; semantic tree separate from meshes; consistent original transforms; visible-only inventory; distinguish taps from drags; mobile controls reserve model space. Its GPU texture batching is valuable for thousands of meshes but unnecessary for this 56-group slice. |
| [Auto Atlas](https://github.com/ahnuchen/auto-atlas)        | README, package.json, src/three/glb-scene.ts, src/data/models.ts, App and panels                        | Local GLTFLoader + Meshopt decoder, vehicle registry, disposal on load, model errors, radial/inventory separation. Avoid its generic mesh/material naming as proof of service-part identity. No code license established, no copying.                                                                                            |
| [Model X Studio](https://github.com/ashemag/model-x-studio) | README, app/vehicle-scene.tsx, app/explosion-layout.ts                                                  | Frame exploded parts using projected bounds, preserve semantic mesh roots, progressive spacing and readable controls. Its README distinguishes mesh islands from actual service parts and notes illustrative internals. No assets or source reused.                                                                              |

The app uses React 19, TypeScript, Vite and Three.js. Components are loaded from a compressed GLB; the source generator is outside the browser bundle. Geometry, components, OEM identities and fitment claims are separately modeled. The JSON snapshot runs independently of PostgreSQL. Future high-detail assets can replace a vehicle's manifest without rewriting the workspace.

## Configuration evidence

- [2015 U.S. gasoline owner's manual](https://www.mbusa.com/content/dam/mb-nafta/us/smart/manuals/2015/owners_manual.pdf), printed page 215: Passion length 2,695 mm, mirrors-out width 1,752 mm, height 1,555 mm, wheelbase 1,867 mm. Printed page 218 lists multiple permitted tire combinations. The current conceptual wheels illustrate 155/60 R15 front and 175/55 R15 rear; this does not imply every Passion car has those tires.
- [smart USA 451 introduction, archived](https://www.manualslib.com/manual/838294/Smart-Series-451.html): rear engine, automated manual, front disc / rear drum architecture, approximate axle-position context. This older document cannot establish 2015 OEM fitment.
- [ZF actuator explanation](https://aftermarket.zf.com/en/aftermarket-portal/knowledge-hub/inbrief-sachs-actuators/): electronic clutch and gear actuators have distinct roles. The lesson's strokes, timings, linkage and internals are not validated against a factory mechanism.

## Parts research outcome

[Mercedes-Benz USA clutch actuator 4512500062](https://mbparts.mbusa.com/oem-parts/smart-clutch-actuator-4512500062) confirms identity but explicitly has no application data. Fitment remains unknown.

[Mercedes-Benz Classic's 2015 Electric Drive headlamp catalog](https://classicparts.mbusa.com/v-2015-smart-fortwo--electric-drive--electric/electrical--headlamp-components) identifies right 4518202459 and left 4518202559, without BRABUS. Its Electric Drive configuration is deliberately retained in the evidence note; this is not a match for this gasoline car. Both references have unknown gasoline fitment.

No additional numbers were added to reach an arbitrary target. Exact engine/transmission codes, production ranges, supersessions, VIN fitment and optional-equipment claims are left unverified. No pricing or aftermarket compatibility is claimed.

The optional VIN client follows the [official NHTSA vPIC flat-format decode API](https://vpic.nhtsa.dot.gov/api/). It is an attribute lookup only. The app validates length, rejects partial/error results and wrong model-year/powertrain responses, stores nothing persistently and never changes catalog fitment based on decoding.
