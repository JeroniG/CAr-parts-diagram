import { Vector3 } from 'three';
export interface LayoutPart {
  id: string;
  center: Vector3;
  size: Vector3;
  system: string;
}
export function inventoryLayout(parts: LayoutPart[]): Map<string, Vector3> {
  const result = new Map<string, Vector3>();
  const ordered = [...parts].sort(
    (a, b) => a.system.localeCompare(b.system) || a.id.localeCompare(b.id),
  );
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  const cellX = Math.max(1, ...ordered.map((p) => p.size.x)) + 0.35;
  const cellZ = Math.max(1, ...ordered.map((p) => p.size.z)) + 0.35;
  const rows = Math.ceil(ordered.length / columns);
  ordered.forEach((p, i) =>
    result.set(
      p.id,
      new Vector3(
        ((i % columns) - (columns - 1) / 2) * cellX,
        p.size.y / 2 + 0.1,
        (Math.floor(i / columns) - (rows - 1) / 2) * cellZ,
      ),
    ),
  );
  return result;
}
export function explodedPosition(base: Vector3, target: Vector3, amount: number): Vector3 {
  return base.clone().lerp(target, Math.max(0, Math.min(1, amount)));
}
/** Resolve overlaps in the target exploded layout using conservative axis-aligned boxes. */
export function radialLayout(parts: LayoutPart[]): Map<string, Vector3> {
  const out = new Map(
    parts.map((p) => [
      p.id,
      new Vector3(p.center.x * 2.5, p.center.y * 1.6 + 0.12, p.center.z * 2.25),
    ]),
  );
  for (let pass = 0; pass < 32; pass++)
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i],
          b = parts[j],
          pa = out.get(a.id)!,
          pb = out.get(b.id)!;
        const overlap = ['x', 'y', 'z'].map((axis) => {
          const k = axis as 'x' | 'y' | 'z';
          return (a.size[k] + b.size[k]) / 2 + 0.08 - Math.abs(pa[k] - pb[k]);
        });
        if (overlap.every((d) => d > 0)) {
          const k = (['x', 'y', 'z'] as const)[overlap.indexOf(Math.min(...overlap))];
          const direction = pa[k] >= pb[k] ? 1 : -1;
          pa[k] += direction * Math.min(...overlap) * 0.51;
          pb[k] -= direction * Math.min(...overlap) * 0.51;
        }
      }
  return out;
}
