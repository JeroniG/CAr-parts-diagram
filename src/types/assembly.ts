import type { Accuracy, ModelAsset, MeshBinding, Vec3 } from './catalog';

export interface AssemblyPart {
  id: string;
  name: string;
  parent: string;
  function: string;
  material: string;
  location: string;
  callout: string;
  motion: 'upper' | 'lower' | 'fixed' | 'strut';
  separation: Vec3;
  aliases?: string[];
}

export interface AssemblyDefinition {
  id: string;
  vehicleConfigId: string;
  name: string;
  sourceIds: string[];
  replaces: string[];
  variants: Record<'high' | 'low', { assetUrl: string; manifestUrl: string }>;
  parts: AssemblyPart[];
  accuracy: Accuracy;
  verification: string;
}

export interface AssetManifest {
  asset: ModelAsset;
  bindings: (MeshBinding & { explodedTransform?: { translation: Vec3; rotation: Vec3 } })[];
  units: string;
  assemblyId?: string;
  lod?: 'high' | 'low';
  bounds?: number[];
  triangles?: number;
  verificationEvidence?: { sourceUrl: string; reviewer: string; reviewedAt: string }[];
  motionRig?: 'illustrative-hatch-v1';
}

export interface AssemblyLoadStatus {
  phase: 'idle' | 'loading' | 'ready' | 'error';
  progress: number;
  lod: 'high' | 'low' | null;
  message: string;
  motionAvailable?: boolean;
}

export const idleAssemblyStatus: AssemblyLoadStatus = {
  phase: 'idle',
  progress: 0,
  lod: null,
  message: '',
};
