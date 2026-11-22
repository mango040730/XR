import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { terraceHeight } from './space-levels.js';

export const MIXED_TIERS = [
  { inner: 23.2, outer: 27.2, height: terraceHeight(1) },
  { inner: 27.2, outer: 31.2, height: terraceHeight(2) },
  { inner: 31.2, outer: 35.2, height: terraceHeight(3) },
];

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
  const root = new THREE.Group(); root.name = 'Terrace_mixed_seating';
  const wood = chairTemplate.find(p => /Golden oak/.test(p.material.name)).material;
  const top = chairTemplate.find(p => !/Golden oak/.test(p.material.name)).material;
  const ceramic = new THREE.MeshStandardMaterial({ name: 'Porcelain and sign lettering', color: '#eee7db', roughness: 0.85 });
  const coffee = new THREE.MeshStandardMaterial({ name: 'Soft coffee clay', color: '#92745a', roughness: 0.9 });
  const batches = new Map(), sets = [], seats = [];
  function add(geometry, material, transform) {
    const g = geometry.clone(); g.applyMatrix4(transform);
    g.deleteAttribute('uv');
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  }
  function local(geometry, material, matrix, x, y, z) {
    add(geometry, material, matrix.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)));
  }
  const singleTop = new RoundedBoxGeometry(1.1, 0.09, 0.75, 3, 0.04);
  const sharedTop = new RoundedBoxGeometry(3.5, 0.09, 0.75, 3, 0.04);
  const sharedApron = new RoundedBoxGeometry(3.25, 0.1, 0.55, 3, 0.025);
  const leg = new THREE.CylinderGeometry(0.045, 0.035, 0.67, 20);
  const pedestal = new THREE.CylinderGeometry(0.07, 0.085, 0.61, 24);
  const foot = new THREE.CylinderGeometry(0.27, 0.3, 0.06, 32);
  const cup = new THREE.CylinderGeometry(0.065, 0.055, 0.09, 24);
  const drink = new THREE.CylinderGeometry(0.051, 0.051, 0.003, 24);
  const handle = new THREE.TorusGeometry(0.03, 0.008, 8, 20); handle.rotateY(Math.PI / 2);
  const saucer = new THREE.CylinderGeometry(0.085, 0.075, 0.012, 24);

  for (let tierIndex = 0; tierIndex < MIXED_TIERS.length; tierIndex++) {
    const tier = MIXED_TIERS[tierIndex];
    for (let slot = 0; slot < 12; slot++) {
      const angle = THREE.MathUtils.degToRad(15 + slot * 30 + [0, -3, 3][tierIndex]);
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tangent = new THREE.Vector3(outward.z, 0, -outward.x);
      const center = outward.clone().multiplyScalar(tier.inner + 1.75); center.y = tier.height;
      const type = (slot + tierIndex) % 2 === 0 ? 'single' : 'shared';
      const width = type === 'single' ? 1.1 : 3.5;
      // Reserve an envelope for the table and its single outward-side chair row.
      const blocked = obstacles.some(o => {
        if (Math.abs(o.height - tier.height) > 0.15) return false;
        const relative = o.center.clone().sub(center);
        return Math.abs(relative.dot(tangent)) < width / 2 + o.radius + 0.4
          && Math.abs(relative.dot(outward) - 0.35) < 1.05 + o.radius + 0.4;
      });
      if (blocked) continue;
      const matrix = new THREE.Matrix4().makeBasis(tangent, new THREE.Vector3(0, 1, 0), outward);
      matrix.setPosition(center);
      const setId = `tier-${tierIndex + 1}-set-${slot + 1}`;
      const seatX = type === 'single' ? [0] : [-1.1, 0, 1.1];
      local(type === 'single' ? singleTop : sharedTop, top, matrix, 0, 0.715, 0);
      if (type === 'single') {
        local(pedestal, wood, matrix, 0, 0.365, 0);
        local(foot, wood, matrix, 0, 0.03, 0);
      } else {
        local(sharedApron, wood, matrix, 0, 0.625, 0);
        for (const x of [-1.5, 1.5]) for (const z of [-0.24, 0.24]) local(leg, wood, matrix, x, 0.335, z);
      }
      for (const x of seatX) {
        const chairMatrix = matrix.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, 0.78));
        for (const part of chairTemplate) add(part.geometry, part.material, chairMatrix);
        const position = new THREE.Vector3().setFromMatrixPosition(chairMatrix);
        seats.push({ setId, tier: tierIndex, type, position: position.toArray(), facing: outward.clone().negate().toArray() });
        local(saucer, ceramic, matrix, x - 0.1, 0.766, -0.07);
        local(cup, ceramic, matrix, x - 0.1, 0.815, -0.07);
        local(drink, coffee, matrix, x - 0.1, 0.8605, -0.07);
        local(handle, ceramic, matrix, x - 0.035, 0.817, -0.07);
      }
      sets.push({ id: setId, tier: tierIndex, type, width, capacity: seatX.length, center: center.toArray(), outward: outward.toArray() });
    }
  }
  for (const [material, parts] of batches) {
    const geometry = mergeGeometries(parts, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Cafe_Furniture__Mixed_${material.name.replaceAll(' ', '_')}`;
    mesh.userData.mixedSeating = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh); parts.forEach(part => part.dispose());
  }
  for (const geometry of [singleTop, sharedTop, sharedApron, leg, pedestal, foot, cup, drink, handle, saucer]) geometry.dispose();
  chairTemplate.forEach(part => part.geometry.dispose());
  model.add(root);
  return { root, sets, seats, singleSets: sets.filter(s => s.type === 'single').length, sharedSets: sets.filter(s => s.type === 'shared').length };
}
