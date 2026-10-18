import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { RegistryEntry, VehiclePackage } from '../../types/vehiclePackage';
import { createCatalog } from '../../services/catalog';
import { computeCoverage } from '../coverage/coverage';
export function createWorkspaceData(pkg: VehiclePackage) {
  return {
    ...pkg.data,
    ...createCatalog(pkg.data),
    manifest: pkg.manifest,
    coverage: computeCoverage(pkg),
  };
}
export type WorkspaceData = ReturnType<typeof createWorkspaceData>;
interface VehicleContextValue {
  data: WorkspaceData;
  registry: RegistryEntry[];
  changeVehicle: (entry: RegistryEntry) => Promise<boolean>;
  loading: string | null;
  error: string;
}
const CatalogContext = createContext<VehicleContextValue | null>(null);
export function CatalogProvider({
  pkg,
  registry,
  changeVehicle,
  loading,
  error,
  children,
}: {
  pkg: VehiclePackage;
  registry: RegistryEntry[];
  changeVehicle: VehicleContextValue['changeVehicle'];
  loading: string | null;
  error: string;
  children: ReactNode;
}) {
  const data = useMemo(() => createWorkspaceData(pkg), [pkg]);
  return (
    <CatalogContext.Provider value={{ data, registry, changeVehicle, loading, error }}>
      {children}
    </CatalogContext.Provider>
  );
}
export function useVehicleWorkspace() {
  const value = useContext(CatalogContext);
  if (!value) throw Error('Vehicle catalog context is missing.');
  return value;
}
export const useCatalog = () => useVehicleWorkspace().data;
