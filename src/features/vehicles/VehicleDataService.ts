import type { RegistryEntry, VehiclePackage, VehicleManifest } from '../../types/vehiclePackage';
import { validateVehiclePackage, localAssetPath } from '../../data/validation/vehicleManifest';
import { decodeJSON, fetchBytes, sha256 } from '../../data/providers/http';
const cache = new Map<string, VehiclePackage>();
export const isVehicleCached = (entry: RegistryEntry) =>
  cache.has(`${entry.id}:${entry.manifestHash}`);
export async function loadVehiclePackage(
  entry: RegistryEntry,
  signal?: AbortSignal,
): Promise<VehiclePackage> {
  const key = `${entry.id}:${entry.manifestHash}`;
  if (cache.has(key)) return cache.get(key)!;
  if (!localAssetPath(entry.manifestUrl)) throw Error('Untrusted vehicle manifest location.');
  const bytes = await fetchBytes(entry.manifestUrl, signal);
  if ((await sha256(bytes)) !== entry.manifestHash)
    throw Error('Vehicle manifest integrity check failed.');
  const manifest = decodeJSON(bytes) as VehicleManifest;
  if (
    manifest.configuration?.id !== entry.id ||
    manifest.revision !== entry.revision ||
    JSON.stringify(manifest.configuration) !== JSON.stringify(entry.configuration) ||
    !localAssetPath(manifest.catalogUrl)
  )
    throw Error('Vehicle registry and package do not match.');
  if (manifest.fixture && !import.meta.env.DEV)
    throw Error('Development fixtures cannot be loaded in production.');
  const catalog = await fetchBytes(manifest.catalogUrl, signal);
  if ((await sha256(catalog)) !== manifest.catalogHash)
    throw Error('Vehicle catalog integrity check failed.');
  const pkg = { manifest, data: decodeJSON(catalog) };
  validateVehiclePackage(pkg);
  signal?.throwIfAborted();
  cache.set(key, pkg);
  if (cache.size > 4) cache.delete(cache.keys().next().value!);
  return pkg;
}
export async function loadRegistry(signal?: AbortSignal): Promise<RegistryEntry[]> {
  const data = decodeJSON(await fetchBytes('/vehicles/registry.json', signal, 1024 * 1024)) as {
    schemaVersion: number;
    vehicles: RegistryEntry[];
  };
  if (data.schemaVersion !== 1 || !Array.isArray(data.vehicles))
    throw Error('Invalid vehicle registry.');
  const ids = new Set<string>();
  for (const e of data.vehicles) {
    if (
      !e.configuration ||
      e.configuration.id !== e.id ||
      ids.has(e.id) ||
      !localAssetPath(e.manifestUrl) ||
      !/^[a-f0-9]{64}$/.test(e.manifestHash)
    )
      throw Error('Invalid registry entry.');
    ids.add(e.id);
  }
  return data.vehicles;
}
export function resolveLocalVehicles(input: string, registry: RegistryEntry[]) {
  const tokens = input
    .toLowerCase()
    .trim()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const year = tokens.find((t) => /^(19|20)\d{2}$/.test(t));
  return registry.filter((e) => {
    const c = e.configuration,
      text = [
        c.manufacturer,
        c.model,
        c.year,
        c.chassisCode,
        c.generation,
        c.engine,
        c.bodyStyle,
        c.market,
        c.trim,
      ]
        .join(' ')
        .toLowerCase();
    return (!year || c.year === Number(year)) && tokens.every((t) => text.includes(t));
  });
}
