/** Import a reviewed self-contained GLB, preserving semantic part roots. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { validateAssetManifest } from '../src/services/assetManifest';
import { rearHatch, hatchPartById } from '../src/vehicles/rearHatch';
const args = process.argv.slice(2);
const option = (key: string) => args[args.indexOf(key) + 1];
if (!args.includes('--model') || !args.includes('--manifest') || !args.includes('--out'))
  throw Error(
    'Usage: npm run import:assembly -- --model source.glb --manifest reviewed.json --out staging-directory',
  );
const binary = await readFile(option('--model'));
if (binary.length > 200 * 1024 * 1024)
  throw Error('Model exceeds 200 MB. Prepare a smaller assembly.');
if (binary.readUInt32LE(0) !== 0x46546c67 || binary.readUInt32LE(4) !== 2)
  throw Error('A glTF 2.0 binary (.glb) is required.');
const jsonLength = binary.readUInt32LE(12);
const json = JSON.parse(binary.subarray(20, 20 + jsonLength).toString());
if (
  [...(json.buffers ?? []), ...(json.images ?? [])].some(
    (v: { uri?: string }) => v.uri && !v.uri.startsWith('data:'),
  )
)
  throw Error('Embed all buffers and textures in the GLB before importing.');
const manifest: unknown = JSON.parse(await readFile(option('--manifest'), 'utf8'));
validateAssetManifest(
  manifest,
  rearHatch.vehicleConfigId,
  new Set(hatchPartById.keys()),
  rearHatch.id,
);
if (!manifest.lod) throw Error('Specify a low or high LOD.');
if (createHash('sha256').update(binary).digest('hex') !== manifest.asset.contentHash)
  throw Error('Model hash differs from reviewed manifest.');
if (manifest.bindings.length !== rearHatch.parts.length)
  throw Error('Provide all 21 semantic parts for this assembly, or extend the registry first.');
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const document = await io.readBinary(binary),
  nodes = document.getRoot().listNodes();
const boundNodes = manifest.bindings.map((binding) => {
  const matches = nodes.filter((n) => n.getName() === binding.meshNodePath.split('/').at(-1));
  if (matches.length !== 1)
    throw Error(`Missing or ambiguous semantic node: ${binding.meshNodePath}`);
  if (!binding.explodedTransform)
    throw Error(`Provide a controlled separation vector for ${binding.componentId}.`);
  return matches[0];
});
for (const node of boundNodes) {
  let parent = node.getParentNode();
  while (parent) {
    if (boundNodes.includes(parent))
      throw Error('Semantic part roots cannot be nested inside one another.');
    parent = parent.getParentNode();
  }
}
if (
  manifest.motionRig === 'illustrative-hatch-v1' &&
  !nodes.some((n) => n.getName().endsWith('--strut-barrel'))
)
  throw Error(
    'This asset does not contain the sample motion rig. Remove motionRig and supply an authored animation clip.',
  );
for (const mesh of document.getRoot().listMeshes())
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute('POSITION'),
      normal = primitive.getAttribute('NORMAL');
    if (!position || !normal || !Array.from(position.getArray()!).every(Number.isFinite))
      throw Error('Geometry requires finite positions and normals.');
  }
const output = resolve(option('--out'));
if (output === resolve('public/models/smart-451/rear-hatch'))
  throw Error(
    'Stage imports outside the published directory; review the manifest and matching LOD before replacing a shipped asset.',
  );
await mkdir(output, { recursive: true });
await writeFile(`${output}/${manifest.lod}.glb`, binary, { flag: 'wx' });
await writeFile(
  `${output}/${manifest.lod}.manifest.json`,
  JSON.stringify(manifest, null, 2) + '\n',
  { flag: 'wx' },
);
console.log(
  `Validated ${boundNodes.length} parts and staged ${manifest.lod} LOD in ${output}. Review docs/ASSET_PIPELINE.md before publishing.`,
);
