import * as T from 'three';
import { ImportedClipController } from './animations/importedClip';
import { PointerTap } from './controls/pointerTap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadVehicle, disposeObject } from './loaders/vehicleLoader';
import { inventoryLayout } from './explosion/layout';
import { mechanismState } from './animations/transmission';
import type { WorkspaceData } from '../features/vehicles/CatalogContext';
import type { AssemblyDefinition } from '../types/assembly';
export interface ViewerDataset {
  catalog: WorkspaceData;
  base: { assetUrl: string; manifestUrl: string } | null;
  assemblies: AssemblyDefinition[];
  fixture: boolean;
  exteriorComponentIds?: string[];
}
import type { LoadedVehicle } from './loaders/vehicleLoader';

import { hatchPose, rotateAround, strutEndpoints } from './animations/hatch';
import { ExplodedViewController } from './explosion/ExplodedViewController';
import {
  preparePartMaterials,
  setMaterialQuality,
  styleMaterial,
} from './materials/MaterialManager';
import { RenderPipeline } from './rendering/RenderPipeline';
import { MeasurementController } from './controls/MeasurementController';
import type { Measurement } from './controls/MeasurementController';
import type { AssemblyLoadStatus } from '../types/assembly';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { cutawayPlane } from './controls/cutaway';
import { initialView } from './state';
import type { CameraView, Quality, ViewState } from './state';
export { initialView } from './state';
export type { CameraView, Quality, ViewState } from './state';
interface Part {
  group: T.Group;
  base: T.Vector3;
  size: T.Vector3;
  materials: T.MeshStandardMaterial[];
}
interface Callbacks {
  quality: (quality: Quality) => void;
  select: (id: string | null) => void;
  hover: (name: string | null) => void;
  loaded: (count: number) => void;
  error: (message: string) => void;
  stats: (stats: { fps: number; triangles: number; drawCalls: number }) => void;
  assembly: (status: AssemblyLoadStatus) => void;
  measurement: (measurement: Measurement) => void;
}
export class Viewer {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(38, 1, 0.025, 100);
  private controls: OrbitControls;
  private clipController: ImportedClipController | null = null;
  private root: T.Group | null = null;
  private parts = new Map<string, Part>();
  private vehicleParts = new Map<string, Part>();
  private assemblyRoot: T.Group | null = null;
  private loadedAssemblyDefinition: AssemblyDefinition | null = null;
  private assemblyClip: ImportedClipController | null = null;
  private assemblyRig = false;
  private assemblyKey = '';
  private failedAssemblyKey = '';
  private assemblyRequest: AbortController | null = null;
  private lifetime = new AbortController();
  private explosion = new ExplodedViewController();
  private opening = new ExplodedViewController(900);
  private separations = new Map<string, ExplodedViewController>();
  private pipeline: RenderPipeline;
  private measurement: MeasurementController;
  private state: ViewState = initialView;
  private frame = 0;
  private observer: ResizeObserver;
  private disposed = false;
  private dirty = true;
  private raycaster = new T.Raycaster();
  private pointer = new T.Vector2();
  private taps = new PointerTap();
  private floor: T.Mesh;
  private grid: T.GridHelper;
  private key: T.DirectionalLight;
  private fill: T.DirectionalLight;
  private environment: T.WebGLRenderTarget;
  private targetCamera: T.Vector3 | null = null;
  private targetLook: T.Vector3 | null = null;
  private explosionTargets = new Map<string, T.Vector3>();
  private groundVisible = true;
  private lastStat = performance.now();
  private frameCount = 0;
  private previous = performance.now();
  private lastMaterialKey = '';
  private lastLayoutKey = '';
  private lastTheme = '';
  private lastQuality = '';
  private softwareRenderer = false;
  private lastAdapted = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.cb.error(
      'The graphics context was lost. Reload the page to restore 3D. The component catalog is still available.',
    );
  };
  constructor(
    private container: HTMLElement,
    private cb: Callbacks,
    private dataset: ViewerDataset,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const gl = this.renderer.getContext(),
      debug = gl.getExtension('WEBGL_debug_renderer_info');
    this.softwareRenderer =
      !!debug &&
      /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute(
      'aria-label',
      `Interactive 3D ${this.dataset.catalog.vehicle.manufacturer} ${this.dataset.catalog.vehicle.model}. Use the component tree for keyboard selection.`,
    );
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    container.appendChild(this.renderer.domElement);
    this.camera.position.set(4, 2.4, 4.6);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.72, 0);
    this.controls.enableDamping = !this.reducedMotion;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.autoRotateSpeed = 0.65;
    this.controls.addEventListener('change', () => {
      this.dirty = true;
    });
    this.controls.addEventListener('start', () => {
      this.targetCamera = null;
      this.targetLook = null;
    });
    const pmrem = new T.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new T.HemisphereLight(0xf8fbff, 0x8c968b, 1.15));
    this.key = new T.DirectionalLight(0xfff6e7, 2.2);
    this.key.position.set(3, 6, 4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -4;
    this.key.shadow.camera.right = 4;
    this.key.shadow.camera.top = 4;
    this.key.shadow.camera.bottom = -4;
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 4;
    this.scene.add(this.key);
    this.fill = new T.DirectionalLight(0xe4edff, 1.7);
    this.fill.position.set(-3, 3, -4);
    this.scene.add(this.fill);
    this.floor = new T.Mesh(
      new T.PlaneGeometry(100, 100),
      new T.ShadowMaterial({ color: 0x283321, opacity: 0.22 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.015;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid = new T.GridHelper(20, 40, 0xbfc4bb, 0xd7dad2);
    this.grid.position.y = -0.018;
    const gm = this.grid.material as T.LineBasicMaterial;
    gm.transparent = true;
    gm.opacity = 0.24;
    this.scene.add(this.grid);
    this.grid.visible = false;
    this.pipeline = new RenderPipeline(this.renderer, this.scene, this.camera, () => {
      this.dirty = true;
    });
    this.measurement = new MeasurementController(cb.measurement);
    this.scene.add(this.measurement.root);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    container.addEventListener('pointerdown', this.pointerDown);
    container.addEventListener('pointerup', this.pointerUp);
    container.addEventListener('pointermove', this.pointerMove);
    container.addEventListener('pointerleave', this.pointerLeave);
    container.addEventListener('pointercancel', this.pointerCancel);
    this.update(initialView);
    this.frame = requestAnimationFrame(this.tick);
    if (this.softwareRenderer)
      queueMicrotask(() => {
        if (!this.disposed && this.state.adaptive) this.cb.quality('low');
      });
    void this.load();
    void this.loadStudioEnvironment();
  }
  private async load() {
    try {
      const definition = this.dataset.base;
      if (!definition) {
        this.root = new T.Group();
        this.scene.add(this.root);
        this.update(this.state);
        this.cb.loaded(0);
        if (this.softwareRenderer && this.state.adaptive) this.cb.quality('low');
        return;
      }
      const loaded = await loadVehicle(definition.assetUrl, definition.manifestUrl, {
        vehicleId: this.dataset.catalog.vehicle.id,
        componentIds: new Set(this.dataset.catalog.componentById.keys()),
        signal: this.lifetime.signal,
        renderer: this.renderer,
      });
      if (this.disposed) {
        disposeObject(loaded.root);
        return;
      }
      this.root = loaded.root;
      this.scene.add(loaded.root);
      if (loaded.clips.length)
        this.clipController = new ImportedClipController(loaded.root, loaded.clips[0]);
      this.vehicleParts = this.prepareParts(loaded);
      this.parts = this.vehicleParts;
      this.lastLayoutKey = '';
      this.lastMaterialKey = '';
      this.lastQuality = '';
      this.update(this.state);
      this.setCamera('perspective');
      this.cb.loaded(this.parts.size);
      if (this.softwareRenderer && this.state.adaptive) this.cb.quality('low');
    } catch (e) {
      if (!this.disposed)
        this.cb.error(e instanceof Error ? e.message : 'The model could not be loaded.');
    }
  }
  private prepareParts(loaded: LoadedVehicle) {
    const parts = new Map<string, Part>(),
      originals = new Set<T.Material>();
    loaded.parts.forEach((group, id) => {
      group.traverse((o) => {
        if (o instanceof T.Mesh) o.userData.componentId = id;
      });
      parts.set(id, {
        group,
        base: group.position.clone(),
        size: new T.Box3().setFromObject(group).getSize(new T.Vector3()),
        materials: preparePartMaterials(group, originals),
      });
    });
    // Clones retain texture references; release only the superseded material programs here.
    originals.forEach((material) => material.dispose());
    return parts;
  }
  private async loadStudioEnvironment() {
    try {
      const response = await fetch('/environments/studio-small-09-1k.hdr', {
        signal: this.lifetime.signal,
      });
      if (!response.ok) return; // The procedural studio stays available offline or on a failed request.
      const data = new HDRLoader().parse(await response.arrayBuffer());
      if (this.disposed) return;
      const texture = new T.DataTexture(
        data.data,
        data.width,
        data.height,
        T.RGBAFormat,
        data.type,
      );
      texture.colorSpace = T.LinearSRGBColorSpace;
      texture.minFilter = T.LinearFilter;
      texture.magFilter = T.LinearFilter;
      texture.generateMipmaps = false;
      texture.flipY = true;
      texture.needsUpdate = true;
      const generator = new T.PMREMGenerator(this.renderer);
      const environment = generator.fromEquirectangular(texture);
      generator.dispose();
      texture.dispose();
      this.environment.dispose();
      this.environment = environment;
      this.scene.environment = environment.texture;
      this.scene.environmentIntensity = 0.75;
      this.scene.environmentRotation.y = 0.6;
      this.dirty = true;
    } catch {
      /* Preserve the working studio fallback. */
    }
  }
  private releaseAssembly() {
    this.assemblyRequest?.abort();
    this.assemblyRequest = null;
    this.assemblyClip?.dispose();
    this.assemblyClip = null;
    if (this.assemblyRoot) {
      this.scene.remove(this.assemblyRoot);
      disposeObject(this.assemblyRoot);
    }
    this.assemblyRoot = null;
    this.loadedAssemblyDefinition = null;
    this.assemblyKey = '';
    this.failedAssemblyKey = '';
    this.assemblyRig = false;
    this.parts = this.vehicleParts;
    if (this.root) this.root.visible = true;
    this.lastLayoutKey = '';
    this.lastMaterialKey = '';
    this.lastQuality = '';
  }
  retryAssembly() {
    this.failedAssemblyKey = '';
    this.assemblyKey = '';
    this.update(this.state);
  }
  private get assemblyDefinition() {
    return this.dataset.assemblies.find((a) => a.id === this.state.activeAssembly);
  }
  private get assemblyParts() {
    return new Map(this.loadedAssemblyDefinition?.parts.map((p) => [p.id, p]) ?? []);
  }
  private async loadAssembly(lod: 'high' | 'low') {
    const definition = this.assemblyDefinition;
    if (!definition) return;
    const request = new AbortController();
    this.assemblyRequest?.abort();
    this.assemblyRequest = request;
    const key = `${definition.id}-${lod}`;
    this.assemblyKey = key;
    this.cb.assembly({
      phase: 'loading',
      progress: 0,
      lod,
      message: `Loading ${definition.name} components…`,
    });
    try {
      const variant = definition.variants[lod];
      const loaded = await loadVehicle(variant.assetUrl, variant.manifestUrl, {
        vehicleId: this.dataset.catalog.vehicle.id,
        signal: request.signal,
        assemblyId: definition.id,
        componentIds: new Set(definition.parts.map((p) => p.id)),
        renderer: this.renderer,
        onProgress: (progress) => {
          if (!request.signal.aborted && !this.disposed)
            this.cb.assembly({
              phase: 'loading',
              progress,
              lod,
              message: 'Preparing materials and semantic parts…',
            });
        },
      });
      if (request.signal.aborted || this.disposed || this.state.activeAssembly !== definition.id) {
        disposeObject(loaded.root);
        return;
      }
      const parts = this.prepareParts(loaded);
      this.assemblyClip?.dispose();
      this.assemblyClip = loaded.clips.length
        ? new ImportedClipController(loaded.root, loaded.clips[0])
        : null;
      if (this.assemblyRoot) {
        this.scene.remove(this.assemblyRoot);
        disposeObject(this.assemblyRoot);
      }
      this.loadedAssemblyDefinition = definition;
      this.assemblyRoot = loaded.root;
      this.scene.add(loaded.root);
      this.parts = parts;
      this.assemblyRig = loaded.motionRig === 'illustrative-hatch-v1';
      this.assemblyRequest = null;
      this.failedAssemblyKey = '';
      this.lastMaterialKey = '';
      this.lastLayoutKey = '';
      this.lastQuality = '';
      this.update(this.state);
      this.frameVisible(new T.Vector3(0.7, 0.3, -1.4));
      if (this.state.selected && this.assemblyParts.has(this.state.selected))
        this.focus(this.state.selected);
      this.cb.loaded(parts.size);
      this.cb.assembly({
        phase: 'ready',
        progress: 1,
        lod,
        message: '',
        motionAvailable: this.assemblyRig || !!this.assemblyClip,
      });
    } catch (error) {
      if (request.signal.aborted || this.disposed) return;
      this.assemblyRequest = null;
      this.failedAssemblyKey = key;
      this.cb.assembly({
        phase: 'error',
        progress: 0,
        lod,
        message: error instanceof Error ? error.message : 'Assembly could not be loaded.',
      });
    }
  }
  private updateVehicleContext() {
    if (!this.root || !this.assemblyRoot) return;
    this.root.visible = this.state.assemblyContext;
    for (const [id, part] of this.vehicleParts) {
      part.group.position.copy(part.base);
      part.group.quaternion.identity();
      part.group.visible =
        !this.loadedAssemblyDefinition?.replaces.includes(id) &&
        this.dataset.catalog.visibleComponent(id, this.state.hidden, null);
      for (const material of part.materials) styleMaterial(material, false, false, true);
    }
  }
  private resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.pipeline.resize(w, h);
    if (this.parts.size) this.frameVisible();
    this.dirty = true;
  }
  update(next: ViewState) {
    const previous = this.state;
    this.state = next;
    this.floor.visible =
      this.groundVisible && !next.activeAssembly && !next.isolated && next.explode === 0;
    if (!next.activeAssembly && (this.assemblyRoot || this.assemblyRequest || this.assemblyKey)) {
      this.releaseAssembly();
      this.cb.loaded(this.parts.size);
      this.cb.assembly({ phase: 'idle', progress: 0, lod: null, message: '' });
    }
    if (next.activeAssembly && this.root) {
      const lod = next.quality === 'low' ? 'low' : 'high';
      const key = `${next.activeAssembly}-${lod}`;
      if (key !== this.assemblyKey && key !== this.failedAssemblyKey) void this.loadAssembly(lod);
      else if (!this.assemblyRoot && !this.assemblyRequest && key !== this.failedAssemblyKey)
        void this.loadAssembly(lod);
    }
    if (next.explode !== previous.explode)
      this.explosion.set(next.explode, performance.now(), this.reducedMotion);
    if (next.hatchOpen !== previous.hatchOpen)
      this.opening.set(next.hatchOpen, performance.now(), this.reducedMotion);
    if (next.separated !== previous.separated) {
      for (const id of new Set([...previous.separated, ...next.separated])) {
        const controller = this.separations.get(id) ?? new ExplodedViewController();
        controller.set(next.separated.has(id) ? 1 : 0, performance.now(), this.reducedMotion);
        this.separations.set(id, controller);
      }
    }
    if (
      next.measure !== previous.measure ||
      next.explode !== previous.explode ||
      next.hatchOpen !== previous.hatchOpen ||
      next.activeAssembly !== previous.activeAssembly ||
      next.inspectionRotation !== previous.inspectionRotation ||
      next.separated !== previous.separated
    )
      this.measurement.clear();
    if (next.theme !== this.lastTheme) {
      this.lastTheme = next.theme;
      (this.grid.material as T.LineBasicMaterial).opacity = next.theme === 'dark' ? 0.12 : 0.24;
      (this.floor.material as T.ShadowMaterial).opacity = next.theme === 'dark' ? 0.45 : 0.22;
    }
    if (next.quality !== this.lastQuality) {
      this.lastQuality = next.quality;
      this.renderer.setPixelRatio(
        Math.min(
          devicePixelRatio,
          next.quality === 'high'
            ? 2
            : next.quality === 'medium'
              ? 1.5
              : this.softwareRenderer
                ? 0.65
                : 1,
        ),
      );
      this.renderer.shadowMap.enabled = next.quality !== 'low';
      void this.pipeline
        .configure(next.quality === 'high' && !this.softwareRenderer && next.section === 'off')
        .catch(() => {
          this.dirty = true;
        });
      for (const p of this.parts.values())
        for (const m of p.materials)
          setMaterialQuality(
            m,
            next.quality === 'high' && !this.softwareRenderer,
            next.quality === 'low',
          );
      this.resize();
    }
    if (next.section !== previous.section)
      void this.pipeline
        .configure(next.quality === 'high' && !this.softwareRenderer && next.section === 'off')
        .catch(() => {
          this.dirty = true;
        });
    this.controls.mouseButtons.LEFT = next.pointerMode === 'pan' ? T.MOUSE.PAN : T.MOUSE.ROTATE;
    this.controls.autoRotate = next.autoRotate && !this.reducedMotion;
    this.renderer.toneMappingExposure = next.exposure;
    this.key.intensity =
      next.lighting === 'inspection'
        ? 3
        : next.lighting === 'workshop'
          ? 1.5
          : next.lighting === 'premium'
            ? 1.1
            : next.lighting === 'showroom'
              ? 3
              : 2.2;
    this.scene.environmentIntensity =
      next.lighting === 'premium' ? 0.45 : next.lighting === 'showroom' ? 1.1 : 0.75;
    this.fill.intensity = next.lighting === 'inspection' ? 3 : 1.7;
    this.key.color.set(next.lighting === 'studio' ? 0xfff6e7 : 0xffffff);
    const selected = next.selected
      ? this.dataset.catalog.descendants(next.selected)
      : new Set<string>();
    const hasModeledSelection = [...selected].some((id) => this.parts.has(id));
    const transparent = new Set(
      [...next.transparent].flatMap((id) => [...this.dataset.catalog.descendants(id)]),
    );
    const materialKey = JSON.stringify([
      next.selected,
      [...next.transparent],
      next.xray,
      next.bodyOpacity,
      next.section,
      next.cut,
      next.clipExteriorOnly,
      next.quality,
      next.dimUnselected,
      next.activeAssembly,
    ]);
    const layoutKey = JSON.stringify([
      [...next.hidden],
      next.isolated,
      next.layout,
      next.activeAssembly,
    ]);
    if (layoutKey !== this.lastLayoutKey) {
      this.lastLayoutKey = layoutKey;
      const visible = [];
      for (const [id, part] of this.parts) {
        part.group.visible = this.dataset.catalog.visibleComponent(id, next.hidden, next.isolated);
        if (part.group.visible)
          visible.push({
            id,
            center: part.base,
            size: part.size,
            system: this.dataset.catalog.componentById.get(id)!.systemId,
          });
      }
      this.explosionTargets =
        next.layout === 'inventory'
          ? inventoryLayout(visible)
          : new Map(
              visible.map((p) => [
                p.id,
                p.center
                  .clone()
                  .add(
                    new T.Vector3(
                      ...(this.parts.get(p.id)!.group.userData.explodedTransform?.translation ??
                        this.assemblyParts.get(p.id)?.separation ?? [0, 0, 0]),
                    ),
                  ),
              ]),
            );
    }
    if (materialKey !== this.lastMaterialKey) {
      this.lastMaterialKey = materialKey;
      const bounds = new T.Box3();
      for (const part of this.parts.values())
        bounds.union(new T.Box3().setFromCenterAndSize(part.base, part.size));
      const plane = cutawayPlane(next.section, next.cut, bounds);
      const planes = plane ? [plane] : [];
      const exteriorRoots =
        this.dataset.exteriorComponentIds ??
        this.dataset.catalog.manifest.exteriorComponentIds ??
        [];
      for (const [id, part] of this.parts) {
        const exterior =
          this.state.legacyVehicleFixture && !this.assemblyRoot
            ? this.dataset.catalog.componentById.get(id)?.systemId === 'exterior'
            : exteriorRoots.some((root) => this.dataset.catalog.descendants(root).has(id));
        const ghost = transparent.has(id) || (next.xray && exterior && next.selected !== id);
        for (const m of part.materials) {
          styleMaterial(
            m,
            selected.has(id) && next.selected !== next.activeAssembly,
            next.dimUnselected && hasModeledSelection && !selected.has(id),
            ghost,
            next.bodyOpacity,
          );
          m.clippingPlanes = next.clipExteriorOnly && !exterior ? [] : planes;
          m.clipShadows = true;
          m.needsUpdate = true;
        }
      }
    }
    this.updateVehicleContext();
    this.applyPositions();
    this.renderer.shadowMap.needsUpdate = true;
    if (
      previous.activeAssembly !== next.activeAssembly ||
      previous.explode !== next.explode ||
      previous.layout !== next.layout ||
      previous.isolated !== next.isolated ||
      previous.hatchOpen !== next.hatchOpen ||
      previous.assemblyContext !== next.assemblyContext ||
      previous.separated !== next.separated
    ) {
      this.applyPositions(next.explode, next.hatchOpen, true);
      this.frameVisible();
      this.applyPositions();
    } else if (next.selected && previous.selected !== next.selected) {
      if (next.activeAssembly && !this.assemblyRoot)
        this.frameVisible(new T.Vector3(0.6, 0.25, -1));
      else this.focus(next.selected);
    }
    if (previous.activeAssembly && !next.activeAssembly) this.setCamera('perspective');
    this.dirty = true;
  }
  private applyPositions(
    explode = this.explosion.value,
    opening = this.opening.value,
    separationTargets = false,
  ) {
    this.clipController?.seek(this.state.animationProgress);
    const release = this.dataset.fixture ? mechanismState(this.state.animationProgress).release : 0;
    for (const [id, part] of this.parts) {
      part.group.position
        .copy(part.base)
        .lerp(
          this.explosionTargets.get(id) ?? part.base,
          Math.max(
            explode,
            separationTargets
              ? this.state.separated.has(id)
                ? 1
                : 0
              : (this.separations.get(id)?.value ?? 0),
          ),
        );
      part.group.rotation.set(0, 0, 0);
      if (this.assemblyRoot) {
        const definition = this.assemblyParts.get(id)!;
        if (this.assemblyRig) {
          const pose = hatchPose(definition.motion, opening);
          part.group.position.add(
            rotateAround(part.base, pose.pivot, pose.rotation).sub(part.base),
          );
          part.group.quaternion.copy(pose.rotation);
          if (definition.motion === 'strut')
            this.updateStrut(
              part,
              this.dataset.catalog.componentById.get(id)?.side === 'left' ? 1 : -1,
              opening,
            );
        }
        const rotation = part.group.userData.explodedTransform?.rotation;
        if (rotation) {
          const amount = Math.max(explode, this.separations.get(id)?.value ?? 0);
          part.group.quaternion.multiply(
            new T.Quaternion().setFromEuler(
              new T.Euler(rotation[0] * amount, rotation[1] * amount, rotation[2] * amount),
            ),
          );
        }
        if (this.state.isolated === id) part.group.rotateY(this.state.inspectionRotation);
        continue;
      }
      // Conceptual release only: movement stays on the clutch input axis; no rotating random pieces.
      if (id === 'actuator-rod') part.group.position.x -= release * 0.004;
      if (id === 'release-fork') {
        const angle = release * 0.08,
          pivot = new T.Vector3(0.25, 0.26, -0.75),
          offset = part.base.clone().sub(pivot);
        part.group.rotation.z = angle;
        part.group.position.add(
          offset
            .clone()
            .applyAxisAngle(new T.Vector3(0, 0, 1), angle)
            .sub(offset),
        );
      }
      if (id === 'release-bearing') part.group.position.x -= release * 0.016;
      if (id === 'pressure-plate') part.group.position.x += release * 0.012;
      if (this.state.isolated === id) part.group.rotateY(this.state.inspectionRotation);
    }
    this.assemblyClip?.seek(opening);
  }
  private updateStrut(part: Part, side: number, opening: number) {
    const { body, hatch, length } = strutEndpoints(side, opening),
      direction = hatch.clone().sub(body).normalize();
    const barrel = part.group.getObjectByName(`${part.group.userData.componentId}--strut-barrel`),
      rod = part.group.getObjectByName(`${part.group.userData.componentId}--strut-rod`),
      tip = part.group.getObjectByName(`${part.group.userData.componentId}--strut-tip-eye`);
    if (!barrel || !rod || !tip) return;
    barrel.position.copy(body).addScaledVector(direction, 0.13);
    barrel.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    rod.position.copy(body).addScaledVector(direction, 0.26 + (length - 0.26) / 2);
    rod.quaternion.copy(barrel.quaternion);
    rod.scale.y = length - 0.26;
    tip.position.copy(hatch);
  }
  setCamera(view: CameraView) {
    const directions: Record<CameraView, T.Vector3> = {
      perspective: new T.Vector3(1.35, 0.75, 1.8),
      front: new T.Vector3(0, 0.15, 1),
      rear: new T.Vector3(0, 0.15, -1),
      left: new T.Vector3(1, 0.1, 0),
      right: new T.Vector3(-1, 0.1, 0),
      top: new T.Vector3(0.001, 1, 0),
      bottom: new T.Vector3(0.001, -1, 0),
      interior: new T.Vector3(0.1, 0.25, -1),
    };
    this.groundVisible = view !== 'bottom';
    this.floor.visible =
      this.groundVisible &&
      !this.state.activeAssembly &&
      !this.state.isolated &&
      this.state.explode === 0;
    this.grid.visible = false;
    const authored = this.dataset.catalog.manifest.cameraPresets?.[view];
    if (!this.dataset.fixture && authored) {
      this.controls.minDistance = 0.05;
      this.moveCamera(new T.Vector3(...authored.position), new T.Vector3(...authored.target));
      return;
    }
    if (view === 'interior' && this.dataset.fixture) {
      this.controls.minDistance = 0.05;
      this.moveCamera(new T.Vector3(0.23, 1.17, -0.53), new T.Vector3(0.1, 0.91, 0.5));
      return;
    }
    this.frameVisible(directions[view]);
  }
  private visibleBounds(ids?: Set<string>) {
    const box = new T.Box3();
    for (const [id, p] of this.parts)
      if (p.group.visible && (!ids || ids.has(id))) box.union(new T.Box3().setFromObject(p.group));
    if (!ids && this.state.assemblyContext && this.root?.visible)
      box.union(new T.Box3().setFromObject(this.root));
    return box;
  }
  private frameVisible(direction?: T.Vector3) {
    const b = this.visibleBounds();
    if (b.isEmpty()) return;
    this.frameBounds(b, direction);
  }
  private frameBounds(b: T.Box3, direction?: T.Vector3) {
    const center = b.getCenter(new T.Vector3());
    this.controls.minDistance = Math.max(0.12, b.getSize(new T.Vector3()).length() / 2 + 0.04);
    const dir = (direction ?? this.camera.position.clone().sub(this.controls.target)).normalize();
    const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), dir).normalize();
    const up = new T.Vector3().crossVectors(dir, right).normalize();
    const tanV = Math.tan(T.MathUtils.degToRad(this.camera.fov) / 2),
      tanH = tanV * this.camera.aspect;
    let distance = 0.45;
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z]) {
          const offset = new T.Vector3(x, y, z).sub(center),
            depth = offset.dot(dir);
          distance = Math.max(
            distance,
            Math.abs(offset.dot(right)) / tanH + depth,
            Math.abs(offset.dot(up)) / tanV + depth,
          );
        }
    this.moveCamera(center.clone().addScaledVector(dir, distance * 1.08), center);
  }
  private moveCamera(position: T.Vector3, target: T.Vector3) {
    if (this.reducedMotion) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
    } else {
      this.targetCamera = position;
      this.targetLook = target;
    }
    this.dirty = true;
  }
  focus(id: string) {
    const b = this.visibleBounds(this.dataset.catalog.descendants(id));
    if (!b.isEmpty()) this.frameBounds(b);
  }
  zoom(factor: number) {
    const delta = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    delta.clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.moveCamera(this.controls.target.clone().add(delta), this.controls.target.clone());
  }
  private pick(event: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objects = [...this.parts.values()].filter((p) => p.group.visible).map((p) => p.group);
    const hits = this.raycaster.intersectObjects(objects, true);
    const hit = hits.find((h) => {
      const m = (h.object as T.Mesh).material;
      if (!m) return false;
      return (Array.isArray(m) ? m : [m]).some(
        (mat) =>
          mat.opacity > 0.2 &&
          !(mat as T.MeshStandardMaterial).clippingPlanes?.some(
            (p) => p.distanceToPoint(h.point) < 0,
          ),
      );
    });
    return hit ? { id: hit.object.userData.componentId as string, point: hit.point } : undefined;
  }
  private pointerDown = (e: PointerEvent) => {
    this.taps.down(e.pointerId, e.clientX, e.clientY);
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.taps.up(e.pointerId, e.clientX, e.clientY) && e.button === 0) {
      const hit = this.pick(e);
      if (this.state.measure) {
        if (hit) {
          this.measurement.add(hit.point);
          this.dirty = true;
        }
      } else this.cb.select(hit?.id ?? null);
    }
  };
  private pointerMove = (e: PointerEvent) => {
    this.taps.move(e.pointerId, e.clientX, e.clientY);
    if (e.buttons) return;
    const id = this.pick(e)?.id;
    this.container.style.cursor = this.state.measure ? 'crosshair' : id ? 'pointer' : 'grab';
    this.cb.hover(id ? (this.dataset.catalog.componentById.get(id)?.name ?? id) : null);
  };
  private pointerLeave = () => {
    this.cb.hover(null);
  };
  private pointerCancel = (e: PointerEvent) => this.taps.cancel(e.pointerId);
  private tick = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min((now - this.previous) / 1000, 0.25);
    this.previous = now;
    const moving = this.explosion.sample(now),
      opening = this.opening.sample(now);
    let separating = false;
    for (const controller of this.separations.values())
      separating = controller.sample(now) || separating;
    if (moving || opening || separating) {
      this.applyPositions();
      this.renderer.shadowMap.needsUpdate = true;
      this.dirty = true;
    }
    if (this.targetCamera && this.targetLook) {
      const alpha = 1 - Math.exp(-dt * 10);
      this.camera.position.lerp(this.targetCamera, alpha);
      this.controls.target.lerp(this.targetLook, alpha);
      this.dirty = true;
      if (this.camera.position.distanceTo(this.targetCamera) < 0.002) {
        this.camera.position.copy(this.targetCamera);
        this.controls.target.copy(this.targetLook);
        this.targetCamera = null;
        this.targetLook = null;
      }
    }
    const changed = this.controls.update(dt);
    if (changed || this.dirty) {
      this.pipeline.render();
      this.dirty = false;
      this.frameCount++;
    }
    if (now - this.lastStat > 2000) {
      const fps = (this.frameCount * 1000) / (now - this.lastStat);
      if (
        this.state.adaptive &&
        this.state.autoRotate &&
        fps < 24 &&
        now - this.lastAdapted > 6000 &&
        this.state.quality !== 'low'
      ) {
        this.lastAdapted = now;
        this.cb.quality(this.state.quality === 'high' ? 'medium' : 'low');
      }
      this.cb.stats({
        fps: Math.round((this.frameCount * 1000) / (now - this.lastStat)),
        triangles: this.renderer.info.render.triangles,
        drawCalls: this.renderer.info.render.calls,
      });
      this.frameCount = 0;
      this.lastStat = now;
    }
  };
  snapshot() {
    return {
      selected: this.state.selected,
      canvasId: this.scene.uuid,
      xray: this.state.xray,
      section: this.state.section,
      clipExteriorOnly: this.state.clipExteriorOnly,
      explode: this.state.explode,
      displayedExplosion: this.explosion.value,
      activeAssembly: this.assemblyRoot ? this.state.activeAssembly : null,
      assemblyLod: this.assemblyKey,
      hatchOpen: this.opening.value,
      inspectionRotation: this.state.inspectionRotation,
      strutAttachments:
        this.assemblyRoot && this.assemblyRig
          ? [...this.assemblyParts.values()]
              .filter((p) => p.motion === 'strut')
              .map(({ id }) => {
                const part = this.parts.get(id)!;
                part.group.updateWorldMatrix(true, true);
                return {
                  id,
                  body: part.group
                    .getObjectByName(`${id}--strut-base-eye`)!
                    .getWorldPosition(new T.Vector3())
                    .toArray(),
                  hatch: part.group
                    .getObjectByName(`${id}--strut-tip-eye`)!
                    .getWorldPosition(new T.Vector3())
                    .toArray(),
                };
              })
          : [],
      camera: this.camera.position.toArray(),
      parts: [...this.parts].map(([id, p]) => ({
        id,
        visible: p.group.visible,
        position: p.group.position.toArray(),
        base: p.base.toArray(),
        opacity: p.materials[0]?.opacity,
        emissive: p.materials[0]?.emissive.getHexString(),
        clippingPlanes:
          p.materials[0]?.clippingPlanes?.map((plane) => ({
            normal: plane.normal.toArray(),
            constant: plane.constant,
          })) ?? [],
        rotation: p.group.quaternion.toArray(),
      })),
      triangles: this.renderer.info.render.triangles,
      drawCalls: this.renderer.info.render.calls,
    };
  }
  dispose() {
    this.disposed = true;
    this.lifetime.abort();
    this.releaseAssembly();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.container.removeEventListener('pointerdown', this.pointerDown);
    this.container.removeEventListener('pointerup', this.pointerUp);
    this.container.removeEventListener('pointermove', this.pointerMove);
    this.container.removeEventListener('pointerleave', this.pointerLeave);
    this.container.removeEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    this.clipController?.dispose();
    this.pipeline.dispose();
    this.measurement.dispose();
    if (this.root) disposeObject(this.root);
    this.environment.dispose();
    this.floor.geometry.dispose();
    (this.floor.material as T.Material).dispose();
    this.grid.geometry.dispose();
    (this.grid.material as T.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
