import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';

// Imported GLB meshes are indexed, while generated extrusions can be triangle
// lists. Normalize both forms before merging the render scene for collision.
export function collisionGeometry(meshes) {
  const parts = meshes.map(mesh => {
    const part = new THREE.BufferGeometry();
    const positions = mesh.geometry.attributes.position;
    part.setAttribute('position', positions.clone());
    part.setIndex(mesh.geometry.index
      ? mesh.geometry.index.clone()
      : Array.from({ length: positions.count }, (_, i) => i));
    part.applyMatrix4(mesh.matrixWorld);
    return part;
  });
  const geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('공간 충돌 메시를 병합하지 못했습니다.');
  computeBoundsTree.call(geometry, { maxLeafSize: 12 });
  const collider = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  collider.raycast = acceleratedRaycast;
  return collider;
}
