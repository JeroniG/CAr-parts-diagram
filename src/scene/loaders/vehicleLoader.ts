import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Box3, Group, Mesh, Vector3 } from 'three';
import type { AnimationClip } from 'three';
import type { MeshBinding, ModelAsset } from '../../types/catalog';
import { componentById } from '../../data/catalog';
export interface LoadedVehicle {
  root: Group;
  parts: Map<string, Group>;
  clips: AnimationClip[];
  asset: ModelAsset;
}
export async function loadVehicle(assetUrl: string, manifestUrl: string): Promise<LoadedVehicle> {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw Error(`Asset manifest unavailable (${response.status}).`);
  const manifest = (await response.json()) as {
    asset: ModelAsset;
    bindings: MeshBinding[];
    units: string;
  };
  if (manifest.units !== 'metres' || !manifest.asset.redistributionAllowed)
    throw Error('Asset units or redistribution rights are not approved.');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(assetUrl);
  const parts = new Map<string, Group>();
  const root = gltf.scene;
  try {
    for (const binding of manifest.bindings) {
      if (!componentById.has(binding.componentId))
        throw Error(`Unknown component: ${binding.componentId}`);
      if (parts.has(binding.componentId))
        throw Error(`Duplicate component binding: ${binding.componentId}`);
      const node = root.getObjectByName(binding.meshNodePath.split('/').at(-1)!);
      if (!node) throw Error(`Model is missing ${binding.meshNodePath}`);
      root.updateMatrixWorld(true);
      if (gltf.animations.length && !node.parent!.matrixWorld.equals(root.matrixWorld))
        throw Error(
          'Animated component roots must have normalized parent transforms. Prepare the asset before import.',
        );
      // A separate origin shim preserves the source node transform and animation channel values.
      root.attach(node);
      const center = new Box3().setFromObject(node).getCenter(new Vector3());
      const group = new Group();
      group.name = `component-wrapper:${binding.componentId}`;
      group.userData.componentId = binding.componentId;
      group.position.copy(center);
      const origin = new Group();
      origin.name = `component-origin:${binding.componentId}`;
      origin.position.copy(center).negate();
      root.add(group);
      group.add(origin);
      origin.add(node);
      parts.set(binding.componentId, group);
    }
    root.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return { root, parts, clips: gltf.animations, asset: manifest.asset };
  } catch (error) {
    disposeObject(root);
    throw error;
  }
}
export function disposeObject(root: Group) {
  root.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
  });
}
