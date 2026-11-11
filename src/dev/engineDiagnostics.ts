import { materialTextures } from '../engine/assets/materialTextures';
import { Box3, BufferGeometry, Material, Mesh, MeshStandardMaterial, Texture } from 'three';
import type { Engine } from '../engine/core/Engine';

export type EngineSnapshot = ReturnType<ReturnType<typeof attachEngineDiagnostics>['snapshot']>;
declare global {
  interface Window { readonly __XR_DEBUG__?: { snapshot(): EngineSnapshot } }
}

/** Observation only: never changes input, player pose, loading, XR support or scene. */
export function attachEngineDiagnostics(engine: Engine) {
  const disposed = { geometry: 0, material: 0, texture: 0 };
  const watched = new WeakSet<BufferGeometry | Material | Texture>();
  const cleanups = new Set<() => void>();
  const watch = (resource: BufferGeometry | Material | Texture, kind: keyof typeof disposed) => {
    if (watched.has(resource)) return;
    watched.add(resource);
    const cleanup = () => { resource.removeEventListener('dispose', onDispose); cleanups.delete(cleanup); };
    const onDispose = () => { disposed[kind]++; cleanup(); };
    resource.addEventListener('dispose', onDispose); cleanups.add(cleanup);
  };
  const stop = engine.worlds.changes.subscribe(state => {
    if (state.status !== 'ready') return;
    engine.worlds.active?.root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      watch(object.geometry, 'geometry');
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        watch(material, 'material');
        for (const value of materialTextures(material)) watch(value, 'texture');
      }
    });
  });
  const snapshot = () => {
    const active = engine.worlds.active;
    const models = active?.root.children.filter(child => typeof child.userData.assetUrl === 'string') ?? [];
    const interactables: Array<{ id: string; color: string | null }> = [];
    active?.root.traverse(object => {
      if (object.userData.interaction) interactables.push({ id: String(object.userData.interactionId ?? object.uuid),
        color: object instanceof Mesh && object.material instanceof MeshStandardMaterial ? object.material.color.getHexString() : null });
    });
    return {
      worldFrozen: engine.worldFrozen,
      presentationActive:engine.presentationActive,
      doorAngle:active?.root.getObjectByName('Home door hinge')?.rotation.y??null,
      world: { ...engine.worlds.state },
      myRoom: active?.root.userData.myRoom ?? null,
      fishing: active?.root.userData.fishing ?? null,
      player: { seated:engine.player.seated, eyeHeight:engine.rendering.camera.position.y, position: engine.player.feet.toArray(), rigOrigin: engine.player.rig.position.toArray(), yaw: engine.player.rig.rotation.y, pitch: engine.rendering.camera.rotation.x },
      xr: { ...engine.xr.state },
      xrControls: { ...engine.xrControls.state },
      xrSettings: { ...engine.xrControls.settings },
      highlights: engine.interactions.highlights.children.length,
      worldRoots: engine.rendering.scene.children.filter(child => child.name.startsWith('world:')).map(child => child.name),
      render: { fov: engine.rendering.camera.fov, fog: engine.rendering.scene.fog?.color.getHexString() ?? null, calls: engine.rendering.webgl.info.render.calls, triangles: engine.rendering.webgl.info.render.triangles },
      memory: { ...engine.rendering.webgl.info.memory }, disposed: { ...disposed },
      activeRootId: active?.root.uuid ?? null,
      models: models.map(model => {
        let meshes = 0; model.traverse(object => { if (object instanceof Mesh) meshes++; });
        const bounds = new Box3().setFromObject(model);
        return { id: model.uuid, url: String(model.userData.assetUrl), meshes, position: model.position.toArray(),
          rotation: [model.rotation.x, model.rotation.y, model.rotation.z], scale: model.scale.toArray(),
          min: bounds.min.toArray(), max: bounds.max.toArray() };
      }),
      interactables,
    };
  };
  Object.defineProperty(window, '__XR_DEBUG__', { value: Object.freeze({ snapshot }), configurable: true });
  return { snapshot, dispose: () => {
    stop(); for (const cleanup of cleanups) cleanup();
    Reflect.deleteProperty(window, '__XR_DEBUG__');
  } };
}
