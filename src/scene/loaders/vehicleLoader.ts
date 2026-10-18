import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { Box3, Group, Mesh, SkinnedMesh, Texture, Vector3 } from 'three';
import type { AnimationClip, WebGLRenderer } from 'three';
import type { ModelAsset } from '../../types/catalog';

import { validateAssetManifest } from '../../services/assetManifest';
export interface LoadedVehicle {
  root: Group;
  parts: Map<string, Group>;
  clips: AnimationClip[];
  asset: ModelAsset;
  motionRig?: string;
}
export interface LoadOptions {
  vehicleId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  componentIds?: Set<string>;
  assemblyId?: string;
  renderer?: WebGLRenderer;
}
export async function loadVehicle(
  assetUrl: string,
  manifestUrl: string,
  options: LoadOptions = {},
): Promise<LoadedVehicle> {
  const response = await fetch(manifestUrl, { signal: options.signal });
  if (!response.ok) throw Error(`Asset manifest unavailable (${response.status}).`);
  const manifest: unknown = await response.json();
  validateAssetManifest(
    manifest,
    options.vehicleId ?? '',
    options.componentIds ?? new Set(),
    options.assemblyId,
  );
  const modelResponse = await fetch(assetUrl, { signal: options.signal });
  if (!modelResponse.ok) throw Error(`Model unavailable (${modelResponse.status}).`);
  const size = Number(modelResponse.headers.get('content-length'));
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const reader = modelResponse.body?.getReader();
  if (reader) {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (loaded > 200 * 1024 * 1024) {
        await reader.cancel();
        throw Error('Model exceeds the 200 MB import limit.');
      }
      options.onProgress?.(size ? Math.min(0.85, (loaded / size) * 0.85) : 0.3);
    }
  } else {
    const b = new Uint8Array(await modelResponse.arrayBuffer());
    chunks.push(b);
    loaded = b.length;
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  if (hash !== manifest.asset.contentHash)
    throw Error('Asset integrity check failed. The model differs from its reviewed manifest.');
  options.signal?.throwIfAborted();
  const ktx = options.renderer
    ? new KTX2Loader()
        .setTranscoderPath('/decoders/basis/')
        .setWorkerLimit(1)
        .detectSupport(options.renderer)
    : null;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  if (ktx) loader.setKTX2Loader(ktx);
  let gltf;
  try {
    gltf = await loader.parseAsync(
      bytes.buffer,
      new URL('.', new URL(assetUrl, location.href)).href,
    );
  } finally {
    ktx?.dispose();
  }
  if (options.signal?.aborted) {
    disposeObject(gltf.scene);
    options.signal.throwIfAborted();
  }
  const parts = new Map<string, Group>();
  const root = gltf.scene;
  try {
    const names = new Set(manifest.bindings.map((b) => b.meshNodePath.split('/').at(-1)!));
    root.traverse((node) => {
      if (!names.has(node.name)) return;
      let parent = node.parent;
      while (parent && parent !== root) {
        if (names.has(parent.name)) throw Error('Semantic part roots must not be nested.');
        parent = parent.parent;
      }
    });
    for (const binding of manifest.bindings) {
      if (!options.componentIds?.has(binding.componentId))
        throw Error(`Unknown component: ${binding.componentId}`);
      if (parts.has(binding.componentId))
        throw Error(`Duplicate component binding: ${binding.componentId}`);
      const name = binding.meshNodePath.split('/').at(-1)!;
      const candidates: Group[] = [];
      root.traverse((node) => {
        if (node.name === name) candidates.push(node as Group);
      });
      if (candidates.length !== 1) throw Error(`Missing or ambiguous semantic node: ${name}`);
      const node = candidates[0];
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
      group.userData.explodedTransform = binding.explodedTransform;
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
    options.onProgress?.(1);
    return {
      root,
      parts,
      clips: gltf.animations,
      asset: manifest.asset,
      motionRig: manifest.motionRig,
    };
  } catch (error) {
    disposeObject(root);
    throw error;
  }
}
export function disposeObject(root: Group) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set<Texture>();
  root.traverse((o) => {
    if (o instanceof Mesh) {
      if (!geometries.has(o.geometry)) {
        o.geometry.dispose();
        geometries.add(o.geometry);
      }
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (materials.has(m)) continue;
        for (const value of Object.values(m)) if (value instanceof Texture) textures.add(value);
        m.dispose();
        materials.add(m);
      }
      if (o instanceof SkinnedMesh) o.skeleton.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}
