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
