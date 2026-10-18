import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTestPackage } from '../fixtures/vehiclePackage';
import initial from '../../src/data/initialVehicle.json';
import { validateVehiclePackage, localAssetPath } from '../../src/data/validation/vehicleManifest';
import { computeCoverage } from '../../src/features/coverage/coverage';
import { resolveLocalVehicles } from '../../src/features/vehicles/VehicleDataService';
import { fetchBytes } from '../../src/data/providers/http';
import { vpicProvider } from '../../src/data/providers/vpic';
import type { VehiclePackage } from '../../src/types/vehiclePackage';
afterEach(() => vi.unstubAllGlobals());
describe('published vehicle boundaries', () => {
  it('publishes catalog/photos without promoting development geometry', () => {
    validateVehiclePackage(initial);
    const c = computeCoverage(initial as VehiclePackage);
    expect(c.level).toBe('C');
    expect(c.parts).toBe(162);
    expect(c.mappedParts).toBe(0);
    expect(c.photos).toBe(2);
    expect([...c.modes]).toEqual(['photos']);
  });
  it('supports identical definitions with separate instances and figure-local labels', () => {
    const { pkg } = makeTestPackage();
    validateVehiclePackage(pkg);
    expect(pkg.data.partDefinitions).toHaveLength(1);
    expect(new Set(pkg.data.partInstances.map((p) => p.id)).size).toBe(2);
    expect(computeCoverage(pkg).level).toBe('C');
  });
  it.each([
    [
      'configuration',
      (p: VehiclePackage) => {
        p.data.vehicle = { ...p.data.vehicle, year: 2001 };
      },
    ],
    [
      'duplicate instance',
      (p: VehiclePackage) => {
        p.data.partInstances.push(p.data.partInstances[0]);
      },
    ],
    [
      'cycle',
      (p: VehiclePackage) => {
        p.data.components[0].parentComponentId = 'test-left';
      },
    ],
    [
      'missing instance',
      (p: VehiclePackage) => {
        p.data.partInstances.pop();
      },
    ],
    [
      'unknown definition',
      (p: VehiclePackage) => {
        p.data.partInstances[0].definitionId = 'not-present';
      },
    ],
    [
      'rights',
      (p: VehiclePackage) => {
        p.manifest.diagrams[0].redistributionAllowed = false;
      },
    ],
    [
      'active image',
      (p: VehiclePackage) => {
        p.manifest.diagrams[0].url = '/vehicles/test.svg';
      },
    ],
    [
      'callout',
      (p: VehiclePackage) => {
        p.manifest.diagrams[0].callouts[0].instanceId = 'unknown-part';
      },
    ],
    [
      'dimensions',
      (p: VehiclePackage) => {
        p.manifest.diagrams[0].width = NaN;
      },
    ],
    [
      'source',
      (p: VehiclePackage) => {
        p.data.sources = [];
      },
    ],
  ] as const)('rejects invalid %s', (_, mutate) => {
    const { pkg } = makeTestPackage();
    mutate(pkg);
    expect(() => validateVehiclePackage(pkg)).toThrow();
  });
  it('rejects unsupported camera and assembly declarations', () => {
    const { pkg } = makeTestPackage();
    pkg.manifest.cameraPresets = { interior: { position: [0, 0, 0], target: [0, 0, 0] } };
    expect(() => validateVehiclePackage(pkg)).toThrow(/Camera position/);
    delete pkg.manifest.cameraPresets;
    pkg.manifest.exteriorComponentIds = ['not-a-part'];
    expect(() => validateVehiclePackage(pkg)).toThrow(/exterior component/);
  });
  it('rejects remote, traversal, encoded and active asset paths', () => {
    for (const p of [
      'https://example.com/a',
      '/a/../b',
      '//evil/a',
      '/a%2fb',
      'javascript:alert(1)',
    ])
      expect(localAssetPath(p)).toBe(false);
  });
  it('resolves candidates without guessing identity or changing year', () => {
    const { entry } = makeTestPackage();
    const second = {
      ...entry,
      id: 'another-test',
      configuration: { ...entry.configuration, id: 'another-test', year: 2001 },
    };
    expect(resolveLocalVehicles('ATLAS', [entry, second])).toHaveLength(2);
    expect(resolveLocalVehicles('Atlas 2001', [entry, second])).toEqual([second]);
    expect(resolveLocalVehicles('Honda Accord 2014 hybrid', [entry])).toEqual([]);
  });
  it('identification-only vehicles stay D and expose no model modes', () => {
    const { pkg } = makeTestPackage();
    pkg.data.components = [];
    pkg.data.partInstances = [];
    pkg.manifest.diagrams = [];
    expect(computeCoverage(pkg).level).toBe('D');
    expect(computeCoverage(pkg).modes.size).toBe(0);
  });
});
describe('provider failures', () => {
  it('retries rate limiting once and bounds response size', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '.1' } }))
      .mockResolvedValueOnce(new Response('okay'));
    vi.stubGlobal('fetch', fetch);
    expect(new TextDecoder().decode(await fetchBytes('/test'))).toBe('okay');
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockResolvedValue(new Response('oversized'));
    await expect(fetchBytes('/test', undefined, 3)).rejects.toThrow(/large/);
  });
  it('cancels a pending retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    const controller = new AbortController();
    const work = fetchBytes('/test', controller.signal);
    controller.abort();
    await expect(work).rejects.toThrow(/Canceled/);
  });
  it('VIN decoding returns identity only and incomplete data is unavailable', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Results: [
            {
              Make: 'SMART',
              Model: 'Fortwo',
              ModelYear: '2015',
              FuelTypePrimary: 'Gasoline',
              ErrorCode: '0',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    const result = await vpicProvider.resolve('WMEEJ3BA0FK000001');
    expect(result.status).toBe('ready');
    expect(result.message).toContain('fitments still require confirmation');
    expect(result.data?.[0].year).toBe(2015);
    fetch.mockResolvedValue(new Response(JSON.stringify({ Results: [{ ErrorCode: '1' }] })));
    expect((await vpicProvider.resolve('WMEEJ3BA0FK000001')).status).toBe('unavailable');
  });
});
