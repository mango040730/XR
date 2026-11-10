import { BoxHelper, Group, Mesh, MeshStandardMaterial, Ray, Raycaster, Vector2 } from 'three';
import type { Color, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { Signal } from '../core/Signal';

export interface InteractionAction { type: 'toggle-color' | 'action'; objectId: string; label: string; source: string }

function visibleSurface(object: Object3D): boolean {
  if (!(object instanceof Mesh)) return false;
  for (let current: Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
  return true;
}

/** Shared selection/action pipeline; desktop camera and controller rays are adapters. */
export class InteractionSystem {
  readonly hints = new Signal<string>();
  readonly actions = new Signal<InteractionAction>();
  readonly messages = new Signal<string>();
  readonly highlights = new Group();
  private ray = new Raycaster();
  private targets = new Map<string, Mesh>();
  private helpers = new Map<string, BoxHelper>();
  private baseColors = new WeakMap<MeshStandardMaterial, Color>();
  private root: Object3D | null = null;
  private candidates: Mesh[] = [];

  setWorld(root: Object3D | null): void {
    this.clearHover(); this.root = root; this.candidates = [];
    root?.traverse(object => { if (object instanceof Mesh && object.userData.interaction) this.candidates.push(object); });
    this.messages.emit('');
  }

  clearHover(source?: string): void {
    for (const key of source ? [source] : [...this.targets.keys()]) {
      const helper = this.helpers.get(key);
      if (helper) { helper.removeFromParent(); helper.dispose(); this.helpers.delete(key); }
      this.targets.delete(key);
    }
    this.hints.emit('');
  }

  update(camera: PerspectiveCamera): void {
    camera.updateWorldMatrix(true, false);
    this.ray.setFromCamera(new Vector2(), camera);
    this.updateRay('desktop', this.ray.ray, camera.getWorldPosition(camera.position.clone()));
  }

  updateRay(source: string, ray: Ray, observer: Vector3): Mesh | null {
    if (!this.root) return null;
    this.root.updateWorldMatrix(true, true);
    this.ray.ray.copy(ray); this.ray.near = 0; this.ray.far = 3;
    // Test nearby actionable geometry first. Empty-space looking never raycasts the room.
    const hit = this.ray.intersectObjects(this.candidates.filter(visibleSurface), false)[0];
    const maxDistance = Math.min(3, Number(hit?.object.userData.interactionDistance ?? 3));
    let target = hit && hit.distance <= 3 && hit.point.distanceTo(observer) <= maxDistance
      && hit.object instanceof Mesh && ['toggle-color', 'action'].includes(String(hit.object.userData.interaction)) ? hit.object : null;
    if (target && hit) {
      this.ray.far = hit.distance + .001;
      const obstruction = this.ray.intersectObject(this.root, true).find(value => visibleSurface(value.object));
      if (obstruction && obstruction.object !== target && obstruction.distance < hit.distance - .002) target = null;
    }
    if (target && hit && observer.distanceToSquared(ray.origin) > .000001 && observer.distanceTo(hit.point) > 0.001) {
      // A real controller can physically cross a virtual wall. Also require line
      // of sight from the validated head/body, not just from the controller.
      this.ray.set(observer, hit.point.clone().sub(observer).normalize());
      this.ray.far = observer.distanceTo(hit.point) + 0.001;
      const blocker = this.ray.intersectObject(this.root, true).find(value => visibleSurface(value.object));
      if (blocker && blocker.object !== target && blocker.distance < this.ray.far - 0.002) target = null;
    }
    if (target !== (this.targets.get(source) ?? null)) {
      this.clearHover(source);
      if (target) {
        this.targets.set(source, target);
        const helper = new BoxHelper(target, '#b6ffe7');
        this.helpers.set(source, helper); this.highlights.add(helper);
        this.hints.emit(`${String(target.userData.interactionLabel ?? '오브젝트')}${target.userData.interaction === 'action' ? ' · 클릭 / 트리거' : ' · 선택하여 색상 변경'}`);
      }
    }
    this.helpers.get(source)?.update();
    return target;
  }

  activate(source = 'desktop'): void {
    const target = this.targets.get(source);
    if (!target || !this.root || !visibleSurface(target)) return;
    const id = String(target.userData.interactionId ?? target.uuid);
    if (target.userData.interaction === 'action') {
      this.actions.emit({ type: 'action', objectId: id, label: String(target.userData.interactionLabel ?? ''), source });
      return;
    }
    const toggled = !target.userData.toggled;
    this.root.traverse(object => {
      if (!(object instanceof Mesh) || String(object.userData.interactionId ?? object.uuid) !== id) return;
      object.userData.toggled = toggled;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof MeshStandardMaterial)) continue;
        if (!this.baseColors.has(material)) this.baseColors.set(material, material.color.clone());
        material.color.copy(this.baseColors.get(material)!);
        if (toggled) material.color.set('#ffb86b');
      }
    });
    const label = String(target.userData.interactionLabel ?? '오브젝트');
    this.actions.emit({ type: 'toggle-color', objectId: id, label, source });
    this.messages.emit(`${label} 선택됨 · ${toggled ? '색상 변경' : '원래 색상 복원'}`);
  }

  dispose(): void { this.setWorld(null); this.highlights.removeFromParent(); this.hints.clear(); this.actions.clear(); this.messages.clear(); }
}
