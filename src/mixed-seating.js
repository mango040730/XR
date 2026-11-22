import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terraceHeight } from './space-levels.js';
import { CENTRAL_RADIUS, TERRACE_DEPTH } from './space-layout.js';

export const MIXED_TIERS = Array.from({ length: 3 }, (_, i) => ({
  inner: CENTRAL_RADIUS + TERRACE_DEPTH * i,
  outer: CENTRAL_RADIUS + TERRACE_DEPTH * (i + 1),
  height: terraceHeight(i + 1),
}));

// Rounded annular boards follow the exact curvature of each seating tier.
function arcBoard(inner, outer, start, end, bottom, height, bevel = 0.025) {
  const shape = new THREE.Shape();
  const point = (radius, angle) => [radius * Math.cos(angle), -radius * Math.sin(angle)];
  const segments = Math.max(16, Math.ceil((end - start) * outer * 8));
  shape.moveTo(...point(inner, start));
  for (let i = 1; i <= segments; i++) shape.lineTo(...point(inner, start + (end - start) * i / segments));
  shape.lineTo(...point(outer, end));
  for (let i = segments - 1; i >= 0; i--) shape.lineTo(...point(outer, start + (end - start) * i / segments));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 3, steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bottom + bevel, 0);
  return geometry;
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

export function buildMixedSeating(model, chairTemplate, obstacles) {
  const root = new THREE.Group(); root.name = 'Terrace_integrated_seating';
  const wood = chairTemplate.find(p => /Golden oak/.test(p.material.name)).material;
  const batches = new Map(), sets = [], seats = [];
  function add(geometry, material, transform = new THREE.Matrix4()) {
    const g = geometry.clone(); g.applyMatrix4(transform);
    g.deleteAttribute('uv');
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  }
  function board(inner, outer, start, end, bottom, height, bevel) {
    const g = arcBoard(inner, outer, start, end, bottom, height, bevel);
    add(g, wood); g.dispose();
  }
  // Stable irregular rhythm: short, long, medium and extra-long desks repeat
  // with a tier offset, rather than changing on reload or forming uniform rows.
  const rhythm = [1, 3, 2, 4, 2, 1, 4, 3, 1, 2, 3, 4];
  for (let tierIndex = 0; tierIndex < MIXED_TIERS.length; tierIndex++) {
    const tier = MIXED_TIERS[tierIndex];
    for (let slot = 0; slot < 12; slot++) {
      const capacity = rhythm[(slot + tierIndex * 3) % rhythm.length];
      const width = capacity * 1.6;
      const angle = THREE.MathUtils.degToRad(15 + slot * 30 + [0, -2, 2][tierIndex]);
      const radius = tier.inner + 0.49;
      const half = width / radius / 2;
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tangent = new THREE.Vector3(outward.z, 0, -outward.x);
      const center = outward.clone().multiplyScalar(radius); center.y = tier.height;
      const blocked = obstacles.some(o => {
        if (Math.abs(o.height - tier.height) > 0.15) return false;
        const relative = o.center.clone().sub(center);
        return Math.abs(relative.dot(tangent)) < width / 2 + o.radius + 0.4
          && Math.abs(relative.dot(outward) - 0.35) < 1.05 + o.radius + 0.4;
      });
      if (blocked) continue;
      const start = angle - half, end = angle + half;
      // Continuous wood top, low inner upstand, and joined end panels make
      // each desk a built-in piece along the front edge, with open knee room.
      board(tier.inner + 0.14, tier.inner + 0.84, start, end, tier.height + 0.70, 0.09);
      board(tier.inner + 0.14, tier.inner + 0.24, start, end, tier.height, 1.03);
      for (const edge of [start, end]) {
        board(tier.inner + 0.18, tier.inner + 0.80, edge - 0.035 / radius, edge + 0.035 / radius, tier.height, 0.74, 0.012);
      }
      const setId = `tier-${tierIndex + 1}-desk-${slot + 1}`;
      const type = capacity === 1 ? 'single' : 'shared';
      for (let chair = 0; chair < capacity; chair++) {
        const chairAngle = angle + (chair - (capacity - 1) / 2) * 1.6 / radius;
        const direction = new THREE.Vector3(Math.cos(chairAngle), 0, Math.sin(chairAngle));
        const along = new THREE.Vector3(direction.z, 0, -direction.x);
        const position = direction.clone().multiplyScalar(tier.inner + 1.22); position.y = tier.height;
        const matrix = new THREE.Matrix4().makeBasis(along, new THREE.Vector3(0, 1, 0), direction);
        matrix.setPosition(position);
        for (const part of chairTemplate) add(part.geometry, part.material, matrix);
        seats.push({ setId, tier: tierIndex, type, position: position.toArray(), facing: direction.clone().negate().toArray() });
      }
      sets.push({ id: setId, tier: tierIndex, type, width, capacity, center: center.toArray(), outward: outward.toArray(), start, end, inner: tier.inner + 0.14, outer: tier.inner + 0.84, integrated: true });
    }
  }
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(parts, false), material);
    mesh.name = `Cafe_Furniture__Integrated_${material.name.replaceAll(' ', '_')}`;
    mesh.userData.mixedSeating = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh); parts.forEach(part => part.dispose());
  }
  chairTemplate.forEach(part => part.geometry.dispose());
  model.add(root);
  return { root, sets, seats, singleSets: sets.filter(s => s.type === 'single').length, sharedSets: sets.filter(s => s.type === 'shared').length };
}
