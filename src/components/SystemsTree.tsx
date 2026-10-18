import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  Search,
  ArrowUpRight,
  Box,
  Circle,
} from 'lucide-react';
import { catalog, systems, componentById } from '../data/catalog';
import { searchComponents, ancestors } from '../services/catalog';
import type { ViewState } from '../scene/Viewer';
export function SystemsTree({
  state,
  query,
  onQuery,
  onSelect,
  onToggle,
  onShowAll,
  onLearn,
}: {
  state: ViewState;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (id: string | null) => void;
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onLearn: () => void;
}) {
  const [expanded, setExpanded] = useState(new Set<string>(['exterior']));
  const [modeledOnly, setModeledOnly] = useState(false);
  const toggle = (id: string) =>
    setExpanded((e) => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const modeled = catalog.filter((c) => c.componentType === 'part' && c.accuracy === 'C').length;
  const total = catalog.filter((c) => c.componentType === 'part').length;
  const hidden = (id: string) =>
    state.hidden.has(id) || ancestors(id).some((a) => state.hidden.has(a.id));
  const row = (id: string, depth: number) => {
    const c = componentById.get(id)!;
    if (modeledOnly && c.accuracy === 'D') return null;
    const children = catalog.filter(
      (ch) => ch.parentComponentId === id && (!modeledOnly || ch.accuracy !== 'D'),
    );
    const open = expanded.has(id);
    const isSystem = depth === 0;
    return (
      <div key={id}>
        <div
          className={`tree-row ${state.selected === id ? 'selected' : ''} ${hidden(id) ? 'hidden-row' : ''} ${isSystem ? 'system-row' : ''}`}
          style={{ paddingLeft: 12 + depth * 13 }}
        >
          <button
            className="tree-expand"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${c.name}`}
            aria-expanded={children.length ? open : undefined}
            onClick={() => (children.length ? toggle(id) : onSelect(id))}
          >
            {children.length ? (
              open ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <span className={`part-dot ${c.accuracy === 'D' ? 'unmodeled' : ''}`} />
            )}
          </button>
          <button
            className="tree-name"
            onClick={() => {
              onSelect(id);
              if (isSystem && !open) toggle(id);
            }}
            title={c.name}
          >
            {isSystem && (
              <span
                className="system-dot"
                style={{ background: systems.find((s) => s.id === id)?.color }}
              />
            )}
            {c.name}
            {c.accuracy === 'D' && <span className="unmodeled-label">D</span>}
          </button>
          <button
            className="tree-eye"
            aria-label={`${hidden(id) ? 'Show' : 'Hide'} ${c.name}`}
            aria-pressed={!hidden(id)}
            onClick={() => onToggle(id)}
          >
            {hidden(id) ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {open && children.map((child) => row(child.id, depth + 1))}
      </div>
    );
  };
  const results = searchComponents(query).filter((c) => !modeledOnly || c.accuracy !== 'D');
  return (
    <aside className="systems-panel" aria-label="Component catalog">
      <div className="panel-heading">
        <span>VEHICLE SYSTEMS</span>
        <span className="count-badge">08</span>
      </div>
      <div className="tree-search">
        <Search size={15} />
        <input
          aria-label="Filter components"
          placeholder="Filter components"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => onQuery('')} aria-label="Clear filter">
            ×
          </button>
        )}
      </div>
      <div className="catalog-filter">
        <label>
          <input
            type="checkbox"
            checked={modeledOnly}
            onChange={(e) => setModeledOnly(e.target.checked)}
          />
          Modeled only
        </label>
        <button onClick={onShowAll}>Show all</button>
      </div>
      <div className="tree-scroll">
        <button
          className={`vehicle-root ${!state.selected ? 'selected' : ''}`}
          onClick={() => onSelect(null)}
        >
          <Layers3 size={17} />
          <span>Complete vehicle</span>
          <span>{total}</span>
        </button>
        {query ? (
          <>
            <p className="result-count">{results.length} matching components</p>
            {results.length ? (
              results.map((c) => (
                <button
                  key={c.id}
                  className={`search-result ${state.selected === c.id ? 'selected' : ''}`}
                  onClick={() => onSelect(c.id)}
                >
                  <Box size={14} />
                  <span>
                    {c.name}
                    <small>
                      {systems.find((s) => s.id === c.systemId)?.name} · Tier {c.accuracy}
                    </small>
                  </span>
                  <ChevronRight size={13} />
                </button>
              ))
            ) : (
              <div className="empty-search">
                No components found.
                <br />
                Try “clutch”, “headlight” or “radiator”.
              </div>
            )}
          </>
        ) : (
          systems.map((s) => row(s.id, 0))
        )}
      </div>
      <div className="sidebar-bottom">
        <button className="learn-teaser" onClick={onLearn}>
          <span className="eyebrow">
            <Circle size={8} fill="currentColor" /> UNDER THE SURFACE
          </span>
          <strong>
            How a gear change happens <ArrowUpRight size={17} />
          </strong>
          <span>Explore the automated manual transmission.</span>
          <div className="learn-teaser-art">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <b>
            Open interactive lesson <span>↗</span>
          </b>
        </button>
        <div className="coverage">
          <div>
            <span>Geometry coverage</span>
            <span>
              {modeled} / {total}
            </span>
          </div>
          <div className="coverage-track">
            <i style={{ width: `${(modeled / total) * 100}%` }} />
          </div>
          <span>Educational model · expanding with evidence</span>
        </div>
      </div>
    </aside>
  );
}
