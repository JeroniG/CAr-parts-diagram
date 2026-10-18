import * as T from 'three';
import { ImportedClipController } from './animations/importedClip';
import { PointerTap } from './controls/pointerTap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadVehicle, disposeObject } from './loaders/vehicleLoader';
import { inventoryLayout, radialLayout } from './explosion/layout';
import { mechanismState } from './animations/transmission';
import { componentById } from '../data/catalog';
import { descendants, visibleComponent } from '../services/catalog';
import { vehicleRegistry } from '../vehicles/registry';
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
  lighting: 'studio' | 'workshop' | 'inspection';
  animationProgress: number;
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
  theme: 'light',
  quality: 'high',
  adaptive: true,
  autoRotate: false,
  exposure: 1.1,
  lighting: 'studio',
  animationProgress: 0,
};
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
}
export class Viewer {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(38, 1, 0.025, 100);
  private controls: OrbitControls;
  private clipController: ImportedClipController | null = null;
  private root: T.Group | null = null;
  private parts = new Map<string, Part>();
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
      'Interactive 3D Smart Fortwo. Use the component tree for keyboard selection.',
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
  }
  private async load() {
    try {
      const definition = vehicleRegistry[0];
      const loaded = await loadVehicle(definition.assetUrl, definition.manifestUrl);
      if (this.disposed) {
        disposeObject(loaded.root);
        return;
      }
      this.root = loaded.root;
      this.scene.add(loaded.root);
      if (loaded.clips.length)
        this.clipController = new ImportedClipController(loaded.root, loaded.clips[0]);
      loaded.parts.forEach((group, id) => {
        const materials: T.MeshStandardMaterial[] = [];
        group.traverse((o) => {
          if (o instanceof T.Mesh) {
            o.userData.componentId = id;
            const originals = Array.isArray(o.material) ? o.material : [o.material];
            const clones = originals.map((m) => {
              const clone = m.clone() as T.MeshStandardMaterial;
              clone.userData.baseOpacity = clone.opacity;
              clone.userData.baseTransparent = clone.transparent;
              clone.userData.baseClearcoat = (clone as T.MeshPhysicalMaterial).clearcoat;
              materials.push(clone);
              return clone;
            });
            o.material = Array.isArray(o.material) ? clones : clones[0];
          }
        });
        this.parts.set(id, {
          group,
          base: group.position.clone(),
          size: new T.Box3().setFromObject(group).getSize(new T.Vector3()),
          materials,
        });
      });
      this.lastLayoutKey = '';
      this.lastMaterialKey = '';
      this.lastQuality = '';
      this.update(this.state);
      this.setCamera('perspective');
      this.cb.loaded(this.parts.size);
      if (this.softwareRenderer && this.state.adaptive) this.cb.quality('low');
    } catch (e) {
      this.cb.error(e instanceof Error ? e.message : 'The model could not be loaded.');
    }
  }
  private resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.parts.size) this.frameVisible();
    this.dirty = true;
  }
  update(next: ViewState) {
    const previous = this.state;
    this.state = next;
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
      for (const p of this.parts.values())
        for (const m of p.materials) {
          if (m instanceof T.MeshPhysicalMaterial) {
            m.clearcoat = next.quality === 'low' ? 0 : m.userData.baseClearcoat;
            m.needsUpdate = true;
          }
        }
      this.resize();
    }
    this.controls.autoRotate = next.autoRotate && !this.reducedMotion;
    this.renderer.toneMappingExposure = next.exposure;
    this.key.intensity =
      next.lighting === 'inspection' ? 3 : next.lighting === 'workshop' ? 1.5 : 2.2;
    this.fill.intensity = next.lighting === 'inspection' ? 3 : 1.7;
    this.key.color.set(next.lighting === 'studio' ? 0xfff6e7 : 0xffffff);
    const selected = next.selected ? descendants(next.selected) : new Set<string>();
    const transparent = new Set([...next.transparent].flatMap((id) => [...descendants(id)]));
    const materialKey = JSON.stringify([
      next.selected,
      [...next.transparent],
      next.xray,
      next.section,
      next.cut,
    ]);
    const layoutKey = JSON.stringify([[...next.hidden], next.isolated, next.layout]);
    if (layoutKey !== this.lastLayoutKey) {
      this.lastLayoutKey = layoutKey;
      const visible = [];
      for (const [id, part] of this.parts) {
        part.group.visible = visibleComponent(id, next.hidden, next.isolated);
        if (part.group.visible)
          visible.push({
            id,
            center: part.base,
            size: part.size,
            system: componentById.get(id)!.systemId,
          });
      }
      this.explosionTargets =
        next.layout === 'inventory' ? inventoryLayout(visible) : radialLayout(visible);
    }
    if (materialKey !== this.lastMaterialKey) {
      this.lastMaterialKey = materialKey;
      const normal =
        next.section === 'longitudinal'
          ? new T.Vector3(-1, 0, 0)
          : next.section === 'cross'
            ? new T.Vector3(0, 0, -1)
            : new T.Vector3(0, -1, 0);
      const cut = next.section === 'horizontal' ? 0.8 + next.cut * 0.8 : next.cut * 1.4;
      const planes = next.section === 'off' ? [] : [new T.Plane(normal, cut)];
      for (const [id, part] of this.parts) {
        const ghost =
          transparent.has(id) || (next.xray && componentById.get(id)?.systemId === 'exterior');
        for (const m of part.materials) {
          m.emissive.set(selected.has(id) ? 0x83a33c : 0x000000);
          m.emissiveIntensity = selected.has(id) ? 0.3 : 0;
          m.transparent = ghost || m.userData.baseTransparent;
          m.opacity = ghost ? 0.15 : m.userData.baseOpacity;
          m.depthWrite = !ghost;
          m.clippingPlanes = planes;
          m.clipShadows = true;
          m.needsUpdate = true;
        }
      }
    }
    this.applyPositions();
    this.renderer.shadowMap.needsUpdate = true;
    if (
      previous.explode !== next.explode ||
      previous.layout !== next.layout ||
      previous.isolated !== next.isolated
    )
      this.frameVisible();
    this.dirty = true;
  }
  private applyPositions() {
    this.clipController?.seek(this.state.animationProgress);
    const release = mechanismState(this.state.animationProgress).release;
    for (const [id, part] of this.parts) {
      part.group.position
        .copy(part.base)
        .lerp(this.explosionTargets.get(id) ?? part.base, this.state.explode);
      part.group.rotation.set(0, 0, 0);
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
    }
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
    this.floor.visible = this.groundVisible;
    this.grid.visible = this.groundVisible;
    if (view === 'interior') {
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
    const b = this.visibleBounds(descendants(id));
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
    return hit?.object.userData.componentId as string | undefined;
  }
  private pointerDown = (e: PointerEvent) => {
    this.taps.down(e.pointerId, e.clientX, e.clientY);
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.taps.up(e.pointerId, e.clientX, e.clientY) && e.button === 0)
      this.cb.select(this.pick(e) ?? null);
  };
  private pointerMove = (e: PointerEvent) => {
    this.taps.move(e.pointerId, e.clientX, e.clientY);
    if (e.buttons) return;
    const id = this.pick(e);
    this.container.style.cursor = id ? 'pointer' : 'grab';
    this.cb.hover(id ? (componentById.get(id)?.name ?? id) : null);
  };
  private pointerLeave = () => {
    this.cb.hover(null);
  };
  private pointerCancel = (e: PointerEvent) => this.taps.cancel(e.pointerId);
  private tick = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min((now - this.previous) / 1000, 0.05);
    this.previous = now;
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
      this.renderer.render(this.scene, this.camera);
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
      explode: this.state.explode,
      camera: this.camera.position.toArray(),
      parts: [...this.parts].map(([id, p]) => ({
        id,
        visible: p.group.visible,
        position: p.group.position.toArray(),
        base: p.base.toArray(),
      })),
      triangles: this.renderer.info.render.triangles,
      drawCalls: this.renderer.info.render.calls,
    };
  }
  dispose() {
    this.disposed = true;
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
