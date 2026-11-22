import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Raycaster, Vector3 } from 'three';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
gltf.scene.updateMatrixWorld(true);
const floors = [];
gltf.scene.traverse(object => {
  if (object.isMesh && /circulation.deck|porcelain.floor|^Terraces.*terrace.treads/.test(object.name)) floors.push(object);
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

test('원본의 순환 데크와 계단 높이가 보존된다', () => {
  assert.equal(floors.length, 11);
  const ray = new Raycaster();
  for (const [z, expected] of [[29, 1.3], [26, 1.99], [25, 1.71], [24, 1.43], [23, 1.15]]) {
    ray.set(new Vector3(0, 3, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - expected) < 0.001, `z=${z}의 바닥 높이가 일치해야 합니다.`);
  }
});
