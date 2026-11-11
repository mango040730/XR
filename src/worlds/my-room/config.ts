import {doorway} from './doorway';
import {preparePortal} from './portal';
import { verifyRoomVersion } from './verify';
import { Light, DirectionalLight } from 'three';
import type { WorldConfig } from '../../engine/world/types';
import layout from './layout.json';
import { prepareMyRoom, batchMyRoom } from './model';
import { prepareLighting } from './lighting';
import { bakeContacts } from './contact';

export const myRoom: WorldConfig = {
  id: 'my-room', name: '마이룸', description: '따뜻한 차와 책이 있는 개인 라운지 · 디자인 2.7.1',
  spawn: { position: doorway.arrival, yaw: doorway.inwardYaw },
  player: { speed: 1.8, eyeHeight: 1.65, radius: .22, height: 1.75, maxStepHeight: .18 },
  rendering: { filmic: true, exposure: 1.1, shadows: true, authoredShadows: true, fov: 66, responsiveFov: {portrait:78,medium:72}, near: .06, far: 55, ao: {intensity:.48,radius:.27}, fxaa: true, maxPixelRatio: 1.25, environmentIntensity: .14 },
  lighting: { sky: '#f4ecdf', ground: '#a28c70', intensity: 0, sun: 0, background: '#F4EEE6' },
  floors: layout.floors.map(f => ({...f,center:f.center as [number,number],size:f.size as [number,number],polygon:('polygon' in f ? f.polygon : undefined) as Array<[number,number]> | undefined})),
  boxes: layout.boxes.map(b => ({...b,position:b.position as [number,number,number],size:b.size as [number,number,number]})),
  model: { url: `${import.meta.env.BASE_URL}assets/models/my-room/myroom-v2-2.7.1.glb` },
  build({root,signal}) {
    signal.throwIfAborted();
    for(const child of [...root.children])if(child instanceof Light){if(child instanceof DirectionalLight)child.shadow.dispose();child.removeFromParent();}
    const model=root.children.find(o=>typeof o.userData.assetUrl==='string');
    if(!model)throw new Error('마이룸 GLB를 찾지 못했습니다.');
    prepareMyRoom(model as import('three').Group);
    root.userData.myRoom={...verifyRoomVersion(model as import('three').Group),source:layout.asset};
    preparePortal(model as import('three').Group);
  },
  async prepare(context) {
    await prepareLighting(context);context.signal.throwIfAborted();
    context.scene.updateMatrixWorld(true);
    bakeContacts(context.renderer,context.scene,context.root,context.onDispose);
    const model=context.root.children.find(o=>typeof o.userData.assetUrl==='string');
    if(model)batchMyRoom(model as import('three').Group);
  },
};
