import { woodworking } from './woodworking/config';
import { indoorFishing } from './indoor-fishing/config';
import { testWorldA } from './test-world-a/config';
import { testWorldB } from './test-world-b/config';
import type { WorldConfig } from '../engine/world/types';
import { glbTestRoom } from './glb-test-room/config';

// Add worlds here; the engine does not import any individual world module.
export const worlds: readonly WorldConfig[] = [testWorldA, testWorldB, glbTestRoom, indoorFishing, woodworking];
