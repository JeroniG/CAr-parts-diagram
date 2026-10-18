import type { VehicleIdentityProvider } from './contracts';
import { fetchBytes, decodeJSON } from './http';
export const vpicProvider: VehicleIdentityProvider = {
  id: 'nhtsa-vpic',
  async resolve(input, signal) {
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(input))
      return {
        status: 'unsupported',
        data: null,
        message: 'Enter a full 17-character VIN without I, O or Q.',
        revision: null,
        cached: false,
      };
    try {
      const payload = decodeJSON(
        await fetchBytes(
          `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(input.toUpperCase())}?format=json`,
          signal,
          2 * 1024 * 1024,
        ),
      ) as { Results?: Record<string, string>[] };
      const v = payload.Results?.[0];
      if (
        !v ||
        typeof v.ErrorCode !== 'string' ||
        v.ErrorCode.split(',').some((c) => c.trim() !== '0') ||
        !v.Make ||
        !v.Model ||
        !/^\d{4}$/.test(v.ModelYear)
      )
        throw Error('NHTSA returned incomplete identity data. Confirm the VIN and configuration.');
      return {
        status: 'ready',
        data: [
          {
            manufacturer: v.Make,
            model: v.Model,
            year: Number(v.ModelYear),
            engine: v.FuelTypePrimary || 'Not verified',
            bodyStyle: v.BodyClass || 'Not verified',
            trim: v.Trim || 'Not verified',
            generation: v.Series || 'Not verified',
          },
        ],
        message:
          'Identity attributes only. Market, generation, equipment and all part fitments still require confirmation.',
        revision: 'vPIC flat VIN decode',
        cached: false,
      };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        status: 'unavailable',
        data: null,
        message: error instanceof Error ? error.message : 'Identity provider unavailable.',
        revision: null,
        cached: false,
      };
    }
  },
};
