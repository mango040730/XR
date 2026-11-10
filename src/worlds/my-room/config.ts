import { DEFAULT_PLAYER } from '../../config/defaults';
import type { WorldConfig } from '../../engine/world/types';
export const myRoom: WorldConfig = {
  id: 'my-room', name: '마이룸', description: '서비스의 홈 · 임시 3D 마이룸',
  spawn: { position: [0,0,6], yaw: 0 }, player: { ...DEFAULT_PLAYER },
  lighting: { sky: '#f1f1ed', ground: '#777e77', intensity: 2.4, sun: 2, background: '#353535' },
  floors: [{ center: [0,0], size: [16,18], y: 0, color: '#7c827d' }],
  boxes: [
    { position: [0,2,-9], size: [16,4,.3], color: '#b4b8b0' },
    { position: [-8,2,0], size: [.3,4,18], color: '#9da69f' },
    { position: [8,2,0], size: [.3,4,18], color: '#a5aba3' },
    { position: [0,2,9], size: [16,4,.3], color: '#a5aba3' },
    { position: [-4,.45,-3], size: [3,.9,1.6], color: '#555b57' },
    { position: [3,.6,-4], size: [2,1.2,2], color: '#858b84' },
  ],
};
