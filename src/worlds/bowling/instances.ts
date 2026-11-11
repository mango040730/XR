import * as THREE from 'three';

export function instanceCeiling(model:THREE.Group) {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert(),
    groups = new Map<string,Array<{mesh:THREE.Mesh;owner:string;matrix:THREE.Matrix4}>>();
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    let owner:THREE.Object3D|null = o;
    while (owner && owner !== model && !owner.userData.ceiling_module) owner = owner.parent;
    if (!owner?.userData.ceiling_module) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    const key = o.geometry.uuid + materials.map((m) => m.uuid).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups
      .get(key)!
      .push({ mesh: o, owner: owner.name, matrix: inverse.clone().multiply(o.matrixWorld) });
  });
  let index = 0;
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const first = items[0].mesh;
    const batch = new THREE.InstancedMesh(first.geometry, first.material, items.length);
    batch.name = 'Instanced_Ceiling_' + ++index;
    batch.userData.ceiling_hide_in_top = true;
    batch.userData.moduleNames = items.map((i) => i.owner);
    batch.castShadow = true;
    batch.receiveShadow = true;
    items.forEach((item, i) => {
      batch.setMatrixAt(i, item.matrix);
      const original = item.mesh;
      if (original.userData.ceiling_module) {
        const placeholder = new THREE.Group();
        placeholder.name = original.name;
        placeholder.position.copy(original.position);
        placeholder.quaternion.copy(original.quaternion);
        placeholder.scale.copy(original.scale);
        placeholder.userData = { ...original.userData };
        original.parent!.add(placeholder);
      }
      original.removeFromParent();
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    model.add(batch);
  }
  return index;
}
