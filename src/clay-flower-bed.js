import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, UP = new THREE.Vector3(0, 1, 0);
const petalsMaterial = new THREE.MeshPhysicalMaterial({ name: 'Clay pastel garden flowers', color: '#ffffff', vertexColors: true,
  roughness: 0.81, clearcoat: 0.05, clearcoatRoughness: 0.7, specularIntensity: 0.3 });
const centreMaterial = new THREE.MeshPhysicalMaterial({ name: 'Clay garden yellow centres', color: '#f4d52b',
  roughness: 0.78, clearcoat: 0.05, clearcoatRoughness: 0.7, specularIntensity: 0.3 });
export const GARDEN_PALETTE = { bud: '#d9b8c7', blush: '#e8bdca', pink: '#efc4cf', peach: '#eaa080', butter: '#f3dc91', lemon: '#f2df80' };

function add(root, name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.userData.clay = true;
  mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function tint(geometry, color) {
  const values = new Float32Array(geometry.attributes.position.count * 3), c = new THREE.Color(color);
  for (let i = 0; i < geometry.attributes.position.count; i++) c.toArray(values, i * 3);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); return geometry;
}
function ellipsoid(root, name, centre, scale, material, axes = null, color = null) {
  const geometry = new THREE.SphereGeometry(1, 32, 20);
  const matrix = axes ? new THREE.Matrix4().makeBasis(...axes) : new THREE.Matrix4();
  matrix.scale(scale).setPosition(centre); geometry.applyMatrix4(matrix);
  if (color) tint(geometry, color);
  return add(root, name, geometry, material);
}
function axesFor(direction) {
  const across = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  return [across, direction, across.clone().cross(direction).normalize()];
}
function stem(root, points, radius, material) {
  return add(root, 'Clay_garden_stem', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, radius, 16, false), material);
}
function blade(root, base, direction, length, widthRatio, green, material) {
  const source = new THREE.SphereGeometry(1, 32, 24), p = source.attributes.position;
  source.deleteAttribute('normal'); source.deleteAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i), ny = p.getY(i), nz = p.getZ(i), t = (ny + 1) / 2;
    p.setXYZ(i, nx * length * widthRatio, t * length, nz * length * 0.045 + length * 0.07 * t * t);
  }
  const geometry = mergeVertices(source, 0.00001); source.dispose(); geometry.computeVertexNormals(); tint(geometry, green);
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(...axesFor(direction)).setPosition(base));
  return add(root, 'Clay_upright_garden_leaf', geometry, material);
}

// A wide, low silhouette matching the reference's green mounds, upright leaves,
// closed tulip buds, cupped blooms, and three daisy-like flower heads.
export function createClayFlowerBed(root, { width, depth, x, z, soilY, height, roots, materials, seed }) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const small = width < 0.6, H = Math.min(height, width * 0.5), spread = width * 0.445;
  const patterns = [
    ['cup', 'butter', -0.59, 0.83, -0.12, 0.105],
    ['bud', 'bud', -0.95, 0.56, 0.03, 0.060], ['bud', 'blush', -0.77, 0.60, 0.06, 0.064],
    ['daisy', 'pink', -0.59, 0.43, 0.20, 0.125], ['cup', 'peach', -0.18, 0.58, 0.01, 0.088],
    ['cup', 'peach', -0.38, 0.25, 0.25, 0.060],
    ['bud', 'bud', 0.18, 0.51, 0.05, 0.069], ['bud', 'blush', 0.30, 0.47, 0.17, 0.061],
    ['daisy', 'lemon', 0.69, 0.77, -0.08, 0.105], ['daisy', 'pink', 0.57, 0.44, 0.17, 0.080],
    ['bud', 'lemon', 0.96, 0.53, 0.03, 0.064],
  ];
  const chosen = small ? [patterns[0], patterns[2], patterns[3], patterns[8], patterns[10]] : patterns;
  const flowers = [], blades = [], mounds = [];
  for (const [px, pz, w, h, d, green] of [
    [-0.79, 0.18, 0.13, 0.25, 0.34, '#4e713b'], [-0.49, 0.36, 0.13, 0.22, 0.31, '#73924a'],
    [0.07, 0.10, 0.23, 0.24, 0.30, '#64813f'], [0.42, 0.32, 0.12, 0.22, 0.30, '#849d55'],
    [0.80, 0.05, 0.12, 0.27, 0.34, '#6f8a45'],
  ]) {
    const centre = new THREE.Vector3(x + px * spread, soilY + H * h * 0.35, z + pz * depth * 0.3);
    const scale = new THREE.Vector3(width * w, H * h * 0.65, depth * d);
    ellipsoid(root, 'Clay_rounded_green_mound', centre, scale, materials.leaf, null, green);
    mounds.push({ centre: centre.toArray(), scale: scale.toArray() });
  }
  for (let i = 0; i < chosen.length; i++) {
    const [type, palette, px, py, pz, size] = chosen[i], radius = H * size;
    const anchor = new THREE.Vector3(x + px * spread, soilY + H * py, z + pz * Math.min(depth * 0.35, H * 0.3));
    const rx = roots.reduce((best, r) => Math.abs(x + r - anchor.x) < Math.abs(x + best - anchor.x) ? r : best);
    const base = new THREE.Vector3(x + rx * 0.70, soilY, z);
    stem(root, [base, base.clone().lerp(anchor, 0.5).add(new THREE.Vector3(H * 0.015, 0, -H * 0.025)), anchor], small ? 0.004 : 0.009, materials.stem);
    let centre = anchor.clone(), normal = new THREE.Vector3(0.03, 0.4, 1).normalize(), petals = 0;
    if (type === 'daisy') {
      normal = new THREE.Vector3(-0.05 + random() * 0.1, palette === 'lemon' ? 0.85 : 0.30, 0.85).normalize();
      const across = UP.clone().cross(normal).normalize(), upright = normal.clone().cross(across).normalize();
      petals = palette === 'lemon' ? 12 : 10;
      for (let j = 0; j < petals; j++) {
        const a = j / petals * TAU, radial = across.clone().multiplyScalar(Math.cos(a)).addScaledVector(upright, Math.sin(a));
        ellipsoid(root, 'Clay_pastel_daisy_petal', anchor.clone().addScaledVector(radial, radius * 0.61),
          new THREE.Vector3(radius * 0.22, radius * 0.52, radius * 0.10), petalsMaterial,
          [radial.clone().cross(normal).normalize(), radial, normal], GARDEN_PALETTE[palette]);
      }
      centre.addScaledVector(normal, radius * 0.09);
      ellipsoid(root, 'Clay_garden_yellow_centre', centre, new THREE.Vector3(radius * 0.34, radius * 0.34, radius * 0.18), centreMaterial, [across, upright, normal]);
    } else if (type === 'bud') {
      normal = new THREE.Vector3(px * 0.10, 1, 0.06).normalize(); petals = 3;
      const [a, , b] = axesFor(normal);
      for (let j = 0; j < 3; j++) {
        const angle = j / 3 * TAU;
        centre = anchor.clone().addScaledVector(normal, radius * 0.55)
          .addScaledVector(a, Math.cos(angle) * radius * 0.14).addScaledVector(b, Math.sin(angle) * radius * 0.14);
        ellipsoid(root, 'Clay_closed_tulip_bud', centre, new THREE.Vector3(radius * 0.83, radius * (1.52 + j * 0.035), radius * 0.83),
          petalsMaterial, axesFor(normal), GARDEN_PALETTE[palette]);
      }
    } else {
      normal = new THREE.Vector3(-0.08, 1, 0.32).normalize();
      const [a, , b] = axesFor(normal), rows = palette === 'butter' ? [8, 6] : [5];
      for (let row = 0; row < rows.length; row++) for (let j = 0; j < rows[row]; j++) {
        const angle = j / rows[row] * TAU + row * 0.3;
        const radial = a.clone().multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle));
        const direction = normal.clone().multiplyScalar(0.8).addScaledVector(radial, 0.6).normalize();
        const across = radial.clone().cross(normal).normalize(), surface = across.clone().cross(direction).normalize();
        const factor = row ? 0.72 : 1;
        ellipsoid(root, 'Clay_cupped_flower_petal', anchor.clone().addScaledVector(normal, radius * (0.4 + row * 0.24)).addScaledVector(radial, radius * 0.40 * factor),
          new THREE.Vector3(radius * 0.43 * factor, radius * 0.8 * factor, radius * 0.20), petalsMaterial,
          [across, direction, surface], GARDEN_PALETTE[palette]); petals++;
      }
    }
    const calyxDir = type === 'daisy' ? normal : new THREE.Vector3(0, 1, 0);
    ellipsoid(root, 'Clay_flower_calyx', anchor.clone().addScaledVector(calyxDir, -radius * 0.13),
      new THREE.Vector3(radius * 0.24, radius * 0.22, radius * 0.24), materials.stem);
    flowers.push({ type, palette, anchor: anchor.toArray(), centre: centre.toArray(), normal: normal.toArray(), radius, petals });
  }
  for (const [px, lean, h, wide, green] of [
    [-0.82, -0.25, 0.46, 0.10, '#50723d'], [-0.45, 0.02, 0.82, 0.14, '#6d8748'],
    [-0.15, -0.15, 0.48, 0.12, '#5a7c3d'], [0.22, 0.06, 0.71, 0.13, '#55763c'],
    [0.44, -0.04, 0.87, 0.16, '#789550'], [0.73, 0.35, 0.61, 0.11, '#678742'],
    [-0.62, -0.55, 0.39, 0.15, '#7d9854'], [0.02, 0.35, 0.38, 0.18, '#6f8b48'],
  ]) {
    const base = new THREE.Vector3(x + px * spread * 0.7, soilY + H * 0.01, z - depth * 0.12);
    const direction = new THREE.Vector3(lean, 1, -0.02).normalize();
    blade(root, base, direction, H * h, wide, green, materials.leaf);
    blades.push({ base: base.toArray(), length: H * h });
  }
  root.userData.flowerBeds ??= [];
  root.userData.flowerBeds.push({ width, depth, soilY, base: [x, soilY, z], height: H, flowers, blades, mounds });
}

