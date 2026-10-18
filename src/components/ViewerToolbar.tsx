import {
  Box,
  Expand,
  Layers3,
  RotateCcw,
  RotateCw,
  Focus,
  Scan,
  EyeOff,
  Ruler,
  ChevronDown,
} from 'lucide-react';
import type { CameraView, ViewState } from '../scene/state';
import type { ViewMode } from '../types/vehiclePackage';
import { useCatalog } from '../features/vehicles/CatalogContext';
export function ViewerToolbar({
  view,
  mode,
  patch,
  reset,
  ghost,
  toggleHidden,
  cameraView,
  camera,
  onSettings,
}: {
  view: ViewState;
  mode: ViewMode;
  patch: (p: Partial<ViewState>) => void;
  reset: () => void;
  ghost: () => void;
  toggleHidden: (id: string) => void;
  cameraView: CameraView;
  camera: (v: CameraView) => void;
  onSettings: () => void;
}) {
  const { manifest, coverage, componentById } = useCatalog();
  const selected = view.selected ? componentById.get(view.selected) : undefined;
  const canRender =
    !!selected && (view.fixtureMode ? selected.accuracy !== 'D' : coverage.mapped.has(selected.id));
  return (
    <div className="bottom-dock">
      <div className="dock-top">
        <div className="layout-tabs" aria-label="Exploded layout">
          <button
            className={view.explode === 0 ? 'active' : ''}
            onClick={() =>
              patch({
                explode: 0,
                hatchOpen: 0,
                separated: new Set(),
                inspectionRotation: 0,
              })
            }
          >
            <Box size={14} />
            Assembled
          </button>
          <button
            className={view.explode > 0 && view.layout === 'radial' ? 'active' : ''}
            onClick={() =>
              patch({
                layout: 'radial',
                explode: 1,
                hatchOpen: 0,
                separated: new Set(),
                assemblyContext: false,
                inspectionRotation: 0,
              })
            }
          >
            <Expand size={14} />
            Exploded
          </button>
          <button
            className={view.explode > 0 && view.layout === 'inventory' ? 'active' : ''}
            onClick={() =>
              patch({
                layout: 'inventory',
                explode: 1,
                hatchOpen: 0,
                separated: new Set(),
                assemblyContext: false,
                inspectionRotation: 0,
              })
            }
          >
            <Layers3 size={14} />
            Inventory
          </button>
        </div>
        <button className="reset-button" onClick={reset}>
          <RotateCcw size={14} />
          <span>Reset all</span>
        </button>
      </div>
      {(view.explode > 0 || mode === 'exploded' || mode === 'disassembly') && (
        <div className="explode-control">
          <span>Explode</span>
          <input
            aria-label="Exploded view"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(view.explode * 100)}
            onChange={(e) =>
              patch({
                explode: Number(e.target.value) / 100,
                hatchOpen: 0,
                separated: new Set(),
                assemblyContext: false,
                inspectionRotation: 0,
              })
            }
          />
          <output>
            {Math.round(view.explode * 100)}
            <small>%</small>
          </output>
        </div>
      )}
      {(view.xray || view.transparent.size > 0) && (
        <label className="body-opacity">
          Surface opacity
          <input
            aria-label="Surface opacity"
            type="range"
            min="0.05"
            max="0.9"
            step="0.01"
            value={view.bodyOpacity}
            onChange={(e) => patch({ bodyOpacity: Number(e.target.value) })}
          />
          <output>{Math.round(view.bodyOpacity * 100)}%</output>
        </label>
      )}
      <div className="dock-part-actions" aria-label="Selected component tools">
        <button
          aria-pressed={view.pointerMode === 'orbit'}
          onClick={() => patch({ pointerMode: 'orbit' })}
        >
          <RotateCw size={13} />
          Rotate
        </button>
        <button
          aria-pressed={view.pointerMode === 'pan'}
          onClick={() => patch({ pointerMode: 'pan' })}
        >
          Pan
        </button>
        <button
          disabled={!canRender}
          onClick={() =>
            patch({
              isolated: view.isolated === view.selected ? null : view.selected,
              assemblyContext: false,
              inspectionRotation: 0,
            })
          }
        >
          <Focus size={13} />
          {view.isolated ? 'Unisolate' : 'Isolate part'}
        </button>
        <button disabled={!canRender} onClick={ghost}>
          <Scan size={13} />
          Transparent
        </button>
        <button disabled={!selected} onClick={() => view.selected && toggleHidden(view.selected)}>
          <EyeOff size={13} />
          {view.selected && view.hidden.has(view.selected) ? 'Show part' : 'Hide part'}
        </button>
        <button
          disabled={!view.fixtureMode && !manifest.models.some((m) => m.scaleValidated)}
          title="Measurement requires validated scale; development samples show illustrative model distances only."
          className={view.measure ? 'active' : ''}
          aria-pressed={view.measure}
          onClick={() => patch({ measure: !view.measure })}
        >
          <Ruler size={13} />
          Measure
        </button>
      </div>
      <div className="dock-bottom">
        <div className="camera-select">
          <span>VIEW</span>
          <select
            aria-label="Camera view"
            value={cameraView}
            onChange={(e) => camera(e.target.value as CameraView)}
          >
            <option value="perspective">Perspective</option>
            <option value="front">Front</option>
            <option value="rear">Rear</option>
            <option value="left">Left side</option>
            <option value="right">Right side</option>
            <option value="top">Top</option>
            <option value="bottom">Underbody</option>
            <option value="interior">Interior</option>
          </select>
        </div>
        <button
          disabled={window.matchMedia('(prefers-reduced-motion: reduce)').matches}
          title={
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'Auto-rotation is disabled by your reduced-motion preference'
              : 'Rotate the vehicle automatically'
          }
          className={`auto-rotate ${view.autoRotate ? 'active' : ''}`}
          aria-pressed={view.autoRotate}
          onClick={() => patch({ autoRotate: !view.autoRotate })}
        >
          <RotateCw size={13} />
          Auto-rotate
        </button>
        <button className="quality-select" onClick={onSettings}>
          <span className="quality-bars">▂▅▇</span>
          {view.quality} quality
          <ChevronDown size={11} />
        </button>
      </div>
    </div>
  );
}
