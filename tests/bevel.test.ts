import { expect,it } from 'vitest';
import { Box3,Group,Mesh,Vector3 } from 'three';
import { BEVEL,bevelBox } from '../src/worlds/indoor-fishing/bevel';
import { Kit } from '../src/worlds/indoor-fishing/geometry';
import { disposeObject } from '../src/engine/assets/disposeObject';
it('creates a closed outward-facing box with exactly two bands across a right-angle edge',()=>{
 const geometry=bevelBox([1,2,3]),p=geometry.getAttribute('position');
 expect(p.count/3).toBe(92);expect(geometry.userData.bevel.segments).toBe(2);
 const edges=new Map<string,number>();
 const key=(i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(6)).join(',');
 for(let i=0;i<p.count;i+=3){
  const a=new Vector3().fromBufferAttribute(p,i),b=new Vector3().fromBufferAttribute(p,i+1),c=new Vector3().fromBufferAttribute(p,i+2);
  expect(b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().add(b).add(c))).toBeGreaterThan(0);
  for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
 }
 expect([...edges.values()].every(count=>count===2)).toBe(true);
 const width=geometry.userData.bevel.width,coreX=.5-width,coreY=1-width,coreZ=1.5-width,angles=new Set<string>();
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(Math.abs(y-coreY)<1e-6&&x>=coreX-1e-6&&z>=coreZ-1e-6)angles.add(String(Math.round(Math.atan2(z-coreZ,x-coreX)*180/Math.PI)));
 }
 expect([...angles].sort()).toEqual(['0','45','90']);
 geometry.dispose();
});
it('keeps world dimensions and safe clearances unchanged for beams and very thin pieces',()=>{
 for(const size of [[.3,3.55,.32],[15.3,.85,.22],[.007,.008,.35]] as [number,number,number][]){
  const g=bevelBox(size);const span=g.boundingBox!.getSize(new Vector3());
  span.toArray().forEach((n,i)=>expect(n).toBeCloseTo(size[i],5));
  expect(g.userData.bevel.width).toBeLessThanOrEqual(Math.min(...size)*BEVEL.widthRatio+1e-8);g.dispose();
 }
});
it('shares identical parts, preserves rotated beam length and releases unused cached geometry',()=>{
 const kit=new Kit(),root=new Group();const a=kit.box(root,[.2,.3,.4],[0,0,0],'#aaa'),b=kit.box(root,[.2,.3,.4],[1,0,0],'#aaa');
 expect(a.geometry).toBe(b.geometry);let sourceDisposed=0;a.geometry.addEventListener('dispose',()=>sourceDisposed++);
 const beam=kit.beam(root,[0,0,0],[3,0,4],.2,'#aaa');beam.updateWorldMatrix(true,false);
 expect(new Box3().setFromObject(beam).getSize(new Vector3()).length()).toBeGreaterThan(4.9);
 kit.batch(root);expect(sourceDisposed).toBe(0);kit.finish(root);expect(sourceDisposed).toBe(1);
 expect(root.userData.bevel.segments).toBe(2);expect(root.children.some(o=>o instanceof Mesh)).toBe(true);disposeObject(root);
});
