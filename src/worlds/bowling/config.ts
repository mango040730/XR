import {DirectionalLight,Group,Light} from 'three';
import type {WorldConfig} from '../../engine/world/types';
import {floors,boxes} from './layout';
import {LIGHTING_PRESET as preset} from './preset';
import {tuneBowlingMaterials} from './materials';
import {instanceCeiling} from './instances';
import {prepareLighting} from './lighting';

export const bowling:WorldConfig={
 id:'bowling',name:'가을빛 볼링장',description:'목재 트러스와 따뜻한 조명이 있는 4레인 볼링장',
 spawn:{position:[0,0,-1],yaw:0},player:{speed:1.8,eyeHeight:1.65,radius:.28,height:1.75},
 lighting:{sky:'#ffeddb',ground:'#62533e',intensity:0,sun:0,background:'#c8b38b'},
 rendering:{filmic:true,exposure:preset.exposure,maxPixelRatio:preset.maxPixelRatio,environmentIntensity:preset.environment,shadows:true,authoredShadows:true,fov:65,near:.04,far:120,bloom:preset.bloom.strength,bloomThreshold:preset.bloom.threshold,bloomRadius:preset.bloom.radius},
 floors,boxes,
 model:{url:`${import.meta.env.BASE_URL}assets/models/bowling/retro_bowling_alley.glb`},
 build({root,signal,progress}){
  signal.throwIfAborted();progress('볼링장 재질과 천장을 준비하고 있어요.');
  for(const child of [...root.children])if(child instanceof Light){if(child instanceof DirectionalLight)child.shadow.dispose();child.removeFromParent();}
  const model=root.children.find(o=>typeof o.userData.assetUrl==='string');if(!(model instanceof Group))throw new Error('볼링장 GLB가 없습니다.');
  tuneBowlingMaterials(model,undefined,preset);model.userData.ceilingInstanceBatches=instanceCeiling(model);
 },
 prepare:prepareLighting,
};
