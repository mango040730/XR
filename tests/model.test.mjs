import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Raycaster, Vector3 } from 'three';
import { prepareSpace, isWalkable, FLOOR_Y, PATH_WIDTH, PATH_INNER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, WALK_RADIUS } from '../src/prepare-space.js';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
gltf.scene.updateMatrixWorld(true);
const originalFrameMinY = new Box3().setFromObject(gltf.scene.getObjectByName('Cafe_Furniture__Golden_oak_furniture_frame__2_0')).min.y;
const edited = prepareSpace(gltf.scene);
const floors = [];
gltf.scene.traverse(object => {
  if (object.isMesh && isWalkable(object)) floors.push(object);
});

test('원본 공간 모델이 누락되거나 변경되지 않았다', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '856fb59b6ea8b0494e0be265c0f1ed8df86df7cd3a0ce4724eae2218b27853eb');
});

test('사람 눈높이의 시작점 아래에 평평한 바닥이 있다', () => {
  const ray = new Raycaster(new Vector3(0, 2.825, 22), new Vector3(0, -1, 0));
  const hit = ray.intersectObjects(floors, false)[0];
  assert.ok(hit, '시작점 아래의 바닥이 필요합니다.');
  assert.ok(Math.abs(hit.point.y - 1.15) < 0.001);
  assert.ok(Math.abs(hit.face.normal.y) > 0.9);
  ray.set(new Vector3(0, 2.825, 22), new Vector3(0, 0, -1));
  ray.far = 1.5;
  assert.equal(ray.intersectObject(gltf.scene, true).length, 0, '시작점 앞에 보행 공간이 필요합니다.');
});

test('블루길 폭은 10m이며 중앙 공간을 침범하지 않고 바깥으로 확장된다', () => {
  assert.ok(Math.abs(PATH_WIDTH - 10) < 0.001);
  assert.equal(PATH_INNER_RADIUS, 26.7);
  assert.equal(PATH_OUTER_RADIUS, 36.7);
  assert.ok(WALK_RADIUS > 35);
  assert.equal(edited.stairs.length, 9);
});

test('높은 블루길에서 원형 계단을 내려가 낮은 중앙 공간으로 이어진다', () => {
  const ray = new Raycaster();
  const samples = [[22, 1.15], [23, 1.15], [23.5, 1.29], [24, 1.43], [24.5, 1.57], [25, 1.71], [25.5, 1.85], [26, 1.99], [26.3, 1.99], [26.6, 1.99], [26.69, 1.99], [26.71, 1.99], [30, 1.99], [35.7, 1.99]];
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    for (const [radius, expected] of samples) {
      ray.set(new Vector3(Math.cos(angle) * radius, 4, Math.sin(angle) * radius), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - expected) < 0.001, `반경 ${radius}의 높이 ${expected}가 필요합니다.`);
    }
  }
  assert.ok(PATH_Y - FLOOR_Y > 0.8, '전체 평탄화하면 안 됩니다.');
});

test('블루길과 최상단 계단 사이에 틈이나 별도의 턱이 없다', () => {
  const ray = new Raycaster();
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
    for (const radius of [26.26, 26.4, 26.6, 26.699, 26.701, 27, 30, 35.8]) {
      ray.set(new Vector3(Math.cos(angle) * radius, 4, Math.sin(angle) * radius), new Vector3(0, -1, 0));
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
    for (let distance = 0; distance <= 13.6; distance += 0.08) {
      const radius = sign === 1 ? 22 + distance : 35.6 - distance;
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
  const frame = gltf.scene.getObjectByName('Cafe_Furniture__Golden_oak_furniture_frame__2_0');
  assert.ok(Math.abs(new Box3().setFromObject(frame).min.y - originalFrameMinY) < 0.001);
});
