import { DataTexture,LinearFilter,Mesh,MeshBasicMaterial,PlaneGeometry,RGBAFormat } from 'three';
import type { Group } from 'three';
import { palette as c } from './style';

/** Smooth contact penumbra shared by this world's chairs and shelves, including XR views. */
export function contactShadows(root:Group,anchors:ReadonlyArray<{x:number;z:number;width:number;depth:number}>):void{
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const radius=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(255*Math.max(0,1-radius)**2);
  }
  const map=new DataTexture(pixels,size,size,RGBAFormat);map.magFilter=map.minFilter=LinearFilter;map.needsUpdate=true;
  const material=new MeshBasicMaterial({color:c.charcoal,alphaMap:map,transparent:true,opacity:.32,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  // alphaMap reads green, so store the falloff in both alpha and green.
  for(let i=0;i<pixels.length;i+=4)pixels[i+1]=pixels[i+3];
  const geometry=new PlaneGeometry(1,1);
  for(const anchor of anchors){
    const shadow=new Mesh(geometry,material);shadow.name='soft-contact-shadow';shadow.rotation.x=-Math.PI/2;
    shadow.position.set(anchor.x,.019,anchor.z);shadow.scale.set(anchor.width,anchor.depth,1);
    shadow.userData.noShadow=true;shadow.userData.dynamic=true;root.add(shadow);
  }
}
