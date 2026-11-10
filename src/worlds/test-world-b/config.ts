import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig } from '../../engine/world/types';

export const testWorldB: WorldConfig = {
  id: 'test-world-b', name: 'Test World B', description: '긴 갤러리 · 중앙 파티션과 좁은 통로',
  spawn: { position: [-4, 0, 7], yaw: -Math.PI / 4 }, player: { ...DEFAULT_PLAYER, speed: 2.5 },
  lighting: { sky: '#ffe9cf', ground: '#59483f', intensity: 2, sun: 2.2, background: '#30282c' },
  floors: [{ center: [0, 0], size: [14, 24], y: 0, color: '#5b4d46' }],
  teleport: { areas: [{ minX: -6.5, maxX: 6.5, minZ: -11.5, maxZ: 11.5, y: 0 }], maxDistance: 8 },
  interactions: [{ nodeName: 'b-switch', id: 'b-switch', label: 'B 큐브 버튼' }],
  boxes: [
    { name: 'b-switch', position: [-2, 1, 5], size: [0.8, 1, 0.8], color: '#53d6ba', interactive: true },
    { position: [0, 1.7, -12], size: [14, 3.4, 0.4], color: '#ab998b' },
    { position: [0, 1.7, 12], size: [14, 3.4, 0.4], color: '#ab998b' },
    { position: [-7, 1.7, 0], size: [0.4, 3.4, 24], color: '#ab998b' },
    { position: [7, 1.7, 0], size: [0.4, 3.4, 24], color: '#ab998b' },
    { position: [0, 1.4, 0], size: [0.5, 2.8, 10], color: '#887970' },
    { position: [-4, 0.6, -3], size: [2.5, 1.2, 2.5], color: '#d2ab73' },
    { position: [4, 1, 4], size: [2, 2, 3], color: '#b88372' },
  ],
};
