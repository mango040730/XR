import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import originalLights from './original-lights.json';
type RecordLight={
  name:string;type:string;color:string;intensity:number;position:number[];quaternion:number[];castShadow:boolean;
  groundColor?:string;target?:number[];distance?:number;decay?:number;angle?:number;penumbra?:number;width?:number;height?:number;
  shadow?:{mapSize:number[];bias:number;normalBias:number;radius:number;near:number;far:number;left?:number;right?:number;top?:number;bottom?:number};
};


export function createOriginalLights(quality: 'high' | 'balanced'='high'): THREE.Group {
 RectAreaLightUniformsLib.init();
 const rig=new THREE.Group();rig.name='original-atelier-lights';
    for(const data of originalLights as RecordLight[]){
      let light:THREE.Light;
      switch(data.type){
        case 'AmbientLight':light=new THREE.AmbientLight(data.color,data.intensity);break;
        case 'HemisphereLight':light=new THREE.HemisphereLight(data.color,data.groundColor,data.intensity);break;
        case 'DirectionalLight':light=new THREE.DirectionalLight(data.color,data.intensity);break;
        case 'PointLight':light=new THREE.PointLight(data.color,data.intensity,data.distance,data.decay);break;
        case 'SpotLight':light=new THREE.SpotLight(data.color,data.intensity,data.distance,data.angle,data.penumbra,data.decay);break;
        case 'RectAreaLight':light=new THREE.RectAreaLight(data.color,data.intensity,data.width,data.height);break;
        default:throw new Error(`Unsupported original light: ${data.type}`);
      }
      light.name=data.name;light.position.fromArray(data.position);light.quaternion.fromArray(data.quaternion);
      light.castShadow=data.castShadow&&(quality==='high'||data.type==='DirectionalLight');
      if(data.target&&(light instanceof THREE.SpotLight||light instanceof THREE.DirectionalLight)){
        light.target.position.fromArray(data.target);rig.add(light.target);
      }
      const shadow=(light as THREE.DirectionalLight|THREE.SpotLight|THREE.PointLight).shadow;
      if(shadow&&data.shadow){
        const s=data.shadow;
        shadow.mapSize.fromArray(s.mapSize);shadow.bias=s.bias;shadow.normalBias=s.normalBias;shadow.radius=s.radius;
        shadow.camera.near=s.near;shadow.camera.far=s.far;
        if(shadow.camera instanceof THREE.OrthographicCamera){
          shadow.camera.left=s.left??-11.5;shadow.camera.right=s.right??11.5;shadow.camera.top=s.top??9;shadow.camera.bottom=s.bottom??-9;
        }
        if(quality==='balanced'&&light instanceof THREE.DirectionalLight){shadow.mapSize.set(2048,2048);shadow.normalBias=.014;}
        shadow.camera.updateProjectionMatrix();
      }
      rig.add(light);
    }
 return rig;
}
