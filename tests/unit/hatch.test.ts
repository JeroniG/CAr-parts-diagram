import { describe, it, expect, vi } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { ExplodedViewController } from '../../src/scene/explosion/ExplodedViewController';
import {
  hatchPose,
  rotateAround,
  strutEndpoints,
  upperHatchPivot,
  lowerHatchPivot,
} from '../../src/scene/animations/hatch';
import { MeasurementController } from '../../src/scene/controls/MeasurementController';
import { validateAssetManifest } from '../../src/services/assetManifest';
import { rearHatch, hatchPartById } from '../../src/vehicles/rearHatch';
import high from '../../public/models/smart-451/rear-hatch/high.manifest.json';
import low from '../../public/models/smart-451/rear-hatch/low.manifest.json';
describe('Reversible separation', () => {
  it('interpolates in elapsed time and reverses without jumping or drifting', () => {
    const motion = new ExplodedViewController(1000);
    motion.set(1, 0);
    motion.sample(500);
    expect(motion.value).toBe(0.5);
    motion.set(0, 500);
    expect(motion.value).toBe(0.5);
    motion.sample(1000);
    expect(motion.value).toBe(0.25);
    motion.sample(1500);
    expect(motion.value).toBe(0);
    expect(motion.moving).toBe(false);
    motion.set(1, 2000);
    motion.sample(9000);
    expect(motion.value).toBe(1);
  });
  it('respects reduced motion and constrains inputs', () => {
    const motion = new ExplodedViewController();
    motion.set(5, 0, true);
    expect(motion.value).toBe(1);
    motion.set(-3, 1, true);
    expect(motion.value).toBe(0);
  });
});
describe('Illustrative hatch kinematics', () => {
  it('rotates rigid components around a fixed axis without changing their pivot distance', () => {
    const point = new Vector3(0.3, 1.12, -1.1);
    for (const motion of ['upper', 'lower'] as const)
      for (const t of [0, 0.25, 0.5, 1]) {
        const pose = hatchPose(motion, t),
          result = rotateAround(point, pose.pivot, pose.rotation);
        expect(result.distanceTo(pose.pivot)).toBeCloseTo(point.distanceTo(pose.pivot), 12);
        expect(rotateAround(pose.pivot, pose.pivot, pose.rotation)).toEqual(pose.pivot);
      }
    expect(rotateAround(point, upperHatchPivot, hatchPose('upper', 0).rotation)).toEqual(point);
    expect(hatchPose('fixed', 1).rotation).toEqual(new Quaternion());
    expect(upperHatchPivot.y).toBeGreaterThan(lowerHatchPivot.y);
  });
  it('keeps strut body mounts stationary and tips attached to the rotating hatch', () => {
    for (const side of [-1, 1])
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const closed = strutEndpoints(side, 0),
          open = strutEndpoints(side, t),
          pose = hatchPose('upper', t);
        expect(open.body).toEqual(closed.body);
        expect(
          open.hatch.distanceTo(rotateAround(closed.hatch, pose.pivot, pose.rotation)),
        ).toBeLessThan(1e-12);
        expect(open.length).toBeGreaterThan(0.26);
        expect(open.length).toBeCloseTo(open.body.distanceTo(open.hatch), 12);
      }
  });
});
describe('Reviewed asset boundaries', () => {
  const validate = (manifest: unknown) =>
    validateAssetManifest(
      manifest,
      rearHatch.vehicleConfigId,
      new Set(hatchPartById.keys()),
      rearHatch.id,
    );
  it('retains identical semantic identities and separation transforms across distinct LOD geometry', () => {
    validate(high);
    validate(low);
    expect(high.bindings.map((b) => b.componentId)).toEqual(low.bindings.map((b) => b.componentId));
    expect(high.bindings.map((b) => b.explodedTransform)).toEqual(
      low.bindings.map((b) => b.explodedTransform),
    );
    expect(high.triangles).toBeGreaterThan(low.triangles * 2);
    expect(high.asset.contentHash).not.toBe(low.asset.contentHash);
  });
  it('rejects unlicensed, mismatched, ambiguous or unjustifiably verified models', () => {
    for (const change of [
      { redistributionAllowed: false },
      { license: '' },
      { vehicleConfigId: '453' },
      { contentHash: 'invalid' },
      { geometryAccuracy: 'A' },
    ])
      expect(() => validate({ ...high, asset: { ...high.asset, ...change } })).toThrow();
    expect(() => validate({ ...high, bindings: [...high.bindings, high.bindings[0]] })).toThrow(
      /duplicate/i,
    );
    const broken = structuredClone(high);
    broken.bindings[0].explodedTransform.translation[0] = NaN;
    expect(() => validate(broken)).toThrow(/separation/);
  });
});
it('measures actual picked endpoints in millimetres and resets for the next pair', () => {
  const changed = vi.fn(),
    measure = new MeasurementController(changed);
  measure.add(new Vector3(0, 0, 0));
  measure.add(new Vector3(0.3, 0.4, 0));
  expect(changed).toHaveBeenLastCalledWith({ points: 2, millimetres: 500 });
  measure.add(new Vector3(1, 1, 1));
  expect(changed).toHaveBeenLastCalledWith({ points: 1, millimetres: null });
  measure.clear();
  expect(changed).toHaveBeenLastCalledWith({ points: 0, millimetres: null });
  measure.dispose();
});
