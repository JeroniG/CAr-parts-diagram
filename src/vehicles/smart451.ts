/** Original, Tier C educational geometry; metres; +Y up, +Z front, +X vehicle left. */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const P = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
export function buildSmart451(): T.Group {
  const root = new T.Group();
  root.name = 'smart-451';
  const materials = {
    paint: new T.MeshPhysicalMaterial({
      color: '#84906b',
      metalness: 0.5,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
    }),
    frame: new T.MeshPhysicalMaterial({
      color: '#b8bec0',
      metalness: 0.86,
      roughness: 0.26,
      clearcoat: 0.45,
    }),
    glass: new T.MeshPhysicalMaterial({
      color: '#1c343b',
      metalness: 0.35,
      roughness: 0.12,
      transparent: true,
      opacity: 0.83,
      clearcoat: 1,
      side: T.DoubleSide,
    }),
    rubber: new T.MeshStandardMaterial({ color: '#222626', roughness: 0.9 }),
    black: new T.MeshStandardMaterial({ color: '#292f2f', metalness: 0.15, roughness: 0.45 }),
    alloy: new T.MeshStandardMaterial({ color: '#b4bcbf', metalness: 0.85, roughness: 0.3 }),
    iron: new T.MeshStandardMaterial({ color: '#727c7b', metalness: 0.8, roughness: 0.6 }),
    fabric: new T.MeshStandardMaterial({ color: '#444a47', roughness: 1 }),
    lens: new T.MeshPhysicalMaterial({
      color: '#ecf1ee',
      metalness: 0.6,
      roughness: 0.14,
      clearcoat: 1,
    }),
    red: new T.MeshPhysicalMaterial({
      color: '#851c20',
      metalness: 0.3,
      roughness: 0.22,
      clearcoat: 1,
    }),
    amber: new T.MeshStandardMaterial({ color: '#e4a44b', metalness: 0.2, roughness: 0.3 }),
    copper: new T.MeshStandardMaterial({ color: '#c39050', metalness: 0.7, roughness: 0.4 }),
  };
  type Mat = keyof typeof materials;
  function group(id: string) {
    const g = new T.Group();
    g.name = id;
    g.userData.componentId = id;
    root.add(g);
    return g;
  }
  function mesh(g: T.Group, geometry: T.BufferGeometry, mat: Mat, p: T.Vector3 = P(0, 0, 0)) {
    const m = new T.Mesh(geometry, materials[mat]);
    m.position.copy(p);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  function box(
    g: T.Group,
    sz: [number, number, number],
    pos: [number, number, number],
    mat: Mat,
    r = 0.025,
  ) {
    return mesh(
      g,
      new RoundedBoxGeometry(...sz, 2, Math.min(r, ...sz.map((x) => x / 3))),
      mat,
      P(...pos),
    );
  }
  function cyl(
    g: T.Group,
    r: number,
    len: number,
    pos: [number, number, number],
    mat: Mat,
    axis: 'x' | 'y' | 'z' = 'y',
    r2 = r,
  ) {
    const m = mesh(g, new T.CylinderGeometry(r, r2, len, 32), mat, P(...pos));
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m;
  }
  function tube(g: T.Group, points: T.Vector3[], r: number, mat: Mat) {
    return mesh(
      g,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points),
        Math.max(16, Math.min(128, points.length * 10)),
        r,
        8,
        false,
      ),
      mat,
    );
  }
  function poly(
    g: T.Group,
    points: [number, number][],
    x: number,
    depth: number,
    mat: Mat,
    holes: [number, number][][] = [],
  ) {
    const s = new T.Shape(points.map(([z, y]) => new T.Vector2(z, y)));
    for (const h of holes) s.holes.push(new T.Path(h.map(([z, y]) => new T.Vector2(z, y))));
    const geo = new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.008,
      curveSegments: 16,
    });
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const z = a.getX(i),
        y = a.getY(i),
        xx = a.getZ(i);
      a.setXYZ(i, x + xx, y, -z);
    }
    geo.computeVertexNormals();
    return mesh(g, geo, mat);
  }
  // A curved ruled surface across the vehicle; profile points are [Z,Y,half-width].
  function skin(g: T.Group, profile: [number, number, number][], mat: Mat, crown = 0.025) {
    const verts: number[] = [];
    const indices: number[] = [];
    const n = 24;
    profile.forEach(([z, y, w]) => {
      for (let j = 0; j <= n; j++) {
        const u = (j / n) * 2 - 1;
        verts.push(u * w, y + crown * (1 - u * u), z);
      }
    });
    for (let k = 0; k < profile.length - 1; k++)
      for (let j = 0; j < n; j++) {
        const a = k * (n + 1) + j,
          b = a + n + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const m = mesh(g, geo, mat);
    m.material = materials[mat].clone();
    m.material.side = T.DoubleSide;
    return m;
  }
  const frame = group('safety-cell');
  // Side profiles use -Z as their horizontal drawing coordinate.
  for (const side of [-1, 1]) {
    poly(
      frame,
      [
        [-0.79, 0.34],
        [-0.8, 0.94],
        [-0.3, 1.49],
        [-0.16, 1.535],
        [0.68, 1.535],
        [0.89, 1.44],
        [1.11, 0.97],
        [1.08, 0.35],
        [0.92, 0.32],
        [0.73, 0.92],
        [0.61, 1.39],
        [-0.21, 1.4],
        [-0.67, 0.92],
        [-0.64, 0.39],
      ],
      side * 0.715,
      0.036,
      'frame',
    );
    box(frame, [0.075, 0.1, 1.56], [side * 0.72, 0.32, 0.07], 'frame');
  }
  tube(frame, [P(-0.67, 1.47, 0.29), P(0, 1.54, 0.28), P(0.67, 1.47, 0.29)], 0.035, 'frame');
  tube(frame, [P(-0.63, 1.45, -0.76), P(0, 1.51, -0.8), P(0.63, 1.45, -0.76)], 0.04, 'frame');
  const hood = group('service-panel');
  skin(
    hood,
    [
      [0.73, 0.98, 0.675],
      [0.9, 0.96, 0.7],
      [1.13, 0.88, 0.7],
      [1.3, 0.79, 0.6],
    ],
    'paint',
    0.035,
  );
  const front = group('front-bumper');
  box(front, [1.43, 0.43, 0.22], [0, 0.55, 1.22], 'paint', 0.09);
  skin(
    front,
    [
      [1.275, 0.82, 0.64],
      [1.315, 0.74, 0.705],
      [1.335, 0.62, 0.713],
    ],
    'paint',
    0.018,
  );
  box(front, [0.99, 0.2, 0.055], [0, 0.54, 1.342], 'black', 0.06);
  for (let i = 0; i < 6; i++)
    box(front, [0.88, 0.009, 0.012], [0, 0.47 + i * 0.028, 1.374], 'iron', 0.003);
  box(front, [1.22, 0.08, 0.075], [0, 0.335, 1.27], 'black');
  const badge = mesh(
    front,
    new T.TorusGeometry(0.035, 0.006, 8, 24, Math.PI * 1.6),
    'alloy',
    P(0, 0.61, 1.381),
  );
  badge.rotation.z = 0.6;
  const rear = group('rear-bumper');
  box(rear, [1.45, 0.32, 0.2], [0, 0.49, -1.22], 'paint', 0.07);
  box(rear, [1.2, 0.11, 0.1], [0, 0.345, -1.27], 'black');
  const gate = group('tailgate');
  box(gate, [1.2, 0.34, 0.065], [0, 0.86, -1.286], 'paint', 0.025);
  box(gate, [0.42, 0.11, 0.018], [0, 0.86, -1.327], 'black', 0.01);
  const wind = group('windshield');
  skin(
    wind,
    [
      [0.765, 0.99, 0.655],
      [0.61, 1.19, 0.65],
      [0.43, 1.38, 0.625],
      [0.285, 1.47, 0.595],
    ],
    'glass',
    0.012,
  );
  tube(wind, [P(-0.45, 1.015, 0.76), P(-0.1, 1.04, 0.755), P(0.12, 1.05, 0.74)], 0.009, 'black');
  const roof = group('roof');
  skin(
    roof,
    [
      [0.25, 1.493, 0.59],
      [0, 1.521, 0.605],
      [-0.45, 1.521, 0.6],
      [-0.73, 1.48, 0.59],
    ],
    'glass',
    0.015,
  );
  const back = group('rear-glass');
  skin(
    back,
    [
      [-0.76, 1.46, 0.575],
      [-0.9, 1.3, 0.615],
      [-1.08, 1.06, 0.64],
    ],
    'glass',
    0.01,
  );
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    const door = group(`door-${side}`);
    poly(
      door,
      [
        [-0.68, 0.43],
        [-0.71, 0.91],
        [-0.56, 0.97],
        [0.52, 0.94],
        [0.67, 0.4],
      ],
      sign * 0.733,
      0.018,
      'paint',
    );
    box(door, [0.025, 0.028, 0.155], [sign * 0.773, 0.88, -0.37], 'black', 0.01);
    const win = group(`window-${side}`);
    poly(
      win,
      [
        [-0.66, 0.985],
        [-0.23, 1.408],
        [0.56, 1.408],
        [0.69, 0.985],
      ],
      sign * 0.72,
      0.005,
      'glass',
    );
    const mirror = group(`mirror-${side}`);
    tube(mirror, [P(sign * 0.72, 1.0, 0.6), P(sign * 0.82, 1.0, 0.61)], 0.024, 'black');
    const cap = mesh(
      mirror,
      new T.SphereGeometry(1, 24, 16),
      'black',
      P(sign * 0.837, 1.035, 0.59),
    );
    cap.scale.set(0.1, 0.066, 0.1);
    const mirrorGlass = mesh(
      mirror,
      new T.SphereGeometry(1, 16, 12),
      'alloy',
      P(sign * 0.84, 1.04, 0.52),
    );
    mirrorGlass.scale.set(0.077, 0.048, 0.009);
    const f = group(`fender-${side}`);
    const outline: [number, number][] = [
      [-1.28, 0.81],
      [-1.14, 0.9],
      [-0.77, 0.95],
      [-0.59, 0.84],
      [-0.58, 0.31],
      [-0.6, 0.31],
    ];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      outline.push([-0.9225 + 0.318 * Math.cos(a), 0.3 + 0.318 * Math.sin(a)]);
    }
    outline.push([-1.3, 0.32]);
    poly(f, outline, sign * 0.725, 0.025, 'paint');
    const q = group(`quarter-${side}`);
    const rearOutline: [number, number][] = [
      [0.56, 0.4],
      [0.53, 0.96],
      [0.82, 1.01],
      [1.25, 1.0],
      [1.3, 0.32],
    ];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      rearOutline.push([0.9445 + 0.32 * Math.cos(a), 0.3 + 0.32 * Math.sin(a)]);
    }
    poly(q, rearOutline, sign * 0.735, 0.025, 'paint');
    // Side intake on the left rear quarter; a grouped decorative opening, not a separate catalog part.
    if (side === 'left') {
      box(q, [0.025, 0.12, 0.22], [0.78, 0.83, -0.85], 'black');
      for (let i = 0; i < 4; i++)
        box(q, [0.03, 0.009, 0.19], [0.798, 0.79 + i * 0.025, -0.85], 'iron', 0.002);
    }
    const head = group(`headlight-${side}`);
    const shell = mesh(head, new T.SphereGeometry(1, 32, 20), 'black', P(sign * 0.525, 0.8, 1.295));
    shell.scale.set(0.17, 0.12, 0.063);
    shell.rotation.z = sign * 0.16;
    const lens = mesh(head, new T.SphereGeometry(1, 32, 20), 'lens', P(sign * 0.525, 0.805, 1.334));
    lens.scale.set(0.151, 0.1, 0.025);
    for (const offset of [-0.055, 0.057]) {
      cyl(head, 0.048, 0.018, [sign * 0.525 + offset, 0.817, 1.358], 'alloy', 'z');
      cyl(head, 0.032, 0.02, [sign * 0.525 + offset, 0.817, 1.37], 'lens', 'z');
    }
    box(head, [0.084, 0.022, 0.017], [sign * 0.58, 0.741, 1.353], 'amber', 0.007);
    const tail = group(`taillight-${side}`);
    box(tail, [0.125, 0.37, 0.055], [sign * 0.66, 0.94, -1.26], 'black', 0.03);
    for (let i = 0; i < 3; i++)
      cyl(tail, 0.05, 0.04, [sign * 0.66, 0.825 + i * 0.112, -1.3], i === 1 ? 'lens' : 'red', 'z');
  }
  // Wheels use continuous lathed tire cross sections and physically separate spokes and rims.
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const)
    for (const axle of ['front', 'rear'] as const) {
      const z = axle === 'front' ? 0.9225 : -0.9445,
        x = sign * (axle === 'front' ? 0.6415 : 0.6925),
        w = axle === 'front' ? 0.155 : 0.175,
        r = axle === 'front' ? 0.2835 : 0.28675;
      const g = group(`wheel-${axle}-${side}`);
      const profile = [
        P(0.188, -w / 2, 0),
        P(0.23, -w * 0.55, 0),
        P(r - 0.014, -w / 2, 0),
        P(r, -w * 0.32, 0),
        P(r, w * 0.32, 0),
        P(r - 0.014, w / 2, 0),
        P(0.23, w * 0.55, 0),
        P(0.188, w / 2, 0),
      ].map((v) => new T.Vector2(v.x, v.y));
      const tire = mesh(g, new T.LatheGeometry(profile, 64), 'rubber', P(x, r, z));
      tire.rotation.z = Math.PI / 2;
      const hub = cyl(g, 0.184, w * 0.85, [x, r, z], 'black', 'x');
      hub.name = 'wheel-barrel';
      for (const offset of [-w * 0.47, w * 0.47]) {
        const ring = mesh(
          g,
          new T.TorusGeometry(0.177, 0.012, 8, 48),
          'alloy',
          P(x + offset, r, z),
        );
        ring.rotation.y = Math.PI / 2;
      }
      cyl(g, 0.054, w + 0.015, [x, r, z], 'alloy', 'x');
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const spoke = box(
          g,
          [0.024, 0.145, 0.027],
          [x + sign * (w * 0.46), r + Math.cos(a) * 0.103, z + Math.sin(a) * 0.103],
          'alloy',
          0.008,
        );
        spoke.rotation.x = a;
      }
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        cyl(
          g,
          0.008,
          w + 0.025,
          [x, r + Math.cos(a) * 0.032, z + Math.sin(a) * 0.032],
          'iron',
          'x',
        );
      }
      // Tread grooves use dark circumferential rings with reusable geometry.
      for (const t of [-0.35, 0, 0.35]) {
        const groove = mesh(
          g,
          new T.TorusGeometry(r - 0.001, 0.0028, 4, 64),
          'black',
          P(x + t * w, r, z),
        );
        groove.rotation.y = Math.PI / 2;
      }
      const brake = group(`brake-${axle}-${side}`);
      cyl(
        brake,
        axle === 'front' ? 0.124 : 0.106,
        0.033,
        [x - sign * 0.066, r, z],
        axle === 'front' ? 'iron' : 'black',
        'x',
      );
      if (axle === 'front') {
        box(brake, [0.068, 0.12, 0.07], [x - sign * 0.065, r + 0.065, z - 0.082], 'alloy', 0.02);
        const ring = mesh(
          brake,
          new T.TorusGeometry(0.1, 0.004, 8, 40),
          'alloy',
          P(x - sign * 0.045, r, z),
        );
        ring.rotation.y = Math.PI / 2;
      }
      const spring = group(`spring-${axle}-${side}`),
        sx = x - sign * 0.14;
      cyl(spring, 0.025, 0.4, [sx, 0.54, z], 'iron');
      cyl(spring, 0.035, 0.2, [sx, 0.43, z], 'black');
      const coils: T.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 12;
        coils.push(P(sx + Math.cos(a) * 0.065, 0.43 + (i / 160) * 0.25, z + Math.sin(a) * 0.065));
      }
      tube(spring, coils, 0.01, 'black');
    }
  const block = group('engine-block');
  box(block, [0.47, 0.27, 0.38], [-0.12, 0.49, -0.9], 'iron', 0.035);
  for (let i = 0; i < 8; i++)
    box(block, [0.45, 0.012, 0.39], [-0.12, 0.39 + i * 0.028, -0.9], 'alloy', 0.003);
  const head = group('cylinder-head');
  box(head, [0.48, 0.11, 0.33], [-0.12, 0.68, -0.92], 'alloy');
  box(head, [0.46, 0.065, 0.3], [-0.12, 0.76, -0.92], 'black');
  for (let i = 0; i < 3; i++) cyl(head, 0.027, 0.04, [-0.28 + i * 0.16, 0.8, -0.92], 'black');
  const intake = group('intake');
  for (let i = 0; i < 3; i++)
    tube(
      intake,
      [
        P(-0.28 + i * 0.16, 0.7, -0.76),
        P(-0.28 + i * 0.16, 0.82, -0.65),
        P(-0.28 + i * 0.16, 0.73, -0.53),
      ],
      0.034,
      'black',
    );
  box(intake, [0.49, 0.09, 0.12], [-0.12, 0.72, -0.53], 'black');
  const exhaust = group('exhaust');
  const silencer = cyl(exhaust, 0.1, 0.62, [0, 0.26, -1.15], 'alloy', 'x');
  silencer.scale.z = 1.2;
  tube(
    exhaust,
    [P(-0.25, 0.26, -1.16), P(-0.37, 0.25, -1.2), P(-0.42, 0.24, -1.35)],
    0.027,
    'iron',
  );
  const trans = group('transmission-case');
  cyl(trans, 0.17, 0.24, [0.3, 0.49, -0.9], 'alloy', 'x', 0.14);
  box(trans, [0.28, 0.24, 0.31], [0.49, 0.47, -0.91], 'alloy', 0.045);
  for (let i = 0; i < 5; i++)
    box(trans, [0.013, 0.25, 0.32], [0.38 + i * 0.05, 0.47, -0.91], 'iron', 0.005);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    cyl(
      trans,
      0.012,
      0.025,
      [0.175, 0.49 + Math.cos(a) * 0.152, -0.9 + Math.sin(a) * 0.152],
      'iron',
      'x',
    );
  }
  // Clutch plates share the transverse input axis. Explosion and educational release preserve that axis.
  for (const [id, x, r, w, mat] of [
    ['flywheel', 0.135, 0.135, 0.025, 'iron'],
    ['clutch-disc', 0.166, 0.115, 0.014, 'copper'],
    ['pressure-plate', 0.197, 0.13, 0.025, 'alloy'],
    ['release-bearing', 0.236, 0.044, 0.03, 'iron'],
  ] as const) {
    const g = group(id);
    cyl(g, r, w, [x, 0.49, -0.9], mat, 'x');
    cyl(g, 0.025, w + 0.01, [x, 0.49, -0.9], 'iron', 'x');
    if (id === 'pressure-plate')
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const finger = box(
          g,
          [0.008, 0.075, 0.012],
          [x + 0.016, 0.49 + Math.cos(a) * 0.07, -0.9 + Math.sin(a) * 0.07],
          'iron',
          0.002,
        );
        finger.rotation.x = a;
      }
  }
  const actuator = group('clutch-actuator');
  box(actuator, [0.14, 0.08, 0.12], [0.45, 0.3, -0.64], 'alloy');
  cyl(actuator, 0.042, 0.15, [0.49, 0.31, -0.59], 'black', 'x');
  box(actuator, [0.19, 0.018, 0.16], [0.45, 0.345, -0.64], 'iron');
  const rod = group('actuator-rod');
  cyl(rod, 0.009, 0.16, [0.3, 0.31, -0.64], 'alloy', 'x');
  cyl(rod, 0.02, 0.045, [0.37, 0.31, -0.64], 'rubber', 'x');
  const fork = group('release-fork');
  tube(fork, [P(0.22, 0.31, -0.64), P(0.25, 0.4, -0.75), P(0.25, 0.49, -0.9)], 0.012, 'iron');
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    const shaft = group(`driveshaft-${side}`);
    cyl(shaft, 0.022, 0.37, [sign * 0.47, 0.31, -0.9445], 'iron', 'x');
    for (const xx of [sign * 0.31, sign * 0.63]) {
      for (let i = 0; i < 5; i++)
        cyl(shaft, 0.04 - i * 0.002, 0.012, [xx + i * 0.009, 0.31, -0.9445], 'rubber', 'x');
    }
  }
  const radiator = group('radiator');
  box(radiator, [0.68, 0.34, 0.065], [0, 0.54, 1.05], 'iron');
  for (let i = 0; i < 18; i++)
    box(radiator, [0.006, 0.3, 0.073], [-0.3 + i * 0.035, 0.54, 1.05], 'alloy', 0.001);
  box(radiator, [0.05, 0.36, 0.09], [-0.35, 0.54, 1.05], 'black');
  box(radiator, [0.05, 0.36, 0.09], [0.35, 0.54, 1.05], 'black');
  const pipes = group('coolant-pipes');
  for (const x of [-0.17, -0.11])
    tube(
      pipes,
      [P(x, 0.26, -0.72), P(x, 0.2, -0.4), P(x, 0.2, 0.8), P(x, 0.45, 1.03)],
      0.016,
      'black',
    );
  const battery = group('battery');
  box(battery, [0.23, 0.17, 0.18], [-0.32, 0.29, 0.4], 'black');
  box(battery, [0.24, 0.02, 0.19], [-0.32, 0.385, 0.4], 'iron');
  cyl(battery, 0.012, 0.025, [-0.39, 0.408, 0.4], 'copper');
  cyl(battery, 0.012, 0.025, [-0.25, 0.408, 0.4], 'copper');
  const floor = group('floor');
  box(floor, [1.3, 0.065, 1.5], [0, 0.24, 0.05], 'black');
  box(floor, [1.2, 0.06, 0.57], [0, 0.83, -0.93], 'fabric');
  const dashboard = group('dashboard');
  box(dashboard, [1.24, 0.18, 0.29], [0, 0.92, 0.56], 'black', 0.07);
  for (const x of [-0.48, 0.48]) cyl(dashboard, 0.052, 0.03, [x, 0.97, 0.395], 'iron', 'z');
  box(dashboard, [0.18, 0.19, 0.04], [0, 0.88, 0.39], 'iron');
  const steering = group('steering-wheel');
  const ring = mesh(
    steering,
    new T.TorusGeometry(0.135, 0.017, 12, 40),
    'black',
    P(0.36, 0.99, 0.29),
  );
  ring.rotation.x = -0.25;
  box(steering, [0.12, 0.07, 0.05], [0.36, 0.99, 0.29], 'black');
  tube(steering, [P(0.24, 0.99, 0.29), P(0.36, 0.99, 0.29), P(0.47, 0.99, 0.29)], 0.014, 'iron');
  for (const [side, sign] of [
    ['left', 1],
    ['right', -1],
  ] as const) {
    const seat = group(`seat-${side}`);
    const x = sign * 0.32,
      z = side === 'left' ? -0.18 : -0.23;
    box(seat, [0.43, 0.11, 0.43], [x, 0.53, z], 'fabric', 0.05);
    const backrest = box(seat, [0.41, 0.49, 0.11], [x, 0.83, z - 0.18], 'fabric', 0.05);
    backrest.rotation.x = -0.15;
    box(seat, [0.22, 0.16, 0.1], [x, 1.15, z - 0.22], 'black', 0.04);
    for (const dx of [-0.14, 0.14]) box(seat, [0.025, 0.15, 0.43], [x + dx, 0.4, z], 'iron');
  }
  // Names are deterministic and never derived from runtime UUIDs.
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      const id = o.parent?.userData.componentId;
      o.name = `${id ?? 'detail'}--${o.parent?.children.indexOf(o)}`;
    }
  });
  return root;
}
