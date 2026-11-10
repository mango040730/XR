import type { WorldConfig, BoxConfig } from '../../engine/world/types';
import { forestSky } from './forestPalette';
import { palette as c,lightingStyle as l } from './style';
import { entry, floorAreas, seats } from './layout';
import { buildFishing, FishingSession } from './runtime';
const solid=(position:BoxConfig['position'],size:BoxConfig['size']):BoxConfig=>({position,size,color:'#000',visible:false});
export const fishingSolids:BoxConfig[]=[
  solid([0,1.8,-5.6],[15.6,3.6,.22]),solid([0,1.8,5.6],[15.6,3.6,.22]),solid([-7.6,1.8,0],[.22,3.6,11.4]),solid([7.6,1.8,0],[.22,3.6,11.4]),
  solid([0,-.2,0],[8.75,1.55,5.25]),
  ...seats.map(s=>solid([s.position[0],.5,s.position[2]],Math.abs(s.position[0])>4?[.68,1,.58]:[.58,1,.68])),
  ...[-5.5,5.5].map(x=>solid([x,.85,-4.98],[1.9,1.7,.7])),
  ...[-7.35,-3.7,0,3.7,7.35].flatMap(x=>[-5.35,5.35].map(z=>solid([x,1.775,z],[.32,3.55,.32]))),
  ...[-7.05,7.05].map(x=>solid([x,.75,-2.6],[.5,1.5,1.25])),
  ...[-6.9,6.9].map(x=>solid([x,.85,2],[.55,1.7,1.2])),
];
export const indoorFishing:WorldConfig={
  id:'indoor-fishing',name:'고요낚시 · 실내 낚시터',description:'저녁빛이 머무는 목조 낚시터. 빈 자리에 앉아 잔잔한 물결을 바라보세요.',
  spawn:entry,player:{speed:2.2,eyeHeight:1.65,radius:.25,height:1.75},
  rendering:{filmic:true,exposure:l.exposure,bloom:l.bloom,shadows:true,near:.1,far:60},
  lighting:{sky:c.skyLight,ground:c.bounce,intensity:l.ambient,sun:l.sunIntensity,background:forestSky,key:{position:l.sunPosition,target:l.sunTarget,color:c.sun}},
  floors:floorAreas,boxes:fishingSolids,xr:{movement:'teleport',turn:'snap'},
  build:({root,signal})=>{signal.throwIfAborted();buildFishing(root);},activate:ctx=>new FishingSession(ctx),
};
