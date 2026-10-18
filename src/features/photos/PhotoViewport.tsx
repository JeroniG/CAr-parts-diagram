import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Image,
  Minus,
  Plus,
  RotateCcw,
  MapPin,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { useCatalog } from '../vehicles/CatalogContext';
import type { ViewState } from '../../scene/state';
export function PhotoViewport({
  state,
  onSelect,
  requestedPhoto,
}: {
  state: ViewState;
  onSelect: (id: string | null) => void;
  requestedPhoto?: string;
}) {
  const { manifest, componentById, visibleComponent } = useCatalog();
  const media = useMemo(
    () => [
      ...manifest.photos,
      ...manifest.diagrams.map((d) => ({
        ...d,
        kind: 'diagram' as const,
        componentIds: d.callouts.map((c) => c.instanceId),
        hotspots: d.callouts.map((c) => ({
          instanceId: c.instanceId,
          label: `Figure ${c.figureLabel} · ${componentById.get(c.instanceId)?.name ?? c.instanceId}`,
          x: c.x,
          y: c.y,
        })),
      })),
    ],
    [manifest, componentById],
  );
  const [index, setIndex] = useState(0),
    [zoom, setZoom] = useState(1),
    [markers, setMarkers] = useState(true),
    [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 }),
    drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!state.selected) return;
    const found = media.findIndex(
      (p) =>
        p.componentIds.includes(state.selected!) ||
        p.hotspots.some((h) => h.instanceId === state.selected),
    );
    if (found >= 0) setIndex(found);
  }, [state.selected, media]);
  useEffect(() => {
    if (requestedPhoto) {
      const found = media.findIndex((p) => p.id === requestedPhoto);
      if (found >= 0) setIndex(found);
    }
  }, [requestedPhoto, media]);
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setFailed(false);
  }, [index]);
  const photo = media[index];
  if (!photo)
    return (
      <div className="reference-empty">
        <Image size={36} />
        <h2>No authorized reference images connected</h2>
        <p>
          The selected vehicle identity is retained. Browse its available catalog or request the
          missing coverage.
        </p>
      </div>
    );
  const selectedHotspot = photo.hotspots.find((h) => h.instanceId === state.selected);
  return (
    <section
      className="photo-workspace"
      aria-label="Vehicle photo references"
      data-testid="photo-viewer"
    >
      <div className="photo-topline">
        <span className="media-kind">
          <Image size={13} />
          {photo.kind === 'photograph'
            ? 'REAL PHOTOGRAPH'
            : photo.kind === 'diagram'
              ? 'CATALOG DIAGRAM'
              : 'RENDER'}
          <i />
          {manifest.configuration.chassisCode} PLATFORM REFERENCE
        </span>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
        </span>
      </div>
      <div
        className={`photo-stage ${zoom > 1 ? 'zoomed' : ''}`}
        ref={container}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button') || zoom === 1) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setOffset({
              x: Math.max(-350, Math.min(350, drag.current.ox + e.clientX - drag.current.x)),
              y: Math.max(-250, Math.min(250, drag.current.oy + e.clientY - drag.current.y)),
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {failed ? (
          <div className="reference-empty">
            <Image />
            <p>The photograph could not be loaded. The component catalog remains available.</p>
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
              Open source photograph <ExternalLink size={13} />
            </a>
          </div>
        ) : (
          <div
            className="photo-plane"
            style={{
              width: `min(100cqw, ${(100 * photo.width) / photo.height}cqh)`,
              aspectRatio: `${photo.width}/${photo.height}`,
              transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})`,
            }}
          >
            <img
              src={photo.url}
              alt={photo.caption}
              draggable={false}
              onError={() => setFailed(true)}
            />
            {markers &&
              photo.hotspots
                .filter((h) => visibleComponent(h.instanceId, state.hidden, null))
                .map((h, i) => (
                  <button
                    key={`${h.instanceId}-${i}`}
                    className={`photo-hotspot ${state.selected === h.instanceId ? 'selected' : ''}`}
                    style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
                    aria-label={`Select ${h.label} in ${photo.kind === 'diagram' ? 'diagram' : 'photograph'}`}
                    onClick={() => onSelect(h.instanceId)}
                  >
                    <b>{String(i + 1).padStart(2, '0')}</b>
                    <span>{h.label}</span>
                  </button>
                ))}
          </div>
        )}
        <button
          className="photo-prev"
          aria-label="Previous photograph"
          disabled={media.length < 2}
          onClick={() => setIndex((index + media.length - 1) % media.length)}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="photo-next"
          aria-label="Next photograph"
          disabled={media.length < 2}
          onClick={() => setIndex((index + 1) % media.length)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="photo-caption">
        <div>
          <strong>{photo.caption}</strong>
          <p>{photo.scope}</p>
        </div>
        <button
          aria-label="Expand reference image"
          onClick={() => {
            void container.current?.requestFullscreen?.().catch(() => {});
          }}
        >
          <Maximize2 size={17} />
        </button>
      </div>
      <div className="reference-toolbar" aria-label="Photograph controls">
        <button
          aria-label="Zoom out photograph"
          disabled={zoom <= 1}
          onClick={() => setZoom(Math.max(1, zoom - 0.25))}
        >
          <Minus size={16} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in photograph"
          disabled={zoom >= 3}
          onClick={() => setZoom(Math.min(3, zoom + 0.25))}
        >
          <Plus size={16} />
        </button>
        <i />
        <button aria-pressed={markers} onClick={() => setMarkers(!markers)}>
          <MapPin size={15} />
          Part markers
        </button>
        {selectedHotspot && (
          <button
            onClick={() => {
              setZoom(2);
              setOffset({
                x: (0.5 - selectedHotspot.x) * (container.current?.clientWidth ?? 400),
                y: (0.5 - selectedHotspot.y) * (container.current?.clientHeight ?? 300),
              });
            }}
          >
            Focus reference
          </button>
        )}
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            onSelect(null);
          }}
        >
          <RotateCcw size={14} />
          Reset view
        </button>
        <span className="photo-pan-hint">Zoom, then drag to pan</span>
      </div>
      <div className="photo-filmstrip">
        {media.map((p, i) => (
          <button
            key={p.id}
            aria-label={`Open ${p.caption}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            <img src={p.url} alt="" loading="lazy" />
            <span>{p.caption.split(' · ')[0]}</span>
          </button>
        ))}
      </div>
      <div className="photo-credit">
        <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
          {photo.attribution} <ExternalLink size={10} />
        </a>
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
          {photo.license}
        </a>
        <span>Source image · authored location markers added in the interface</span>
      </div>
      {state.selected && !selectedHotspot && !photo.componentIds.includes(state.selected) && (
        <p className="photo-unmapped">
          {componentById.get(state.selected)?.name}: no authored location marker in this photograph.
          See the inspector for sourced catalog information.
        </p>
      )}
    </section>
  );
}
