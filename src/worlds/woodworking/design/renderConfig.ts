import * as THREE from 'three';
export const LIGHTING={
  exposure:1.12,
  sun:{position:[12,7.2,-6] as [number,number,number],target:[0,.8,0] as [number,number,number],color:'#ffe5cb',temperature:4500,intensity:4.1},
  pendant:{color:'#ffd4a2',temperature:3000,intensity:36},
  shelf:{color:'#ffd4a2',temperature:3000,intensity:38},
  ambient:.12,sky:.42,
};
export const SUN_DIRECTION=new THREE.Vector3(...LIGHTING.sun.position).sub(new THREE.Vector3(...LIGHTING.sun.target)).normalize();
