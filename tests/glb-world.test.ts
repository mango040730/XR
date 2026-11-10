import { describe, expect, it } from 'vitest';
import { Box3, Group, Vector3 } from 'three';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWorld } from '../src/engine/world/createWorld';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { disposeObject } from '../src/engine/assets/disposeObject';
import { glbTestRoom } from '../src/worlds/glb-test-room/config';
import { testWorldA } from '../src/worlds/test-world-a/config';

describe('GLB asset and invisible collision proxies', () => {
  it('parses the actual self-contained GLB with the real GLTFLoader', async () => {
    const buffer = await readFile(new URL('../public/assets/models/test-room/scene.glb', import.meta.url));
    const gltf = await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
    expect(gltf.asset.version).toBe('2.0'); expect(gltf.scene.children).toHaveLength(8);
    const bounds = new Box3().setFromObject(gltf.scene);
    expect(bounds.min.x).toBeCloseTo(-5.15); expect(bounds.max.z).toBeCloseTo(6.15);
    disposeObject(gltf.scene);
  });
  it('keeps collision without drawing proxy meshes or duplicate floors', async () => {
    const root = new Group();
    const instance = await createWorld({ ...glbTestRoom, model: undefined, interactions: undefined }, { root, signal: new AbortController().signal, progress: () => {} });
    expect(root.children).toHaveLength(2); // hemisphere + directional light only
    const collision = new CollisionSystem(instance.collision);
    expect(collision.canStand(new Vector3(...glbTestRoom.spawn.position), 0.28, 1.75)).toBe(true);
    expect(collision.canStand(new Vector3(9.2, 0, 0), 0.28, 1.75)).toBe(false);
    instance.dispose();
  });
  it('keeps world disposal idempotent', async () => {
    const root = new Group();
    const instance = await createWorld(testWorldA, { root, signal: new AbortController().signal, progress: () => {} });
    instance.dispose(); instance.dispose(); expect(root.children).toHaveLength(0);
  });
});
