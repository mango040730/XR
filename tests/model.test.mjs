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
import { CLAY_TRIANGLE_BUDGET } from '../src/clay-style.js';
import { MIXED_TIERS } from '../src/mixed-seating.js';
import { TOTAL_RISE, PREVIOUS_TOTAL_RISE, ACCESS_STEP_RISE } from '../src/space-levels.js';
import { ACCESS_HALF_ANGLE, ACCESS_DIRECTIONS } from '../src/joined-stairs.js';
import { prepareSpace, isWalkable, FLOOR_Y, PATH_WIDTH, PATH_INNER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, WALK_RADIUS, expandStairRadius } from '../src/prepare-space.js';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
gltf.scene.updateMatrixWorld(true);
const sourceLeafGeometry = gltf.scene.getObjectByName('Planting__Forest_foliage__-1_1').geometry.clone();
sourceLeafGeometry.computeBoundingBox();
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
  assert.equal(edited.stairs.length, 1);
});

test('높은 블루길에서 원형 계단을 내려가 낮은 중앙 공간으로 이어진다', () => {
  const ray = new Raycaster();
  const samples = [[22, 1.15], [23, 1.15], [23.5, 1.29], [24, 1.43], [24.5, 1.57], [25, 1.71], [25.5, 1.85], [26, 1.99], [26.3, 1.99], [26.6, 1.99], [26.69, 1.99], [26.71, 1.99], [30, 1.99], [35.7, 1.99]];
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    for (const [radius, expected] of samples) {
      const expanded = radius <= 26.3 ? expandStairRadius(radius) : PATH_INNER_RADIUS + (radius - 26.7);
      ray.set(new Vector3(Math.cos(angle) * expanded, 4, Math.sin(angle) * expanded), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - (FLOOR_Y + (expected - FLOOR_Y) * 2)) < 0.001, `반경 ${radius}의 단차가 두 배여야 합니다.`);
    }
  }
  assert.ok(PATH_Y - FLOOR_Y > 1.6, '전체 평탄화하면 안 됩니다.');
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
  const ray = new Raycaster();
  for (const seat of edited.seating.mixed.seats) {
    const [x, y, z] = seat.position;
    ray.set(new Vector3(x, y + 0.1, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - y) < 0.001, '의자의 발이 해당 계단 단에 있어야 합니다.');
  }
});


test('각 원형 계단 단이 가구와 통로를 담는 깊이 4m로 확장됐다', () => {
  assert.equal(TERRACE_DEPTH, 4);
  const ray = new Raycaster();
  for (const [radius, expected] of [[23.6, 1.43], [26.8, 1.43], [27.6, 1.71], [30.4, 1.71], [31.6, 1.99], [34.8, 1.99]]) {
    ray.set(new Vector3(radius / Math.SQRT2, 4, radius / Math.SQRT2), new Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObjects(floors, false)[0].point.y - (FLOOR_Y + (expected - FLOOR_Y) * 2)) < 0.001);
  }
});

test('세 계단 단 모두에 1인 테이블과 3인용 긴 테이블이 섞여 있다', () => {
  const mixed = edited.seating.mixed;
  assert.equal(mixed.singleSets, 17);
  assert.equal(mixed.sharedSets, 18);
  assert.equal(mixed.seats.length, 71);
  for (let tier = 0; tier < 3; tier++) {
    const sets = mixed.sets.filter(set => set.tier === tier);
    assert.ok(sets.some(set => set.type === 'single' && set.capacity === 1));
    assert.ok(sets.some(set => set.type === 'shared' && set.capacity === 3));
    for (const set of sets) {
      assert.ok(Math.abs(set.center[1] - MIXED_TIERS[tier].height) < 0.001);
      assert.equal(mixed.seats.filter(seat => seat.setId === set.id).length, set.capacity);
    }
  }
});

test('실제 의자 71개가 테이블 바깥쪽 한 줄에서만 중앙을 바라본다', () => {
  const parts = [];
  gltf.scene.traverse(mesh => { if (mesh.isMesh && mesh.userData.mixedSeating) parts.push(...meshPieces(mesh)); });
  const seats = parts.filter(p => Math.abs(p.size.y - 0.11) < 0.005 && Math.max(p.size.x, p.size.z) > 0.5 && Math.max(p.size.x, p.size.z) < 0.9);
  const backs = parts.filter(p => Math.abs(p.size.y - 0.38) < 0.005);
  assert.equal(seats.length, 71);
  assert.equal(backs.length, 71);
  for (const seat of seats) {
    const back = backs.reduce((a, b) => a.center.distanceTo(seat.center) < b.center.distanceTo(seat.center) ? a : b);
    const facing = seat.center.clone().sub(back.center).setY(0).normalize();
    assert.ok(facing.dot(seat.center.clone().setY(0).normalize().negate()) > 0.99);
    const set = edited.seating.mixed.sets.reduce((a, b) => {
      const centerA = new Vector3(...a.center), centerB = new Vector3(...b.center);
      return seat.center.distanceTo(centerA) < seat.center.distanceTo(centerB) ? a : b;
    });
    const relative = seat.center.clone().sub(new Vector3(...set.center));
    assert.ok(relative.dot(new Vector3(...set.outward)) > 0.7, '테이블 반대편에 의자가 있으면 안 됩니다.');
  }
  assert.equal(parts.filter(p => Math.abs(p.size.y - 0.466) < 0.01).length, 71 * 4, '의자 다리 전체가 있어야 합니다.');
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
  for (const tier of MIXED_TIERS) {
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180;
      const direction = new Vector3(Math.cos(a), 0, Math.sin(a));
      for (const height of [0.4, 0.95, 1.5]) {
        const origin = direction.clone().multiplyScalar(tier.inner + 0.01); origin.y = tier.height + height;
        ray.set(origin, direction);
        assert.equal(ray.intersectObject(gltf.scene, true).length, 0, `반경 ${tier.inner}, 각도 ${i}의 통로가 비어 있어야 합니다.`);
      }
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

test('클레이 곡면은 실제 기하가 세분화되고 표면 형태도 둥글게 변했다', () => {
  const leaf = gltf.scene.getObjectByName('Planting__Forest_foliage__-1_1');
  assert.ok(leaf.geometry.index.count > sourceLeafGeometry.index.count * 3);
  computeBoundsTree.call(sourceLeafGeometry);
  const p = leaf.geometry.attributes.position;
  let largestChange = 0;
  for (let i = 0; i < p.count; i += 3) {
    const hit = sourceLeafGeometry.boundsTree.closestPointToPoint(new Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    largestChange = Math.max(largestChange, hit.distance);
  }
  assert.ok(largestChange > 0.001, '평면 삼각형만 분할하는 대신 실제 곡면을 만들어야 합니다.');
  assert.ok(leaf.geometry.boundingBox.min.distanceTo(sourceLeafGeometry.boundingBox.min) < 0.00001);
  assert.ok(leaf.geometry.boundingBox.max.distanceTo(sourceLeafGeometry.boundingBox.max) < 0.00001);
});

test('가구와 식재는 부드러운 무광 클레이이며 스크린과 벨벳은 유지된다', () => {
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh || !/^(Planting|Cafe_Furniture|Lounge_Pods|Luminaires)__/.test(mesh.name)) return;
    assert.equal(mesh.material.flatShading, false);
    assert.equal(mesh.material.metalness, 0);
    assert.ok(mesh.material.roughness >= 0.85);
    assert.equal(mesh.material.clearcoat, 0);
    assert.ok(mesh.material.specularIntensity < 0.3);
  });
  assert.equal(edited.carpet.material.sheen, 1);
  assert.equal(edited.digitalWall.screen.material.clearcoat, 0.8);
});

test('곡면 상세를 높여도 삼각형 예산과 공간 외곽은 보존된다', () => {
  let triangles = 0;
  gltf.scene.traverse(mesh => { if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
  assert.ok(triangles > edited.clay.originalTriangles * 1.5);
  assert.ok(triangles <= CLAY_TRIANGLE_BUDGET);
  assert.ok(edited.clay.beforeBounds.min.distanceTo(edited.clay.afterBounds.min) < 0.00001);
  assert.ok(edited.clay.beforeBounds.max.distanceTo(edited.clay.afterBounds.max) < 0.00001);
});

test('네 이동 계단의 양쪽 경계 전체에 빠지는 틈이 없다', () => {
  const ray = new Raycaster(); ray.firstHitOnly = true;
  for (const direction of ACCESS_DIRECTIONS) {
    for (const side of [-1, 1]) {
      const boundary = direction + side * ACCESS_HALF_ANGLE;
      for (let band = 0; band < 6; band++) {
        const radius = 24.2 + band * 2;
        const low = band === 5 ? PATH_Y : FLOOR_Y + (band + 1) * ACCESS_STEP_RISE;
        const high = band >= 4 ? PATH_Y : FLOOR_Y + Math.ceil((band + 1) / 2) * ACCESS_STEP_RISE * 2;
        for (const offset of [-0.5, -0.2, -0.01, 0, 0.01, 0.2, 0.5]) {
          const angle = boundary + offset / radius;
          ray.set(new Vector3(radius * Math.cos(angle), 4, radius * Math.sin(angle)), new Vector3(0, -1, 0));
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
      for (const band of [0, 2, 4]) {
        const radius = 24.2 + band * 2;
        const angle = boundary - side * 0.002;
        const low = FLOOR_Y + (band + 1) * ACCESS_STEP_RISE;
        const origin = new Vector3(radius * Math.cos(angle), low + ACCESS_STEP_RISE / 2, radius * Math.sin(angle));
        const lateral = new Vector3(-Math.sin(boundary) * side, 0, Math.cos(boundary) * side);
        ray.set(origin, lateral);
        const hit = ray.intersectObject(edited.stairs[0], false)[0];
        assert.ok(hit && hit.distance < 0.1, '좌석 계단과 이동 계단 사이에 연결 측면이 있어야 합니다.');
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
      ray.set(new Vector3(radius * Math.cos(angle), 4, radius * Math.sin(angle)), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(floors, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - PATH_Y) < 0.001, '상단 계단과 블루길 사이에 미세한 빈틈도 없어야 합니다.');
    }
  }
});


test('중앙 원형 바닥을 유지하고 블루길까지의 전체 단차를 정확히 두 배로 높였다', () => {
  const ray = new Raycaster();
  ray.set(new Vector3(0, 8, 0), new Vector3(0, -1, 0));
  const lower = ray.intersectObjects(floors, false)[0].point.y;
  ray.set(new Vector3(40, 8, 0), new Vector3(0, -1, 0));
  const upper = ray.intersectObjects(floors, false)[0].point.y;
  assert.ok(Math.abs(lower - 1.15) < 0.00001);
  assert.ok(Math.abs((upper - lower) / PREVIOUS_TOTAL_RISE - 2) < 0.00001);
  assert.ok(Math.abs(TOTAL_RISE - 1.6804) < 0.00001);
  assert.ok(Math.abs(upper - 2.8304) < 0.00001);
  assert.ok(ACCESS_STEP_RISE < 0.34, '높인 후에도 이동 계단은 기존 보행 한계 안에 있어야 합니다.');
});
