import type { CompletionArea, CompletionPlan } from '../types/completeness';
import type { Component } from '../types/catalog';

/** Scope is deliberately open. These are discovery groups, not a bill of materials. */
export function smart451Completion(components: Component[], vehicleId: string): CompletionPlan {
  const parts = components.filter((c) => c.componentType === 'part');
  const area = (
    id: string,
    name: string,
    milestone: 1 | 2,
    match: (c: Component) => boolean,
    measurements: string[],
    assemblies: string[] = [],
  ): CompletionArea => ({
    id,
    name,
    milestone,
    componentIds: parts.filter(match).map((c) => c.id),
    requiredAssemblyIds: assemblies,
    requiredModes:
      milestone === 1
        ? ['studio', 'component']
        : ['studio', 'xray', 'cutaway', 'component', 'exploded'],
    expectedInstances: null,
    inventoryReview: null,
    geometryReview: null,
    missingMeasurements: measurements,
  });
  const chassis = ['safety-cell', 'floor', 'rear-axle', 'front-reinforcement', 'absorber'];
  const steering = ['steering-wheel', 'rack', 'tie-rods'];
  const fuelExhaust = [
    'exhaust',
    'catalyst',
    'oxygen-sensor',
    'fuel-pump-level-sensor',
    'fuel-filler-cap',
  ];
  const hardware = [
    'body-clips',
    'hatch-hardware',
    'engine-cover-fastener',
    'engine-mounts',
    'trans-mount',
    'seat-mounts',
  ];
  const areas = [
    area(
      'exterior',
      'Complete exterior',
      1,
      (c) => c.systemId === 'exterior' || /^wheel-(front|rear)-/.test(c.id),
      [
        '451 facelift surface profiles and seams',
        'Lamp, wheel and tire geometry for U.S. equipment',
        'Panel mounting datums and installed clearances',
      ],
    ),
    area(
      'engine',
      'Engine & subcomponents',
      2,
      (c) => c.systemId === 'engine' && !fuelExhaust.includes(c.id),
      [
        'Confirmed engine variant and internal component inventory',
        'Casting surfaces, internal dimensions and mounting datums',
      ],
      ['engine'],
    ),
    area(
      'transmission',
      'Transmission & clutch',
      2,
      (c) => c.systemId === 'transmission',
      [
        'Transmission variant, gear and clutch dimensions',
        'Shaft axes, actuator travel and mounting datums',
      ],
      ['transmission'],
    ),
    area(
      'front-suspension',
      'Front suspension',
      2,
      (c) =>
        c.systemId === 'suspension' &&
        !c.id.includes('rear') &&
        !/^wheel-(front|rear)-/.test(c.id) &&
        !steering.includes(c.id),
      ['Front suspension pivot coordinates, spring and damper dimensions'],
      ['suspension'],
    ),
    area(
      'rear-suspension',
      'Rear suspension',
      2,
      (c) =>
        c.systemId === 'suspension' &&
        (c.id.includes('rear') || ['bushings', 'hub-bearings'].includes(c.id)) &&
        !/^wheel-(front|rear)-/.test(c.id),
      ['Rear axle and suspension pivot coordinates', 'Damper, bushing and spring dimensions'],
      ['suspension'],
    ),
    area(
      'braking',
      'Braking systems',
      2,
      (c) => c.systemId === 'brakes',
      [
        'Front disc / rear drum internal geometry',
        'Hydraulic routing, brackets and attachment coordinates',
      ],
      ['brakes'],
    ),
    area('steering', 'Steering', 2, (c) => steering.includes(c.id), [
      'Rack, column and steering linkage geometry',
      'Joint axes, travel limits and mounting coordinates',
    ]),
    area(
      'cooling-hvac',
      'Cooling & HVAC',
      2,
      (c) => c.systemId === 'cooling',
      ['Heat exchanger and housing dimensions', 'Hose, pipe and duct routing and connections'],
      ['cooling'],
    ),
    area(
      'electrical',
      'Electrical & electronics',
      2,
      (c) => c.systemId === 'electrical',
      [
        'Equipment-specific modules and connector housings',
        'Harness paths, clips and connector pin identities',
      ],
      ['electrical'],
    ),
    area('chassis', 'Chassis & undercarriage', 2, (c) => chassis.includes(c.id), [
      'Structural cross-sections and underbody surfaces',
      'Mounting hole patterns and body coordinate datums',
    ]),
    area(
      'interior',
      'Complete interior',
      2,
      (c) => c.systemId === 'interior',
      [
        'Trim-specific cabin surfaces, seats and restraint hardware',
        'Mounting locations and clearance envelopes',
      ],
      ['interior'],
    ),
    area(
      'doors-hatch',
      'Doors, windows & rear hatch',
      2,
      (c) =>
        c.parentComponentId === 'rear-hatch' ||
        /^(door|window|mirror|hatch)-/.test(c.id) ||
        ['rear-glass', 'tailgate', 'windshield', 'weatherstrip'].includes(c.id),
      [
        'Glass curvature, hinge axes and installed latch positions',
        'Strut end fittings and mount coordinates',
        'Seal cross-sections and complete fastener inventory',
      ],
      ['rear-hatch'],
    ),
    area(
      'fuel-exhaust',
      'Fuel & exhaust',
      2,
      (c) => fuelExhaust.includes(c.id) || ['injectors', 'intake'].includes(c.id),
      [
        'Tank, filler and vapor-system inventory and routing',
        'Exhaust profiles, heat shields and attachment locations',
      ],
    ),
    area('wheels', 'Wheels & tires', 2, (c) => /^wheel-(front|rear)-/.test(c.id), [
      'Selected wheel design and tire sidewall/tread geometry',
      'Hub interface dimensions and wheel offsets',
    ]),
    area('hardware', 'Fasteners, brackets & mounts', 2, (c) => hardware.includes(c.id), [
      'Configuration-specific fastener and bracket inventory',
      'Thread sizes, lengths, mounting coordinates and quantities',
    ]),
  ];
  return {
    schemaVersion: 1,
    vehicleId,
    areas,
    discoveries: [
      {
        id: 'manufacturer-manual',
        areaIds: areas.map((a) => a.id),
        componentIds: [],
        checkedAt: '2026-10-18',
        sourceUrl:
          'https://www.mbusa.com/content/dam/mb-nafta/us/smart/manuals/2015/owners_manual.pdf',
        outcome: 'reference-only',
        reason:
          'Manufacturer identity and component-location reference; not CAD, dimensions, a complete inventory or VIN-specific fitment.',
        nextAction:
          'Obtain configuration-specific component inventory, measurements and licensed geometry.',
      },
      {
        id: 'febi-strut',
        areaIds: [],
        componentIds: ['hatch-strut-left', 'hatch-strut-right'],
        checkedAt: '2026-10-18',
        sourceUrl: 'https://partsfinder.bilsteingroup.com/en/article/febi/30351',
        outcome: 'reference-only',
        reason:
          'Manufacturer dimensional reference for febi 30351. No 3D download, installed mount coordinates or confirmed selected-vehicle fitment.',
        nextAction:
          'Verify application, obtain end-fitting geometry and measure both installed mounting points before modeling.',
      },
      {
        id: 'sketchfab-451',
        areaIds: ['exterior'],
        componentIds: [],
        checkedAt: '2026-10-18',
        sourceUrl:
          'https://sketchfab.com/3d-models/smart-fortwo-subd-d75bc4356ab440e7892b760546f402b2',
        outcome: 'access-required',
        reason:
          'Detailed exterior candidate requires sign-in; noncommercial license and sport trim are unsuitable for automatic publication.',
        nextAction:
          'Keep excluded under the free, no-sign-in sourcing constraint; seek a redistributable matching asset.',
      },
    ],
  };
}
