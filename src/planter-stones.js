import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { meshPieces } from './mesh-pieces.js';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';

const COLORS = ['#b6a58d', '#92978c', '#aaa797', '#c5bba7', '#a5a495'];
function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function insideStone(x, z, stone, margin = 1) {
  const dx = x - stone.x, dz = z - stone.z;
  const a = dx * Math.cos(stone.angle) + dz * Math.sin(stone.angle);
  const b = -dx * Math.sin(stone.angle) + dz * Math.cos(stone.angle);
  return (a / (stone.rx * margin)) ** 2 + (b / (stone.rz * margin)) ** 2 <= 1;
}

// Fill the actual soil polygons, not their rectangular bounding boxes. The
// existing large stones remain; smaller rounded stones interlock around them.
export function fillPlanterStones(model, botanical) {
  const source = [];
  model.traverse(m => { if (m.isMesh && /^(Planting|Cafe_Furniture)__/.test(m.name)) source.push(m); });
  const soils = source.filter(m => /Planter dark soil/.test(m.material.name)).flatMap(m => meshPieces(m));
  const existing = source.filter(m => /River pebble/.test(m.material.name)).flatMap(m => meshPieces(m));
  for (const mesh of new Set(soils.map(s => s.mesh))) {
    computeBoundsTree.call(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  }
  const template = new THREE.SphereGeometry(1, 32, 16);
  const positions = template.attributes.position, normals = template.attributes.normal;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const variation = 1 + 0.025 * x * z + 0.02 * y * x;
    positions.setXYZ(i, x * variation, y * variation, z * variation);
    normals.setXYZ(i, x, y, z);
  }
  const parts = [], plots = [], stones = [];
  soils.forEach((soil, plotIndex) => {
    const rand = random(91357 + plotIndex * 797), bounds = soil.bounds;
    const cafe = /^Cafe_Furniture/.test(soil.mesh.name), y = bounds.max.y;
    const pitch = cafe ? 0.065 : THREE.MathUtils.clamp(Math.min(soil.size.x, soil.size.z) * 0.14, 0.24, 0.36);
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 0.25);
    ray.firstHitOnly = true;
    function soilAt(x, z) {
      if (x < bounds.min.x || x > bounds.max.x || z < bounds.min.z || z > bounds.max.z) return false;
      ray.ray.origin.set(x, y + 0.12, z);
      return ray.intersectObject(soil.mesh, false).some(h => Math.abs(h.point.y - y) < 0.025);
    }
    const blockers = existing.filter(p => Math.abs(p.bounds.min.y - y) < 0.25 && p.center.x >= bounds.min.x && p.center.x <= bounds.max.x && p.center.z >= bounds.min.z && p.center.z <= bounds.max.z)
      .map(p => ({ x: p.center.x, z: p.center.z, rx: p.size.x / 2, rz: p.size.z / 2, angle: 0 }));
    const planted = botanical.roots.filter(r => r.plot === plotIndex).map(r => r.point);
    for (const leaf of botanical.leaves.filter(l => l.plot === plotIndex && l.kind === 'underplant')) {
      if (!planted.some(p => Math.hypot(p.x - leaf.base.x, p.z - leaf.base.z) < 0.02)) planted.push(leaf.base);
    }
    if (cafe) planted.push(new THREE.Vector3(soil.center.x, y, soil.center.z));
    const local = [];
    function rootClear(x, z, rx, rz) {
      const r = Math.max(rx, rz) + (cafe ? 0.012 : 0.025);
      return planted.every(p => Math.hypot(x - p.x, z - p.z) > r);
    }
    function add(x, z, scale = 1) {
      if (!soilAt(x, z) || blockers.some(s => insideStone(x, z, s, 0.9)) || local.some(s => insideStone(x, z, s, scale < 1 ? 0.95 : 0.58))) return false;
      const angle = rand() * Math.PI * 2;
      let rx = pitch * (0.56 + rand() * 0.13) * scale, rz = rx * (0.82 + rand() * 0.3);
      let fits = false;
      for (let attempt = 0; attempt < 7; attempt++) {
        fits = rootClear(x, z, rx, rz);
        for (let i = 0; fits && i < 12; i++) {
          const a = i * Math.PI / 6;
          const px = rx * 1.035 * Math.cos(a), pz = rz * 1.035 * Math.sin(a);
          fits = soilAt(x + px * Math.cos(angle) - pz * Math.sin(angle), z + px * Math.sin(angle) + pz * Math.cos(angle));
        }
        if (fits) break;
        rx *= 0.8; rz *= 0.8;
      }
      if (!fits || rx < pitch * 0.12) return false;
      const ry = Math.min(rx, rz) * (0.58 + rand() * 0.2);
      const stone = { x, z, rx, rz, ry, angle, y: y + ry * (0.6 + rand() * 0.18), plot: plotIndex };
      const geometry = template.clone();
      geometry.scale(rx, ry, rz); geometry.rotateY(-angle); geometry.translate(x, stone.y, z);
      const color = new THREE.Color(COLORS[Math.floor(rand() * COLORS.length)]), colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < geometry.attributes.position.count; i++) color.toArray(colors, i * 3);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      parts.push(geometry); local.push(stone); stones.push(stone);
      return true;
    }
    const rowSpacing = pitch * Math.sqrt(3) / 2;
    for (let row = 0, z = bounds.min.z + pitch * 0.22; z < bounds.max.z; row++, z += rowSpacing) {
      for (let x = bounds.min.x + pitch * (row % 2 ? 0.72 : 0.22); x < bounds.max.x; x += pitch) {
        add(x + (rand() - 0.5) * pitch * 0.14, z + (rand() - 0.5) * pitch * 0.14);
      }
    }
    // Add smaller stones in the remaining pockets and along curved planter rims.
    for (let z = bounds.min.z + pitch * 0.16; z < bounds.max.z; z += pitch * 0.46) {
      for (let x = bounds.min.x + pitch * 0.16; x < bounds.max.x; x += pitch * 0.46) {
        if (soilAt(x, z) && ![...blockers, ...local].some(s => insideStone(x, z, s))) add(x, z, 0.58);
      }
    }
    for (let z = bounds.min.z + pitch * 0.17; z < bounds.max.z; z += pitch * 0.31) {
      for (let x = bounds.min.x + pitch * 0.17; x < bounds.max.x; x += pitch * 0.31) {
        if (soilAt(x, z) && ![...blockers, ...local].some(s => insideStone(x, z, s))) add(x, z, 0.4);
      }
    }
    let samples = 0, covered = 0;
    for (let z = bounds.min.z + pitch * 0.13; z < bounds.max.z; z += pitch * 0.27) {
      for (let x = bounds.min.x + pitch * 0.13; x < bounds.max.x; x += pitch * 0.27) {
        if (!soilAt(x, z) || planted.some(p => Math.hypot(x - p.x, z - p.z) < (cafe ? 0.025 : 0.055))) continue;
        samples++;
        if ([...blockers, ...local].some(s => insideStone(x, z, s, 1.02))) covered++;
      }
    }
    plots.push({ center: soil.center.toArray(), cafe, soilY: y, bounds: bounds.clone(), stones: local.length, existing: blockers.length, coverage: covered / samples, samples });
  });
  template.dispose();
  const geometry = mergeGeometries(parts, false);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = new THREE.MeshPhysicalMaterial({ name: 'Rounded clay pebble bedding', color: '#ffffff', vertexColors: true,
    roughness: 0.76, specularIntensity: 0.32, clearcoat: 0.06, clearcoatRoughness: 0.6 });
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Planter_pebble_bedding';
  mesh.castShadow = mesh.receiveShadow = true;
  model.add(mesh); parts.forEach(p => p.dispose());
  return { mesh, plots, stones, triangles: geometry.index.count / 3 };
}
