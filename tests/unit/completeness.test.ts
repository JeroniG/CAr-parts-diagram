import { expect, it } from 'vitest';
import initial from '../../src/data/initialVehicle.json';
import type { VehiclePackage } from '../../src/types/vehiclePackage';
import { computeCompleteness } from '../../src/features/completeness/completeness';
import { validateVehiclePackage } from '../../src/data/validation/vehicleManifest';
import { makeTestPackage } from '../fixtures/vehiclePackage';
import { createCatalog } from '../../src/services/catalog';
const smart = () => structuredClone(initial) as VehiclePackage;
it('keeps both required milestones incomplete, with all 162 known parts assigned', () => {
  const report = computeCompleteness(smart());
  expect(report.catalog.instances).toBe(162);
  expect(report.catalog.physicalVehicleTotal).toBeNull();
  expect(report.catalog.reviewedGeometry).toBe(0);
  expect(report.milestones.map((m) => m.complete)).toEqual([false, false]);
  expect(report.areas.filter((a) => a.milestone === 2)).toHaveLength(14);
  expect(report.unassignedComponentIds).toEqual([]);
  expect(report.areas.find((a) => a.id === 'wheels')?.componentIds).toHaveLength(4);
  expect(report.areas.find((a) => a.id === 'exterior')?.componentIds).not.toContain('wheel-speed');
  expect(report.tasks).toHaveLength(162);
  expect(report.tasks.find((t) => t.componentId === 'hatch-strut-left')?.partSearchRecorded).toBe(
    true,
  );
  expect(report.tasks.find((t) => t.componentId === 'oil-dipstick')?.partSearchRecorded).toBe(
    false,
  );
});
it('cannot mistake 100% catalog mapping for a complete vehicle inventory', () => {
  const pkg = smart();
  pkg.manifest.models.push({
    id: 'test-all-catalog',
    scope: 'vehicle',
    variants: {
      high: { assetUrl: '/test.glb', manifestUrl: '/test.json' },
      low: { assetUrl: '/test.glb', manifestUrl: '/test.json' },
    },
    componentIds: pkg.data.partInstances.map((p) => p.id),
    modes: ['studio', 'xray', 'cutaway', 'component', 'exploded'],
    geometryStatus: 'reviewed',
    scaleValidated: true,
    evidence: ['Test only'],
  });
  const report = computeCompleteness(pkg);
  expect(report.catalog.reviewedGeometry).toBe(162);
  expect(report.milestones.every((m) => !m.complete)).toBe(true);
  expect(report.areas.every((a) => !a.inventoryClosed)).toBe(true);
  pkg.manifest.models[0].geometryStatus = 'demonstration';
  expect(computeCompleteness(pkg).catalog.reviewedGeometry).toBe(0);
  pkg.manifest.models[0].geometryStatus = 'reviewed';
  pkg.manifest.models[0].scaleValidated = false;
  expect(computeCompleteness(pkg).catalog.reviewedGeometry).toBe(0);
});
it.each([
  'wrong-vehicle',
  'missing-instance',
  'false-closure',
  'missing-milestone',
  'missing-evidence',
])('rejects malformed completion scope: %s', (fault) => {
  const pkg = smart(),
    plan = pkg.manifest.completionPlan!;
  if (fault === 'wrong-vehicle') plan.vehicleId = 'another-car';
  if (fault === 'missing-instance') plan.areas[0].componentIds.push('nonexistent-part');
  if (fault === 'false-closure') {
    plan.areas[0].inventoryReview = {
      reviewer: 'Test',
      reviewedAt: '2026-10-18',
      sourceIds: ['owners-2015'],
      notes: 'Test only',
    };
    plan.areas[0].expectedInstances = 1;
  }
  if (fault === 'missing-milestone') plan.areas = plan.areas.filter((a) => a.milestone === 1);
  if (fault === 'missing-evidence')
    plan.areas[0].geometryReview = {
      reviewer: 'Test',
      reviewedAt: '2026-10-18',
      sourceIds: [],
      notes: 'Test',
    };
  expect(() => validateVehiclePackage(pkg)).toThrow();
});
it('keeps definitions and physical instances distinct across vehicles without a plan', () => {
  const { pkg } = makeTestPackage();
  const report = computeCompleteness(pkg);
  expect(report.catalog.definitions).toBe(1);
  expect(report.catalog.instances).toBe(2);
  expect(report.areas).toEqual([]);
  expect(report.milestones.every((m) => !m.complete)).toBe(true);
  expect(report.tasks.every((t) => t.id.startsWith('atlas-test-vehicle:'))).toBe(true);
});
it('indexes a 10,000-instance hierarchy and preserves parent and OEM search', () => {
  const { pkg } = makeTestPackage();
  pkg.data.components = [
    pkg.data.components[0],
    ...Array.from({ length: 10000 }, (_, i) => ({
      ...pkg.data.components[1],
      id: `instance-${i}`,
      name: `Attachment ${i}`,
    })),
  ];
  const catalog = createCatalog(pkg.data);
  expect(catalog.descendants('test-assembly').size).toBe(10001);
  expect(catalog.childrenByParent.get('test-assembly')).toHaveLength(10000);
  expect(catalog.searchComponents('Attachment 9999')[0].id).toBe('instance-9999');
  expect(catalog.searchComponents('Test assembly')).toHaveLength(10001);
  expect(createCatalog(smart().data).searchComponents('4512500062')[0].id).toBe('clutch-actuator');
});
it('requires the reviewed parts to exist in the assembled vehicle, not only detached assembly files', () => {
  const { pkg } = makeTestPackage();
  const review = {
    reviewer: 'Synthetic test reviewer',
    reviewedAt: '2026-10-18',
    sourceIds: ['test-source'],
    notes: 'Synthetic acceptance test only.',
  };
  pkg.data.partDefinitions[0].identityStatus = 'source-backed';
  for (const instance of pkg.data.partInstances)
    instance.assembled = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
  pkg.manifest.completionPlan = {
    schemaVersion: 1,
    vehicleId: pkg.data.vehicle.id,
    discoveries: [],
    areas: ([1, 2] as const).map((milestone) => ({
      id: `scope-${milestone}`,
      name: 'Synthetic scope',
      milestone,
      componentIds: ['test-left', 'test-right'],
      requiredAssemblyIds: [],
      requiredModes: ['studio'],
      expectedInstances: 2,
      inventoryReview: review,
      geometryReview: review,
      missingMeasurements: [],
    })),
  };
  const variants = {
    high: { assetUrl: '/test.glb', manifestUrl: '/test.json' },
    low: { assetUrl: '/test.glb', manifestUrl: '/test.json' },
  };
  pkg.manifest.models = [
    {
      id: 'test-whole',
      scope: 'vehicle',
      variants,
      componentIds: ['test-left', 'test-right'],
      modes: ['studio'],
      geometryStatus: 'reviewed',
      scaleValidated: true,
      evidence: ['Test only'],
    },
  ];
  expect(computeCompleteness(pkg).milestones.every((m) => m.complete)).toBe(true);
  pkg.manifest.models[0].componentIds = ['test-left'];
  pkg.manifest.models.push({
    ...pkg.manifest.models[0],
    id: 'test-detail',
    scope: 'assembly',
    assemblyId: 'test-assembly',
    componentIds: ['test-right'],
  });
  expect(computeCompleteness(pkg).catalog.reviewedGeometry).toBe(2);
  expect(computeCompleteness(pkg).milestones.every((m) => !m.complete)).toBe(true);
});
