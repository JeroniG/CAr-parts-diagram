import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Box, LoaderCircle, MousePointer2 } from 'lucide-react';
import { useCatalog } from '../features/vehicles/CatalogContext';
import { developmentFixture } from '../vehicles/developmentFixtures';
import { Viewer } from '../scene/Viewer';
import type { Quality, ViewState } from '../scene/Viewer';
import type { AssemblyLoadStatus } from '../types/assembly';
import type { Measurement } from '../scene/controls/MeasurementController';
declare global {
  interface Window {
    __autoatlas?: { snapshot: () => ReturnType<Viewer['snapshot']> };
  }
}
export function SceneCanvas({
  state,
  viewerRef,
  onSelect,
  onLoaded,
  onStats,
  onQuality,
  onAssembly,
  onMeasurement,
}: {
  state: ViewState;
  viewerRef: MutableRefObject<Viewer | null>;
  onQuality: (quality: Quality) => void;
  onSelect: (id: string | null) => void;
  onLoaded: (n: number) => void;
  onStats: (s: { fps: number; triangles: number; drawCalls: number }) => void;
  onAssembly: (status: AssemblyLoadStatus) => void;
  onMeasurement: (measurement: Measurement) => void;
}) {
  const data = useCatalog();
  const ref = useRef<HTMLDivElement>(null),
    callbacks = useRef({ onSelect, onLoaded, onStats, onQuality, onAssembly, onMeasurement });
  callbacks.current = { onSelect, onLoaded, onStats, onQuality, onAssembly, onMeasurement };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    let viewer: Viewer | null = null;
    try {
      const fixture = state.fixtureMode ? developmentFixture(data.vehicle.id) : null;
      const model = data.manifest.models.find((m) => m.scope === 'vehicle');
      viewer = new Viewer(
        ref.current!,
        {
          quality: (q) => callbacks.current.onQuality(q),
          select: (id) => callbacks.current.onSelect(id),
          hover: setHover,
          loaded: (n) => {
            setStatus('ready');
            callbacks.current.onLoaded(n);
          },
          error: (message) => {
            setError(message);
            setStatus('error');
          },
          stats: (s) => callbacks.current.onStats(s),
          assembly: (s) => callbacks.current.onAssembly(s),
          measurement: (m) => callbacks.current.onMeasurement(m),
        },
        {
          catalog: data,
          base: fixture?.base ?? model?.variants.low ?? null,
          assemblies: fixture?.assemblies ?? data.manifest.assemblies,
          fixture: !!fixture,
        },
      );
      viewerRef.current = viewer;
      if (import.meta.env.DEV) window.__autoatlas = { snapshot: () => viewer!.snapshot() };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'WebGL unavailable');
      setStatus('error');
    }
    return () => {
      viewer?.dispose();
      viewerRef.current = null;
      delete window.__autoatlas;
    };
  }, [viewerRef, data, state.fixtureMode]);
  useEffect(() => {
    viewerRef.current?.update(state);
  }, [state, viewerRef]);
  return (
    <>
      <div className="scene-canvas" ref={ref} data-testid="scene" data-status={status} />
      {status === 'loading' && (
        <div className="scene-message">
          <LoaderCircle className="spin" size={30} />
          <strong>Preparing your perspective</strong>
          <span>Loading the component model…</span>
        </div>
      )}
      {status === 'error' && (
        <div className="scene-message fallback" role="status">
          <Box size={32} />
          <h3>Explore through the catalog</h3>
          <p>{error}</p>
          <span>
            All component information, search, sources and fitment details remain available in the
            panels.
          </span>
        </div>
      )}
      {hover && status === 'ready' && (
        <div className="hover-label">
          <MousePointer2 size={13} />
          {hover}
        </div>
      )}
    </>
  );
}
