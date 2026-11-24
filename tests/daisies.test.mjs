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

test('데이지는 실제 도톰한 흰 꽃잎 11~13개와 앞쪽으로 볼록한 노란 중심을 가진다', () => {
  const root = new Group(); planter(root, 1.75, 0.64, 0, 0, 0, 1.35);
  const flowers = root.userData.daisyPlants[0].flowers;
  assert.equal(flowers.length, 8);
  const petals = root.children.filter(m => m.name === 'Clay_daisy_petal');
  assert.equal(petals.length, flowers.reduce((n, f) => n + f.petals, 0));
  assert.ok(flowers.every(f => f.petals >= 11 && f.petals <= 13));
  assert.equal(petals[0].material.color.getHexString(), 'fff9ee');
  for (const mesh of petals.slice(0, 3)) {
    const { position: p, normal: n } = mesh.geometry.attributes, index = mesh.geometry.index;
    for (let i = 90; i < index.count; i += 123) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const [a, b, c] = ids.map(id => new Vector3().fromBufferAttribute(p, id));
      const face = b.sub(a).cross(c.sub(a));
      if (face.lengthSq() < 1e-18) continue;
      const normal = ids.reduce((v, id) => v.add(new Vector3().fromBufferAttribute(n, id)), new Vector3()).normalize();
      assert.ok(face.normalize().dot(normal) > 0.8, '꽃잎의 면 방향과 노멀이 일치해 흰 표면이 정상 조명돼야 합니다.');
    }
  }
  assert.equal(root.children.find(m => m.name === 'Clay_daisy_yellow_centre').material.color.getHexString(), 'f4d52b');
  assert.ok(new Set(flowers.map(f => f.centre[1].toFixed(2))).size >= 6, '꽃대 높이를 일률적으로 맞추면 안 됩니다.');
  batchClayProps(root); root.updateMatrixWorld(true);
  const centreMesh = root.children.find(m => m.isMesh && /lemon centres/.test(m.material.name));
  const ray = new Raycaster();
  for (const flower of flowers) {
    const normal = new Vector3(...flower.normal), centre = new Vector3(...flower.centre);
    ray.set(centre.addScaledVector(normal, flower.radius * 0.4), normal.clone().negate()); ray.far = flower.radius * 0.8;
    const hit = ray.intersectObject(centreMesh)[0];
    assert.ok(hit && Math.abs(hit.distance - flower.radius * 0.22) < flower.radius * 0.04, '꽃 중앙의 실제 입체 곡면을 피킹해야 합니다.');
  }
});

test('둥근 클레이 잎과 꽃대가 실제 입체이며 꽃대는 흙부터 꽃 머리까지 연결된다', () => {
  const root = new Group(); planter(root, 1.75, 0.64, 0, 0, 0, 1.35);
  const plant = root.userData.daisyPlants[0];
  const stems = root.children.filter(m => m.name === 'Clay_daisy_stem' && Math.abs(m.geometry.parameters.path.points[0].y - plant.soilY) < 0.0001);
  assert.equal(stems.length, plant.flowers.length);
  for (const flower of plant.flowers) {
    const expected = new Vector3(...flower.centre).addScaledVector(new Vector3(...flower.normal), -flower.radius * 0.09);
    assert.ok(stems.some(m => m.geometry.parameters.path.points.at(-1).distanceTo(expected) < 0.00001));
  }
  const leaves = root.children.filter(m => m.name === 'Clay_daisy_oval_leaf');
  assert.equal(leaves.length, plant.leafCount);
  assert.ok(leaves.length >= 20);
  for (const mesh of leaves) {
    assert.ok(mesh.geometry.index.count > 2000 && mesh.geometry.attributes.color);
    const n = mesh.geometry.attributes.normal;
    for (let i = 0; i < n.count; i += 23) assert.ok(Math.abs(new Vector3().fromBufferAttribute(n, i).length() - 1) < 0.0001);
  }
});
