import { Quaternion, Vector3 } from 'three';
import type { AssemblyPart } from '../../types/assembly';

export const upperHatchPivot = new Vector3(0, 1.47, -0.79);
export const lowerHatchPivot = new Vector3(0, 0.655, -1.275);
const axis = new Vector3(1, 0, 0);

/** Geometric teaching rig, not factory travel, force or adjustment data. */
export function hatchPose(motion: AssemblyPart['motion'], progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const angle = motion === 'upper' ? t * 1.3 : motion === 'lower' ? (-t * Math.PI) / 2 : 0;
  return {
    pivot: motion === 'lower' ? lowerHatchPivot : upperHatchPivot,
    rotation: new Quaternion().setFromAxisAngle(axis, angle),
  };
}

export function rotateAround(point: Vector3, pivot: Vector3, rotation: Quaternion) {
  return point.clone().sub(pivot).applyQuaternion(rotation).add(pivot);
}

export function strutEndpoints(side: number, progress: number) {
  const body = new Vector3(side * 0.555, 1.03, -1.27);
  const closedHatch = new Vector3(side * 0.54, 1.29, -0.95);
  const pose = hatchPose('upper', progress);
  const hatch = rotateAround(closedHatch, pose.pivot, pose.rotation);
  return { body, hatch, length: body.distanceTo(hatch) };
}
