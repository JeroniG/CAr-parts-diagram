import type { RegistryEntry, VehiclePackage } from '../../types/vehiclePackage';
import type {
  DiagramProvider,
  ModelAssetProvider,
  PartsCatalogProvider,
  PhotoProvider,
  ProviderResult,
  ServiceInformationProvider,
} from './contracts';
import { loadVehiclePackage, isVehicleCached } from '../../features/vehicles/VehicleDataService';
export function createLocalProviders(
  registry: RegistryEntry[],
): PartsCatalogProvider &
  DiagramProvider &
  ModelAssetProvider &
  PhotoProvider &
  ServiceInformationProvider {
  async function read<T>(
    id: string,
    select: (pkg: VehiclePackage) => T,
    signal?: AbortSignal,
  ): Promise<ProviderResult<T>> {
    const entry = registry.find((e) => e.id === id);
    if (!entry)
      return {
        status: 'unsupported',
        data: null,
        message: 'No published package for this configuration.',
        revision: null,
        cached: false,
      };
    try {
      const cached = isVehicleCached(entry);
      const pkg = await loadVehiclePackage(entry, signal);
      return {
        status: 'ready',
        data: select(pkg),
        message: 'Published local package.',
        revision: pkg.manifest.revision,
        cached,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        status: 'unavailable',
        data: null,
        message: error instanceof Error ? error.message : 'Package unavailable.',
        revision: entry.revision,
        cached: false,
      };
    }
  }
  return {
    id: 'local-published',
    catalog: (id, s) => read(id, (p) => p.data, s),
    diagrams: (id, s) => read(id, (p) => p.manifest.diagrams, s),
    models: (id, s) => read(id, (p) => p.manifest.models, s),
    photos: (id, s) => read(id, (p) => p.manifest.photos, s),
    procedures: (id, s) => read(id, (p) => p.manifest.serviceProcedures, s),
  };
}
