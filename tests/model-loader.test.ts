import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { ModelLoader } from '../src/engine/assets/ModelLoader';

const loadAsync = vi.hoisted(() => vi.fn());
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {
  loadAsync = loadAsync;
  setRequestHeader() { return this; }
} }));
afterEach(() => vi.resetAllMocks());

describe('model adapter (mocked network/decoder)', () => {
  it('applies transforms and reports indeterminate progress', async () => {
    const scene = new Group(); const progress = vi.fn();
    loadAsync.mockImplementation(async (_url, callback) => { callback({ total: 0, loaded: 2048 }); return { scene }; });
    const result = await new ModelLoader().load({ url: '/example.glb', position: [1, 2, 3], rotation: [0, 1, 0], scale: [2, 2, 2] }, new AbortController().signal, progress);
    expect(result.position.toArray()).toEqual([1, 2, 3]); expect(result.rotation.y).toBe(1); expect(result.scale.x).toBe(2);
    expect(progress).toHaveBeenCalledWith(expect.stringContaining('2 KB'));
  });
  it('reports missing models without crashing the manager caller', async () => {
    loadAsync.mockRejectedValue(new Error('404'));
    await expect(new ModelLoader().load({ url: '/missing.glb' }, new AbortController().signal, vi.fn())).rejects.toThrow('/missing.glb');
  });
  it('disposes a model that finishes after cancellation', async () => {
    const controller = new AbortController(); const scene = new Group(); const geometry = new BoxGeometry();
    const dispose = vi.spyOn(geometry, 'dispose'); scene.add(new Mesh(geometry, new MeshStandardMaterial()));
    loadAsync.mockImplementation(async () => { controller.abort(); return { scene }; });
    await expect(new ModelLoader().load({ url: '/late.glb' }, controller.signal, vi.fn())).rejects.toThrow();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
