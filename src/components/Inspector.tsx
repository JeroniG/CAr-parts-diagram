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
  GitBranch,
} from 'lucide-react';
import {
  accuracyLabels,
  catalog,
  componentById,
  fitments,
  oemParts,
  relationships,
  sources,
  systems,
  vehicle,
} from '../data/catalog';
import { ancestors, descendants } from '../services/catalog';
import type { ViewState } from '../scene/Viewer';
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
}) {
  const [tab, setTab] = useState<'details' | 'parts' | 'sources'>('details');
  const c = state.selected ? componentById.get(state.selected) : null;
  const partFitments = c ? fitments.filter((f) => descendants(c.id).has(f.componentId)) : fitments;
  const sourceIds = c
    ? new Set([...c.sourceIds, ...partFitments.map((f) => f.sourceId)])
    : new Set(vehicle.sourceIds);
  const availableSources = sources.filter((s) => sourceIds.has(s.id));
  const modeled = catalog.filter((c) => c.accuracy === 'C' && c.componentType === 'part').length;
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
          {c ? systems.find((s) => s.id === c.systemId)?.name : 'THE CITY, RECONSIDERED'}
        </span>
        <h2>{c ? c.name : 'Smart Fortwo'}</h2>
        <p>{c ? '2015 · 451 · U.S. gasoline' : '2015 · Passion Coupé · U.S. specification'}</p>
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
                A different kind of compact. Explore the systems that make the rear-engined,
                two-seat Fortwo work.
              </p>
              <div className="spec-grid">
                <div>
                  <span>POWERTRAIN</span>
                  <strong>
                    1.0 L <small>3-cylinder</small>
                  </strong>
                </div>
                <div>
                  <span>TRANSMISSION</span>
                  <strong>
                    5-speed <small>AMT</small>
                  </strong>
                </div>
                <div>
                  <span>PLATFORM</span>
                  <strong>451</strong>
                </div>
                <div>
                  <span>DRIVE</span>
                  <strong>Rear-wheel</strong>
                </div>
              </div>
              <div className="section-label">THE VEHICLE, AT A GLANCE</div>
              <dl className="dimension-list">
                <div>
                  <dt>Overall length</dt>
                  <dd>
                    2,695 <span>mm</span>
                  </dd>
                </div>
                <div>
                  <dt>Width, mirrors extended</dt>
                  <dd>
                    1,752 <span>mm</span>
                  </dd>
                </div>
                <div>
                  <dt>Overall height</dt>
                  <dd>
                    1,555 <span>mm</span>
                  </dd>
                </div>
                <div>
                  <dt>Wheelbase</dt>
                  <dd>
                    1,867 <span>mm</span>
                  </dd>
                </div>
              </dl>
              <a
                className="inline-source"
                href={sources[0].sourceUrl + '#page=216'}
                target="_blank"
                rel="noreferrer"
              >
                U.S. owner’s manual, p. 215 <ArrowUpRight size={12} />
              </a>
              <div className="accuracy-card">
                <div>
                  <ShieldCheck size={17} />
                  <strong>Know what you’re looking at</strong>
                </div>
                <p>Tier C · Educational representation</p>
                <span>
                  {modeled} modeled parts. Shapes and installed positions are approximate; this is
                  not factory CAD. Unmodeled components are marked Tier D.
                </span>
              </div>
              <div className="section-label">A GOOD PLACE TO START</div>
              <button className="explore-link" onClick={() => onSelect('transmission')}>
                <span>
                  <GitBranch size={17} />
                  Transmission & clutch
                </span>
                <ChevronRight size={16} />
              </button>
              <button className="explore-link" onClick={() => onSelect('engine-block')}>
                <span>
                  <Box size={17} />
                  The rear-mounted engine
                </span>
                <ChevronRight size={16} />
              </button>
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
                Tier {c.accuracy}
                <span />
                {accuracyLabels[c.accuracy]}
              </div>
              <p className="component-description">{c.description}</p>
              {c.accuracy === 'D' ? (
                <div className="missing-geometry">
                  <Box size={23} />
                  <strong>3D geometry is not yet available</strong>
                  <p>This component is recorded in the catalog. No substitute shape is shown.</p>
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
                </>
              )}
              <div className="detail-field">
                <span>
                  <MapPin size={13} />
                  INSTALLED LOCATION
                </span>
                <p>{c.location}</p>
                {c.accuracy !== 'D' && (
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
              {c.accuracy !== 'D' && (
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
                <button className="primary-button lesson-link" onClick={onLearn}>
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
