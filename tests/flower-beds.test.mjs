import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Group, Vector3, Raycaster } from 'three';
import { planter, batchClayProps } from '../src/clay-gatherings.js';

function planterFingerprint(root) {
  const hash = createHash('sha256');
  root.traverse(mesh => {
    if (!mesh.isMesh || !['Clay_planter', 'Clay_planter_soil', 'Clay_planter_rim', 'Clay_pebble'].includes(mesh.name)) return;
    mesh.updateMatrix(); hash.update(mesh.name);
    for (const name of ['position', 'normal']) hash.update(JSON.stringify(Array.from(mesh.geometry.attributes[name].array, v => Math.round(v * 1e6))));
    hash.update(JSON.stringify(Array.from(mesh.geometry.index?.array ?? [])));
    hash.update(JSON.stringify(mesh.matrix.elements.map(v => Math.round(v * 1e6))));
    hash.update(mesh.material.color.getHexString());
    hash.update(JSON.stringify([mesh.material.roughness, mesh.material.clearcoat]));
  });
  return hash.digest('hex');
}

test('식물을 교체해도 기존 화분·흙·테두리·자갈의 실제 형상과 위치·색상이 동일하다', () => {
  const fixtures = [
    [0.34, 0.34, 0.28, '894621cd03a829c429fce8d0baa22b6080366c208a6a208d54b6d54d99f7bae4'],
    [1.75, 0.64, 1.35, '99965e58a99a781b9a91a098cdc06b54b437f5483dc44020d503b803d3ccffa7'],
    [3.3, 1.25, 1.45, '71f5eaebf5f7b67f91248bf28329e1dad6ad353a71dbe078ecbe14614aed6164'],
  ];
  for (const [w, d, h, expected] of fixtures) {
    const root = new Group(); planter(root, w, d, 0, 0, 0, h);
    assert.equal(planterFingerprint(root), expected, '변경 전 모델의 화분·돌 스냅샷과 일치해야 합니다.');
  }
});

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
