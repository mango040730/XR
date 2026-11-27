import {createTimedRegionTutorialState} from './timed-region-tutorial-state.js';

export const CROSSROADS_DURATION_MS = 5000;

export function isOnGrayTerrace({x,y,z},layout) {
  if(![x,y,z].every(Number.isFinite))return false;
  const radius=Math.hypot(x,z);
  // The upper terrace is blue carpet. Gray access treads and both lower
  // seating terraces sit below it; foot height excludes the central floor.
  return radius>layout.centralRadius+.05&&radius<layout.terraceOuter-.05
    &&y>layout.floorY+.2&&y<layout.pathY-.12;
}

export function createCrossroadsTutorialState(layout) {
  return createTimedRegionTutorialState(position=>isOnGrayTerrace(position,layout),{durationMs:CROSSROADS_DURATION_MS});
}
