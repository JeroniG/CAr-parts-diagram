import type { VehiclePackage, ViewMode } from '../../types/vehiclePackage';
export function computeCoverage(pkg: VehiclePackage) {
  const models = pkg.manifest.models.filter((m) => m.geometryStatus === 'reviewed');
  const mapped = new Set(models.flatMap((m) => m.componentIds));
  const parts = pkg.data.partInstances.length,
    assemblies = pkg.data.components.filter((c) => c.componentType === 'assembly');
  const modes = new Set<ViewMode>(models.flatMap((m) => m.modes));
  if (pkg.manifest.photos.length || pkg.manifest.diagrams.length) modes.add('photos');
  // A requires coverage of every catalog instance and every catalog assembly, not just every mesh.
  const detailed =
    parts > 0 &&
    pkg.data.partInstances.every((p) => mapped.has(p.id)) &&
    assemblies.length > 0 &&
    assemblies.every((a) => models.some((m) => m.scope === 'assembly' && m.assemblyId === a.id));
  const level = models.length
    ? detailed
      ? 'A'
      : 'B'
    : pkg.manifest.photos.length || pkg.manifest.diagrams.length || parts
      ? 'C'
      : 'D';
  return {
    level,
    label:
      level === 'A'
        ? 'Detailed interactive catalog'
        : level === 'B'
          ? 'Partial interactive catalog'
          : level === 'C'
            ? 'Photo & component catalog'
            : 'Identification only',
    parts,
    assemblies: assemblies.length,
    modeledAssemblies: models.filter((m) => m.scope === 'assembly').length,
    mappedParts: pkg.data.partInstances.filter((p) => mapped.has(p.id)).length,
    geometryValidated: pkg.data.partInstances.filter((p) => mapped.has(p.id)).length,
    confirmedFitments: pkg.data.fitments.filter((f) =>
      ['vin-confirmed', 'catalog-confirmed', 'cross-checked'].includes(f.verificationStatus),
    ).length,
    unresolvedFitments: pkg.data.fitments.filter(
      (f) =>
        !['vin-confirmed', 'catalog-confirmed', 'cross-checked'].includes(f.verificationStatus),
    ).length,
    modes,
    mapped,
    photos: pkg.manifest.photos.length,
    diagrams: pkg.manifest.diagrams.length,
    procedures: pkg.manifest.serviceProcedures.length,
  };
}
