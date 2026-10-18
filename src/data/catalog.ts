/** Bundled JSON fallback: no database, account, API key, or network request required. */
import snapshot from './catalog.snapshot.json';
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
export const vehicle = snapshot.vehicle as VehicleConfiguration;
export const systems = snapshot.systems as VehicleSystem[];
export const catalog = snapshot.components as Component[];
export const componentById = new Map(catalog.map((c) => [c.id, c]));
export const sources = snapshot.sources as SourceRecord[];
export const oemParts = snapshot.oemParts as OEMPart[];
export const fitments = snapshot.fitments as PartFitment[];
export const relationships = snapshot.relationships as ComponentRelationship[];
export const animations = snapshot.animations as MechanismAnimation[];
export const accuracyLabels = {
  A: 'Verified engineering geometry',
  B: 'Visually validated geometry',
  C: 'Educational representation',
  D: 'Not yet modeled',
};
