/** Local administrator workflow. No browser upload/publishing endpoint or client credentials. */
import {
  readFile,
  writeFile,
  mkdir,
  realpath,
  stat,
  copyFile,
  rename,
  access,
  mkdtemp,
  rm,
} from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { validateVehiclePackage } from '../src/data/validation/vehicleManifest';
import { validateAssetManifest } from '../src/services/assetManifest';
import type { VehicleManifest, RegistryEntry } from '../src/types/vehiclePackage';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const args = process.argv.slice(2),
  option = (key: string) => args[args.indexOf(key) + 1];
if (!args.includes('--package'))
  throw Error(
    'Usage: npm run import:vehicle -- --package /path/package [--publish] [--public-root /path/test-output]',
  );
const source = await realpath(option('--package')),
  publicRoot = resolve(args.includes('--public-root') ? option('--public-root') : 'public');
const manifestBytes = await readFile(resolve(source, 'manifest.json'));
if (manifestBytes.length > 5 * 1024 * 1024) throw Error('Manifest exceeds 5 MB.');
const manifest = JSON.parse(manifestBytes.toString()) as VehicleManifest;
if (
  !/^[a-z][a-z0-9-]{1,95}$/.test(manifest.configuration?.id) ||
  !/^\d[\w.-]{0,50}$/.test(manifest.revision)
)
  throw Error('Invalid package identity/version.');
const id = manifest.configuration.id,
  revision = manifest.revision,
  prefix = `/vehicles/${id}/${revision}/`;
const job = resolve('.imports', id, revision);
await mkdir(job, { recursive: true });
const hash = (bytes: Buffer | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const report: {
  id: string;
  revision: string;
  status: string;
  checks: string[];
  files: { path: string; sha256: string; bytes: number }[];
  errors: string[];
} = { id, revision, status: 'validating', checks: [], files: [], errors: [] };
const files = new Map<string, Buffer>();
let total = 0;
async function asset(url: string, expected?: string) {
  if (!url.startsWith(prefix) || url.includes('..') || url.includes('%') || url.includes('\\'))
    throw Error(`All imported assets must stay under ${prefix}: ${url}`);
  const path = await realpath(resolve(source, url.slice(prefix.length)));
  if (relative(source, path).startsWith('..' + sep) || relative(source, path) === '..')
    throw Error('An asset escapes the package directory.');
  const info = await stat(path);
  if (!info.isFile() || info.size > 200 * 1024 * 1024)
    throw Error('Unsupported or oversized asset.');
  const bytes = await readFile(path),
    digest = hash(bytes);
  if (expected && digest !== expected) throw Error(`Content hash mismatch: ${url}`);
  total += bytes.length;
  if (total > 500 * 1024 * 1024)
    throw Error(
      'Vehicle package exceeds the 500 MB budget. Split detailed assemblies into smaller reviewed versions.',
    );
  files.set(url.slice(prefix.length), bytes);
  report.files.push({ path: url, sha256: digest, bytes: bytes.length });
  return bytes;
}
try {
  const data = JSON.parse((await asset(manifest.catalogUrl, manifest.catalogHash)).toString());
  const pkg = { manifest, data };
  validateVehiclePackage(pkg);
  if (manifest.fixture && args.includes('--publish') && publicRoot === resolve('public'))
    throw Error('Development fixtures cannot be published to the production registry.');
  report.checks.push(
    'Configuration identity, catalog hierarchy, part definitions/instances, source references and fitment boundaries',
  );
  for (const photo of [...manifest.photos, ...manifest.diagrams]) {
    const bytes = await asset(photo.url, photo.sha256);
    const jpeg = bytes[0] === 255 && bytes[1] === 216,
      png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      webp =
        bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP',
      avif = bytes.subarray(4, 12).toString().includes('ftypavif');
    if (!jpeg && !png && !webp && !avif)
      throw Error(`Reference file is not a supported raster image: ${photo.url}`);
  }
  report.checks.push(
    'Reference rights, attribution, scope, figure callouts/hotspots, image signatures and hashes',
  );
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  for (const model of manifest.models) {
    for (const variant of Object.values(model.variants)) {
      const modelManifest: unknown = JSON.parse((await asset(variant.manifestUrl)).toString());
      validateAssetManifest(
        modelManifest,
        id,
        new Set(data.components.map((c: { id: string }) => c.id)),
        model.assemblyId,
      );
      if (modelManifest.asset.fileUrl !== variant.assetUrl)
        throw Error('Model URL differs from its reviewed asset manifest.');
      if (!['A', 'B'].includes(modelManifest.asset.geometryAccuracy))
        throw Error(
          'Production models require reviewed A/B geometry; a demo cannot be promoted by this importer.',
        );
      if (model.scaleValidated && modelManifest.asset.geometryAccuracy !== 'A')
        throw Error('Scale validation requires recorded dimensional/engineering evidence.');
      const bytes = await asset(variant.assetUrl, modelManifest.asset.contentHash);
      if (bytes.readUInt32LE(0) !== 0x46546c67) throw Error('Self-contained GLB required.');
      const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      if (
        [...(json.buffers ?? []), ...(json.images ?? [])].some(
          (v: { uri?: string }) => v.uri && !v.uri.startsWith('data:'),
        )
      )
        throw Error('External GLB resources must be embedded.');
      const doc = await io.readBinary(bytes),
        nodes = doc.getRoot().listNodes();
      const roots = modelManifest.bindings.map((binding) => {
        const matches = nodes.filter((n) => n.getName() === binding.meshNodePath.split('/').at(-1));
        if (matches.length !== 1)
          throw Error(`Missing or ambiguous mesh mapping: ${binding.componentId}`);
        return matches[0];
      });
      for (const root of roots) {
        let parent = root.getParentNode();
        while (parent) {
          if (roots.includes(parent))
            throw Error(
              'Selectable roots must be disjoint; nested bindings would double-transform parts.',
            );
          parent = parent.getParentNode();
        }
      }
      if (
        model.modes.some((mode) => mode === 'exploded' || mode === 'disassembly') &&
        modelManifest.bindings.some((b) => !b.explodedTransform)
      )
        throw Error(
          'Exploded/disassembly modes require authored per-instance separation transforms.',
        );
      const boundIds = new Set(modelManifest.bindings.map((b) => b.componentId));
      if (model.componentIds.some((id) => !boundIds.has(id)))
        throw Error('Declared model coverage exceeds its actual semantic bindings.');
      for (const mesh of doc.getRoot().listMeshes())
        for (const primitive of mesh.listPrimitives()) {
          for (const attribute of ['POSITION', 'NORMAL']) {
            const values = primitive.getAttribute(attribute)?.getArray();
            if (!values || !Array.from(values).every(Number.isFinite))
              throw Error('Geometry has missing or invalid positions/normals.');
          }
        }
      let textureBytes = 0;
      for (const texture of doc.getRoot().listTextures()) {
        if (!texture.getImage()) throw Error('Missing model texture.');
        const size = texture.getSize();
        if (!size || size.some((n) => !Number.isFinite(n) || n <= 0 || n > 8192))
          throw Error('Unsupported texture dimensions or texture exceeds 8192 pixels.');
        textureBytes += size[0] * size[1] * 4;
      }
      if (textureBytes > 512 * 1024 * 1024)
        throw Error(
          'Decoded textures exceed the 512 MB budget; reduce texture sizes or split assemblies.',
        );
    }
  }
  report.checks.push(
    'Model rights/evidence, units, transforms, geometry, texture presence, identities and declared coverage',
  );
  const staged = resolve(job, 'staged');
  await mkdir(staged, { recursive: true });
  for (const [name, bytes] of files) {
    const path = resolve(staged, name);
    await mkdir(dirname(path), { recursive: true });
    let same = false;
    try {
      same = hash(await readFile(path)) === hash(bytes);
    } catch {
      /* Not staged yet. */
    }
    if (!same) await writeFile(path, bytes);
  }
  await writeFile(resolve(staged, 'manifest.json'), manifestBytes);
  report.status = 'validated';
  if (args.includes('--publish')) {
    const registryPath = resolve(publicRoot, 'vehicles/registry.json');
    let registry: { schemaVersion: number; vehicles: RegistryEntry[] } = {
      schemaVersion: 1,
      vehicles: [],
    };
    try {
      registry = JSON.parse(await readFile(registryPath, 'utf8'));
      if (registry.schemaVersion !== 1 || !Array.isArray(registry.vehicles))
        throw Error('Invalid existing registry.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const previous = registry.vehicles.find((e) => e.id === id);
    if (
      previous &&
      JSON.stringify(previous.configuration) !== JSON.stringify(manifest.configuration)
    )
      throw Error('Vehicle identities are immutable. Use a distinct configuration ID.');
    const target = resolve(publicRoot, 'vehicles', id, revision);
    await mkdir(dirname(target), { recursive: true });
    let exists = false;
    try {
      await access(target);
      exists = true;
    } catch {
      /* New version. */
    }
    if (exists) {
      if (hash(await readFile(resolve(target, 'manifest.json'))) !== hash(manifestBytes))
        throw Error('This revision already exists with different content. Publish a new revision.');
      for (const [name, bytes] of files)
        if (hash(await readFile(resolve(target, name))) !== hash(bytes))
          throw Error(
            'Published revision has missing or corrupt content; restore it from its original reviewed package.',
          );
    } else {
      const temp = await mkdtemp(target + '.publishing-');
      try {
        for (const [name] of files) {
          await mkdir(dirname(resolve(temp, name)), { recursive: true });
          await copyFile(resolve(staged, name), resolve(temp, name));
        }
        await copyFile(resolve(staged, 'manifest.json'), resolve(temp, 'manifest.json'));
        await rename(temp, target);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    }
    const entry: RegistryEntry = {
      id,
      label: `${manifest.configuration.year} ${manifest.configuration.manufacturer} ${manifest.configuration.model}`,
      configuration: manifest.configuration,
      manifestUrl: prefix + 'manifest.json',
      manifestHash: hash(manifestBytes),
      revision,
    };
    registry.vehicles = [...registry.vehicles.filter((e) => e.id !== id), entry];
    await writeFile(registryPath + '.tmp', JSON.stringify(registry, null, 2) + '\n');
    await rename(registryPath + '.tmp', registryPath);
    report.status = 'published';
  }
} catch (error) {
  report.status = 'failed';
  report.errors.push(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
await writeFile(resolve(job, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(
  `${report.status}: ${id}@${revision}; ${report.files.length} validated files. Report: ${job}/report.json`,
);
if (report.errors.length) console.error(report.errors.join('\n'));
