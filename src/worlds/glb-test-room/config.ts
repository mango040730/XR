import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig, ModelConfig } from '../../engine/world/types';
import layout from './layout.json';

// Deliberately non-identity: E2E verifies real loader transforms and world bounds.
const model: ModelConfig = {
  url: `${import.meta.env.BASE_URL}assets/models/test-room/scene.glb`,
  position: [2, 0, -1], rotation: [0, Math.PI / 2, 0], scale: [1.2, 1, 1.2],
};
const transform = new Matrix4().compose(
  new Vector3(...model.position!), new Quaternion().setFromEuler(new Euler(...model.rotation!)), new Vector3(...model.scale!),
);
const floor = layout.boxes[0];
const bounds = new Box3().setFromCenterAndSize(new Vector3(...floor.position), new Vector3(...floor.size)).applyMatrix4(transform);

export const glbTestRoom: WorldConfig = {
  id: 'glb-test-room', name: 'GLB Test Room', description: '실제 GLB 에셋 · 방, 벽, 기둥과 받침대',
  spawn: { position: [7, 0, 2], yaw: Math.PI / 2 }, player: { ...DEFAULT_PLAYER },
  lighting: { sky: '#d6f3ff', ground: '#415163', intensity: 2, sun: 2.5, background: '#172b3a' },
  model,
  interactions: [{ nodeName: 'Pedestal', id: 'glb-pedestal', label: 'GLB 받침대' }],
  teleport: { areas: [{ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z, y: 0 }], maxDistance: 8 },
  floors: [{ center: [2, -1], size: [bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z], y: 0, color: '#334e5c', visible: false }],
  // These AABBs are derived from our procedural fixture only. Arbitrary Blender
  // assets need their own floor/box proxies; rotating a box gives conservative AABBs.
  boxes: layout.boxes.slice(1).map(box => {
    const bounds = new Box3().setFromCenterAndSize(new Vector3(...box.position), new Vector3(...box.size)).applyMatrix4(transform);
    return { position: bounds.getCenter(new Vector3()).toArray(), size: bounds.getSize(new Vector3()).toArray(), color: '#637f8c', visible: false };
  }),
};
