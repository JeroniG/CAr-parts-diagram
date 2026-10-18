import type {
  CatalogDataset,
  DiagramAsset,
  PhotoAsset,
  PublishedModel,
  VehicleManifest,
} from '../../types/vehiclePackage';
import type { VehicleConfiguration } from '../../types/catalog';
export type ProviderStatus =
  'ready' | 'unsupported' | 'not-configured' | 'missing-credentials' | 'unavailable';
export interface ProviderResult<T> {
  status: ProviderStatus;
  data: T | null;
  message: string;
  revision: string | null;
  cached: boolean;
}
export interface VehicleIdentityProvider {
  id: string;
  resolve(
    input: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult<Partial<VehicleConfiguration>[]>>;
}
export interface PartsCatalogProvider {
  id: string;
  catalog(vehicleId: string, signal?: AbortSignal): Promise<ProviderResult<CatalogDataset>>;
}
export interface DiagramProvider {
  id: string;
  diagrams(vehicleId: string, signal?: AbortSignal): Promise<ProviderResult<DiagramAsset[]>>;
}
export interface ModelAssetProvider {
  id: string;
  models(vehicleId: string, signal?: AbortSignal): Promise<ProviderResult<PublishedModel[]>>;
}
export interface PhotoProvider {
  id: string;
  photos(vehicleId: string, signal?: AbortSignal): Promise<ProviderResult<PhotoAsset[]>>;
}
export interface ServiceInformationProvider {
  id: string;
  procedures(
    vehicleId: string,
    signal?: AbortSignal,
  ): Promise<ProviderResult<VehicleManifest['serviceProcedures']>>;
}
export const providerConfiguration = [
  {
    id: 'local',
    name: 'Published vehicle packages',
    status: 'ready',
    scope: 'Versioned catalog, photos, diagrams and reviewed model assets',
  },
  {
    id: 'vpic',
    name: 'NHTSA vPIC',
    status: 'ready',
    scope: 'Optional VIN identity lookup; no component fitment or geometry',
  },
  {
    id: 'catalog-external',
    name: 'Licensed parts catalog',
    status: 'not-configured',
    scope: 'No external catalog provider connected',
  },
  {
    id: 'service-external',
    name: 'Licensed service information',
    status: 'not-configured',
    scope: 'No repair-content provider connected',
  },
] as const;
export function unavailableProvider<T>(
  message = 'No licensed provider is configured.',
): ProviderResult<T> {
  return { status: 'not-configured', data: null, message, revision: null, cached: false };
}
