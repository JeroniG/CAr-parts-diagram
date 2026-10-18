import { validateCompletionPlan } from './completionPlan';
import type { VehiclePackage, VehicleManifest, CatalogDataset } from '../../types/vehiclePackage';
const idPattern = /^[a-z][a-z0-9-]{1,95}$/;
export const localAssetPath = (s: unknown): s is string =>
  typeof s === 'string' &&
  /^\/[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(s) &&
  !s.split('/').includes('..') &&
  !s.includes('//');
const https = (s: unknown) => typeof s === 'string' && /^https:\/\/[^\s]+$/.test(s);
const hash = (s: unknown) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
export function validateVehiclePackage(value: unknown): asserts value is VehiclePackage {
  if (!value || typeof value !== 'object') throw Error('Vehicle package must be an object.');
  const { manifest: m, data: d } = value as { manifest: VehicleManifest; data: CatalogDataset };
  if (
    !m ||
    m.schemaVersion !== 1 ||
    !idPattern.test(m.configuration?.id) ||
    !/^\d[\w.-]{0,50}$/.test(m.revision) ||
    !/^\d{4}-\d{2}-\d{2}/.test(m.publishedAt)
  )
    throw Error('Invalid vehicle identity, version or publication date.');
  if (
    !d ||
    d.vehicle?.id !== m.configuration.id ||
    JSON.stringify(d.vehicle) !== JSON.stringify(m.configuration)
  )
    throw Error('Catalog and manifest vehicle configurations differ.');
  for (const key of [
    'manufacturer',
    'model',
    'generation',
    'market',
    'bodyStyle',
    'engine',
    'transmission',
  ] as const)
    if (typeof d.vehicle[key] !== 'string' || !d.vehicle[key].trim())
      throw Error(`Missing configuration field: ${key}`);
  if (!Number.isInteger(d.vehicle.year) || d.vehicle.year < 1886 || d.vehicle.year > 2100)
    throw Error('Invalid model year.');
  if (!localAssetPath(m.catalogUrl) || !hash(m.catalogHash))
    throw Error('Invalid catalog location or content hash.');
  for (const key of [
    'systems',
    'components',
    'sources',
    'oemParts',
    'fitments',
    'relationships',
    'animations',
    'partDefinitions',
    'partInstances',
  ] as const)
    if (!Array.isArray(d[key])) throw Error(`Missing catalog collection: ${key}`);
  for (const key of [
    'photos',
    'diagrams',
    'models',
    'assemblies',
    'providerRevisions',
    'serviceProcedures',
  ] as const)
    if (!Array.isArray(m[key])) throw Error(`Missing manifest collection: ${key}`);
  function unique(rows: { id: string }[], label: string) {
    const ids = new Set<string>();
    for (const r of rows) {
      if (!idPattern.test(r.id) || ids.has(r.id))
        throw Error(`Invalid or duplicate ${label} ID: ${r.id}`);
      ids.add(r.id);
    }
    return ids;
  }
  const components = unique(d.components, 'component'),
    sources = unique(d.sources, 'source'),
    systems = unique(d.systems, 'system'),
    defs = unique(d.partDefinitions, 'definition');
  const instanceIds = unique(d.partInstances, 'instance');
  unique(m.photos, 'photo');
  unique(m.diagrams, 'diagram');
  unique(m.models, 'model');
  unique(d.oemParts, 'OEM part');
  unique(d.fitments, 'fitment');
  unique(m.serviceProcedures, 'service procedure');
  if (d.vehicle.sourceIds.some((id) => !sources.has(id)))
    throw Error('Unknown configuration source.');
  for (const v of Object.values(d.vehicle.dimensions))
    if (v !== null && (!Number.isFinite(v) || v <= 0))
      throw Error('Dimensions must be positive millimetres or null.');
  if (m.featuredAssemblyId && !components.has(m.featuredAssemblyId))
    throw Error('Unknown featured assembly.');
  for (const id of Object.values(m.focusTargets ?? {}))
    if (!components.has(id)) throw Error('Unknown mode focus target.');
  const byId = new Map(d.components.map((c) => [c.id, c]));
  for (const c of d.components) {
    if (c.vehicleConfigId !== d.vehicle.id || !systems.has(c.systemId))
      throw Error(`Wrong vehicle/system for ${c.id}`);
    if (!Array.isArray(c.sourceIds) || c.sourceIds.some((s) => !sources.has(s)))
      throw Error(`Missing component source: ${c.id}`);
    if (c.parentComponentId && !components.has(c.parentComponentId))
      throw Error(`Missing parent: ${c.id}`);
    const seen = new Set([c.id]);
    let p = c.parentComponentId;
    while (p) {
      if (seen.has(p)) throw Error('Component hierarchy cycle.');
      seen.add(p);
      p = byId.get(p)?.parentComponentId ?? null;
    }
  }
  for (const p of d.partDefinitions)
    if (!Array.isArray(p.sourceIds) || p.sourceIds.some((s) => !sources.has(s)))
      throw Error(`Missing definition evidence: ${p.id}`);
  for (const p of d.partInstances) {
    if (
      byId.get(p.id)?.componentType !== 'part' ||
      !defs.has(p.definitionId) ||
      (p.parentAssemblyId && !components.has(p.parentAssemblyId))
    )
      throw Error(`Unresolved part instance mapping: ${p.id}`);
    if (!['left', 'right', 'center'].includes(p.side)) throw Error('Invalid instance orientation.');
    if (p.assembled)
      for (const v of Object.values(p.assembled))
        if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite))
          throw Error('Invalid assembled transform.');
  }
  for (const c of d.components.filter((c) => c.componentType === 'part'))
    if (!instanceIds.has(c.id))
      throw Error('Missing physical instance record.');
  validateCompletionPlan({ manifest: m, data: d });
  for (const r of d.relationships)
    if (!components.has(r.componentId) || !components.has(r.relatedComponentId))
      throw Error('Unknown related component.');
  for (const p of d.oemParts)
    if (!sources.has(p.sourceId) || !p.partNumber)
      throw Error('OEM identity requires source evidence.');
  const oemIds = new Set(d.oemParts.map((p) => p.id));
  for (const p of d.oemParts)
    if (p.supersededBy && !oemIds.has(p.supersededBy)) throw Error('Unknown OEM supersession.');
  for (const f of d.fitments)
    if (
      f.vehicleConfigId !== d.vehicle.id ||
      !components.has(f.componentId) ||
      !sources.has(f.sourceId) ||
      !oemIds.has(f.oemPartId) ||
      (['vin-confirmed', 'catalog-confirmed', 'cross-checked'].includes(f.verificationStatus) &&
        !f.verifiedAt)
    )
      throw Error('Invalid or unsupported fitment evidence.');
  for (const s of d.sources)
    if (!https(s.sourceUrl) && !s.sourceUrl.startsWith('src/'))
      throw Error('Source links must use HTTPS or a repository source path.');
  for (const photo of [...m.photos, ...m.diagrams]) {
    if (!localAssetPath(photo.url) || !hash(photo.sha256))
      throw Error('Invalid image location/hash.');
    if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(photo.url))
      throw Error('Only raster reference assets are accepted; active SVG/HTML is not allowed.');
    if (
      !Number.isFinite(photo.width) ||
      !Number.isFinite(photo.height) ||
      photo.width <= 0 ||
      photo.height <= 0 ||
      photo.width > 8192 ||
      photo.height > 8192 ||
      !photo.scope
    )
      throw Error('Reference dimensions and applicability scope required.');
    if (
      !photo.redistributionAllowed ||
      !photo.author ||
      !photo.license ||
      !photo.attribution ||
      !https(photo.sourceUrl) ||
      !https(photo.licenseUrl)
    )
      throw Error('Missing image rights or attribution.');
  }
  for (const photo of m.photos) {
    if (
      !['photograph', 'render'].includes(photo.kind) ||
      !photo.scope ||
      photo.width <= 0 ||
      photo.height <= 0 ||
      photo.width > 8192 ||
      photo.height > 8192
    )
      throw Error('Photo type, scope and dimensions are required.');
    if (!Array.isArray(photo.componentIds) || photo.componentIds.some((id) => !components.has(id)))
      throw Error('Unknown photo component.');
    for (const h of photo.hotspots)
      if (
        !components.has(h.instanceId) ||
        ![h.x, h.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
      )
        throw Error('Invalid photo hotspot mapping.');
  }
  for (const diagram of m.diagrams) {
    if (!components.has(diagram.assemblyId) || !diagram.revision)
      throw Error('Missing diagram assembly or revision.');
    for (const c of diagram.callouts)
      if (
        !components.has(c.instanceId) ||
        ![c.x, c.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
      )
        throw Error('Invalid figure-specific callout.');
  }
  for (const id of m.exteriorComponentIds ?? [])
    if (!components.has(id)) throw Error('Unknown exterior component.');
  const cameraViews = [
    'perspective',
    'front',
    'rear',
    'left',
    'right',
    'top',
    'bottom',
    'interior',
  ];
  for (const [key, preset] of Object.entries(m.cameraPresets ?? {})) {
    if (!cameraViews.includes(key) || !preset) throw Error('Unknown camera preset.');
    for (const v of [preset.position, preset.target])
      if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite))
        throw Error('Invalid camera transform.');
    if (preset.position.every((n, i) => n === preset.target[i]))
      throw Error('Camera position and target must differ.');
  }
  for (const value of Object.values(m.modeCameras ?? {}))
    if (!cameraViews.includes(value)) throw Error('Invalid mode camera.');
  for (const model of m.models) {
    if (
      !['vehicle', 'assembly'].includes(model.scope) ||
      (model.scope === 'assembly' && !components.has(model.assemblyId ?? '')) ||
      !model.variants?.high ||
      !model.variants?.low
    )
      throw Error('Invalid model scope or detail levels.');
    if (model.geometryStatus !== 'reviewed' || !model.evidence.length)
      throw Error(
        'Published models need a human-reviewed geometry record; samples belong in development fixtures.',
      );
    if (model.componentIds.some((id) => !components.has(id)))
      throw Error('Missing model-to-instance mapping.');
    if (model.scope === 'assembly' && !m.assemblies.some((a) => a.id === model.assemblyId))
      throw Error('Assembly model has no assembly definition.');
    if (model.modes.includes('interior') && !m.cameraPresets?.interior)
      throw Error('Interior mode requires an authored cabin camera.');
    if (model.modes.includes('xray') && !m.exteriorComponentIds?.length)
      throw Error('X-ray mode requires mapped exterior groups.');
    for (const variant of Object.values(model.variants))
      if (!localAssetPath(variant.assetUrl) || !localAssetPath(variant.manifestUrl))
        throw Error('Model sources must be local published assets.');
  }
  for (const p of m.providerRevisions)
    if (
      !p.provider ||
      !p.revision ||
      !Number.isFinite(Date.parse(p.retrievedAt)) ||
      (p.staleAfter !== null && !Number.isFinite(Date.parse(p.staleAfter)))
    )
      throw Error('Invalid provider revision dates.');
  for (const a of m.assemblies) {
    if (
      a.vehicleConfigId !== d.vehicle.id ||
      !components.has(a.id) ||
      a.parts.some((p) => !components.has(p.id))
    )
      throw Error('Invalid assembly configuration or part hierarchy.');
    const model = m.models.find((model) => model.scope === 'assembly' && model.assemblyId === a.id);
    if (
      !model ||
      a.parts.some((p) => !model.componentIds.includes(p.id)) ||
      a.sourceIds.some((id) => !sources.has(id))
    )
      throw Error('Assembly needs a reviewed model mapping and sources.');
    for (const lod of ['high', 'low'] as const)
      if (
        a.variants[lod].assetUrl !== model.variants[lod].assetUrl ||
        a.variants[lod].manifestUrl !== model.variants[lod].manifestUrl
      )
        throw Error('Assembly variant differs from its reviewed model.');
    for (const part of a.parts)
      if (
        !Array.isArray(part.separation) ||
        part.separation.length !== 3 ||
        !part.separation.every(Number.isFinite)
      )
        throw Error('Invalid assembly separation.');
  }
  for (const s of m.serviceProcedures)
    if (!components.has(s.componentId) || !sources.has(s.sourceId) || !https(s.url) || !s.scope)
      throw Error('Service information requires an applicable source and scope.');
}
