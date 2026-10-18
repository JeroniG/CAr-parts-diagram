# Validation record — October 18, 2026

The existing application was tested before and after the upgrade. The public default is now a reference/photo catalog; the original vehicle and detailed hatch are explicit development fixtures. Test success does not validate factory geometry or replacement compatibility.

## Automated checks

| Check               | Actual result                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript          | Strict checking passes as part of the production build                                                                                                                           |
| ESLint              | Passes                                                                                                                                                                           |
| Vitest              | **59 passed across 7 files**                                                                                                                                                     |
| PostgreSQL          | Migrations 001–003 and repeated seed succeed in PGlite; 20 tables have RLS, no public write policies, import jobs have no public read policy                                     |
| Asset validation    | 3 development GLBs, 75 unique mapped groups, 216 mesh primitives, 162 catalog rows, both hatch LODs, HDR hash/rights, local decoder notices and public photo/catalog hashes pass |
| Production build    | Passes; expected >500 kB warnings for the main metadata/UI bundle and the separate Three.js chunk                                                                                |
| Full Chromium suite | **57 passed, 1 intentionally skipped** across 58 desktop/mobile scenarios; no failing or flaky tests, 11.3 minutes                                                               |

The skipped desktop test is specifically the mobile sheet layout scenario. Tests use one worker. Unit/database/build and Chromium rendering runs were kept sequential after an earlier environment memory problem. An early public-test run had case-sensitive name assertions and overlapping trace cleanup; those were corrected before the successful full run.

Unit coverage includes configuration/source/fitment boundaries, separate definitions/instances, hierarchy cycles, figure callouts, rights/path rejection, bounded HTTP retry/cancellation, VIN identity-only responses, coverage computation, immutable transforms, smooth reversal, hatch pivots/strut endpoints, measurement, SQL evidence constraints and import CLI staging/repeat publication/revision immutability/hash rejection. The test-only second vehicle is never published in the real registry.

Browser coverage includes:

- Real photo load and attribution, no default canvas/sample GLB, authored markers and synchronized inspector, reference zoom/reset, rear-hatch catalog navigation, unavailable modes, failed images and keyboard panel resizing.
- Unsupported search/request export, optional mocked VIN resolution, explicit candidate choice, second-package switching with independent instance callouts, and integrity failure preserving the current vehicle.
- Existing raycast selection/orbit, source-backed OEM references with unknown fitment, inherited hiding, isolate/focus/reset, exact reassembly, inventory, camera presets, clipping, X-ray, themes/quality, lesson playback, keyboard dialogs and WebGL/model fallback.
- On-demand hatch loading, both opening leaves and real world-space strut endpoints, independent selection/isolation/rotation, controlled separation, failed download/hash retry, detail switching, cancellation of stale assembly requests, actual surface measurements, and intermediate animation/reversal under normal motion.

**After the final toolbar/settings/help extraction and import hardening, all 16 affected desktop/mobile scenarios passed again (3.6 minutes).** The production preview test also passed: the photo loads, no canvas or GLB is requested even with the fixture query parameter, the development toggle/debug snapshot are absent, and no page errors occur.

## Hardware and evidence limits

Chromium uses **SwiftShader software rendering** in the constrained Codespace. Desktop is 1440 × 1000; mobile is iPhone 13 emulation at 390 × 844. Tests use reduced motion except the explicit animation scenario. Scene assertions read actual Three.js camera, transforms and visibility through a development-only snapshot API. This is not a simulated screenshot or a fake 3D image.

The sample vehicle contains 91,744 source triangles. The hatch has 36,890 / 147,150 source triangles at low/high detail, approximately 567 / 1,925 KiB compressed. The initial production photo workspace does not initialize WebGL. High hardware quality can use GTAO/clearcoat/transmission; SwiftShader excludes the heavy high path. Real hardware FPS targets remain unverified.

Not executed: physical GPU/phone benchmarking, Safari/Firefox, physical touch/pinch, screen-reader user testing, Blender export, a real KTX2-textured production model, live service/catalog provider integration, live VIN requests, remote database deployment or public production deployment. No accurate licensed production CAD is available. No OEM fitment or repair procedure is verified by these tests.

## Reproduce

```sh
npm ci
npm run check
npm run lint
npm test
npm run validate:assets
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Capture the running dev site with `npm run capture` and the explicitly labeled sample with `npm run capture:hatch`. For production verification, run `npm run preview` in another terminal, then `npm run verify:production`. Actual screenshots and conditions are stored in `docs/screenshots/`; public screenshots retain the M 93 photograph attribution and CC BY-SA notices.

## Actual captures and current performance

Seven public interface captures and six labeled development-hatch captures were taken in Chromium 156.0.8078.4 at desktop/mobile sizes, with zero page errors. `public-desktop.png`, `public-mobile.png`, `public-mobile-inspector.png` and the other gallery/part/search/theme views show the real application. Hatch captures show the actual medium-quality detailed GLB, not a generated concept image. Metadata files record conditions and photo rights.

A separate continuously rotating low-detail hatch run at 1440 × 1000 on SwiftShader measured **12 frames over 6,473.9 ms: 1.85 FPS**, with 36,892 reported triangles. This constrained software-rendering result is below the desired interactive GPU targets. It does not establish physical desktop or phone performance. The public photo/catalog experience avoids WebGL entirely. Real-GPU measurement remains a release dependency for demanding model modes.

Local dev and production preview respond successfully. The private Codespaces browser URL redirects unauthenticated visitors to GitHub sign-in (HTTP 302); it is not a public production deployment.
