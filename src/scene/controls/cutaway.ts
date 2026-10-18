import { Box3, Plane, Vector3 } from 'three';
import type { ViewState } from '../state';

/** Vehicle coordinates: +X left, +Y up, +Z front. Negative plane space is removed.
 * Bounds use installed component positions, so exploding or hiding a panel cannot move the cut. */
export function cutawayPlane(section: ViewState['section'], position: number, bounds: Box3) {
  if (section === 'off' || bounds.isEmpty()) return null;
  const normals: Record<Exclude<ViewState['section'], 'off'>, [number, number, number]> = {
    front: [0, 0, -1],
    rear: [0, 0, 1],
    left: [-1, 0, 0],
    right: [1, 0, 0],
    upper: [0, -1, 0],
    longitudinal: [-1, 0, 0],
    cross: [0, 0, -1],
    horizontal: [0, -1, 0],
  };
  const normal = new Vector3(...normals[section]);
  const center = bounds.getCenter(new Vector3());
  const half = bounds.getSize(new Vector3()).multiplyScalar(0.5);
  const extent =
    Math.abs(normal.x) * half.x + Math.abs(normal.y) * half.y + Math.abs(normal.z) * half.z;
  const point = center.addScaledVector(normal, Math.max(-1, Math.min(1, position)) * extent);
  return new Plane().setFromNormalAndCoplanarPoint(normal, point);
}
