import * as THREE from 'three';
import { meshPieces, applyPieces } from './mesh-pieces.js';
import { CENTRAL_RADIUS } from './space-layout.js';
import { FLOOR_Y } from './space-levels.js';
import { SPACE_COLORS } from './space-colors.js';

export const CENTRAL_STEP_RISE = 0.28;
// Ground coordinates aligned with the reference: s increases toward the viewer.
export function centralBoundary(u) {
  const t = THREE.MathUtils.clamp((u + 10.7) / 6.7, 0, 1);
  return -14 + 35 * t * t * (3 - 2 * t);
}
export function centralIsRaised(x, z) {
  return (x + z) / Math.SQRT2 <= centralBoundary((x - z) / Math.SQRT2);
}
const anchors = [
  [-9.58, 13.49, false], [-14.89, 6.56, false], [-17.30, 2.17, false],
  [-8.892, -7.98046, true], [9.462, -12.35, true],
  [3.582, 0.456, true], [16.074, 4.8705, true],
];
function nearestAnchor(x, z) {
  return anchors.reduce((best, a) => Math.hypot(x - a[0], z - a[1]) < Math.hypot(x - best[0], z - best[1]) ? a : best);
}

export function rebuildCentralRoom(model) {
  const meshes = [];
  model.traverse(mesh => {
    if (mesh.isMesh && /^(Lounge_Pods|Cafe_Furniture|Planting|Luminaires)__/.test(mesh.name) && !mesh.userData.mixedSeating) meshes.push(mesh);
  });
  const byMesh = new Map(meshes.map(mesh => [mesh, meshPieces(mesh)]));
  const floatingSeats = [...byMesh.values()].flat().filter(p => /^Lounge_Pods__(Tangerine_ottoman|Sunflower_cushions|Cobalt_fabric)__-1_0$/.test(p.mesh.name)
    && Math.abs(p.size.y - 0.5) < 0.002 && Math.max(p.size.x, p.size.z) < 1.6);
  const floatingSeatSet = new Set(floatingSeats);
  const pots = [...byMesh.values()].flat().filter(p => /^Planting__.*Warm_ivory/.test(p.mesh.name) && p.size.y > 0.3 && p.bounds.min.y < 1.2);
  let removedDividers = 0, raisedPieces = 0, removedFloatingSeatParts = 0;
  for (const [mesh, pieces] of byMesh) {
    const positions = mesh.geometry.attributes.position;
    for (const piece of pieces) {
      const floatingBase = /^Lounge_Pods__Sofa_recessed_plinth__-1_0$/.test(mesh.name)
        && floatingSeats.some(seat => Math.hypot(piece.center.x - seat.center.x, piece.center.z - seat.center.z) < 0.02);
      if (floatingSeatSet.has(piece) || floatingBase) {
        piece.remove = true; removedFloatingSeatParts++; continue;
      }
      if (Math.hypot(piece.center.x, piece.center.z) >= CENTRAL_RADIUS) continue;
      // These two freestanding bean blocks represented the floor boundary as
      // furniture. Replace them with the actual continuous stepped floor.
      if (/^Lounge_Pods__Warm_ivory/.test(mesh.name) && Math.abs(piece.size.y - 0.5848) < 0.002) {
        piece.remove = true; removedDividers++; continue;
      }
      let center = piece.center;
      if (/^Planting__/.test(mesh.name) && pots.length) {
        center = pots.reduce((best, p) => center.distanceToSquared(p.center) < center.distanceToSquared(best.center) ? p : best).center;
      }
      if (!nearestAnchor(center.x, center.z)[2]) continue;
      for (const i of piece.vertices) positions.setY(i, positions.getY(i) + CENTRAL_STEP_RISE);
      raisedPieces++;
    }
    applyPieces(mesh, pieces);
  }

  // A filled rear half-room, including the curved vertical riser. No separate
  // strip or wall stands above the floor. The front remains at FLOOR_Y.
  const R = CENTRAL_RADIUS;
  function root(sign) {
    let lo = -R, hi = R;
    for (let i = 0; i < 60; i++) {
      const u = (lo + hi) / 2;
      const value = centralBoundary(u) - sign * Math.sqrt(Math.max(0, R * R - u * u));
      if (value > 0) hi = u; else lo = u;
    }
    return (lo + hi) / 2;
  }
  const left = root(-1), right = root(1);
  const points = [];
  const point = (u, s) => new THREE.Vector2((s + u) / Math.SQRT2, (u - s) / Math.SQRT2);
  for (let i = 0; i <= 384; i++) {
    const u = THREE.MathUtils.lerp(left, right, i / 384);
    points.push(point(u, centralBoundary(u)));
  }
  const start = Math.atan2(centralBoundary(right), right);
  let end = Math.atan2(centralBoundary(left), left);
  while (end >= start) end -= Math.PI * 2;
  for (let i = 1; i < 384; i++) {
    const angle = THREE.MathUtils.lerp(start, end, i / 384);
    points.push(point(R * Math.cos(angle), R * Math.sin(angle)));
  }
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), { depth: CENTRAL_STEP_RISE, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, FLOOR_Y, 0);
  const platform = new THREE.Mesh(geometry, [
    new THREE.MeshStandardMaterial({ name: 'Central upper peach floor', color: SPACE_COLORS.floor, roughness: 0.68 }),
    new THREE.MeshStandardMaterial({ name: 'Central curved step riser', color: SPACE_COLORS.sculpture, roughness: 0.62 }),
  ]);
  platform.name = 'Central_raised_rear_floor';
  platform.userData.walkable = true;
  platform.castShadow = platform.receiveShadow = true;
  model.add(platform);
  return { platform, rise: CENTRAL_STEP_RISE, removedDividers, raisedPieces, removedFloatingSeats: floatingSeats.length, removedFloatingSeatParts };
}
