/** Verify an unchanged editor round trip. This checks preservation, not physical accuracy. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import type { Node, Material } from '@gltf-transform/core';
import type {
  Clearcoat,
  EmissiveStrength,
  IOR,
  Transmission,
  Volume,
} from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { Matrix4, Vector3 } from 'three';
import { authoringIO, mappedRoots } from './lib/authoring';
import type { AuthoringMap } from './lib/authoring';

const args = process.argv.slice(2);
const option = (key: string) => {
  const index = args.indexOf(key);
  if (index < 0 || !args[index + 1]) throw Error(`Missing ${key}`);
  return args[index + 1];
};
const io = await authoringIO();
const source = await io.read(option('--source'));
const exported = await io.read(option('--exported'));
const mapping: AuthoringMap = JSON.parse(await readFile(option('--mapping'), 'utf8'));
const a = mappedRoots(source, mapping.componentRoots);
const b = mappedRoots(exported, mapping.componentRoots);
const tolerance = 0.00001; // 0.01 model mm; not a claim of real-world measurement accuracy

function surface(root: Node) {
  const points: number[][] = [];
  const materials = new Set<string>();
  let triangles = 0;
  root.traverse((node) => {
    const matrix = new Matrix4().fromArray(node.getWorldMatrix());
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const position = primitive.getAttribute('POSITION')!;
      triangles += (primitive.getIndices()?.getCount() ?? position.getCount()) / 3;
      materials.add(primitive.getMaterial()?.getName() ?? '');
      for (let i = 0; i < position.getCount(); i++)
        points.push(
          new Vector3().fromArray(position.getElement(i, [])).applyMatrix4(matrix).toArray(),
        );
    }
  });
  return { points, triangles, materials: [...materials].sort() };
}

function sameSurface(from: number[][], to: number[][]) {
  const grid = new Map<string, number[][]>();
  for (const point of to) {
    const key = point.map((n) => Math.floor(n / tolerance)).join(',');
    const bucket = grid.get(key) ?? [];
    bucket.push(point);
    grid.set(key, bucket);
  }
  for (const p of from) {
    const [x, y, z] = p.map((n) => Math.floor(n / tolerance));
    let found = false;
    for (let dx = -1; dx <= 1 && !found; dx++)
      for (let dy = -1; dy <= 1 && !found; dy++)
        for (let dz = -1; dz <= 1 && !found; dz++)
          found = (grid.get(`${x + dx},${y + dy},${z + dz}`) ?? []).some((q) =>
            p.every((n, i) => Math.abs(n - q[i]) <= tolerance),
          );
    assert.ok(found, 'Editor changed or lost a surface beyond the round-trip tolerance.');
  }
}

function materialValues(material: Material) {
  const coat = material.getExtension<Clearcoat>('KHR_materials_clearcoat');
  const volume = material.getExtension<Volume>('KHR_materials_volume');
  const strength =
    material
      .getExtension<EmissiveStrength>('KHR_materials_emissive_strength')
      ?.getEmissiveStrength() ?? 1;
  return [
    ...material.getBaseColorFactor(),
    material.getRoughnessFactor(),
    material.getMetallicFactor(),
    ...material.getEmissiveFactor().map((n) => n * strength),
    coat?.getClearcoatFactor() ?? 0,
    coat?.getClearcoatRoughnessFactor() ?? 0,
    material.getExtension<IOR>('KHR_materials_ior')?.getIOR() ?? 1.5,
    material.getExtension<Transmission>('KHR_materials_transmission')?.getTransmissionFactor() ?? 0,
    volume?.getThicknessFactor() ?? 0,
    ...(volume?.getAttenuationColor() ?? [1, 1, 1]),
    volume?.getAttenuationDistance() ?? Infinity,
  ];
}

let maxBoundsDrift = 0;
let triangles = 0;
for (const [id, root] of a) {
  const other = b.get(id)!;
  const first = surface(root),
    second = surface(other);
  assert.equal(second.triangles, first.triangles, `${id}: lost triangles`);
  assert.deepEqual(second.materials, first.materials, `${id}: changed material assignments`);
  sameSurface(first.points, second.points);
  sameSurface(second.points, first.points);
  triangles += first.triangles;
  const before = getBounds(root),
    after = getBounds(other);
  for (const key of ['min', 'max'] as const)
    before[key].forEach((n, i) => {
      maxBoundsDrift = Math.max(maxBoundsDrift, Math.abs(n - after[key][i]));
    });
}
for (const material of source.getRoot().listMaterials()) {
  const other = exported
    .getRoot()
    .listMaterials()
    .find((m) => m.getName() === material.getName());
  assert.ok(other, `Lost material: ${material.getName()}`);
  assert.equal(other.getAlphaMode(), material.getAlphaMode());
  assert.equal(other.getDoubleSided(), material.getDoubleSided());
  const before = materialValues(material),
    after = materialValues(other);
  before.forEach((value, index) =>
    assert.ok(
      value === after[index] || Math.abs(value - after[index]) < 1e-6,
      `Changed PBR parameter ${index} on ${material.getName()}`,
    ),
  );
}
for (const node of source.getRoot().listNodes())
  if (node.getName())
    assert.ok(
      exported
        .getRoot()
        .listNodes()
        .some((n) => n.getName() === node.getName()),
      `Lost named node: ${node.getName()}`,
    );
const report = {
  components: b.size,
  triangles,
  namedNodes: exported.getRoot().listNodes().length,
  sourceNamedNodes: source
    .getRoot()
    .listNodes()
    .filter((node) => node.getName()).length,
  materials: exported.getRoot().listMaterials().length,
  maxBoundsDriftMetres: maxBoundsDrift,
  surfaceToleranceMetres: tolerance,
  surfaceComparison: 'Every vertex in both directions; world coordinates; all component surfaces.',
  materialComparison:
    'Assignments, base color, roughness, metalness, effective emission, clearcoat, glass transmission/volume/IOR, alpha, double-sided.',
  geometryAccuracy:
    'Unverified. Round-trip preservation is not dimensional or vehicle-fitment verification.',
};
await writeFile(option('--report'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(report);
