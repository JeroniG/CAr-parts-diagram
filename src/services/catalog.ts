import { catalog, componentById, fitments, oemParts, systems } from '../data/catalog';
import type { Component, PartFitment, SourceRecord, VehicleConfiguration } from '../types/catalog';
export function descendants(id: string): Set<string> {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of catalog)
      if (c.parentComponentId && ids.has(c.parentComponentId) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
  }
  return ids;
}
export function ancestors(id: string): Component[] {
  const result: Component[] = [];
  const seen = new Set<string>();
  let c = componentById.get(id);
  while (c?.parentComponentId && !seen.has(c.parentComponentId)) {
    seen.add(c.parentComponentId);
    c = componentById.get(c.parentComponentId);
    if (c) result.unshift(c);
  }
  return result;
}
export function searchComponents(query: string): Component[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog
    .filter((c) =>
      [
        c.name,
        ...c.aliases,
        systems.find((s) => s.id === c.systemId)?.name ?? '',
        ...ancestors(c.id).map((p) => p.name),
        ...fitments
          .filter((f) => f.componentId === c.id)
          .map((f) => oemParts.find((p) => p.id === f.oemPartId)?.partNumber ?? ''),
      ].some((s) => s.toLowerCase().includes(q)),
    )
    .sort((a, b) => {
      const rank = (c: Component) => {
        const n = c.name.toLowerCase();
        return n === q
          ? 100
          : n.startsWith(q)
            ? 80
            : n.split(/[^a-z0-9]+/).includes(q)
              ? 60
              : n.includes(q)
                ? 40
                : c.aliases.some((a) => a.toLowerCase().includes(q))
                  ? 30
                  : 10;
      };
      return rank(b) - rank(a);
    });
}
export function validateFitment(
  f: PartFitment,
  evidence: SourceRecord[],
  config: VehicleConfiguration,
): string[] {
  const errors: string[] = [];
  if (f.vehicleConfigId !== config.id) errors.push('Configuration mismatch');
  if (!evidence.some((s) => s.id === f.sourceId)) errors.push('Missing source evidence');
  if (
    ['vin-confirmed', 'catalog-confirmed', 'cross-checked'].includes(f.verificationStatus) &&
    !f.verifiedAt
  )
    errors.push('Verified fitment requires verification date');
  if (
    f.verificationStatus === 'catalog-confirmed' &&
    evidence.find((s) => s.id === f.sourceId)?.notes.includes('NOT confirmation')
  )
    errors.push('Source configuration does not establish fitment');
  return errors;
}
export function visibleComponent(
  id: string,
  hidden: Set<string>,
  isolated: string | null,
): boolean {
  if (hidden.has(id) || ancestors(id).some((a) => hidden.has(a.id))) return false;
  return !isolated || descendants(isolated).has(id);
}
