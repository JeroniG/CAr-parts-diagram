import {
  Color,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Group } from 'three';

/** One material clone per component/material, preserving part-specific selection without per-mesh clones. */
export function preparePartMaterials(group: Group, originals: Set<Material>) {
  const clones = new Map<Material, MeshStandardMaterial>();
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const prepared = materials.map((original) => {
      originals.add(original);
      let m = clones.get(original);
      if (!m) {
        m =
          original instanceof MeshStandardMaterial ? original.clone() : new MeshStandardMaterial();
        if (original instanceof MeshBasicMaterial) {
          m.color.copy(original.color);
          m.map = original.map;
          m.alphaMap = original.alphaMap;
          m.opacity = original.opacity;
          m.transparent = original.transparent;
          m.side = original.side;
        }
        m.userData = {
          ...m.userData,
          baseColor: m.color.clone(),
          baseEmissive: m.emissive.clone(),
          baseEmissiveIntensity: m.emissiveIntensity,
          baseOpacity: m.opacity,
          baseTransparent: m.transparent,
          baseClearcoat: m instanceof MeshPhysicalMaterial ? m.clearcoat : 0,
          baseTransmission: m instanceof MeshPhysicalMaterial ? m.transmission : 0,
          baseRoughness: m.roughness,
        };
        clones.set(original, m);
      }
      return m;
    });
    object.material = Array.isArray(object.material) ? prepared : prepared[0];
  });
  return [...clones.values()];
}

export function setMaterialQuality(material: MeshStandardMaterial, high: boolean, low: boolean) {
  if (material instanceof MeshPhysicalMaterial) {
    material.clearcoat = low ? 0 : material.userData.baseClearcoat;
    material.transmission = high ? material.userData.baseTransmission : 0;
  }
  material.roughness = material.userData.baseRoughness;
  material.needsUpdate = true;
}

export function styleMaterial(
  material: MeshStandardMaterial,
  selected: boolean,
  dim: boolean,
  ghost: boolean,
  opacity = 0.16,
) {
  material.color.copy(material.userData.baseColor as Color).multiplyScalar(dim ? 0.46 : 1);
  material.emissive.copy(
    selected ? new Color(0x2787ff) : (material.userData.baseEmissive as Color),
  );
  material.emissiveIntensity = selected ? 0.6 : material.userData.baseEmissiveIntensity;
  const fallbackGlass =
    material.userData.baseTransmission > 0 &&
    (!(material instanceof MeshPhysicalMaterial) || !material.transmission);
  material.transparent = ghost || fallbackGlass || material.userData.baseTransparent;
  material.opacity = ghost ? opacity : fallbackGlass ? 0.48 : material.userData.baseOpacity;
  material.depthWrite = !ghost && !fallbackGlass;
}
