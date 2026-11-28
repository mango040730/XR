import {GATHERING_ZONES,gatheringFloorY} from './gathering-layout.js';

export function gatheringEntrances(zones=GATHERING_ZONES) {
  return zones.map(zone=>{
    const rotation=zone.rotationY??(zone.faceCenter?Math.atan2(-zone.x,-zone.z):0);
    const angle=rotation+(zone.opening??0);
    return {...zone,dx:Math.sin(angle),dz:Math.cos(angle),floorY:gatheringFloorY(zone.x,zone.z)};
  });
}

export function isNearGatheringEntrance(position,entrance) {
  if(![position.x,position.y,position.z].every(Number.isFinite))return false;
  const {x,z,dx,dz,radius,floorY}=entrance,px=position.x-x,pz=position.z-z;
  const forward=px*dx+pz*dz,lateral=px*dz-pz*dx;
  return position.y>=floorY-.1&&position.y<=floorY+.45
    &&forward>=radius*.55&&forward<=radius+1.15
    &&Math.abs(lateral)<=Math.min(1.1,radius*.5);
}
