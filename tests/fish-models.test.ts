import { expect,it,vi } from 'vitest';
import { Box3,BufferAttribute,Group,Mesh } from 'three';
import { FishModels } from '../src/worlds/indoor-fishing/fishModels';
import { FISH_SPECIES } from '../src/worlds/indoor-fishing/fishSpecies';
import { pool } from '../src/worlds/indoor-fishing/water';
import { WATER } from '../src/worlds/indoor-fishing/waterConfig';
import { Kit } from '../src/worlds/indoor-fishing/geometry';
import { disposeObject } from '../src/engine/assets/disposeObject';

it('builds distinct silhouettes with outward-facing coloured bodies and visible fish details',()=>{
 const root=new Group(),factory=new FishModels(),models=FISH_SPECIES.map(s=>factory.create(s.id));models.forEach(m=>root.add(m.root));root.updateMatrixWorld(true);
 const bounds=models.map(m=>new Box3().setFromObject(m.root));
 expect(bounds[0].max.y-bounds[0].min.y).toBeGreaterThan((bounds[1].max.y-bounds[1].min.y)*1.5);
 expect(bounds[2].max.x-bounds[2].min.x).toBeGreaterThan(bounds[0].max.x-bounds[0].min.x);
 for(const model of models){
  const body=model.root.getObjectByName('fish-body') as Mesh,p=body.geometry.getAttribute('position'),n=body.geometry.getAttribute('normal');
  expect(body.geometry.getAttribute('color')).toBeDefined();expect(model.root.getObjectByName('fish-tail')).toBeDefined();expect(model.root.getObjectByName('fish-pectoral-fins')).toBeDefined();
  for(let i=0;i<p.count-2;i++){
   expect(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i))).toBe(true);
   expect(p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)).toBeGreaterThan(0);
  }
 }
 disposeObject(root);
});
it('animates tails and fins without rewriting shared body buffers and separates resources between worlds',()=>{
 const a=new Group(),b=new Group(),factory=new FishModels(),first=factory.create('mackerel'),second=factory.create('mackerel'),other=new FishModels().create('mackerel');
 a.add(first.root,second.root);b.add(other.root);
 const body=first.root.getObjectByName('fish-body') as Mesh,copy=second.root.getObjectByName('fish-body') as Mesh,foreign=other.root.getObjectByName('fish-body') as Mesh;
 expect(copy.geometry).toBe(body.geometry);expect(copy.material).not.toBe(body.material);expect(foreign.geometry).not.toBe(body.geometry);
 const position=body.geometry.getAttribute('position') as BufferAttribute,version=position.version,tail=first.root.getObjectByName('fish-tail')!;first.update(0);const rotation=tail.rotation.y;first.update(.2,1);
 expect(tail.rotation.y).not.toBe(rotation);expect(position.version).toBe(version);
 const released=vi.spyOn(body.geometry,'dispose'),foreignReleased=vi.spyOn(foreign.geometry,'dispose');
 disposeObject(a);expect(released).toHaveBeenCalledOnce();expect(foreignReleased).not.toHaveBeenCalled();disposeObject(b);expect(foreignReleased).toHaveBeenCalledOnce();
});
it('keeps all species above the tiled floor and below the water and shows the actual caught species',()=>{
 const root=new Group(),kit=new Kit(),water=pool(root,kit);
 expect(water.fish.map(f=>f.species)).toEqual(['pomfret','mackerel','mullet','pomfret','mackerel','mullet']);
 for(const time of [0,12,37,80,140]){
  water.update(time,false);root.updateMatrixWorld(true);
  for(const model of water.fish){
   const bounds=new Box3().setFromObject(model.root);
   expect(bounds.min.y).toBeGreaterThan(WATER.tileTopY+.02);expect(bounds.max.y).toBeLessThan(WATER.surfaceY-.05);
   expect(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))).toBeLessThan(WATER.width/2);
   expect(Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))).toBeLessThan(WATER.depth/2);
  }
 }
 for(const species of FISH_SPECIES){
  water.showCatch(0,[0,.39,0],species.id);water.update(.5,false);
  expect(water.caughtFish.visible).toBe(true);const visible=water.caughtFish.children.filter(o=>o.visible);
  expect(visible).toHaveLength(1);expect(visible[0].userData.species).toBe(species.id);
 }
 water.update(2,false);expect(water.caughtFish.visible).toBe(false);kit.finish(root);disposeObject(root);
});
