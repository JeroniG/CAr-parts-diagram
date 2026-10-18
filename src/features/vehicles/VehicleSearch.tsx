import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, Check, CarFront, Download, LoaderCircle } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { useVehicleWorkspace } from './CatalogContext';
import { resolveLocalVehicles } from './VehicleDataService';
import { vpicProvider } from '../../data/providers/vpic';
import type { VehicleConfiguration } from '../../types/catalog';
import {
  saveCoverageRequest,
  exportCoverageRequests,
  readCoverageRequests,
} from './CoverageRequests';
export function VehicleSearch({ onClose }: { onClose: () => void }) {
  const { data, registry, changeVehicle, loading, error } = useVehicleWorkspace();
  const [query, setQuery] = useState(''),
    [vin, setVin] = useState(''),
    [identity, setIdentity] = useState<Partial<VehicleConfiguration> | null>(null),
    [status, setStatus] = useState(''),
    [decoding, setDecoding] = useState(false),
    [saved, setSaved] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const candidates = resolveLocalVehicles(identity ? '' : query, registry).filter(
    (e) =>
      !identity ||
      (e.configuration.year === identity.year &&
        e.configuration.manufacturer.toLowerCase() === identity.manufacturer?.toLowerCase() &&
        e.configuration.model.toLowerCase().replaceAll(' ', '') ===
          identity.model?.toLowerCase().replaceAll(' ', '') &&
        e.configuration.engine.toLowerCase().includes((identity.engine ?? '').toLowerCase())),
  );
  async function decode(value: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setDecoding(true);
    setStatus('');
    setIdentity(null);
    try {
      const result = await vpicProvider.resolve(value, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(result.message);
      setIdentity(result.data?.[0] ?? null);
    } catch {
      if (!controller.signal.aborted)
        setStatus('Identity provider unavailable. The local registry remains available.');
    } finally {
      if (!controller.signal.aborted) setDecoding(false);
    }
  }
  return (
    <Dialog title="Find your vehicle" onClose={onClose}>
      <p className="modal-intro">
        Search published configurations, then confirm the market, platform and powertrain. Available
        content is checked separately.
      </p>
      <form
        className="vehicle-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(query.trim())) void decode(query.trim());
        }}
      >
        <Search size={18} />
        <input
          autoFocus
          data-autofocus
          aria-label="Search vehicle registry"
          placeholder="Make, model, year or VIN"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIdentity(null);
            setSaved('');
          }}
        />
        <button type="submit">Search</button>
      </form>
      {identity && (
        <div className="decoded-identity">
          <CarFront size={22} />
          <div>
            <strong>
              {identity.year} {identity.manufacturer} {identity.model}
            </strong>
            <span>
              {identity.engine} · {identity.bodyStyle}
            </span>
            <small>Identified by NHTSA · catalog and fitment still need confirmation</small>
          </div>
        </div>
      )}
      <div className="vehicle-results" aria-label="Matching vehicle configurations">
        {candidates.map((e) => (
          <button
            key={e.id}
            className="vehicle-result"
            onClick={async () => {
              if (await changeVehicle(e)) onClose();
            }}
          >
            <CarFront size={24} />
            <div>
              <strong>{e.label}</strong>
              <span>
                {e.configuration.chassisCode} · {e.configuration.market} ·{' '}
                {e.configuration.bodyStyle}
              </span>
              <small>
                {e.configuration.engine} · {e.configuration.transmission}
              </small>
              <em>
                {e.id === data.vehicle.id ? data.coverage.label : 'Open published coverage'} ·
                revision {e.revision}
              </em>
            </div>
            {e.id === data.vehicle.id ? <Check size={18} /> : <ArrowUpRight size={17} />}
          </button>
        ))}
        {!candidates.length && (
          <div className="unsupported-state">
            <CarFront size={28} />
            <h3>
              {identity
                ? 'Vehicle identified; catalog not connected'
                : 'No published configuration matches'}
            </h3>
            <p>
              Confirm the year, generation, market and powertrain. No substitute vehicle will be
              loaded.
            </p>
          </div>
        )}
      </div>
      <form
        className="vin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void decode(vin);
        }}
      >
        <label className="vin-label" htmlFor="vin">
          OPTIONAL VIN LOOKUP
        </label>
        <div className="vin-input">
          <input
            id="vin"
            value={vin}
            maxLength={17}
            placeholder="Enter your 17-character VIN"
            onChange={(e) => setVin(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={decoding}>
            {decoding ? <LoaderCircle className="spin" size={14} /> : null}
            {decoding ? 'Decoding…' : 'Decode'}
          </button>
        </div>
        <p className="small-muted">
          Sent to NHTSA only when you submit a VIN. Not saved. Identification does not confirm
          replacement-part fitment.
        </p>
      </form>
      {(status || error) && (
        <p className="vin-status" role="status">
          {status || error}
        </p>
      )}
      {loading && <p role="status">Loading {loading}…</p>}
      <div className="coverage-request">
        <strong>Missing a vehicle or assembly?</strong>
        <p>
          Save a request on this device, then export it for the project maintainer. Nothing is
          submitted automatically.
        </p>
        <button
          disabled={!query.trim() && !identity}
          onClick={() => {
            try {
              const text = identity
                ? `${identity.year} ${identity.manufacturer} ${identity.model} ${identity.engine}`
                : query;
              saveCoverageRequest(text, [
                'configuration review',
                'parts catalog',
                'licensed photographs/diagrams',
                'reviewed 3D assets',
                'fitment and service sources',
              ]);
              setSaved(
                'Coverage request saved on this device. No instant model generation is promised.',
              );
            } catch {
              setSaved(
                'Local storage is unavailable. Keep the vehicle details and share them with the maintainer.',
              );
            }
          }}
        >
          Save coverage request
        </button>
        <button
          onClick={exportCoverageRequests}
          disabled={!saved && !readCoverageRequests().length}
        >
          <Download size={14} />
          Export saved requests
        </button>
        {saved && <p role="status">{saved}</p>}
      </div>
    </Dialog>
  );
}
