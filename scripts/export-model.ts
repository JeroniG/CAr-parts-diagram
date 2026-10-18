import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Box3, Mesh, Vector3 } from 'three';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildSmart451 } from '../src/vehicles/smart451';
import { vehicle, componentById } from '../src/data/catalog';
// GLTFExporter uses FileReader even in Node; only the two documented Blob readers are needed.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: NodeFileReader });
const model = buildSmart451();
model.updateMatrixWorld(true);
const binary = (await new GLTFExporter().parseAsync(model, {
  binary: true,
  onlyVisible: false,
})) as ArrayBuffer;
const path = 'public/models/smart-451';
await mkdir(path, { recursive: true });
await writeFile(`${path}/educational-v1.glb`, Buffer.from(binary));
const hash = createHash('sha256').update(Buffer.from(binary)).digest('hex');
const bindings = model.children.map((g) => {
  const b = new Box3().setFromObject(g);
  return {
    id: `binding-${g.name}`,
    modelAssetId: 'smart-451-educational-v1',
    meshNodePath: `smart-451/${g.name}`,
    componentId: g.name,
    transformData: { position: g.position.toArray(), rotation: [0, 0, 0], scale: [1, 1, 1] },
    boundingBox: { min: b.min.toArray(), max: b.max.toArray() },
    accuracyStatus: 'C',
  };
});
let triangles = 0;
model.traverse((o) => {
  if (o instanceof Mesh)
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
});
const bounds = new Box3().setFromObject(model).getSize(new Vector3()).toArray();
const manifest = {
  asset: {
    id: 'smart-451-educational-v1',
    vehicleConfigId: vehicle.id,
    fileUrl: '/models/smart-451/educational-v1.glb',
    sourceUrl: 'src/vehicles/smart451.ts',
    author: 'AutoAtlas 3D contributors',
    license: 'MIT',
    licenseEvidence: 'LICENSE',
    redistributionAllowed: true,
    geometryAccuracy: 'C',
    dimensionalVerification:
      'Overall proportions guided by owner manual. No part geometry is dimensionally verified. No Tier A or B components.',
    assetVersion: '1.0.0',
    contentHash: hash,
  },
  units: 'metres',
  orientation: '+Y up, +Z front, +X vehicle left',
  bounds,
  triangles,
  bindings,
};
for (const b of bindings)
  if (!componentById.has(b.componentId)) throw Error(`Unmapped ${b.componentId}`);
await writeFile(`${path}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Exported ${bindings.length} component groups, ${triangles} triangles, ${(binary.byteLength / 1024 / 1024).toFixed(2)} MB. SHA-256 ${hash}`,
);
model.traverse((o) => {
  if (o instanceof Mesh) {
    o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
  }
});
