import { ArrowLeft, Box, LoaderCircle, MapPin, RotateCcw } from 'lucide-react';
import type { ViewState } from '../scene/Viewer';
import type { AssemblyDefinition, AssemblyLoadStatus } from '../types/assembly';

export function AssemblyExplorer({
  state,
  status,
  definition,
  onPatch,
  onBack,
  onRetry,
  onFrame,
}: {
  definition: AssemblyDefinition;
  state: ViewState;
  status: AssemblyLoadStatus;
  onPatch: (patch: Partial<ViewState>) => void;
  onBack: () => void;
  onRetry: () => void;
  onFrame: () => void;
}) {
  return (
    <section
      className="assembly-controls"
      aria-label={`${definition.name} workspace`}
      data-status={status.phase}
    >
      <div className="assembly-control-row">
        <button onClick={onBack} className="assembly-back">
          <ArrowLeft size={14} />
          Whole vehicle
        </button>
        <span className="assembly-detail-label">
          {status.phase === 'ready'
            ? `${status.lod === 'high' ? 'Detailed' : 'Efficient'} model · ${definition.parts.length} parts`
            : 'On-demand assembly'}
        </span>
        <button onClick={onFrame} aria-label={`Frame ${definition.name} assembly`}>
          <Box size={14} />
          Fit assembly
        </button>
        <button
          className={state.assemblyContext ? 'active' : ''}
          aria-pressed={state.assemblyContext}
          onClick={() =>
            onPatch({
              assemblyContext: !state.assemblyContext,
              explode: 0,
              hatchOpen: 0,
              isolated: null,
              separated: new Set(),
              inspectionRotation: 0,
            })
          }
        >
          <MapPin size={14} />
          {state.assemblyContext ? 'Assembly only' : 'In vehicle'}
        </button>
      </div>
      {status.phase === 'loading' && (
        <div className="assembly-loading" role="status">
          <LoaderCircle size={14} className="spin" />
          <span>{status.message}</span>
          <progress aria-label="Assembly loading progress" max="1" value={status.progress} />
        </div>
      )}
      {status.phase === 'error' && (
        <div className="assembly-error" role="alert">
          <span>{status.message}</span>
          <button onClick={onRetry}>
            <RotateCcw size={14} />
            Retry assembly
          </button>
        </div>
      )}
      {status.phase === 'ready' && (
        <div className="assembly-motion-row">
          <button
            disabled={!status.motionAvailable}
            aria-label={state.hatchOpen > 0 ? 'Close rear hatch' : 'Open rear hatch'}
            onClick={() =>
              onPatch({
                hatchOpen: state.hatchOpen > 0 ? 0 : 1,
                explode: 0,
                separated: new Set(),
                inspectionRotation: 0,
                assemblyContext: false,
                isolated: null,
              })
            }
          >
            {state.hatchOpen > 0 ? 'Close hatch' : 'Open hatch'}
            <span>↗</span>
          </button>
          <input
            disabled={!status.motionAvailable}
            aria-label="Hatch opening"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.hatchOpen}
            onChange={(e) =>
              onPatch({
                hatchOpen: Number(e.target.value),
                explode: 0,
                separated: new Set(),
                inspectionRotation: 0,
                isolated: null,
              })
            }
          />
          <span>Illustrative kinematics</span>
        </div>
      )}
    </section>
  );
}
