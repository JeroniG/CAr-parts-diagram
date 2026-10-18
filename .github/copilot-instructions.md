# AutoAtlas conventions

- React + TypeScript, raw Three.js; keep scene code outside React render functions.
- +Y up, +Z front, +X vehicle left, metres. Preserve assembled transforms.
- A physical component, one or more meshes, an OEM number and a fitment claim are different records.
- Never use runtime mesh UUIDs as persistent IDs. Never infer OEM identity from material names or mesh islands.
- Every imported asset needs recorded provenance, author, license evidence and explicit redistribution permission. Never import anatomy data or restricted reference-project assets.
- Never invent OEM numbers, torque values, dimensions, fitment, service procedures, supersession or verification dates.
- Do not mix 451 with 453, gasoline with Electric Drive, or U.S. with other markets. Unknown engine/transmission codes and production ranges remain null.
- All current geometry is Tier C. Unmodeled catalog entries are Tier D. A technical reference does not promote geometry to Tier A/B.
- OEM identity does not establish fitment. Verified claims require configuration-specific evidence and a verification date. VIN decoding alone is insufficient.
- Avoid unverified service instructions, especially for brakes, steering, airbags and structural parts.
- Keep the hierarchy extensible; many meshes can map to one physical part.
- Static catalog is authoritative for this preview. Regenerate snapshot and SQL seed when it changes.
- Dispose GPU geometry, materials, environment targets, controls and listeners.
- Do not flatten away semantic nodes during optimization. Run asset validation afterward.
- All visible controls must work. Preserve keyboard access, reduced motion and 2D fallback.
- Run npm run check, lint, test, validate:assets, build and test:e2e before proposing changes.
- State geometry, fitment, source, test and device-performance limitations explicitly.
