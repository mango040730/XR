import { BufferGeometry, CanvasTexture, DoubleSide, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Ray, RingGeometry, Vector3 } from 'three';
import type { PerspectiveCamera, Scene } from 'three';
import type { TeleportCandidate } from '../player/TeleportSystem';
import { disposeObject } from '../assets/disposeObject';

/** XR presentation only. No input mapping, collision or action logic lives here. */
export class XRVisuals {
  private root = new Group();
  private rays: Line[] = [];
  private marker = new Mesh(new RingGeometry(0.12, 0.22, 32), new MeshBasicMaterial({ color: '#7cddc2', side: DoubleSide }));
  private panelRoot = new Group();
  private canvas = document.createElement('canvas');
  private texture: CanvasTexture;
  private lastText = '';
  private safety = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ color: '#060b12', depthTest: false, depthWrite: false }));

  constructor(scene: Scene, camera: PerspectiveCamera) {
    this.root.name = 'xr-visuals'; this.root.visible = false;
    for (let i = 0; i < 2; i++) {
      const line = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3(0, 0, -1)]), new LineBasicMaterial({ color: '#7cddc2' }));
      line.visible = false; this.root.add(line); this.rays.push(line);
    }
    this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false; this.root.add(this.marker);
    this.canvas.width = 1024; this.canvas.height = 256;
    this.texture = new CanvasTexture(this.canvas);
    const panel = new Mesh(new PlaneGeometry(0.9, 0.225), new MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false }));
    panel.position.set(0, -0.27, -0.85); panel.renderOrder = 3000;
    this.safety.position.z = -0.1; this.safety.renderOrder = 2000; this.safety.visible = false;
    this.panelRoot.add(panel, this.safety); this.panelRoot.visible = false;
    camera.add(this.panelRoot); scene.add(this.root);
  }

  active(value: boolean): void { this.root.visible = this.panelRoot.visible = value; this.hidePointers(); this.safety.visible = false; }
  hidePointers(): void { this.rays.forEach(ray => { ray.visible = false; }); this.marker.visible = false; }
  ray(index: number, ray: Ray, distance = 5): void {
    const line = this.rays[index]; if (!line) return;
    line.position.copy(ray.origin);
    line.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), ray.direction));
    line.scale.set(1, 1, Math.max(0.05, distance)); line.visible = true;
  }
  teleport(candidate: TeleportCandidate): void {
    this.marker.visible = !!candidate.point;
    if (candidate.point) this.marker.position.copy(candidate.point).add(new Vector3(0, 0.015, 0));
    this.marker.material.color.set(candidate.valid ? '#7cddc2' : '#ff795f');
  }
  status(text: string, blocked: boolean): void {
    this.safety.visible = blocked;
    if (text === this.lastText) return;
    this.lastText = text;
    const context = this.canvas.getContext('2d'); if (!context) return;
    context.clearRect(0, 0, 1024, 256);
    context.fillStyle = '#102732ee'; context.fillRect(0, 0, 1024, 256);
    context.fillStyle = blocked ? '#ffbfad' : '#b6ffe7'; context.font = '30px sans-serif';
    for (const [index, line] of text.split('\n').slice(0, 4).entries()) context.fillText(line, 28, 50 + index * 52, 970);
    this.texture.needsUpdate = true;
  }
  dispose(): void { disposeObject(this.root); disposeObject(this.panelRoot); }
}
