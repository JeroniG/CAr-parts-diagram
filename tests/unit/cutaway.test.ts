import { describe, it, expect } from 'vitest';
import { Box3, Vector3 } from 'three';
import { cutawayPlane } from '../../src/scene/controls/cutaway';
const bounds = new Box3(new Vector3(-2, 4, -5), new Vector3(2, 6, -1));
describe('bounds-aware directional cutaways', () => {
  it.each([
    ['front', [0, 5, -1]],
    ['rear', [0, 5, -5]],
    ['left', [2, 5, -3]],
    ['right', [-2, 5, -3]],
    ['upper', [0, 6, -3]],
  ] as const)('removes the %s half while retaining the opposite side', (side, removed) => {
    const plane = cutawayPlane(side, 0, bounds)!;
    expect(plane.distanceToPoint(new Vector3(...removed))).toBeLessThan(0);
    const opposite = bounds
      .getCenter(new Vector3())
      .multiplyScalar(2)
      .sub(new Vector3(...removed));
    expect(plane.distanceToPoint(opposite)).toBeGreaterThan(0);
  });
  it('uses shifted model bounds and clamps the custom position', () => {
    const plane = cutawayPlane('upper', 3, bounds)!;
    expect(plane.distanceToPoint(new Vector3(0, 4, -3))).toBe(0);
    expect(cutawayPlane('off', 0, bounds)).toBeNull();
    expect(cutawayPlane('front', 0, new Box3())).toBeNull();
  });
});
