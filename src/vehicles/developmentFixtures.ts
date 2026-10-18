import { vehicle } from '../data/catalog';
import { rearHatch } from './rearHatch';
/** Never a production fallback. Explicit opt-in in Vite development mode only. */
export function developmentFixture(id: string) {
  if (!import.meta.env.DEV || id !== vehicle.id) return null;
  return {
    base: {
      assetUrl: '/models/smart-451/educational-v1.glb',
      manifestUrl: '/models/smart-451/manifest.json',
    },
    assemblies: [rearHatch],
    lesson: 'illustrative-transmission',
  };
}

/** Original MIT interaction sample. Never included in reviewed geometry coverage. */
export function inspectionFixture(id: string) {
  if (id !== vehicle.id) return null;
  return {
    assemblies: [rearHatch],
    exteriorComponentIds: [
      'rear-glass',
      'hatch-spoiler',
      'hatch-lower-panel',
      'hatch-upper-frame',
      'hatch-upper-trim',
      'hatch-lower-trim',
    ],
  };
}
