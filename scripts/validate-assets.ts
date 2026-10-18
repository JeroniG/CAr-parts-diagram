import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { catalog, componentById, vehicle, fitments, sources } from '../src/data/catalog';
import { validateFitment } from '../src/services/catalog';
import type { MeshBinding, ModelAsset } from '../src/types/catalog';
const fail = (message: string): never => {
  throw Error(message);
};
const manifest = JSON.parse(await readFile('public/models/smart-451/manifest.json', 'utf8')) as {
  asset: ModelAsset;
  bindings: MeshBinding[];
  units: string;
  bounds: number[];
};
const { asset, bindings } = manifest;
if (
  !asset.license ||
  !asset.author ||
  !asset.sourceUrl ||
  !asset.licenseEvidence ||
  !asset.redistributionAllowed
)
  fail('Missing asset provenance or redistribution rights');
await access(asset.licenseEvidence);
if (asset.vehicleConfigId !== vehicle.id || asset.geometryAccuracy !== 'C')
  fail('Incorrect vehicle or unsupported accuracy claim');
if (
  manifest.units !== 'metres' ||
  manifest.bounds[2] < 2.5 ||
  manifest.bounds[2] > 2.9 ||
  manifest.bounds[1] < 1.4 ||
  manifest.bounds[1] > 1.7
)
  fail('Unexpected units or envelope');
const buffer = await readFile('public' + asset.fileUrl);
if (createHash('sha256').update(buffer).digest('hex') !== asset.contentHash)
  fail('Content hash mismatch');
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const document = await io.readBinary(buffer),
  nodes = document.getRoot().listNodes();
const ids = new Set<string>();
for (const b of bindings) {
  if (ids.has(b.componentId)) fail('Duplicate component binding');
  ids.add(b.componentId);
  if (!componentById.has(b.componentId) || componentById.get(b.componentId)?.accuracy === 'D')
    fail(`Invalid geometry mapping ${b.componentId}`);
  const name = b.meshNodePath.split('/').at(-1);
  if (nodes.filter((n) => n.getName() === name).length !== 1)
    fail(`Missing or ambiguous node ${name}`);
  if (b.accuracyStatus !== asset.geometryAccuracy) fail('Accuracy mismatch');
  for (const value of [...b.boundingBox.min, ...b.boundingBox.max, ...b.transformData.position])
    if (!Number.isFinite(value)) fail('Invalid transform/bounds');
}
let primitives = 0;
for (const mesh of document.getRoot().listMeshes())
  for (const p of mesh.listPrimitives()) {
    primitives++;
    const pos = p.getAttribute('POSITION'),
      normal = p.getAttribute('NORMAL');
    if (!pos || !normal) fail(`Missing positions or normals in ${mesh.getName()}`);
    const a = pos!.getArray()!;
    for (const value of a) if (!Number.isFinite(value)) fail('Nonfinite vertex');
    const n = normal!.getArray()!;
    for (const value of n) if (!Number.isFinite(value)) fail('Invalid normal');
    const indices = p.getIndices()?.getArray();
    if (indices)
      for (const index of indices) if (index >= pos!.getCount()) fail('Out-of-bounds vertex index');
  }
for (const texture of document.getRoot().listTextures())
  if (!texture.getImage()) fail('Missing texture');
for (const animation of document.getRoot().listAnimations())
  for (const channel of animation.listChannels())
    if (!channel.getTargetNode()) fail('Lost animation target');
for (const c of catalog)
  if (c.componentType === 'part' && c.accuracy !== 'D' && !ids.has(c.id))
    fail(`Modeled component has no geometry: ${c.id}`);
for (const f of fitments) {
  const errors = validateFitment(f, sources, vehicle);
  if (errors.length) fail(errors.join(', '));
}
console.log(
  `Validated ${ids.size} component mappings, ${primitives} mesh primitives, ${catalog.length} catalog entries; license, hash, finite geometry, normals, units, references and fitment constraints passed.`,
);
