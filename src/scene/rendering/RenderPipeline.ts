import { HalfFloatType, WebGLRenderTarget } from 'three';
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';

/** Expensive passes are lazy and only enabled on high quality GPU rendering. */
export class RenderPipeline {
  private composer: EffectComposer | null = null;
  private revision = 0;
  private enabled = false;
  private width = 1;
  private height = 1;
  private disposed = false;
  constructor(
    private renderer: WebGLRenderer,
    private scene: Scene,
    private camera: PerspectiveCamera,
    private invalidate: () => void,
  ) {}
  async configure(enable: boolean) {
    this.enabled = enable;
    const revision = ++this.revision;
    if (!enable) {
      this.release();
      return;
    }
    if (this.composer) return;
    try {
      const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/GTAOPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]);
      if (this.disposed || revision !== this.revision || !this.enabled) return;
      const target = new WebGLRenderTarget(this.width, this.height, {
        type: HalfFloatType,
        samples: 2,
      });
      this.composer = new EffectComposer(this.renderer, target);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const ao = new GTAOPass(this.scene, this.camera, this.width, this.height);
      ao.blendIntensity = 0.45;
      ao.updateGtaoMaterial({
        radius: 0.12,
        thickness: 0.05,
        distanceFallOff: 0.8,
        samples: 8,
        screenSpaceRadius: false,
      });
      this.composer.addPass(ao);
      this.composer.addPass(new OutputPass());
      this.resize(this.width, this.height);
      this.invalidate();
    } catch (error) {
      this.enabled = false;
      this.release();
      throw error;
    }
  }
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.composer?.setPixelRatio(Math.min(this.renderer.getPixelRatio(), 1.5));
    this.composer?.setSize(width, height);
  }
  render() {
    const reset = this.renderer.info.autoReset;
    this.renderer.info.reset();
    this.renderer.info.autoReset = false;
    try {
      if (this.composer && this.enabled) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    } finally {
      this.renderer.info.autoReset = reset;
    }
  }
  private release() {
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.composer = null;
  }
  dispose() {
    this.disposed = true;
    this.revision++;
    this.release();
  }
}
