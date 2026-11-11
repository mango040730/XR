import { Light, DirectionalLight } from 'three';
import type { WorldConfig } from '../../engine/world/types';
import { COLLISION_BOXES } from './design/layout';
import {createOriginalLights} from './lights';
import {bakeContacts} from './contact';
import {createSparkles} from './sparkles';

export const woodworking: WorldConfig = {
  id: 'woodworking', name: '숲속 목공방', description: '숲이 보이는 목공방에서 혼자 활동해요.',
  spawn: { position: [0, 0, 5.6], yaw: 0 },
  player: { speed: 2.4, eyeHeight: 1.65, radius: .25, height: 1.75 },
  rendering: { maxPixelRatio:1.65, ao:{algorithm:'n8ao',radius:.35,intensity:1.2}, bloomThreshold:2.4, filmic: true, exposure: 1.12, bloom: .055, shadows: true, authoredShadows: true, near: .06, far: 85, fov: 77, fog: { color: '#d4dbbd', near: 22, far: 60 } },
  lighting: { sky: '#dbe5ed', ground: '#ab8b68', intensity: 0, sun: 0, background: '#d4dbbd' },
  floors: [{ center: [0, 0], size: [16, 14], y: 0, color: '#C8B38B', visible: false }],
  boxes: COLLISION_BOXES.slice(1).map(({ p, h }, index) => ({ name: `workshop-collision-${index}`, position: [p[0], p[1], p[2]], size: [h[0] * 2, h[1] * 2, h[2] * 2], color: '#C8B38B', visible: false })),
  async build({ root, signal, progress }) {
    signal.throwIfAborted();progress('숲속 목공방을 준비하고 있어요.');
    const {loadAtelierModel}=await import('./AtelierModel');
    const model=await loadAtelierModel(`${import.meta.env.BASE_URL}assets/models/woodworking-original/forest-atelier-original.glb`,signal,progress);
    root.add(model);signal.throwIfAborted();
    for(const child of [...root.children])if(child instanceof Light){if(child instanceof DirectionalLight)child.shadow.dispose();child.removeFromParent();}
    root.add(createOriginalLights());
  },
  prepare({root,scene,renderer,signal,onDispose}){signal.throwIfAborted();bakeContacts(renderer,scene,root,onDispose);},
  activate({root}){const dust=createSparkles();root.add(dust.points);return {update(time){dust.update(time);},dispose(){}};},
};
