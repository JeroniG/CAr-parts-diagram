import { ChevronDown, Image, Layers3, Box, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import type { ViewMode } from '../../types/vehiclePackage';
export const viewModes: { id: ViewMode; number: number; name: string; reason: string }[] = [
  {
    id: 'studio',
    number: 2,
    name: 'Studio 3D',
    reason: 'A reviewed full-vehicle model is required for the studio view.',
  },
  {
    id: 'photos',
    number: 3,
    name: 'Photo references',
    reason: 'No authorized photograph is connected to this vehicle.',
  },
  {
    id: 'showroom',
    number: 4,
    name: 'Showroom',
    reason: 'A reviewed vehicle model and applicable appearance options are required.',
  },
  {
    id: 'premium',
    number: 5,
    name: 'Dark studio',
    reason: 'A reviewed vehicle model is required for a dark studio render.',
  },
  {
    id: 'xray',
    number: 6,
    name: 'Transparent / X-ray',
    reason: 'Mapped exterior and internal components are required to reveal real internals.',
  },
  {
    id: 'exploded',
    number: 7,
    name: 'Exploded parts',
    reason: 'Mapped geometry with authored separation transforms is required.',
  },
  {
    id: 'cutaway',
    number: 8,
    name: 'Cutaway',
    reason: 'A reviewed model is required. Visual clipping is not a validated solid cross-section.',
  },
  {
    id: 'component',
    number: 9,
    name: 'Component focus',
    reason: 'A mapped model of the selected component is required for isolated 3D inspection.',
  },
  {
    id: 'disassembly',
    number: 10,
    name: 'Visual disassembly',
    reason:
      'Mapped components and authored movement are required. Verified repair procedure not available.',
  },
  {
    id: 'interior',
    number: 11,
    name: 'Interior',
    reason: 'No reviewed cabin model or authorized interior photograph is connected.',
  },
  {
    id: 'powertrain',
    number: 12,
    name: 'Engine / powertrain',
    reason:
      'No reviewed powertrain model is connected. Use the catalog for sourced location information.',
  },
  {
    id: 'suspension',
    number: 13,
    name: 'Suspension & brakes',
    reason: 'Detailed wheel-corner assets are not connected to this configuration.',
  },
  {
    id: 'underbody',
    number: 14,
    name: 'Undercarriage',
    reason: 'A model with documented underside coverage is required.',
  },
  {
    id: 'hatch',
    number: 15,
    name: 'Rear hatch / doors',
    reason:
      'The assembly catalog is available. A reviewed hatch model and service diagram are still missing.',
  },
  {
    id: 'materials',
    number: 16,
    name: 'Material close-up',
    reason:
      'A reviewed model with material evidence is required. Photographic references remain available.',
  },
];
export function ViewModeSelector({
  mode,
  available,
  onChange,
}: {
  mode: ViewMode;
  available: Set<ViewMode>;
  onChange: (mode: ViewMode) => void;
}) {
  const [open, setOpen] = useState(false),
    current = viewModes.find((m) => m.id === mode)!;
  return (
    <div className="mode-picker">
      <button
        aria-expanded={open}
        aria-label="Choose exploration mode"
        onClick={() => setOpen(!open)}
      >
        {mode === 'photos' ? (
          <Image size={16} />
        ) : mode === 'hatch' ? (
          <Layers3 size={16} />
        ) : (
          <Box size={16} />
        )}
        <span>{current.name}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="mode-menu" role="menu" aria-label="Exploration modes">
          {viewModes.map((m) => (
            <button
              key={m.id}
              role="menuitem"
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
            >
              <span className="mode-number">{m.number}</span>
              <span>
                {m.name}
                <small>
                  {available.has(m.id)
                    ? 'Available'
                    : m.id === 'hatch'
                      ? 'Catalog & references'
                      : 'Requires additional assets'}
                </small>
              </span>
              {!available.has(m.id) && <LockKeyhole size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
