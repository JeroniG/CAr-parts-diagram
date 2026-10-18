import { AnimationMixer, LoopOnce } from 'three';
import type { AnimationClip, Object3D, AnimationAction } from 'three';
/** Shared normalized timeline adapter for future evidence-backed glTF mechanisms. */
export class ImportedClipController {
  private mixer: AnimationMixer;
  private action: AnimationAction;
  constructor(
    private root: Object3D,
    private clip: AnimationClip,
  ) {
    this.mixer = new AnimationMixer(root);
    this.action = this.mixer.clipAction(clip);
    this.action.setLoop(LoopOnce, 1);
    this.action.clampWhenFinished = true;
    this.action.play();
  }
  seek(progress: number) {
    this.action.enabled = true;
    this.action.paused = false;
    this.mixer.setTime(Math.max(0, Math.min(1, progress)) * this.clip.duration);
  }
  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
