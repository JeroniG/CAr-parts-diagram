import { Sun, Moon, ChevronRight } from 'lucide-react';
import { Dialog } from './Dialog';
import type { ViewState, Quality } from '../scene/state';
import { providerConfiguration } from '../data/providers/contracts';
import { useCatalog } from '../features/vehicles/CatalogContext';
export function WorkspaceSettings({
  view,
  patch,
  fixture,
  onFixtureChange,
  educationMode,
  setEducationMode,
  stats,
  onClose,
}: {
  view: ViewState;
  patch: (p: Partial<ViewState>) => void;
  fixture: boolean;
  onFixtureChange: (enabled: boolean) => void;
  educationMode: boolean;
  setEducationMode: (v: boolean) => void;
  stats: { drawCalls: number; triangles: number };
  onClose: () => void;
}) {
  const { manifest } = useCatalog();
  return (
    <Dialog title="Make the workspace yours" onClose={onClose}>
      {fixture && (
        <div className="development-setting">
          <strong>Development geometry</strong>
          <p>
            Opt into the old vehicle and hatch samples for interaction testing. These are not
            accurate production assets.
          </p>
          <label>
            <input
              type="checkbox"
              aria-label="Enable development fixture"
              checked={view.fixtureMode}
              onChange={(e) => onFixtureChange(e.target.checked)}
            />
            Enable development fixture
          </label>
        </div>
      )}
      <details className="provider-status">
        <summary>Data providers & coverage</summary>
        {providerConfiguration.map((p) => (
          <p key={p.id}>
            <strong>{p.name}</strong> · {p.status}
            <br />
            {p.scope}
          </p>
        ))}
        {manifest.providerRevisions.map((p) => (
          <p key={p.provider}>
            <strong>{p.provider}</strong> · revision {p.revision}
            <br />
            Retrieved {p.retrievedAt}
            {p.staleAfter && Date.parse(p.staleAfter) < Date.now()
              ? ' · Update due; published snapshot retained'
              : ''}
          </p>
        ))}
      </details>
      <div className="setting-row">
        <div>
          <strong>Learning explanations</strong>
          <span>Component functions and evidence limits</span>
        </div>
        <input
          type="checkbox"
          aria-label="Learning explanations"
          checked={educationMode}
          onChange={(e) => setEducationMode(e.target.checked)}
        />
      </div>
      <div className="setting-row">
        <div>
          <strong>Dim unrelated parts</strong>
          <span>Keep the selected component in focus</span>
        </div>
        <input
          type="checkbox"
          aria-label="Dim unrelated parts"
          checked={view.dimUnselected}
          onChange={(e) => patch({ dimUnselected: e.target.checked })}
        />
      </div>
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
          <option value="showroom">Showroom</option>
          <option value="premium">Dark studio</option>
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
      <button className="primary-button" onClick={onClose}>
        Back to exploring
        <ChevronRight size={15} />
      </button>
    </Dialog>
  );
}
