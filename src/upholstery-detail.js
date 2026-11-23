import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPACE_COLORS } from './space-colors.js';

export const WELT_CURVE_SEGMENTS = 64;
export const WELT_RADIAL_SEGMENTS = 12;

export function isUpholstery(piece) {
  return /^Lounge_Pods__/.test(piece.mesh.name) && /upholstery|cushion|fabric|ottoman/.test(piece.mesh.material.name);
}

// Save the real upper cap outline before subdivision. Its vertex indices stay
// stable, so the welt will follow the softened cushion rather than a box proxy.
export function seatOutline(piece) {
  if (!/Terracotta coral/.test(piece.mesh.material.name) || piece.bounds.max.y - piece.bounds.min.y > 0.3) return null;
  const edges = new Map();
  for (let i = 0; i < piece.faces.length; i += 3) {
    const triangle = piece.faces.slice(i, i + 3);
    if (!triangle.every(id => Math.abs(piece.vertices[id].y - piece.bounds.max.y) < 0.00001)) continue;
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3], key = a < b ? `${a},${b}` : `${b},${a}`;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [a, b]);
    }
  }
  const remaining = [...edges.values()];
  if (remaining.length < 4) return null;
  const loop = [...remaining.shift()];
  while (remaining.length) {
    const last = loop.at(-1), i = remaining.findIndex(e => e.includes(last));
    if (i < 0) return null;
    const [a, b] = remaining.splice(i, 1)[0], next = a === last ? b : a;
    if (next === loop[0]) break;
    loop.push(next);
  }
  return loop;
}

export function crownCushion(piece) {
  if (!isUpholstery(piece)) return;
  const size = piece.bounds.getSize(new THREE.Vector3()), center = piece.bounds.getCenter(new THREE.Vector3());
  // A restrained convex crown replaces broad flat seat faces. The existing
  // component envelope is restored by the caller; seat heights do not change.
  if (size.y < 0.35) {
    for (const v of piece.vertices) {
      const x = (v.x - center.x) / (size.x * 0.5), z = (v.z - center.z) / (size.z * 0.5);
      const y = (v.y - center.y) / (size.y * 0.5);
      const falloff = Math.max(0, 1 - x * x) * Math.max(0, 1 - z * z);
      if (Math.abs(y) > 0.65) v.y += Math.sign(y) * 0.022 * falloff;
    }
  }
}

export function addSeatWelting(model, pieces) {
  const parts = [];
  for (const piece of pieces) {
    if (!piece.seatOutline) continue;
    const points = piece.seatOutline.map(i => piece.vertices[i].clone().add(new THREE.Vector3(0, 0.001, 0)));
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    parts.push(new THREE.TubeGeometry(curve, WELT_CURVE_SEGMENTS, 0.006, WELT_RADIAL_SEGMENTS, true));
  }
  if (!parts.length) return { seats: 0, triangles: 0 };
  const geometry = mergeGeometries(parts, false);
  const material = new THREE.MeshPhysicalMaterial({
    name: 'Coral upholstery self-colour welting', color: SPACE_COLORS.coral,
    roughness: 0.72, sheen: 0.4, sheenRoughness: 0.85, clearcoat: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Sofa_seat_tailored_welting';
  mesh.userData.seatWelting = true;
  mesh.castShadow = mesh.receiveShadow = true;
  model.add(mesh);
  parts.forEach(p => p.dispose());
  return { seats: parts.length, triangles: geometry.index.count / 3 };
}
