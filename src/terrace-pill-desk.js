import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SPACE_COLORS } from './space-colors.js';

export function createGlossDeskMaterial() {
  const material = new THREE.MeshPhysicalMaterial({ name: 'Terrace golden gloss lacquer', color: SPACE_COLORS.terraceFurniture,
    roughness: 0.19, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, specularIntensity: 0.65, envMapIntensity: 0.85 });
  material.userData.terraceDesk = true;
  return material;
}

// Subdivided flat caps stay planar after bending; long triangulated polygons
// would otherwise span the curve as chords and leave visible gaps.
function capsuleTop(length, radius, angle, floorY) {
  const half = length / 2 - 0.35, positions = [], indices = [];
  const rows = [], cuts = Math.max(1, Math.ceil(half * 2 / 0.12)), across = 8;
  for (let i = 0; i <= 16; i++) rows.push({ end: -1, t: i * Math.PI / 32 });
  for (let i = 1; i <= cuts; i++) rows.push({ x: -half + i / cuts * half * 2 });
  for (let i = 1; i <= 16; i++) rows.push({ end: 1, t: i * Math.PI / 32 });
  function point(row, r) {
    if (row.end === -1) return [-half - Math.cos(row.t) * r, Math.sin(row.t) * r];
    if (row.end === 1) return [half + Math.sin(row.t) * r, Math.cos(row.t) * r];
    return [row.x, r];
  }
  for (const top of [false, true]) {
    const base = positions.length / 3;
    for (let i = 0; i < rows.length; i++) {
      const [x, h] = point(rows[i], 0.325);
      for (let j = 0; j <= across; j++) {
        positions.push(x, floorY + (top ? 0.79 : 0.715), h * (j / across * 2 - 1));
        if (i && j) {
          const c = base + i * (across + 1) + j, b = c - across - 1;
          indices.push(...(top ? [b - 1, b, c, b - 1, c, c - 1] : [b - 1, c, b, b - 1, c - 1, c]));
        }
      }
    }
  }
  const boundary = [...rows.map(row => [row, 1]), ...rows.slice(1, -1).reverse().map(row => [row, -1])];
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 24;
    profile.push([0.025 - Math.cos(a) * 0.025, 0.74 + Math.sin(a) * 0.025]);
  }
  for (let i = 0; i <= 12; i++) {
    const a = i * Math.PI / 24;
    profile.push([0.025 - Math.cos(a) * 0.025, 0.765 + Math.sin(a) * 0.025]);
  }
  const base = positions.length / 3, count = boundary.length;
  for (let i = 0; i < profile.length; i++) {
    const [inset, y] = profile[i];
    for (let j = 0; j < count; j++) {
      const [row, side] = boundary[j], [x, h] = point(row, 0.35 - inset);
      positions.push(x, floorY + y, h * side);
      if (i) {
        const a = base + (i - 1) * count + j, b = base + (i - 1) * count + (j + 1) % count;
        indices.push(a, b, a + count, b, b + count, a + count);
      }
    }
  }
  const raw = new THREE.BufferGeometry(); raw.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); raw.setIndex(indices);
  const p = raw.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = angle - p.getX(i) / radius, r = radius + p.getZ(i);
    p.setXYZ(i, Math.cos(a) * r, p.getY(i), Math.sin(a) * r);
  }
  const geometry = mergeVertices(raw, 0.000001); raw.dispose(); geometry.computeVertexNormals(); return geometry;
}

// A capsule tabletop and two thick, softly rounded transverse slab legs.
export function createPillDeskParts({ inner, start, end, floorY }) {
  const radius = inner + 0.49, angle = (start + end) / 2, length = (end - start) * radius;
  const top = capsuleTop(length, radius, angle, floorY);
  const legs = [];
  const inset = Math.max(0.32, length * 0.13);
  for (const sign of [-1, 1]) {
    const a = angle + sign * (length / 2 - inset) / radius;
    const geometry = new RoundedBoxGeometry(0.16, 0.725, 0.52, 8, 0.075);
    // Local X follows the arc, local Z points outwards.
    geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
      .setPosition(Math.cos(a) * radius, floorY + 0.3625, Math.sin(a) * radius));
    legs.push(geometry);
  }
  return [top, ...legs];
}
