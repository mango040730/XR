import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Group, Vector3, Raycaster } from 'three';
import { planter, batchClayProps } from '../src/clay-gatherings.js';

const baseline = JSON.parse(await readFile(new URL('./helpers/open-planter-baseline.json', import.meta.url)));

for (const fixture of baseline.fixtures) {
  const { width, depth, height } = fixture;
  test(`${width}m 화분 외곽과 꽃·긴 잎은 보존하고 아래 둥근 잎만 작게 낮춘다`, () => {
    const root = new Group(); planter(root, width, depth, 0, 0, 0, height); root.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(root.getObjectByName('Clay_planter'));
    for (const end of ['min', 'max']) bounds[end].toArray().forEach((v, i) => assert.ok(Math.abs(v - fixture.bounds[end][i]) < 0.000001));
    const bed = root.userData.flowerBeds[0];
    assert.deepEqual(bed.flowers, fixture.bed.flowers); assert.deepEqual(bed.blades, fixture.bed.blades);
    assert.equal(bed.soilY, fixture.bed.soilY); assert.equal(bed.height, fixture.bed.height);
    for (let i = 0; i < bed.mounds.length; i++) {
      const old = fixture.bed.mounds[i], next = bed.mounds[i];
      next.scale.forEach((v, j) => assert.ok(v / old.scale[j] >= 0.51999 && v / old.scale[j] <= 0.60001));
      assert.ok(next.centre[1] + next.scale[1] < old.centre[1] + old.scale[1]);
    }
  });

  test(`${width}m 화분의 얇은 속벽·낮은 흙·드문 회색 돌 사이에 충분한 흙이 보인다`, () => {
    const root = new Group(); planter(root, width, depth, 0, 0, 0, height); root.updateMatrixWorld(true);
    const info = root.userData.planters[0], shell = root.getObjectByName('Clay_planter'), soil = root.getObjectByName('Clay_planter_soil');
    const stones = root.children.filter(m => m.name === 'Clay_pebble'), ray = new Raycaster();
    assert.ok(info.wallThickness < depth * 0.05); assert.ok(info.height - info.soilSurface > 0.035);
    assert.equal(soil.material.color.getHexString(), '48392f'); assert.equal(soil.material.roughness, 1);
    ray.set(new Vector3(0, info.height + 1, 0), new Vector3(0, -1, 0));
    const innerFloor = ray.intersectObject(shell)[0];
    assert.ok(innerFloor && innerFloor.point.y < info.soilSurface - 0.08, '중앙 윗면은 막힌 흰 판이 없어야 합니다.');
    ray.set(new Vector3(width / 2 - info.wallThickness / 2, info.height + 1, 0), new Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObject(shell)[0].point.y - info.height) < 0.001, '얇은 테두리에는 실제 두께가 있어야 합니다.');
    ray.set(new Vector3(0, info.soilSurface + 0.012, 0), new Vector3(1, 0, 0));
    const wall = ray.intersectObject(shell)[0];
    assert.ok(wall && Math.abs(wall.point.x - (width / 2 - info.wallThickness)) < 0.001 && wall.face.normal.x < -0.9);
    assert.ok(stones.length >= 3 && stones.length <= 11);
    for (const stone of stones) {
      const b = new Box3().setFromObject(stone);
      assert.ok(b.min.y < info.soilSurface && b.max.y > info.soilSurface, '돌은 흙에 일부 묻혀야 합니다.');
      assert.ok(b.max.y < info.height + 0.015);
      const color = stone.geometry.attributes.color;
      assert.ok(Math.max(color.getX(0), color.getY(0), color.getZ(0)) - Math.min(color.getX(0), color.getY(0), color.getZ(0)) < 0.05);
    }
    const surfaces = [soil, ...stones, ...root.children.filter(m => m.name === 'Clay_rounded_green_mound')];
    let visible = 0, total = 0;
    for (let i = -12; i <= 12; i++) for (let j = -10; j <= 10; j++) {
      const u = i / 12, v = j / 10; if (u * u + v * v > 0.8) continue;
      ray.set(new Vector3(u * info.soilRadii[0], info.height + 1, v * info.soilRadii[1]), new Vector3(0, -1, 0));
      if (ray.intersectObjects(surfaces)[0]?.object === soil) visible++;
      total++;
    }
    assert.ok(visible / total > 0.50, `둥근 잎과 돌 사이 흙이 충분히 노출되어야 합니다: ${visible}/${total}`);
    for (const stem of root.children.filter(m => m.name === 'Clay_garden_stem')) {
      assert.ok(stem.geometry.parameters.path.points[0].y < info.soilSurface, '줄기 뿌리는 흙 안에 연결됩니다.');
    }
  });
}

test('참고 이미지의 봉오리·컵꽃·작은 데이지와 낮은 초록 화단 구성을 실제 형상으로 만든다', () => {
  const root = new Group(); planter(root, 1.75, 0.64, 0, 0, 0, 1.35);
  const bed = root.userData.flowerBeds[0], flowers = bed.flowers;
  assert.equal(flowers.length, 11);
  assert.equal(flowers.filter(f => f.type === 'bud').length, 5);
  assert.equal(flowers.filter(f => f.type === 'cup').length, 3);
  assert.equal(flowers.filter(f => f.type === 'daisy').length, 3);
  assert.equal(bed.mounds.length, 5); assert.equal(bed.blades.length, 8);
  assert.ok(Math.max(...flowers.map(f => f.anchor[0])) - Math.min(...flowers.map(f => f.anchor[0])) > 1.4);
  assert.ok(bed.height < 1.0, '기존의 키 큰 꽃다발 대신 낮고 넓은 실루엣이어야 합니다.');
  const palette = new Set(flowers.map(f => f.palette));
  for (const color of ['butter', 'bud', 'blush', 'pink', 'peach', 'lemon']) assert.ok(palette.has(color));
  const petals = root.children.filter(m => /pastel_daisy_petal|closed_tulip_bud|cupped_flower_petal/.test(m.name));
  assert.equal(petals.length, flowers.reduce((n, f) => n + f.petals, 0));
  for (const mesh of petals.filter((m, i) => i % 9 === 0)) {
    assert.ok(mesh.geometry.attributes.color && mesh.material.vertexColors);
    const { position: p, normal: n } = mesh.geometry.attributes, index = mesh.geometry.index;
    for (let i = 90; i < index.count; i += 123) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const [a, b, c] = ids.map(id => new Vector3().fromBufferAttribute(p, id));
      const face = b.sub(a).cross(c.sub(a));
      if (face.lengthSq() < 1e-18) continue;
      const normal = ids.reduce((v, id) => v.add(new Vector3().fromBufferAttribute(n, id)), new Vector3()).normalize();
      assert.ok(face.normalize().dot(normal) > 0.8, '꽃의 면 방향과 노멀이 일치해야 합니다.');
    }
  }
  batchClayProps(root); root.updateMatrixWorld(true);
  const centres = root.children.find(m => m.isMesh && m.material.name === 'Clay garden yellow centres');
  const ray = new Raycaster();
  for (const flower of flowers.filter(f => f.type === 'daisy')) {
    const normal = new Vector3(...flower.normal), centre = new Vector3(...flower.centre);
    ray.set(centre.addScaledVector(normal, flower.radius * 0.4), normal.clone().negate()); ray.far = flower.radius * 0.8;
    assert.ok(ray.intersectObject(centres).length, '노란 꽃 중앙은 실제 입체여야 합니다.');
  }
});

test('긴 잎과 둥근 녹색 덩어리가 입체이며 가는 꽃대가 흙부터 꽃까지 이어진다', () => {
  const root = new Group(); planter(root, 1.75, 0.64, 0, 0, 0, 1.35);
  const bed = root.userData.flowerBeds[0];
  const stems = root.children.filter(m => m.name === 'Clay_garden_stem');
  assert.equal(stems.length, bed.flowers.length);
  for (const flower of bed.flowers) {
    const expected = new Vector3(...flower.anchor);
    assert.ok(stems.some(m => m.geometry.parameters.path.points.at(-1).distanceTo(expected) < 0.00001));
  }
  const blades = root.children.filter(m => m.name === 'Clay_upright_garden_leaf');
  assert.equal(blades.length, 8);
  assert.equal(root.children.filter(m => m.name === 'Clay_rounded_green_mound').length, 5);
  for (const mesh of blades) {
    assert.ok(mesh.geometry.index.count > 2000 && mesh.geometry.attributes.color);
    const n = mesh.geometry.attributes.normal;
    for (let i = 0; i < n.count; i += 23) assert.ok(Math.abs(new Vector3().fromBufferAttribute(n, i).length() - 1) < 0.0001);
  }
});
