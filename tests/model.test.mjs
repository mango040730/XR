import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Raycaster, Vector3 } from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';
import { meshPieces } from '../src/mesh-pieces.js';
import { TERRACE_DEPTH, PASSAGE_WIDTH } from '../src/terrace-seating.js';
import { SCREEN_WALL_HEIGHT } from '../src/digital-wall.js';
import { prepareSpace, isWalkable, FLOOR_Y, PATH_WIDTH, PATH_INNER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, WALK_RADIUS, expandStairRadius } from '../src/prepare-space.js';

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
  assert.equal(PATH_INNER_RADIUS, 35.2);
  assert.equal(PATH_OUTER_RADIUS, 45.2);
  assert.ok(WALK_RADIUS > 44);
  assert.equal(edited.stairs.length, 9);
});

test('높은 블루길에서 원형 계단을 내려가 낮은 중앙 공간으로 이어진다', () => {
  const ray = new Raycaster();
  const samples = [[22, 1.15], [23, 1.15], [23.5, 1.29], [24, 1.43], [24.5, 1.57], [25, 1.71], [25.5, 1.85], [26, 1.99], [26.3, 1.99], [26.6, 1.99], [26.69, 1.99], [26.71, 1.99], [30, 1.99], [35.7, 1.99]];
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    for (const [radius, expected] of samples) {
      const expanded = radius <= 26.3 ? expandStairRadius(radius) : PATH_INNER_RADIUS + (radius - 26.7);
      ray.set(new Vector3(Math.cos(angle) * expanded, 4, Math.sin(angle) * expanded), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - expected) < 0.001, `반경 ${radius}의 높이 ${expected}가 필요합니다.`);
    }
  }
  assert.ok(PATH_Y - FLOOR_Y > 0.8, '전체 평탄화하면 안 됩니다.');
});

test('블루길과 최상단 계단 사이에 틈이나 별도의 턱이 없다', () => {
  const ray = new Raycaster();
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
    for (const radius of [expandStairRadius(26.26), 35.1, 35.199, 35.201, 36, 40, 44.4]) {
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
  const frame = gltf.scene.getObjectByName('Cafe_Furniture__Golden_oak_furniture_frame__2_0');
  assert.ok(Math.abs(new Box3().setFromObject(frame).min.y - originalFrameMinY) < 0.001);
});


test('각 원형 계단 단이 가구와 통로를 담는 깊이 4m로 확장됐다', () => {
  assert.equal(TERRACE_DEPTH, 4);
  const ray = new Raycaster();
  for (const [radius, expected] of [[23.6, 1.43], [26.8, 1.43], [27.6, 1.71], [30.4, 1.71], [31.6, 1.99], [34.8, 1.99]]) {
    ray.set(new Vector3(radius / Math.SQRT2, 4, radius / Math.SQRT2), new Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObjects(floors, false)[0].point.y - expected) < 0.001);
  }
});

test('중앙을 보는 의자 10개만 남고 반대편 의자 20개는 전체 조립체가 제거됐다', () => {
  assert.equal(edited.seating.removedChairs, 20);
  assert.equal(edited.seating.retainedChairs, 10);
  const parts = [];
  gltf.scene.traverse(mesh => { if (mesh.isMesh && /^Cafe_Furniture__/.test(mesh.name)) parts.push(...meshPieces(mesh)); });
  const seats = parts.filter(p => Math.abs(p.center.y - 2.49) < 0.015 && Math.abs(p.size.y - 0.11) < 0.015 && Math.hypot(p.center.x, p.center.z) > 31);
  const backs = parts.filter(p => Math.abs(p.center.y - 2.9) < 0.015 && Math.abs(p.size.y - 0.38) < 0.015 && Math.hypot(p.center.x, p.center.z) > 31);
  assert.equal(seats.length, 10);
  assert.equal(backs.length, 10);
  for (const seat of seats) {
    const back = backs.reduce((a, b) => a.center.distanceTo(seat.center) < b.center.distanceTo(seat.center) ? a : b);
    const facing = seat.center.clone().sub(back.center).setY(0).normalize();
    assert.ok(facing.dot(seat.center.clone().setY(0).normalize().negate()) > 0.9);
  }
  assert.equal(parts.filter(p => Math.abs(p.size.y - 0.466) < 0.015 && p.bounds.min.y > 1.99 && Math.hypot(p.center.x, p.center.z) > 31).length, 40, '남은 의자의 다리 4개씩만 있어야 합니다.');
  assert.equal(parts.filter(p => Math.abs(p.size.y - 0.75) < 0.015 && p.bounds.min.y > 1.99 && Math.hypot(p.center.x, p.center.z) > 31).length, 40, '테이블 다리 4개씩은 보존해야 합니다.');
});

test('실제 가구 충돌 장면에서 1.2m 폭의 안쪽 통로가 비어 있다', () => {
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    computeBoundsTree.call(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  });
  const ray = new Raycaster();
  ray.firstHitOnly = true;
  ray.far = PASSAGE_WIDTH - 0.02;
  for (let i = 0; i < 360; i++) {
    const a = i * Math.PI / 180;
    const direction = new Vector3(Math.cos(a), 0, Math.sin(a));
    for (const height of [0.4, 0.95, 1.5]) {
      const origin = direction.clone().multiplyScalar(31.21); origin.y = PATH_Y + height;
      ray.set(origin, direction);
      assert.equal(ray.intersectObject(gltf.scene, true).length, 0, `각도 ${i}의 통로를 가구가 막으면 안 됩니다.`);
    }
  }
});

test('디지털 스크린이 이음부를 포함한 360도 전 방향의 벽을 덮는다', () => {
  const ray = new Raycaster();
  const wall = edited.digitalWall;
  for (let i = 0; i <= 720; i++) {
    const angle = i * Math.PI / 360;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    for (const height of [0.3, SCREEN_WALL_HEIGHT / 2, SCREEN_WALL_HEIGHT - 0.3]) {
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

test('블루길 바깥에서 전 방향의 디지털 벽 충돌이 유지된다', () => {
  const ray = new Raycaster(); ray.far = 1;
  for (let i = 0; i < 360; i++) {
    const angle = i * Math.PI / 180;
    const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const origin = direction.clone().multiplyScalar(WALK_RADIUS); origin.y = PATH_Y + 1.5;
    ray.set(origin, direction);
    const hit = ray.intersectObject(edited.digitalWall.root, true)[0];
    assert.ok(hit && hit.distance > 0.75 && hit.distance < 0.82, '벽의 충돌면이 전체 원을 둘러야 합니다.');
  }
});
