import { BufferGeometry, Mesh } from 'three';
import type { Group, Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMaterials } from './materials';

/** The ZIP restores these shaders by material name; all embedded printed textures stay intact. */
export function prepareMyRoom(root: Group): void {
  const authored = createMaterials();
  const surfaces = new Map(Object.values(authored).filter(m => m.userData.surface).map(m => [m.name, m]));
  const replaced = new Set<Material>(), used = new Set<Material>();
  root.traverse(object => {
    if (object.userData.originalName) object.name = String(object.userData.originalName);
    if (!(object instanceof Mesh)) return;
    const flags = object.userData.renderFlags as {castShadow?: boolean; receiveShadow?: boolean} | undefined;
    object.castShadow = flags?.castShadow ?? true; object.receiveShadow = flags?.receiveShadow ?? true;
    const restore = (material: Material): Material => {
      const replacement = surfaces.get(material.name); if (replacement) replaced.add(material);
      const result = replacement ?? material; used.add(result); return result;
    };
    object.material = Array.isArray(object.material) ? object.material.map(restore) : restore(object.material);
  });
  replaced.forEach(m => m.dispose());
  Object.values(authored).forEach(m => { if (!used.has(m)) m.dispose(); });
}

/** Preserve local shader coordinates while merging static geometry into this root's coordinates. */
export function batchMyRoom(root: Group): void {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map<string, Mesh[]>(), original = new Set<BufferGeometry>();
  root.traverse(object => {
    if (!(object instanceof Mesh) || Array.isArray(object.material) || object.material.transparent) return;
    const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}/${Object.keys(object.geometry.attributes).sort().join(',')}`;
    const meshes = batches.get(key) ?? []; meshes.push(object); batches.set(key, meshes);
  });
  for (const meshes of batches.values()) {
    const parts = meshes.map(mesh => {
      original.add(mesh.geometry);
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.setAttribute('surfacePosition', geometry.attributes.position.clone());
      geometry.setAttribute('surfaceNormal', geometry.attributes.normal.clone());
      return geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    });
    const merged = mergeGeometries(parts, false); parts.forEach(g => g.dispose());
    if (!merged) throw new Error('마이룸 정적 메시를 준비하지 못했습니다.');
    const first = meshes[0], batch = new Mesh(merged, first.material);
    batch.name = 'My room static batch'; batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
    root.add(batch); meshes.forEach(mesh => mesh.removeFromParent());
  }
  const retained = new Set<BufferGeometry>();root.traverse(o => { if (o instanceof Mesh) retained.add(o.geometry); });
  original.forEach(g => { if (!retained.has(g)) g.dispose(); });
}
