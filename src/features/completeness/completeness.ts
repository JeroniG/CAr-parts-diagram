import type { VehiclePackage } from '../../types/vehiclePackage';

export function computeCompleteness(pkg: VehiclePackage) {
  const { data, manifest } = pkg;
  const models = manifest.models.filter(
    (m) => m.geometryStatus === 'reviewed' && m.scaleValidated && m.evidence.length,
  );
  const modelByComponent = new Map<string, typeof models>();
  for (const model of models)
    for (const id of model.componentIds)
      modelByComponent.set(id, [...(modelByComponent.get(id) ?? []), model]);
  const instances = new Map(data.partInstances.map((p) => [p.id, p]));
  const definitions = new Map(data.partDefinitions.map((p) => [p.id, p]));
  const verifiedFitments = new Set(
    data.fitments
      .filter(
        (f) =>
          ['vin-confirmed', 'catalog-confirmed', 'cross-checked'].includes(f.verificationStatus) &&
          f.verifiedAt,
      )
      .map((f) => f.componentId),
  );
  const areas = (manifest.completionPlan?.areas ?? []).map((area) => {
    const parts = area.componentIds.filter((id) => instances.has(id));
    const modeled = parts.filter((id) => modelByComponent.has(id));
    const positioned = modeled.filter((id) => instances.get(id)?.assembled);
    const identified = parts.filter(
      (id) => definitions.get(instances.get(id)!.definitionId)?.identityStatus === 'source-backed',
    );
    const assemblies = area.requiredAssemblyIds.filter((id) =>
      models.some(
        (m) =>
          m.scope === 'assembly' &&
          m.assemblyId === id &&
          area.requiredModes.every((mode) => m.modes.includes(mode)),
      ),
    );
    // The denominator is a reviewed inventory, never the currently discovered subset.
    const inventoryClosed =
      !!area.inventoryReview &&
      area.expectedInstances !== null &&
      area.expectedInstances === parts.length &&
      parts.length > 0;
    const interactionsReady =
      parts.length > 0 &&
      parts.every((id) =>
        modelByComponent
          .get(id)
          ?.some((m) => area.requiredModes.every((mode) => m.modes.includes(mode))),
      );
    const complete =
      inventoryClosed &&
      !!area.geometryReview &&
      positioned.length === parts.length &&
      identified.length === parts.length &&
      interactionsReady &&
      assemblies.length === area.requiredAssemblyIds.length;
    return {
      ...area,
      catalogParts: parts.length,
      reviewedParts: modeled.length,
      positionedParts: positioned.length,
      identifiedParts: identified.length,
      confirmedFitments: parts.filter((id) => verifiedFitments.has(id)).length,
      readyAssemblies: assemblies.length,
      inventoryClosed,
      interactionsReady,
      complete,
    };
  });
  const assigned = new Set(areas.flatMap((a) => a.componentIds));
  const unassignedComponentIds = data.partInstances
    .filter((p) => !assigned.has(p.id))
    .map((p) => p.id);
  const milestones = ([1, 2] as const).map((id) => {
    const required = areas.filter((a) => a.milestone === id);
    return {
      id,
      complete:
        required.length > 0 &&
        required.every((a) => a.complete) &&
        (id === 1 || unassignedComponentIds.length === 0) &&
        required.every((area) =>
          area.componentIds.every((partId) =>
            models.some(
              (model) => model.scope === 'vehicle' && model.componentIds.includes(partId),
            ),
          ),
        ),
      completeAreas: required.filter((a) => a.complete).length,
      requiredAreas: required.length,
    };
  });
  const areaByComponent = new Map<string, typeof areas>();
  for (const area of areas)
    for (const id of area.componentIds)
      areaByComponent.set(id, [...(areaByComponent.get(id) ?? []), area]);
  const tasks = data.components
    .filter((c) => c.componentType === 'part')
    .map((component) => {
      const membership = areaByComponent.get(component.id) ?? [];
      const findings = (manifest.completionPlan?.discoveries ?? []).filter(
        (f) =>
          f.componentIds.includes(component.id) ||
          f.areaIds.some((id) => membership.some((a) => a.id === id)),
      );
      const modeled = modelByComponent.has(component.id);
      return {
        id: `${data.vehicle.id}:${component.id}`,
        componentId: component.id,
        name: component.name,
        systemId: component.systemId,
        parentAssemblyId: component.parentComponentId,
        areaIds: membership.map((a) => a.id),
        sourceIds: component.sourceIds,
        status: modeled
          ? instances.get(component.id)?.assembled
            ? 'review-required'
            : 'placement-required'
          : 'geometry-required',
        missing: [
          ...(!modeled
            ? ['Licensed, configuration-matched geometry', 'Measured shape and mounting datums']
            : []),
          ...(!instances.get(component.id)?.assembled
            ? ['Validated installed position, orientation and scale']
            : []),
          ...(!verifiedFitments.has(component.id)
            ? ['Exact configuration / VIN applicability']
            : []),
        ],
        missingMeasurements: [...new Set(membership.flatMap((a) => a.missingMeasurements))],
        findings,
        // An area-level search is not evidence that this individual component has been searched.
        partSearchRecorded: findings.some((f) => f.componentIds.includes(component.id)),
      };
    })
    .filter(
      (t) => !t.areaIds.length || t.areaIds.some((id) => !areas.find((a) => a.id === id)?.complete),
    );
  return {
    vehicleId: data.vehicle.id,
    revision: manifest.revision,
    milestones,
    areas,
    tasks,
    catalog: {
      definitions: data.partDefinitions.length,
      instances: data.partInstances.length,
      assemblies: data.components.filter((c) => c.componentType === 'assembly').length,
      reviewedGeometry: data.partInstances.filter((p) => modelByComponent.has(p.id)).length,
      confirmedFitments: verifiedFitments.size,
      physicalVehicleTotal: null,
    },
    unassignedComponentIds,
  };
}
