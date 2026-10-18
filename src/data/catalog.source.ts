import type {
  Component,
  ComponentRelationship,
  MechanismAnimation,
  OEMPart,
  PartFitment,
  SourceRecord,
  VehicleConfiguration,
  VehicleSystem,
} from '../types/catalog';
import { hatchParts, rearHatch } from '../vehicles/rearHatch';
export const vehicle: VehicleConfiguration = {
  id: 'smart-451-us-2015-passion-coupe-gas',
  manufacturer: 'smart',
  model: 'Fortwo',
  year: 2015,
  generation: 'Second generation',
  chassisCode: '451',
  market: 'United States',
  trim: 'Passion',
  bodyStyle: 'Coupé',
  engineCode: null,
  transmissionCode: null,
  engine: '1.0 L · 3-cylinder gasoline',
  transmission: '5-speed automated manual',
  drivetrain: 'Rear engine · rear-wheel drive',
  productionStart: null,
  productionEnd: null,
  dimensions: { length: 2695, widthWithMirrors: 1752, height: 1555, wheelbase: 1867 },
  sourceIds: ['owners-2015', 'intro-451'],
};
export const sources: SourceRecord[] = [
  {
    id: 'hatch-451-diagram',
    sourceUrl:
      'https://manuals.plus/m/5dfbeec2a8ea90b6b0f31005726b7b352bd997e56e40236270814d95e7507d90.pdf#page=89',
    publisher: 'smart USA (archived technical introduction)',
    documentTitle: '451 introduction — Rear-end door, printed page 88, P72.20-2599-00',
    publicationDate: null,
    retrievedAt: '2026-10-18',
    rights: 'Reference link only. Illustration is not redistributed or traced into geometry.',
    notes:
      '2007 platform illustration establishes component names and organization. Callouts are not OEM numbers. It does not verify 2015-specific geometry, equipment, material, fastener locations or removal procedures.',
  },
  {
    id: 'hatch-photo',
    sourceUrl: 'https://www.ebay.co.uk/itm/156615030681',
    publisher: 'ALL SMART CARS — used-part photographs',
    documentTitle:
      'Photographs of 451 coupé upper rear hatch / heated glass (listing states 2008–2014)',
    publicationDate: null,
    retrievedAt: '2026-10-18',
    rights:
      'Viewed as appearance references only. Photographs are not bundled or displayed in the app.',
    notes:
      'Shows upper spoiler, central brake light, top-mounted wiper, curved pane and black glazing border. Listing years do not establish 2015 fitment. No seller part numbers are imported.',
  },
  {
    id: 'owners-2015',
    sourceUrl: 'https://www.mbusa.com/content/dam/mb-nafta/us/smart/manuals/2015/owners_manual.pdf',
    publisher: 'Mercedes-Benz USA / smart',
    documentTitle: '2015 U.S. Operator’s Manual — smart fortwo',
    publicationDate: null,
    retrievedAt: '2026-10-17',
    rights: 'Link only. Copyright retained by publisher; no diagrams redistributed.',
    notes:
      'Passion dimensions: printed p. 215. Tires: p. 218. Engine compartment: p. 117. This is the gasoline manual, not the Electric Drive manual. Publication year follows Edition A-2014; exact day unknown.',
  },
  {
    id: 'intro-451',
    sourceUrl: 'https://www.manualslib.com/manual/838294/Smart-Series-451.html',
    publisher: 'smart USA (archived by ManualsLib)',
    documentTitle: 'Introduction of the smart fortwo, Model Series 451',
    publicationDate: null,
    retrievedAt: '2026-10-17',
    rights: 'Link only; no illustrations copied.',
    notes:
      '2007 platform introduction. Supports rear-engine architecture, 5-speed AMT, front disc / rear drum layout and suspension concepts. Not evidence of 2015 part-number fitment.',
  },
  {
    id: 'zf-actuators',
    sourceUrl:
      'https://aftermarket.zf.com/en/aftermarket-portal/knowledge-hub/inbrief-sachs-actuators/',
    publisher: 'ZF Aftermarket',
    documentTitle: 'Function and Setup of SACHS Actuators',
    publicationDate: '2023-04-18',
    retrievedAt: '2026-10-17',
    rights: 'Link only; original explanatory text in this app.',
    notes:
      'Supports the general roles of transmission and clutch actuators. Does not validate the illustrated linkage dimensions or timing.',
  },
  {
    id: 'mb-actuator',
    sourceUrl: 'https://mbparts.mbusa.com/oem-parts/smart-clutch-actuator-4512500062',
    publisher: 'Mercedes-Benz USA Parts',
    documentTitle: 'Clutch Actuator — Smart (4512500062)',
    publicationDate: null,
    retrievedAt: '2026-10-17',
    rights: 'Linked factual part identity only; no catalog images or diagrams redistributed.',
    notes:
      'Manufacturer page confirms number and identity. It explicitly supplies no application/vehicle fitment data. 2015 gasoline fitment remains unknown.',
  },
  {
    id: 'mb-headlamps',
    sourceUrl:
      'https://classicparts.mbusa.com/v-2015-smart-fortwo--electric-drive--electric/electrical--headlamp-components',
    publisher: 'Mercedes-Benz Classic USA Parts',
    documentTitle: '2015 Fortwo Electric Drive — Headlamp Components',
    publicationDate: null,
    retrievedAt: '2026-10-17',
    rights: 'Linked factual part identity only. No catalog diagram reproduced.',
    notes:
      'Lists right 4518202459 and left 4518202559, without BRABUS. Source configuration is Electric Drive: it is NOT confirmation for this gasoline vehicle.',
  },
];
export const systems: VehicleSystem[] = [
  ['exterior', 'Exterior & body', 'Panels, glazing and the safety cell', '#9eac89'],
  ['engine', 'Engine & exhaust', 'Rear-mounted gasoline powerplant', '#d59d70'],
  ['transmission', 'Transmission & clutch', 'Automated manual drivetrain', '#a394c1'],
  ['brakes', 'Braking system', 'Front discs, rear drums and controls', '#c4877d'],
  ['suspension', 'Suspension & steering', 'Road wheels, suspension and steering', '#8bacc1'],
  ['cooling', 'Cooling & HVAC', 'Heat management and cabin ventilation', '#7dafae'],
  ['electrical', 'Electrical & electronics', 'Power, controls and connectivity', '#c9b46b'],
  ['interior', 'Interior & safety', 'Cabin, seating and restraint systems', '#a6a39b'],
].map(([id, name, description, color]) => ({ id, name, description, color, parentSystemId: null }));
const components: Component[] = [];
function add(
  id: string,
  name: string,
  systemId: string,
  parent: string | null,
  modeled: boolean,
  location: string,
  description: string,
  aliases: string[] = [],
  assembly = false,
) {
  components.push({
    id,
    name,
    systemId,
    parentComponentId: parent,
    vehicleConfigId: vehicle.id,
    accuracy: modeled ? 'C' : 'D',
    location,
    description,
    function: description,
    side: id.includes('left') ? 'left' : id.includes('right') ? 'right' : 'center',
    componentType: assembly ? 'assembly' : 'part',
    safetyCritical: ['brakes', 'suspension', 'interior'].includes(systemId),
    serviceable: null,
    aliases,
    sourceIds:
      systemId === 'transmission' ? ['intro-451', 'zf-actuators'] : ['owners-2015', 'intro-451'],
    geometryNotes: modeled
      ? 'Original educational geometry. Approximate shape and placement; no part-level dimensional validation. Not OEM CAD.'
      : 'Catalog only. Reference geometry has not been acquired or validated.',
  });
}
for (const s of systems)
  add(s.id, s.name, s.id, null, true, 'System assembly', s.description, [], true);
add(
  'safety-cell',
  'Tridion safety cell',
  'exterior',
  'exterior',
  true,
  'Surrounding passenger compartment',
  'The structural safety cell surrounds the passenger compartment. The displayed form is an educational exterior outline, not a structural analysis model.',
  ['frame', 'chassis'],
);
add(
  'front-bumper',
  'Front bumper cover',
  'exterior',
  'exterior',
  true,
  'Front of vehicle',
  'Exterior cover around the front impact structure.',
);
add(
  'rear-bumper',
  'Rear bumper cover',
  'exterior',
  'exterior',
  true,
  'Rear of vehicle',
  'Exterior cover below the rear cargo opening.',
);
add(
  'service-panel',
  'Front service panel',
  'exterior',
  'exterior',
  true,
  'Front, below windshield',
  'Provides access to front service reservoirs. The engine is at the rear.',
  ['hood', 'bonnet'],
);
add(
  'windshield',
  'Windshield',
  'exterior',
  'exterior',
  true,
  'Front of cabin',
  'Laminated front glazing.',
  ['windscreen'],
);
add(
  'roof',
  'Panoramic roof',
  'exterior',
  'exterior',
  true,
  'Above cabin',
  'Fixed roof panel shown as the Passion coupé configuration.',
);
add(
  'rear-glass',
  'Rear window',
  'exterior',
  'exterior',
  true,
  'Upper rear cargo opening',
  'Rear glazing above the lower tailgate.',
);
add(
  'tailgate',
  'Lower tailgate',
  'exterior',
  'exterior',
  true,
  'Rear cargo opening',
  'Lower portion of the two-part cargo opening.',
  ['rear hatch'],
);
for (const side of ['left', 'right']) {
  add(
    `door-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} door`,
    'exterior',
    'exterior',
    true,
    `${side} cabin side`,
    'Door panel assembly; handle and trim are grouped meshes.',
  );
  add(
    `window-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} side window`,
    'exterior',
    `door-${side}`,
    true,
    `${side} door`,
    'Side glazing.',
  );
  add(
    `mirror-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} mirror`,
    'exterior',
    `door-${side}`,
    true,
    `${side} front door`,
    'Exterior rear-view mirror.',
  );
  add(
    `fender-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} front fender`,
    'exterior',
    'exterior',
    true,
    `${side} front wheel arch`,
    'Body panel around the front wheel opening.',
  );
  add(
    `quarter-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} rear quarter panel`,
    'exterior',
    'exterior',
    true,
    `${side} rear wheel arch`,
    'Body panel alongside the rear engine compartment.',
  );
  add(
    `headlight-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} headlight`,
    'exterior',
    'exterior',
    true,
    `${side} front corner`,
    'Front lighting assembly. Exact lamp fitment requires a configuration-specific catalog or VIN check.',
    ['headlamp', side === 'right' ? 'passenger headlight' : 'driver headlight'],
  );
  add(
    `taillight-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} tail lamp`,
    'exterior',
    'exterior',
    true,
    `${side} rear corner`,
    'Rear signaling and illumination assembly.',
    ['taillight'],
  );
}
add(
  'engine-block',
  'Engine block',
  'engine',
  'engine',
  true,
  'Rear, beneath cargo floor',
  'Illustrates the rear transverse three-cylinder engine. Casting surfaces and mounting points are approximate.',
  ['motor', '1.0'],
);
add(
  'cylinder-head',
  'Cylinder head & valve cover',
  'engine',
  'engine-block',
  true,
  'Above engine block',
  'Closes the cylinders and houses the valve train; internal detail is not modeled.',
);
add(
  'intake',
  'Intake manifold',
  'engine',
  'engine-block',
  true,
  'Beside rear engine',
  'Routes intake air to the three cylinders.',
);
add(
  'exhaust',
  'Exhaust silencer',
  'engine',
  'engine',
  true,
  'Low rear underbody',
  'Reduces exhaust noise. Routing is schematic; catalyst internals are not modeled.',
  ['muffler'],
);
add(
  'transmission-case',
  'Transmission housing',
  'transmission',
  'transmission',
  true,
  'Rear, adjacent to engine',
  'Housing for the five-speed automated manual gearbox. Gearsets and differential internals are not modeled.',
  ['gearbox', 'AMT'],
);
add(
  'clutch',
  'Clutch assembly',
  'transmission',
  'transmission',
  true,
  'Between engine and gearbox',
  'Transfers torque from the engine to the gearbox. Releasing the clutch interrupts that torque path.',
  [],
  true,
);
add(
  'flywheel',
  'Flywheel',
  'transmission',
  'clutch',
  true,
  'Engine side of clutch',
  'Provides the engine-side friction surface and rotating inertia.',
);
add(
  'clutch-disc',
  'Clutch disc',
  'transmission',
  'clutch',
  true,
  'Between flywheel and pressure plate',
  'Friction disc clamped to transmit engine torque to the gearbox.',
);
add(
  'pressure-plate',
  'Pressure plate',
  'transmission',
  'clutch',
  true,
  'Gearbox side of clutch disc',
  'Clamps the friction disc; the conceptual animation illustrates release of clamping force.',
);
add(
  'release-bearing',
  'Release bearing',
  'transmission',
  'clutch',
  true,
  'Gearbox side of pressure plate',
  'Transfers release force to the clutch release spring.',
);
add(
  'clutch-actuator',
  'Clutch actuator',
  'transmission',
  'transmission',
  true,
  'Outside the transmission housing',
  'Converts an electrical control command into movement of the clutch release mechanism. The original housing geometry here is illustrative.',
  ['actuator motor', 'clutch robot'],
  true,
);
add(
  'actuator-rod',
  'Actuator release rod',
  'transmission',
  'clutch-actuator',
  true,
  'Between actuator and release mechanism',
  'Transmits actuator movement to the release linkage. Travel shown is explanatory, not a service dimension.',
  ['pushrod'],
);
add(
  'actuator-connector',
  'Clutch actuator electrical connector',
  'transmission',
  'clutch-actuator',
  false,
  'At clutch actuator housing',
  'Electrical connection to the clutch actuator. Pinout, connector shape and wiring have not been verified.',
  ['plug', 'electrical connector'],
);
add(
  'release-fork',
  'Clutch release mechanism',
  'transmission',
  'clutch',
  true,
  'Inside bellhousing',
  'Simplified lever conveys rod movement to the release bearing. Exact lever geometry and pivot are not validated.',
  ['release fork'],
);
add(
  'gear-selector',
  'Gear-selection actuator',
  'transmission',
  'transmission',
  false,
  'On transmission',
  'Selects and engages gearbox ratios under electronic control. Internal motion is not represented.',
);
for (const side of ['left', 'right']) {
  add(
    `driveshaft-${side}`,
    `${side === 'left' ? 'Left' : 'Right'} driveshaft`,
    'transmission',
    'transmission',
    true,
    `${side} rear axle`,
    'Transfers torque from the differential to a rear wheel.',
    ['half shaft', 'CV axle'],
  );
  for (const axle of ['front', 'rear']) {
    add(
      `wheel-${axle}-${side}`,
      `${axle === 'front' ? 'Front' : 'Rear'} ${side} wheel`,
      'suspension',
      'suspension',
      true,
      `${axle} ${side} corner`,
      'Illustrative wheel and tire; rim design is original, not a factory wheel reproduction.',
      ['tire', 'rim'],
    );
    add(
      `brake-${axle}-${side}`,
      `${axle === 'front' ? 'Front' : 'Rear'} ${side} ${axle === 'front' ? 'disc brake' : 'drum brake'}`,
      'brakes',
      'brakes',
      true,
      `${axle} ${side} hub`,
      axle === 'front'
        ? 'Front disc and caliper assembly. Friction converts wheel motion into heat.'
        : 'Rear drum brake assembly. Internal shoes are not modeled.',
      ['rotor', 'brake'],
    );
    add(
      `spring-${axle}-${side}`,
      `${axle === 'front' ? 'Front' : 'Rear'} ${side} spring & damper`,
      'suspension',
      'suspension',
      true,
      `${axle} ${side} suspension`,
      'Conceptual coil spring and damper placement. Mounts and load paths require measured reference geometry.',
      ['shock', 'strut'],
    );
  }
}
add(
  'radiator',
  'Radiator',
  'cooling',
  'cooling',
  true,
  'Front, behind grille',
  'Rejects heat from engine coolant to the surrounding air.',
);
add(
  'coolant-pipes',
  'Underbody coolant pipes',
  'cooling',
  'cooling',
  true,
  'Between rear engine and front radiator',
  'Schematic coolant connection between the rear engine and front radiator. Actual bends and mounts are not validated.',
  ['hoses'],
);
add(
  'battery',
  '12 V battery',
  'electrical',
  'electrical',
  true,
  'Passenger footwell, beneath floor covering',
  'Stores electrical energy for starting and vehicle electrical systems.',
);
add(
  'dashboard',
  'Dashboard',
  'interior',
  'interior',
  true,
  'Front of cabin',
  'Supports the cabin instruments and controls.',
);
add(
  'steering-wheel',
  'Steering wheel',
  'interior',
  'interior',
  true,
  'Left-hand driving position',
  'Driver steering interface. Airbag internals are not modeled.',
);
add(
  'seat-left',
  'Driver seat',
  'interior',
  'interior',
  true,
  'Left cabin',
  'Illustrative driver seat with approximate mounting position.',
);
add(
  'seat-right',
  'Passenger seat',
  'interior',
  'interior',
  true,
  'Right cabin',
  'Illustrative passenger seat; exact seat offsets are not validated.',
);
add(
  'floor',
  'Cabin floor',
  'interior',
  'interior',
  true,
  'Below seating',
  'Illustrative passenger floor and rear engine cover.',
);
const missing: Record<string, [string, string, string?][]> = {
  exterior: [
    ['front-reinforcement', 'Front reinforcement beam'],
    ['absorber', 'Front energy absorber'],
    ['wiper-motor', 'Wiper motor'],
    ['door-hinges', 'Door hinges'],
    ['window-regulator', 'Window regulator'],
    ['hatch-strut', 'Rear hatch strut'],
    ['weatherstrip', 'Weatherstripping'],
    ['arch-liner', 'Wheel-arch liners'],
    ['body-clips', 'Body clips & retainers'],
  ],
  engine: [
    ['pistons', 'Pistons'],
    ['rods', 'Connecting rods'],
    ['crankshaft', 'Crankshaft'],
    ['camshafts', 'Camshafts'],
    ['valves', 'Valves & springs'],
    ['timing', 'Timing components'],
    ['throttle', 'Throttle body'],
    ['injectors', 'Fuel injectors & rail'],
    ['spark-plugs', 'Spark plugs'],
    ['coils', 'Ignition coils'],
    ['air-filter', 'Air filter housing'],
    ['engine-mounts', 'Engine mounts'],
    ['alternator', 'Alternator'],
    ['starter', 'Starter motor'],
    ['oil-pan', 'Oil pan'],
    ['oil-pump', 'Oil pump'],
    ['oil-filter', 'Oil filter'],
    ['catalyst', 'Catalytic converter'],
    ['oxygen-sensor', 'Oxygen sensors'],
  ],
  transmission: [
    ['gears', 'Gearsets'],
    ['input-shaft', 'Input shaft'],
    ['output-shaft', 'Output shaft'],
    ['differential', 'Differential'],
    ['trans-mount', 'Transmission mounts'],
    ['cv-joints', 'CV joints'],
    ['actuator-internals', 'Clutch actuator internals', 'clutch-actuator'],
  ],
  brakes: [
    ['master-cylinder', 'Brake master cylinder'],
    ['abs-module', 'ABS / ESP module'],
    ['brake-lines', 'Brake lines & hoses'],
    ['brake-pads', 'Front brake pads'],
    ['parking-cable', 'Parking brake cables'],
    ['wheel-speed', 'Wheel speed sensors'],
  ],
  suspension: [
    ['control-arms', 'Control arms'],
    ['knuckles', 'Steering knuckles'],
    ['tie-rods', 'Tie rods'],
    ['rack', 'Steering rack'],
    ['hub-bearings', 'Wheel hubs & bearings'],
    ['bushings', 'Suspension bushings'],
    ['rear-axle', 'De Dion rear axle'],
  ],
  cooling: [
    ['cooling-fan', 'Radiator cooling fan'],
    ['reservoir', 'Coolant reservoir'],
    ['water-pump', 'Water pump'],
    ['thermostat', 'Thermostat'],
    ['heater-core', 'Heater core'],
    ['hvac-housing', 'HVAC housing'],
    ['blower', 'Blower motor'],
    ['ac-compressor', 'Air-conditioning compressor'],
    ['condenser', 'A/C condenser'],
    ['refrigerant-lines', 'Refrigerant lines'],
  ],
  electrical: [
    ['sam', 'SAM / fuse & relay module'],
    ['ecu', 'Engine control electronics'],
    ['tcu', 'Transmission control electronics'],
    ['harness', 'Wiring harnesses'],
    ['ground', 'Ground connections'],
    ['cluster', 'Instrument cluster'],
    ['obd', 'OBD diagnostic connector'],
  ],
  interior: [
    ['seatbelts', 'Seat belts'],
    ['airbags', 'Airbag assemblies'],
    ['seat-mounts', 'Seat mounting hardware'],
    ['console', 'Center console'],
    ['pedals', 'Pedals'],
    ['door-trim', 'Door trim'],
    ['hvac-controls', 'HVAC controls'],
  ],
};
for (const [system, rows] of Object.entries(missing))
  for (const [id, name, parent] of rows)
    add(
      id,
      name,
      system,
      parent ?? system,
      false,
      'Exact placement awaiting reference review',
      'Catalog scope entry. Detailed identity, configuration restrictions and geometry require additional reference review.',
      [name.replaceAll('-', ' ')],
    );
// Preserve existing semantic IDs while adding the detailed assembly beneath Exterior & body.
for (const [id, name, parent] of [
  ['rear-hatch', 'Rear hatch / rear door', 'exterior'],
  ['hatch-upper', 'Upper rear hatch assembly', 'rear-hatch'],
  ['hatch-lower', 'Lower tailgate assembly', 'rear-hatch'],
]) {
  add(
    id,
    name,
    'exterior',
    parent,
    true,
    'Rear cargo opening',
    rearHatch.verification,
    ['rear door', 'rear hatch'],
    true,
  );
  components.at(-1)!.sourceIds = rearHatch.sourceIds;
}
const strutAssembly = components.find((c) => c.id === 'hatch-strut')!;
Object.assign(strutAssembly, {
  name: 'Rear hatch struts',
  parentComponentId: 'hatch-upper',
  componentType: 'assembly',
  accuracy: 'C',
  description: 'Left and right upper hatch supports. Sample travel is illustrative.',
  function: 'Supports the upper hatch.',
  location: 'Sides of upper rear opening',
  sourceIds: rearHatch.sourceIds,
  geometryNotes: rearHatch.verification,
});
for (const part of hatchParts) {
  let component = components.find((c) => c.id === part.id);
  if (!component) {
    add(
      part.id,
      part.name,
      'exterior',
      part.parent,
      true,
      part.location,
      part.function,
      part.aliases ?? [],
    );
    component = components.at(-1)!;
  }
  Object.assign(component, {
    name: part.name,
    parentComponentId: part.parent,
    description: part.function,
    function: part.function,
    location: part.location,
    aliases: part.aliases ?? [],
    sourceIds: rearHatch.sourceIds,
    geometryNotes: rearHatch.verification,
  });
}
add(
  'hatch-hardware',
  'Rear hatch fasteners & mounting hardware',
  'exterior',
  'rear-hatch',
  false,
  'Not yet verified',
  'Exact fastener inventory, attachment positions, sizes and torque values are not yet verified. No sample fasteners or removal steps are shown.',
  ['hatch bolts', 'hatch screws'],
);
components.find((c) => c.id === 'hatch-hardware')!.sourceIds = rearHatch.sourceIds;
// Additional identities from the manufacturer manual. These records do not establish
// exact replacement fitment, quantity, geometry or service procedures.
const ownerAdditions = [
  [
    'engine-compartment-cover',
    'Engine access cover',
    'engine',
    'engine',
    'Rear cargo floor',
    'Covers engine access.',
    118,
  ],
  [
    'engine-cover-fastener',
    'Engine cover fastening screw',
    'engine',
    'engine',
    'Engine access cover',
    'Retains the access cover.',
    118,
  ],
  [
    'cargo-floor-lift-strap',
    'Cargo floor lift strap',
    'interior',
    'interior',
    'Cargo area',
    'Lifts the cargo floor.',
    118,
  ],
  [
    'cargo-floor-hook',
    'Cargo floor retaining hook',
    'interior',
    'interior',
    'Cargo area',
    'Retains the lifted floor.',
    118,
  ],
  [
    'oil-dipstick',
    'Engine oil dipstick',
    'engine',
    'engine',
    'Passenger-side engine compartment',
    'Indicates oil level.',
    119,
  ],
  [
    'oil-filler-cap',
    'Engine oil filler cap',
    'engine',
    'engine',
    'Passenger-side engine compartment',
    'Closes the oil filler.',
    119,
  ],
  [
    'service-panel-retaining-strap',
    'Service flap retaining strap',
    'exterior',
    'exterior',
    'Behind service flap',
    'Tethers the service flap.',
    120,
  ],
  [
    'washer-reservoir',
    'Windshield washer reservoir',
    'exterior',
    'exterior',
    'Front compartment',
    'Stores washer fluid.',
    123,
  ],
  [
    'brake-fluid-reservoir',
    'Brake fluid reservoir',
    'brakes',
    'brakes',
    'Front compartment',
    'Stores brake fluid.',
    124,
  ],
  [
    'washer-pump',
    'Windshield washer pump',
    'electrical',
    'electrical',
    'Not yet verified',
    'Supplies washer fluid.',
    208,
  ],
  [
    'fuel-pump-level-sensor',
    'Fuel pump with level sensor',
    'engine',
    'engine',
    'Not yet verified',
    'Fuel supply and level sensing.',
    208,
  ],
  [
    'auxiliary-power-outlet',
    'Auxiliary power outlet',
    'electrical',
    'electrical',
    'Lower center console',
    'Powers cabin accessories.',
    114,
  ],
  [
    'interior-light',
    'Interior lamp',
    'electrical',
    'electrical',
    'Cabin',
    'Illuminates the cabin.',
    208,
  ],
  [
    'fuel-filler-cap',
    'Fuel filler cap',
    'exterior',
    'exterior',
    'Fuel filler opening',
    'Closes the fuel filler.',
    117,
  ],
] as const;
for (const [id, name, system, parent, location, description, page] of ownerAdditions) {
  const sourceId = `owners-detail-${page}`;
  if (!sources.some((source) => source.id === sourceId))
    sources.push({
      ...sources.find((source) => source.id === 'owners-2015')!,
      id: sourceId,
      sourceUrl: `https://www.mbusa.com/content/dam/mb-nafta/us/smart/manuals/2015/owners_manual.pdf#page=${page + 2}`,
      documentTitle: `2015 U.S. operator manual — printed page ${page}`,
      retrievedAt: '2026-10-18',
      notes:
        'Component identity reference only. Physical quantity, exact equipment applicability, OEM number, geometry and mounting measurements remain unverified.',
    });
  add(id, name, system, parent, false, location, description);
  components.at(-1)!.sourceIds = [sourceId];
}
export const catalog = components;
export const componentById = new Map(catalog.map((c) => [c.id, c]));
export const oemParts: OEMPart[] = [
  {
    id: 'oem-actuator',
    manufacturer: 'smart',
    partNumber: '4512500062',
    description: 'Clutch actuator',
    supersededBy: null,
    sourceId: 'mb-actuator',
  },
  {
    id: 'oem-headlight-right',
    manufacturer: 'smart',
    partNumber: '4518202459',
    description: 'Right headlamp, without BRABUS (Electric Drive source)',
    supersededBy: null,
    sourceId: 'mb-headlamps',
  },
  {
    id: 'oem-headlight-left',
    manufacturer: 'smart',
    partNumber: '4518202559',
    description: 'Left headlamp, without BRABUS (Electric Drive source)',
    supersededBy: null,
    sourceId: 'mb-headlamps',
  },
];
export const fitments: PartFitment[] = oemParts.map((p, i) => ({
  id: `fitment-${p.id}`,
  oemPartId: p.id,
  vehicleConfigId: vehicle.id,
  componentId: i === 0 ? 'clutch-actuator' : i === 1 ? 'headlight-right' : 'headlight-left',
  productionRange: null,
  trimRestrictions: [],
  optionRestrictions: [],
  verificationStatus: 'unknown',
  verifiedAt: null,
  sourceId: p.sourceId,
  notes:
    i === 0
      ? 'OEM identity is sourced. The manufacturer listing has no vehicle-fitment data; 2015 gasoline fitment is unconfirmed.'
      : 'Reference is from an Electric Drive catalog. Applicability to this gasoline configuration has NOT been established. Do not order based on this reference.',
}));
export const relationships: ComponentRelationship[] = [
  {
    componentId: 'clutch-actuator',
    relatedComponentId: 'actuator-rod',
    type: 'actuates',
    evidence: 'zf-actuators',
  },
  {
    componentId: 'actuator-rod',
    relatedComponentId: 'release-fork',
    type: 'actuates',
    evidence: 'intro-451',
  },
  {
    componentId: 'release-fork',
    relatedComponentId: 'release-bearing',
    type: 'actuates',
    evidence: 'zf-actuators',
  },
  {
    componentId: 'clutch-disc',
    relatedComponentId: 'flywheel',
    type: 'mates-with',
    evidence: 'intro-451',
  },
];
export const animations: MechanismAnimation[] = [
  {
    id: 'amt-shift',
    componentId: 'transmission',
    assetUrl: null,
    clipName: null,
    description:
      'Conceptual six-stage automated-manual gear change. Travel, timing and linkage geometry are illustrative.',
    accuracyStatus: 'C',
    referenceSourceId: 'zf-actuators',
  },
];
export const accuracyLabels = {
  A: 'Verified engineering geometry',
  B: 'Visually validated geometry',
  C: 'Educational representation',
  D: 'Not yet modeled',
};
