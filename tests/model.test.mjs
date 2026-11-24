import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Color, Matrix4, Raycaster, Vector3 } from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { meshPieces } from '../src/mesh-pieces.js';
import { TERRACE_DEPTH, PASSAGE_WIDTH } from '../src/terrace-seating.js';
import { SCREEN_WALL_HEIGHT } from '../src/digital-wall.js';
import { CLAY_TRIANGLE_BUDGET } from '../src/clay-style.js';
import { MIXED_TIERS, SEATED_TIER_COUNT } from '../src/mixed-seating.js';
import { TOTAL_RISE, PREVIOUS_TOTAL_RISE, ACCESS_STEP_RISE, ACCESS_STEP_COUNT, ACCESS_STEPS_PER_TIER } from '../src/space-levels.js';
import { ACCESS_HALF_ANGLE, ACCESS_DIRECTIONS } from '../src/joined-stairs.js';
import { CENTRAL_STEP_RISE, centralBoundary, centralIsRaised } from '../src/central-room.js';
import { collisionGeometry } from '../src/collision.js';
import { SPACE_COLORS } from '../src/space-colors.js';
import { ENTRY_POSITION, ENTRY_HEIGHT, ENTRY_WIDTH } from '../src/entrance.js';
import { prepareSpace, isWalkable, FLOOR_Y, PATH_WIDTH, PATH_INNER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, WALK_RADIUS, CENTRAL_RADIUS } from '../src/prepare-space.js';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
gltf.scene.updateMatrixWorld(true);
// Compare smoothing against the original shapes after the requested rigid
// floor-level translation, rather than treating that translation as distortion.
function expectedLiftedGeometry(mesh) {
  const geometry = mesh.geometry.clone(), p = geometry.attributes.position;
  for (const piece of meshPieces(mesh)) {
    if (!centralIsRaised(piece.center.x, piece.center.z)) continue;
    for (const i of piece.vertices) p.setY(i, p.getY(i) + CENTRAL_STEP_RISE);
  }
  return geometry;
}
let sourceCentralRoundSeats = 0;
gltf.scene.traverse(mesh => {
  if (mesh.isMesh && /^Lounge_Pods__.*Tangerine_ottoman/.test(mesh.name)) {
    sourceCentralRoundSeats += meshPieces(mesh).filter(p => Math.hypot(p.center.x, p.center.z) < 23.2).length;
  }
});
const sourceUpholstery = expectedLiftedGeometry(gltf.scene.getObjectByName('Lounge_Pods__Coral_cushion_variation__0_0'));
sourceUpholstery.computeBoundingBox();
const sourceSeatTriangles = gltf.scene.getObjectByName('Lounge_Pods__Terracotta_coral_upholstery__0_0').geometry.index.count / 3;
const edited = prepareSpace(gltf.scene);
const floors = [];
gltf.scene.traverse(object => {
  if (object.isMesh && isWalkable(object)) floors.push(object);
});

test('실행용 충돌 병합은 GLB와 비인덱스 중앙 바닥을 함께 처리한다', () => {
  const meshes = [];
  gltf.scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert.equal(edited.central.platform.geometry.index, null, '생성한 비인덱스 바닥도 검사에 포함해야 합니다.');
  const body = collisionGeometry(meshes), floor = collisionGeometry(floors);
  assert.ok(body.geometry.boundsTree && floor.geometry.boundsTree);
  const triangles = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
  assert.equal(body.geometry.index.count / 3, triangles, '충돌 병합에서 바닥이나 가구를 누락하면 안 됩니다.');
  const ray = new Raycaster(new Vector3(0, 1.535, 22), new Vector3(0, -1, 0), 0, 0.96);
  assert.ok(Math.abs(ray.intersectObject(floor)[0].point.y - 1.15) < 0.00001);
  // The real merged collider must allow a full metre of forward travel from
  // the spawn point, checking the same feet and body samples as the runtime.
  for (let z = 22; z >= 21; z -= 0.05) {
    ray.set(new Vector3(0, 1.535, z), new Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObject(floor)[0].point.y - 1.15) < 0.00001);
    for (const height of [0.4, 0.95, 1.5]) for (const x of [-0.22, 0, 0.22]) {
      ray.set(new Vector3(x, 1.175 + height, z), new Vector3(0, 0, -1));
      ray.far = 0.32;
      assert.equal(ray.intersectObject(body).length, 0);
    }
    ray.far = 0.96;
  }
  ray.set(new Vector3(3, 1.79, 0), new Vector3(0, -1, 0));
  assert.ok(Math.abs(ray.intersectObject(floor)[0].point.y - 1.43) < 0.00001, '새 중앙 바닥도 실제 충돌 바닥에 들어 있어야 합니다.');
  for (const mesh of [body, floor]) { mesh.geometry.dispose(); mesh.material.dispose(); }
});

test('원본 공간 모델이 누락되거나 변경되지 않았다', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '856fb59b6ea8b0494e0be265c0f1ed8df86df7cd3a0ce4724eae2218b27853eb');
});

test('출입구 시작점 아래에 블루길과 같은 높이의 평평한 바닥이 있다', () => {
  const eye = new Vector3(...ENTRY_POSITION).add(new Vector3(0, 1.65, 0));
  const ray = new Raycaster(eye, new Vector3(0, -1, 0));
  const hit = ray.intersectObjects(floors, false)[0];
  assert.ok(hit, '시작점 아래의 바닥이 필요합니다.');
  assert.ok(Math.abs(hit.point.y - PATH_Y) < 0.001);
  assert.ok(Math.abs(hit.face.normal.y) > 0.9);
  ray.set(eye, new Vector3(0, 0, -1));
  ray.far = 1.5;
  assert.equal(ray.intersectObject(gltf.scene, true).length, 0, '시작점 앞에 보행 공간이 필요합니다.');
});

test('블루길 폭은 10m이며 중앙 공간을 침범하지 않고 바깥으로 확장된다', () => {
  assert.ok(Math.abs(PATH_WIDTH - 10) < 0.001);
  assert.equal(PATH_INNER_RADIUS, 35.2);
  assert.equal(PATH_OUTER_RADIUS, 45.2);
  assert.ok(WALK_RADIUS > 44);
  assert.equal(edited.stairs.length, 1);
});

test('낮춘 블루길에서 이동 계단 15단을 내려가 중앙 공간으로 이어진다', () => {
  const ray = new Raycaster();
  assert.equal(ACCESS_STEP_COUNT, 15);
  for (const angle of ACCESS_DIRECTIONS) {
    for (let band = 0; band < ACCESS_STEP_COUNT; band++) {
      const radius = CENTRAL_RADIUS + (band + 0.5) * (PATH_INNER_RADIUS - CENTRAL_RADIUS) / ACCESS_STEP_COUNT;
      ray.set(new Vector3(Math.cos(angle) * radius, PATH_Y + 2, Math.sin(angle) * radius), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      const expected = FLOOR_Y + (band + 1) * ACCESS_STEP_RISE;
      assert.ok(hit && Math.abs(hit.point.y - expected) < 0.001, `이동 계단 ${band + 1}단의 높이가 맞아야 합니다.`);
    }
  }
});

test('블루길과 최상단 계단 사이에 틈이나 별도의 턱이 없다', () => {
  const ray = new Raycaster();
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
    for (const radius of [35.1, 35.199, 35.201, 36, 40, 44.4]) {
      ray.set(new Vector3(Math.cos(angle) * radius, PATH_Y + 2, Math.sin(angle) * radius), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - PATH_Y) < 0.001, '상단 계단과 블루길은 같은 높이여야 합니다.');
    }
  }
});

test('원형 계단은 보존하고 체크 줄눈과 경계 장식 턱만 제거했다', () => {
  gltf.scene.traverse(object => {
    assert.ok(!/tile.grout|circulation.deck|^Terraces.*Warm_ivory/.test(object.name), object.name);
  });
  assert.equal(edited.carpet.material.type, 'MeshPhysicalMaterial');
  assert.equal(edited.carpet.material.sheen, 1);
  assert.ok(edited.carpet.material.roughness > 0.9);
  assert.ok(edited.carpet.material.bumpScale < 0.002);
  assert.equal(edited.carpet.material.map, null);
  assert.ok(edited.stairs.every(stair => isWalkable(stair)));
});

test('실제 계단 바닥을 한 단씩 오르내려 블루길 전체 폭을 이용할 수 있다', () => {
  const ray = new Raycaster();
  for (const sign of [1, -1]) {
    let previous = sign === 1 ? FLOOR_Y : PATH_Y;
    for (let distance = 0; distance <= 22.4; distance += 0.08) {
      const radius = sign === 1 ? 22 + distance : 44.4 - distance;
      ray.set(new Vector3(0, previous + 0.36, radius), new Vector3(0, -1, 0));
      ray.far = 0.96;
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit, `반경 ${radius}에서 발을 디딜 바닥이 필요합니다.`);
      assert.ok(hit.point.y - previous <= 0.34, '이동 코드가 오를 수 있는 높이를 넘으면 안 됩니다.');
      assert.ok(previous - hit.point.y <= 0.6, '계단에 낙하하는 틈이 없어야 합니다.');
      previous = hit.point.y;
    }
  }
});

test('상단 계단의 화분과 가구를 중앙 바닥으로 내려놓지 않는다', () => {
  const planter = gltf.scene.getObjectByName('Planting__Warm_ivory_•_matte_ceramic__0_2');
  assert.ok(Math.abs(new Box3().setFromObject(planter).min.y - PATH_Y) < 0.001);
  const ray = new Raycaster();
  for (const seat of edited.seating.mixed.seats) {
    const [x, y, z] = seat.position;
    ray.set(new Vector3(x, y + 0.1, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - y) < 0.001, '의자의 발이 해당 계단 단에 있어야 합니다.');
  }
});


test('전체 지름을 유지하며 단 깊이를 3m로 줄여 중앙 지름을 6m 넓혔다', () => {
  assert.equal(TERRACE_DEPTH, 3);
  assert.ok(Math.abs(CENTRAL_RADIUS - 26.2) < 0.00001);
  assert.ok(Math.abs(PATH_OUTER_RADIUS * 2 - 90.4) < 0.00001);
  const ray = new Raycaster();
  for (const tier of MIXED_TIERS) {
    for (const radius of [tier.inner + 0.1, tier.outer - 0.1]) {
      ray.set(new Vector3(radius / Math.SQRT2, PATH_Y + 2, radius / Math.SQRT2), new Vector3(0, -1, 0));
      assert.ok(Math.abs(ray.intersectObjects(floors, false)[0].point.y - tier.height) < 0.001);
    }
  }
  // The 3m-wide annulus that used to hold the first tier is now central floor.
  for (let i = 0; i < 360; i++) {
    const a = i * Math.PI / 180;
    ray.set(new Vector3(Math.cos(a) * 25.9, PATH_Y + 2, Math.sin(a) * 25.9), new Vector3(0, -1, 0));
    const expected = FLOOR_Y + (centralIsRaised(Math.cos(a) * 25.9, Math.sin(a) * 25.9) ? CENTRAL_STEP_RISE : 0);
    assert.ok(Math.abs(ray.intersectObjects(floors, false)[0].point.y - expected) < 0.001);
  }
});

test('계단 스툴과 중앙 원형 계단의 떠 있는 좌석 네 개를 받침까지 제거했다', () => {
  assert.equal(edited.seating.removedStools, 2);
  assert.equal(edited.central.removedFloatingSeats, 4);
  assert.equal(edited.central.removedFloatingSeatParts, 8);
  let central = 0;
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.mixedSeating) return;
    if (/^Lounge_Pods__(Tangerine_ottoman|Sunflower_cushions|Cobalt_fabric|Sofa_recessed_plinth)__-1_0$/.test(mesh.name)) {
      const parts = meshPieces(mesh);
      assert.ok(parts.every(p => Math.max(p.size.x, p.size.z) > 3), '작은 원형 좌석과 받침이 남으면 안 됩니다.');
    }
    if (/^Lounge_Pods__.*Tangerine_ottoman/.test(mesh.name)) {
      central += meshPieces(mesh).filter(p => Math.hypot(p.center.x, p.center.z) < 23.2).length;
    }
    if (!/^Cafe_Furniture__.*(Sofa_recessed|Tangerine_ottoman|Sunflower_cushions)/.test(mesh.name)) return;
    for (const part of meshPieces(mesh)) {
      assert.ok(Math.hypot(part.center.x, part.center.z) < CENTRAL_RADIUS, '계단 영역에 둥근 스툴의 구성 부품이 남으면 안 됩니다.');
    }
  });
  assert.ok(sourceCentralRoundSeats > 0);
  assert.equal(central, sourceCentralRoundSeats - 2, '작은 오렌지 좌석 두 개를 제외한 큰 라운지 좌석은 유지해야 합니다.');
});

test('각 단 앞쪽에 1~4인용 곡선 일체형 책상을 모두 섞어 촘촘히 배치했다', () => {
  const mixed = edited.seating.mixed;
  assert.ok(mixed.singleSets >= SEATED_TIER_COUNT * 4);
  assert.ok(mixed.sharedSets >= SEATED_TIER_COUNT * 12);
  assert.ok(mixed.seats.length > 100);
  const ray = new Raycaster();
  for (let tier = 0; tier < SEATED_TIER_COUNT; tier++) {
    const sets = mixed.sets.filter(set => set.tier === tier);
    assert.deepEqual([...new Set(sets.map(s => s.capacity))].sort(), [1, 2, 3, 4]);
    assert.ok(new Set(sets.map(s => Math.round(s.width))).size >= 4);
    assert.ok(sets.length >= 10);
    for (const set of sets) {
      assert.ok(set.integrated);
      assert.ok(set.width >= 1.6 && set.width < 10);
      assert.ok(set.capacity >= 1 && set.capacity <= 4);
      assert.equal(set.type, set.capacity === 1 ? "single" : "shared");
      assert.ok(Math.abs(set.inner - MIXED_TIERS[tier].inner - 0.14) < 0.001);
      assert.equal(mixed.seats.filter(seat => seat.setId === set.id).length, set.capacity);
      for (const fraction of [0.1, 0.5, 0.9]) {
        const a = set.start + (set.end - set.start) * fraction;
        const r = (set.inner + set.outer) / 2;
        ray.set(new Vector3(r * Math.cos(a), MIXED_TIERS[tier].height + 1.5, r * Math.sin(a)), new Vector3(0, -1, 0));
        const hit = ray.intersectObject(mixed.root, true)[0];
        assert.ok(hit && Math.abs(hit.point.y - MIXED_TIERS[tier].height - 0.79) < 0.002, '곡선 책상 상판 전체가 해당 단 앞쪽을 따라야 합니다.');
      }
    }
  }
});

test('책상은 일체형 형태와 지정 골드를 유지하며 나뭇결·요철이 없다', () => {
  const wood = gltf.scene.getObjectByName('Terrace_wood_desks');
  assert.ok(wood && wood.userData.woodenDesks);
  assert.equal(wood.material.name, 'Terrace golden timber');
  assert.equal(wood.material.map, null);
  assert.equal(wood.material.bumpMap, null);
  assert.equal(wood.material.bumpScale, 0);
  assert.equal(wood.material.color.getHexString(), 'e99804');
  const parts = meshPieces(wood), sets = edited.seating.mixed.sets;
  const fronts = parts.filter(p => Math.abs(p.size.y - 1.03) < 0.001);
  const sides = parts.filter(p => Math.abs(p.size.y - 0.74) < 0.001);
  assert.equal(fronts.length, sets.length);
  assert.equal(sides.length, sets.length * 2);
  assert.equal(parts.filter(p => Math.abs(p.size.y - 0.7) < 0.001).length, 0, '별도 목재 다리는 제거해야 합니다.');
  const ray = new Raycaster();
  for (const set of sets) {
    const angle = (set.start + set.end) / 2;
    const radius = MIXED_TIERS[set.tier].inner + 0.19;
    ray.set(new Vector3(radius * Math.cos(angle), set.center[1] + 1.3, radius * Math.sin(angle)), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(wood, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - set.center[1] - 1.03) < 0.001, '기존 높이의 앞쪽 턱과 패널을 복원해야 합니다.');
  }
  for (const panel of [...fronts, ...sides]) {
    const p = wood.geometry.attributes.position;
    const vertex = [...panel.vertices].find(i => Math.abs(p.getY(i) - panel.bounds.min.y) < 0.00001);
    assert.notEqual(vertex, undefined);
    ray.set(new Vector3(p.getX(vertex), p.getY(vertex) + 0.01, p.getZ(vertex)), new Vector3(0, -1, 0));
    const floor = ray.intersectObjects(floors, false)[0];
    assert.ok(floor && Math.abs(floor.point.y - panel.bounds.min.y) < 0.001, '지지판이 해당 계단 바닥에 닿아야 합니다.');
  }
  const chairMaterials = new Set();
  gltf.scene.traverse(mesh => {
    if (mesh.isMesh && mesh.userData.mixedSeating && !mesh.userData.woodenDesks) chairMaterials.add(mesh.material);
  });
  assert.equal(chairMaterials.size, 2);
  for (const material of chairMaterials) {
    assert.match(material.name, /^Terrace chair/);
    assert.equal(material.color.getHexString(), 'e99804', '계단 의자 전체가 지정 골드여야 합니다.');
    assert.ok(material.clearcoat >= 0.3, '의자의 기존 마감 광택은 유지해야 합니다.');
  }
});

test('지정한 다섯 색상과 아래 두 단 좌석만 적용되고 맨윗단 가구는 없다', () => {
  assert.equal(edited.interior.material.color.getHexString(), 'f4cfb8');
  assert.equal(edited.carpet.material.color.getHexString(), '1a3880');
  assert.equal(gltf.scene.getObjectByName('Terrace_wood_desks').material.color.getHexString(), 'e99804');
  const cushion = gltf.scene.getObjectByName('Lounge_Pods__Coral_cushion_variation__0_0');
  assert.equal(cushion.material.color.getHexString(), 'ed715d');
  const shell = gltf.scene.getObjectByName('Lounge_Pods__Warm_ivory_•_matte_ceramic__0_0');
  assert.equal(shell.material.color.getHexString(), 'fde8dc');
  const upholstery = gltf.scene.getObjectByName('Lounge_Pods__Terracotta_coral_upholstery__0_0');
  assert.ok(upholstery.material.vertexColors);
  let backs = 0, pads = 0;
  for (const part of meshPieces(upholstery)) {
    const vertex = [...part.vertices][0];
    const actual = new Color().fromBufferAttribute(upholstery.geometry.attributes.color, vertex).getHexString();
    if (part.size.y > 0.35) { assert.equal(actual, 'fde8dc'); backs++; }
    else { assert.equal(actual, 'ed715d'); pads++; }
  }
  assert.ok(backs > 0 && pads > 0);
  assert.equal(SEATED_TIER_COUNT, 2);
  const mixed = edited.seating.mixed;
  assert.ok(mixed.sets.every(s => s.tier < 2));
  assert.ok(mixed.seats.every(s => s.tier < 2));
  mixed.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      assert.ok(Math.hypot(p.getX(i), p.getZ(i)) < MIXED_TIERS[2].inner, '맨윗단에 실제 책상·의자 부품이 남으면 안 됩니다.');
    }
  });
});

test('최상단의 윗면만 블루이며 아래 두 단과 수직면은 연그레이다', () => {
  const stairs = edited.stairs[0];
  assert.ok(Array.isArray(stairs.material));
  assert.equal(stairs.geometry.groups.length, 2);
  assert.equal(stairs.material[1], edited.carpet.material);
  const ray = new Raycaster();
  for (let tier = 0; tier < 3; tier++) {
    const radius = (MIXED_TIERS[tier].inner + MIXED_TIERS[tier].outer) / 2;
    for (const angle of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
      ray.set(new Vector3(radius * Math.cos(angle), PATH_Y + 2, radius * Math.sin(angle)), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(stairs, false)[0];
      assert.ok(hit);
      const actual = stairs.material[hit.face.materialIndex].color.getHexString();
      assert.equal(actual, tier === 2 ? edited.carpet.material.color.getHexString() : 'd9dadd');
    }
  }
  for (const angle of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
    const radius = MIXED_TIERS[2].inner - 0.1;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    ray.set(new Vector3(radius * direction.x, PATH_Y - 0.5, radius * direction.z), direction);
    const hit = ray.intersectObject(stairs, false)[0];
    assert.ok(hit && hit.distance < 0.15);
    assert.equal(stairs.material[hit.face.materialIndex].color.getHexString(), 'd9dadd', '블루 윗면 아래의 수직 앞면은 연그레이여야 합니다.');
  }
  for (let band = 0; band < ACCESS_STEP_COUNT - 1; band++) {
    const radius = CENTRAL_RADIUS + (band + 0.5) * (PATH_INNER_RADIUS - CENTRAL_RADIUS) / ACCESS_STEP_COUNT;
    ray.set(new Vector3(0, PATH_Y + 2, radius), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(stairs, false)[0];
    assert.equal(stairs.material[hit.face.materialIndex].color.getHexString(), 'd9dadd', '이동용 계단은 연그레이로 구분해야 합니다.');
  }
});

test('실제 모든 의자가 테이블 바깥쪽 한 줄에서만 중앙을 바라본다', () => {
  const parts = [];
  gltf.scene.traverse(mesh => { if (mesh.isMesh && mesh.userData.mixedSeating) parts.push(...meshPieces(mesh)); });
  const seats = parts.filter(p => Math.abs(p.size.y - 0.11) < 0.005 && Math.max(p.size.x, p.size.z) > 0.5 && Math.max(p.size.x, p.size.z) < 0.9);
  const backs = parts.filter(p => Math.abs(p.size.y - 0.38) < 0.005);
  assert.equal(seats.length, edited.seating.mixed.seats.length);
  assert.equal(backs.length, seats.length);
  for (const seat of seats) {
    const back = backs.reduce((a, b) => a.center.distanceTo(seat.center) < b.center.distanceTo(seat.center) ? a : b);
    const facing = seat.center.clone().sub(back.center).setY(0).normalize();
    assert.ok(facing.dot(seat.center.clone().setY(0).normalize().negate()) > 0.99);
    const placement = edited.seating.mixed.seats.reduce((a, b) => {
      const centerA = new Vector3(...a.position).add(new Vector3(0, 0.5, 0));
      const centerB = new Vector3(...b.position).add(new Vector3(0, 0.5, 0));
      return seat.center.distanceTo(centerA) < seat.center.distanceTo(centerB) ? a : b;
    });
    assert.ok(Math.hypot(seat.center.x - placement.position[0], seat.center.z - placement.position[2]) < 0.005);
    const seatHeight = seat.center.y - placement.position[1];
    assert.ok(seatHeight > 0.45 && seatHeight < 0.55, '실제 좌판은 해당 단 바닥에서 약 0.5m 높이에 있어야 합니다.');
    const set = edited.seating.mixed.sets.find(set => set.id === placement.setId);
    assert.ok(Math.hypot(seat.center.x, seat.center.z) > set.outer + 0.3, '책상 바깥쪽 한 줄에만 의자가 있어야 합니다.');
  }
  assert.equal(parts.filter(p => Math.abs(p.size.y - 0.466) < 0.01).length, seats.length * 4, '의자 다리 전체가 있어야 합니다.');
});

test('실제 가구 충돌 장면에서 1.2m 폭의 의자 뒤쪽 통로가 비어 있다', () => {
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    computeBoundsTree.call(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  });
  const ray = new Raycaster();
  ray.firstHitOnly = true;
  ray.far = PASSAGE_WIDTH - 0.02;
  for (const tier of MIXED_TIERS) {
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180;
      const direction = new Vector3(Math.cos(a), 0, Math.sin(a));
      for (const height of [0.4, 0.95, 1.5]) {
        const origin = direction.clone().multiplyScalar(tier.outer - 0.01); origin.y = tier.height + height;
        ray.set(origin, direction.clone().negate());
        assert.equal(ray.intersectObject(gltf.scene, true).length, 0, `반경 ${tier.inner}, 각도 ${i}의 통로가 비어 있어야 합니다.`);
      }
    }
  }
});

test('실제 책상 상판이 각 단 둘레의 80% 이상을 채우며 불필요한 큰 공백이 없다', () => {
  const ray = new Raycaster(); ray.firstHitOnly = true;
  const mixed = edited.seating.mixed;
  for (let t = 0; t < SEATED_TIER_COUNT; t++) {
    const tier = MIXED_TIERS[t], radius = tier.inner + 0.49;
    function hasDesktop(angle) {
      ray.set(new Vector3(radius * Math.cos(angle), tier.height + 1.5, radius * Math.sin(angle)), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(mixed.root, true)[0];
      return !!hit && Math.abs(hit.point.y - tier.height - 0.79) < 0.002;
    }
    let covered = 0;
    for (let i = 0; i < 720; i++) if (hasDesktop(i * Math.PI / 360)) covered++;
    assert.ok(covered / 720 > 0.8, `좌석 ${t + 1}층의 책상 점유율이 충분해야 합니다.`);
    for (const [start, end] of mixed.clearIntervals[t]) {
      let gap = 0;
      for (let distance = 0.08; distance < (end - start) * radius; distance += 0.15) {
        gap = hasDesktop(start + distance / radius) ? 0 : gap + 0.15;
        assert.ok(gap <= 0.6, '계단을 제외한 책상 사이에 넓은 빈 구간이 남으면 안 됩니다.');
      }
    }
  }
});

test('네 방향 이동 계단에서 몸통과 어깨 경로를 책상과 의자가 막지 않는다', () => {
  const floorRay = new Raycaster(), bodyRay = new Raycaster();
  bodyRay.firstHitOnly = true; bodyRay.far = 0.12;
  for (const angle of ACCESS_DIRECTIONS) {
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const tangent = new Vector3(-direction.z, 0, direction.x);
    for (let radius = CENTRAL_RADIUS - 0.2; radius < PATH_INNER_RADIUS + 0.2; radius += 0.12) {
      for (const side of [-0.24, 0, 0.24]) {
        const point = direction.clone().multiplyScalar(radius).addScaledVector(tangent, side);
        floorRay.set(new Vector3(point.x, PATH_Y + 2, point.z), new Vector3(0, -1, 0));
        const floor = floorRay.intersectObjects(floors, false)[0];
        assert.ok(floor);
        for (const height of [0.7, 1.25, 1.65]) {
          bodyRay.set(new Vector3(point.x, floor.point.y + height, point.z), direction);
          assert.equal(bodyRay.intersectObject(gltf.scene, true).length, 0, '이동 계단의 신체 경로를 비워야 합니다.');
        }
      }
    }
  }
});

test('출입구를 제외한 원형 벽과 출입구 상부는 빈 디지털 스크린으로 이어진다', () => {
  const ray = new Raycaster();
  const wall = edited.digitalWall;
  for (let i = 0; i <= 720; i++) {
    const angle = i * Math.PI / 360;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    for (const height of [0.3, SCREEN_WALL_HEIGHT / 2, SCREEN_WALL_HEIGHT - 0.3]) {
      if (height < ENTRY_HEIGHT + 0.3 && direction.z > 0 && Math.abs(direction.x) * wall.radius < ENTRY_WIDTH / 2 + 0.5) continue;
      ray.set(new Vector3(0, PATH_Y + height, 0), direction);
      const hit = ray.intersectObject(wall.root, true)[0];
      assert.ok(hit, `각도 ${i / 2}에서 벽에 틈이 없어야 합니다.`);
      assert.equal(hit.object, wall.screen);
      assert.ok(Math.abs(Math.hypot(hit.point.x, hit.point.z) - wall.radius) < 0.002);
    }
  }
});

test('스크린은 UI 없는 빈 발광 표면이고 기존 벽 장식은 제거됐다', () => {
  const screen = edited.digitalWall.screen;
  assert.equal(screen.material.map, null);
  assert.equal(screen.material.emissiveMap, null);
  assert.ok(screen.material.emissiveIntensity > 0);
  assert.ok(screen.material.clearcoat > 0);
  assert.ok(screen.geometry.attributes.uv, '나중에 콘텐츠를 적용할 독립된 화면 표면이 필요합니다.');
  gltf.scene.traverse(mesh => assert.ok(!/^(Architecture|Signage)__/.test(mesh.name), '기존 반원 벽·간판·문·장식이 남으면 안 됩니다.'));
});

test('실제 출입구를 제외한 디지털 벽의 충돌이 유지된다', () => {
  const ray = new Raycaster(); ray.far = 1;
  for (let i = 0; i < 360; i++) {
    const angle = i * Math.PI / 180;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    if (direction.z > 0 && Math.abs(direction.x) * edited.digitalWall.radius < ENTRY_WIDTH / 2 + 0.5) continue;
    const origin = direction.clone().multiplyScalar(WALK_RADIUS); origin.y = PATH_Y + 1.5;
    ray.set(origin, direction);
    const hit = ray.intersectObject(edited.digitalWall.root, true)[0];
    assert.ok(hit && hit.distance > 0.75 && hit.distance < 0.82, '벽의 충돌면이 전체 원을 둘러야 합니다.');
  }
});

test('소파 쿠션의 실제 곡면을 부드럽게 다듬되 좌석 외곽과 크기는 보존했다', () => {
  const geometry = gltf.scene.getObjectByName('Lounge_Pods__Coral_cushion_variation__0_0').geometry;
  computeBoundsTree.call(sourceUpholstery);
  let largestChange = 0;
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const hit = sourceUpholstery.boundsTree.closestPointToPoint(new Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    largestChange = Math.max(largestChange, hit.distance);
  }
  assert.ok(largestChange > 0.003, '재질 변경과 함께 쿠션의 실제 형상도 둥글게 다듬어야 합니다.');
  assert.ok(largestChange < 0.08, '쿠션 형태를 과하게 변형하면 안 됩니다.');
  assert.ok(geometry.boundingBox.min.distanceTo(sourceUpholstery.boundingBox.min) < 0.00001);
  assert.ok(geometry.boundingBox.max.distanceTo(sourceUpholstery.boundingBox.max) < 0.00001);
  assert.ok(edited.clay.softenedPieces >= 150);
});

test('도장·새틴·도자기·금속의 광택을 구분하고 스크린과 벨벳은 유지했다', () => {
  const materials = new Map();
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || !/^(Planting|Cafe_Furniture|Lounge_Pods|Luminaires)__/.test(mesh.name)) return;
    assert.equal(mesh.material.flatShading, false);
    materials.set(mesh.material.name, mesh.material);
  });
  const lacquer = materials.get('Golden oak furniture frame');
  const fabric = materials.get('Terracotta coral upholstery');
  const ceramic = materials.get('Warm ivory • matte ceramic');
  const metal = materials.get('Sofa recessed plinth');
  const floor = materials.get('Warm grey terrace treads');
  assert.ok(lacquer.roughness < fabric.roughness && fabric.roughness < floor.roughness);
  assert.ok(lacquer.clearcoat >= 0.3 && ceramic.clearcoat >= 0.25);
  assert.ok(fabric.sheen >= 0.2 && fabric.metalness === 0);
  assert.ok(metal.metalness >= 0.7 && metal.roughness < 0.3);
  assert.equal(ceramic.metalness, 0);
  assert.equal(edited.carpet.material.sheen, 1);
  assert.equal(edited.digitalWall.screen.material.clearcoat, 0.8);
});

test('좌판은 실제 곡면 정점과 밀착된 입체 마감선을 가진다', () => {
  const cushions = [];
  gltf.scene.traverse(mesh => {
    if (mesh.isMesh && /^Lounge_Pods__Terracotta_coral_upholstery__0_0/.test(mesh.name)) cushions.push(mesh);
  });
  assert.ok(cushions.reduce((n, m) => n + m.geometry.index.count / 3, 0) > sourceSeatTriangles * 2.5, '큰 평면 좌판과 등받이를 실제 곡면으로 나눠야 합니다.');
  const welting = gltf.scene.getObjectByName('Sofa_seat_tailored_welting');
  assert.equal(edited.clay.welting.seats, 55);
  assert.equal(welting.material.color.getHexString(), SPACE_COLORS.coral.slice(1).toLowerCase());
  for (const mesh of cushions) computeBoundsTree.call(mesh.geometry);
  const p = welting.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 97) {
    const point = new Vector3().fromBufferAttribute(p, i);
    const distance = Math.min(...cushions.map(mesh => mesh.geometry.boundsTree.closestPointToPoint(point).distance));
    assert.ok(distance < 0.035, '마감선은 실제 쿠션 표면에 붙어 있어야 합니다.');
  }
});

test('왼쪽 소파 연결부와 화분이 서로 관통하지 않는다', () => {
  assert.equal(edited.loungeSpacing.removedArmrests, 2);
  assert.ok(edited.loungeSpacing.sofaParts > 10, '좌판뿐 아니라 등받이·하부 프레임도 함께 옮겨야 합니다.');
  const moved = [], others = [];
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || !/^Lounge_Pods__/.test(mesh.name)) return;
    (mesh.userData.spacedLounge ? moved : others).push(mesh);
  });
  assert.ok(moved.length >= 4);
  for (const mesh of moved) {
    computeBoundsTree.call(mesh.geometry);
    for (const other of others) {
      const matrix = new Matrix4().copy(mesh.matrixWorld).invert().multiply(other.matrixWorld);
      assert.equal(mesh.geometry.boundsTree.intersectsGeometry(other.geometry, matrix), false,
        `옆 소파에 파고드는 부품이 없어야 합니다: ${mesh.name} / ${other.name}`);
    }
  }
  const pot = gltf.scene.getObjectByName('Planting__Warm_ivory_•_matte_ceramic__-2_-1');
  const bounds = new Box3().setFromObject(pot);
  for (const mesh of [...moved, ...others]) {
    // Original material batches span multiple sofas; inspect each connected
    // component instead of the empty space inside their combined bounding box.
    for (const piece of meshPieces(mesh)) {
      assert.equal(bounds.intersectsBox(piece.bounds.clone().applyMatrix4(mesh.matrixWorld)), false,
        `화분과 소파 부품 사이에 여유가 필요합니다: ${mesh.name}`);
    }
  }
  assert.ok(bounds.max.x < -17.6);
});

test('곡면 상세를 높여도 삼각형 예산과 공간 외곽은 보존된다', () => {
  let triangles = 0;
  gltf.scene.traverse(mesh => { if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
  assert.ok(triangles > edited.clay.originalTriangles);
  assert.ok(triangles <= CLAY_TRIANGLE_BUDGET);
  assert.ok(edited.clay.refinedPieces > 0);
  assert.ok(edited.clay.beforeBounds.min.distanceTo(edited.clay.afterBounds.min) < 0.00001);
  assert.ok(edited.clay.beforeBounds.max.distanceTo(edited.clay.afterBounds.max) < 0.00001);
});

test('가구·식재 전체가 곡면 처리되고 잎·자갈·다리는 매끄러운 입체로 재구성됐다', () => {
  assert.ok(edited.clay.detail.length > 1500);
  assert.ok(edited.clay.detail.every(p => p.primitive || p.passes >= 1), '면 수 제한 때문에 성긴 원본 부품을 건너뛰면 안 됩니다.');
  assert.ok(edited.clay.detail.every(p => !/foliage|Plant_stems/.test(p.name)), '기존 구형 식물 메시를 남기지 않아야 합니다.');
  assert.equal(edited.clay.detail.filter(p => /River_pebble/.test(p.name)).every(p => p.primitive === 'pebble'), true);
  const frame = gltf.scene.getObjectByName('Cafe_Furniture__Integrated_Terrace_chair_gold_frame');
  assert.ok(frame.geometry.index.count / 3 >= 158 * 6 * 400, '158개 의자의 여섯 프레임 부품이 실제 원형 곡면이어야 합니다.');
  const leaf = gltf.scene.getObjectByName('Botanical_leaves');
  assert.ok(leaf.geometry.index.count > 1000000);
  for (const mesh of [frame, leaf]) {
    const normals = mesh.geometry.attributes.normal;
    for (let i = 0; i < normals.count; i += 17) {
      const n = new Vector3().fromBufferAttribute(normals, i);
      assert.ok(Number.isFinite(n.lengthSq()) && Math.abs(n.length() - 1) < 0.00001);
    }
  }
});

test('네 이동 계단의 양쪽 경계 전체에 빠지는 틈이 없다', () => {
  const ray = new Raycaster(); ray.firstHitOnly = true;
  for (const direction of ACCESS_DIRECTIONS) {
    for (const side of [-1, 1]) {
      const boundary = direction + side * ACCESS_HALF_ANGLE;
      for (let band = 0; band < ACCESS_STEP_COUNT; band++) {
        const radius = CENTRAL_RADIUS + (band + 0.5) * (PATH_INNER_RADIUS - CENTRAL_RADIUS) / ACCESS_STEP_COUNT;
        const low = FLOOR_Y + (band + 1) * ACCESS_STEP_RISE;
        const high = FLOOR_Y + Math.ceil((band + 1) / ACCESS_STEPS_PER_TIER) * ACCESS_STEP_RISE * ACCESS_STEPS_PER_TIER;
        for (const offset of [-0.5, -0.2, -0.01, 0, 0.01, 0.2, 0.5]) {
          const angle = boundary + offset / radius;
          ray.set(new Vector3(radius * Math.cos(angle), PATH_Y + 2, radius * Math.sin(angle)), new Vector3(0, -1, 0));
          const hit = ray.intersectObjects(floors, false)[0];
          assert.ok(hit && hit.point.y >= low - 0.001 && hit.point.y <= high + 0.001, '두 계단 경계가 중앙 바닥까지 꺼지면 안 됩니다.');
          assert.equal(hit.object, edited.stairs[0]);
        }
      }
    }
  }
});

test('높이가 다른 두 계단의 측면도 빈틈 없이 연결됐다', () => {
  const ray = new Raycaster(); ray.firstHitOnly = true; ray.far = 0.2;
  for (const direction of ACCESS_DIRECTIONS) {
    for (const side of [-1, 1]) {
      const boundary = direction + side * ACCESS_HALF_ANGLE;
      for (const band of [0, ACCESS_STEPS_PER_TIER, ACCESS_STEPS_PER_TIER * 2]) {
        const radius = CENTRAL_RADIUS + (band + 0.5) * (PATH_INNER_RADIUS - CENTRAL_RADIUS) / ACCESS_STEP_COUNT;
        const angle = boundary - side * 0.002;
        const low = FLOOR_Y + (band + 1) * ACCESS_STEP_RISE;
        const origin = new Vector3(radius * Math.cos(angle), low + ACCESS_STEP_RISE / 2, radius * Math.sin(angle));
        const lateral = new Vector3(-Math.sin(boundary) * side, 0, Math.cos(boundary) * side);
        ray.set(origin, lateral);
        const hit = ray.intersectObject(edited.stairs[0], false)[0];
        assert.ok(hit && hit.distance < 0.1, '좌석 계단과 이동 계단 사이에 연결 측면이 있어야 합니다.');
        assert.equal(hit.face.materialIndex, 0, '이동 계단 옆 수직면은 블루 카펫이 아닌 연그레이여야 합니다.');
      }
    }
  }
});

test('계단과 블루길은 동일한 외곽선을 공유해 미세한 이음 틈도 없다', () => {
  const ray = new Raycaster(); ray.firstHitOnly = true;
  for (let i = 0; i < 720; i++) {
    const angle = i * Math.PI / 360;
    for (const delta of [-0.003, -0.0005, 0, 0.0005, 0.003]) {
      const radius = PATH_INNER_RADIUS + delta;
      ray.set(new Vector3(radius * Math.cos(angle), PATH_Y + 2, radius * Math.sin(angle)), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - PATH_Y) < 0.001, '상단 계단과 블루길 사이에 미세한 빈틈도 없어야 합니다.');
    }
  }
});


test('직전 중간 좌석 층의 높이를 새 최고 높이로 삼아 3개 층을 고르게 낮췄다', () => {
  const ray = new Raycaster();
  ray.set(new Vector3(0, PATH_Y + 2, 22), new Vector3(0, -1, 0));
  const lower = ray.intersectObjects(floors, false)[0].point.y;
  ray.set(new Vector3(40, PATH_Y + 2, 0), new Vector3(0, -1, 0));
  const upper = ray.intersectObjects(floors, false)[0].point.y;
  assert.ok(Math.abs(lower - 1.15) < 0.00001);
  assert.ok(Math.abs((upper - lower) / PREVIOUS_TOTAL_RISE - 2 / 3) < 0.00001);
  assert.ok(Math.abs(TOTAL_RISE - 4.4810666667) < 0.00001);
  assert.ok(Math.abs(upper - 5.6310666667) < 0.00001);
  assert.ok(Math.abs(upper - (FLOOR_Y + PREVIOUS_TOTAL_RISE * 2 / 3)) < 0.00001);
  const tierHeights = [];
  for (const tier of MIXED_TIERS) {
    const radius = (tier.inner + tier.outer) / 2;
    ray.set(new Vector3(radius / Math.SQRT2, PATH_Y + 2, radius / Math.SQRT2), new Vector3(0, -1, 0));
    tierHeights.push(ray.intersectObjects(floors, false)[0].point.y);
  }
  assert.ok(tierHeights[0] > lower && tierHeights[1] > tierHeights[0] && tierHeights[2] > tierHeights[1]);
  assert.ok(Math.abs(tierHeights[2] - upper) < 0.00001);
  for (let i = 0; i < tierHeights.length; i++) {
    assert.ok(Math.abs(tierHeights[i] - (i === 0 ? lower : tierHeights[i - 1]) - TOTAL_RISE / 3) < 0.00001);
  }

  assert.ok(ACCESS_STEP_RISE < 0.34, '낮춘 이동 계단도 기존 보행 한계 안에 있어야 합니다.');
});

test('중앙은 앞쪽보다 뒤쪽 바닥이 28cm 높은 실제 두 레벨이다', () => {
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  for (const [x, z, height] of [[0, 22, 1.15], [-10, -12, 1.43], [3, 0, 1.43], [-12, 12, 1.15], [15, 15, 1.15]]) {
    ray.ray.origin.set(x, 3, z);
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(Math.abs(hit.point.y - height) < 0.00001);
    assert.ok(hit.face.normal.y > 0.99);
  }
  const platform = edited.central.platform;
  assert.equal(platform.userData.walkable, true);
  platform.geometry.computeBoundingBox();
  assert.ok(Math.abs(platform.geometry.boundingBox.min.y - 1.15) < 0.00001);
  assert.ok(Math.abs(platform.geometry.boundingBox.max.y - 1.43) < 0.00001);
  const p = platform.geometry.attributes.position;
  let topArea = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(p, i), b = new Vector3().fromBufferAttribute(p, i + 1), c = new Vector3().fromBufferAttribute(p, i + 2);
    if ([a, b, c].every(v => Math.abs(v.y - 1.43) < 0.00001)) topArea += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  assert.ok(topArea > 1000, '가느다란 경계 오브젝트 대신 뒤쪽 바닥 전체를 채워야 합니다.');
});

test('굽은 중앙 단차에 수직면이 있고 실제 보행 높이로 양방향 통과할 수 있다', () => {
  const ray = new Raycaster(), direction = new Vector3(-1, 0, -1).normalize();
  for (let u = -10.2; u <= -4.4; u += 0.2) {
    const boundary = centralBoundary(u);
    const point = s => new Vector3((s + u) / Math.SQRT2, 0, (s - u) / Math.SQRT2);
    const front = point(boundary + 0.08), back = point(boundary - 0.08);
    for (const [from, to, expected] of [[1.15, back, 1.43], [1.43, front, 1.15]]) {
      ray.set(to.clone().setY(from + 0.36), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(Math.abs(hit.point.y - expected) < 0.00001);
      assert.ok(hit.point.y - from <= 0.34 && from - hit.point.y <= 0.6);
    }
    ray.set(front.clone().setY(1.29), direction); ray.far = 0.2;
    const side = ray.intersectObject(edited.central.platform, false)[0];
    assert.ok(side && Math.abs(side.face.normal.y) < 0.01, '경계 아래에 빈틈 없는 실제 단의 수직면이 필요합니다.');
    ray.far = Infinity;
  }
});

test('X 표시된 앞 오른쪽 테이블과 의자·소품 및 별도 경계 블록이 제거됐다', () => {
  assert.equal(edited.seating.removedCentralCafeParts, 65);
  assert.equal(edited.central.removedDividers, 2);
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.mixedSeating) return;
    if (/^Cafe_Furniture__/.test(mesh.name)) {
      for (const p of meshPieces(mesh)) {
        assert.ok(!(p.center.x > 9 && p.center.z > 9 && Math.hypot(p.center.x, p.center.z) < CENTRAL_RADIUS));
      }
    }
    if (/^Lounge_Pods__Warm_ivory/.test(mesh.name)) {
      assert.ok(meshPieces(mesh).every(p => Math.abs(p.size.y - 0.5848) > 0.002));
    }
  });
});

test('중앙 소파와 화분의 바닥 접점은 곡선 단차를 가로지르거나 공중에 뜨지 않는다', () => {
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  let checked = 0;
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || !/^(Lounge_Pods|Planting)__.*Warm_ivory/.test(mesh.name)) return;
    const positions = mesh.geometry.attributes.position;
    for (const p of meshPieces(mesh)) {
      if (Math.hypot(p.center.x, p.center.z) >= CENTRAL_RADIUS) continue;
      if (![1.15, 1.43].some(y => Math.abs(p.bounds.min.y - y) < 0.001)) continue;
      const bottom = p.vertices.filter(i => positions.getY(i) < p.bounds.min.y + 0.001);
      for (let k = 0; k < bottom.length; k += Math.max(1, Math.floor(bottom.length / 12))) {
        const i = bottom[k];
        ray.ray.origin.set(positions.getX(i), 2, positions.getZ(i));
        const hit = ray.intersectObjects(floors, false)[0];
        assert.ok(Math.abs(hit.point.y - p.bounds.min.y) < 0.001, `가구가 바닥 높이를 따라야 합니다: ${mesh.name}`);
        checked++;
      }
    }
  });
  assert.ok(checked > 150);
});


test('식물은 도톰한 클레이 잎·잎맥·잎자루와 자연스러운 가지로 구성된다', () => {
  const botanical = edited.botanical, mesh = gltf.scene.getObjectByName('Botanical_leaves');
  assert.equal(botanical.plots.length, 11);
  assert.equal(botanical.trees, 34);
  assert.ok(botanical.leaves.length > 800);
  assert.ok(botanical.leaves.filter(l => l.kind === 'canopy').every(l => l.petiole));
  const p = mesh.geometry.attributes.position;
  for (const leaf of botanical.leaves.filter((_, i) => i % 23 === 0)) {
    const point = key => new Vector3().fromBufferAttribute(p, leaf.range.start + leaf.sample[key]);
    assert.ok(point('base').distanceTo(leaf.base) < 0.00001);
    assert.ok(point('tip').distanceTo(leaf.tip) < 0.00001);
    const thickness = point('upper').distanceTo(point('lower'));
    assert.ok(thickness > 0.003 && thickness < 0.08, '잎몸은 도톰한 클레이 볼륨을 가져야 합니다.');
    assert.equal(leaf.profile, 'rounded-clay-blade');
    assert.ok(point('tipLeft').distanceTo(point('tipRight')) / point('middleLeft').distanceTo(point('middleRight')) > 0.25, '끝부분이 날카로운 종이 형태로 좁아지면 안 됩니다.');
    assert.ok(point('base').distanceTo(point('tip')) > leaf.width);
  }
  assert.ok(gltf.scene.getObjectByName('Botanical_branches').geometry.index.count > 100000, '가지·잎자루가 실제 입체 메시여야 합니다.');
});

test('모든 화분의 실제 흙 영역을 둥근 자갈로 촘촘히 채웠다', () => {
  const bedding = edited.planterStones;
  assert.equal(bedding.plots.length, edited.botanical.plots.length);
  assert.ok(bedding.stones.length > 600);
  assert.ok(bedding.mesh.geometry.index.count > 1000000);
  for (const plot of bedding.plots) {
    assert.ok(plot.stones >= 20, '탁상 화분도 자갈을 채워야 합니다.');
    assert.ok(plot.coverage >= 0.9, `흙이 많이 드러나면 안 됩니다: ${plot.coverage}`);
  }
  for (const stone of bedding.stones.filter((_, i) => i % 17 === 0)) {
    const plot = bedding.plots[stone.plot];
    assert.ok(plot.bounds.containsPoint(new Vector3(stone.x, plot.soilY, stone.z)));
    assert.ok(stone.y - stone.ry < plot.soilY && stone.y + stone.ry > plot.soilY, '돌은 흙에 살짝 묻혀 있어야 합니다.');
  }
});

test('식물 뿌리는 기존 화분 흙에 닿고 수관은 기존 식재 영역 안에 있다', () => {
  for (const group of edited.botanical.plots) {
    assert.ok(group.envelope.clone().expandByScalar(0.0001).containsBox(group.bounds), '식물이 보행 영역으로 새로 튀어나오면 안 됩니다.');
  }
  for (const root of edited.botanical.roots) {
    const group = edited.botanical.plots[root.plot];
    assert.ok(root.point.y <= group.soilY && root.point.y >= group.soilY - 0.03);
    assert.ok(group.envelope.containsPoint(root.point));
  }
});
