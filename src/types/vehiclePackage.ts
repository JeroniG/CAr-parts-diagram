import type {
  Component,
  ComponentRelationship,
  MechanismAnimation,
  OEMPart,
  PartFitment,
  SourceRecord,
  VehicleConfiguration,
  VehicleSystem,
  Vec3,
} from './catalog';
import type { AssemblyDefinition } from './assembly';
import type { CameraView } from '../scene/state';
export type ViewMode =
  | 'studio'
  | 'photos'
  | 'showroom'
  | 'premium'
  | 'xray'
  | 'exploded'
  | 'cutaway'
  | 'component'
  | 'disassembly'
  | 'interior'
  | 'powertrain'
  | 'suspension'
  | 'underbody'
  | 'hatch'
  | 'materials';
export interface RightsRecord {
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  redistributionAllowed: boolean;
  retrievedAt: string;
}
export interface PhotoAsset extends RightsRecord {
  id: string;
  url: string;
  sha256: string;
  kind: 'photograph' | 'render';
  caption: string;
  scope: string;
  width: number;
  height: number;
  componentIds: string[];
  hotspots: { instanceId: string; label: string; x: number; y: number }[];
}
export interface DiagramAsset extends RightsRecord {
  id: string;
  url: string;
  sha256: string;
  revision: string;
  caption: string;
  assemblyId: string;
  width: number;
  height: number;
  scope: string;
  callouts: { figureLabel: string; instanceId: string; x: number; y: number }[];
}
export interface PublishedModel {
  id: string;
  scope: 'vehicle' | 'assembly';
  assemblyId?: string;
  variants: Record<'high' | 'low', { assetUrl: string; manifestUrl: string }>;
  componentIds: string[];
  modes: ViewMode[];
  geometryStatus: 'reviewed' | 'demonstration';
  scaleValidated: boolean;
  evidence: string[];
}
export interface PartDefinition {
  id: string;
  name: string;
  description: string;
  sourceIds: string[];
  identityStatus: 'unverified' | 'source-backed';
}
export interface PartInstance {
  id: string;
  definitionId: string;
  parentAssemblyId: string | null;
  side: 'left' | 'right' | 'center';
  assembled?: { position: Vec3; rotation: Vec3; scale: Vec3 };
}
export interface CatalogDataset {
  vehicle: VehicleConfiguration;
  systems: VehicleSystem[];
  components: Component[];
  sources: SourceRecord[];
  oemParts: OEMPart[];
  fitments: PartFitment[];
  relationships: ComponentRelationship[];
  animations: MechanismAnimation[];
  partDefinitions: PartDefinition[];
  partInstances: PartInstance[];
}
export interface VehicleManifest {
  schemaVersion: 1;
  revision: string;
  publishedAt: string;
  configuration: VehicleConfiguration;
  catalogUrl: string;
  catalogHash: string;
  photos: PhotoAsset[];
  diagrams: DiagramAsset[];
  models: PublishedModel[];
  assemblies: AssemblyDefinition[];
  providerRevisions: {
    provider: string;
    revision: string;
    retrievedAt: string;
    staleAfter: string | null;
  }[];
  exteriorComponentIds?: string[];
  cameraPresets?: Partial<Record<CameraView, { position: Vec3; target: Vec3 }>>;
  modeCameras?: Partial<Record<ViewMode, CameraView>>;
  featuredAssemblyId?: string;
  focusTargets?: Partial<Record<ViewMode, string>>;
  serviceProcedures: {
    id: string;
    componentId: string;
    sourceId: string;
    title: string;
    url: string;
    scope: string;
  }[];
  fixture?: boolean;
}
export interface RegistryEntry {
  id: string;
  label: string;
  configuration: VehicleConfiguration;
  manifestUrl: string;
  manifestHash: string;
  revision: string;
}
export interface VehiclePackage {
  manifest: VehicleManifest;
  data: CatalogDataset;
}
