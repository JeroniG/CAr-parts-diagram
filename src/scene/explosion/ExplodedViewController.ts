/** Time-based reversible motion. The exact endpoints are preserved for reassembly. */
export class ExplodedViewController {
  value = 0;
  target = 0;
  private start = 0;
  private startedAt = 0;
  constructor(private duration = 650) {}
  set(value: number, now: number, immediate = false) {
    this.sample(now);
    this.target = Math.max(0, Math.min(1, value));
    this.start = this.value;
    this.startedAt = now;
    if (immediate) this.value = this.target;
  }
  sample(now: number) {
    if (this.value === this.target) return false;
    const t = Math.min(1, Math.max(0, (now - this.startedAt) / this.duration));
    const eased = t * t * (3 - 2 * t);
    this.value = t === 1 ? this.target : this.start + (this.target - this.start) * eased;
    return true;
  }
  get moving() {
    return this.value !== this.target;
  }
}
