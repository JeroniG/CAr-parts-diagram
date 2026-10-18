import { describe, expect, it } from 'vitest';
import { Document } from '@gltf-transform/core';
import { mappedRoots, authoringBindings } from '../../scripts/lib/authoring';
import { validateAssetManifest } from '../../src/services/assetManifest';
import high from '../../public/models/smart-451/rear-hatch/high.manifest.json';

function fixture() {
  const document = new Document();
  const buffer = document.createBuffer();
  const position = document
    .createAccessor()
    .setBuffer(buffer)
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  const normal = document
    .createAccessor()
    .setBuffer(buffer)
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]));
  const mesh = document
    .createMesh()
    .addPrimitive(
      document.createPrimitive().setAttribute('POSITION', position).setAttribute('NORMAL', normal),
    );
  const left = document.createNode('left').setMesh(mesh).setTranslation([2, 3, 4]);
  const right = document.createNode('right').setMesh(mesh).setTranslation([-2, 3, 4]);
  const scene = document.createScene().addChild(left).addChild(right);
  return { document, left, right, mesh, scene, position };
}

describe('Free editor semantic boundaries', () => {
  it('retains independent asymmetric installed transforms and downgrades edited geometry', () => {
    const { document } = fixture();
    const template: unknown = structuredClone(high);
    validateAssetManifest(
      template,
      high.asset.vehicleConfigId,
      new Set(high.bindings.map((binding) => binding.componentId)),
      high.assemblyId,
    );
    template.bindings = ['left', 'right'].map((id) => ({
      ...template.bindings[0],
      componentId: id,
      accuracyStatus: 'A',
    }));
    const bindings = authoringBindings(
      document,
      { left: 'left', right: 'right' },
      template,
      'edited',
    );
    expect(bindings.map((b) => b.transformData.position)).toEqual([
      [2, 3, 4],
      [-2, 3, 4],
    ]);
    expect(bindings[0].boundingBox).toEqual({ min: [2, 3, 4], max: [3, 4, 4] });
    expect(bindings.every((b) => b.accuracyStatus === 'C' && b.modelAssetId === 'edited')).toBe(
      true,
    );
    expect(() =>
      authoringBindings(document, { unexpected: 'left', right: 'right' }, template, 'edited'),
    ).toThrow(/identities/);
  });
  it('rejects missing, shared, ambiguous, nested and unmapped physical geometry', () => {
    const { document, left, right, scene } = fixture();
    expect(() => mappedRoots(document, { a: 'missing' })).toThrow(/Missing/);
    expect(() => mappedRoots(document, { a: 'left', b: 'left' })).toThrow(/Multiply/);
    expect(() => mappedRoots(document, { a: 'left' })).toThrow(/Unmapped/);
    const duplicate = document.createNode('left');
    expect(() => mappedRoots(document, { a: 'left', b: 'right' })).toThrow(/ambiguous/);
    duplicate.dispose();
    scene.removeChild(right);
    left.addChild(right);
    expect(() => mappedRoots(document, { a: 'left', b: 'right' })).toThrow(/Nested/);
  });
  it('rejects non-finite or empty surface data before the editor runs', () => {
    const { document, position, mesh } = fixture();
    position.getArray()![0] = NaN;
    expect(() => mappedRoots(document, { left: 'left', right: 'right' })).toThrow(/Non-finite/);
    position.getArray()![0] = 0;
    mesh.listPrimitives()[0].setAttribute('NORMAL', null);
    expect(() => mappedRoots(document, { left: 'left', right: 'right' })).toThrow(/normals/);
  });
});
