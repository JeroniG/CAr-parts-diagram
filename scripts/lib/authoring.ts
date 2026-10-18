import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { Euler, Quaternion } from 'three';
import type { AssetManifest } from '../../src/types/assembly';
import type { Vec3 } from '../../src/types/catalog';

export interface AuthoringMap {
  vehicleConfigId: string;
  license: string;
  redistributionAllowed: boolean;
  sourceHash: string;
  sourceManifest: string;
  componentRoots: Record<string, string>;
  explodedTransforms: Record<string, { translation: Vec3; rotation: Vec3 }>;
}

export async function authoringIO() {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });
}

/** No flattening: every independently selectable root must survive the editor. */
export function mappedRoots(document: Document, mapping: Record<string, string>) {
  const nodes = document.getRoot().listNodes();
  const roots = new Map<string, Node>();
  for (const [id, name] of Object.entries(mapping)) {
    const matches = nodes.filter((node) => node.getName() === name);
    if (matches.length !== 1) throw Error(`Missing or ambiguous component root: ${id} / ${name}`);
    if ([...roots.values()].includes(matches[0])) throw Error(`Multiply assigned root: ${name}`);
    roots.set(id, matches[0]);
  }
  if (!roots.size) throw Error('No mapped components.');
  const covered = new Set<Node>();
  for (const [id, root] of roots) {
    for (let parent = root.getParentNode(); parent; parent = parent.getParentNode())
      if ([...roots.values()].includes(parent)) throw Error(`Nested component root: ${id}`);
    let vertices = 0;
    root.traverse((node) => {
      covered.add(node);
      for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
        const position = primitive.getAttribute('POSITION');
        const normal = primitive.getAttribute('NORMAL');
        if (!position || !normal || primitive.getMode() !== 4)
          throw Error(`Component ${id} needs triangle geometry and normals.`);
        for (const attribute of [position, normal])
          if (!Array.from(attribute.getArray() ?? []).every(Number.isFinite))
            throw Error(`Non-finite geometry: ${id}`);
        const indices = primitive.getIndices();
        if (indices && Array.from(indices.getArray() ?? []).some((v) => v >= position.getCount()))
          throw Error(`Invalid vertex index: ${id}`);
        vertices += position.getCount();
      }
    });
    if (!vertices || !Object.values(getBounds(root)).flat().every(Number.isFinite))
      throw Error(`Empty or invalid geometry: ${id}`);
  }
  if (nodes.some((node) => node.getMesh() && !covered.has(node)))
    throw Error('Unmapped geometry would be exported; map each physical component.');
  return roots;
}

export function authoringBindings(
  document: Document,
  mapping: Record<string, string>,
  template: AssetManifest,
  assetId: string,
) {
  const roots = mappedRoots(document, mapping);
  if (
    roots.size !== template.bindings.length ||
    template.bindings.some((binding) => !roots.has(binding.componentId))
  )
    throw Error('Edited component identities differ from the source catalog mapping.');
  return template.bindings.map((binding) => {
    const root = roots.get(binding.componentId)!;
    const path = [root.getName()];
    for (let parent = root.getParentNode(); parent; parent = parent.getParentNode())
      path.unshift(parent.getName());
    const rotation = new Euler().setFromQuaternion(new Quaternion(...root.getRotation()));
    return {
      ...binding,
      id: `${assetId}-${binding.componentId}`,
      modelAssetId: assetId,
      meshNodePath: path.join('/'),
      accuracyStatus: 'C' as const,
      transformData: {
        position: root.getTranslation(),
        rotation: [rotation.x, rotation.y, rotation.z] as Vec3,
        scale: root.getScale(),
      },
      boundingBox: getBounds(root),
    };
  });
}
