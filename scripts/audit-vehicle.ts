import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { validateVehiclePackage } from '../src/data/validation/vehicleManifest';
import { computeCompleteness } from '../src/features/completeness/completeness';
import type { AssetManifest } from '../src/types/assembly';

// Read-only discovery: no asset is promoted, fetched, converted or published by this command.
const packagePath = process.argv[2] ?? 'src/data/initialVehicle.json';
const output = process.argv[3] ?? 'docs/reports/smart-451-completion.json';
const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
validateVehiclePackage(pkg);
const root = process.cwd();
async function walk(directory: string): Promise<string[]> {
  const files: string[] = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await walk(path)));
      else if (entry.isFile()) files.push(path); // Do not follow symlinks outside the workspace.
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return files;
}
const files = (
  await Promise.all(['public/models', 'public/vehicles', 'assets', '.imports'].map(walk))
).flat();
const geometryExtensions = new Set([
  '.glb',
  '.gltf',
  '.obj',
  '.fbx',
  '.step',
  '.stp',
  '.stl',
  '.blend',
  '.3ds',
]);
const geometryFiles = await Promise.all(
  files
    .filter((path) => geometryExtensions.has(extname(path).toLowerCase()))
    .map(async (path) => ({ path: relative(root, path), bytes: (await stat(path)).size })),
);
const localAssets: {
  manifestPath: string;
  id: string;
  fileUrl: string;
  accuracy: string;
  integrity: string;
  license: string;
  dimensionalVerification: string;
  componentIds: string[];
}[] = [];
for (const path of files.filter((path) => path.endsWith('.json'))) {
  let asset: AssetManifest;
  try {
    asset = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    continue;
  }
  if (asset?.asset?.vehicleConfigId !== pkg.data.vehicle.id || !Array.isArray(asset.bindings))
    continue;
  const url = asset.asset.fileUrl;
  let integrity = 'missing-or-unresolved';
  if (url?.startsWith('/') && !url.includes('..')) {
    try {
      integrity =
        createHash('sha256')
          .update(await readFile(resolve(root, `public${url}`)))
          .digest('hex') === asset.asset.contentHash
          ? 'hash-matches'
          : 'hash-mismatch';
    } catch {
      /* report missing bytes */
    }
  }
  localAssets.push({
    manifestPath: relative(root, path),
    id: asset.asset.id,
    fileUrl: url,
    accuracy: asset.asset.geometryAccuracy,
    integrity,
    license: asset.asset.license,
    dimensionalVerification: asset.asset.dimensionalVerification,
    componentIds: [...new Set(asset.bindings.map((b) => b.componentId))],
  });
}
const report = computeCompleteness(pkg);
const tasks = report.tasks.map((task) => ({
  ...task,
  localAssetSearch: {
    scannedRoots: ['public/models', 'public/vehicles', 'assets', '.imports'],
    matchingManifests: localAssets
      .filter((a) => a.componentIds.includes(task.componentId))
      .map((a) => a.manifestPath),
    result: localAssets.some((a) => a.componentIds.includes(task.componentId))
      ? 'Local mapped asset found; review accuracy, rights and measurements before use.'
      : 'No mapped local asset found. Unmapped files, if present, still require manual identification.',
  },
}));
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      ...report,
      tasks,
      discoveries: pkg.manifest.completionPlan?.discoveries ?? [],
      sources: pkg.data.sources,
      localAssets,
      geometryFiles,
      limitations: [
        'Catalog scope is open; the whole physical inventory is unknown.',
        'Local files are inspected by metadata and hash, not certified for geometry or physical placement.',
        'This audit does not perform online searches. Only recorded discovery findings represent completed research.',
        'Development geometry and authoring files are excluded from milestone completion.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `${tasks.length} open component tasks; ${localAssets.length} matching local asset manifests; ${report.catalog.reviewedGeometry} reviewed, scaled parts. Report: ${output}`,
);
