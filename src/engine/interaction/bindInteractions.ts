import { Material, Mesh } from 'three';
import type { Group, Object3D } from 'three';
import type { WorldConfig } from '../world/types';

/** Bind logical world actions to named Blender nodes, independent of their inputs. */
export function bindInteractions(root: Group, bindings: WorldConfig['interactions']): void {
  const originals = new Set<Material>();
  // Resolve before changing materials so a bad binding leaves no partial clones.
  const resolved = (bindings ?? []).map(binding => {
    const matches: Object3D[] = [];
    root.traverse(object => { if (object.name === binding.nodeName) matches.push(object); });
    if (matches.length !== 1) throw new Error(`상호작용 노드가 없거나 이름이 중복됩니다: ${binding.nodeName}`);
    return { binding, node: matches[0] };
  });
  for (const { binding, node } of resolved) {
    let count = 0;
    node.traverse(object => {
      if (!(object instanceof Mesh)) return;
      count++;
      const clone = (material: Material) => { originals.add(material); return material.clone(); };
      object.material = Array.isArray(object.material) ? object.material.map(clone) : clone(object.material);
      Object.assign(object.userData, { interaction: 'toggle-color', interactionId: binding.id,
        interactionLabel: binding.label, interactionDistance: Math.min(3, Math.max(0.2, binding.maxDistance ?? 3)) });
    });
    if (!count) throw new Error(`상호작용 노드에 메시가 없습니다: ${binding.nodeName}`);
  }
  const used = new Set<Material>();
  root.traverse(object => {
    if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) used.add(material);
  });
  // Dispose only materials no longer used after cloning. Textures remain shared
  // inside this world and are released once by disposeObject at world exit.
  for (const material of originals) if (!used.has(material)) material.dispose();
}
