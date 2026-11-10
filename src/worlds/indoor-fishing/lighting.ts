import { DirectionalLight,MeshStandardMaterial,PointLight,SpotLight } from 'three';
import type { Group,Mesh } from 'three';
import { palette as c,lightingStyle as l } from './style';

export function configureSun(root:Group):void{
  root.traverse(object=>{
    if(!(object instanceof DirectionalLight))return;
    object.name='afternoon-sun';object.shadow.mapSize.set(4096,4096);
    Object.assign(object.shadow.camera,{left:-11,right:11,top:9,bottom:-9,near:.5,far:40});
    object.shadow.normalBias=.012;object.shadow.bias=-.00012;object.shadow.camera.updateProjectionMatrix();
  });
  // Window-side diffuse fill and a weak upward floor bounce approximate indirect light.
  // They retain direction and leave the sunlight as the dominant shadow-casting source.
  const windowFill=new DirectionalLight(c.skyLight,.85);windowFill.name='window-diffuse-fill';
  windowFill.position.set(5,3.0,5);windowFill.target.position.set(-1,1,0);root.add(windowFill,windowFill.target);
  const floorBounce=new DirectionalLight(c.ivory,.5);floorBounce.name='floor-indirect-bounce';
  floorBounce.position.set(0,.1,0);floorBounce.target.position.set(0,3,0);root.add(floorBounce,floorBounce.target);
}

export function pendant(root:Group,glass:Mesh,x:number,z:number):void{
  glass.material=new MeshStandardMaterial({color:c.ivory,emissive:c.amber,emissiveIntensity:.8,roughness:.65});
  const light=new SpotLight(c.amber,l.pendantIntensity,l.pendantRange,.94,.65,2);
  light.name='amber-pendant';light.position.set(x,2.62,z);light.target.position.set(x,.1,z-.15);
  // Two cached local maps complement the sharper sunlight without six shadow samplers in VR.
  light.castShadow=(x===-5.5&&z===3.3)||(x===5.5&&z===-3.3);
  light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.12;light.shadow.camera.far=l.pendantRange;
  light.shadow.normalBias=.018;light.shadow.bias=-.0001;
  root.add(light,light.target);
  const bounce=new PointLight(c.amber,l.pendantFill,4.5,2);bounce.name='pendant-bounce';bounce.position.set(x,2.8,z);root.add(bounce);
}
