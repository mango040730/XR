import type { Texture } from 'three';
import { Box3, BoxGeometry, DirectionalLight, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { CollisionSystem } from '../collision/CollisionSystem';
import { ModelLoader } from '../assets/ModelLoader';
import { disposeObject } from '../assets/disposeObject';
import type { WorldFactory } from './types';
import { bindInteractions } from '../interaction/bindInteractions';

export const createWorld: WorldFactory = async (config, { root, signal, progress }) => {
  const collision = { floors: config.floors.map(f => ({
    minX: f.center[0] - f.size[0] / 2, maxX: f.center[0] + f.size[0] / 2,
    minZ: f.center[1] - f.size[1] / 2, maxZ: f.center[1] + f.size[1] / 2, y: f.y,
    polygon: f.polygon })), solids: [] as Box3[], maxStepHeight: config.player.maxStepHeight };
  const addBox = (position: [number, number, number], size: [number, number, number], color: string) => {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial({ color, roughness: 0.82 }));
    mesh.position.fromArray(position);
    root.add(mesh);
    return mesh;
  };
  for (const floor of config.floors) {
    if (floor.visible === false) continue;
    addBox([floor.center[0], floor.y - 0.1, floor.center[1]], [floor.size[0], 0.2, floor.size[1]], floor.color);
    const grid = new GridHelper(Math.min(...floor.size), Math.min(...floor.size), '#67858c', '#354d58');
    grid.position.set(floor.center[0], floor.y + 0.005, floor.center[1]);
    root.add(grid);
  }
  for (const box of config.boxes) {
    const position = new Vector3().fromArray(box.position);
    if (box.solid !== false) {
      const half = new Vector3().fromArray(box.size).multiplyScalar(0.5);
      collision.solids.push(new Box3(position.clone().sub(half), position.clone().add(half)));
    }
    if (box.visible !== false) {
      const mesh = addBox(box.position, box.size, box.color);
      if (box.name) mesh.name = box.name;
      if (box.interactive) mesh.userData.interaction = 'toggle-color';
    }
  }
  root.add(new HemisphereLight(config.lighting.sky, config.lighting.ground, config.lighting.intensity));
  const sun = new DirectionalLight(config.lighting.key?.color ?? '#fff7e6', config.lighting.sun);
  sun.position.set(5, 12, 4);
  if (config.lighting.key) {
    sun.position.fromArray(config.lighting.key.position);sun.target.position.fromArray(config.lighting.key.target);root.add(sun.target);
  }
  if (config.rendering?.shadows) {
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;
    sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.camera.near=.1;sun.shadow.camera.far=24;
    sun.shadow.normalBias=.035;sun.shadow.bias=-.0004;
  }
  root.add(sun);
  if (config.model) root.add(await new ModelLoader().load(config.model, signal, progress));
  await config.build?.({ root, signal, progress });
  signal.throwIfAborted();
  if (config.rendering?.shadows && !config.rendering.authoredShadows) root.traverse(object=>{
    if (!(object instanceof Mesh)) return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    object.castShadow=!object.userData.noShadow&&materials.every(m=>!m.transparent);object.receiveShadow=object.castShadow;
  });
  bindInteractions(root, config.interactions);
  if (!new CollisionSystem(collision).canStand(new Vector3().fromArray(config.spawn.position), config.player.radius, config.player.height)) {
    throw new Error(`${config.name}: 시작 위치가 충돌 영역 안에 있거나 바닥 밖입니다.`);
  }
  let disposed = false;
  let environment: Texture | null = null;
  const cleanups: Array<() => void> = [];
  return { config, root, collision, get environment() { return environment; },
    prepare: config.prepare ? async (scene, renderer, signal) => {
      await config.prepare!({ root, scene, renderer, signal, onDispose(cleanup) { if (disposed) cleanup(); else cleanups.push(cleanup); } });
      environment = scene.environment;
    } : undefined,
    dispose: () => {
    if (disposed) return;
    disposed = true;
    for (const cleanup of cleanups.reverse()) cleanup(); cleanups.length = 0;
    disposeObject(root);
  } };
};
