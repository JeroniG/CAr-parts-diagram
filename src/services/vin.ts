export interface DecodedVIN {
  Make: string;
  Model: string;
  ModelYear: string;
  FuelTypePrimary: string;
  DisplacementL: string;
  BodyClass: string;
  ErrorCode: string;
  ErrorText: string;
  Series: string;
  Trim: string;
}
export function classifyVIN(v: DecodedVIN): { supported: boolean; message: string } {
  if (v.ErrorCode.split(',').some((c) => c.trim() !== '0'))
    return {
      supported: false,
      message:
        'NHTSA reported an incomplete or invalid decode. Confirm the VIN and vehicle details.',
    };
  if (
    v.Make.toLowerCase() !== 'smart' ||
    !v.Model.toLowerCase().replaceAll(' ', '').includes('fortwo') ||
    v.ModelYear !== '2015'
  )
    return {
      supported: false,
      message: 'This vehicle is outside the supported 2015 smart Fortwo configuration.',
    };
  if (v.FuelTypePrimary.toLowerCase() !== 'gasoline')
    return {
      supported: false,
      message: 'Electric or unresolved powertrains are not supported by this gasoline model.',
    };
  return {
    supported: true,
    message:
      '2015 smart Fortwo gasoline attributes match. Confirm Passion coupé, U.S. market and equipment yourself; VIN decoding does not establish parts fitment.',
  };
}
export async function decodeVIN(vin: string): Promise<DecodedVIN> {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin))
    throw Error('Enter a 17-character VIN without I, O or Q.');
  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin.toUpperCase())}?format=json`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw Error('The NHTSA service is unavailable. Please try again later.');
  const data = (await response.json()) as { Results: DecodedVIN[] };
  if (!data.Results?.[0]) throw Error('NHTSA returned no vehicle details.');
  return data.Results[0];
}
