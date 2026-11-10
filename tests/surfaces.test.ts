import { afterEach,expect,it,vi } from 'vitest';
import { Box3,Group,Mesh,Raycaster,Vector3 } from 'three';
import { architecture } from '../src/worlds/indoor-fishing/architecture';
import { floorAreas,floorSlabs,poolFootprint } from '../src/worlds/indoor-fishing/layout';
import { pool } from '../src/worlds/indoor-fishing/water';
import { Kit } from '../src/worlds/indoor-fishing/geometry';
import { disposeObject } from '../src/engine/assets/disposeObject';
afterEach(()=>vi.unstubAllGlobals());
function room(){
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},fillStyle:'',font:'',textAlign:'',textBaseline:''})})});
 const root=new Group();architecture(root,new Kit());root.updateMatrixWorld(true);return root;
}
it('partitions visible floor slabs without overlapping top faces while retaining collision support joins',()=>{
 expect(floorAreas[2].size[1]).toBeGreaterThan(floorSlabs[2].size[1]);
 const root=room(),slabs=root.children.filter(o=>o.name==='floor-slab').map(o=>new Box3().setFromObject(o));
 expect(slabs).toHaveLength(4);
 for(let i=0;i<slabs.length;i++)for(let j=i+1;j<slabs.length;j++){
  const a=slabs[i],b=slabs[j];
  const width=Math.max(0,Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x));
  const depth=Math.max(0,Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z));
  expect(width*depth).toBeLessThan(1e-8);
 }
 // Trim only the floor hidden inside the pool walls; collision support stays unchanged.
 expect(slabs.reduce((sum,b)=>sum+(b.max.x-b.min.x)*(b.max.z-b.min.z),0)).toBeCloseTo(15*11-poolFootprint[0]*poolFootprint[1]*4);
 disposeObject(root);
});
it('keeps front and side window borders in front of the plaster on both faces',()=>{
 const root=room(),frames=root.children.filter(o=>o.name==='window-frame');expect(frames).toHaveLength(14);
 for(const frame of frames){
  const axis=Math.abs(frame.rotation.y)<.1?'z':'x';
  for(const rail of frame.children.filter(o=>o.name==='window-border')){
   const bounds=new Box3().setFromObject(rail),center=frame.position[axis];
   expect(bounds.min[axis]).toBeLessThan(center-.135);expect(bounds.max[axis]).toBeGreaterThan(center+.135);
  }
 }
 disposeObject(root);
});
it('puts both wall sign labels ahead of their backing, including the rotated exit sign',()=>{
 const root=room(),labels=root.children.filter(o=>o.name==='wall-sign-text'),backs=root.children.filter(o=>o.name==='wall-sign-backing');
 expect(labels).toHaveLength(2);
 labels.forEach((label,i)=>{
  const normal=new Vector3(0,0,1).applyQuaternion(label.quaternion);
  const ray=new Raycaster(label.position.clone().add(normal),normal.clone().negate());
  expect(ray.intersectObjects([label as Mesh,backs[i] as Mesh])[0]?.object).toBe(label);
 });
 disposeObject(root);
});

it('gives every pool interior ray one distinct nearest face at floor and rim joins',()=>{
 const root=room(),kit=new Kit();pool(root,kit);root.updateMatrixWorld(true);
 const parts=root.children.filter(o=>['floor-slab','pool-wall','pool-rim'].includes(o.name));
 expect(parts.filter(o=>o.name==='pool-wall')).toHaveLength(4);
 expect(parts.filter(o=>o.name==='pool-rim')).toHaveLength(4);
 for(const direction of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,0,1),new Vector3(0,0,-1)]){
  for(const y of [-.18,-.1,-.03,.4,.45,.5]){
   const hits=new Raycaster(new Vector3(.13,y,.17),direction).intersectObjects(parts);
   expect(hits.length).toBeGreaterThan(0);
   const next=hits.find(hit=>hit.object!==hits[0].object);
   if(next)expect(next.distance-hits[0].distance,`direction ${direction.toArray()}, height ${y}`).toBeGreaterThan(.001);
  }
 }
 kit.finish(root);disposeObject(root);
});

it('ends pool wall bodies at the underside of their caps',()=>{
 const root=new Group(),kit=new Kit();pool(root,kit);root.updateMatrixWorld(true);
 const walls=root.children.filter(o=>o.name==='pool-wall').map(o=>new Box3().setFromObject(o));
 const rims=root.children.filter(o=>o.name==='pool-rim').map(o=>new Box3().setFromObject(o));
 expect(walls).toHaveLength(4);expect(rims).toHaveLength(4);
 for(const wall of walls){
  expect(wall.max.y).toBeCloseTo(rims[0].min.y,6);
  expect(wall.min.y).toBeCloseTo(-1.125,6);
  expect(Math.max(Math.abs(wall.min.x),Math.abs(wall.max.x))).toBeLessThanOrEqual(poolFootprint[0]+1e-6);
  expect(Math.max(Math.abs(wall.min.z),Math.abs(wall.max.z))).toBeLessThanOrEqual(poolFootprint[1]+1e-6);
 }
 kit.finish(root);disposeObject(root);
});
