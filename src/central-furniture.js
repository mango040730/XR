import * as THREE from 'three';
import { meshPieces, applyPieces } from './mesh-pieces.js';
import { CENTRAL_RADIUS } from './space-layout.js';
import { FLOOR_Y } from './space-levels.js';
import { centralIsRaised, CENTRAL_STEP_RISE } from './central-room.js';

// Individual metre-scale assets replace the corresponding original groups.
// Their local origin is the seating circle's centre, not its asymmetric bounds.
export const CENTRAL_FURNITURE_LAYOUT = [
  { id: '01_tiered_forum', x: -8.892, z: -7.98046 },
  { id: '02_grand_curve_lounge', x: -9.58, z: 11.4 },
  { id: '03_reading_nook', x: -17.3, z: 2.67 },
  { id: '04_round_meeting', x: 9.462, z: -11.4 },
  { id: '05_s_curve_meeting', x: 3.76, z: 0.456 },
  { id: '06_conversation_nook', x: 16.074, z: 4.8705 },
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
