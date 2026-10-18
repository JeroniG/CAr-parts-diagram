import type { VehiclePackage } from '../../types/vehiclePackage';
const modes = new Set([
  'studio',
  'photos',
  'showroom',
  'premium',
  'xray',
  'exploded',
  'cutaway',
  'component',
  'disassembly',
  'interior',
  'powertrain',
  'suspension',
  'underbody',
  'hatch',
  'materials',
]);
export function validateCompletionPlan({ manifest, data }: VehiclePackage) {
  const plan = manifest.completionPlan;
  if (!plan) return; // Older/future providers may omit a plan; completion then remains unknown.
  if (
    plan.schemaVersion !== 1 ||
    plan.vehicleId !== data.vehicle.id ||
    !Array.isArray(plan.areas) ||
    !Array.isArray(plan.discoveries)
  )
    throw Error('Invalid completion plan identity.');
  const parts = new Set(data.partInstances.map((p) => p.id));
  const assemblies = new Set(
    data.components.filter((c) => c.componentType === 'assembly').map((c) => c.id),
  );
  const sources = new Set(data.sources.map((s) => s.id));
  const ids = new Set<string>();
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((s) => typeof s === 'string' && s.trim().length > 0);
  for (const area of plan.areas) {
    if (
      !/^[a-z][a-z0-9-]+$/.test(area.id) ||
      ids.has(area.id) ||
      !area.name ||
      ![1, 2].includes(area.milestone)
    )
      throw Error('Invalid completion area.');
    ids.add(area.id);
    if (
      !strings(area.componentIds) ||
      new Set(area.componentIds).size !== area.componentIds.length ||
      area.componentIds.some((id) => !parts.has(id))
    )
      throw Error('Invalid completion component mapping.');
    if (
      !strings(area.requiredAssemblyIds) ||
      area.requiredAssemblyIds.some((id) => !assemblies.has(id))
    )
      throw Error('Invalid completion assembly mapping.');
    if (
      !strings(area.requiredModes) ||
      area.requiredModes.length === 0 ||
      area.requiredModes.some((mode) => !modes.has(mode)) ||
      !strings(area.missingMeasurements)
    )
      throw Error('Invalid completion requirements.');
    if (
      area.expectedInstances !== null &&
      (!Number.isSafeInteger(area.expectedInstances) || area.expectedInstances < 1)
    )
      throw Error('Invalid inventory quantity.');
    for (const review of [area.inventoryReview, area.geometryReview]) {
      if (review === null) continue;
      if (
        !review ||
        typeof review.reviewer !== 'string' ||
        !review.reviewer.trim() ||
        typeof review.notes !== 'string' ||
        !review.notes.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) ||
        !strings(review.sourceIds) ||
        !review.sourceIds.length ||
        review.sourceIds.some((id) => !sources.has(id))
      )
        throw Error('Completion review requires named reviewer, date and source evidence.');
    }
    if (area.inventoryReview && area.expectedInstances !== area.componentIds.length)
      throw Error('Closed inventory must enumerate every expected instance.');
  }
  // A provider cannot quietly omit the mechanical milestone when declaring a scope.
  if (![1, 2].every((m) => plan.areas.some((a) => a.milestone === m)))
    throw Error('Both completion milestones must be defined.');
  const findings = new Set<string>();
  for (const finding of plan.discoveries) {
    if (
      !finding.id ||
      findings.has(finding.id) ||
      !strings(finding.areaIds) ||
      finding.areaIds.some((id) => !ids.has(id)) ||
      !strings(finding.componentIds) ||
      finding.componentIds.some((id) => !parts.has(id)) ||
      !/^https:\/\/[^\s]+$/.test(finding.sourceUrl) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(finding.checkedAt) ||
      !['reference-only', 'rejected', 'access-required', 'candidate'].includes(finding.outcome) ||
      !finding.reason ||
      !finding.nextAction
    )
      throw Error('Invalid discovery evidence.');
    findings.add(finding.id);
  }
}
