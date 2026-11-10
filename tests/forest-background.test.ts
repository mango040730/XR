import { expect,it,vi } from 'vitest';
import { Box3,Group,InstancedMesh,Matrix4,Mesh,Raycaster,Vector3 } from 'three';
import { forestBackground,forestTrees } from '../src/worlds/indoor-fishing/forest';
import { interiorPalette } from '../src/worlds/indoor-fishing/style';
import { Kit } from '../src/worlds/indoor-fishing/geometry';
import { disposeObject } from '../src/engine/assets/disposeObject';

it('keeps real 3D trees shrubs and boulders outside the room and retains their instancing through batching',()=>{
 const root=new Group(),before={...interiorPalette},forest=forestBackground(root),building=new Box3(new Vector3(-7.9,-2,-5.9),new Vector3(7.9,12,5.9));
 expect(forestTrees.length).toBeGreaterThan(40);
 const meshes=forest.children.filter((o):o is InstancedMesh=>o instanceof InstancedMesh);
 expect(meshes).toHaveLength(4);
 const matrix=new Matrix4();
 for(const mesh of meshes){
  expect(mesh.count).toBeGreaterThan(0);expect(mesh.instanceColor).not.toBeNull();mesh.geometry.computeBoundingBox();
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);const bounds=mesh.geometry.boundingBox!.clone().applyMatrix4(matrix);
   expect(bounds.intersectsBox(building),`${mesh.name} instance ${i} enters the room`).toBe(false);
  }
 }
 const kit=new Kit();kit.batch(root);kit.finish(root);
 expect(forest.children.filter(o=>o instanceof InstancedMesh)).toEqual(meshes);
 expect(interiorPalette).toEqual(before);disposeObject(root);
});

it('leaves a real hole in exterior terrain and ground shadows beneath the room and pool',()=>{
 const root=new Group(),forest=forestBackground(root);root.updateMatrixWorld(true);
 const ground=forest.getObjectByName('forest-meadow') as Mesh,shadows=forest.getObjectByName('forest-ground-shadows') as Mesh;
 for(const [x,z] of [[0,0],[-3,1],[3,-1],[6,4],[-6,-4]]){
  const ray=new Raycaster(new Vector3(x,10,z),new Vector3(0,-1,0));
  expect(ray.intersectObjects([ground,shadows])).toHaveLength(0);
 }
 for(const [x,z] of [[12,0],[-12,0],[0,10],[0,-10]]){
  expect(new Raycaster(new Vector3(x,10,z),new Vector3(0,-1,0)).intersectObject(ground).length).toBeGreaterThan(0);
 }
 disposeObject(root);
});

it('owns forest geometry materials and instance buffers independently for each world',()=>{
 const a=new Group(),b=new Group(),fa=forestBackground(a),fb=forestBackground(b);
 const first=fa.getObjectByName('forest-broadleaf-crowns') as InstancedMesh,second=fb.getObjectByName('forest-broadleaf-crowns') as InstancedMesh;
 expect(first.geometry).not.toBe(second.geometry);expect(first.material).not.toBe(second.material);
 const released=vi.fn(),other=vi.fn();first.addEventListener('dispose',released);second.addEventListener('dispose',other);
 disposeObject(a);expect(released).toHaveBeenCalledOnce();expect(other).not.toHaveBeenCalled();
 expect(second.count).toBeGreaterThan(0);disposeObject(b);expect(other).toHaveBeenCalledOnce();
});
