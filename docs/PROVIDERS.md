# Provider connections

| Provider contract          | Current connection                                  | What is not supplied                                        |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| VehicleIdentityProvider    | Optional public NHTSA vPIC flat VIN decode          | Parts, diagrams, CAD, equipment-specific fitment or repairs |
| PartsCatalogProvider       | Validated local versioned package                   | Licensed external catalog API                               |
| DiagramProvider            | Local manifest and figure-specific callout pipeline | No licensed Smart service diagram acquired                  |
| ModelAssetProvider         | Local reviewed-manifest pipeline                    | No production Smart CAD/scan acquired                       |
| PhotoProvider              | Two attributed M 93 photographs, CC BY-SA 3.0 DE    | Exact 2015 U.S. trim/equipment photography                  |
| ServiceInformationProvider | Local source-reference contract; currently empty    | No licensed repair-content service                          |

`src/data/providers/contracts.ts` distinguishes ready, unsupported, not-configured, missing-credentials and unavailable. `local.ts` implements the five content contracts through validated vehicle packages. `vpic.ts` uses the documented endpoint `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json`; no API key is required. See [official vPIC documentation](https://vpic.nhtsa.dot.gov/api/).

The user must submit a VIN before it leaves the browser. It is not saved. A local unsupported-coverage request masks a VIN to its final four characters. Results are candidate identity attributes, never automatic fitment confirmation. Unknown or ambiguous generation/market/equipment requires explicit configuration selection and further evidence.

Shared HTTP code bounds response sizes, times out at 12 seconds, honors AbortSignal and retries 429/503 once with a maximum two-second wait. Package hashes guard integrity; the four-entry memory cache keys by content hash. Provider revision and stale dates travel with published packages. VIN responses are deliberately not persisted or cached.

No other provider endpoint or successful response is fabricated. To connect a paid catalog, first review its actual documentation, coverage, credential requirements and browser redistribution rights. Implement a server-side adapter, set the appropriate configuration state, record revision/field provenance, and feed its authorized output through the same staging and publication validator. No client contains administrator/provider secrets.
