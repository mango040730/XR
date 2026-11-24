import * as THREE from 'three';
import { meshPieces, applyPieces } from './mesh-pieces.js';

// Separate the short connecting sofa from the large C-shaped lounge. The GLB
// batches their shells, pads and armrests by material, so move complete pieces
// together rather than pulling only the visible cushions out of the planter.
export function spaceLoungeJunction(model) {
  const meshes = [];
  model.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
  let sofaParts = 0, planterMeshes = 0, removedArmrests = 0;
  for (const mesh of meshes) {
    if (/^Planting__.*__-2_-1$/.test(mesh.name)) {
      // Carry the pot, soil, existing stones and plant source shapes together.
      // Botanical rebuilding and stone filling run after this relocation.
      mesh.geometry.translate(-2.8, 0, 0);
      planterMeshes++;
      continue;
    }
    if (!/^Lounge_Pods__/.test(mesh.name)) continue;
    const pieces = meshPieces(mesh);
    // Both inward-facing end blocks cut through the first cushion instead of
    // capping the sofa. Keep this junction open, with the curved shell as its end.
    const armrests = new Set(pieces.filter(p => /^Lounge_Pods__Warm_ivory/.test(mesh.name)
      && Math.abs(p.size.y - 0.94) < 0.002 && p.center.x < -15 && p.center.x > -17
      && p.center.z > 8 && p.center.z < 9));
    removedArmrests += armrests.size;
    const selected = pieces.filter(p => p.bounds.max.x < -12
      && p.bounds.min.z > 4 && p.bounds.max.z < 9 && !armrests.has(p));
    if (!selected.length) {
      if (armrests.size) applyPieces(mesh, pieces.map(p => ({ ...p, remove: armrests.has(p) })));
      continue;
    }
    const selectedSet = new Set(selected);
    const moved = new THREE.Mesh(mesh.geometry.clone(), mesh.material);
    moved.name = `${mesh.name}__spaced_arc`;
    moved.userData.spacedLounge = true;
    moved.castShadow = mesh.castShadow;
    moved.receiveShadow = mesh.receiveShadow;
    applyPieces(moved, pieces.map(p => ({ ...p, remove: !selectedSet.has(p) })));
    moved.geometry.translate(0, 0, -1.2);
    applyPieces(mesh, pieces.map(p => ({ ...p, remove: selectedSet.has(p) || armrests.has(p) })));
    model.add(moved);
    sofaParts += selected.length;
  }
  return { sofaParts, planterMeshes, removedArmrests };
}
