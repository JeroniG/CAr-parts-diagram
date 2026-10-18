import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { Box3, Mesh, Vector3 } from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildRearHatch } from '../src/vehicles/rearHatchModel';
import { rearHatch, hatchPartById } from '../src/vehicles/rearHatch';
import { disposeObject } from '../src/scene/loaders/vehicleLoader';
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
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const directory = 'public/models/smart-451/rear-hatch';
await mkdir(directory, { recursive: true });
for (const lod of ['low', 'high'] as const) {
  const root = buildRearHatch(lod);
  root.updateMatrixWorld(true);
  const raw = (await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: false,
  })) as ArrayBuffer;
  const doc = await io.readBinary(new Uint8Array(raw));
  await doc.transform(dedup(), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const binary = await io.writeBinary(doc);
  const assetId = `smart-451-hatch-sample-${lod}-v1`;
  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof Mesh)
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  const manifest = {
    asset: {
      id: assetId,
      vehicleConfigId: rearHatch.vehicleConfigId,
      fileUrl: rearHatch.variants[lod].assetUrl,
      sourceUrl: 'src/vehicles/rearHatchModel.ts',
      author: 'AutoAtlas 3D contributors',
      license: 'MIT',
      licenseEvidence: 'LICENSE',
      redistributionAllowed: true,
      geometryAccuracy: 'C',
      dimensionalVerification: rearHatch.verification,
      assetVersion: `hatch-1.0.0-${lod}`,
      contentHash: createHash('sha256').update(binary).digest('hex'),
    },
    assemblyId: rearHatch.id,
    lod,
    motionRig: 'illustrative-hatch-v1',
    units: 'metres',
    orientation: '+Y up, +Z front, +X vehicle left',
    bounds: new Box3().setFromObject(root).getSize(new Vector3()).toArray(),
    triangles,
    compression: 'EXT_meshopt_compression',
    bindings: root.children.map((g) => {
      const b = new Box3().setFromObject(g),
        part = hatchPartById.get(g.name)!;
      return {
        id: `${assetId}-${g.name}`,
        modelAssetId: assetId,
        componentId: g.name,
        meshNodePath: `${root.name}/${g.name}`,
        transformData: { position: g.position.toArray(), rotation: [0, 0, 0], scale: [1, 1, 1] },
        boundingBox: { min: b.min.toArray(), max: b.max.toArray() },
        accuracyStatus: 'C',
        explodedTransform: { translation: part.separation, rotation: [0, 0, 0] },
      };
    }),
  };
  await writeFile(`${directory}/${lod}.glb`, binary);
  await writeFile(`${directory}/${lod}.manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `${lod}: ${root.children.length} component groups, ${triangles} source triangles, ${(binary.length / 1024).toFixed(0)} KiB`,
  );
  disposeObject(root);
}
