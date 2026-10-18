import type { ViewMode } from './vehiclePackage';

/** A signed review of scope or geometry; a model file alone is never a completion review. */
export interface CompletionReview {
  reviewer: string;
  reviewedAt: string;
  sourceIds: string[];
  notes: string;
}
export interface CompletionArea {
  id: string;
  name: string;
  milestone: 1 | 2;
  componentIds: string[];
  requiredAssemblyIds: string[];
  requiredModes: ViewMode[];
  /** Null until a configuration-specific inventory audit establishes the actual quantity. */
  expectedInstances: number | null;
  inventoryReview: CompletionReview | null;
  /** Covers licensing, variant identity, dimensions, installed placement and interaction QA. */
  geometryReview: CompletionReview | null;
  missingMeasurements: string[];
}
export interface DiscoveryFinding {
  id: string;
  areaIds: string[];
  componentIds: string[];
  checkedAt: string;
  sourceUrl: string;
  outcome: 'reference-only' | 'rejected' | 'access-required' | 'candidate';
  reason: string;
  nextAction: string;
}
export interface CompletionPlan {
  schemaVersion: 1;
  vehicleId: string;
  areas: CompletionArea[];
  discoveries: DiscoveryFinding[];
}
