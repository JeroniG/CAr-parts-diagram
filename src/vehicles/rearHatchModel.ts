/** Original reference-guided Tier C sample. Dimensions and engineering details are unverified. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hatchParts } from './rearHatch';
import { strutEndpoints } from '../scene/animations/hatch';

export function buildRearHatch(detail: 'high' | 'low' = 'high') {
  const high = detail === 'high',
    segments = high ? 48 : 16;
  const root = new T.Group();
  root.name = 'rear-hatch-sample';
  const mats = {
    paint: new T.MeshPhysicalMaterial({
      color: '#68785c',
      metalness: 0.3,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    blackPaint: new T.MeshPhysicalMaterial({
      color: '#161b1d',
      metalness: 0.18,
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
    }),
    polymer: new T.MeshStandardMaterial({ color: '#26292b', roughness: 0.68, metalness: 0 }),
    rubber: new T.MeshStandardMaterial({ color: '#141718', roughness: 0.88, metalness: 0 }),
    steel: new T.MeshStandardMaterial({ color: '#a8adb0', roughness: 0.28, metalness: 0.95 }),
    coating: new T.MeshStandardMaterial({ color: '#363b3d', roughness: 0.46, metalness: 0.62 }),
    glass: new T.MeshPhysicalMaterial({
      color: '#bed4d0',
      roughness: 0.055,
      metalness: 0,
      transmission: 0.92,
      thickness: 0.005,
      ior: 1.52,
      attenuationColor: '#779c91',
      attenuationDistance: 0.3,
      transparent: true,
      opacity: 1,
      side: T.DoubleSide,
    }),
    frit: new T.MeshStandardMaterial({
      color: '#101617',
      roughness: 0.25,
      metalness: 0.1,
      side: T.DoubleSide,
    }),
    copper: new T.MeshStandardMaterial({ color: '#997252', roughness: 0.55, metalness: 0.65 }),
    lens: new T.MeshPhysicalMaterial({
      color: '#a30d16',
      roughness: 0.2,
      clearcoat: 1,
      metalness: 0,
      emissive: '#320000',
      emissiveIntensity: 0.1,
    }),
  };
  for (const [name, material] of Object.entries(mats)) material.name = `hatch-${name}`;
  type Mat = keyof typeof mats;
  const groups = new Map(
    hatchParts.map((p) => {
      const group = new T.Group();
      group.name = p.id;
      group.userData.componentId = p.id;
      root.add(group);
      return [p.id, group];
    }),
  );
  const mesh = (id: string, geo: T.BufferGeometry, mat: Mat, position = new T.Vector3()) => {
    const m = new T.Mesh(geo, mats[mat]);
    m.position.copy(position);
    groups.get(id)!.add(m);
    return m;
  };
  const box = (
    id: string,
    size: [number, number, number],
    pos: [number, number, number],
    mat: Mat,
    radius = 0.008,
  ) =>
    mesh(
      id,
      new RoundedBoxGeometry(...size, high ? 4 : 2, Math.min(radius, ...size.map((n) => n / 3))),
      mat,
      new T.Vector3(...pos),
    );
  const tube = (id: string, points: T.Vector3[], radius: number, mat: Mat, closed = false) => {
    const curve = new T.CatmullRomCurve3(points, closed, 'catmullrom', 0.25);
    return mesh(id, new T.TubeGeometry(curve, high ? 96 : 32, radius, high ? 12 : 6, closed), mat);
  };
  const cylinder = (
    id: string,
    radius: number,
    length: number,
    pos: T.Vector3,
    mat: Mat,
    alongX = false,
  ) => {
    const m = mesh(id, new T.CylinderGeometry(radius, radius, length, segments), mat, pos);
    if (alongX) m.rotation.z = Math.PI / 2;
    return m;
  };
  function rigify(m: T.Mesh, name: string) {
    const parent = m.parent!,
      rig = new T.Group();
    rig.name = `${parent.name}--${name}`;
    rig.position.copy(m.position);
    rig.quaternion.copy(m.quaternion);
    rig.scale.copy(m.scale);
    parent.add(rig);
    rig.add(m);
    m.position.set(0, 0, 0);
    m.quaternion.identity();
    m.scale.set(1, 1, 1);
    return rig;
  }
  function windowOutline(scaleX = 1, scaleY = 1, offsetY = 0) {
    const shape = new T.Shape();
    shape.moveTo(-0.57, 0.018);
    shape.bezierCurveTo(-0.63, 0.02, -0.653, 0.045, -0.64, 0.105);
    shape.lineTo(-0.565, 0.425);
    shape.bezierCurveTo(-0.552, 0.478, -0.523, 0.493, -0.475, 0.495);
    shape.quadraticCurveTo(0, 0.515, 0.475, 0.495);
    shape.bezierCurveTo(0.523, 0.493, 0.552, 0.478, 0.565, 0.425);
    shape.lineTo(0.64, 0.105);
    shape.bezierCurveTo(0.653, 0.045, 0.63, 0.02, 0.57, 0.018);
    shape.quadraticCurveTo(0, -0.014, -0.57, 0.018);
    const scaled = new T.Shape(
      shape.getPoints(segments).map((p) => new T.Vector2(p.x * scaleX, p.y * scaleY + offsetY)),
    );
    return scaled;
  }
  function curvedWindow(shape: T.Shape, depth: number, offset: number) {
    const geo = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: segments,
    });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      p.setXYZ(i, x, 0.995 + y, -1.14 + y * 0.68 - 0.035 * (1 - (x / 0.65) ** 2) + z + offset);
    }
    geo.computeVertexNormals();
    return geo;
  }
  mesh('rear-glass', curvedWindow(windowOutline(), 0.005, -0.007), 'glass');
  const border = windowOutline();
  border.holes.push(new T.Path(windowOutline(0.91, 0.74, 0.047).getPoints(segments).reverse()));
  mesh('rear-glass', curvedWindow(border, 0.001, -0.0085), 'frit');
  for (let i = 0; i < 12; i++) {
    const y = 0.057 + i * 0.028;
    const width = 0.565 - y * 0.11;
    const pts = Array.from({ length: 9 }, (_, j) => {
      const x = ((j / 8) * 2 - 1) * width;
      return new T.Vector3(x, 0.995 + y, -1.14 + y * 0.68 - 0.035 * (1 - (x / 0.65) ** 2) + 0.0005);
    });
    tube('rear-glass', pts, 0.00065, 'copper');
  }
  const carrier = windowOutline(1.01, 1.01);
  carrier.holes.push(new T.Path(windowOutline(0.94, 0.83, 0.035).getPoints(segments).reverse()));
  mesh('hatch-upper-frame', curvedWindow(carrier, 0.022, 0.008), 'blackPaint');
  const trim = windowOutline(0.98, 0.99);
  trim.holes.push(new T.Path(windowOutline(0.91, 0.83, 0.032).getPoints(segments).reverse()));
  mesh('hatch-upper-trim', curvedWindow(trim, 0.008, 0.034), 'polymer');
  // Ribs belong to the demonstration trim; no service fastener locations are inferred.
  for (let i = -8; i <= 8; i++)
    box('hatch-upper-trim', [0.006, 0.045, 0.02], [i * 0.052, 1.462, -0.791], 'polymer', 0.001);
  // Smooth extruded aerofoil profile, tapering toward the lateral ends.
  const aero = new T.Shape();
  aero.moveTo(-0.075, 0);
  aero.bezierCurveTo(-0.09, 0.035, -0.045, 0.057, 0.045, 0.05);
  aero.bezierCurveTo(0.085, 0.04, 0.088, 0.012, 0.06, 0);
  aero.closePath();
  const wing = new T.ExtrudeGeometry(aero, {
    depth: 1.18,
    steps: high ? 30 : 12,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: high ? 4 : 2,
    curveSegments: segments,
  });
  const wp = wing.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getZ(i) - 0.59,
      z = wp.getX(i),
      y = wp.getY(i);
    wp.setXYZ(i, x, 1.47 + y * (1 - 0.24 * (x / 0.6) ** 2), -0.855 + z + 0.025 * (x / 0.6) ** 2);
  }
  wing.computeVertexNormals();
  mesh('hatch-spoiler', wing, 'blackPaint');
  box('hatch-brake-light', [0.29, 0.036, 0.022], [0, 1.493, -0.938], 'coating', 0.009);
  box('hatch-brake-light', [0.275, 0.027, 0.014], [0, 1.493, -0.951], 'lens', 0.007);
  for (let i = -10; i <= 10; i++)
    box('hatch-brake-light', [0.002, 0.023, 0.002], [i * 0.012, 1.493, -0.959], 'lens', 0.0005);
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    const id = `hatch-hinge-${side}`;
    box(id, [0.085, 0.018, 0.075], [sign * 0.42, 1.478, -0.755], 'coating');
    box(id, [0.06, 0.038, 0.018], [sign * 0.42, 1.462, -0.795], 'coating');
    cylinder(id, 0.012, 0.085, new T.Vector3(sign * 0.42, 1.47, -0.79), 'steel', true);
    const lower = `hatch-lower-hinge-${side}`;
    box(lower, [0.075, 0.07, 0.014], [sign * 0.44, 0.665, -1.25], 'coating');
    cylinder(lower, 0.013, 0.085, new T.Vector3(sign * 0.44, 0.655, -1.275), 'steel', true);
    const lock = `hatch-lock-${side}`;
    box(lock, [0.045, 0.08, 0.045], [sign * 0.565, 0.995, -1.244], 'polymer');
    box(lock, [0.01, 0.052, 0.053], [sign * 0.59, 0.997, -1.246], 'steel', 0.003);
    const strutId = `hatch-strut-${side}`;
    const ends = strutEndpoints(sign, 0),
      dir = ends.hatch.clone().sub(ends.body).normalize();
    const barrelLength = 0.26;
    const barrel = cylinder(
      strutId,
      0.014,
      barrelLength,
      ends.body.clone().addScaledVector(dir, barrelLength / 2),
      'blackPaint',
    );
    barrel.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    const rod = cylinder(strutId, 0.0055, 1, new T.Vector3(), 'steel');
    rod.scale.y = ends.length - barrelLength;
    rod.position.copy(ends.body).addScaledVector(dir, barrelLength + rod.scale.y / 2);
    rod.quaternion.copy(barrel.quaternion);
    rigify(barrel, 'strut-barrel');
    rigify(rod, 'strut-rod');
    for (const [name, point] of [
      ['strut-base-eye', ends.body],
      ['strut-tip-eye', ends.hatch],
    ] as const) {
      const eye = mesh(
        strutId,
        new T.TorusGeometry(0.011, 0.005, high ? 12 : 6, segments),
        'coating',
        point,
      );
      eye.rotation.y = Math.PI / 2;
      rigify(eye, name);
    }
  }
  function lowerOutline() {
    const s = new T.Shape();
    s.moveTo(-0.51, -0.17);
    s.quadraticCurveTo(-0.59, -0.17, -0.6, -0.09);
    s.lineTo(-0.615, 0.1);
    s.quadraticCurveTo(-0.62, 0.18, -0.54, 0.19);
    s.quadraticCurveTo(0, 0.215, 0.54, 0.19);
    s.quadraticCurveTo(0.62, 0.18, 0.615, 0.1);
    s.lineTo(0.6, -0.09);
    s.quadraticCurveTo(0.59, -0.17, 0.51, -0.17);
    s.closePath();
    return s;
  }
  function lowerPanel(id: string, z: number, depth: number, mat: Mat) {
    const g = new T.ExtrudeGeometry(lowerOutline(), {
      depth,
      bevelEnabled: true,
      bevelSize: 0.006,
      bevelThickness: 0.004,
      bevelSegments: high ? 5 : 2,
      curveSegments: segments,
    });
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      p.setXYZ(i, x, y + 0.835, z + p.getZ(i) - 0.026 * (1 - (x / 0.62) ** 2));
    }
    g.computeVertexNormals();
    mesh(id, g, mat);
  }
  lowerPanel('tailgate', -1.27, 0.033, 'coating');
  lowerPanel('hatch-lower-panel', -1.305, 0.008, 'paint');
  lowerPanel('hatch-lower-trim', -1.215, 0.01, 'polymer');
  box('hatch-lower-panel', [0.43, 0.115, 0.012], [0, 0.824, -1.338], 'blackPaint', 0.012);
  box('hatch-lower-panel', [0.38, 0.085, 0.004], [0, 0.824, -1.346], 'coating', 0.006);
  box('hatch-lower-trim', [0.33, 0.033, 0.018], [0, 0.965, -1.18], 'rubber', 0.01);
  for (let i = -8; i <= 8; i++)
    box('hatch-lower-trim', [0.004, 0.2, 0.004], [i * 0.052, 0.82, -1.185], 'polymer', 0.001);
  box('hatch-upper-lock', [0.075, 0.065, 0.048], [0, 1.014, -1.11], 'coating', 0.012);
  box('hatch-upper-lock', [0.024, 0.028, 0.02], [0, 0.985, -1.13], 'steel', 0.004);
  box('hatch-handle-switch', [0.115, 0.03, 0.028], [0, 1.015, -1.175], 'polymer', 0.009);
  box('hatch-handle-switch', [0.083, 0.018, 0.008], [0, 1.011, -1.193], 'rubber', 0.005);
  const motor = cylinder(
    'hatch-wiper-motor',
    0.029,
    0.095,
    new T.Vector3(0.075, 1.44, -0.765),
    'steel',
    true,
  );
  motor.name = 'wiper-motor-casing';
  box('hatch-wiper-motor', [0.07, 0.06, 0.04], [0.005, 1.438, -0.768], 'polymer', 0.014);
  const spindle = cylinder(
    'hatch-wiper-arm',
    0.016,
    0.035,
    new T.Vector3(0, 1.436, -0.92),
    'blackPaint',
  );
  spindle.rotation.x = Math.PI / 2;
  tube(
    'hatch-wiper-arm',
    [
      new T.Vector3(0, 1.432, -0.943),
      new T.Vector3(-0.09, 1.414, -0.953),
      new T.Vector3(-0.26, 1.401, -0.964),
    ],
    0.006,
    'blackPaint',
  );
  tube(
    'hatch-wiper-arm',
    [
      new T.Vector3(-0.06, 1.393, -0.969),
      new T.Vector3(-0.25, 1.382, -0.977),
      new T.Vector3(-0.46, 1.39, -0.964),
    ],
    0.008,
    'rubber',
  );
  tube(
    'hatch-seal',
    [
      new T.Vector3(-0.56, 0.66, -1.225),
      new T.Vector3(-0.62, 0.91, -1.195),
      new T.Vector3(-0.6, 1.18, -0.98),
      new T.Vector3(-0.52, 1.48, -0.765),
      new T.Vector3(0, 1.505, -0.75),
      new T.Vector3(0.52, 1.48, -0.765),
      new T.Vector3(0.6, 1.18, -0.98),
      new T.Vector3(0.62, 0.91, -1.195),
      new T.Vector3(0.56, 0.66, -1.225),
      new T.Vector3(0, 0.638, -1.235),
    ],
    0.012,
    'rubber',
    true,
  );
  // Batch static geometry within a semantic component/material. Never merge different parts.
  for (const group of groups.values()) {
    if (group.name.startsWith('hatch-strut-')) continue;
    const byMaterial = new Map<T.Material, T.BufferGeometry[]>();
    for (const child of [...group.children]) {
      if (!(child instanceof T.Mesh)) continue;
      child.updateMatrix();
      const transformed = child.geometry.clone().applyMatrix4(child.matrix);
      const geometry = transformed.index ? transformed.toNonIndexed() : transformed;
      if (geometry !== transformed) transformed.dispose();
      const list = byMaterial.get(child.material as T.Material) ?? [];
      list.push(geometry);
      byMaterial.set(child.material as T.Material, list);
      child.geometry.dispose();
      group.remove(child);
    }
    for (const [material, geometries] of byMaterial) {
      const merged = mergeGeometries(geometries);
      if (!merged) throw Error(`Could not batch ${group.name}`);
      group.add(new T.Mesh(merged, material));
      geometries.forEach((g) => g.dispose());
    }
  }
  return root;
}
