import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { meshPieces } from './mesh-pieces.js';

const UP = new THREE.Vector3(0, 1, 0);
const LEAF_ROWS = 24, LEAF_COLUMNS = 8;
const GREENS = ['#315f43', '#416f49', '#5c824d', '#77975a'];

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function horizontal(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function tint(geometry, color) {
  const values = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < geometry.attributes.position.count; i++) color.toArray(values, i * 3);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
  return geometry;
}
function tube(points, radius, color, segments = 12, radial = 7, taper = 1) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  if (taper !== 1) {
    const p = geometry.attributes.position;
    for (let ring = 0; ring <= segments; ring++) {
      const t = ring / segments, center = curve.getPointAt(t), scale = THREE.MathUtils.lerp(1, taper, t);
      for (let j = 0; j <= radial; j++) {
        const index = ring * (radial + 1) + j;
        const v = new THREE.Vector3().fromBufferAttribute(p, index).sub(center).multiplyScalar(scale).add(center);
        p.setXYZ(index, v.x, v.y, v.z);
      }
    }
    geometry.computeVertexNormals();
  }
  return { curve, geometry: tint(geometry, color) };
}

// A softly rounded, plump clay leaf, retaining the natural midrib, petiole and
// branching direction. The margin and tips flow into the thicker leaf body.
function leafBlade(base, direction, length, width, green, curl) {
  const tangent = direction.clone().normalize();
  const across = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
  const normal = tangent.clone().cross(across).normalize();
  function center(t) {
    return base.clone().addScaledVector(tangent, length * t)
      .addScaledVector(normal, length * (0.12 * Math.sin(Math.PI * t) - curl * t * t));
  }
  function point(t, v, side) {
    const profile = Math.pow(Math.sin(Math.PI * t), 0.52) * (1 - 0.12 * t);
    const ridge = width * Math.sin(Math.PI * t) * (0.06 * (1 - v * v) + 0.015 * Math.exp(-v * v * 15));
    const cup = width * 0.025 * v * v * Math.sin(Math.PI * t);
    const thickness = width * 0.09 * Math.sin(Math.PI * t) * Math.sqrt(Math.max(0, 1 - v * v));
    return center(t).addScaledVector(across, v * width * 0.5 * profile)
      .addScaledVector(normal, ridge + cup + side * thickness);
  }
  const positions = [], colors = [], indices = [], weld = new Map(), grids = [];
  const underside = green.clone().lerp(new THREE.Color('#a7b986'), 0.18);
  const tipColor = green.clone().lerp(new THREE.Color('#8da463'), 0.12);
  for (const side of [1, -1]) {
    const grid = [];
    for (let row = 0; row <= LEAF_ROWS; row++) {
      const t = row / LEAF_ROWS, line = [];
      for (let column = 0; column <= LEAF_COLUMNS; column++) {
        const v = column / LEAF_COLUMNS * 2 - 1, p = point(t, v, side);
        const key = `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)},${Math.round(p.z * 1e6)}`;
        if (!weld.has(key)) {
          const index = positions.length / 3; weld.set(key, index); positions.push(...p.toArray());
          const color = (side > 0 ? green : underside).clone().lerp(tipColor, t * 0.28 + Math.abs(v) * 0.1);
          color.toArray(colors, index * 3);
        }
        line.push(weld.get(key));
      }
      grid.push(line);
    }
    grids.push(grid);
    for (let row = 0; row < LEAF_ROWS; row++) for (let column = 0; column < LEAF_COLUMNS; column++) {
      const a = grid[row][column], b = grid[row + 1][column], c = grid[row + 1][column + 1], d = grid[row][column + 1];
      for (const triangle of side > 0 ? [[a, b, d], [b, c, d]] : [[a, d, b], [b, d, c]]) {
        if (new Set(triangle).size === 3) indices.push(...triangle);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const middle = LEAF_ROWS / 2, column = LEAF_COLUMNS / 2;
  const sample = { upper: grids[0][middle][column], lower: grids[1][middle][column], base: grids[0][0][column], tip: grids[0][LEAF_ROWS][column],
    middleLeft: grids[0][middle][0], middleRight: grids[0][middle][LEAF_COLUMNS], tipLeft: grids[0][LEAF_ROWS - 1][0], tipRight: grids[0][LEAF_ROWS - 1][LEAF_COLUMNS] };
  return { geometry, tip: center(1), profile: 'rounded-clay-blade', sample };
}

export function rebuildBotanicals(model) {
  const meshes = [];
  model.traverse(mesh => { if (mesh.isMesh && /^(Planting|Cafe_Furniture)__/.test(mesh.name)) meshes.push(mesh); });
  const soils = meshes.filter(m => /Planter dark soil/.test(m.material.name)).flatMap(mesh => meshPieces(mesh).map(piece => ({
    soil: piece, center: piece.center.clone(), cafe: /^Cafe_Furniture/.test(mesh.name), stems: [], foliage: [],
  })));
  const stones = meshes.filter(m => /River pebble/.test(m.material.name)).flatMap(m => meshPieces(m));
  const removed = [];
  for (const mesh of meshes) {
    if (!/foliage|Plant stems/.test(mesh.material.name)) continue;
    const candidates = soils.filter(g => g.cafe === /^Cafe_Furniture/.test(mesh.name));
    for (const piece of meshPieces(mesh)) {
      const group = candidates.reduce((best, g) => !best || horizontal(piece.center, g.center) < horizontal(piece.center, best.center) ? g : best, null);
      if (group) (/foliage/.test(mesh.material.name) ? group.foliage : group.stems).push(piece);
    }
    removed.push(mesh);
  }
  removed.forEach(mesh => mesh.removeFromParent());
  const root = new THREE.Group(); root.name = 'Botanical_planting';
  const batches = { leaves: [], branches: [] }, plots = [], leaves = [], roots = [];
  let trees = 0;
  soils.forEach((group, plotIndex) => {
    const rand = random(13721 + plotIndex * 977), leafParts = [], branchParts = [];
    const soil = group.soil.bounds, baseY = soil.max.y;
    const envelope = soil.clone();
    for (const p of [...group.foliage, ...group.stems]) envelope.union(p.bounds);
    const wood = new THREE.Color('#70543d'), young = new THREE.Color('#607b46');
    const nearbyStones = stones.filter(p => horizontal(p.center, group.center) < Math.max(group.soil.size.x, group.soil.size.z));
    const soilRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 0.15);
    function freeRoot(point) {
      for (let i = 0; i < 48; i++) {
        const a = i * 2.39996, r = i ? 0.10 + Math.sqrt(i) * 0.065 : 0;
        const candidate = point.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
        if (candidate.x < soil.min.x + 0.1 || candidate.x > soil.max.x - 0.1 || candidate.z < soil.min.z + 0.1 || candidate.z > soil.max.z - 0.1) continue;
        soilRay.ray.origin.set(candidate.x, baseY + 0.07, candidate.z);
        if (!soilRay.intersectObject(group.soil.mesh, false).some(hit => Math.abs(hit.point.y - baseY) < 0.03)) continue;
        if (!nearbyStones.some(p => candidate.x > p.bounds.min.x - 0.055 && candidate.x < p.bounds.max.x + 0.055 && candidate.z > p.bounds.min.z - 0.055 && candidate.z < p.bounds.max.z + 0.055)) return candidate;
      }
      return point;
    }
    function addLeaf(base, direction, length, width, socket = null, kind = 'canopy') {
      const palette = kind === 'shoot' ? [GREENS[2], GREENS[3]] : kind === 'underplant' ? [GREENS[1], GREENS[2]] : [GREENS[0], GREENS[1], GREENS[1], GREENS[2]];
      const green = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
      const leaf = leafBlade(base, direction, length, width, green, 0.04 + rand() * 0.14);
      leafParts.push(leaf.geometry);
      if (socket) {
        branchParts.push(tube([socket, socket.clone().lerp(base, 0.5).addScaledVector(UP, length * 0.025), base], length * 0.012, young, 6, 6, 0.55).geometry);
      }
      leaves.push({ plot: plotIndex, kind, profile: leaf.profile, length, width, base: base.clone(), tip: leaf.tip.clone(), petiole: Boolean(socket), sample: leaf.sample });
    }
    if (group.cafe) {
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.39996 + rand() * 0.5;
        const socket = new THREE.Vector3(group.center.x, baseY - 0.008, group.center.z);
        const base = socket.clone().add(new THREE.Vector3(Math.cos(angle) * 0.025, 0.06 + rand() * 0.1, Math.sin(angle) * 0.025));
        addLeaf(base, new THREE.Vector3(Math.cos(angle), 0.8 + rand(), Math.sin(angle)), 0.21 + rand() * 0.1, 0.10 + rand() * 0.035, socket, 'tabletop');
      }
    } else {
      for (const [stemIndex, source] of group.stems.entries()) {
        const sourceP = source.mesh.geometry.attributes.position;
        const bottom = source.vertices.filter(i => sourceP.getY(i) < source.bounds.min.y + source.size.y * 0.05);
        const base = freeRoot(bottom.reduce((v, i) => v.add(new THREE.Vector3(sourceP.getX(i), baseY - 0.025, sourceP.getZ(i))), new THREE.Vector3()).divideScalar(bottom.length));
        roots.push({ plot: plotIndex, point: base.clone() });
        const height = Math.max(0.65, source.bounds.max.y - baseY);
        const angle = rand() * Math.PI * 2, lean = Math.min(0.24, height * 0.11);
        const trunkPoints = [base, base.clone().add(new THREE.Vector3(Math.cos(angle) * lean * 0.25, height * 0.32, Math.sin(angle) * lean * 0.25)),
          base.clone().add(new THREE.Vector3(Math.cos(angle) * lean, height * 0.72, Math.sin(angle) * lean)),
          base.clone().add(new THREE.Vector3(Math.cos(angle + 0.3) * lean, height * 0.94, Math.sin(angle + 0.3) * lean))];
        const trunk = tube(trunkPoints, Math.max(0.016, height * 0.019), wood, 20, 12, 0.22);
        branchParts.push(trunk.geometry); trees++;
        const spread = Math.min(0.8, Math.min(source.size.y * 0.32, Math.min(group.soil.size.x, group.soil.size.z) * 0.34));
        for (let branchIndex = 0; branchIndex < 6; branchIndex++) {
          const level = 0.28 + branchIndex * 0.115 + rand() * 0.025;
          const a = angle + branchIndex * 2.39996 + stemIndex * 0.63;
          const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          const start = trunk.curve.getPointAt(level);
          const reach = spread * (0.6 + rand() * 0.4) * (1 - branchIndex * 0.065);
          const end = start.clone().addScaledVector(out, reach).addScaledVector(UP, height * (0.10 + rand() * 0.06));
          const branch = tube([start, start.clone().addScaledVector(out, reach * 0.35).addScaledVector(UP, height * 0.09), end], height * 0.007, wood, 10, 8, 0.25);
          branchParts.push(branch.geometry);
          for (let i = 0; i < 3; i++) {
            const t = 0.38 + i * 0.27, socket = branch.curve.getPointAt(t);
            const leafAngle = a + (i % 2 ? -0.85 : 0.85) + (rand() - 0.5) * 0.4;
            const dir = new THREE.Vector3(Math.cos(leafAngle), 0.18 + rand() * 0.6, Math.sin(leafAngle)).normalize();
            const length = Math.min(0.65, height * (0.20 + rand() * 0.07));
            const leafBase = socket.clone().addScaledVector(dir, length * 0.12);
            addLeaf(leafBase, dir, length, length * (0.36 + rand() * 0.12), socket);
          }
        }
        for (let i = 0; i < 2; i++) {
          const socket = trunk.curve.getPointAt(0.88 + i * 0.07), a = angle + i * 2.1;
          const dir = new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).normalize();
          addLeaf(socket.clone().addScaledVector(dir, 0.025), dir, height * 0.19, height * 0.075, socket, 'shoot');
        }
      }
      const lowCenters = [];
      for (const part of group.foliage.filter(p => /Forest/.test(p.mesh.name) && p.bounds.max.y < baseY + 0.7)) {
        const near = lowCenters.find(p => horizontal(p, part.center) < 0.55);
        if (!near) lowCenters.push(new THREE.Vector3(part.center.x, baseY - 0.005, part.center.z));
      }
      for (const center of lowCenters.slice(0, 3)) {
        const anchor = freeRoot(center);
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.39996 + rand() * 0.3, length = 0.46 + rand() * 0.24;
          addLeaf(anchor, new THREE.Vector3(Math.cos(angle), 0.75 + rand() * 0.7, Math.sin(angle)), length, length * 0.24, null, 'underplant');
        }
      }
    }
    // Respect the existing planter/canopy envelope so refined foliage does not
    // invade the walking lanes. All roots remain attached to the soil surface.
    const all = [...leafParts, ...branchParts], bounds = new THREE.Box3();
    all.forEach(g => { g.computeBoundingBox(); bounds.union(g.boundingBox); });
    const sx = Math.min(1, (group.center.x - envelope.min.x) / Math.max(1e-6, group.center.x - bounds.min.x), (envelope.max.x - group.center.x) / Math.max(1e-6, bounds.max.x - group.center.x));
    const sz = Math.min(1, (group.center.z - envelope.min.z) / Math.max(1e-6, group.center.z - bounds.min.z), (envelope.max.z - group.center.z) / Math.max(1e-6, bounds.max.z - group.center.z));
    const sy = Math.min(1, (envelope.max.y - baseY) / Math.max(1e-6, bounds.max.y - baseY));
    const matrix = new THREE.Matrix4().makeTranslation(group.center.x, baseY, group.center.z)
      .multiply(new THREE.Matrix4().makeScale(sx, sy, sz)).multiply(new THREE.Matrix4().makeTranslation(-group.center.x, -baseY, -group.center.z));
    all.forEach(g => g.applyMatrix4(matrix));
    for (const leaf of leaves.filter(l => l.plot === plotIndex)) { leaf.base.applyMatrix4(matrix); leaf.tip.applyMatrix4(matrix); }
    for (const root of roots.filter(r => r.plot === plotIndex)) root.point.applyMatrix4(matrix);
    const resultBounds = new THREE.Box3(); all.forEach(g => { g.computeBoundingBox(); resultBounds.union(g.boundingBox); });
    plots.push({ center: group.center.toArray(), soilY: baseY, cafe: group.cafe, bounds: resultBounds, envelope, trees: group.stems.length });
    batches.leaves.push(...leafParts); batches.branches.push(...branchParts);
  });
  const materials = {
    leaves: new THREE.MeshPhysicalMaterial({ name: 'Living botanical leaf blades', color: '#ffffff', vertexColors: true,
      roughness: 0.68, specularIntensity: 0.32, clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.18, sheenRoughness: 0.85 }),
    branches: new THREE.MeshPhysicalMaterial({ name: 'Botanical wood petioles and veins', color: '#ffffff', vertexColors: true,
      roughness: 0.74, specularIntensity: 0.28, clearcoat: 0 }),
  };
  let triangles = 0;
  let offset = 0;
  batches.leaves.forEach((g, i) => { leaves[i].range = { start: offset, count: g.attributes.position.count }; offset += g.attributes.position.count; });
  for (const [name, parts] of Object.entries(batches)) {
    const geometry = mergeGeometries(parts, false);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, materials[name]); mesh.name = `Botanical_${name}`;
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    triangles += geometry.index.count / 3; parts.forEach(g => g.dispose());
  }
  model.add(root);
  return { root, plots, leaves, roots, trees, triangles, removedMeshes: removed.length };
}
