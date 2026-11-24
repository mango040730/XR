import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { createClayDaisies } from './clay-daisies.js';
import { SPACE_COLORS as C } from './space-colors.js';
import { GATHERING_ZONES, gatheringFloorY } from './gathering-layout.js';

const TAU = Math.PI * 2;
export const CLAY_DETAIL = { arcSegments: 192, bevelSegments: 10, sphereSegments: 32, branchSegments: 16 };
function material(name, color, finish = {}) {
  return new THREE.MeshPhysicalMaterial({ name, color, roughness: 0.72, metalness: 0,
    clearcoat: 0.07, clearcoatRoughness: 0.65, specularIntensity: 0.35, ...finish });
}
const materials = {
  shell: material('Clay warm ivory', C.sculpture), coral: material('Clay coral upholstery', C.coral, { roughness: 0.86, sheen: 0.35, sheenColor: C.coral }),
  gold: material('Clay ochre furniture', C.terraceFurniture, { roughness: 0.6 }),
  orange: material('Clay orange', '#f89135'), blue: material('Clay blue accent', C.rail),
  soil: material('Clay soil', '#555346', { roughness: 1 }), stem: material('Clay daisy stems', '#5c963f'),
  leaf: material('Clay rounded leaves', '#ffffff', { vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }),
  stone: material('Clay river stones', '#ffffff', { vertexColors: true, roughness: 0.9 }),
};

function add(root, name, geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat); mesh.name = name; mesh.position.set(x, y, z);
  mesh.userData.clay = true; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
}
function box(root, name, w, h, d, x, y, z, mat, bevel = 0.07) {
  return add(root, name, new RoundedBoxGeometry(w, h, d, 8, Math.min(bevel, w / 2, h / 2, d / 2)), mat, x, y, z);
}
export function roundedCylinder(radius, height, bevel = 0.04) {
  bevel = Math.min(bevel, radius * 0.35, height * 0.45);
  const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(radius - bevel, 0)];
  for (let i = 1; i <= 12; i++) {
    const a = -Math.PI / 2 + i / 12 * Math.PI / 2;
    profile.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, bevel + Math.sin(a) * bevel));
  }
  profile.push(new THREE.Vector2(radius, height - bevel));
  for (let i = 1; i <= 12; i++) {
    const a = i / 12 * Math.PI / 2;
    profile.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, height - bevel + Math.sin(a) * bevel));
  }
  profile.push(new THREE.Vector2(0, height));
  return new THREE.LatheGeometry(profile, 96);
}
function arc(root, name, inner, outer, start, end, bottom, height, mat, bevel = 0.04) {
  // ExtrudeGeometry expands its contour for bevels. Inset the contour first so
  // adjacent cushions and step bands keep their intended bounds and gaps.
  const mid = (inner + outer) / 2;
  start += bevel / mid; end -= bevel / mid;
  inner += bevel; outer -= bevel;
  const shape = new THREE.Shape(), steps = Math.max(32, Math.ceil((end - start) / TAU * CLAY_DETAIL.arcSegments));
  const point = (r, a) => [Math.sin(a) * r, -Math.cos(a) * r];
  shape.moveTo(...point(inner, start));
  for (let i = 1; i <= steps; i++) shape.lineTo(...point(inner, THREE.MathUtils.lerp(start, end, i / steps)));
  shape.lineTo(...point(outer, end));
  for (let i = steps - 1; i >= 0; i--) shape.lineTo(...point(outer, THREE.MathUtils.lerp(start, end, i / steps)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height - bevel * 2, bevelEnabled: true,
    bevelSize: bevel, bevelThickness: bevel, bevelSegments: CLAY_DETAIL.bevelSegments, steps: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, bottom + bevel, 0);
  const smooth = toCreasedNormals(geometry, Math.PI / 3); geometry.dispose();
  return add(root, name, smooth, mat);
}
function seat(root, mesh, seats, localPosition, facing, type, tier = 0) {
  mesh.userData.seat = true; mesh.userData.capacity = 1;
  mesh.userData.seatWidth = type === 'chair' ? 0.5 : 0.76;
  seats.push({ mesh, position: localPosition, facing, type, tier });
}
function chair(root, x, z, angle, seats) {
  const part = new THREE.Group(); part.position.set(x, 0, z); part.rotation.y = angle; root.add(part);
  const pad = box(part, 'Clay_chair_seat', 0.5, 0.12, 0.49, 0, 0.40, 0, materials.gold, 0.055);
  seat(root, pad, seats, [x, 0.46, z], [-Math.sin(angle), 0, -Math.cos(angle)], 'chair');
  box(part, 'Clay_chair_back', 0.5, 0.48, 0.12, 0, 0.76, 0.2, materials.gold, 0.055);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(part, 'Clay_chair_leg', roundedCylinder(0.035, 0.35, 0.014), materials.shell, sx * 0.18, 0, sz * 0.16);
}
function table(root, radius, x = 0, z = 0) {
  add(root, 'Clay_round_table', roundedCylinder(radius, 0.09, 0.035), materials.gold, x, 0.70, z);
  add(root, 'Clay_table_pedestal', roundedCylinder(0.09, 0.70), materials.shell, x, 0, z);
  add(root, 'Clay_table_foot', roundedCylinder(Math.min(0.46, radius * 0.55), 0.08), materials.shell, x, 0, z);
  planter(root, 0.34, 0.34, x, z, 0.79, 0.28);
}

function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function tint(geometry, color) {
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < geometry.attributes.position.count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry;
}
export function planter(root, width, depth, x = 0, z = 0, y = 0, treeHeight = 1.4) {
  const rand = random(1771 + Math.round((x + z + y) * 497)), h = width < 0.6 ? 0.16 : 0.4;
  const bowl = add(root, 'Clay_planter', roundedCylinder(1, h, 0.06), materials.shell, x, y, z); bowl.scale.set(width / 2, 1, depth / 2);
  const soil = add(root, 'Clay_planter_soil', roundedCylinder(1, 0.018, 0.005), materials.soil, x, y + h - 0.025, z); soil.scale.set(width * 0.43, 1, depth * 0.40);
  const rim = add(root, 'Clay_planter_rim', new THREE.TorusGeometry(0.94, 0.055, 16, 96), materials.shell, x, y + h - 0.025, z);
  rim.rotation.x = Math.PI / 2; rim.scale.set(width / 2, depth / 2, 1);
  const roots = width < 0.6 ? [0] : [-width * 0.21, width * 0.18];
  const pitch = width < 0.6 ? 0.055 : 0.16;
  for (let iz = 0, dz = -depth * 0.38; dz <= depth * 0.38; iz++, dz += pitch * 0.77) {
    for (let dx = -width * 0.43 + (iz % 2) * pitch / 2; dx <= width * 0.43; dx += pitch) {
      if ((dx / (width * 0.43)) ** 2 + (dz / (depth * 0.38)) ** 2 > 0.93 || roots.some(rx => Math.hypot(dx - rx, dz) < pitch * 0.82)) continue;
      const radius = pitch * (0.47 + rand() * 0.16), stone = new THREE.SphereGeometry(1, 32, 20);
      const pebble = add(root, 'Clay_pebble', tint(stone, new THREE.Color(['#b3b4a4', '#a3a59b', '#c3baa5'][Math.floor(rand() * 3)])), materials.stone, x + dx, y + h - 0.005, z + dz);
      pebble.scale.set(radius, radius * (0.57 + rand() * 0.25), radius * (0.75 + rand() * 0.2)); pebble.rotation.y = rand() * TAU;
    }
  }
  createClayDaisies(root, { width, depth, x, z, soilY: y + h - 0.02, height: treeHeight, roots, materials,
    seed: 1771 + Math.round((x + z + y) * 497) });
}

// Merge small leaves, pebbles and furniture parts by finish, while preserving
// every individual seat and every walkable forum tread as real scene objects.
export function batchClayProps(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map(), removed = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.seat || mesh.userData.walkable) return;
    const g = mesh.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
    if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(g); removed.push(mesh);
  });
  removed.forEach(mesh => { mesh.removeFromParent(); mesh.geometry.dispose(); });
  for (const [mat, parts] of batches) {
    const geometry = mergeGeometries(parts, false);
    add(root, `Clay_${mat.name.replaceAll(' ', '_')}`, geometry, mat);
    parts.forEach(g => g.dispose());
  }
}

export function createGatheringFurniture(model) {
  const groups = [];
  for (const zone of GATHERING_ZONES) {
    const root = new THREE.Group(); root.name = `Gathering_${zone.id}`;
    const seats = [], R = zone.radius;
    if (zone.kind === 'forum') {
      const counts = [3, 3, 4];
      for (let row = 0; row < 3; row++) {
        const outer = 1.5 + row * 0.64, top = 0.46 + row * 0.28;
        const tread = arc(root, 'Clay_forum_tread', outer - 0.64, outer, 0.78, TAU - 0.78, 0, top - 0.13, materials.shell, 0.045);
        tread.userData.walkable = true;
        const radius = outer - 0.30, padAngle = 0.76 / radius;
        for (let i = 0; i < counts[row]; i++) {
          const angle = THREE.MathUtils.lerp(1.14, TAU - 1.14, (i + 0.5) / counts[row]) + [0, 0.26, -0.1][row];
          const pad = arc(root, 'Clay_forum_seat', radius - 0.28, radius + 0.28, angle - padAngle / 2, angle + padAngle / 2, top - 0.13, 0.13, materials.coral, 0.045);
          pad.userData.walkable = true;
          seat(root, pad, seats, [Math.sin(angle) * radius, top, Math.cos(angle) * radius], [-Math.sin(angle), 0, -Math.cos(angle)], 'forum', row);
        }
      }
      arc(root, 'Clay_forum_back', 2.84, 3.02, 0.78, TAU - 0.78, 0, 1.15, materials.shell, 0.055);
      planter(root, 1.75, 0.64, 0, -3.43, 0, 1.35);
    } else if (zone.kind === 'sofa') {
      const opening = zone.opening ?? 0, start = opening + 0.86, end = opening + TAU - 0.86;
      arc(root, 'Clay_sofa_plinth', R - 0.68, R, start, end, 0, 0.32, materials.shell, 0.055);
      arc(root, 'Clay_sofa_shell', R - 0.10, R + 0.1, start, end, 0, 1.03, materials.shell, 0.065);
      const seatR = R - 0.37, gap = 0.08 / seatR;
      const seatStart = start + 0.15 / seatR, seatEnd = end - 0.15 / seatR, span = (seatEnd - seatStart) / zone.capacity;
      for (let i = 0; i < zone.capacity; i++) {
        const angle = seatStart + (i + 0.5) * span;
        const pad = arc(root, 'Clay_sofa_seat', R - 0.66, R - 0.08, seatStart + i * span + gap / 2, seatStart + (i + 1) * span - gap / 2, 0.32, 0.14, materials.coral, 0.045);
        seat(root, pad, seats, [Math.sin(angle) * seatR, 0.46, Math.cos(angle) * seatR], [-Math.sin(angle), 0, -Math.cos(angle)], 'sofa');
        arc(root, 'Clay_sofa_back_pad', R - 0.22, R - 0.07, seatStart + i * span + gap / 2, seatStart + (i + 1) * span - gap / 2, 0.47, 0.48, materials.coral, 0.05);
      }
      for (const a of [start, end]) {
        const arm = box(root, 'Clay_sofa_arm', 0.22, 0.64, 0.69, Math.sin(a) * (R - 0.31), 0.32, Math.cos(a) * (R - 0.31), materials.shell, 0.09); arm.rotation.y = a;
      }
      if (zone.table) table(root, 0.68);
      if (zone.id === 'grand-lounge') {
        add(root, 'Clay_large_orange_ottoman', roundedCylinder(0.78, 0.38, 0.08), materials.orange, 0, 0, 0.1);
        planter(root, 1.5, 0.66, -R - 0.47, 0.35, 0, 1.4);
      } else {
        planter(root, 1.12, 0.58, -0.2, -R - 0.48, 0, 1.1);
      }
    } else {
      arc(root, 'Clay_meeting_partition', R - 0.10, R + 0.1, 0.92, TAU - 0.92, 0, 1.02, materials.shell, 0.07);
      const chairR = zone.capacity > 6 ? 1.65 : 1.32;
      table(root, zone.capacity > 6 ? 1.12 : 0.83);
      for (let i = 0; i < zone.capacity; i++) {
        const angle = i / zone.capacity * TAU;
        chair(root, Math.sin(angle) * chairR, Math.cos(angle) * chairR, angle, seats);
      }
      if (zone.sCurve) {
        planter(root, 1.5, 0.65, R + 0.43, -1.5, 0, 1.35);
        const returning = arc(root, 'Clay_S_returning_curve', 1.1, 1.28, 2.25, 4.25, 0, 0.42, materials.shell, 0.06);
        returning.position.set(-0.65, 0, 4.05);
        planter(root, 1.5, 0.56, -0.65, 2.9, 0, 0.58);
      }
    }
    root.userData.capacity = zone.capacity; root.userData.kind = zone.kind;
    batchClayProps(root);
    const floorY = gatheringFloorY(zone.x, zone.z);
    root.position.set(zone.x, floorY, zone.z); model.add(root);
    groups.push({ ...zone, root, seats, floorY });
  }
  const front = new THREE.Group(); front.name = 'Clay_front_oval_planter';
  planter(front, 3.3, 1.25, 0, 0, 0, 1.45); batchClayProps(front);
  front.position.set(3, gatheringFloorY(3, 9.4), 9.4); model.add(front);
  model.updateMatrixWorld(true);
  return { groups, frontPlanter: front, capacity: groups.reduce((n, group) => n + group.seats.length, 0), detail: CLAY_DETAIL };
}
