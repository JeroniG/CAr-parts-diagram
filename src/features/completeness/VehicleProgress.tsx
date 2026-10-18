import { useState } from 'react';
import { Download, ArrowUpRight } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { useCatalog } from '../vehicles/CatalogContext';
import './progress.css';

export function VehicleProgress({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const { vehicle, completeness: report, sources, manifest } = useCatalog();
  const [areaId, setAreaId] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const storageKey = `autoatlas-modeling-notes:${vehicle.id}`;
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
      return value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).filter(
              (entry): entry is [string, string] =>
                report.tasks.some((t) => t.id === entry[0]) && typeof entry[1] === 'string',
            ),
          )
        : {};
    } catch {
      return {};
    }
  });
  const [saveStatus, setSaveStatus] = useState(
    'Notes stay in this browser. They do not verify geometry.',
  );
  const tasks = report.tasks.filter(
    (t) =>
      (areaId === 'all' || t.areaIds.includes(areaId)) &&
      `${t.name} ${t.componentId}`.toLowerCase().includes(query.toLowerCase()),
  );
  const task = report.tasks.find((t) => t.id === selected);
  const saveNote = (id: string, note: string) => {
    const next = { ...notes, [id]: note };
    setNotes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveStatus('Draft saved in this browser. Geometry status unchanged.');
    } catch {
      setSaveStatus('Browser storage unavailable. Export the report to save your notes.');
    }
  };
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            ...report,
            discoveries: manifest.completionPlan?.discoveries ?? [],
            sources,
            modelingNotes: notes,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `${vehicle.id}-completion-${manifest.revision}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="vehicle-progress">
      <Dialog title="Vehicle completion & modeling queue" onClose={onClose}>
        <div className="progress-body">
          <p className="progress-intro">
            {vehicle.year} {vehicle.manufacturer} {vehicle.model} · {vehicle.chassisCode} ·{' '}
            {vehicle.market}. Both milestones are required.
          </p>
          <div className="milestone-grid">
            {report.milestones.map((m) => (
              <section key={m.id} data-testid={`milestone-${m.id}`}>
                <small>MILESTONE {m.id}</small>
                <h3>{m.id === 1 ? 'Complete exterior' : 'Mechanical digital twin'}</h3>
                <strong>{m.complete ? 'Complete' : 'Incomplete'}</strong>
                <p>
                  {m.completeAreas} / {m.requiredAreas} required areas validated
                </p>
              </section>
            ))}
          </div>
          <div className="progress-counts">
            <span>
              <b>{report.catalog.definitions}</b> catalog definitions
            </span>
            <span>
              <b>{report.catalog.instances}</b> catalog instances
            </span>
            <span>
              <b>{report.catalog.reviewedGeometry}</b> reviewed, scaled 3D parts
            </span>
            <span>
              <b>{report.catalog.confirmedFitments}</b> confirmed fitments
            </span>
          </div>
          <p className="inventory-disclosure">
            Whole-vehicle physical inventory: <strong>not yet established.</strong> Catalog entries
            can represent groups. Counts are not a complete bill of materials. Sample models do not
            count toward either milestone.
          </p>
          <h3>Required coverage</h3>
          <div className="coverage-table" tabIndex={0} aria-label="Required system coverage">
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Catalog</th>
                  <th>3D / positioned</th>
                  <th>Assemblies ready</th>
                  <th>Inventory</th>
                </tr>
              </thead>
              <tbody>
                {report.areas.map((a) => (
                  <tr key={a.id}>
                    <th>
                      <button
                        onClick={() => {
                          setAreaId(a.id);
                          setSelected(null);
                        }}
                      >
                        {a.name}
                      </button>
                    </th>
                    <td>{a.catalogParts}</td>
                    <td>
                      {a.reviewedParts} / {a.positionedParts}
                    </td>
                    <td>
                      {a.readyAssemblies} / {a.requiredAssemblyIds.length || '—'}
                    </td>
                    <td>{a.inventoryClosed ? 'Audited' : 'Open'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.areas.length && <p>No completion scope has been published for this vehicle.</p>}
          <p className="progress-small">
            Areas can share parts. Assembly readiness requires reviewed, scaled geometry with the
            specified inspection modes; it is separate from software availability. Completion also
            requires identity, placement, inventory and geometry reviews.
          </p>
          {!!report.unassignedComponentIds.length && (
            <p>
              {report.unassignedComponentIds.length} entries still need a completion-area
              assignment.
            </p>
          )}
          <div className="queue-heading">
            <h3>Modeling & discovery queue</h3>
            <button className="export-progress" onClick={download}>
              <Download size={15} /> Export report
            </button>
          </div>
          <div className="queue-filters">
            <select
              aria-label="Filter modeling area"
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                setSelected(null);
              }}
            >
              <option value="all">All required areas</option>
              {report.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Search modeling tasks"
              placeholder="Find a component…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="progress-small">
            {tasks.length} tasks · select a task for missing measurements and source history.
          </p>
          <div className="modeling-workspace">
            <div className="modeling-list" aria-label="Modeling tasks">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={selected === t.id}
                  onClick={() => setSelected(t.id)}
                >
                  <strong>{t.name}</strong>
                  <small>
                    {t.status.replaceAll('-', ' ')} ·{' '}
                    {t.partSearchRecorded ? 'part source checked' : 'part search pending'}
                  </small>
                </button>
              ))}
              {!tasks.length && <p>No matching tasks.</p>}
            </div>
            <section className="modeling-detail" aria-label="Modeling task details">
              {task ? (
                <>
                  <h3>{task.name}</h3>
                  <code>{task.componentId}</code>
                  <h4>Required evidence</h4>
                  <ul>
                    {task.missing.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <h4>Missing measurements / source data</h4>
                  <ul>
                    {task.missingMeasurements.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <h4>References and discovery history</h4>
                  {task.sourceIds.map((id) => {
                    const source = sources.find((s) => s.id === id);
                    return source && source.sourceUrl.startsWith('https://') ? (
                      <a key={id} href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {source.documentTitle} <ArrowUpRight size={12} />
                      </a>
                    ) : null;
                  })}
                  {task.findings.map((f) => (
                    <p key={f.id}>
                      <b>
                        {f.outcome} · {f.checkedAt}
                      </b>
                      <br />
                      {f.reason}
                      <br />
                      <a href={f.sourceUrl} target="_blank" rel="noreferrer">
                        Source
                      </a>{' '}
                      · {f.nextAction}
                    </p>
                  ))}
                  {!task.partSearchRecorded && (
                    <p>
                      A component-specific CAD search is still pending. System references do not
                      establish that this part was searched.
                    </p>
                  )}
                  <label>
                    Modeling notes
                    <textarea
                      aria-label="Modeling notes"
                      maxLength={12000}
                      value={notes[task.id] ?? ''}
                      onChange={(e) => saveNote(task.id, e.target.value)}
                    />
                  </label>
                  <small role="status">{saveStatus}</small>
                  <button className="inspect-task" onClick={() => onSelect(task.componentId)}>
                    Open component information
                  </button>
                </>
              ) : (
                <p>
                  Select a component to inspect its modeling requirements. Importing an asset still
                  requires license, configuration, dimensions and placement validation.
                </p>
              )}
            </section>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
