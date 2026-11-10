import { glbTestRoom } from '../worlds/glb-test-room/config';
import type { WorldConfig } from '../engine/world/types';

/** Negative fixtures: imported only by a DEV server running --mode e2e. */
export const e2eWorlds: WorldConfig[] = [
  { ...glbTestRoom, id: 'e2e-missing-model', name: 'E2E Missing Model', model: { url: '/assets/models/test-room/missing.glb' } },
  { ...glbTestRoom, id: 'e2e-invalid-model', name: 'E2E Invalid Model', model: { url: '/assets/models/test-room/invalid.glb' } },
];
