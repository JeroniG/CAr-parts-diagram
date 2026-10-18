import { useEffect, useRef, useState } from 'react';
import App from './App';
import initial from '../data/initialVehicle.json';
import initialRegistry from '../../public/vehicles/registry.json';
import type { RegistryEntry, VehiclePackage } from '../types/vehiclePackage';
import { CatalogProvider } from '../features/vehicles/CatalogContext';
import { loadRegistry, loadVehiclePackage } from '../features/vehicles/VehicleDataService';
const baseline = initial as VehiclePackage;
export default function ApplicationRoot() {
  const [pkg, setPackage] = useState(baseline),
    [registry, setRegistry] = useState<RegistryEntry[]>(
      initialRegistry.vehicles as RegistryEntry[],
    ),
    [loading, setLoading] = useState<string | null>(null),
    [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadRegistry(controller.signal)
      .then(setRegistry)
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Registry unavailable. Showing the bundled Smart catalog.');
      });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, []);
  async function changeVehicle(entry: RegistryEntry) {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setLoading(entry.label);
    setError('');
    try {
      const next = await loadVehiclePackage(entry, request.signal);
      if (!request.signal.aborted) {
        setPackage(next);
        return true;
      }
      return false;
    } catch (e) {
      if (!request.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : 'Vehicle could not be loaded. The previous catalog is retained.',
        );
      return false;
    } finally {
      if (!request.signal.aborted) setLoading(null);
    }
  }
  return (
    <CatalogProvider
      pkg={pkg}
      registry={registry}
      changeVehicle={changeVehicle}
      loading={loading}
      error={error}
    >
      <App key={`${pkg.data.vehicle.id}:${pkg.manifest.revision}`} />
    </CatalogProvider>
  );
}
