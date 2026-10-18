import { ArrowUpRight } from 'lucide-react';
import { Dialog } from './Dialog';
import { useCatalog } from '../features/vehicles/CatalogContext';
export function WorkspaceHelp({ onClose }: { onClose: () => void }) {
  const { coverage } = useCatalog();
  return (
    <Dialog title="An atlas for the curious." onClose={onClose}>
      <p className="modal-intro">
        Inspect parts in a persistent 3D workspace. Sample geometry is labeled; reviewed coverage
        and fitment are tracked separately.
      </p>
      <div className="help-grid">
        <div>
          <span>01</span>
          <strong>Explore in 3D</strong>
          <p>
            Drag to orbit, scroll to zoom and click a component to focus. X-ray reveals available
            internals; cutaways clip the exterior. Open References for supporting photographs and
            diagrams.
          </p>
        </div>
        <div>
          <span>02</span>
          <strong>Look closer</strong>
          <p>
            Search the parts tree. With supported 3D assets, orbit, focus, isolate, hide or adjust
            transparency.
          </p>
        </div>
        <div>
          <span>03</span>
          <strong>Understand assemblies</strong>
          <p>
            Supported models separate along authored transforms and reassemble exactly. Visual
            separation is not a verified repair sequence.
          </p>
        </div>
        <div>
          <span>04</span>
          <strong>Check the evidence</strong>
          <p>
            Geometry, OEM identity, fitment and licensing have separate evidence. Missing data is
            never inferred from appearance.
          </p>
        </div>
      </div>
      <div className="accuracy-card">
        <strong>{coverage.label}</strong>
        <p>
          {coverage.parts} catalog parts · {coverage.mappedParts} reviewed 3D parts ·{' '}
          {coverage.confirmedFitments} confirmed fitments. Development samples do not count as
          production coverage.
        </p>
      </div>
      <p className="small-muted">
        Keyboard: Tab through controls; arrow keys adjust sliders and panel widths; / focuses
        vehicle search; Escape closes dialogs. Catalog and photo references work without WebGL.
      </p>
      <button className="primary-button" onClick={onClose}>
        Let’s explore
        <ArrowUpRight size={16} />
      </button>
    </Dialog>
  );
}
