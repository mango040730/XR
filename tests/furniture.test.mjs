import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Raycaster, Vector3, Group, PerspectiveCamera } from 'three';
import { CENTRAL_FURNITURE_LAYOUT } from '../src/central-furniture.js';
import { prepareSpace, isWalkable, CENTRAL_RADIUS, PATH_Y } from '../src/prepare-space.js';
import { centralIsRaised } from '../src/central-room.js';
import { collisionGeometry } from '../src/collision.js';
import { meshPieces } from '../src/mesh-pieces.js';
import { ENTRY_POSITION, ENTRY_RADIUS, ENTRY_OUTER_Z, ENTRY_HEIGHT, resetToEntrance, withinWalkBoundary } from '../src/entrance.js';
import { WALK_RADIUS } from '../src/prepare-space.js';

async function load(file) {
  const bytes = await readFile(new URL(`../public/models/${file}.glb`, import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
function fingerprint(asset) {
  const hash = createHash('sha256');
  asset.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (const attr of Object.values(mesh.geometry.attributes)) hash.update(new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength));
    if (mesh.geometry.index) hash.update(new Uint8Array(mesh.geometry.index.array.buffer));
    hash.update(JSON.stringify(mesh.material.toJSON()));
  });
  return hash.digest('hex');
}
const assets = new Map(await Promise.all(CENTRAL_FURNITURE_LAYOUT.map(async ({ id }) => [id, await load(`furniture-v2/${id}`)])));
const before = new Map([...assets].map(([id, asset]) => [id, fingerprint(asset)]));
const model = await load('space');
const edited = prepareSpace(model, { centralFurniture: assets });
const meshes = [], floors = [];
model.traverse(mesh => { if (mesh.isMesh) { meshes.push(mesh); if (isWalkable(mesh)) floors.push(mesh); } });

test('첨부 GLB의 원본 형상·재질·높이를 보존하며 참고 이미지 비중에 맞춰 넓혔다', () => {
  assert.equal(edited.furniture.groups.length, 6);
  assert.ok(edited.replacedFurniture.removedParts > 700);
  for (const group of edited.furniture.groups) {
    assert.equal(fingerprint(group.asset), before.get(group.id), `${group.id}의 메시와 재질을 보존해야 합니다.`);
    assert.equal(group.asset.scale.y, 1, '좌석과 책상의 사용 높이는 늘이지 않아야 합니다.');
    assert.ok(group.asset.scale.x >= 1.25 && group.asset.scale.x <= 1.8);
    assert.equal(group.asset.scale.x, group.asset.scale.z, '평면에서 가구 곡선의 비율을 보존해야 합니다.');
    assert.ok(Math.abs(new Box3().setFromObject(group.asset).min.y - group.floorY) < 0.00001);
  }
  assert.ok(!meshes.some(mesh => /^Lounge_Pods__/.test(mesh.name)), '기존 소파의 받침과 쿠션까지 모두 교체해야 합니다.');
  for (const mesh of meshes.filter(m => /^(Cafe_Furniture|Planting|Luminaires)__/.test(m.name) && !m.userData.centralFurniture && !m.userData.mixedSeating && !m.userData.referencePlanter)) {
    assert.ok(meshPieces(mesh).every(piece => Math.hypot(piece.center.x, piece.center.z) >= CENTRAL_RADIUS), '중앙에 옛 가구나 식재가 겹쳐 남으면 안 됩니다.');
  }
  const planter = model.getObjectByName('Planting__Warm_ivory_•_matte_ceramic__0_-2');
  assert.ok(planter?.userData.referencePlanter, '참고 이미지 앞쪽의 독립 화분은 유지해야 합니다.');
  assert.ok(Math.abs(new Box3().setFromObject(planter).min.y - 1.15) < 0.0001);
});

test('교체 가구의 모든 접지점이 앞·뒤 단차의 해당 바닥 위에 놓이며 외곽 좌석은 유지된다', () => {
  const ground = [edited.interior, edited.central.platform];
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 0.3);
  const world = new Vector3();
  for (const group of edited.furniture.groups) {
    let contacts = 0;
    group.asset.traverse(mesh => {
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        world.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(Math.hypot(world.x, world.z) < CENTRAL_RADIUS - 1.2, '외곽 이동 계단과 통로를 침범하면 안 됩니다.');
        if (world.y > group.floorY + 0.001) continue;
        assert.equal(centralIsRaised(world.x, world.z), group.raised, '한 가구가 서로 다른 바닥 높이를 가로지르면 안 됩니다.');
        ray.ray.origin.copy(world).add(new Vector3(0, 0.1, 0));
        const hit = ray.intersectObjects(ground, false)[0];
        assert.ok(hit && Math.abs(hit.point.y - group.floorY) < 0.0001, `${group.id}의 발과 화분이 바닥에 닿아야 합니다.`);
        contacts++;
      }
    });
    assert.ok(contacts > 50);
  }
  assert.equal(edited.seating.mixed.sets.length, 60);
  assert.equal(edited.seating.mixed.seats.length, 158);
  assert.equal(edited.pathY, PATH_Y);
  assert.equal(edited.pathWidth, 10);
  for (const [i, a] of edited.furniture.groups.entries()) for (const b of edited.furniture.groups.slice(i + 1)) {
    assert.ok(!new Box3().setFromObject(a.asset).intersectsBox(new Box3().setFromObject(b.asset)), '서로 다른 가구 묶음이 관통하면 안 됩니다.');
  }
});

test('실제 병합 충돌에 새 가구와 계단형 라운지가 포함되고 시작점에서 이동할 수 있다', () => {
  const body = collisionGeometry(meshes), floor = collisionGeometry(floors);
  try {
    assert.equal(body.geometry.index.count / 3, meshes.reduce((n, mesh) => n + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0));
    const ray = new Raycaster();
    for (let z = ENTRY_POSITION[2]; z >= WALK_RADIUS - 0.5; z -= 0.05) {
      assert.ok(withinWalkBoundary(0, z, WALK_RADIUS));
      ray.set(new Vector3(0, PATH_Y + 0.36, z), new Vector3(0, -1, 0)); ray.far = 0.96;
      assert.ok(Math.abs(ray.intersectObject(floor)[0].point.y - PATH_Y) < 0.0001);
      for (const h of [0.4, 0.95, 1.5]) for (const x of [-0.22, 0, 0.22]) {
        ray.set(new Vector3(x, ENTRY_POSITION[1] + h, z), new Vector3(0, 0, -1)); ray.far = 0.32;
        assert.equal(ray.intersectObject(body).length, 0);
      }
    }
    // The opening is empty at body height; the display remains over its head.
    ray.set(new Vector3(0, PATH_Y + 1.5, ENTRY_RADIUS - 1), new Vector3(0, 0, 1)); ray.far = 2;
    assert.equal(ray.intersectObject(body).length, 0);
    ray.set(new Vector3(0, PATH_Y + ENTRY_HEIGHT + 0.4, ENTRY_RADIUS - 1), new Vector3(0, 0, 1));
    assert.ok(ray.intersectObject(body).length, '출입구 위쪽의 디스플레이와 벽은 유지해야 합니다.');
    ray.set(new Vector3(0, PATH_Y + 1.5, ENTRY_RADIUS), new Vector3(1, 0, 0)); ray.far = 3;
    assert.ok(ray.intersectObject(body).length, '문틀 옆면은 실제 충돌이 있어야 합니다.');
    for (const group of edited.furniture.groups) {
      let hits = 0;
      group.asset.traverse(mesh => {
        if (!mesh.isMesh) return;
        const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
        const a = new Vector3().fromBufferAttribute(p, index ? index.getX(0) : 0).applyMatrix4(mesh.matrixWorld);
        const b = new Vector3().fromBufferAttribute(p, index ? index.getX(1) : 1).applyMatrix4(mesh.matrixWorld);
        const c = new Vector3().fromBufferAttribute(p, index ? index.getX(2) : 2).applyMatrix4(mesh.matrixWorld);
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        if (normal.lengthSq() < 0.5) return;
        const centre = a.add(b).add(c).divideScalar(3);
        ray.set(centre.addScaledVector(normal, 0.025), normal.negate()); ray.far = 0.03;
        assert.ok(ray.intersectObject(body).length, `${group.id}의 실제 메시가 충돌 장면에 포함돼야 합니다.`);
        hits++;
      });
      assert.ok(hits > 5);
    }
    const forum = edited.furniture.groups[0].asset;
    assert.ok(floors.some(mesh => mesh.userData.centralFurniture === forum.name && /^Forum__Coral_tier_cushions__/.test(mesh.name)), '새 계단형 라운지도 텔레포트 착지 대상이어야 합니다.');
  } finally {
    for (const mesh of [body, floor]) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
});

test('입구 바닥과 블루길이 전 폭에서 같은 외곽선과 높이로 연결된다', () => {
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 1);
  const carpet = edited.carpet.geometry.attributes.position;
  const rim = [];
  for (let i = carpet.count / 2; i < carpet.count; i++) if (carpet.getZ(i) > ENTRY_RADIUS * 0.95) rim.push({ x: carpet.getX(i), z: carpet.getZ(i) });
  rim.sort((a, b) => a.x - b.x);
  for (let x = -1.8; x <= 1.8; x += 0.09) {
    const i = rim.findIndex(p => p.x >= x), a = rim[i - 1], b = rim[i];
    const edgeZ = a.z + (b.z - a.z) * (x - a.x) / (b.x - a.x);
    for (const offset of [-0.01, -0.00005, 0.00005, 0.01, 0.5, 1.5]) {
      ray.ray.origin.set(x, PATH_Y + 0.2, edgeZ + offset);
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - PATH_Y) < 0.00001, '출입구 바닥에 틈이나 턱이 없어야 합니다.');
    }
  }
  ray.ray.origin.set(0, PATH_Y + 0.2, ENTRY_RADIUS + 0.15);
  const surfaces = ray.intersectObject(edited.digitalWall.root, true).filter(hit => Math.abs(hit.point.y - PATH_Y) < 0.00001);
  assert.deepEqual([...new Set(surfaces.map(hit => hit.object))], [edited.digitalWall.entrance.landing], '하단 벽 마감이 출입구 바닥 위에 겹치면 안 됩니다.');
});

test('초기·리셋 시 입구에서 안쪽을 바라보고 출입구 밖의 원형 경계는 유지된다', () => {
  const rig = new Group(), camera = new PerspectiveCamera(); rig.add(camera);
  rig.position.set(10, 3, 4); rig.rotation.y = 2; camera.rotation.set(0.7, 1, 0);
  resetToEntrance(rig, camera); rig.updateMatrixWorld(true);
  assert.deepEqual(rig.position.toArray(), ENTRY_POSITION);
  assert.equal(camera.position.y, 1.65);
  const direction = camera.getWorldDirection(new Vector3());
  assert.ok(direction.z < -0.99 && direction.y < 0, '시작 시 중앙 공간 쪽을 약간 내려다봐야 합니다.');
  assert.ok(withinWalkBoundary(0, ENTRY_POSITION[2], WALK_RADIUS));
  assert.ok(!withinWalkBoundary(2.5, ENTRY_RADIUS + 1, WALK_RADIUS));
  assert.ok(!withinWalkBoundary(0, ENTRY_OUTER_Z, WALK_RADIUS));
  assert.ok(!withinWalkBoundary(-ENTRY_RADIUS - 1, 0, WALK_RADIUS));
  resetToEntrance(rig, camera, true);
  assert.equal(camera.rotation.x, 0, 'VR에서는 고개 기울기를 강제로 적용하지 않아야 합니다.');
});
