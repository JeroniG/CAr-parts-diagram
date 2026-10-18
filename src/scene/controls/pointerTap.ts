/** A pinch, cancelled touch, or drag must never turn into component selection. */
export class PointerTap {
  private active = new Map<number, { x: number; y: number; moved: boolean }>();
  private multitouch = false;
  down(id: number, x: number, y: number) {
    this.active.set(id, { x, y, moved: false });
    if (this.active.size > 1) this.multitouch = true;
  }
  move(id: number, x: number, y: number) {
    const p = this.active.get(id);
    if (p && Math.hypot(x - p.x, y - p.y) > 6) p.moved = true;
  }
  up(id: number, x: number, y: number) {
    const p = this.active.get(id),
      valid = !!p && !p.moved && !this.multitouch && Math.hypot(x - p.x, y - p.y) <= 6;
    this.active.delete(id);
    if (!this.active.size) this.multitouch = false;
    return valid;
  }
  cancel(id: number) {
    this.active.delete(id);
    if (!this.active.size) this.multitouch = false;
  }
}
