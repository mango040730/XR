import {createTimedRegionTutorialState} from './timed-region-tutorial-state.js';

export const RELATIONSHIP_DURATION_MS=5000;

export function isInRelationshipRoom({x,y,z},layout) {
  if(![x,y,z].every(Number.isFinite))return false;
  // Includes both central floor levels (the rear is 0.28m higher), with
  // capsule/contact tolerance. The seating tiers and blue rail are excluded.
  return Math.hypot(x,z)<layout.centralRadius-.05
    &&y>=layout.floorY-.1&&y<=layout.floorY+.5;
}

export function createRelationshipTutorialState(layout) {
  return createTimedRegionTutorialState(position=>isInRelationshipRoom(position,layout),{durationMs:RELATIONSHIP_DURATION_MS});
}
