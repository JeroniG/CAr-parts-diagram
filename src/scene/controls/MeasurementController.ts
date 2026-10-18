import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

export interface Measurement {
  points: number;
  millimetres: number | null;
}
export class MeasurementController {
  readonly root = new Group();
  private points: Vector3[] = [];
  private line = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: '#dcaa4b', depthTest: false }),
  );
  private markers: Mesh[] = [];
  constructor(private changed: (value: Measurement) => void) {
    this.line.renderOrder = 20;
    this.root.add(this.line);
    for (let i = 0; i < 2; i++) {
      const marker = new Mesh(
        new SphereGeometry(0.006, 12, 8),
        new MeshBasicMaterial({ color: '#edc56d', depthTest: false }),
      );
      marker.renderOrder = 21;
      marker.visible = false;
      this.markers.push(marker);
      this.root.add(marker);
    }
  }
  add(point: Vector3) {
    if (![point.x, point.y, point.z].every(Number.isFinite)) return;
    if (this.points.length === 2) this.clear();
    this.points.push(point.clone());
    this.markers[this.points.length - 1].position.copy(point);
    this.markers[this.points.length - 1].visible = true;
    this.line.geometry.dispose();
    this.line.geometry = new BufferGeometry().setFromPoints(this.points);
    this.changed({
      points: this.points.length,
      millimetres:
        this.points.length === 2 ? this.points[0].distanceTo(this.points[1]) * 1000 : null,
    });
  }
  clear() {
    this.points = [];
    this.markers.forEach((m) => {
      m.visible = false;
    });
    this.line.geometry.dispose();
    this.line.geometry = new BufferGeometry();
    this.changed({ points: 0, millimetres: null });
  }
  dispose() {
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.markers.forEach((m) => {
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    });
  }
}
