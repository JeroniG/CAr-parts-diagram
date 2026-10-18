import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type {
  VehicleManifest,
  CatalogDataset,
  PhotoAsset,
  RegistryEntry,
} from '../src/types/vehiclePackage';
import { validateVehiclePackage } from '../src/data/validation/vehicleManifest';
const snapshot = JSON.parse(await readFile('src/data/catalog.snapshot.json', 'utf8'));
const { vehicle, systems, components, sources, oemParts, fitments, relationships, animations } =
  snapshot;
const publishedComponents = components.map(
  (c: { id: string; description: string; geometryNotes: string; accuracy: string }) => ({
    ...c,
    description:
      c.id === 'rear-hatch'
        ? 'Split upper glazing and lower tailgate. Browse component relationships and rear exterior photograph references.'
        : c.description,
    geometryNotes:
      c.accuracy === 'C'
        ? 'No reviewed geometry is published. Development samples are separate; dimensions and fitment remain unverified.'
        : c.geometryNotes,
  }),
);
const data: CatalogDataset = {
  vehicle,
  systems,
  components: publishedComponents,
  sources,
  oemParts,
  fitments,
  relationships,
  animations,
  partDefinitions: components
    .filter((c: { componentType: string }) => c.componentType === 'part')
    .map((c: { id: string; name: string; description: string; sourceIds: string[] }) => ({
      id: `def-${c.id}`,
      name: c.name,
      description: c.description,
      sourceIds: c.sourceIds,
      identityStatus: 'unverified',
    })),
  partInstances: components
    .filter((c: { componentType: string }) => c.componentType === 'part')
    .map((c: { id: string; parentComponentId: string | null; side: string }) => ({
      id: c.id,
      definitionId: `def-${c.id}`,
      parentAssemblyId: c.parentComponentId,
      side: c.side,
    })),
};
const revision = '2026-10-18.1',
  base = `/vehicles/${vehicle.id}/${revision}`;
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const photos: PhotoAsset[] = [];
for (const [key, view, w, h] of [
  ['front', 'Frontansicht', 2358, 1658],
  ['rear', 'Heckansicht', 2340, 1572],
] as const) {
  const filename = `Smart_Fortwo_Coupé_Pulse_(C_451,_Facelift)_–_${view},_17._Juli_2011,_Düsseldorf.jpg`;
  photos.push({
    id: `smart-451-${key}`,
    url: `/photos/smart-451/${key}.jpg`,
    sha256: sha(await readFile(`public/photos/smart-451/${key}.jpg`)),
    kind: 'photograph',
    caption:
      key === 'front' ? 'Front three-quarter · European 451' : 'Rear three-quarter · European 451',
    scope:
      '2011 European 451 facelift photograph. Reference for exterior location only; not the selected 2015 U.S. equipment. Source title and description differ on trim.',
    width: w,
    height: h,
    componentIds:
      key === 'rear'
        ? [
            'rear-hatch',
            'rear-glass',
            'tailgate',
            'hatch-spoiler',
            'hatch-wiper-arm',
            'hatch-brake-light',
          ]
        : ['exterior', 'windshield', 'door-left', 'headlight-left', 'wheel-front-left'],
    hotspots:
      key === 'rear'
        ? [
            { instanceId: 'rear-glass', label: 'Rear window', x: 0.265, y: 0.24 },
            { instanceId: 'tailgate', label: 'Lower tailgate', x: 0.22, y: 0.47 },
            { instanceId: 'hatch-spoiler', label: 'Rear spoiler', x: 0.275, y: 0.115 },
            { instanceId: 'hatch-wiper-arm', label: 'Rear wiper', x: 0.315, y: 0.145 },
          ]
        : [
            { instanceId: 'windshield', label: 'Windshield', x: 0.58, y: 0.265 },
            { instanceId: 'door-left', label: 'Left door', x: 0.255, y: 0.47 },
            { instanceId: 'headlight-left', label: 'Left headlight', x: 0.565, y: 0.495 },
          ],
    author: 'M 93',
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
    license: 'CC-BY-SA-3.0-DE',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/de/deed.en',
    attribution: '© M 93 / Wikimedia Commons · CC BY-SA 3.0 DE · original photograph, unmodified',
    redistributionAllowed: true,
    retrievedAt: '2026-10-18',
  });
}
const catalogJSON = JSON.stringify(data, null, 2) + '\n';
const manifest: VehicleManifest = {
  schemaVersion: 1,
  revision,
  publishedAt: '2026-10-18',
  configuration: vehicle,
  catalogUrl: `${base}/catalog.json`,
  catalogHash: sha(catalogJSON),
  photos,
  diagrams: [],
  models: [],
  assemblies: [],
  providerRevisions: [
    {
      provider: 'local-reviewed-catalog',
      revision: '2',
      retrievedAt: '2026-10-18',
      staleAfter: null,
    },
  ],
  serviceProcedures: [],
  featuredAssemblyId: 'rear-hatch',
  focusTargets: {
    hatch: 'rear-hatch',
    powertrain: 'engine-block',
    suspension: 'suspension',
    interior: 'interior',
  },
};
validateVehiclePackage({ manifest, data });
await mkdir(`public${base}`, { recursive: true });
await writeFile(`public${base}/catalog.json`, catalogJSON);
const manifestJSON = JSON.stringify(manifest, null, 2) + '\n';
await writeFile(`public${base}/manifest.json`, manifestJSON);
await writeFile('src/data/initialVehicle.json', JSON.stringify({ manifest, data }, null, 2) + '\n');
let existing: RegistryEntry[] = [];
try {
  existing = JSON.parse(await readFile('public/vehicles/registry.json', 'utf8')).vehicles;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
await writeFile(
  'public/vehicles/registry.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      vehicles: [
        ...existing.filter((e) => e.id !== vehicle.id),
        {
          id: vehicle.id,
          label: `${vehicle.year} ${vehicle.manufacturer} ${vehicle.model}`,
          configuration: vehicle,
          manifestUrl: `${base}/manifest.json`,
          manifestHash: sha(manifestJSON),
          revision,
        },
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Published Smart catalog/photo package. No production 3D asset or service procedure claimed.',
);
