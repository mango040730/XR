import { afterEach,expect,it,vi } from 'vitest';
import { BoxGeometry,DirectionalLight,Group,HemisphereLight,Mesh,MeshStandardMaterial,PlaneGeometry,SpotLight } from 'three';
import { AmbientField } from '../src/worlds/indoor-fishing/ambientOcclusion';
import { vintageMaterial } from '../src/worlds/indoor-fishing/materials';
import { palette as c } from '../src/worlds/indoor-fishing/style';
import { indoorFishing } from '../src/worlds/indoor-fishing/config';
import { createWorld } from '../src/engine/world/createWorld';
import { disposeObject } from '../src/engine/assets/disposeObject';

afterEach(()=>vi.unstubAllGlobals());
it('separates walnut, painted teal and matte metal finishes without tinting the base palette',()=>{
 const timber=vintageMaterial(c.trailDust,'wood'),tile=vintageMaterial(c.trailDust,'stone');
 expect(timber.color.equals(tile.color)).toBe(true);expect(timber.roughness).toBeLessThan(tile.roughness);
 expect(timber.customProgramCacheKey()).not.toBe(tile.customProgramCacheKey());
 timber.dispose();tile.dispose();
 const wood=vintageMaterial(c.walnut),paint=vintageMaterial(c.wall),metal=vintageMaterial(c.charcoal);
 expect('#'+wood.color.getHexString().toUpperCase()).toBe(c.walnut);
 expect(wood.roughness).toBeLessThan(paint.roughness);expect(metal.metalness).toBeGreaterThan(0);
 expect(wood.metalness).toBe(0);expect(paint.metalness).toBe(0);
 expect(wood.customProgramCacheKey()).not.toBe(paint.customProgramCacheKey());
 for(const m of [wood,paint,metal])m.dispose();
});
it('bakes stronger ambient occlusion below nearby furniture while leaving the exposed floor clear',()=>{
 const root=new Group(),floor=new Mesh(new PlaneGeometry(4,4,8,8).rotateX(-Math.PI/2),vintageMaterial(c.floor));root.add(floor);
 const obstacle=new Mesh(new BoxGeometry(.8,.6,.8),vintageMaterial(c.walnut));obstacle.position.y=.35;root.add(obstacle);
 const baked=floor.geometry.clone(),original=Array.from(baked.getAttribute('position').array);
 new AmbientField(root).bake(baked,floor);
 const p=baked.getAttribute('position'),ao=baked.getAttribute('color');
 let centre=1,corner=0;
 for(let i=0;i<p.count;i++){
  const value=ao.getX(i);expect(value).toBeGreaterThanOrEqual(.52);expect(value).toBeLessThanOrEqual(1);
  if(Math.abs(p.getX(i))<.01&&Math.abs(p.getZ(i))<.01)centre=value;
  if(p.getX(i)>1.9&&p.getZ(i)>1.9)corner=value;
 }
 expect(centre).toBeLessThan(corner-.15);expect(corner).toBeCloseTo(1);
 expect(Array.from(baked.getAttribute('position').array)).toEqual(original);
 baked.dispose();disposeObject(root);
});
it('builds directional afternoon sunlight and local amber pendants with bounded cached shadow maps',async()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},fillStyle:'',font:'',textAlign:'',textBaseline:''})})});
 const root=new Group(),world=await createWorld(indoorFishing,{root,signal:new AbortController().signal,progress:()=>{}});
 const sun=root.children.find(o=>o instanceof DirectionalLight) as DirectionalLight;
 const ambient=root.children.find(o=>o instanceof HemisphereLight) as HemisphereLight;
 const pendants=root.children.filter(o=>o instanceof SpotLight) as SpotLight[];
 expect(sun.position.y).toBeGreaterThan(sun.target.position.y);expect(sun.position.x).not.toBe(sun.target.position.x);
 expect(sun.intensity).toBeGreaterThan(ambient.intensity*3);expect(sun.shadow.mapSize.x).toBe(4096);
 expect(pendants).toHaveLength(6);expect(pendants.filter(light=>light.castShadow)).toHaveLength(2);
 for(const light of pendants){expect(light.target.position.y).toBeLessThan(light.position.y);expect(light.penumbra).toBeGreaterThan(.5);expect('#'+light.color.getHexString().toUpperCase()).toBe(c.amber);}
 const contacts=root.children.filter(o=>o.name==='soft-contact-shadow') as Mesh<PlaneGeometry,MeshStandardMaterial>[];
 expect(contacts).toHaveLength(14);expect(contacts[0].material.depthWrite).toBe(false);
 world.dispose();expect(root.children).toHaveLength(0);
});
