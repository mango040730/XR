import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Raycaster, Vector3 } from 'three';
import { prepareSpace, isWalkable, FLOOR_Y, PATH_WIDTH, PATH_INNER_RADIUS, PATH_OUTER_RADIUS } from '../src/prepare-space.js';

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

test('두 배 폭의 카펫과 내부 공간의 바닥이 모두 같은 높이로 연결된다', () => {
  assert.equal(PATH_WIDTH, 10);
  assert.equal(PATH_WIDTH, (31.7 - 26.7) * 2);
  assert.equal(floors.length, 2);
  const ray = new Raycaster();
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
    for (const radius of [0, 20, PATH_INNER_RADIUS - 0.01, PATH_INNER_RADIUS + 0.01, 22, 23, 24, 25, 26, 27, 29, 30.8, PATH_OUTER_RADIUS - 0.01]) {
    ray.set(new Vector3(Math.cos(angle) * radius, 4, Math.sin(angle) * radius), new Vector3(0, -1, 0));
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - FLOOR_Y) < 0.001, `반경 ${radius}의 바닥이 평평하게 이어져야 합니다.`);
    }
  }
});

test('체크 줄눈과 주변 계단·턱이 렌더링 및 충돌 장면에서 제거됐다', () => {
  gltf.scene.traverse(object => {
    assert.ok(!/^Terraces__|tile.grout|circulation.deck/.test(object.name), object.name);
  });
  assert.equal(edited.carpet.material.type, 'MeshPhysicalMaterial');
  assert.equal(edited.carpet.material.sheen, 1);
  assert.ok(edited.carpet.material.roughness > 0.9);
  assert.ok(edited.carpet.material.bumpScale < 0.002);
  assert.equal(edited.carpet.material.map, null);
});

test('네 방향의 기존 계단 자리를 가로질러 이동할 수 있다', () => {
  for (const direction of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)]) {
    for (const height of [0.4, 0.95, 1.5]) {
      const origin = direction.clone().multiplyScalar(20);
      origin.y = FLOOR_Y + height;
      const ray = new Raycaster(origin, direction, 0, 10);
      assert.equal(ray.intersectObject(gltf.scene, true).length, 0, '옛 계단 구간에 보행을 막는 턱이 없어야 합니다.');
    }
  }
});

test('옛 상단 데크의 화분과 가구도 새 바닥으로 내려왔다', () => {
  const planter = gltf.scene.getObjectByName('Planting__Warm_ivory_•_matte_ceramic__0_2');
  assert.ok(Math.abs(new Box3().setFromObject(planter).min.y - FLOOR_Y) < 0.001);
  const frame = gltf.scene.getObjectByName('Cafe_Furniture__Golden_oak_furniture_frame__2_0');
  assert.ok(Math.abs(new Box3().setFromObject(frame).min.y - (originalFrameMinY - 0.84)) < 0.001);
});
