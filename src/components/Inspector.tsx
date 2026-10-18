import { useState } from 'react';
import {
  ArrowUpRight,
  Box,
  ChevronRight,
  Crosshair,
  EyeOff,
  Focus,
  Info,
  Layers3,
  Link2,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
  Scan,
  MapPin,
} from 'lucide-react';
import { accuracyLabels } from '../data/catalog';
import { useCatalog } from '../features/vehicles/CatalogContext';
import type { ViewState } from '../scene/Viewer';
import { hatchPartById } from '../vehicles/rearHatch';
export function Inspector({
  state,
  onFocus,
  onIsolate,
  onHide,
  onGhost,
  onSelect,
  onLearn,
  onNeighbors,
  onLocation,
  onClose,
  onAssembly,
  onReturn,
  onSeparate,
  onRotate,
  educationMode,
}: {
  state: ViewState;
  onFocus: () => void;
  onIsolate: () => void;
  onHide: () => void;
  onGhost: () => void;
  onSelect: (id: string) => void;
  onLearn: () => void;
  onNeighbors: () => void;
  onLocation: () => void;
  onClose: () => void;
  onAssembly: () => void;
  onReturn: () => void;
  onSeparate: () => void;
  onRotate: (angle: number) => void;
  educationMode: boolean;
}) {
  const {
    componentById,
    fitments,
    oemParts,
    relationships,
    sources,
    systems,
    vehicle,
    ancestors,
    descendants,
    manifest,
    coverage,
  } = useCatalog();
  const [tab, setTab] = useState<'details' | 'parts' | 'sources'>('details');
  const c = state.selected ? componentById.get(state.selected) : null;
  const hatchPart = c && state.fixtureMode ? hatchPartById.get(c.id) : undefined;
  const canRender = !!c && (state.fixtureMode ? c.accuracy !== 'D' : coverage.mapped.has(c.id));
  const reference = manifest.photos.find(
    (p) => c && (p.componentIds.includes(c.id) || p.hotspots.some((h) => h.instanceId === c.id)),
  );
  const partFitments = c ? fitments.filter((f) => descendants(c.id).has(f.componentId)) : fitments;
  const sourceIds = c
    ? new Set([...c.sourceIds, ...partFitments.map((f) => f.sourceId)])
    : new Set(vehicle.sourceIds);
  const availableSources = sources.filter((s) => sourceIds.has(s.id));

  return (
    <aside className="inspector" aria-label="Component inspector">
      <div className="panel-heading">
        <span>{c ? 'COMPONENT INSPECTOR' : 'VEHICLE OVERVIEW'}</span>
        <button
          className="icon-button close-inspector"
          aria-label="Close inspector"
          onClick={onClose}
        >
          <X size={16} />
        </button>
        <span className="inspector-dot" />
      </div>
      <div className="inspector-title">
        <div className="inspector-symbol">
          {c ? <Box size={25} strokeWidth={1.4} /> : <Layers3 size={25} strokeWidth={1.4} />}
        </div>
        <span className="eyebrow">
          {c ? systems.find((s) => s.id === c.systemId)?.name : 'SELECTED CONFIGURATION'}
        </span>
        <h2>{c ? c.name : `${vehicle.manufacturer} ${vehicle.model}`}</h2>
        <p>
          {vehicle.year} · {vehicle.chassisCode} · {vehicle.market}
        </p>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="Inspector information">
        {(['details', 'parts', 'sources'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'details' ? 'Overview' : t === 'parts' ? 'Part references' : 'Sources'}
            {t === 'sources' && <span>{availableSources.length}</span>}
          </button>
        ))}
      </div>
      <div className="inspector-body" role="tabpanel">
        {tab === 'details' &&
          (!c ? (
            <>
              <p className="intro-copy">
                {vehicle.year} {vehicle.manufacturer} {vehicle.model}. Explore the published catalog
                and available references for this configuration.
              </p>
              <button
                hidden={!manifest.featuredAssemblyId}
                className="hatch-feature-card"
                onClick={onAssembly}
              >
                <Layers3 size={23} />
                <span>
                  <strong>
                    Explore{' '}
                    {manifest.featuredAssemblyId
                      ? componentById.get(manifest.featuredAssemblyId)?.name.toLowerCase()
                      : 'an assembly'}
                  </strong>
                  <small>
                    {state.fixtureMode
                      ? '21 sample parts · development 3D'
                      : 'Assembly catalog · photo references'}
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
              <div className="spec-grid">
                {[
                  ['POWERTRAIN', vehicle.engine],
                  ['TRANSMISSION', vehicle.transmission],
                  ['PLATFORM', vehicle.chassisCode],
                  ['DRIVE', vehicle.drivetrain],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="accuracy-card">
                <div>
                  <ShieldCheck size={17} />
                  <strong>Published coverage</strong>
                </div>
                <p>{coverage.label}</p>
                <span>
                  {coverage.parts} catalog part instances · {coverage.mappedParts} mapped to
                  reviewed 3D · {coverage.photos} photographs · {coverage.confirmedFitments}{' '}
                  confirmed fitments.
                </span>
              </div>
              <div className="section-label">AVAILABLE CATALOG</div>
              {systems
                .filter((s) => componentById.has(s.id))
                .map((s) => (
                  <button className="explore-link" key={s.id} onClick={() => onSelect(s.id)}>
                    <span>
                      <Box size={17} />
                      {s.name}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
            </>
          ) : (
            <>
              <div className="breadcrumbs">
                {ancestors(c.id).map((a) => (
                  <button key={a.id} onClick={() => onSelect(a.id)}>
                    {a.name}
                    <ChevronRight size={11} />
                  </button>
                ))}
              </div>
              <div className={`tier-badge ${c.accuracy === 'D' ? 'tier-d' : ''}`}>
                {canRender ? `Tier ${c.accuracy}` : 'Catalog record'}
                <span />
                {canRender ? accuracyLabels[c.accuracy] : '3D coverage unavailable'}
              </div>
              <p className="component-description">{c.description}</p>
              {reference && (
                <figure className="part-photo">
                  <img src={reference.url} alt={reference.caption} />
                  <figcaption>Platform photograph · location reference</figcaption>
                </figure>
              )}
              {!canRender ? (
                <div className="missing-geometry">
                  <Box size={23} />
                  <strong>3D geometry is not yet available</strong>
                  <p>
                    This component is recorded in the catalog. No substitute shape is shown. Browse
                    the photo references and source records.
                  </p>
                </div>
              ) : (
                <>
                  <div className="part-actions">
                    <button onClick={onFocus}>
                      <Crosshair size={16} />
                      Focus
                    </button>
                    <button className={state.isolated === c.id ? 'active' : ''} onClick={onIsolate}>
                      <Focus size={16} />
                      {state.isolated === c.id ? 'Show vehicle' : 'Isolate'}
                    </button>
                    <button onClick={onHide}>
                      <EyeOff size={16} />
                      {state.hidden.has(c.id) ? 'Show' : 'Hide'}
                    </button>
                  </div>
                  <button
                    className={`wide-action ${state.transparent.has(c.id) ? 'active' : ''}`}
                    onClick={onGhost}
                  >
                    <Scan size={16} />
                    {state.transparent.has(c.id)
                      ? 'Restore opaque material'
                      : 'Make component transparent'}
                  </button>
                  {c.componentType === 'part' && (
                    <div className="assembly-part-tools">
                      <button className="wide-action" onClick={onSeparate}>
                        <Layers3 size={15} />
                        {state.separated.has(c.id) ? 'Restore this part' : 'Separate this part'}
                      </button>
                      {(state.isolated || state.separated.size > 0 || state.explode > 0) && (
                        <button className="wide-action" onClick={onReturn}>
                          <RotateCcw size={15} />
                          Return to assembly
                        </button>
                      )}
                      {state.isolated === c.id && (
                        <label className="part-rotation">
                          Rotate component
                          <input
                            aria-label="Rotate isolated component"
                            type="range"
                            min="-3.14"
                            max="3.14"
                            step="0.01"
                            value={state.inspectionRotation}
                            onChange={(e) => onRotate(Number(e.target.value))}
                          />
                        </label>
                      )}
                      <p className="small-muted">
                        Visual separation only. No official removal sequence is claimed.
                      </p>
                    </div>
                  )}
                </>
              )}
              {hatchPart && (
                <>
                  <div className="detail-field">
                    <span>OEM PART NUMBER</span>
                    <p>Not yet verified.</p>
                  </div>
                  <div className="detail-field">
                    <span>MATERIAL APPEARANCE</span>
                    <p>{hatchPart.material}</p>
                  </div>
                  <div className="detail-field">
                    <span>REFERENCE IDENTIFIER</span>
                    <p>Diagram callout: {hatchPart.callout}. This is not an OEM part number.</p>
                  </div>
                  <div className="detail-field">
                    <span>VEHICLE APPLICABILITY</span>
                    <p>
                      Shown in the 2015 U.S. 451 Passion coupé project. Exact replacement-part
                      fitment: <strong>Not yet verified.</strong>
                    </p>
                  </div>
                </>
              )}
              {educationMode && (
                <details className="learning-details">
                  <summary>What this component does</summary>
                  <p>{c.function}</p>
                  <p>
                    Failure symptoms and component-specific repair considerations:{' '}
                    <strong>Not yet verified.</strong>
                  </p>
                </details>
              )}
              <details className="learning-details">
                <summary>Repair & replacement information</summary>
                {manifest.serviceProcedures
                  .filter((p) => p.componentId === c.id)
                  .map((p) => (
                    <p key={p.id}>
                      <a href={p.url} target="_blank" rel="noreferrer">
                        {p.title}
                      </a>
                      <br />
                      {p.scope} · Read the complete source, including its prerequisites.
                    </p>
                  ))}
                {!manifest.serviceProcedures.some((p) => p.componentId === c.id) && (
                  <p>
                    Visual assembly exploration only. Verified repair procedure not available.
                    Replacement compatibility must be checked independently against a
                    configuration-specific source.
                  </p>
                )}
                <p>Use the Part references and Sources tabs to inspect the available evidence.</p>
              </details>
              <div className="detail-field">
                <span>
                  <MapPin size={13} />
                  INSTALLED LOCATION
                </span>
                <p>{c.location}</p>
                {canRender && (
                  <button onClick={onLocation}>
                    Show in assembled vehicle <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
              <div className="detail-field">
                <span>GEOMETRY & CONFIDENCE</span>
                <p>{c.geometryNotes}</p>
              </div>
              {c.parentComponentId && (
                <button className="wide-action" onClick={() => onSelect(c.parentComponentId!)}>
                  <Layers3 size={15} />
                  View parent assembly
                  <ChevronRight size={14} />
                </button>
              )}
              {canRender && (
                <button className="wide-action" onClick={onNeighbors}>
                  <Link2 size={15} />
                  Show neighboring components
                </button>
              )}
              {relationships
                .filter((r) => r.componentId === c.id)
                .map((r) => (
                  <button
                    className="relationship"
                    key={r.relatedComponentId}
                    onClick={() => onSelect(r.relatedComponentId)}
                  >
                    <span>{r.type.replaceAll('-', ' ')}</span>
                    {componentById.get(r.relatedComponentId)?.name}
                    <ChevronRight size={13} />
                  </button>
                ))}
              {c.systemId === 'transmission' && (
                <button
                  hidden={!state.fixtureMode}
                  className="primary-button lesson-link"
                  onClick={onLearn}
                >
                  <Play size={14} />
                  See how the transmission works
                </button>
              )}
              <div className="inspector-note">
                <Info size={14} />
                <span>
                  {c.safetyCritical
                    ? 'Educational identification only. No verified repair procedures or torque values are supplied.'
                    : 'OEM identity and fitment are checked separately. Open Part references for the available evidence.'}
                </span>
              </div>
            </>
          ))}
        {tab === 'parts' && (
          <>
            <div className="fitment-intro">
              <ShieldCheck size={19} />
              <strong>Identity is not fitment.</strong>
              <p>
                These are sourced manufacturer references. None has confirmed fitment for this exact
                gasoline configuration.
              </p>
            </div>
            {partFitments.length ? (
              partFitments.map((f) => {
                const p = oemParts.find((p) => p.id === f.oemPartId)!;
                const s = sources.find((s) => s.id === f.sourceId)!;
                return (
                  <div className="oem-card" key={f.id}>
                    <span className="eyebrow">{p.manufacturer} · OEM REFERENCE</span>
                    <h3>{p.partNumber}</h3>
                    <strong>{p.description}</strong>
                    <span className="fitment-tag">Fitment unknown</span>
                    <p>{f.notes}</p>
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                      View manufacturer source <ArrowUpRight size={14} />
                    </a>
                    <small>Source checked October 17, 2026</small>
                  </div>
                );
              })
            ) : (
              <div className="missing-geometry">
                <SearchPlaceholder />
                <strong>No verified OEM reference yet</strong>
                <p>
                  A part number will be added when its identity can be supported by a traceable
                  source.
                </p>
              </div>
            )}
            <p className="small-muted">
              No aftermarket compatibility, live pricing, supersession or VIN-specific fitment has
              been established.
            </p>
          </>
        )}
        {tab === 'sources' && (
          <>
            <p className="small-muted">
              Traceable references for this {c ? 'component' : 'configuration'}. Geometry remains
              educational even when a general technical fact is sourced.
            </p>
            {availableSources.map((s) => (
              <a
                className="source-card"
                key={s.id}
                href={s.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  {s.publisher}
                  <ArrowUpRight size={14} />
                </span>
                <strong>{s.documentTitle}</strong>
                <p>{s.notes}</p>
                <small>Checked Oct 17, 2026 · Link only</small>
              </a>
            ))}
          </>
        )}
      </div>
      <footer className="inspector-footer">
        <span className="status-dot" />
        Independent educational atlas <Info size={13} />
      </footer>
    </aside>
  );
}
function SearchPlaceholder() {
  return <RotateCcw size={24} />;
}
