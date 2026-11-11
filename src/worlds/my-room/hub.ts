// Placement, surface heights and navigation share the same measured footprint.
export const hub=Object.freeze({
  stage:{center:[-1.75,-.63],half:[1.65,2.25],cut:.34,top:.18},
  owner:[1.65,.02,2.05],ownerYaw:Math.PI+.50,
  table:[-.83,.18,-.65],
  guest:[-2.15,.18,.70],guestYaw:Math.PI-.35,
  sofa:[-2.20,.18,-1.45],sofaYaw:.38,
  stool:[-.48,.18,-2.20],
  pendant:[-1.45,2.83,-.35],
  readingLamp:[2.95,.02,2.45]
});

export function onStage(x: number,z: number,inset=0){
  const s=hub.stage,a=Math.abs(x-s.center[0]),b=Math.abs(z-s.center[1]);
  return a<=s.half[0]-inset&&b<=s.half[1]-inset&&a+b<=s.half[0]+s.half[1]-s.cut-inset;
}
export function floorHeight(x: number,z: number){return onStage(x,z)?hub.stage.top:.02;}
