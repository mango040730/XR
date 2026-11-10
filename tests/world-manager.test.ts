import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Mesh, MeshStandardMaterial, Scene } from 'three';
import { WorldManager } from '../src/engine/world/WorldManager';
import { createWorld } from '../src/engine/world/createWorld';
import { worlds } from '../src/worlds/registry';
import type { WorldBuildContext, WorldFactory, WorldInstance } from '../src/engine/world/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('world lifecycle', () => {
  it('builds both real worlds, disposes the previous root and leaves cleanly', async () => {
    const scene = new Scene(); const manager = new WorldManager(worlds, scene, createWorld);
    await manager.enter(worlds[0].id);
    const old = manager.active!;
    const geometry = (old.root.children.find(child => child instanceof Mesh) as Mesh).geometry;
    const dispose = vi.spyOn(geometry, 'dispose');
    await manager.enter(worlds[1].id);
    expect(manager.active?.config.id).toBe(worlds[1].id);
    expect(old.root.children).toHaveLength(0);
    expect(dispose).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(1);
    manager.leave();
    expect(scene.children).toHaveLength(0);
    expect(manager.state.status).toBe('idle');
  });
  it('preserves an active world after failure, then recovers', async () => {
    const factory: WorldFactory = (config, context) => config.id === worlds[1].id
      ? Promise.reject(new Error('simulated asset error')) : createWorld(config, context);
    const manager = new WorldManager(worlds, new Scene(), factory);
    await manager.enter(worlds[0].id); const old = manager.active;
    await manager.enter(worlds[1].id);
    expect(manager.active).toBe(old);
    expect(manager.state.error).toBe('simulated asset error');
    await manager.enter(worlds[0].id);
    expect(manager.state.status).toBe('ready'); manager.dispose();
  });
  it('ignores stale completion and progress after a newer request', async () => {
    const delayed = deferred<WorldInstance>(); let context!: WorldBuildContext;
    const factory: WorldFactory = (config, current) => {
      if (config.id === worlds[0].id) { context = current; return delayed.promise; }
      return createWorld(config, current);
    };
    const manager = new WorldManager(worlds, new Scene(), factory);
    const first = manager.enter(worlds[0].id);
    await manager.enter(worlds[1].id);
    expect(context.signal.aborted).toBe(true);
    context.progress('stale progress');
    const dispose = vi.fn();
    delayed.resolve({ config: worlds[0], root: context.root, collision: { floors: [], solids: [] }, dispose });
    await first;
    expect(dispose).toHaveBeenCalledOnce();
    expect(manager.state.activeId).toBe(worlds[1].id);
    expect(manager.state.message).not.toBe('stale progress'); manager.dispose();
  });
  it('cancels a pending world on leave, including partial build resources', async () => {
    const delayed = deferred<WorldInstance>();
    const geometry = new BoxGeometry(); const material = new MeshStandardMaterial();
    const cleanupGeometry = vi.spyOn(geometry, 'dispose');
    const cleanupMaterial = vi.spyOn(material, 'dispose');
    const manager = new WorldManager(worlds, new Scene(), async (_config, context) => {
      context.root.add(new Mesh(geometry, material));
      return delayed.promise;
    });
    const entering = manager.enter(worlds[0].id);
    manager.leave(); delayed.reject(new Error('aborted')); await entering;
    expect(manager.state.status).toBe('idle');
    expect(manager.active).toBeNull();
    expect(cleanupGeometry).toHaveBeenCalledOnce(); expect(cleanupMaterial).toHaveBeenCalledOnce();
  });
  it('rejects duplicate IDs and reports unknown worlds', async () => {
    expect(() => new WorldManager([worlds[0], worlds[0]], new Scene(), createWorld)).toThrow('중복');
    const manager = new WorldManager(worlds, new Scene(), createWorld);
    await manager.enter('missing'); expect(manager.state.error).toContain('등록되지 않은');
  });
  it('releases failed builds with invalid spawn and repeated switches', async () => {
    const invalid = { ...worlds[0], id: 'invalid', spawn: { position: [100, 0, 100] as [number, number, number], yaw: 0 } };
    const scene = new Scene(); const manager = new WorldManager([...worlds, invalid], scene, createWorld);
    await manager.enter(invalid.id); expect(manager.state.status).toBe('error'); expect(scene.children).toHaveLength(0);
    for (let i = 0; i < 20; i++) await manager.enter(worlds[i % 2].id);
    expect(scene.children).toHaveLength(1); manager.dispose(); expect(scene.children).toHaveLength(0);
  });
});

it('waits for GPU preparation before committing and discards a cancelled prepared world',async()=>{
  const gate=deferred<void>();let enteredPrepare=false;
  const manager=new WorldManager(worlds,new Scene(),createWorld,async(world,signal)=>{
    if(world.config.id!==worlds[1].id)return;
    enteredPrepare=true;await gate.promise;signal.throwIfAborted();
  });
  await manager.enter(worlds[0].id);const old=manager.active;
  const pending=manager.enter(worlds[1].id);await vi.waitFor(()=>expect(enteredPrepare).toBe(true));
  expect(manager.active).toBe(old);expect(manager.state.status).toBe('loading');
  manager.leave();gate.resolve();await pending;expect(manager.active).toBeNull();expect(manager.state.status).toBe('idle');
});
