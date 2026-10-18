/** Local free-editor workflow. Outputs are staged; never automatically published/reviewed. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dedup, dequantize, meshopt, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { authoringIO, mappedRoots, authoringBindings, type AuthoringMap } from './lib/authoring';
import { validateAssetManifest } from '../src/services/assetManifest';
import type { AssetManifest } from '../src/types/assembly';

const args = process.argv.slice(2);
const command = args.shift();
const option = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--'))
    throw Error(`Missing ${name}. See docs/FREE_AUTHORING.md.`);
  return args[index + 1];
};
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = (path: string, value: unknown) =>
  writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const scripts = dirname(fileURLToPath(import.meta.url));
const out = resolve(option('--out'));
const publicRelative = relative(resolve(scripts, '../public'), out);
if (!publicRelative.startsWith('..') && !isAbsolute(publicRelative))
  throw Error('Use a staging directory outside public; this command does not publish.');
const editor = option('--editor');
const run = async (script: string, pythonArgs: string[], project?: string) => {
  const editorArgs = ['--background', '--factory-startup', '--disable-autoexec'];
  if (project) editorArgs.push(project);
  editorArgs.push(
    '--python-exit-code',
    '1',
    '--python',
    resolve(scripts, script),
    '--',
    ...pythonArgs,
  );
  await new Promise<void>((accept, reject) => {
    const child = spawn(editor, editorArgs, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, BLENDER_USER_RESOURCES: resolve(out, '.editor-resources') },
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? accept() : reject(Error(`Editor failed (${code}).`))));
  });
};
const io = await authoringIO();

if (command === 'prepare') {
  const binary = await readFile(resolve(option('--model')));
  const manifest: AssetManifest = JSON.parse(await readFile(resolve(option('--manifest')), 'utf8'));
  validateAssetManifest(
    manifest,
    manifest.asset.vehicleConfigId,
    new Set(manifest.bindings.map((binding) => binding.componentId)),
    manifest.assemblyId,
  );
  if (binary.length > 200 * 1024 * 1024) throw Error('Model exceeds 200 MB.');
  if (hash(binary) !== manifest.asset.contentHash)
    throw Error('Source hash differs from manifest.');
  const document = await io.readBinary(binary);
  const componentRoots = Object.fromEntries(
    manifest.bindings.map((binding) => [
      binding.componentId,
      binding.meshNodePath.split('/').at(-1)!,
    ]),
  );
  mappedRoots(document, componentRoots);
  // Editors need ordinary vertex buffers; the shipping GLBs use Meshopt/quantization.
  document.disposeExtension('EXT_meshopt_compression');
  await document.transform(dequantize());
  const mapping: AuthoringMap = {
    vehicleConfigId: manifest.asset.vehicleConfigId,
    license: manifest.asset.license,
    redistributionAllowed: manifest.asset.redistributionAllowed,
    sourceHash: manifest.asset.contentHash,
    sourceManifest: 'source.manifest.json',
    componentRoots,
    explodedTransforms: Object.fromEntries(
      manifest.bindings.map((binding) => [
        binding.componentId,
        binding.explodedTransform ?? { translation: [0, 0, 0], rotation: [0, 0, 0] },
      ]),
    ),
  };
  await mkdir(out, { recursive: false });
  await writeFile(resolve(out, 'source.glb'), await io.writeBinary(document), { flag: 'wx' });
  await json(resolve(out, 'source.manifest.json'), manifest);
  await json(
    resolve(out, 'material-intent.json'),
    Object.fromEntries(
      document
        .getRoot()
        .listMaterials()
        .map((material) => [
          material.getName(),
          {
            alphaMode: material.getAlphaMode(),
            doubleSided: material.getDoubleSided(),
          },
        ]),
    ),
  );
  await json(resolve(out, 'component-map.json'), mapping);
  await run('create_authoring_project.py', [
    '--model',
    resolve(out, 'source.glb'),
    '--mapping',
    resolve(out, 'component-map.json'),
    '--output',
    resolve(out, 'assembly.blend'),
  ]);
  console.log(`Editable project: ${out}/assembly.blend. Source geometry remains unverified.`);
} else if (command === 'export') {
  const project = resolve(option('--project'));
  const projectHash = hash(await readFile(project));
  const mappingPath = resolve(option('--mapping'));
  const mapping: AuthoringMap = JSON.parse(await readFile(mappingPath, 'utf8'));
  const template: AssetManifest = JSON.parse(
    await readFile(resolve(dirname(mappingPath), mapping.sourceManifest), 'utf8'),
  );
  validateAssetManifest(
    template,
    mapping.vehicleConfigId,
    new Set(Object.keys(mapping.componentRoots)),
    template.assemblyId,
  );
  if (
    mapping.sourceHash !== template.asset.contentHash ||
    mapping.license !== template.asset.license
  )
    throw Error('Mapping provenance differs from the source manifest.');
  await mkdir(out, { recursive: false });
  const raw = resolve(out, 'editor-export.glb');
  const reportPath = resolve(out, 'editor-report.json');
  await run(
    'prepare_blender.py',
    ['--mapping', mappingPath, '--output', raw, '--report', reportPath],
    project,
  );
  if (hash(await readFile(project)) !== projectHash)
    throw Error('Editor unexpectedly changed the source project.');
  const report: {
    editorVersion: string;
    components: Record<
      string,
      {
        node: string;
        explodedTransform: NonNullable<AssetManifest['bindings'][number]['explodedTransform']>;
      }
    >;
  } = JSON.parse(await readFile(reportPath, 'utf8'));
  const roots = Object.fromEntries(
    Object.entries(report.components).map(([id, entry]) => [id, entry.node]),
  );
  const document = await io.read(raw);
  // Blender may export a transmission material with alpha=1 as OPAQUE even when
  // its imported glTF used BLEND. Preserve the editable material intent property.
  for (const material of document.getRoot().listMaterials()) {
    const mode = material.getExtras().autoatlasAlphaMode;
    if (mode === 'OPAQUE' || mode === 'MASK' || mode === 'BLEND') material.setAlphaMode(mode);
    const doubleSided = material.getExtras().autoatlasDoubleSided;
    if (typeof doubleSided === 'boolean') material.setDoubleSided(doubleSided);
  }
  mappedRoots(document, roots);
  const names = document
    .getRoot()
    .listNodes()
    .map((node) => node.getName());
  await document.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const binary = await io.writeBinary(document);
  const decoded = await io.readBinary(binary);
  for (const name of names)
    if (
      !decoded
        .getRoot()
        .listNodes()
        .some((node) => node.getName() === name)
    )
      throw Error(`Compression lost named node ${name}`);
  const contentHash = hash(binary);
  const assetId = `${template.asset.id}-edit-${contentHash.slice(0, 12)}`;
  const bindings = authoringBindings(decoded, roots, template, assetId).map((binding) => ({
    ...binding,
    explodedTransform: report.components[binding.componentId].explodedTransform,
  }));
  const manifest: AssetManifest = {
    ...template,
    asset: {
      ...template.asset,
      id: assetId,
      contentHash,
      geometryAccuracy: 'C',
      assetVersion: `edited-${contentHash.slice(0, 12)}`,
      dimensionalVerification:
        'Edited geometry: shape, scale, fitment and motion require fresh review.',
    },
    bindings,
    bounds: [0, 1, 2].map(
      (axis) =>
        Math.max(...bindings.map((b) => b.boundingBox.max[axis])) -
        Math.min(...bindings.map((b) => b.boundingBox.min[axis])),
    ),
    triangles: decoded
      .getRoot()
      .listMeshes()
      .reduce(
        (sum, mesh) =>
          sum +
          mesh
            .listPrimitives()
            .reduce(
              (n, p) =>
                n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3,
              0,
            ),
        0,
      ),
  };
  delete manifest.verificationEvidence;
  delete manifest.motionRig; // edited pivots must not inherit the sample's hardcoded kinematics
  validateAssetManifest(
    manifest,
    mapping.vehicleConfigId,
    new Set(Object.keys(roots)),
    template.assemblyId,
  );
  const lod = manifest.lod ?? 'model';
  await writeFile(resolve(out, `${lod}.glb`), binary, { flag: 'wx' });
  await json(resolve(out, `${lod}.manifest.json`), manifest);
  await json(resolve(out, 'authoring-report.json'), {
    editorVersion: report.editorVersion,
    sourceHash: mapping.sourceHash,
    projectHash,
    contentHash,
    components: bindings.length,
    geometryStatus: 'demonstration',
    animations: decoded
      .getRoot()
      .listAnimations()
      .map((animation) => animation.getName()),
    note: 'Staged only. Existing publication paths are retained as proposed destinations. Review both LODs before publishing.',
  });
  console.log(
    `Staged ${bindings.length} components in ${out}. No publication or verification performed.`,
  );
} else {
  throw Error(
    'Usage: npm run author:assembly -- prepare|export --editor /path/to/bforartists ... See docs/FREE_AUTHORING.md.',
  );
}
