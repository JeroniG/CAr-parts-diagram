export const shiftSteps = [
  ['Shift requested', 'The controller coordinates a gear change with engine torque reduction.'],
  ['Clutch release', 'The actuator extends its rod and moves the release linkage.'],
  ['Clutch disengaged', 'Clamping force is released; the engine and gearbox input are decoupled.'],
  [
    'Gear selected',
    'The separate gear-selection actuator changes ratio. Internal gears are not modeled.',
  ],
  [
    'Clutch re-engages',
    'The release linkage retracts and the pressure plate clamps the disc again.',
  ],
  ['Shift complete', 'Torque transfer resumes through the selected gear.'],
];
export function mechanismState(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const release =
    p < 1 / 6
      ? 0
      : p < 2 / 6
        ? (p - 1 / 6) * 6
        : p < 4 / 6
          ? 1
          : p < 5 / 6
            ? 1 - (p - 4 / 6) * 6
            : 0;
  return { step: Math.min(5, Math.floor(p * 6)), release };
}
