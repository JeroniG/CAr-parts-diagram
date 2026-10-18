export type Accuracy = 'A' | 'B' | 'C' | 'D';
export type Vec3 = [number, number, number];
export type FitmentStatus =
  'vin-confirmed' | 'catalog-confirmed' | 'cross-checked' | 'tentative' | 'unknown';
export interface SourceRecord {
  id: string;
  sourceUrl: string;
  publisher: string;
  documentTitle: string;
  publicationDate: string | null;
  retrievedAt: string;
  rights: string;
  notes: string;
}
export interface VehicleConfiguration {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  generation: string;
  chassisCode: string;
  market: string;
  trim: string;
  bodyStyle: string;
  engineCode: string | null;
  transmissionCode: string | null;
  engine: string;
  transmission: string;
  drivetrain: string;
  steeringSide?: 'left' | 'right' | null;
  vinConditions?: string | null;
  equipmentRestrictions?: string[];
  productionStart: string | null;
  productionEnd: string | null;
  dimensions: {
    length: number | null;
    widthWithMirrors: number | null;
    height: number | null;
    wheelbase: number | null;
  };
  sourceIds: string[];
}
export interface VehicleSystem {
  id: string;
  name: string;
  description: string;
  color: string;
  parentSystemId: string | null;
}
export interface Component {
  id: string;
  vehicleConfigId: string;
  systemId: string;
  parentComponentId: string | null;
  name: string;
  description: string;
  function: string;
  location: string;
  side: 'left' | 'right' | 'center';
  componentType: 'assembly' | 'part';
  safetyCritical: boolean;
  serviceable: boolean | null;
  accuracy: Accuracy;
  aliases: string[];
  sourceIds: string[];
  geometryNotes: string;
}
export interface ModelAsset {
  id: string;
  vehicleConfigId: string;
  fileUrl: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseEvidence: string;
  redistributionAllowed: boolean;
  geometryAccuracy: Accuracy;
  dimensionalVerification: string;
  assetVersion: string;
  contentHash: string;
}
export interface MeshBinding {
  id: string;
  modelAssetId: string;
  meshNodePath: string;
  componentId: string;
  transformData: { position: Vec3; rotation: Vec3; scale: Vec3 };
  boundingBox: { min: Vec3; max: Vec3 };
  accuracyStatus: Accuracy;
}
export interface ComponentRelationship {
  componentId: string;
  relatedComponentId: string;
  type: 'actuates' | 'mates-with' | 'mounted-to' | 'drives';
  evidence: string;
}
export interface OEMPart {
  id: string;
  manufacturer: string;
  partNumber: string;
  description: string;
  supersededBy: string | null;
  sourceId: string;
}
export interface PartFitment {
  id: string;
  oemPartId: string;
  vehicleConfigId: string;
  componentId: string;
  productionRange: string | null;
  trimRestrictions: string[];
  optionRestrictions: string[];
  verificationStatus: FitmentStatus;
  verifiedAt: string | null;
  sourceId: string;
  notes: string;
}
export interface MechanismAnimation {
  id: string;
  componentId: string;
  assetUrl: string | null;
  clipName: string | null;
  description: string;
  accuracyStatus: Accuracy;
  referenceSourceId: string;
}
