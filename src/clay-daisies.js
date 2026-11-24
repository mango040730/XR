import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const petalsMaterial = new THREE.MeshPhysicalMaterial({ name: 'Clay daisy ivory petals', color: '#fff9ee',
  roughness: 0.8, clearcoat: 0.06, clearcoatRoughness: 0.7, specularIntensity: 0.3 });
const centreMaterial = new THREE.MeshPhysicalMaterial({ name: 'Clay daisy lemon centres', color: '#f4d52b',
  roughness: 0.75, clearcoat: 0.06, clearcoatRoughness: 0.7, specularIntensity: 0.3 });

function add(root, name, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name;
  mesh.userData.clay = true; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function ball(root, name, centre, xAxis, yAxis, zAxis, scale, material, widthSegments = 28) {
  const geometry = new THREE.SphereGeometry(1, widthSegments, 16);
  const matrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).scale(scale).setPosition(centre);
  geometry.applyMatrix4(matrix); return add(root, name, geometry, material);
}
function stem(root, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  add(root, 'Clay_daisy_stem', new THREE.TubeGeometry(curve, 28, radius, 16, false), material);
  return curve;
}

// A plump, oval leaf with a gently bent body and a shallow moulded centre vein.
// Both sides have volume; no flat leaf cards or sharp polygonal tips are used.
function leaf(root, base, direction, length, green, material) {
  const source = new THREE.SphereGeometry(1, 32, 20), p = source.attributes.position;
  source.deleteAttribute('normal'); source.deleteAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i), ny = p.getY(i), nz = p.getZ(i), t = (ny + 1) / 2;
    const vein = nz > 0 ? length * 0.018 * Math.exp(-nx * nx / 0.015) * Math.sin(Math.PI * t) : 0;
    p.setXYZ(i, nx * length * 0.29, t * length,
      nz * length * 0.115 + length * 0.075 * t * t - vein);
  }
  const geometry = mergeVertices(source, 0.00001); source.dispose(); geometry.computeVertexNormals();
  const colors = new Float32Array(geometry.attributes.position.count * 3), highlight = green.clone().lerp(new THREE.Color('#a7ce73'), 0.16);
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const t = geometry.attributes.position.getY(i) / length;
    green.clone().lerp(highlight, t).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const across = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  const normal = across.clone().cross(direction).normalize();
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(across, direction, normal).setPosition(base));
  add(root, 'Clay_daisy_oval_leaf', geometry, material);
}

export function createClayDaisies(root, { width, depth, x, z, soilY, height, roots, materials, seed }) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const small = width < 0.6;
  const patterns = [
    [0, 0.98, -0.08, 1], [-0.74, 0.81, 0.05, 0.84], [0.78, 0.72, -0.03, 0.86],
    [-0.8, 0.51, 0.1, 0.72], [0.76, 0.40, 0.15, 0.65], [0.08, 0.59, 0.14, 0.78],
    [-0.96, 0.27, 0.03, 0.55], [0.92, 0.25, -0.02, 0.52],
    [-0.32, 0.75, -0.12, 0.7], [0.4, 0.94, 0.03, 0.82], [0, 0.35, 0.2, 0.56],
  ];
  const chosen = small ? [patterns[0], patterns[1], patterns[2], patterns[5]] : patterns.slice(0, width > 2.4 ? 11 : 8);
  const spreadX = Math.min(width * 0.40, height * 0.40), spreadZ = Math.min(depth * 0.36, height * 0.25);
  const flowers = [], leaders = new Map();
  for (let i = 0; i < chosen.length; i++) {
    const [px, py, pz, size] = chosen[i];
    const head = new THREE.Vector3(x + px * spreadX, soilY + height * py * (0.97 + random() * 0.05), z + pz * spreadZ);
    const rx = roots.reduce((best, candidate) => Math.abs(x + candidate - head.x) < Math.abs(x + best - head.x) ? candidate : best);
    const base = new THREE.Vector3(x + rx, soilY, z);
    const bend = base.clone().lerp(head, 0.48).add(new THREE.Vector3((random() - 0.5) * height * 0.07, 0, -height * 0.035));
    const curve = stem(root, [base, bend, head], small ? 0.006 : 0.014, materials.stem);
    if (!leaders.has(rx)) leaders.set(rx, curve);
    const normal = new THREE.Vector3((random() - 0.5) * 0.6, 0.48 + random() * 0.38, 0.75 + random() * 0.3).normalize();
    const across = UP.clone().cross(normal).normalize(), upright = normal.clone().cross(across).normalize();
    const radius = height * 0.135 * size, count = 11 + i % 3, phase = random() * TAU;
    for (let j = 0; j < count; j++) {
      const angle = phase + j / count * TAU;
      const radial = across.clone().multiplyScalar(Math.cos(angle)).addScaledVector(upright, Math.sin(angle));
      const tangent = radial.clone().cross(normal).normalize();
      const centre = head.clone().addScaledVector(radial, radius * 0.64).addScaledVector(normal, -radius * 0.02);
      ball(root, 'Clay_daisy_petal', centre, tangent, radial, normal,
        new THREE.Vector3(radius * (0.18 + random() * 0.015), radius * (0.52 + random() * 0.025), radius * 0.09), petalsMaterial);
    }
    const centre = head.clone().addScaledVector(normal, radius * 0.09);
    ball(root, 'Clay_daisy_yellow_centre', centre, across, upright, normal,
      new THREE.Vector3(radius * 0.35, radius * 0.35, radius * 0.18), centreMaterial, 32);
    ball(root, 'Clay_daisy_green_calyx', head.clone().addScaledVector(normal, -radius * 0.09), across, upright, normal,
      new THREE.Vector3(radius * 0.27, radius * 0.27, radius * 0.12), materials.stem, 24);
    flowers.push({ centre: centre.toArray(), normal: normal.toArray(), radius, petals: count });
  }
  for (const [rx, leader] of leaders) {
    const count = small ? 7 : 12;
    for (let i = 0; i < count; i++) {
      const t = 0.13 + i / (count - 1) * 0.57, socket = leader.getPoint(t);
      const angle = i * 2.39996 + random() * 0.45 + rx;
      const direction = new THREE.Vector3(Math.sin(angle), 0.62 + random() * 0.38, Math.cos(angle)).normalize();
      const length = height * (0.27 + random() * 0.09) * (1 - 0.26 * t);
      const base = socket.clone().addScaledVector(direction, length * 0.1);
      stem(root, [socket, socket.clone().lerp(base, 0.5), base], small ? 0.003 : 0.006, materials.stem);
      leaf(root, base, direction, length, new THREE.Color(['#609c48', '#6ca950', '#7bb45b', '#538b3d'][i % 4]), materials.leaf);
    }
  }
  root.userData.daisyPlants ??= [];
  root.userData.daisyPlants.push({ width, depth, soilY, base: [x, soilY, z], flowers, leafCount: leaders.size * (small ? 7 : 12) });
}
