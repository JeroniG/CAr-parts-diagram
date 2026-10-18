import { useEffect, useRef } from 'react';
import { sampleContains } from '../vehicles/geometryAvailability';
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
  ZoomIn,
  Scissors,
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
  onZoom,
  onCutaway,
  hasGeometry,
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
  onZoom: () => void;
  onCutaway: () => void;
  hasGeometry: boolean;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dock = dockRef.current!;
    const workspace = dock.closest<HTMLElement>('.workspace')!;
    const observer = new ResizeObserver(() =>
      workspace.style.setProperty(
        '--dock-reserve',
        `${dock.getBoundingClientRect().height + 40}px`,
      ),
    );
    observer.observe(dock);
    return () => {
      observer.disconnect();
      workspace.style.removeProperty('--dock-reserve');
    };
  }, []);
  const { manifest, coverage, componentById } = useCatalog();
  const selected = view.selected ? componentById.get(view.selected) : undefined;
  const canExplode =
    hasGeometry &&
    (!!view.activeAssembly || manifest.models.some((m) => m.modes.includes('exploded')));
  const canRender =
    hasGeometry &&
    !!selected &&
    (view.fixtureMode
      ? sampleContains(view, selected.id, selected.accuracy)
      : coverage.mapped.has(selected.id));
  return (
    <div className="bottom-dock" ref={dockRef}>
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
                isolated: null,
                hidden: new Set(),
              })
            }
          >
            <Box size={14} />
            Assembled
          </button>
          <button
            disabled={!canExplode}
            title={
              !canExplode ? 'Select an assembly with authored separation transforms' : undefined
            }
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
            disabled={!hasGeometry}
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
      {(canExplode || view.explode > 0 || mode === 'exploded' || mode === 'disassembly') && (
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
      <div className="primary-view-modes" aria-label="3D viewing modes">
        <button
          disabled={!hasGeometry}
          aria-pressed={view.xray}
          onClick={() => patch({ xray: !view.xray })}
        >
          <Scan size={16} />
          X-ray
        </button>
        <button
          disabled={!canExplode}
          aria-pressed={view.explode > 0}
          onClick={() =>
            patch({
              explode: view.explode ? 0 : 1,
              layout: 'radial',
              hatchOpen: 0,
              isolated: null,
              separated: new Set(),
            })
          }
        >
          <Expand size={16} />
          Explode
        </button>
        <button disabled={!hasGeometry} aria-pressed={view.section !== 'off'} onClick={onCutaway}>
          <Scissors size={16} />
          Cutaway
        </button>
        <button
          aria-label="Component focus"
          disabled={!canRender}
          aria-pressed={!!view.isolated}
          onClick={() =>
            patch({ isolated: view.isolated ? null : view.selected, inspectionRotation: 0 })
          }
        >
          <Focus size={16} />
          Focus
        </button>
      </div>
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
        <button onClick={onZoom}>
          <ZoomIn size={13} />
          Zoom
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
            <option
              disabled={!view.legacyVehicleFixture && !manifest.cameraPresets?.interior}
              value="interior"
            >
              Interior
            </option>
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
