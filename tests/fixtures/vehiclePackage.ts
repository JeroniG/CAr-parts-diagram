/** Synthetic data for contract tests only. Never add this vehicle to public/vehicles. */
import { createHash } from 'node:crypto';
import type {
  RegistryEntry,
  VehiclePackage,
  VehicleManifest,
  CatalogDataset,
} from '../../src/types/vehiclePackage';
import type { Component, VehicleConfiguration } from '../../src/types/catalog';
export const digest = (bytes: string | Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
export const testRaster = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zr1sAAAAASUVORK5CYII=',
  'base64',
);
export function makeTestPackage(revision = '1.0') {
  const vehicle: VehicleConfiguration = {
    id: 'atlas-test-vehicle',
    manufacturer: 'Atlas',
    model: 'TEST ONLY',
    year: 2000,
    generation: 'Synthetic contract fixture',
    chassisCode: 'TEST',
    market: 'Test only',
    trim: 'Not verified',
    bodyStyle: 'Test fixture',
    engine: 'Not verified',
    transmission: 'Not verified',
    drivetrain: 'Not verified',
    engineCode: null,
    transmissionCode: null,
    steeringSide: null,
    productionStart: null,
    productionEnd: null,
    dimensions: { length: null, widthWithMirrors: null, height: null, wheelbase: null },
    sourceIds: ['test-source'],
  };
  const prefix = `/vehicles/${vehicle.id}/${revision}/`;
  const components: Component[] = [
    ['test-assembly', 'Test assembly', 'center'],
    ['test-left', 'Test attachment left', 'left'],
    ['test-right', 'Test attachment right', 'right'],
  ].map(([id, name, side]) => ({
    id,
    name,
    side: side as Component['side'],
    vehicleConfigId: vehicle.id,
    systemId: 'test-system',
    parentComponentId: id === 'test-assembly' ? null : 'test-assembly',
    description: 'Synthetic identity fixture; no automotive specifications.',
    function: 'Exercises distinct instance selection.',
    location: 'Test fixture only',
    componentType: id === 'test-assembly' ? 'assembly' : 'part',
    safetyCritical: false,
    serviceable: null,
    accuracy: 'D',
    aliases: [],
    sourceIds: ['test-source'],
    geometryNotes: 'No geometry supplied.',
  }));
  const data: CatalogDataset = {
    vehicle,
    systems: [
      {
        id: 'test-system',
        name: 'Test system',
        description: 'Test only',
        color: '#2F7DFF',
        parentSystemId: null,
      },
    ],
    components,
    sources: [
      {
        id: 'test-source',
        sourceUrl: 'src/tests/fixtures/vehiclePackage.ts',
        publisher: 'AutoAtlas tests',
        documentTitle: 'Synthetic contract fixture',
        publicationDate: null,
        retrievedAt: '2026-10-18',
        rights: 'MIT; synthetic test content',
        notes: 'Not a real vehicle.',
      },
    ],
    oemParts: [],
    fitments: [],
    relationships: [],
    animations: [],
    partDefinitions: [
      {
        id: 'test-shared-definition',
        name: 'Shared test attachment',
        description: 'Two physical instances, one catalog definition.',
        sourceIds: ['test-source'],
        identityStatus: 'unverified',
      },
    ],
    partInstances: ['left', 'right'].map((side) => ({
      id: `test-${side}`,
      definitionId: 'test-shared-definition',
      parentAssemblyId: 'test-assembly',
      side: side as 'left' | 'right',
    })),
  };
  const catalogText = JSON.stringify(data, null, 2) + '\n';
  const manifest: VehicleManifest = {
    schemaVersion: 1,
    revision,
    publishedAt: '2026-10-18',
    configuration: vehicle,
    catalogUrl: prefix + 'catalog.json',
    catalogHash: digest(catalogText),
    photos: [],
    diagrams: [
      {
        id: 'test-diagram',
        url: prefix + 'diagram.png',
        sha256: digest(testRaster),
        revision: 'figure-one',
        caption: 'TEST ONLY · diagram callout contract',
        assemblyId: 'test-assembly',
        width: 1,
        height: 1,
        scope: 'Synthetic raster for automated testing; not a vehicle diagram.',
        callouts: [
          { figureLabel: '10', instanceId: 'test-left', x: 0.25, y: 0.5 },
          { figureLabel: '10', instanceId: 'test-right', x: 0.75, y: 0.5 },
        ],
        author: 'AutoAtlas tests',
        sourceUrl: 'https://github.com/JeroniG/CAr-parts-diagram',
        license: 'MIT',
        licenseUrl: 'https://opensource.org/license/mit',
        attribution: 'AutoAtlas synthetic test raster',
        redistributionAllowed: true,
        retrievedAt: '2026-10-18',
      },
    ],
    models: [],
    assemblies: [],
    providerRevisions: [],
    serviceProcedures: [],
    featuredAssemblyId: 'test-assembly',
    fixture: true,
  };
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  const entry: RegistryEntry = {
    id: vehicle.id,
    label: '2000 Atlas TEST ONLY',
    configuration: vehicle,
    manifestUrl: prefix + 'manifest.json',
    manifestHash: digest(manifestText),
    revision,
  };
  return { pkg: { manifest, data } as VehiclePackage, entry, manifestText, catalogText };
}
