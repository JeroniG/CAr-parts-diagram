import { useRef } from 'react';
export function PanelResizeHandle({
  side,
  value,
  onChange,
}: {
  side: 'left' | 'right';
  value: number;
  onChange: (value: number) => void;
}) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const clamp = (n: number) =>
    Math.max(side === 'left' ? 210 : 260, Math.min(side === 'left' ? 340 : 420, n));
  return (
    <div
      className={`panel-resize panel-resize-${side}`}
      role="separator"
      aria-label={`Resize ${side === 'left' ? 'systems' : 'inspector'} panel`}
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={side === 'left' ? 210 : 260}
      aria-valuemax={side === 'left' ? 340 : 420}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          onChange(
            clamp(value + (e.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * 10),
          );
        }
      }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, width: value };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current)
          onChange(
            clamp(start.current.width + (e.clientX - start.current.x) * (side === 'left' ? 1 : -1)),
          );
      }}
      onPointerUp={() => {
        start.current = null;
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    />
  );
}
