import type { AssetManifest } from '../types/assembly';

/** Reject mismatched or ambiguous mappings before they become selectable geometry. */
export function validateAssetManifest(
  value: unknown,
  vehicleId: string,
  componentIds: Set<string>,
  assemblyId?: string,
): asserts value is AssetManifest {
  if (!value || typeof value !== 'object') throw Error('Invalid asset manifest.');
  const m = value as AssetManifest;
  if (m.units !== 'metres') throw Error('Asset units must be metres.');
  if (!m.asset || m.asset.vehicleConfigId !== vehicleId)
    throw Error('Asset vehicle configuration does not match.');
  if (
    !m.asset.redistributionAllowed ||
    !m.asset.license?.trim() ||
    !m.asset.author?.trim() ||
    !m.asset.sourceUrl?.trim() ||
    !m.asset.licenseEvidence?.trim()
  )
    throw Error('Asset license, author, source and browser redistribution evidence are required.');
  if (!/^[a-f0-9]{64}$/.test(m.asset.contentHash)) throw Error('Asset SHA-256 is required.');
  if (!['A', 'B', 'C'].includes(m.asset.geometryAccuracy))
    throw Error('Invalid geometry accuracy tier.');
  if (
    m.asset.geometryAccuracy !== 'C' &&
    !m.verificationEvidence?.some(
      (e) => e.sourceUrl && e.reviewer && /^\d{4}-\d{2}-\d{2}$/.test(e.reviewedAt),
    )
  )
    throw Error('Tier A/B assets require a recorded evidence review.');
  if (m.lod && !['low', 'high'].includes(m.lod)) throw Error('Invalid asset LOD.');
  if (assemblyId && m.assemblyId !== assemblyId) throw Error('Assembly mapping does not match.');
  if (!Array.isArray(m.bindings) || !m.bindings.length)
    throw Error('Asset has no semantic component bindings.');
  const seenIds = new Set<string>(),
    seenNodes = new Set<string>();
  for (const b of m.bindings) {
    if (!componentIds.has(b.componentId) || seenIds.has(b.componentId))
      throw Error(`Unknown or duplicate component: ${b.componentId}`);
    if (typeof b.meshNodePath !== 'string' || !b.meshNodePath || seenNodes.has(b.meshNodePath))
      throw Error('Duplicate or empty mesh path.');
    if (b.modelAssetId !== m.asset.id) throw Error('Binding references a different model asset.');
    if (b.accuracyStatus !== m.asset.geometryAccuracy)
      throw Error('Binding accuracy differs from asset evidence.');
    for (const vector of [
      b.transformData?.position,
      b.transformData?.rotation,
      b.transformData?.scale,
      b.boundingBox?.min,
      b.boundingBox?.max,
    ])
      if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite))
        throw Error('Invalid asset transforms or bounds.');
    if (b.transformData.scale.some((n) => n <= 0)) throw Error('Asset scale must be positive.');
    if (b.boundingBox.min.some((n, i) => n > b.boundingBox.max[i]))
      throw Error('Asset bounds are inverted.');
    if (b.explodedTransform)
      for (const v of [b.explodedTransform.translation, b.explodedTransform.rotation])
        if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite))
          throw Error('Invalid separation transform.');
    seenIds.add(b.componentId);
    seenNodes.add(b.meshNodePath);
  }
}
