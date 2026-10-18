import { it, expect } from 'vitest';
import { AnimationClip, Group, NumberKeyframeTrack } from 'three';
import { ImportedClipController } from '../../src/scene/animations/importedClip';
it('scrubs an imported glTF-style clip without accumulating movement', () => {
  const root = new Group(),
    rod = new Group();
  rod.name = 'release-rod';
  root.add(rod);
  const clip = new AnimationClip('release', 2, [
    new NumberKeyframeTrack('release-rod.position[x]', [0, 2], [0, 0.02]),
  ]);
  const controller = new ImportedClipController(root, clip);
  controller.seek(0.5);
  expect(rod.position.x).toBeCloseTo(0.01);
  controller.seek(0);
  expect(rod.position.x).toBe(0);
  controller.seek(1);
  expect(rod.position.x).toBeCloseTo(0.02);
  controller.dispose();
});
