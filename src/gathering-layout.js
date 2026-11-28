import { entranceConfig } from './entrance.js';
import { centralIsRaised } from './central-room.js';

export const GATHERING_LAYOUT = Object.freeze({
  centralRadius: 12.5, tierDepth: 2.8, terraceOuter: 20.9,
  pathWidth: 4.6, outerRadius: 25.5, walkRadius: 24.7,
  floorY: 1.15, pathY: 3.85, stepCount: 9, screenHeight: 4.8,
  floorScale: 12.5 / 26.2,
});
export const GATHERING_ENTRY = entranceConfig(GATHERING_LAYOUT.outerRadius, GATHERING_LAYOUT.pathY);
export const GATHERING_ZONES = [
  { id: 'tiered-forum', kind: 'forum', capacity: 10, x: -4.6, z: -4.3, radius: 3.4 },
  { id: 'grand-lounge', kind: 'sofa', capacity: 8, x: -5.2, z: 6, radius: 2.35, opening: Math.PI },
  { id: 'reading-nook', kind: 'sofa', capacity: 4, x: -9.1, z: 2.7, radius: 1.4 },
  { id: 'round-meeting', kind: 'meeting', capacity: 6, x: 4.8, z: -6, radius: 2.75 },
  { id: 's-curve-meeting', kind: 'meeting', capacity: 10, x: 1.6, z: 0.4, radius: 3.05, sCurve: true },
  { id: 'conversation-nook', kind: 'sofa', capacity: 6, x: 8, z: 2.5, radius: 1.85, table: true },
];
export function gatheringFloorY(x, z) {
  const scale = GATHERING_LAYOUT.floorScale;
  return GATHERING_LAYOUT.floorY + (centralIsRaised(x / scale, z / scale) ? 0.28 : 0);
}
