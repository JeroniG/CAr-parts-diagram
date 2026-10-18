import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, dedup, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const path = 'public/models/smart-451/educational-v1.glb';
const doc = await io.read(path);
const before = new Set(
  doc
    .getRoot()
    .listNodes()
    .map((n) => n.getName())
    .filter(Boolean),
);
// Keep every semantic node and animation target. No flatten, join, instance, or prune transforms.
await doc.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
for (const name of before)
  if (
    !doc
      .getRoot()
      .listNodes()
      .some((n) => n.getName() === name)
  )
    throw Error(`Optimization lost node ${name}`);
await io.write(path, doc);
const binary = await readFile(path),
  manifest = JSON.parse(await readFile('public/models/smart-451/manifest.json', 'utf8'));
manifest.asset.contentHash = createHash('sha256').update(binary).digest('hex');
manifest.compression = 'EXT_meshopt_compression';
await writeFile('public/models/smart-451/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Compressed model: ${(binary.length / 1024 / 1024).toFixed(2)} MB. All ${before.size} named nodes retained.`,
);
