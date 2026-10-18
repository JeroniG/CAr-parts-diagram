import * as baseline from '../data/catalog';
import type { CatalogDataset } from '../types/vehiclePackage';
import type { Component, PartFitment, SourceRecord, VehicleConfiguration } from '../types/catalog';
export function createCatalog(
  data: Pick<CatalogDataset, 'components' | 'fitments' | 'oemParts' | 'systems'>,
) {
  const catalog = data.components,
    { fitments, oemParts, systems } = data;
  const componentById = new Map(catalog.map((c) => [c.id, c]));
  const childrenByParent = new Map<string, Component[]>();
  for (const c of catalog)
    if (c.parentComponentId) {
      const siblings = childrenByParent.get(c.parentComponentId) ?? [];
      siblings.push(c);
      childrenByParent.set(c.parentComponentId, siblings);
    }
  function descendants(id: string): Set<string> {
    const ids = new Set<string>([id]);
    const pending = [id];
    while (pending.length)
      for (const child of childrenByParent.get(pending.pop()!) ?? []) {
        if (!ids.has(child.id)) {
          ids.add(child.id);
          pending.push(child.id);
        }
      }
    return ids;
  }
  function ancestors(id: string): Component[] {
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
  const systemNames = new Map(systems.map((s) => [s.id, s.name]));
  const partNumbers = new Map(oemParts.map((p) => [p.id, p.partNumber]));
  const numbersByComponent = new Map<string, string[]>();
  for (const f of fitments)
    numbersByComponent.set(f.componentId, [
      ...(numbersByComponent.get(f.componentId) ?? []),
      partNumbers.get(f.oemPartId) ?? '',
    ]);
  const searchIndex = new Map(
    catalog.map((c) => [
      c.id,
      [
        c.name,
        ...c.aliases,
        systemNames.get(c.systemId) ?? '',
        ...ancestors(c.id).map((p) => p.name),
        ...(numbersByComponent.get(c.id) ?? []),
      ].map((s) => s.toLowerCase()),
    ]),
  );
  function searchComponents(query: string): Component[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((c) => searchIndex.get(c.id)!.some((text) => text.includes(q)))
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
  function visibleComponent(id: string, hidden: Set<string>, isolated: string | null): boolean {
    if (hidden.has(id) || ancestors(id).some((a) => hidden.has(a.id))) return false;
    return !isolated || descendants(isolated).has(id);
  }

  return {
    catalog,
    componentById,
    childrenByParent,
    descendants,
    ancestors,
    searchComponents,
    visibleComponent,
  };
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

// Legacy exports are retained for the isolated development fixture and regression tests.
export const { descendants, ancestors, searchComponents, visibleComponent } = createCatalog({
  components: baseline.catalog,
  fitments: baseline.fitments,
  oemParts: baseline.oemParts,
  systems: baseline.systems,
});
