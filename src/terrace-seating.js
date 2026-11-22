import * as THREE from 'three';
import { meshPieces, applyPieces } from './mesh-pieces.js';
import { captureChair, buildMixedSeating } from './mixed-seating.js';
import { PATH_Y, terraceHeight } from './space-levels.js';

export const TERRACE_DEPTH = 4;
export const PASSAGE_WIDTH = 1.2;
export const TERRACE_INNER = 31.2;
export const TERRACE_OUTER = TERRACE_INNER + TERRACE_DEPTH;

function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function nearest(point, items) {
  return items.reduce((best, item) => !best || distance(point, item.center) < distance(point, best.center) ? item : best, null);
}

export function arrangeTerraceSeating(meshes, model) {
  const cafeMeshes = meshes.filter(mesh => /^Cafe_Furniture__/.test(mesh.name));
  const plantMeshes = meshes.filter(mesh => /^Planting__/.test(mesh.name));
  const lampMeshes = meshes.filter(mesh => /^Luminaires__/.test(mesh.name));
  const byMesh = new Map([...cafeMeshes, ...plantMeshes, ...lampMeshes].map(mesh => [mesh, meshPieces(mesh)]));
  const cafe = cafeMeshes.flatMap(mesh => byMesh.get(mesh));
  const seats = cafe.filter(p => Math.abs(p.center.y - 2.49) < 0.015 && Math.abs(p.size.y - 0.11) < 0.015 && p.center.length() > 23 && Math.max(p.size.x, p.size.z) < 0.9);
  const backs = cafe.filter(p => Math.abs(p.center.y - 2.9) < 0.015 && Math.abs(p.size.y - 0.38) < 0.015);
  const chairs = seats.map(seat => {
    const back = nearest(seat.center, backs);
    if (!back || distance(seat.center, back.center) > 0.4) throw new Error('Chair back could not be matched.');
    const facing = seat.center.clone().sub(back.center).setY(0).normalize();
    const inward = seat.center.clone().setY(0).normalize().negate();
    return { center: seat.center.clone(), facing, remove: facing.dot(inward) < 0, parts: [] };
  });
  for (const part of cafe) {
    const height = part.size.y;
    const isChairPart = Math.abs(height - 0.11) < 0.015 || Math.abs(height - 0.38) < 0.015
      || Math.abs(height - 0.466) < 0.015 || Math.abs(height - 0.584) < 0.015;
    if (!isChairPart || part.bounds.min.y < 1.99) continue;
    const chair = nearest(part.center, chairs);
    if (chair && distance(part.center, chair.center) < 0.65) {
      chair.parts.push(part);
      part.remove = chair.remove;
    }
  }
  if (chairs.length !== 30 || chairs.some(chair => chair.parts.length !== 8)) throw new Error('Unexpected source chair assembly.');
  const chairTemplate = captureChair(chairs.find(chair => !chair.remove));

  const tables = lampMeshes.filter(mesh => /Golden_oak/.test(mesh.name)).map(mesh => ({
    center: new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()), parts: [], kind: 'table',
  }));
  for (const part of [...cafe, ...lampMeshes.flatMap(mesh => byMesh.get(mesh))]) {
    if (part.remove || Math.hypot(part.center.x, part.center.z) < 22.5 || part.bounds.min.y < 1.99) continue;
    const table = nearest(part.center, tables);
    if (table && distance(part.center, table.center) < 3.6) table.parts.push(part);
  }

  const plants = plantMeshes.flatMap(mesh => byMesh.get(mesh));
  const pots = plants.filter(part => /Warm_ivory/.test(part.mesh.name) && part.size.y > 0.3 && part.bounds.min.y < 2.01)
    .map(part => ({ center: part.center.clone(), parts: [], kind: 'planter' }));
  for (const part of plants) {
    const pot = nearest(part.center, pots);
    if (pot && Math.hypot(pot.center.x, pot.center.z) > 23.2) pot.parts.push(part);
  }

  const ottomanBases = cafe.filter(part => /Sofa_recessed/.test(part.mesh.name) && Math.abs(part.bounds.min.y - 1.71) < 0.005);
  const ottomans = ottomanBases.map(base => ({ center: base.center.clone(), parts: [], kind: 'ottoman', innerRadius: 27.2, outerRadius: 31.2 }));
  for (const part of cafe) {
    if (!/Sofa_recessed|Tangerine_ottoman|Sunflower_cushions/.test(part.mesh.name) || part.bounds.min.y < 1.7 || part.bounds.min.y > 1.8) continue;
    const ottoman = nearest(part.center, ottomans);
    if (ottoman && distance(part.center, ottoman.center) < 1) ottoman.parts.push(part);
  }
  // Replace the old terrace table sets with reference-style one-sided seating.
  for (const table of tables) for (const part of table.parts) part.remove = true;
  for (const chair of chairs) for (const part of chair.parts) part.remove = true;
  const groups = [...pots.filter(pot => pot.parts.length), ...ottomans];
  for (const group of groups) {
    const direction = group.center.clone().setY(0).normalize();
    let minProjection = Infinity;
    for (const part of group.parts) {
      const p = part.mesh.geometry.attributes.position;
      for (const i of part.vertices) minProjection = Math.min(minProjection, p.getX(i) * direction.x + p.getZ(i) * direction.z);
    }
    // Keep a 1.2m clear lane plus a 15cm buffer along the inner side of each set.
    const innerRadius = group.innerRadius ?? TERRACE_INNER;
    const outerLimit = group.outerRadius ?? TERRACE_OUTER;
    const shift = direction.multiplyScalar(innerRadius + PASSAGE_WIDTH + 0.15 - minProjection);
    shift.y = group.kind === 'ottoman' ? terraceHeight(2) - 1.71 : PATH_Y - 1.99;
    let outerRadius = 0;
    for (const part of group.parts) {
      const p = part.mesh.geometry.attributes.position;
      for (const i of part.vertices) {
        p.setX(i, p.getX(i) + shift.x); p.setY(i, p.getY(i) + shift.y); p.setZ(i, p.getZ(i) + shift.z);
        outerRadius = Math.max(outerRadius, Math.hypot(p.getX(i), p.getZ(i)));
      }
    }
    if (outerRadius > outerLimit - 0.1) throw new Error('Furniture exceeds the widened terrace.');
    group.translation = shift;
    group.outerRadius = outerRadius;
  }
  const obstacles = groups.map(group => {
    const bounds = new THREE.Box3();
    for (const part of group.parts) {
      const p = part.mesh.geometry.attributes.position;
      for (const i of part.vertices) bounds.expandByPoint(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    }
    const size = bounds.getSize(new THREE.Vector3());
    return { center: bounds.getCenter(new THREE.Vector3()), height: group.kind === 'ottoman' ? terraceHeight(2) : PATH_Y, radius: Math.hypot(size.x, size.z) / 2 };
  });
  // The original central dining cluster slightly overhung the first terrace's
  // lane. Move that intact cluster one metre inward to keep all three lanes clear.
  for (const part of cafe) {
    if (part.remove || part.center.x <= 9 || part.center.z <= 9) continue;
    const p = part.mesh.geometry.attributes.position;
    for (const i of part.vertices) { p.setX(i, p.getX(i) - 1); p.setZ(i, p.getZ(i) - 1); }
  }
  for (const [mesh, pieces] of byMesh) applyPieces(mesh, pieces);
  const mixed = buildMixedSeating(model, chairTemplate, obstacles);
  return {
    removedChairs: chairs.filter(chair => chair.remove).length,
    retainedChairs: mixed.seats.length,
    mixed,
    chairs: chairs.map(chair => ({ sourceCenter: chair.center.toArray(), inward: !chair.remove, parts: chair.parts.length })),
    groups: groups.map(group => ({ kind: group.kind, sourceCenter: group.center.toArray(), translation: group.translation.toArray(), outerRadius: group.outerRadius })),
  };
}
