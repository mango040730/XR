import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig } from '../../engine/world/types';

export const testWorldA: WorldConfig = {
  id: 'test-world-a', name: 'Test World A', description: '넓은 실험실 · 벽과 큐브 장애물',
  spawn: { position: [0, 0, 6], yaw: 0 }, player: { ...DEFAULT_PLAYER },
  lighting: { sky: '#d6f3ff', ground: '#415163', intensity: 2, sun: 2.5, background: '#172b3a' },
  floors: [{ center: [0, 0], size: [20, 20], y: 0, color: '#334e5c' }],
  teleport: { areas: [{ minX: -9.5, maxX: 9.5, minZ: -9.5, maxZ: 9.5, y: 0 }], maxDistance: 8 },
  interactions: [{ nodeName: 'a-switch', id: 'a-switch', label: 'A 큐브 버튼' }],
  boxes: [
    { position: [0, 1.5, -10], size: [20, 3, 0.35], color: '#637f8c' },
    { position: [0, 1.5, 10], size: [20, 3, 0.35], color: '#637f8c' },
    { position: [-10, 1.5, 0], size: [0.35, 3, 20], color: '#637f8c' },
    { position: [10, 1.5, 0], size: [0.35, 3, 20], color: '#637f8c' },
    { position: [-3, 1, -1], size: [2, 2, 2], color: '#8d9da5' },
    { position: [3, 0.75, -3], size: [3, 1.5, 2], color: '#8d9da5' },
    { name: 'a-switch', position: [0, 1, 2], size: [1, 2, 1], color: '#53d6ba', interactive: true },
    { position: [-6, 0.4, -5], size: [2, 0.8, 3], color: '#cfaa71' },
  ],
};
