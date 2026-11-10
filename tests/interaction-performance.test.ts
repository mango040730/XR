import { mkdir,writeFile } from 'node:fs/promises';
import { expect,it,vi } from 'vitest';
import { Group,Mesh,Ray,Raycaster,Vector3 } from 'three';
import { createWorld } from '../src/engine/world/createWorld';
import { indoorFishing } from '../src/worlds/indoor-fishing/config';
import { InteractionSystem } from '../src/engine/interaction/InteractionSystem';
it('profiles empty-space looking in the actual fishing room and retains zero room raycasts',async()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},fillStyle:'',font:'',textAlign:'',textBaseline:''})})});
 const root=new Group(),system=new InteractionSystem();
 try{
  const world=await createWorld(indoorFishing,{root,signal:new AbortController().signal,progress:()=>{}});
  let triangles=0;root.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});
  system.setWorld(root);const ray=new Ray(new Vector3(6.25,1.65,4.35),new Vector3(0,0,-1));
  const baselineRay=new Raycaster();baselineRay.ray.copy(ray);baselineRay.far=20;
  const baseline=()=>{root.updateWorldMatrix(true,true);baselineRay.intersectObject(root,true).find(h=>h.object instanceof Mesh);};
  const optimized=()=>system.updateRay('desktop',ray,ray.origin);
  for(let i=0;i<20;i++){baseline();optimized();}
  const iterations=240;
  let start=performance.now();for(let i=0;i<iterations;i++)baseline();const baselineMs=(performance.now()-start)/iterations;
  start=performance.now();for(let i=0;i<iterations;i++)optimized();const optimizedMs=(performance.now()-start)/iterations;
  const wall=root.children.find(o=>o instanceof Mesh&&o.name==='static-batch') as Mesh;
  const sceneRay=vi.spyOn(wall,'raycast');optimized();expect(sceneRay).not.toHaveBeenCalled();
  await mkdir('test-results',{recursive:true});await writeFile('test-results/interaction-profile.json',JSON.stringify({environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'CPU only: actual Three.js room ray queries; no GPU, browser or headset FPS',modeling:{bevel:root.userData.bevel,triangles},iterations,baselineMs,optimizedMs,ratio:baselineMs/optimizedMs},null,2));
  world.dispose();
 }finally{system.dispose();vi.unstubAllGlobals();}
});
