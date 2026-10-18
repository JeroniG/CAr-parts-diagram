import type { ViewState } from '../scene/state';
import { hatchComponentIds } from './rearHatch';
/** Catalog accuracy is not evidence that geometry is loaded. Keep samples separate from reviewed mappings. */
export function sampleContains(state: ViewState, id: string, accuracy?: string) {
  return (
    state.fixtureMode &&
    (state.legacyVehicleFixture
      ? accuracy !== undefined && accuracy !== 'D'
      : hatchComponentIds.has(id) && id !== 'hatch-hardware')
  );
}
