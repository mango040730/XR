import { Light, DirectionalLight } from 'three';
import type { WorldConfig } from '../../engine/world/types';
import { Atelier, Forest } from './design/architecture';
import { Lighting } from './design/Lighting';
import { COLLISION_BOXES } from './design/layout';
import { buildScene, sceneNode } from './design/runtime';

export const woodworking: WorldConfig = {
  id: 'woodworking', name: '숲속 목공방', description: '숲이 보이는 목공방에서 혼자 활동해요.',
  spawn: { position: [0, 0, 5.6], yaw: 0 },
  player: { speed: 2.4, eyeHeight: 1.65, radius: .25, height: 1.75 },
  rendering: { filmic: true, exposure: 1.12, bloom: .055, shadows: true, authoredShadows: true, near: .06, far: 85, fov: 77, fog: { color: '#d4dbbd', near: 22, far: 60 } },
  lighting: { sky: '#dbe5ed', ground: '#ab8b68', intensity: 0, sun: 0, background: '#d4dbbd' },
  floors: [{ center: [0, 0], size: [16, 14], y: 0, color: '#C8B38B', visible: false }],
  boxes: COLLISION_BOXES.slice(1).map(({ p, h }, index) => ({ name: `workshop-collision-${index}`, position: [p[0], p[1], p[2]], size: [h[0] * 2, h[1] * 2, h[2] * 2], color: '#C8B38B', visible: false })),
  build({ root, signal, progress }) {
    signal.throwIfAborted(); progress('숲속 목공방을 준비하고 있어요.');
    // The authored lighting belongs to this root, as do all geometry and textures.
    for (const child of [...root.children]) if (child instanceof Light) { if (child instanceof DirectionalLight) child.shadow.dispose(); child.removeFromParent(); }
    buildScene(root, () => sceneNode('group', { name: 'forest-atelier' }, sceneNode(Forest, {}), sceneNode(Atelier, {}), sceneNode(Lighting, {})));
    signal.throwIfAborted();
  },
};
