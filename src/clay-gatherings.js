import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { createClayFlowerBed } from './clay-flower-bed.js';
import { hollowPlanterGeometry } from './clay-planter.js';
import { SPACE_COLORS as C } from './space-colors.js';
import { GATHERING_ZONES, gatheringFloorY } from './gathering-layout.js';
import { CENTRAL_PLANTER_LAYOUT } from './central-planter-layout.js';

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
  soil: material('Clay soil', '#48392F', { roughness: 1 }), stem: material('Clay daisy stems', '#5c963f'),
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
  const wall = Math.min(0.028, depth * 0.04), top = h + 0.03;
  add(root, 'Clay_planter', hollowPlanterGeometry(width, depth, top, wall), materials.shell, x, y, z);
  const soilA = width / 2 - wall - 0.004, soilB = depth / 2 - wall - 0.004, soilSurface = y + h - 0.007;
  const soil = add(root, 'Clay_planter_soil', roundedCylinder(1, 0.018, 0.005), materials.soil, x, y + h - 0.025, z);
  soil.scale.set(soilA, 1, soilB);
  const roots = width < 0.6 ? [0] : [-width * 0.21, width * 0.18];
  const stones = [], count = width < 0.6 ? 3 : width > 2.5 ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const radius = Math.min(0.075, depth * 0.07) * (0.75 + rand() * 0.6);
    const pebble = add(root, 'Clay_pebble', tint(new THREE.SphereGeometry(1, 32, 20),
      new THREE.Color(['#d2d3ce', '#babebb', '#e0e1dc'][Math.floor(rand() * 3)])), materials.stone);
    pebble.scale.set(radius, radius * (0.30 + rand() * 0.10), radius * (0.75 + rand() * 0.25));
    pebble.rotation.y = rand() * TAU; stones.push(pebble);
  }
  createClayFlowerBed(root, { width, depth, x, z, soilY: y + h - 0.02, height: treeHeight, roots, materials,
    seed: 1771 + Math.round((x + z + y) * 497) });
  const bed = root.userData.flowerBeds.at(-1), placed = [];
  for (const stone of stones) {
    const radius = Math.max(stone.scale.x, stone.scale.z);
    let found = false;
    for (let attempt = 0; attempt < 160; attempt++) {
      // A few loose pairs among independent stones; never a grid or border ring.
      let dx = (rand() * 2 - 1) * soilA * 0.88, dz = (rand() * 2 - 1) * soilB * 0.86;
      if (attempt < 20 && placed.length && placed.length % 3 === 1) {
        const previous = placed.at(-1), angle = rand() * TAU, distance = (radius + previous.radius) * 1.25;
        dx = previous.dx + Math.cos(angle) * distance; dz = previous.dz + Math.sin(angle) * distance;
      }
      if ((dx / (soilA - radius)) ** 2 + (dz / (soilB - radius)) ** 2 > 0.95) continue;
      if (roots.some(rx => Math.hypot(dx - rx * 0.70, dz) < radius + 0.015)) continue;
      if (bed.mounds.some(m => ((x + dx - m.centre[0]) / (m.scale[0] + radius * 0.6)) ** 2
        + ((z + dz - m.centre[2]) / (m.scale[2] + radius * 0.6)) ** 2 < 1)) continue;
      if (placed.some(p => Math.hypot(dx - p.dx, dz - p.dz) < (radius + p.radius) * 1.05)) continue;
      stone.position.set(x + dx, soilSurface + stone.scale.y * 0.20, z + dz);
      placed.push({ dx, dz, radius }); found = true; break;
    }
    if (!found) { stone.removeFromParent(); stone.geometry.dispose(); }
  }
  root.userData.planters ??= [];
  root.userData.planters.push({ width, depth, height: top, wallThickness: wall, soilSurface,
    soilRadii: [soilA, soilB], stoneCount: placed.length, base: [x, y, z] });
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
      const counts = [5, 5], tierDepth = 0.8, seatWidth = 0.84;
      for (let row = 0; row < counts.length; row++) {
        const outer = R - 0.24 - (counts.length - 1 - row) * tierDepth, top = 0.46 + row * 0.30;
        const tread = arc(root, 'Clay_forum_tread', outer - tierDepth, outer, 0.78, TAU - 0.78, 0, top - 0.13, materials.shell, 0.045);
        tread.userData.walkable = true;
        const radius = outer - 0.38, padAngle = seatWidth / radius;
        for (let i = 0; i < counts[row]; i++) {
          const angle = THREE.MathUtils.lerp(1.10, TAU - 1.10, (i + 0.5) / counts[row]) + [0, 0.13][row];
          const pad = arc(root, 'Clay_forum_seat', radius - 0.28, radius + 0.28, angle - padAngle / 2, angle + padAngle / 2, top - 0.13, 0.13, materials.coral, 0.045);
          pad.userData.walkable = true;
          seat(root, pad, seats, [Math.sin(angle) * radius, top, Math.cos(angle) * radius], [-Math.sin(angle), 0, -Math.cos(angle)], 'forum', row);
          pad.userData.seatWidth = seatWidth;
        }
      }
      arc(root, 'Clay_forum_back', R - 0.18, R, 0.78, TAU - 0.78, 0, 0.96, materials.shell, 0.055);
      centralPlanter(root, 1.75, 0.64, 0, -R - 0.44, 0, 1.35);
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
        const plantAngle = -(zone.rotationY ?? 0), plantX = -R - 0.47, plantZ = 0.35;
        const x = plantX * Math.cos(plantAngle) + plantZ * Math.sin(plantAngle);
        const z = -plantX * Math.sin(plantAngle) + plantZ * Math.cos(plantAngle);
        centralPlanter(root, 1.5, 0.66, x, z, 0, 1.4);
      } else {
        centralPlanter(root, 1.12, 0.58, -0.2, -R - 0.48, 0, 1.1);
      }
    } else {
      arc(root, 'Clay_meeting_partition', R - 0.10, R + 0.1, 0.92, TAU - 0.92, 0, 1.02, materials.shell, 0.07);
      const chairR = zone.capacity > 6 ? 1.65 : 1.32;
      table(root, zone.capacity > 6 ? 1.12 : 0.83);
      // Keep the usable chair/table relationship, with a clear front entry
      // instead of a chair closing the mouth of the curved enclosure.
      const entryHalfAngle = zone.capacity > 6 ? Math.PI / 4 : 50 * Math.PI / 180;
      for (let i = 0; i < zone.capacity; i++) {
        const angle = THREE.MathUtils.lerp(entryHalfAngle, TAU - entryHalfAngle, i / (zone.capacity - 1));
        chair(root, Math.sin(angle) * chairR, Math.cos(angle) * chairR, angle, seats);
      }
      if (zone.sCurve) {
        centralPlanter(root, 1.5, 0.65, R + 0.43, -2.4, 0, 1.35);
        centralPlanter(root, 1.5, 0.56, 2.3, 3.5, 0, 0.58);
      }
      root.userData.meetingAccess = { chairRadius: chairR, entryHalfAngle,
        aisleRadius: (R - 0.1 + Math.hypot(chairR + 0.26, 0.25)) / 2 };
    }
    root.userData.capacity = zone.capacity; root.userData.kind = zone.kind;
    batchClayProps(root);
    // Keep the low table independent of the sofa and its original finishes.
    if (zone.id === 'grand-lounge') {
      const coffee = new THREE.Group(); coffee.name = 'Clay_low_coffee_table'; root.add(coffee);
      add(coffee, 'Clay_coffee_table_top', roundedCylinder(0.78, 0.08, 0.03), materials.gold, 0, 0.34, 0.1);
      add(coffee, 'Clay_coffee_table_pedestal', roundedCylinder(0.1, 0.34, 0.025), materials.shell, 0, 0, 0.1);
      add(coffee, 'Clay_coffee_table_foot', roundedCylinder(0.42, 0.06, 0.02), materials.shell, 0, 0, 0.1);
      for (const part of coffee.children) part.geometry.normalizeNormals();
    }
    const floorY = gatheringFloorY(zone.x, zone.z);
    if (zone.faceCenter) root.rotation.y = Math.atan2(-zone.x, -zone.z);
    if (zone.rotationY !== undefined) root.rotation.y = zone.rotationY;
    root.position.set(zone.x, floorY, zone.z); model.add(root);
    groups.push({ ...zone, root, seats, floorY });
  }
  const front = new THREE.Group(); front.name = 'Clay_front_oval_planter';
  centralPlanter(front, 3.3, 1.25, 0, 0, 0, 1.45); batchClayProps(front);
  front.position.set(3, gatheringFloorY(3, 9.4), 9.4); model.add(front);
  model.updateMatrixWorld(true);
  return { groups, frontPlanter: front, capacity: groups.reduce((n, group) => n + group.seats.length, 0), detail: CLAY_DETAIL };
}

// Move the existing planter, soil, stones and planting as one rigid assembly
// before batching. The original generation seed, shape and finishes stay intact.
function centralPlanter(root,width,depth,x,z,y,height){
  const first=root.children.length;
  const zone=GATHERING_ZONES.find(zone=>root.name===`Gathering_${zone.id}`);
  const id=zone?.id??'front',index=(root.userData.planters??[]).filter(p=>p.base[1]===0).length;
  const placement=CENTRAL_PLANTER_LAYOUT[id][index];
  planter(root,width,depth,x,z,y,height);
  const rotation=zone?(zone.rotationY??(zone.faceCenter?Math.atan2(-zone.x,-zone.z):0)):0;
  const origin=zone??{x:3,z:9.4};
  const local=new THREE.Vector3(placement.x-origin.x,0,placement.z-origin.z).applyAxisAngle(new THREE.Vector3(0,1,0),-rotation);
  const transform=new THREE.Matrix4().makeTranslation(local.x,y,local.z)
    .multiply(new THREE.Matrix4().makeRotationY(placement.angle-rotation))
    .multiply(new THREE.Matrix4().makeTranslation(-x,-y,-z));
  for(const mesh of root.children.slice(first))mesh.applyMatrix4(transform);
  const point=array=>new THREE.Vector3(...array).applyMatrix4(transform).toArray();
  const pot=root.userData.planters.at(-1),bed=root.userData.flowerBeds.at(-1);
  pot.base=point(pot.base);pot.rotationY=placement.angle-rotation;
  bed.base=point(bed.base);bed.rotationY=pot.rotationY;
  for(const f of bed.flowers){f.anchor=point(f.anchor);f.centre=point(f.centre);f.normal=new THREE.Vector3(...f.normal).transformDirection(transform).toArray();}
  for(const b of bed.blades)b.base=point(b.base);
  for(const m of bed.mounds)m.centre=point(m.centre);
}
