import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Raycaster, Vector3 } from 'three';
import { prepareGatheringSpace } from '../src/compact-space.js';
import { GATHERING_LAYOUT as L, GATHERING_ZONES, GATHERING_ENTRY, gatheringFloorY } from '../src/gathering-layout.js';
import { collisionGeometry } from '../src/collision.js';
import { withinWalkBoundary } from '../src/entrance.js';
import { isWalkable } from '../src/prepare-space.js';
import { createTerraceChairTemplate, TERRACE_CHAIR_COLOR } from '../src/terrace-rounded-chair.js';
import { createTubeChairTemplate, TUBE_CUSHION_COLOR } from '../src/terrace-tube-chair.js';
import { createPillDeskParts } from '../src/terrace-pill-desk.js';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const model = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
const edited = prepareGatheringSpace(model);
const meshes = [], floors = [];
model.traverse(mesh => { if (mesh.isMesh) { meshes.push(mesh); if (isWalkable(mesh)) floors.push(mesh); } });

test('각 모임 구역에 실제 4~10개의 독립된 1인 좌석이 있고 좌석 간 여유를 확보했다', () => {
  assert.deepEqual(edited.furniture.groups.map(g => g.seats.length), [10, 8, 4, 6, 10, 6]);
  assert.equal(edited.furniture.capacity, 44);
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 0.25);
  for (const group of edited.furniture.groups) {
    assert.ok(group.seats.length >= 4 && group.seats.length <= 10);
    let actual = 0; group.root.traverse(mesh => { if (mesh.isMesh && mesh.userData.seat) actual++; });
    assert.equal(actual, group.capacity, '좌석 수는 이름이나 메타데이터뿐 아니라 실제 모델과 일치해야 합니다.');
    for (const seat of group.seats) {
      const point = new Vector3(...seat.position).applyMatrix4(group.root.matrixWorld);
      ray.ray.origin.copy(point).add(new Vector3(0, 0.12, 0));
      const hit = ray.intersectObject(seat.mesh, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - point.y) < 0.015 && hit.face.normal.y > 0.8, '실제 사람이 앉는 상면이 있어야 합니다.');
      if (seat.type !== 'forum') assert.equal(seat.position[1], 0.46, '인체 사용 높이를 유지해야 합니다.');
      assert.ok(seat.mesh.userData.seatWidth >= 0.5);
    }
    for (let i = 0; i < group.seats.length; i++) for (const b of group.seats.slice(i + 1)) {
      const a = group.seats[i].position;
      assert.ok(Math.hypot(a[0] - b.position[0], a[2] - b.position[2]) > 0.60, '서로 다른 사람의 좌석 칸이 겹치면 안 됩니다.');
    }
  }
  assert.equal(GATHERING_ZONES.length, 6);
});

test('중앙의 좌석·등받이·화분·돌·잎이 부드러운 실제 곡면과 클레이 재질로 구성된다', () => {
  let vertices = 0, leafMeshes = 0, coralSeats = 0;
  for (const group of edited.furniture.groups) group.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    assert.ok(mesh.userData.clay);
    assert.equal(mesh.material.flatShading, false);
    assert.ok(mesh.material.roughness >= 0.6, '클레이 표면을 과한 유광으로 만들면 안 됩니다.');
    const normal = mesh.geometry.attributes.normal;
    for (let i = 0; i < normal.count; i += 31) {
      const n = new Vector3().fromBufferAttribute(normal, i);
      assert.ok(Number.isFinite(n.lengthSq()) && Math.abs(n.length() - 1) < 0.0001);
    }
    vertices += mesh.geometry.attributes.position.count;
    if (/leaves/.test(mesh.material.name)) { leafMeshes++; assert.ok(mesh.geometry.attributes.color); }
    if (mesh.userData.seat && /coral/.test(mesh.material.name)) coralSeats++;
  });
  assert.ok(vertices > 300000);
  assert.equal(leafMeshes, 6);
  assert.equal(coralSeats, 28);
  assert.ok(!meshes.some(m => /^Lounge_Pods__|^Planting__/.test(m.name)), '성긴 원본 폴리곤 가구·식물을 남기면 안 됩니다.');
});

test('작아진 가구가 전후 바닥 단차에 접지하고 서로 또는 원형 계단과 관통하지 않는다', () => {
  const groups = [...edited.furniture.groups, { root: edited.furniture.frontPlanter, floorY: gatheringFloorY(3, 9.4) }];
  const world = new Vector3();
  for (const group of groups) {
    let contacts = 0;
    group.root.traverse(mesh => {
      if (!mesh.isMesh) return;
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        world.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(Math.hypot(world.x, world.z) < L.centralRadius - 1.0, '외곽 계단 앞의 순환 공간을 비워야 합니다.');
        if (Math.abs(world.y - group.floorY) >= 0.001) continue;
        assert.ok(Math.abs(gatheringFloorY(world.x, world.z) - world.y) < 0.001, '화분과 가구가 서로 다른 바닥 높이를 가로지르면 안 됩니다.');
        contacts++;
      }
    });
    assert.ok(contacts > 50);
  }
  for (let i = 0; i < groups.length; i++) for (const b of groups.slice(i + 1)) {
    assert.ok(!new Box3().setFromObject(groups[i].root).intersectsBox(new Box3().setFromObject(b.root)));
  }
});

test('원형 공간과 계단·블루길을 함께 축소하되 실제 보행 가능한 9개 단과 두 좌석 층을 유지한다', () => {
  assert.equal(L.centralRadius * 2, 25);
  assert.equal(L.outerRadius * 2, 51);
  assert.equal(L.pathWidth, 4.6);
  assert.equal(edited.stairs.userData.stepCount, 9);
  assert.ok(edited.seating.sets.length < 60 && edited.seating.sets.length > 15);
  assert.ok(edited.seating.seats.length < 158 && edited.seating.seats.length > 40);
  assert.deepEqual([...new Set(edited.seating.sets.map(s => s.tier))], [0, 1]);
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  for (let i = 0; i < L.stepCount; i++) {
    const radius = L.centralRadius + (i + 0.5) * (L.terraceOuter - L.centralRadius) / L.stepCount;
    ray.ray.origin.set(0, L.pathY + 1, radius);
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - (L.floorY + (i + 1) * 0.3)) < 0.001);
  }
  assert.ok(Math.abs(edited.digitalWall.height - 4.8) < 0.001);
});

test('실제 병합 충돌 장면에서 새 입구·계단·중앙 통로를 연속해 이동할 수 있다', () => {
  const body = collisionGeometry(meshes), floor = collisionGeometry(floors);
  const ray = new Raycaster();
  try {
    const path = [[0, GATHERING_ENTRY.position[2]], [0, 11], [-0.4, 8.6], [-0.8, 5.6], [-1.8, 4.5], [-2.4, 1.2], [-0.5, -3.5], [0, -5]];
    let previousY = L.pathY;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], length = Math.hypot(bx - ax, bz - az);
      const direction = new Vector3(bx - ax, 0, bz - az).normalize(), side = new Vector3(direction.z, 0, -direction.x);
      for (let d = 0; d <= length; d += 0.06) {
        const x = ax + direction.x * d, z = az + direction.z * d;
        assert.ok(withinWalkBoundary(x, z, L.walkRadius, GATHERING_ENTRY));
        ray.set(new Vector3(x, previousY + 0.36, z), new Vector3(0, -1, 0)); ray.far = 0.96;
        const hit = ray.intersectObject(floor)[0];
        assert.ok(hit && hit.point.y - previousY < 0.34 && previousY - hit.point.y < 0.6, `연속 보행 바닥이 필요합니다: ${x},${z}`);
        previousY = hit.point.y;
        for (const h of [0.4, 0.95, 1.5]) for (const offset of [-0.22, 0, 0.22]) {
          const start = new Vector3(x, previousY + h + 0.025, z).addScaledVector(side, offset);
          ray.set(start, direction); ray.far = 0.27;
          assert.equal(ray.intersectObject(body).length, 0, `몸통 통로가 필요합니다: ${x},${z}, 높이 ${h}`);
        }
      }
    }
    assert.equal(body.geometry.index.count / 3, meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0));
  } finally { for (const mesh of [body, floor]) { mesh.geometry.dispose(); mesh.material.dispose(); } }
});

test('중앙 모델의 곡면을 높여도 전체 삼각형 예산을 넘지 않는다', () => {
  const count = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0);
  assert.ok(count > 1500000 && count < 4600000);
  assert.ok(meshes.length < 200, '돌과 잎을 개별 드로 호출로 남기지 않아야 합니다.');
});

test('탁상·중앙·블루길의 모든 화분에 참고 이미지의 혼합 화단을 적용했다', () => {
  const roots = [...edited.furniture.groups.map(g => g.root), edited.furniture.frontPlanter, ...edited.outerPlants];
  const plants = roots.flatMap(root => root.userData.flowerBeds ?? []);
  assert.equal(plants.length, 13);
  assert.equal(plants.reduce((sum, p) => sum + p.flowers.length, 0), 125);
  for (const root of roots) {
    const finishes = new Set(); root.traverse(m => { if (m.isMesh) finishes.add(m.material.name); });
    assert.ok(finishes.has('Clay pastel garden flowers') && finishes.has('Clay garden yellow centres'));
  }
});

test('섞어 배치한 기존 원형 의자는 넓은 좌판·절반 높이 등받이와 골드 유광을 유지한다', () => {
  const batch = edited.seating.root.getObjectByName('Terrace_round_chairs');
  assert.ok(batch && batch.material.userData.terraceChair);
  assert.equal(edited.seating.seats.length, 74); assert.equal(edited.seating.sets.length, 28);
  assert.equal(batch.material.color.getHexString(), TERRACE_CHAIR_COLOR.slice(1).toLowerCase());
  const deskMaterial = edited.seating.root.getObjectByName('Terrace_gloss_desks').material;
  for (const property of ['roughness', 'clearcoat', 'clearcoatRoughness', 'metalness', 'specularIntensity', 'envMapIntensity', 'sheen', 'map', 'bumpMap']) {
    assert.equal(batch.material[property], deskMaterial[property], `책상과 같은 마감: ${property}`);
  }
  assert.ok(!edited.seating.root.children.some(m => /^Cafe_Furniture__Integrated_/.test(m.name)), '이전 프레임·다리 의자는 남기지 않습니다.');
  const template = createTerraceChairTemplate();
  const roundSeats = edited.seating.seats.filter(s => s.chairDesign === 'round');
  assert.ok(roundSeats.length >= 25 && roundSeats.length < 50);
  assert.equal(batch.geometry.index.count, template.reduce((n, p) => n + p.geometry.index.count, 0) * roundSeats.length);
  const local = new Box3();
  for (const part of template) { part.geometry.computeBoundingBox(); local.union(part.geometry.boundingBox); }
  assert.ok(Math.abs(local.min.y) < 0.00001 && Math.abs(local.max.y - 0.735) < 0.001);
  assert.ok(local.getSize(new Vector3()).x > 0.73 && local.getSize(new Vector3()).x < 0.75);
  assert.ok(Math.abs(template[2].geometry.boundingBox.min.y - 0.46) < 0.001);
  assert.ok(Math.abs(template[2].geometry.boundingBox.getSize(new Vector3()).y - 0.275) < 0.001, '등받이 자체 높이는 기존 0.55m의 절반이어야 합니다.');
  assert.ok(Math.abs(template[1].geometry.boundingBox.getSize(new Vector3()).x / 0.66 - 1.12) < 0.001, '원형 좌판 지름은 12% 확대합니다.');
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  for (const seat of roundSeats) {
    const [x, y, z] = seat.position;
    ray.set(new Vector3(x, y + 0.65, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(batch)[0];
    assert.ok(hit && Math.abs(hit.point.y - y - 0.46) < 0.012, '모든 실제 좌판은 기존 인체 사용 높이에 있어야 합니다.');
    const radius = Math.hypot(x, z), direction = new Vector3(x, 0, z).normalize();
    ray.set(new Vector3(x, y + 0.60, z), direction);
    assert.ok(ray.intersectObject(batch).some(h => h.distance < 0.33), '등받이는 바깥쪽에 있어야 합니다.');
    ray.set(new Vector3(x, y + 0.60, z), direction.clone().negate()); ray.far = 0.4;
    assert.equal(ray.intersectObject(batch).length, 0, '중앙을 보는 앞쪽은 열려 있어야 합니다.'); ray.far = Infinity;
    assert.ok(edited.tiers[seat.tier].outer - radius - local.max.z >= 1.2, '의자 뒤에 보행 여유를 유지합니다.');
  }
  for (const part of template) part.geometry.dispose(); template[0].material.dispose();
});

test('새 파이프 의자를 두 층과 다인용 책상에 섞고 골드 유광 프레임·핑크 천 쿠션으로 구분한다', () => {
  const tubeSeats = edited.seating.seats.filter(s => s.chairDesign === 'tube');
  assert.ok(tubeSeats.length >= 25 && tubeSeats.length < 50);
  for (const tier of [0, 1]) assert.deepEqual(new Set(edited.seating.seats.filter(s => s.tier === tier).map(s => s.chairDesign)), new Set(['round', 'tube']));
  for (const set of edited.seating.sets.filter(s => s.capacity >= 3)) {
    assert.equal(new Set(edited.seating.seats.filter(s => s.setId === set.id).map(s => s.chairDesign)).size, 2);
  }
  const frame = edited.seating.root.getObjectByName('Terrace_tube_frames');
  const cushion = edited.seating.root.getObjectByName('Terrace_tube_cushions');
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  assert.equal(frame.material.color.getHexString(), desk.material.color.getHexString());
  for (const property of ['roughness', 'clearcoat', 'clearcoatRoughness', 'metalness', 'specularIntensity', 'envMapIntensity']) assert.equal(frame.material[property], desk.material[property]);
  assert.equal(cushion.material.color.getHexString(), TUBE_CUSHION_COLOR.slice(1).toLowerCase());
  assert.ok(cushion.material.roughness > 0.85 && cushion.material.sheen > 0.2 && cushion.material.bumpMap);
  assert.equal(cushion.material.clearcoat, 0); assert.equal(cushion.material.metalness, 0);
  assert.ok(cushion.geometry.attributes.uv);
  const template = createTubeChairTemplate(), local = new Box3();
  for (const part of template) { part.geometry.computeBoundingBox(); local.union(part.geometry.boundingBox); }
  assert.ok(Math.abs(local.min.y) < 0.00001 && Math.abs(local.max.y - 0.8) < 0.001);
  assert.ok(local.getSize(new Vector3()).x < 0.57);
  for (const mesh of [frame, cushion]) {
    const count = template.filter(p => p.material.name === mesh.material.name).reduce((n, p) => n + p.geometry.index.count, 0);
    assert.equal(mesh.geometry.index.count, count * tubeSeats.length, '프레임과 쿠션의 실제 모델 수가 배치 좌석 수와 일치해야 합니다.');
  }
  const ray = new Raycaster();
  for (const seat of tubeSeats) {
    const [x, y, z] = seat.position, direction = new Vector3(x, 0, z).normalize();
    ray.set(new Vector3(x, y + 0.6, z), new Vector3(0, -1, 0)); ray.far = 0.3;
    const hit = ray.intersectObject(cushion)[0];
    assert.ok(hit && Math.abs(hit.point.y - y - 0.46) < 0.012 && hit.face.normal.y > 0.9);
    assert.equal(ray.intersectObject(edited.seating.root.getObjectByName('Terrace_round_chairs')).length, 0, '두 의자를 같은 자리에 중복 배치하면 안 됩니다.');
    ray.set(new Vector3(x, y + 0.78, z), direction); ray.far = 0.35;
    assert.ok(ray.intersectObject(frame).length, '곡선 등받이는 바깥쪽에 있어야 합니다.');
    ray.set(new Vector3(x, y + 0.65, z), direction.clone().negate()); ray.far = 0.4;
    assert.equal(ray.intersectObject(frame).length, 0, '앞쪽은 열려 있어야 합니다.');
    assert.ok(edited.tiers[seat.tier].outer - Math.hypot(x, z) - local.max.z > 1.2);
  }
  const materials = new Set(template.map(p => p.material)); template.forEach(p => p.geometry.dispose());
  for (const material of materials) { material.bumpMap?.dispose(); material.dispose(); }
});

test('계단 책상 28개가 골드 유광 캡슐 상판과 두 판형 다리이며 앞판 없이 무릎 공간을 확보한다', () => {
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  assert.ok(desk && !edited.seating.root.getObjectByName('Terrace_wood_desks'));
  assert.equal(desk.material.color.getHexString(), 'e99804');
  assert.ok(desk.material.clearcoat >= 0.9 && desk.material.roughness < 0.25 && desk.material.clearcoatRoughness < 0.2);
  assert.equal(desk.material.map, null); assert.equal(desk.material.bumpMap, null);
  const ray = new Raycaster(), down = new Vector3(0, -1, 0);
  let indices = 0;
  for (const set of edited.seating.sets) {
    assert.equal(set.deskStyle, 'pill');
    const inner = edited.tiers[set.tier].inner, angle = (set.start + set.end) / 2, floorY = set.center[1];
    const radius = inner + 0.49, direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const parts = createPillDeskParts({ inner, start: set.start, end: set.end, floorY });
    assert.equal(parts.length, 3);
    for (const part of parts) { indices += part.index?.count ?? part.attributes.position.count; part.computeBoundingBox(); }
    for (const leg of parts.slice(1)) assert.ok(Math.abs(leg.boundingBox.min.y - floorY) < 0.00001, '두 다리 모두 바닥에 접지해야 합니다.');
    ray.set(direction.clone().multiplyScalar(radius).setY(floorY + 1.2), down); ray.far = 0.5;
    const top = ray.intersectObject(desk)[0];
    assert.ok(top && Math.abs(top.point.y - floorY - 0.79) < 0.001, '실제 책상 상면은 기존 높이를 유지해야 합니다.');
    for (const fraction of [-0.32, 0, 0.32]) for (const offset of [-0.20, 0.20]) {
      const a = angle + fraction * set.width / radius;
      ray.set(new Vector3(Math.cos(a) * (radius + offset), floorY + 1.1, Math.sin(a) * (radius + offset)), down); ray.far = 0.4;
      const hit = ray.intersectObject(desk)[0];
      assert.ok(hit && Math.abs(hit.point.y - floorY - 0.79) < 0.001 && hit.face.normal.y > 0.99,
        '긴 곡선 상판도 전체 폭에서 윗면이 채워지고 노멀이 위를 향해야 합니다.');
    }
    ray.set(direction.clone().multiplyScalar(inner + 0.05).setY(floorY + 0.52), direction); ray.far = 0.85;
    assert.equal(ray.intersectObject(desk).length, 0, '상판 아래 중앙은 막힌 앞판 없이 열려 있어야 합니다.');
    const a = angle + (set.width / 2 - 0.018) / radius;
    ray.set(new Vector3(Math.cos(a) * (radius + 0.31), floorY + 1, Math.sin(a) * (radius + 0.31)), down); ray.far = 0.3;
    assert.equal(ray.intersectObject(desk).length, 0, '상판의 양끝은 사각형이 아닌 둥근 캡슐 윤곽이어야 합니다.');
    parts.forEach(p => p.dispose());
  }
  assert.equal(desk.geometry.index.count, indices, '기존 앞판·턱·지지판 부품이 중복으로 남으면 안 됩니다.');
});
