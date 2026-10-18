import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Box,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Expand,
  Eye,
  GraduationCap,
  Layers3,
  Minus,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Scan,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
  Ruler,
} from 'lucide-react';
import { initialView } from '../scene/state';
import type { CameraView, ViewState, Viewer } from '../scene/Viewer';
const SceneCanvas = lazy(() =>
  import('../components/SceneCanvas').then((m) => ({ default: m.SceneCanvas })),
);
import { SystemsTree } from '../components/SystemsTree';
import { Inspector } from '../components/Inspector';
import { LessonPanel } from '../components/LessonPanel';
import { ViewerToolbar } from '../components/ViewerToolbar';
import { WorkspaceSettings } from '../components/WorkspaceSettings';
import { WorkspaceHelp } from '../components/WorkspaceHelp';
import { useCatalog } from '../features/vehicles/CatalogContext';
import { VehicleSearch } from '../features/vehicles/VehicleSearch';
import { PhotoViewport } from '../features/photos/PhotoViewport';
import { ViewModeSelector, viewModes } from '../features/coverage/ViewModeSelector';
import type { ViewMode } from '../types/vehiclePackage';
import { inspectionFixture } from '../vehicles/developmentFixtures';
import { PanelResizeHandle } from '../components/PanelResizeHandle';
import type { CSSProperties } from 'react';
import { ReferenceDialog } from '../components/ReferenceDialog';
import { AssemblyExplorer } from '../components/AssemblyExplorer';

import { idleAssemblyStatus } from '../types/assembly';
import type { AssemblyLoadStatus } from '../types/assembly';
import type { Measurement } from '../scene/controls/MeasurementController';
function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m5 25 10-20h4l10 20h-6l-2-5H12l-2 5Zm9-10h5l-2.5-5Z" fill="currentColor" />
      <path d="M3 29h26" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export default function App() {
  const { componentById, vehicle, ancestors, descendants, manifest, coverage } = useCatalog();
  const fixture = inspectionFixture(vehicle.id);
  const initialLegacy =
    import.meta.env.DEV &&
    !!fixture &&
    new URLSearchParams(location.search).get('fixture') === 'smart-451';
  const initialFixture = !!fixture && (manifest.models.length === 0 || initialLegacy);
  const [mode, setMode] = useState<ViewMode>('studio');
  const [leftWidth, setLeftWidth] = useState(244),
    [rightWidth, setRightWidth] = useState(308);
  const [view, setView] = useState<ViewState>(() => ({
    ...initialView,
    fixtureMode: initialFixture,
    legacyVehicleFixture: initialLegacy,
    activeAssembly:
      initialLegacy || manifest.models.some((m) => m.scope === 'vehicle')
        ? null
        : initialFixture
          ? fixture!.assemblies[0].id
          : (manifest.assemblies[0]?.id ?? null),
    quality: window.innerWidth < 800 ? 'medium' : 'high',
  }));
  const [assemblyStatus, setAssemblyStatus] = useState<AssemblyLoadStatus>(idleAssemblyStatus);
  const [measurement, setMeasurement] = useState<Measurement>({ points: 0, millimetres: null });
  const [educationMode, setEducationMode] = useState(true);
  const [query, setQuery] = useState(''),
    [count, setCount] = useState(0),
    [stats, setStats] = useState({ fps: 0, triangles: 0, drawCalls: 0 });
  const [dialog, setDialog] = useState<'vehicle' | 'settings' | 'help' | 'references' | null>(null),
    [panel, setPanel] = useState<'systems' | 'inspector' | null>(null),
    [sidebar, setSidebar] = useState(true);
  const [lesson, setLesson] = useState(false),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(true),
    [notice, setNotice] = useState('');
  const [sectionMenu, setSectionMenu] = useState(false),
    [cameraView, setCameraView] = useState<CameraView>('perspective');
  const viewerRef = useRef<Viewer | null>(null),
    searchRef = useRef<HTMLButtonElement>(null),
    workspaceRef = useRef<HTMLElement>(null),
    savedView = useRef<ViewState | null>(null);
  const assemblyDefinitions =
    view.fixtureMode && fixture ? fixture.assemblies : manifest.assemblies;
  const featuredAssembly = manifest.featuredAssemblyId;
  const hatchComponentIds = new Set(
    assemblyDefinitions.flatMap((a) => [
      a.id,
      ...a.parts.map((p) => p.id),
      ...a.parts
        .flatMap((p) => ancestors(p.id).map((c) => c.id))
        .filter((id) => id !== componentById.get(a.id)?.systemId),
    ]),
  );
  const availableModes = view.fixtureMode
    ? new Set<ViewMode>(
        view.legacyVehicleFixture
          ? viewModes.map((m) => m.id)
          : [
              'studio',
              'photos',
              'premium',
              'showroom',
              'xray',
              'exploded',
              'cutaway',
              'component',
              'disassembly',
              'hatch',
              'materials',
            ],
      )
    : coverage.modes;
  const render3D = true;
  const hasVehicleModel =
    view.legacyVehicleFixture || manifest.models.some((m) => m.scope === 'vehicle');
  const patch = (updates: Partial<ViewState>) => setView((v) => ({ ...v, ...updates }));
  const reset = () => {
    setPlaying(false);
    setLesson(false);
    setView((v) => ({
      ...initialView,
      fixtureMode: v.fixtureMode,
      legacyVehicleFixture: v.legacyVehicleFixture,
      activeAssembly: v.fixtureMode && !v.legacyVehicleFixture ? fixture!.assemblies[0].id : null,
      theme: v.theme,
      quality: v.quality,
      exposure: v.exposure,
      lighting: v.lighting,
    }));
    setMode('studio');
    setCameraView('perspective');
    viewerRef.current?.setCamera('perspective');
    setNotice('Assembly restored. All available components shown.');
  };
  const select = (id: string | null) => {
    if (id && hatchComponentIds.has(id)) {
      setLesson(false);
      setPlaying(false);
    }
    setView((v) => {
      const hidden = new Set(v.hidden);
      if (id) {
        hidden.delete(id);
        ancestors(id).forEach((a) => hidden.delete(a.id));
      }
      return {
        ...v,
        selected: id,
        hidden,
        activeAssembly: id
          ? (assemblyDefinitions.find((a) => a.id === id || a.parts.some((p) => p.id === id))?.id ??
            (id === featuredAssembly || ancestors(id).some((a) => a.id === featuredAssembly)
              ? (featuredAssembly ?? null)
              : hasVehicleModel
                ? null
                : v.activeAssembly))
          : v.activeAssembly,
        assemblyContext: id && !hatchComponentIds.has(id) ? false : v.assemblyContext,
        inspectionRotation: 0,
        isolated: v.isolated && id && !descendants(v.isolated).has(id) ? null : v.isolated,
      };
    });
    if (id) setPanel('inspector');
  };
  const openHatch = () => {
    if (!featuredAssembly) return;
    setMode('hatch');
    setLesson(false);
    setPlaying(false);
    setQuery('');
    setPanel(null);
    patch({
      autoRotate: false,
      activeAssembly: featuredAssembly,
      selected: featuredAssembly,
      isolated: null,
      hidden: new Set(),
      transparent: new Set(),
      explode: 0,
      hatchOpen: 0,
      section: 'off',
      separated: new Set(),
      assemblyContext: false,
      inspectionRotation: 0,
    });
    setCameraView('perspective');
  };
  const closeHatch = () => {
    setMode('studio');
    patch({
      activeAssembly: null,
      selected: null,
      isolated: null,
      explode: 0,
      hatchOpen: 0,
      separated: new Set(),
      assemblyContext: false,
      inspectionRotation: 0,
      measure: false,
    });
    setCameraView('perspective');
  };
  const returnToAssembly = () =>
    patch({
      isolated: null,
      explode: 0,
      hatchOpen: 0,
      separated: new Set(),
      inspectionRotation: 0,
      assemblyContext: false,
      hidden: new Set(),
    });
  const separatePart = () => {
    if (!view.selected) return;
    const separated = new Set(view.separated);
    if (separated.has(view.selected)) separated.delete(view.selected);
    else separated.add(view.selected);
    patch({ separated, hatchOpen: 0, assemblyContext: false });
  };
  const toggleHidden = (id: string) =>
    setView((v) => {
      const hidden = new Set(v.hidden);
      if (hidden.has(id) || ancestors(id).some((a) => hidden.has(a.id))) {
        hidden.delete(id);
        ancestors(id).forEach((a) => hidden.delete(a.id));
      } else hidden.add(id);
      return { ...v, hidden };
    });
  const focus = () => {
    if (view.selected) viewerRef.current?.focus(view.selected);
  };
  const ghost = () => {
    if (view.selected)
      setView((v) => {
        const t = new Set(v.transparent);
        if (t.has(v.selected!)) t.delete(v.selected!);
        else t.add(v.selected!);
        return { ...v, transparent: t };
      });
  };
  const startLesson = () => {
    if (!view.legacyVehicleFixture || !fixture) return;
    setMode('component');
    if (!lesson) savedView.current = view;
    setLesson(true);
    setPlaying(false);
    setPanel('inspector');
    setView((v) => ({
      ...v,
      selected: 'clutch-actuator',
      isolated: 'transmission',
      hidden: new Set(),
      transparent: new Set(['transmission-case']),
      explode: 0,
      animationProgress: 0,
      xray: false,
      section: 'off',
      activeAssembly: null,
      assemblyContext: false,
      hatchOpen: 0,
      separated: new Set(),
      inspectionRotation: 0,
      measure: false,
    }));
    setNotice('Transmission lesson opened. Drag the model to inspect the release linkage.');
  };
  const closeLesson = () => {
    setLesson(false);
    setPlaying(false);
    if (savedView.current) setView(savedView.current);
    else reset();
  };
  const camera = (value: CameraView) => {
    setCameraView(value);
    viewerRef.current?.setCamera(value);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = view.theme;
  }, [view.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame: number,
      previous = performance.now(),
      accumulated = 0;
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      accumulated += delta;
      if (accumulated >= 1 / 30) {
        const advance = (accumulated * speed) / 12;
        accumulated = 0;
        setView((v) => ({
          ...v,
          animationProgress: loop
            ? (v.animationProgress + advance) % 1
            : Math.min(1, v.animationProgress + advance),
        }));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, loop]);
  useEffect(() => {
    if (playing && !loop && view.animationProgress >= 1) setPlaying(false);
  }, [playing, loop, view.animationProgress]);
  const chooseMode = (next: ViewMode) => {
    if (next === 'photos') {
      setDialog('references');
      return;
    }
    setMode(next);
    setPlaying(false);
    setLesson(false);
    if (!availableModes.has(next)) return;
    const focusId = manifest.focusTargets?.[next];
    if (focusId && componentById.has(focusId)) select(focusId);
    if (next === 'hatch') {
      openHatch();
      return;
    }
    patch({
      explode: next === 'exploded' ? 1 : 0,
      hatchOpen: 0,
      separated: new Set(),
      inspectionRotation: 0,
      xray: next === 'xray',
      section: next === 'cutaway' ? 'left' : 'off',
      lighting: next === 'showroom' ? 'showroom' : next === 'premium' ? 'premium' : 'studio',
      isolated: next === 'component' || next === 'materials' ? view.selected : null,
    });
    setSectionMenu(next === 'cutaway');
    if (next === 'underbody') camera('bottom');
    else if (next === 'interior') camera('interior');
    else if (manifest.modeCameras?.[next]) camera(manifest.modeCameras[next]!);
    else if (next === 'powertrain' && view.fixtureMode) camera('rear');
  };
  const selected = view.selected ? componentById.get(view.selected) : null;
  return (
    <div
      className={`app ${sidebar ? '' : 'sidebar-collapsed'} mobile-panel-${panel ?? 'none'} ${view.activeAssembly && render3D ? 'assembly-workspace' : ''} ${render3D ? 'model-mode' : 'photo-mode'}`}
      style={
        { '--left-width': `${leftWidth}px`, '--right-width': `${rightWidth}px` } as CSSProperties
      }
    >
      <header className="topbar">
        <button className="brand" onClick={reset} aria-label="AutoAtlas home">
          <span className="brand-icon">
            <Logo />
          </span>
          <span>
            AutoAtlas<span className="brand-3d">3D</span>
          </span>
        </button>
        <div className="header-divider" />
        <button
          aria-label="Change vehicle"
          className="vehicle-switcher"
          onClick={() => setDialog('vehicle')}
        >
          <CarFront size={17} />
          <span>
            {vehicle.year} {vehicle.manufacturer} {vehicle.model} <b>{vehicle.chassisCode}</b>
          </span>
          <ChevronDown size={14} />
        </button>
        <button
          className="global-search vehicle-global-search"
          ref={searchRef}
          onClick={() => setDialog('vehicle')}
          aria-label="Search vehicles by name, year or VIN"
        >
          <Search size={16} />
          <span>Find a vehicle, model or VIN…</span>
          <kbd>/</kbd>
        </button>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={view.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={() => patch({ theme: view.theme === 'light' ? 'dark' : 'light' })}
          >
            {view.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="icon-button" aria-label="Open help" onClick={() => setDialog('help')}>
            <CircleHelp size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Open settings"
            onClick={() => setDialog('settings')}
          >
            <Settings2 size={18} />
          </button>
          <span className="version">
            {view.fixtureMode ? 'DEVELOPMENT FIXTURE' : '3D WORKSPACE'}
          </span>
        </div>
      </header>
      <nav className="subbar" aria-label="Workspace">
        <div className="workspace-tabs">
          <button
            className={!lesson && !view.activeAssembly ? 'active' : ''}
            onClick={() => {
              setMode('studio');
              if (lesson) closeLesson();
              if (view.activeAssembly) closeHatch();
            }}
          >
            <Box size={15} />
            Vehicle explorer
          </button>
          <button
            hidden={!featuredAssembly}
            className={view.activeAssembly ? 'active' : ''}
            onClick={openHatch}
          >
            <Layers3 size={15} />
            {featuredAssembly === 'rear-hatch' ? 'Hatch assembly' : 'Assembly explorer'}
          </button>
          <button
            hidden={!view.legacyVehicleFixture || !fixture}
            className={lesson ? 'active' : ''}
            onClick={startLesson}
          >
            <GraduationCap size={16} />
            Mechanism lab<span className="new-tag">NEW</span>
          </button>
        </div>
        <div className="subbar-right">
          <span className="status-dot" />
          {view.fixtureMode ? 'Unverified development model' : coverage.label}{' '}
          <span className="sub-separator">/</span>
          <button onClick={() => setDialog('vehicle')}>
            {vehicle.market} · {vehicle.chassisCode}
            <ChevronDown size={12} />
          </button>
        </div>
      </nav>
      <div className="main-layout">
        <div className="systems-wrap">
          <PanelResizeHandle side="left" value={leftWidth} onChange={setLeftWidth} />
          <SystemsTree
            state={view}
            query={query}
            onQuery={setQuery}
            onSelect={select}
            onToggle={toggleHidden}
            onShowAll={() => patch({ hidden: new Set(), isolated: null })}
            onLearn={startLesson}
          />
        </div>
        <main className="workspace" ref={workspaceRef} aria-label="Vehicle workspace">
          <div className="workspace-heading">
            <div>
              <div className="workspace-breadcrumb">
                <button
                  className="icon-button sidebar-toggle"
                  aria-label={sidebar ? 'Collapse systems panel' : 'Expand systems panel'}
                  onClick={() => setSidebar(!sidebar)}
                >
                  {sidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                </button>
                VEHICLE EXPLORER<span>/</span>
                {view.activeAssembly
                  ? componentById.get(view.activeAssembly)?.name
                  : vehicle.chassisCode}
              </div>
              <h1>
                {lesson
                  ? 'Inside the shift.'
                  : view.activeAssembly
                    ? componentById.get(view.activeAssembly)?.name
                    : `${vehicle.manufacturer} ${vehicle.model}`}
              </h1>
              <p>
                {lesson
                  ? 'An automated manual, one movement at a time.'
                  : view.activeAssembly
                    ? `${vehicle.year} · ${vehicle.chassisCode} · ${vehicle.market}`
                    : `${vehicle.year} · ${vehicle.bodyStyle} · ${vehicle.market}`}
              </p>
            </div>
            <div className="workspace-view-actions">
              <button className="references-button" onClick={() => setDialog('references')}>
                References
              </button>
              <ViewModeSelector mode={mode} available={availableModes} onChange={chooseMode} />
            </div>
          </div>
          {!availableModes.has(mode) && (
            <div className="mode-unavailable" role="status">
              <strong>{viewModes.find((m) => m.id === mode)?.name}</strong>
              <span>{viewModes.find((m) => m.id === mode)?.reason}</span>
              <button onClick={() => setDialog('references')}>View photo references</button>
            </div>
          )}
          {view.fixtureMode && (
            <div className="fixture-banner">
              DEVELOPMENT FIXTURE ·{' '}
              {view.legacyVehicleFixture ? 'Legacy vehicle' : '21-part hatch sample'} · Dimensions
              unverified · Accurate vehicle CAD still required
            </div>
          )}
          {
            <Suspense fallback={<div className="scene-message">Loading 3D tools…</div>}>
              <>
                <SceneCanvas
                  state={view}
                  viewerRef={viewerRef}
                  onSelect={select}
                  onLoaded={(n) => {
                    setCount(n);
                    if (cameraView !== 'perspective') viewerRef.current?.setCamera(cameraView);
                  }}
                  onStats={setStats}
                  onQuality={(q) => setView((v) => ({ ...v, quality: q }))}
                  onAssembly={setAssemblyStatus}
                  onMeasurement={setMeasurement}
                />
                {view.activeAssembly &&
                  assemblyDefinitions.some((a) => a.id === view.activeAssembly) && (
                    <AssemblyExplorer
                      definition={assemblyDefinitions.find((a) => a.id === view.activeAssembly)!}
                      state={view}
                      status={assemblyStatus}
                      onPatch={patch}
                      onBack={closeHatch}
                      hasVehicleModel={hasVehicleModel}
                      onRetry={() => viewerRef.current?.retryAssembly()}
                      onFrame={() => {
                        patch({ isolated: null });
                        if (view.activeAssembly) viewerRef.current?.focus(view.activeAssembly);
                      }}
                    />
                  )}
                {!hasVehicleModel && !view.activeAssembly && (
                  <div className="scene-message asset-gap" role="status">
                    <Box size={30} />
                    <h2>Vehicle geometry required</h2>
                    <p>No reviewed 2015 U.S. gasoline 451 vehicle model is installed.</p>
                    {fixture && (
                      <button onClick={openHatch}>Explore the 21-part hatch sample</button>
                    )}
                    <button onClick={() => setDialog('references')}>
                      Open supporting references
                    </button>
                  </div>
                )}
                {view.measure && (
                  <div className="measurement-hud" role="status">
                    <Ruler size={15} />
                    <div>
                      <strong>
                        {measurement.millimetres === null
                          ? `Select ${measurement.points ? 'the second' : 'two'} surface point${measurement.points ? '' : 's'}`
                          : `${measurement.millimetres.toFixed(1)} mm · model distance`}
                      </strong>
                      <small>Demonstration geometry · not a verified physical measurement</small>
                    </div>
                    <button
                      aria-label="Close measurement"
                      onClick={() => patch({ measure: false })}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="model-caption">
                  <span className="eyebrow">
                    {vehicle.manufacturer.toUpperCase()} / {vehicle.chassisCode}
                  </span>
                  <span>
                    {view.activeAssembly
                      ? componentById.get(view.activeAssembly)?.name
                      : `${vehicle.model} ${vehicle.trim}`}
                  </span>
                  <small>
                    {view.activeAssembly
                      ? view.fixtureMode
                        ? 'Reference-guided demonstration · Tier C'
                        : 'Imported assembly'
                      : '2015 · Rear engine · Gasoline'}
                  </small>
                </div>
                <div className="view-toolbar" aria-label="View tools">
                  <button
                    className={`icon-button ${view.xray ? 'active' : ''}`}
                    aria-label="Toggle X-ray mode"
                    aria-pressed={view.xray}
                    onClick={() => patch({ xray: !view.xray })}
                  >
                    <Scan size={18} />
                    <span>X-ray</span>
                  </button>
                  <button
                    className={`icon-button ${sectionMenu ? 'active' : ''}`}
                    aria-label="Section cut controls"
                    aria-expanded={sectionMenu}
                    onClick={() => setSectionMenu(!sectionMenu)}
                  >
                    <SlidersHorizontal size={18} />
                    <span>Section</span>
                  </button>
                  <div className="tool-divider" />
                  <button
                    className="icon-button"
                    aria-label="Zoom in"
                    onClick={() => viewerRef.current?.zoom(0.8)}
                  >
                    <Plus size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Zoom out"
                    onClick={() => viewerRef.current?.zoom(1.25)}
                  >
                    <Minus size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Reset camera"
                    onClick={() => camera('perspective')}
                  >
                    <Crosshair size={18} />
                  </button>
                  <div className="tool-divider" />
                  <button
                    className="icon-button"
                    aria-label="Toggle fullscreen"
                    onClick={() => {
                      if (document.fullscreenElement) void document.exitFullscreen();
                      else
                        void workspaceRef.current
                          ?.requestFullscreen()
                          .catch(() => setNotice('Fullscreen is unavailable in this browser.'));
                    }}
                  >
                    <Expand size={17} />
                  </button>
                </div>
                {sectionMenu && (
                  <div className="section-popover">
                    <div>
                      <strong>Section cut</strong>
                      <button
                        className="icon-button"
                        aria-label="Close section controls"
                        onClick={() => setSectionMenu(false)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <label>
                      Cut plane
                      <select
                        aria-label="Section plane"
                        value={view.section}
                        onChange={(e) => patch({ section: e.target.value as ViewState['section'] })}
                      >
                        <option value="off">No cut</option>
                        <option value="front">Front</option>
                        <option value="rear">Rear</option>
                        <option value="left">Left side</option>
                        <option value="right">Right side</option>
                        <option value="upper">Upper</option>
                        <option value="longitudinal">Longitudinal (legacy)</option>
                        <option value="cross">Cross-section (legacy)</option>
                        <option value="horizontal">Horizontal (legacy)</option>
                      </select>
                    </label>
                    <label className="clip-scope">
                      <input
                        type="checkbox"
                        checked={view.clipExteriorOnly}
                        onChange={(e) => patch({ clipExteriorOnly: e.target.checked })}
                      />
                      Clip exterior only
                    </label>
                    <label>
                      Custom position
                      <input
                        aria-label="Section position"
                        type="range"
                        min="-1"
                        max="1"
                        step=".01"
                        value={view.cut}
                        onChange={(e) => patch({ cut: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                )}
                {view.isolated && (
                  <div className="isolation-banner">
                    <FocusIcon />
                    Isolated · {componentById.get(view.isolated)?.name}
                    <button onClick={() => patch({ isolated: null })}>
                      Show vehicle <X size={12} />
                    </button>
                  </div>
                )}
                <div className="canvas-bottom">
                  <span className="accuracy-pill">
                    <span>{view.fixtureMode ? 'C' : '3D'}</span>
                    {view.fixtureMode
                      ? 'Demonstration · dimensions unverified'
                      : `${coverage.mappedParts} reviewed parts`}
                    <CircleHelp size={12} />
                  </span>
                  <div className="orbit-hint">
                    <span>↔</span>Drag to orbit
                    <i />
                    Scroll to zoom
                    <i />
                    Click to inspect
                  </div>
                </div>
                <ViewerToolbar
                  view={view}
                  mode={mode}
                  patch={patch}
                  reset={reset}
                  ghost={ghost}
                  toggleHidden={toggleHidden}
                  cameraView={cameraView}
                  camera={camera}
                  onSettings={() => setDialog('settings')}
                  onZoom={() => viewerRef.current?.zoom(0.8)}
                  onCutaway={() => {
                    patch({ section: view.section === 'off' ? 'left' : 'off' });
                    setSectionMenu(view.section === 'off');
                  }}
                />
              </>
            </Suspense>
          }
        </main>
        <div className="inspector-wrap">
          <PanelResizeHandle side="right" value={rightWidth} onChange={setRightWidth} />
          {lesson ? (
            <LessonPanel
              progress={view.animationProgress}
              playing={playing}
              speed={speed}
              loop={loop}
              onProgress={(n) => patch({ animationProgress: n })}
              onPlaying={setPlaying}
              onSpeed={setSpeed}
              onLoop={setLoop}
              onClose={closeLesson}
            />
          ) : (
            <Inspector
              state={view}
              onFocus={focus}
              onIsolate={() =>
                patch({
                  isolated: view.isolated === view.selected ? null : view.selected,
                  assemblyContext: false,
                  inspectionRotation: 0,
                })
              }
              onHide={() => view.selected && toggleHidden(view.selected)}
              onGhost={ghost}
              onSelect={select}
              onLearn={startLesson}
              onNeighbors={() => {
                if (selected)
                  patch({
                    isolated: selected.parentComponentId ?? selected.systemId,
                    hidden: new Set(),
                  });
              }}
              onLocation={() => {
                patch({
                  explode: 0,
                  hatchOpen: 0,
                  isolated: null,
                  hidden: new Set(),
                  separated: new Set(),
                  inspectionRotation: 0,
                  assemblyContext: hasVehicleModel && !!view.activeAssembly,
                });
                setNotice(
                  hasVehicleModel
                    ? 'Restored the installed position in the complete vehicle.'
                    : 'Restored the sample assembly. Full vehicle geometry is not installed.',
                );
              }}
              onClose={() => setPanel(null)}
              onAssembly={openHatch}
              onReturn={returnToAssembly}
              onSeparate={separatePart}
              onRotate={(angle) => patch({ inspectionRotation: angle })}
              educationMode={educationMode}
            />
          )}
        </div>
      </div>
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          {render3D
            ? `${count} selectable component groups`
            : `${coverage.parts} catalog parts · ${coverage.photos} photographs`}
          <i />
          {vehicle.chassisCode} · {vehicle.engine}
        </span>
        <span className="status-center">Built to explore. Grounded in evidence.</span>
        <span>
          {render3D
            ? view.autoRotate
              ? `${stats.fps} render fps`
              : 'On-demand rendering'
            : 'Photo & catalog workspace'}
          <i />
          {render3D
            ? `${(stats.triangles / 1000).toFixed(0)}k triangles`
            : `${coverage.mappedParts} reviewed 3D parts`}
          <button onClick={() => setDialog('help')}>
            About this atlas
            <ArrowUpRight size={11} />
          </button>
        </span>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile panels">
        <button
          aria-pressed={panel === 'systems'}
          onClick={() => setPanel(panel === 'systems' ? null : 'systems')}
        >
          <Layers3 size={18} />
          Systems
        </button>
        <button aria-pressed={panel === null} onClick={() => setPanel(null)}>
          <Box size={18} />
          Explore
        </button>
        <button
          aria-pressed={panel === 'inspector'}
          onClick={() => setPanel(panel === 'inspector' ? null : 'inspector')}
        >
          <Eye size={18} />
          Inspector
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {dialog === 'settings' && (
        <WorkspaceSettings
          view={view}
          patch={patch}
          fixture={!!fixture}
          educationMode={educationMode}
          setEducationMode={setEducationMode}
          stats={stats}
          onClose={() => setDialog(null)}
          onFixtureChange={(enabled) => {
            setMode('studio');
            patch({
              ...initialView,
              theme: view.theme,
              quality: view.quality,
              fixtureMode: enabled,
              activeAssembly: enabled ? fixture!.assemblies[0].id : null,
            });
            setLesson(false);
          }}
        />
      )}
      {dialog === 'references' && (
        <ReferenceDialog onClose={() => setDialog(null)}>
          <PhotoViewport
            state={view}
            onSelect={(id) => {
              select(id);
              if (id) setDialog(null);
            }}
          />
        </ReferenceDialog>
      )}
      {dialog === 'vehicle' && <VehicleSearch onClose={() => setDialog(null)} />}
      {dialog === 'help' && <WorkspaceHelp onClose={() => setDialog(null)} />}
    </div>
  );
}
function FocusIcon() {
  return <ArrowDownToLine size={14} />;
}
