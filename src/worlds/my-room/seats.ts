import type { Seat } from '../../../shared/social';

/** Matching the actual lounge furniture in the supplied GLB; feet and cushions use metres. */
export const myRoomSeats: Seat[] = [
  {id:'owner-chair',position:[1.65,.02,2.05],yaw:Math.PI+.5,stand:[2.0,.02,.65],surfaceHeight:.66},
  {id:'conversation-sofa',position:[-2.2,.18,-1.45],yaw:.38,stand:[-2.0,.18,-.35],surfaceHeight:.72},
  {id:'guest-lounge',position:[-2.15,.18,.70],yaw:Math.PI-.35,stand:[-1.0,.18,.8],surfaceHeight:.56},
];
