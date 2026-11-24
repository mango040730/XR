import * as THREE from 'three';
import { meshPieces, applyPieces } from './mesh-pieces.js';
import { CENTRAL_RADIUS } from './space-layout.js';
import { FLOOR_Y } from './space-levels.js';
import { centralIsRaised, CENTRAL_STEP_RISE } from './central-room.js';

// Match the reference's room-to-furniture proportions. Enlarge the footprints,
// preserving usable seat/table heights and the supplied local mesh/materials.
// The local origin is the seating circle's centre, not its asymmetric bounds.
export const CENTRAL_FURNITURE_LAYOUT = [
  { id: '01_tiered_forum', x: -9.1, z: -8.3, footprint: 1.6 },
  { id: '02_grand_curve_lounge', x: -9.6, z: 11.3, footprint: 1.8 },
  { id: '03_reading_nook', x: -18, z: 3.5, footprint: 1.25 },
  { id: '04_round_meeting', x: 9.2, z: -11.6, footprint: 1.75 },
  { id: '05_s_curve_meeting', x: 3.1, z: 0.6, footprint: 1.65 },
  { id: '06_conversation_nook', x: 15.8, z: 5.4, footprint: 1.65 },
];

export function validateCentralFurniture(assets) {
  for (const { id } of CENTRAL_FURNITURE_LAYOUT) {
    if (!assets.get(id)?.isObject3D) throw new Error(`중앙 가구 파일이 누락됐습니다: ${id}.glb`);
  }
}

export function removeCentralFurniture(model) {
  const meshes = [];
  model.traverse(mesh => {
    if (mesh.isMesh && /^(Lounge_Pods|Cafe_Furniture|Planting|Luminaires)__/.test(mesh.name)
      && !mesh.userData.mixedSeating) meshes.push(mesh);
  });
  let removedParts = 0;
  for (const mesh of meshes) {
    // The reference keeps this freestanding oval bed at the front, separate
    // from the crossed-out dining set. Preserve its complete planting assembly.
    if (/^Planting__.*__0_-2$/.test(mesh.name)) {
      mesh.userData.referencePlanter = true;
      continue;
    }
    const pieces = meshPieces(mesh);
    for (const piece of pieces) {
      if (/^Lounge_Pods__/.test(mesh.name) || Math.hypot(piece.center.x, piece.center.z) < CENTRAL_RADIUS) {
        piece.remove = true;
        removedParts++;
      }
    }
    // Remove whole old assemblies, including pots, soil, stones and accessories.
    // Terrace plants have already moved outside the central room and stay intact.
    applyPieces(mesh, pieces);
  }
  return { removedParts };
}

export function installCentralFurniture(model, assets) {
  validateCentralFurniture(assets);
  const root = new THREE.Group();
  root.name = 'Central_furniture_v2';
  const groups = [];
  for (const placement of CENTRAL_FURNITURE_LAYOUT) {
    const asset = assets.get(placement.id);
    const raised = centralIsRaised(placement.x, placement.z);
    const floorY = FLOOR_Y + (raised ? CENTRAL_STEP_RISE : 0);
    asset.name = placement.id;
    asset.position.set(placement.x, floorY, placement.z);
    asset.scale.set(placement.footprint, 1, placement.footprint);
    asset.userData.centralFurniture = true;
    asset.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.userData.centralFurniture = placement.id;
      mesh.castShadow = mesh.receiveShadow = true;
      // Only the forum's seating steps are landing surfaces, never the tables.
      if (/^Forum__(Tiered_seating|Coral_tier_cushions)__/.test(mesh.name)) mesh.userData.walkable = true;
    });
    root.add(asset);
    groups.push({ id: placement.id, asset, floorY, raised });
  }
  model.add(root);
  model.updateMatrixWorld(true);
  return { root, groups };
}
