import type { ReactNode } from 'react';
import { Dialog } from './Dialog';
export function ReferenceDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="reference-dialog">
      <Dialog title="Supporting photographs & diagrams" onClose={onClose}>
        <div className="reference-content">{children}</div>
      </Dialog>
    </div>
  );
}
