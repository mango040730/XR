import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { terraceHeight } from './space-levels.js';
import { CENTRAL_RADIUS, TERRACE_DEPTH } from './space-layout.js';
import { ACCESS_HALF_ANGLE, ACCESS_DIRECTIONS } from './joined-stairs.js';
import { createDeskWoodMaterial, mapCurvedWood } from './wood-desks.js';
import { SPACE_COLORS } from './space-colors.js';
import { createGlossDeskMaterial, createPillDeskParts } from './terrace-pill-desk.js';

export const SEATED_TIER_COUNT = 2;
export const DESK_BEVEL_SEGMENTS = 12;

export const MIXED_TIERS = Array.from({ length: 3 }, (_, i) => ({
  inner: CENTRAL_RADIUS + TERRACE_DEPTH * i,
  outer: CENTRAL_RADIUS + TERRACE_DEPTH * (i + 1),
  height: terraceHeight(i + 1),
}));

// Rounded annular boards follow the exact curvature of each seating tier.
function arcBoard(inner, outer, start, end, bottom, height, bevel = 0.035) {
  const shape = new THREE.Shape();
  const point = (radius, angle) => [radius * Math.cos(angle), -radius * Math.sin(angle)];
  const segments = Math.max(16, Math.ceil((end - start) * outer * 4));
  shape.moveTo(...point(inner, start));
  for (let i = 1; i <= segments; i++) shape.lineTo(...point(inner, start + (end - start) * i / segments));
  shape.lineTo(...point(outer, end));
  for (let i = segments - 1; i >= 0; i--) shape.lineTo(...point(outer, start + (end - start) * i / segments));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: DESK_BEVEL_SEGMENTS, steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bottom + bevel, 0);
  const smooth = toCreasedNormals(geometry, Math.PI / 3);
  if (smooth !== geometry) geometry.dispose();
  return smooth;
}

export function captureChair(chair) {
  const zAxis = chair.facing.clone().negate(), xAxis = new THREE.Vector3(zAxis.z, 0, -zAxis.x);
  const bottom = Math.min(...chair.parts.map(part => part.bounds.min.y));
  return chair.parts.map(part => {
    const source = part.mesh.geometry.attributes.position, vertices = [];
    for (const index of part.faces) {
      const x = source.getX(index) - chair.center.x, z = source.getZ(index) - chair.center.z;
      vertices.push(x * xAxis.x + z * xAxis.z, source.getY(index) - bottom, x * zAxis.x + z * zAxis.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(Array.from({ length: vertices.length / 3 }, (_, i) => i));
    geometry.computeVertexNormals();
    return { geometry, material: part.mesh.material };
  });
}

// Subtract stair corridors and nearby planters, then fill each remaining arc.
function deskIntervals(tier, obstacles) {
  const radius = tier.inner + 0.49;
  const clearance = ACCESS_HALF_ANGLE + 0.45 / radius;
  let intervals = ACCESS_DIRECTIONS.map(a => [a + clearance, a + Math.PI / 2 - clearance]);
  for (const obstacle of obstacles) {
    if (Math.abs(obstacle.height - tier.height) > 0.15) continue;
    const r = Math.hypot(obstacle.center.x, obstacle.center.z), padded = obstacle.radius + 0.4;
    if (r - padded > tier.inner + 1.7 || r + padded < tier.inner + 0.1) continue;
    const angle = Math.atan2(obstacle.center.z, obstacle.center.x);
    const half = Math.asin(Math.min(1, padded / r));
    for (const wrap of [-Math.PI * 2, 0, Math.PI * 2]) {
      const start = angle + wrap - half, end = angle + wrap + half;
      intervals = intervals.flatMap(([a, b]) => end <= a || start >= b ? [[a, b]]
        : [[a, Math.min(start, b)], [Math.max(end, a), b]].filter(([x, y]) => y > x));
    }
  }
  return intervals.filter(([start, end]) => (end - start) * radius >= 2);
}

export function buildMixedSeating(model, chairTemplate, obstacles, { tiers = MIXED_TIERS, chairOffset = 1.22, deskStyle = 'integrated' } = {}) {
  const root = new THREE.Group(); root.name = 'Terrace_integrated_seating';
  const wood = deskStyle === 'pill' ? createGlossDeskMaterial() : createDeskWoodMaterial();
  const chairMaterials = new Map();
  for (const part of chairTemplate) {
    if (chairMaterials.has(part.material)) continue;
    if (part.material.userData.terraceChair) { chairMaterials.set(part.material, part.material); continue; }
    const material = part.material.clone();
    const frame = /Golden oak/.test(part.material.name);
    material.name = frame ? 'Terrace chair gold frame' : 'Terrace chair gold seat';
    material.color.set(SPACE_COLORS.terraceFurniture);
    chairMaterials.set(part.material, material);
  }
  const batches = new Map(), sets = [], seats = [];
  function add(geometry, material, transform = new THREE.Matrix4()) {
    const g = geometry.clone(); g.applyMatrix4(transform);
    if (!material.userData.terraceWood && !material.userData.terraceChair) g.deleteAttribute('uv');
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  }
  function board(inner, outer, start, end, bottom, height, bevel) {
    const g = arcBoard(inner, outer, start, end, bottom, height, bevel);
    mapCurvedWood(g, start, end, (inner + outer) / 2, inner);
    add(g, wood); g.dispose();
  }
  // Close-spaced 1–4-person desks, staggered in a stable irregular rhythm.
  const rhythm = [1, 4, 2, 3, 2, 4, 1, 3, 4, 2, 1, 3];
  const clearIntervals = [];
  for (let tierIndex = 0; tierIndex < SEATED_TIER_COUNT; tierIndex++) {
    const tier = tiers[tierIndex];
    const radius = tier.inner + 0.49;
    const intervals = deskIntervals(tier, obstacles);
    clearIntervals.push(intervals);
    let slot = 0;
    for (let section = 0; section < intervals.length; section++) {
      const [a, b] = intervals[section];
      const length = (b - a) * radius;
      const count = Math.max(1, Math.round(length / 5.5));
      const gap = 0.35;
      const weights = Array.from({ length: count }, (_, i) => rhythm[(i + section + tierIndex) % rhythm.length]);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let cursor = a;
      for (const weight of weights) {
        const width = (length - gap * (count - 1)) * weight / totalWeight;
        const start = cursor, end = cursor + width / radius;
        cursor = end + gap / radius;
        const angle = (start + end) / 2;
        const capacity = weight;
        const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const center = outward.clone().multiplyScalar(radius); center.y = tier.height;
        slot++;
        if (deskStyle === 'pill') {
          for (const part of createPillDeskParts({ inner: tier.inner, start, end, floorY: tier.height })) {
            add(part, wood); part.dispose();
          }
        } else {
          board(tier.inner + 0.14, tier.inner + 0.84, start, end, tier.height + 0.70, 0.09);
          board(tier.inner + 0.14, tier.inner + 0.24, start, end, tier.height, 1.03);
          for (const edge of [start, end]) {
            board(tier.inner + 0.18, tier.inner + 0.80, edge - 0.035 / radius, edge + 0.035 / radius, tier.height, 0.74, 0.012);
          }
        }
        const setId = `tier-${tierIndex + 1}-desk-${slot}`;
        const type = capacity === 1 ? 'single' : 'shared';
        for (let chair = 0; chair < capacity; chair++) {
          const chairAngle = angle + (chair - (capacity - 1) / 2) * (width / capacity) / radius;
          const direction = new THREE.Vector3(Math.cos(chairAngle), 0, Math.sin(chairAngle));
          const along = new THREE.Vector3(direction.z, 0, -direction.x);
          const position = direction.clone().multiplyScalar(tier.inner + chairOffset); position.y = tier.height;
          const matrix = new THREE.Matrix4().makeBasis(along, new THREE.Vector3(0, 1, 0), direction);
          matrix.setPosition(position);
          for (const part of chairTemplate) add(part.geometry, chairMaterials.get(part.material), matrix);
          seats.push({ setId, tier: tierIndex, type, position: position.toArray(), facing: direction.clone().negate().toArray() });
        }
        sets.push({ id: setId, tier: tierIndex, type, width, capacity, center: center.toArray(), outward: outward.toArray(), start, end, inner: tier.inner + 0.14, outer: tier.inner + 0.84, integrated: deskStyle !== 'pill', wooden: deskStyle !== 'pill', deskStyle });
      }
    }
  }
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(parts, false), material);
    mesh.name = material.userData.terraceDesk ? 'Terrace_gloss_desks' : material.userData.terraceWood ? 'Terrace_wood_desks' : material.userData.terraceChair ? 'Terrace_round_chairs' : `Cafe_Furniture__Integrated_${material.name.replaceAll(' ', '_')}`;
    mesh.userData.mixedSeating = true;
    if (material.userData.terraceWood) mesh.userData.woodenDesks = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh); parts.forEach(part => part.dispose());
  }
  chairTemplate.forEach(part => part.geometry.dispose());
  model.add(root);
  return { root, sets, seats, clearIntervals, singleSets: sets.filter(s => s.type === 'single').length, sharedSets: sets.filter(s => s.type === 'shared').length };
}
