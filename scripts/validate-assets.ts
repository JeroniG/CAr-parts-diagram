import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { catalog, componentById, vehicle, fitments, sources } from '../src/data/catalog';
import { validateFitment } from '../src/services/catalog';
import { validateAssetManifest } from '../src/services/assetManifest';
const fail = (message: string): never => {
  throw Error(message);
};
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const allIds = new Set<string>(),
  lodIds: string[][] = [];
let primitives = 0;
for (const file of [
  'manifest.json',
  'rear-hatch/low.manifest.json',
  'rear-hatch/high.manifest.json',
]) {
  const manifest: unknown = JSON.parse(await readFile(`public/models/smart-451/${file}`, 'utf8'));
  validateAssetManifest(
    manifest,
    vehicle.id,
    new Set(componentById.keys()),
    file.startsWith('rear-hatch') ? 'rear-hatch' : undefined,
  );
  const { asset, bindings } = manifest;
  if (!asset.licenseEvidence.startsWith('https:')) await access(asset.licenseEvidence);
  if (
    file === 'manifest.json' &&
    (!manifest.bounds ||
      manifest.bounds[2] < 2.5 ||
      manifest.bounds[2] > 2.9 ||
      manifest.bounds[1] < 1.4 ||
      manifest.bounds[1] > 1.7)
  )
    fail('Unexpected vehicle envelope');
  const binary = await readFile('public' + asset.fileUrl);
  if (createHash('sha256').update(binary).digest('hex') !== asset.contentHash)
    fail(`Hash mismatch: ${file}`);
  const doc = await io.readBinary(binary),
    nodes = doc.getRoot().listNodes();
  for (const binding of bindings) {
    if (componentById.get(binding.componentId)?.accuracy === 'D')
      fail(`Unmodeled part has geometry: ${binding.componentId}`);
    const name = binding.meshNodePath.split('/').at(-1);
    if (nodes.filter((n) => n.getName() === name).length !== 1)
      fail(`Missing or ambiguous semantic node: ${name}`);
    allIds.add(binding.componentId);
  }
  if (manifest.assemblyId) {
    lodIds.push(bindings.map((b) => b.componentId).sort());
    if (bindings.length !== 21) fail('Incomplete hatch assembly');
    if (manifest.motionRig)
      for (const name of ['strut-barrel', 'strut-rod', 'strut-base-eye', 'strut-tip-eye'])
        if (nodes.filter((n) => n.getName().endsWith(`--${name}`)).length !== 2)
          fail(`Missing strut rig: ${name}`);
  }
  for (const mesh of doc.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      primitives++;
      const pos = primitive.getAttribute('POSITION'),
        normal = primitive.getAttribute('NORMAL');
      if (!pos || !normal) fail(`Missing positions/normals: ${mesh.getName()}`);
      for (const value of pos!.getArray()!) if (!Number.isFinite(value)) fail('Nonfinite vertex');
      for (const value of normal!.getArray()!)
        if (!Number.isFinite(value)) fail('Nonfinite normal');
      for (const index of primitive.getIndices()?.getArray() ?? [])
        if (index >= pos!.getCount()) fail('Out-of-bounds vertex index');
    }
  for (const texture of doc.getRoot().listTextures())
    if (!texture.getImage()) fail('Missing texture');
  for (const clip of doc.getRoot().listAnimations())
    for (const channel of clip.listChannels())
      if (!channel.getTargetNode()) fail('Lost animation target');
  console.log(
    `${file}: ${bindings.length} parts, ${(binary.length / 1024).toFixed(0)} KiB; hash, semantic roots and finite geometry passed.`,
  );
}
if (JSON.stringify(lodIds[0]) !== JSON.stringify(lodIds[1]))
  fail('LOD component identities differ');
for (const part of catalog)
  if (part.componentType === 'part' && part.accuracy !== 'D' && !allIds.has(part.id))
    fail(`Modeled component has no geometry: ${part.id}`);
for (const fitment of fitments) {
  const errors = validateFitment(fitment, sources, vehicle);
  if (errors.length) fail(errors.join(', '));
}
const environment = JSON.parse(await readFile('public/environments/manifest.json', 'utf8'));
const hdr = await readFile('public/environments/studio-small-09-1k.hdr');
if (
  createHash('sha256').update(hdr).digest('hex') !== environment.sha256 ||
  environment.license !== 'CC0-1.0'
)
  fail('Environment provenance mismatch');
await access('public/decoders/basis/LICENSE');
await access('public/decoders/basis/basis_transcoder.wasm');
console.log(
  `Validated ${allIds.size} unique mapped components, ${primitives} mesh primitives, ${catalog.length} catalog rows, both LODs and the licensed HDR environment.`,
);
// Production coverage is independent of development geometry above.
import { validateVehiclePackage } from '../src/data/validation/vehicleManifest';
const registry = JSON.parse(await readFile('public/vehicles/registry.json', 'utf8'));
for (const entry of registry.vehicles) {
  const manifestBytes = await readFile('public' + entry.manifestUrl);
  if (createHash('sha256').update(manifestBytes).digest('hex') !== entry.manifestHash)
    fail('Published manifest integrity mismatch');
  const m = JSON.parse(manifestBytes.toString()),
    catalogBytes = await readFile('public' + m.catalogUrl);
  if (createHash('sha256').update(catalogBytes).digest('hex') !== m.catalogHash)
    fail('Published catalog integrity mismatch');
  const pkg = { manifest: m, data: JSON.parse(catalogBytes.toString()) };
  validateVehiclePackage(pkg);
  if (pkg.manifest.fixture) fail('Test fixture must not be in the production registry');
  for (const media of [...pkg.manifest.photos, ...pkg.manifest.diagrams])
    if (
      createHash('sha256')
        .update(await readFile('public' + media.url))
        .digest('hex') !== media.sha256
    )
      fail(`Reference hash mismatch: ${media.id}`);
  console.log(
    `Production ${entry.id}: ${pkg.data.partInstances.length} catalog parts, ${pkg.manifest.photos.length} licensed photos, ${pkg.manifest.models.length} reviewed 3D assets.`,
  );
}
