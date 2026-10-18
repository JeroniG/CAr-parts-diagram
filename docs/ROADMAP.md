# Expansion roadmap

These are tracked follow-up scopes. All geometry and fitment promotions require evidence. **October 18 update:** the public photo/catalog workspace, reusable package registry/switching, provider contracts, import publication, and opt-in 21-part hatch fixture are implemented. See [PROGRESS](PROGRESS.md) for the current status; the original phase table below is retained as the initial roadmap, not a statement that new infrastructure remains absent. Accurate production geometry and licensed service/fitment content are still outstanding.

## Delivery milestones

| Phase                         | Current status                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Running application       | Implemented: React, raw Three.js, scene lifecycle and responsive explorer.                                                        |
| 2 — Detailed model            | Partial: original 56-group Tier C GLB; no factory CAD / Tier A/B model acquired.                                                  |
| 3 — Interaction               | Implemented for available geometry; section surfaces are uncapped and explosion paths are illustrative.                           |
| 4 — Parts database            | Schema, static JSON and seed implemented; three sourced identities, no confirmed gasoline fitments, no live database integration. |
| 5 — Animation                 | Conceptual clutch-release lesson implemented; precise mechanics and timing remain unverified.                                     |
| 6 — Configuration selection   | Single scoped configuration and optional VIN lookup; additional vehicles/variants pending.                                        |
| 7 — Validation and deployment | Automated checks and Vercel configuration supplied; see VALIDATION.md for results. No production deployment performed.            |
| 8 — Expansion                 | Issue scopes below.                                                                                                               |

## 1. Acquire and validate complete Smart 451 body geometry

Replace educational exterior surfaces with redistribution-approved U.S. 451 Passion coupe geometry.

Acceptance: Record license, creator and source; compare wheelbase, dimensions, door/glass/panel outlines against photographs and measurements; preserve semantic component roots; attach reviewer evidence before Tier B/A promotion.

## 2. Model the 451 gasoline engine internals from technical references

Add detailed engine internals without borrowing Electric Drive or 453 components.

Acceptance: Source engine-specific diagrams or licensed CAD; confirm block/head, crankshaft, connecting rods, pistons, camshafts and timing; validate pivots and meshes; keep unverified shapes Tier C and unmodeled entries D.

## 3. Validate clutch, gearbox and actuator breakdown

Replace the conceptual clutch and actuator with reference-backed geometry.

Acceptance: Confirm 2015 gasoline transmission configuration; obtain actuator housing/rod/connector references and licensed gearbox diagrams; model only supported internals; preserve the six-stage lesson and explicitly document timing evidence.

## 4. Implement reference-backed suspension animation

Add meaningful suspension travel for the verified 451 layout.

Acceptance: Obtain front strut and rear De Dion measurements; establish joints, mounting points and travel limits; verify wheel/arm/spring relationships; label illustrative values; add timeline and mechanical constraints tests.

## 5. Add electrical-system visualization

Introduce power-source, module and load relationships.

Acceptance: Verify battery, alternator, SAM, ECU and controller locations for the selected configuration; record sources; show unmodeled components honestly; provide accessible system filtering and isolate paths.

## 6. Model wiring connections and current-flow lessons

Represent selected wiring routes without inventing connector pinouts.

Acceptance: Acquire appropriately licensed configuration-specific wiring evidence; map connector IDs to physical components; record routing confidence and circuit metadata; test connectivity; no repair diagnosis claims without verification.

## 7. Integrate verified and licensed repair procedures

Add a source-backed procedure model and limited pilot content.

Acceptance: Obtain redistribution permission; scope each procedure to configuration and production restrictions; attach tools, torque values and safety review only when verified; version evidence; keep unsupported procedures unavailable.

## 8. Add fastener-level catalog and modeling

Extend assemblies down to serviceable fasteners with reviewed evidence.

Acceptance: Validate identity, thread/size/grade and assembly membership from permitted references; support arbitrary-depth browsing and multi-mesh parts; benchmark picking and batched rendering before scaling.

## 9. Support additional Smart configurations with isolated fitment

Expand beyond the single U.S. Passion gasoline coupe.

Acceptance: Add Pure and Cabrio only with distinct configuration metadata, licensed matching assets and tested catalog switching; treat Electric Drive and 453 as separate baselines; prevent cross-configuration bindings and fitment leakage.

## 10. Add additional makes and models through the registry

Prove extensibility with a second unrelated vehicle.

Acceptance: Provide licensed models, source records, normalized catalog, semantic mapping and accuracy classification; implement runtime catalog/model switching with loading cancellation and disposal tests; benchmark progressive loading and per-part LOD.

## 11. Design evidence-backed replacement-part marketplace integration

Add compatible alternatives and current availability only with appropriate provider access.

Acceptance: Choose licensed APIs, confirm terms, provenance, fitment and timestamps; keep identity separate from compatibility; test unavailable/stale data; never infer fitment from broad product titles or VIN attributes alone.

## Additional engineering work

- Validate physical-phone performance, Safari/Firefox, screen readers and contrast with assistive users.
- Add verified LOD assets, selected-part detail loading, texture compression and GPU batching when real models demand it.
- Implement database-backed snapshot publishing and editorial evidence review without exposing administrator credentials.
- Add end-to-end live NHTSA integration checks; retain deterministic mocked error/mismatch tests.
- Extend collision checks to actual disassembly paths and add section caps after suitable geometry exists.

## GitHub tracking

- [Acquire and validate complete Smart 451 body geometry](https://github.com/JeroniG/CAr-parts-diagram/issues/1)
- [Model the 451 gasoline engine internals from technical references](https://github.com/JeroniG/CAr-parts-diagram/issues/2)
- [Validate clutch, gearbox and actuator breakdown](https://github.com/JeroniG/CAr-parts-diagram/issues/3)
- [Implement reference-backed suspension animation](https://github.com/JeroniG/CAr-parts-diagram/issues/4)
- [Add electrical-system visualization](https://github.com/JeroniG/CAr-parts-diagram/issues/5)
- [Model wiring connections and current-flow lessons](https://github.com/JeroniG/CAr-parts-diagram/issues/6)
- [Integrate verified and licensed repair procedures](https://github.com/JeroniG/CAr-parts-diagram/issues/7)
- [Add fastener-level catalog and modeling](https://github.com/JeroniG/CAr-parts-diagram/issues/8)
- [Support additional Smart configurations with isolated fitment](https://github.com/JeroniG/CAr-parts-diagram/issues/9)
- [Add additional makes and models through the registry](https://github.com/JeroniG/CAr-parts-diagram/issues/10)
- [Design evidence-backed replacement-part marketplace integration](https://github.com/JeroniG/CAr-parts-diagram/issues/11)
