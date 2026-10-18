export type CameraView =
  'perspective' | 'front' | 'rear' | 'left' | 'right' | 'top' | 'bottom' | 'interior';
export type Quality = 'high' | 'medium' | 'low';
export interface ViewState {
  selected: string | null;
  hidden: Set<string>;
  isolated: string | null;
  transparent: Set<string>;
  xray: boolean;
  explode: number;
  layout: 'radial' | 'inventory';
  section: 'off' | 'longitudinal' | 'cross' | 'horizontal';
  cut: number;
  theme: 'light' | 'dark';
  quality: Quality;
  adaptive: boolean;
  autoRotate: boolean;
  exposure: number;
  lighting: 'studio' | 'workshop' | 'inspection' | 'showroom' | 'premium';
  fixtureMode: boolean;
  bodyOpacity: number;
  pointerMode: 'orbit' | 'pan';
  animationProgress: number;
  activeAssembly: string | null;
  assemblyContext: boolean;
  hatchOpen: number;
  separated: Set<string>;
  inspectionRotation: number;
  dimUnselected: boolean;
  measure: boolean;
}
export const initialView: ViewState = {
  selected: null,
  hidden: new Set(),
  isolated: null,
  transparent: new Set(),
  xray: false,
  explode: 0,
  layout: 'radial',
  section: 'off',
  cut: 0,
  theme: 'dark',
  quality: 'high',
  adaptive: true,
  autoRotate: false,
  exposure: 1.1,
  lighting: 'studio',
  fixtureMode: false,
  bodyOpacity: 0.16,
  pointerMode: 'orbit',
  animationProgress: 0,
  activeAssembly: null,
  assemblyContext: false,
  hatchOpen: 0,
  separated: new Set(),
  inspectionRotation: 0,
  dimUnselected: true,
  measure: false,
};
