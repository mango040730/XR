import {Vector2} from 'three';

function smoothStep(start,end,value) {
  const t=Math.max(0,Math.min(1,(value-start)/(end-start)));
  return t*t*(3-2*t);
}

// World-space curved boundary x=f(z). The three left modules, including the
// forum and its rear planter, are below; the three right modules are above.
export function gatheringStepBoundary(z) {
  return -.6-1.6*smoothStep(-3,-.5,z)+10.2*smoothStep(4.6,10,z);
}
export function gatheringIsRaised(x,z) {
  return x>=gatheringStepBoundary(z);
}

// Filled upper floor, bounded by the curve and the existing circular edge.
// Shape coordinates use -z because the extrusion rotates onto the XZ plane.
export function gatheringPlatformContour(radius) {
  function intersection(sign) {
    let lo=0,hi=radius;
    for(let i=0;i<60;i++){
      const z=sign*(lo+hi)/2;
      if(gatheringStepBoundary(z)**2+z*z>radius*radius)hi=Math.abs(z);else lo=Math.abs(z);
    }
    return sign*(lo+hi)/2;
  }
  const back=intersection(-1),front=intersection(1),points=[];
  for(let i=0;i<=512;i++){
    const z=back+(front-back)*i/512;
    points.push(new Vector2(gatheringStepBoundary(z),-z));
  }
  const start=Math.atan2(front,gatheringStepBoundary(front));
  let end=Math.atan2(back,gatheringStepBoundary(back));
  while(end>=start)end-=Math.PI*2;
  for(let i=1;i<384;i++){
    const angle=start+(end-start)*i/384;
    points.push(new Vector2(radius*Math.cos(angle),-radius*Math.sin(angle)));
  }
  return points;
}
