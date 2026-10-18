import { describe, it, expect } from 'vitest';
import {
  catalog,
  componentById,
  vehicle,
  sources,
  fitments,
  oemParts,
  systems,
} from '../../src/data/catalog';
import {
  ancestors,
  descendants,
  searchComponents,
  validateFitment,
  visibleComponent,
} from '../../src/services/catalog';
import { classifyVIN } from '../../src/services/vin';
import type { DecodedVIN } from '../../src/services/vin';
import { mechanismState } from '../../src/scene/animations/transmission';
import { inventoryLayout, radialLayout, explodedPosition } from '../../src/scene/explosion/layout';
import { Vector3 } from 'three';
import manifest from '../../public/models/smart-451/manifest.json';
import hatchManifest from '../../public/models/smart-451/rear-hatch/high.manifest.json';
describe('Catalog integrity and truthful coverage', () => {
  it('has unique semantic identifiers and no orphan parents', () => {
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
    for (const c of catalog) {
      expect(c.id).toMatch(/^[a-z][a-z0-9-]+$/);
      if (c.parentComponentId) expect(componentById.has(c.parentComponentId)).toBe(true);
      expect(systems.some((s) => s.id === c.systemId)).toBe(true);
    }
  });
  it('has no hierarchy cycles', () => {
    for (const c of catalog) {
      const seen = new Set([c.id]);
      let parent = c.parentComponentId;
      while (parent) {
        expect(seen.has(parent)).toBe(false);
        seen.add(parent);
        parent = componentById.get(parent)?.parentComponentId ?? null;
      }
    }
  });
  it('separates gasoline 451 from other model configurations', () => {
    expect(vehicle.chassisCode).toBe('451');
    expect(vehicle.engine).toContain('gasoline');
    expect(vehicle.transmission).toContain('5-speed');
    for (const c of catalog) expect(c.vehicleConfigId).toBe(vehicle.id);
  });
  it('keeps unmodeled geometry out of the asset mapping', () => {
    for (const b of manifest.bindings) expect(componentById.get(b.componentId)?.accuracy).toBe('C');
    expect(manifest.bindings.some((b) => b.componentId === 'actuator-connector')).toBe(false);
  });
  it('requires modeled parts to have bindings', () => {
    for (const c of catalog.filter((c) => c.componentType === 'part' && c.accuracy !== 'D'))
      expect(
        [...manifest.bindings, ...hatchManifest.bindings].some((b) => b.componentId === c.id),
      ).toBe(true);
  });
  it('does not claim Tier A or B without geometry evidence', () => {
    expect(catalog.every((c) => ['C', 'D'].includes(c.accuracy))).toBe(true);
  });
  it('resolves descendants across multiple levels', () => {
    expect(descendants('transmission').has('actuator-connector')).toBe(true);
    expect(ancestors('actuator-connector').map((c) => c.id)).toEqual([
      'transmission',
      'clutch-actuator',
    ]);
  });
  it('searches common terminology, systems and sourced part identity', () => {
    expect(searchComponents('right headlight')[0].id).toBe('headlight-right');
    expect(searchComponents('pushrod')[0].id).toBe('actuator-rod');
    expect(searchComponents('4512500062')[0].id).toBe('clutch-actuator');
    expect(searchComponents('ABS')[0].id).toBe('abs-module');
    expect(searchComponents('rear hatch strut')[0].accuracy).toBe('C');
  });
  it('applies inherited hiding and isolation', () => {
    expect(visibleComponent('actuator-rod', new Set(['transmission']), null)).toBe(false);
    expect(visibleComponent('actuator-rod', new Set(), 'clutch-actuator')).toBe(true);
    expect(visibleComponent('engine-block', new Set(), 'transmission')).toBe(false);
  });
  it('retains evidence and unknown fitment for researched OEM identities', () => {
    expect(oemParts).toHaveLength(3);
    for (const p of oemParts) expect(sources.some((s) => s.id === p.sourceId)).toBe(true);
    for (const f of fitments) {
      expect(validateFitment(f, sources, vehicle)).toEqual([]);
      expect(f.verificationStatus).toBe('unknown');
      expect(f.verifiedAt).toBeNull();
    }
  });
  it('rejects claims with missing evidence, dates or wrong configurations', () => {
    expect(
      validateFitment(
        {
          ...fitments[0],
          vehicleConfigId: 'smart-453',
          sourceId: 'missing',
          verificationStatus: 'catalog-confirmed',
        },
        sources,
        vehicle,
      ),
    ).toHaveLength(3);
  });
  it('rejects using Electric Drive evidence to confirm gasoline fitment', () => {
    expect(
      validateFitment(
        { ...fitments[1], verificationStatus: 'catalog-confirmed', verifiedAt: '2026-10-17' },
        sources,
        vehicle,
      ),
    ).toContain('Source configuration does not establish fitment');
  });
});
describe('Explosion layouts', () => {
  const parts = manifest.bindings.map((b) => ({
    id: b.componentId,
    center: new Vector3(...b.boundingBox.min)
      .add(new Vector3(...b.boundingBox.max))
      .multiplyScalar(0.5),
    size: new Vector3(...b.boundingBox.max).sub(new Vector3(...b.boundingBox.min)),
    system: componentById.get(b.componentId)!.systemId,
  }));
  it('returns precisely to the assembled position without cumulative drift', () => {
    const base = new Vector3(0.3, 0.5, -0.9),
      target = new Vector3(3, 4, -5);
    expect(explodedPosition(base, target, 1)).toEqual(target);
    expect(explodedPosition(base, target, 0)).toEqual(base);
    expect(base).toEqual(new Vector3(0.3, 0.5, -0.9));
  });
  it('inventory has one unique slot per physical component without overlap', () => {
    const layout = inventoryLayout(parts);
    expect(layout.size).toBe(parts.length);
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i],
          b = parts[j],
          pa = layout.get(a.id)!,
          pb = layout.get(b.id)!;
        expect(
          Math.abs(pa.x - pb.x) > (a.size.x + b.size.x) / 2 ||
            Math.abs(pa.z - pb.z) > (a.size.z + b.size.z) / 2,
        ).toBe(true);
      }
  });
  it('radial explosion resolves target bounding-box collisions', () => {
    const layout = radialLayout(parts);
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i],
          b = parts[j],
          pa = layout.get(a.id)!,
          pb = layout.get(b.id)!;
        expect(
          ['x', 'y', 'z'].some((k) => {
            const axis = k as 'x' | 'y' | 'z';
            return Math.abs(pa[axis] - pb[axis]) >= (a.size[axis] + b.size[axis]) / 2;
          }),
          `${a.id} overlaps ${b.id}`,
        ).toBe(true);
      }
  });
  it('handles zero visible components', () => {
    expect(inventoryLayout([]).size).toBe(0);
    expect(radialLayout([]).size).toBe(0);
  });
});
describe('Conceptual mechanical states', () => {
  it('holds the clutch released through selection and re-engages at the end', () => {
    expect(mechanismState(0)).toEqual({ step: 0, release: 0 });
    expect(mechanismState(0.4).release).toBe(1);
    expect(mechanismState(0.58)).toEqual({ step: 3, release: 1 });
    expect(mechanismState(1)).toEqual({ step: 5, release: 0 });
  });
  it('clamps scrubbing to a valid range', () => {
    expect(mechanismState(-5).release).toBe(0);
    expect(mechanismState(7).step).toBe(5);
  });
});
describe('VIN identification boundaries', () => {
  const valid = {
    Make: 'SMART',
    Model: 'Fortwo',
    ModelYear: '2015',
    FuelTypePrimary: 'Gasoline',
    ErrorCode: '0',
  } as DecodedVIN;
  it('requires explicit gasoline and model-year match', () => {
    expect(classifyVIN(valid).supported).toBe(true);
    expect(classifyVIN({ ...valid, FuelTypePrimary: 'Electric' }).supported).toBe(false);
    expect(classifyVIN({ ...valid, ModelYear: '2016' }).supported).toBe(false);
    expect(classifyVIN({ ...valid, FuelTypePrimary: '' }).supported).toBe(false);
  });
  it('does not accept a partial or erroneous decode as confirmed', () =>
    expect(classifyVIN({ ...valid, ErrorCode: '1,7' }).supported).toBe(false));
});

describe('Touch selection', () => {
  it('does not pick after dragging or pinching', async () => {
    const { PointerTap } = await import('../../src/scene/controls/pointerTap');
    const tap = new PointerTap();
    tap.down(1, 10, 10);
    tap.move(1, 30, 20);
    expect(tap.up(1, 30, 20)).toBe(false);
    tap.down(1, 10, 10);
    tap.down(2, 20, 20);
    expect(tap.up(2, 20, 20)).toBe(false);
    expect(tap.up(1, 10, 10)).toBe(false);
    tap.down(1, 10, 10);
    expect(tap.up(1, 11, 11)).toBe(true);
  });
});
