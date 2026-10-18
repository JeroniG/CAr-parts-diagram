import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Box,
  CarFront,
  Check,
  ChevronDown,
  ChevronRight,
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
  RotateCcw,
  RotateCw,
  Scan,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { initialView } from '../scene/Viewer';
import type { CameraView, Quality, ViewState, Viewer } from '../scene/Viewer';
import { SceneCanvas } from '../components/SceneCanvas';
import { SystemsTree } from '../components/SystemsTree';
import { Inspector } from '../components/Inspector';
import { LessonPanel } from '../components/LessonPanel';
import { Dialog } from '../components/Dialog';
import { ancestors, descendants } from '../services/catalog';
import { componentById, vehicle } from '../data/catalog';
import { classifyVIN, decodeVIN } from '../services/vin';
function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m5 25 10-20h4l10 20h-6l-2-5H12l-2 5Zm9-10h5l-2.5-5Z" fill="currentColor" />
      <path d="M3 29h26" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export default function App() {
  const [view, setView] = useState<ViewState>(() => ({
    ...initialView,
    quality: window.innerWidth < 800 ? 'medium' : 'high',
  }));
  const [query, setQuery] = useState(''),
    [count, setCount] = useState(0),
    [stats, setStats] = useState({ fps: 0, triangles: 0, drawCalls: 0 });
  const [dialog, setDialog] = useState<'vehicle' | 'settings' | 'help' | null>(null),
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
    searchRef = useRef<HTMLInputElement>(null),
    workspaceRef = useRef<HTMLElement>(null),
    savedView = useRef<ViewState | null>(null);
  const [vin, setVin] = useState(''),
    [vinStatus, setVinStatus] = useState(''),
    [decoding, setDecoding] = useState(false);
  const patch = (updates: Partial<ViewState>) => setView((v) => ({ ...v, ...updates }));
  const reset = () => {
    setPlaying(false);
    setLesson(false);
    setView((v) => ({
      ...initialView,
      theme: v.theme,
      quality: v.quality,
      exposure: v.exposure,
      lighting: v.lighting,
    }));
    setCameraView('perspective');
    viewerRef.current?.setCamera('perspective');
    setNotice('Vehicle reassembled. All components restored.');
  };
  const select = (id: string | null) => {
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
        isolated: v.isolated && id && !descendants(v.isolated).has(id) ? null : v.isolated,
      };
    });
    if (id) setPanel('inspector');
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
  const selected = view.selected ? componentById.get(view.selected) : null;
  return (
    <div className={`app ${sidebar ? '' : 'sidebar-collapsed'} mobile-panel-${panel ?? 'none'}`}>
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
        <button className="vehicle-switcher" onClick={() => setDialog('vehicle')}>
          <CarFront size={17} />
          <span>
            2015 Smart Fortwo <b>451</b>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="global-search">
          <Search size={16} />
          <input
            ref={searchRef}
            aria-label="Search all components"
            placeholder="Find a component, explore a system…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setPanel('systems');
            }}
          />
          <kbd>/</kbd>
        </div>
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
          <span className="version">PREVIEW 01</span>
        </div>
      </header>
      <nav className="subbar" aria-label="Workspace">
        <div className="workspace-tabs">
          <button
            className={!lesson ? 'active' : ''}
            onClick={() => {
              if (lesson) closeLesson();
            }}
          >
            <Box size={15} />
            Vehicle explorer
          </button>
          <button className={lesson ? 'active' : ''} onClick={startLesson}>
            <GraduationCap size={16} />
            Mechanism lab<span className="new-tag">NEW</span>
          </button>
        </div>
        <div className="subbar-right">
          <span className="status-dot" />
          Local model <span className="sub-separator">/</span>
          <button onClick={() => setDialog('vehicle')}>
            U.S. gasoline configuration
            <ChevronDown size={12} />
          </button>
        </div>
      </nav>
      <div className="main-layout">
        <div className="systems-wrap">
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
        <main className="workspace" ref={workspaceRef} aria-label="3D workspace">
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
                THE VEHICLE ATLAS<span>/</span>001
              </div>
              <h1>{lesson ? 'Inside the shift.' : 'Engineering, revealed.'}</h1>
              <p>
                {lesson
                  ? 'An automated manual, one movement at a time.'
                  : 'Explore every system. Understand how it all connects.'}
              </p>
            </div>
            <button className="view-chip" onClick={() => setDialog('help')}>
              <span className="status-dot" />
              LIVE 3D <span>↗</span>
            </button>
          </div>
          <SceneCanvas
            state={view}
            viewerRef={viewerRef}
            onSelect={select}
            onLoaded={setCount}
            onStats={setStats}
            onQuality={(q) => setView((v) => ({ ...v, quality: q }))}
          />
          <div className="model-caption">
            <span className="eyebrow">SMART / 451</span>
            <span>Fortwo Passion Coupé</span>
            <small>2015 · Rear engine · Gasoline</small>
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
                  <option value="longitudinal">Longitudinal</option>
                  <option value="cross">Cross-section</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </label>
              <label>
                Position
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
              <span>C</span>Educational geometry
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
          <div className="bottom-dock">
            <div className="dock-top">
              <div className="layout-tabs" aria-label="Exploded layout">
                <button
                  className={view.explode === 0 ? 'active' : ''}
                  onClick={() => patch({ explode: 0 })}
                >
                  <Box size={14} />
                  Assembled
                </button>
                <button
                  className={view.explode > 0 && view.layout === 'radial' ? 'active' : ''}
                  onClick={() => patch({ layout: 'radial', explode: 0.65 })}
                >
                  <Expand size={14} />
                  Exploded
                </button>
                <button
                  className={view.explode > 0 && view.layout === 'inventory' ? 'active' : ''}
                  onClick={() => patch({ layout: 'inventory', explode: 1 })}
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
            <div className="explode-control">
              <span>Explode</span>
              <input
                aria-label="Exploded view"
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(view.explode * 100)}
                onChange={(e) => patch({ explode: Number(e.target.value) / 100 })}
              />
              <output>
                {Math.round(view.explode * 100)}
                <small>%</small>
              </output>
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
              <button className="quality-select" onClick={() => setDialog('settings')}>
                <span className="quality-bars">▂▅▇</span>
                {view.quality} quality
                <ChevronDown size={11} />
              </button>
            </div>
          </div>
        </main>
        <div className="inspector-wrap">
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
                patch({ isolated: view.isolated === view.selected ? null : view.selected })
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
                patch({ explode: 0, isolated: null, hidden: new Set() });
                setNotice('Restored the installed position in the complete vehicle.');
              }}
              onClose={() => setPanel(null)}
            />
          )}
        </div>
      </div>
      <footer className="statusbar">
        <span>
          <span className="status-dot" />
          {count ? `${count} selectable component groups` : 'Loading vehicle'}
          <i />
          451 · Gasoline
        </span>
        <span className="status-center">Built to explore. Grounded in evidence.</span>
        <span>
          {view.autoRotate ? `${stats.fps} render fps` : 'On-demand rendering'}
          <i />
          {(stats.triangles / 1000).toFixed(0)}k triangles
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
        <Dialog title="Make the workspace yours" onClose={() => setDialog(null)}>
          <p className="modal-intro">
            Tune the rendering to your device and the way you like to explore.
          </p>
          <div className="setting-row">
            <div>
              <strong>Appearance</strong>
              <span>Canvas and interface theme</span>
            </div>
            <button
              className="secondary-button"
              onClick={() => patch({ theme: view.theme === 'light' ? 'dark' : 'light' })}
            >
              {view.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}{' '}
              {view.theme === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>Rendering quality</strong>
              <span>Pixel density and real-time shadows</span>
            </div>
            <select
              aria-label="Rendering quality"
              value={view.quality}
              onChange={(e) => patch({ quality: e.target.value as Quality, adaptive: false })}
            >
              <option value="high">High · desktop</option>
              <option value="medium">Medium · balanced</option>
              <option value="low">Low · mobile</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Lighting</strong>
              <span>Physically based materials</span>
            </div>
            <select
              aria-label="Lighting preset"
              value={view.lighting}
              onChange={(e) => patch({ lighting: e.target.value as ViewState['lighting'] })}
            >
              <option value="studio">Studio</option>
              <option value="workshop">Workshop</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <strong>Adaptive quality</strong>
              <span>Balance rendering with device performance</span>
            </div>
            <input
              aria-label="Adaptive quality"
              type="checkbox"
              checked={view.adaptive}
              onChange={(e) => patch({ adaptive: e.target.checked })}
            />
          </div>
          <div className="setting-row exposure">
            <div>
              <strong>Exposure</strong>
              <span>{view.exposure.toFixed(1)} EV multiplier</span>
            </div>
            <input
              aria-label="Exposure"
              type="range"
              min=".5"
              max="2"
              step=".1"
              value={view.exposure}
              onChange={(e) => patch({ exposure: Number(e.target.value) })}
            />
          </div>
          <div className="performance-info">
            {stats.drawCalls} draw calls · {stats.triangles.toLocaleString()} rendered triangles
            <br />
            FPS is measured while rendering, not a hardware guarantee. Reduced-motion preferences
            disable auto-rotation and smooth camera transitions.
          </div>
          <button className="primary-button" onClick={() => setDialog(null)}>
            Back to exploring
            <ChevronRight size={15} />
          </button>
        </Dialog>
      )}
      {dialog === 'vehicle' && (
        <Dialog title="Your vehicle, precisely." onClose={() => setDialog(null)}>
          <p className="modal-intro">
            One carefully scoped configuration. More vehicles will arrive as geometry and evidence
            become available.
          </p>
          <div className="selected-vehicle">
            <CarFront size={35} />
            <div>
              <span className="eyebrow">CURRENT VEHICLE</span>
              <h3>2015 smart Fortwo</h3>
              <p>Passion Coupé · 451 · United States</p>
            </div>
            <Check size={20} />
          </div>
          <div className="config-fields">
            <div>
              <span>Engine</span>
              <strong>{vehicle.engine}</strong>
            </div>
            <div>
              <span>Transmission</span>
              <strong>{vehicle.transmission}</strong>
            </div>
            <div>
              <span>Drivetrain</span>
              <strong>{vehicle.drivetrain}</strong>
            </div>
            <div>
              <span>Production restrictions</span>
              <strong>VIN-specific details not established</strong>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setDecoding(true);
              setVinStatus('');
              try {
                const result = await decodeVIN(vin);
                setVinStatus(classifyVIN(result).message);
              } catch (error) {
                setVinStatus(error instanceof Error ? error.message : 'VIN decoding failed.');
              } finally {
                setDecoding(false);
              }
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
                {decoding ? 'Decoding…' : 'Decode'}
                <ArrowUpRight size={14} />
              </button>
            </div>
            <p className="small-muted">
              Sent to NHTSA only when you select Decode. Not saved. Decoding does not confirm part
              fitment or switch the model.
            </p>
            {vinStatus && (
              <p className="vin-status" role="status">
                {vinStatus}
              </p>
            )}
          </form>
          <button className="primary-button" onClick={() => setDialog(null)}>
            Explore this configuration
            <ChevronRight size={15} />
          </button>
        </Dialog>
      )}
      {dialog === 'help' && (
        <Dialog title="An atlas for the curious." onClose={() => setDialog(null)}>
          <p className="modal-intro">
            AutoAtlas 3D connects vehicle anatomy with transparent, traceable component information.
          </p>
          <div className="help-grid">
            <div>
              <span>01</span>
              <strong>Move around</strong>
              <p>Drag to orbit. Scroll or pinch to zoom. Right-drag or two-finger drag to pan.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Look closer</strong>
              <p>
                Select a component in the model or tree. Use Focus, Isolate, X-ray and section cuts.
              </p>
            </div>
            <div>
              <span>03</span>
              <strong>Take it apart</strong>
              <p>
                Drag the explosion slider. Switch to Inventory to arrange visible parts by system.
              </p>
            </div>
            <div>
              <span>04</span>
              <strong>Check the evidence</strong>
              <p>
                Tier A: engineering-verified. B: visually validated. C: educational. D: unmodeled.
                This release contains C and D only.
              </p>
            </div>
          </div>
          <div className="accuracy-card">
            <strong>Honest about what’s here.</strong>
            <p>
              This is an original educational model, not licensed factory CAD. There are three
              sourced OEM identities and zero confirmed gasoline fitments. No repair procedures are
              provided.
            </p>
          </div>
          <p className="small-muted">
            Keyboard: Tab through controls; arrow keys adjust sliders; / focuses search; Escape
            closes dialogs. The searchable catalog also works without WebGL.
          </p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            Let’s explore
            <ArrowUpRight size={16} />
          </button>
        </Dialog>
      )}
    </div>
  );
}
function FocusIcon() {
  return <ArrowDownToLine size={14} />;
}
