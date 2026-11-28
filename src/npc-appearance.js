import * as THREE from 'three';
import {NPC_HEIGHT} from './npc-navigation.js';
import {npcDistanceGeometry} from './npc-distance-geometry.js';
import {npcRestPose} from './npc-rest-pose.js';

// No baked clips or skeleton are present in the supplied GLBs. A small,
// spatially masked vertex pose adds a walk cycle without replacing the meshes.
export function prepareNpcAppearance(model){
  const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const scale=NPC_HEIGHT/size.y,root=new THREE.Group(),body=new THREE.Group();
  model.position.set(-center.x,-box.min.y,-center.z);body.scale.setScalar(scale);body.add(model);root.add(body);
  const uniforms={npcStride:{value:0},npcPhase:{value:0}};
  const restCache=new Map();
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.geometry=npcRestPose(mesh.geometry,{minY:box.min.y,height:size.y,centerX:center.x},restCache);
    mesh.castShadow=false;mesh.receiveShadow=true;
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      const before=material.onBeforeCompile;
      material.onBeforeCompile=shader=>{
        before?.(shader);Object.assign(shader.uniforms,uniforms);
        shader.vertexShader=`uniform float npcStride; uniform float npcPhase; attribute float npcArmWeight;\n${shader.vertexShader}`;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float npcY=(position.y-(${box.min.y.toFixed(8)}))/${size.y.toFixed(8)};
          float npcX=(position.x-(${center.x.toFixed(8)}))/${size.y.toFixed(8)};
          float npcSide=npcX<0.0?-1.0:1.0;
          float npcSwing=sin(npcPhase+npcSide*1.5707963)*npcStride;
          float npcLeg=(1.0-smoothstep(.23,.31,npcY))*smoothstep(.025,.07,abs(npcX));
          float npcArm=npcArmWeight;
          float npcAngle=npcSwing*(npcLeg*.12-npcArm*.10);
          vec2 npcPivot=vec2((${box.min.y.toFixed(8)})+${size.y.toFixed(8)}*(npcLeg>.01?.28:.53),0.0);
          vec2 npcYZ=transformed.yz-npcPivot;
          transformed.yz=mat2(cos(npcAngle),sin(npcAngle),-sin(npcAngle),cos(npcAngle))*npcYZ+npcPivot;
          transformed.y=max(transformed.y,${box.min.y.toFixed(8)});
        `);
      };
      material.customProgramCacheKey=()=>`npc-gentle-walk-${size.y.toFixed(8)}-${box.min.y.toFixed(8)}`;
    }
  });
  const distant=model.clone(true);let originalTriangles=0,distantTriangles=0;
  distant.traverse(mesh=>{if(!mesh.isMesh)return;originalTriangles+=mesh.geometry.index.count/3;mesh.geometry=npcDistanceGeometry(mesh.geometry,size.y*.012);distantTriangles+=mesh.geometry.index.count/3;});
  const lod=new THREE.LOD();body.remove(model);lod.addLevel(model,0);lod.addLevel(distant,7,.12);body.add(lod);
  return {root,body,height:NPC_HEIGHT,width:size.x*scale,uniforms,
    triangles:{near:originalTriangles,far:distantTriangles},
    update(distance,moving,delta){uniforms.npcStride.value=THREE.MathUtils.damp(uniforms.npcStride.value,moving?1:0,10,delta);uniforms.npcPhase.value=distance*10;body.position.y=Math.abs(Math.sin(distance*10))*.008*uniforms.npcStride.value;body.rotation.z=Math.sin(distance*5)*.008*uniforms.npcStride.value;},
  };
}
