import { afterEach,expect,it,vi } from 'vitest';
import { Box3,Color,Group,Matrix4,PerspectiveCamera,Scene,Vector3,Vector4 } from 'three';
import type { WebGLRenderer } from 'three';
import { pool } from '../src/worlds/indoor-fishing/water';
import { Kit } from '../src/worlds/indoor-fishing/geometry';
import { WaterScene } from '../src/worlds/indoor-fishing/WaterScene';
import { palette } from '../src/worlds/indoor-fishing/style';
import { WATER } from '../src/worlds/indoor-fishing/waterConfig';
import { disposeObject } from '../src/engine/assets/disposeObject';
afterEach(()=>vi.restoreAllMocks());
it('places actual wall-coloured tile instances on the basin floor beneath a separate water mesh',()=>{
 const root=new Group(),kit=new Kit(),water=pool(root,kit);root.updateMatrixWorld(true);
 expect(water.tiles.count).toBe(240);expect(water.tiles.instanceColor).not.toBeNull();
 const colour=new Color();for(let i=0;i<water.tiles.count;i++){water.tiles.getColorAt(i,colour);expect(colour.getHexString()).toBe(new Color(palette.wall).getHexString());}
 const tileBounds=new Box3().setFromObject(water.tiles),waterBounds=new Box3().setFromObject(water.surface);
 expect(tileBounds.max.y).toBeCloseTo(WATER.tileTopY);expect(waterBounds.min.y).toBeCloseTo(WATER.surfaceY);
 expect(waterBounds.min.y-tileBounds.max.y).toBeGreaterThan(1.0);
 const grout=new Box3().setFromObject(root.getObjectByName('submerged-grout-bed')!);expect(tileBounds.max.y-grout.max.y).toBeCloseTo(WATER.groutRecess,5);
 expect(tileBounds.min.x).toBeGreaterThanOrEqual(-4);expect(tileBounds.max.x).toBeLessThanOrEqual(4);
 expect(tileBounds.min.z).toBeGreaterThanOrEqual(-2.25);expect(tileBounds.max.z).toBeLessThanOrEqual(2.25);
 const matrix=new Matrix4();water.tiles.getMatrixAt(1,matrix);expect(new Vector3().setFromMatrixPosition(matrix).y).toBeLessThan(-.6);
 expect(water.surface.material.depthWrite).toBe(false);expect(water.surface.material.depthTest).toBe(true);
 kit.finish(root);disposeObject(root);
});
it('animates optics without rewriting tiles and frees both optical render targets with the world',()=>{
 const root=new Group(),kit=new Kit(),water=pool(root,kit),version=water.tiles.instanceMatrix.version;
 const refraction=vi.spyOn(water.surface.refraction.getRenderTarget(),'dispose'),reflection=vi.spyOn(water.surface.reflection.getRenderTarget(),'dispose');
 const tilesDisposed=vi.fn();water.tiles.addEventListener('dispose',tilesDisposed);
 water.update(10,false);expect(water.surface.material.uniforms.uTime.value).toBe(10);
 water.update(20,true);expect(water.surface.material.uniforms.uTime.value).toBe(20);expect(water.tiles.instanceMatrix.version).toBe(version);
 kit.finish(root);disposeObject(root);expect(refraction).toHaveBeenCalledOnce();expect(reflection).toHaveBeenCalledOnce();expect(tilesDisposed).toHaveBeenCalledOnce();
});
it('restores the outer render target, XR, viewport, scissor and visibility even when an optical pass fails',()=>{
 const root=new Group(),kit=new Kit(),water=pool(root,kit),scene=new Scene();scene.add(root);scene.updateMatrixWorld(true);
 const overlay=new Group();overlay.renderOrder=1000;scene.add(overlay);
 const oldTarget={},viewport=new Vector4(4,5,600,400),scissor=new Vector4(8,9,300,200);
 const renderer={getRenderTarget:()=>oldTarget,xr:{enabled:true,isPresenting:true},shadowMap:{enabled:true,autoUpdate:true,needsUpdate:true},
  getViewport:(v:Vector4)=>v.copy(viewport),getScissor:(v:Vector4)=>v.copy(scissor),getScissorTest:()=>true,
  setScissorTest:vi.fn(),setRenderTarget:vi.fn(),setViewport:vi.fn(),setScissor:vi.fn(),extensions:{has:()=>true},state:{viewport:vi.fn()}};
 vi.spyOn(water.surface.refraction,'onBeforeRender').mockImplementation(()=>{throw new Error('capture failed');});
 const camera=new PerspectiveCamera();camera.position.set(0,1.65,4);camera.updateMatrixWorld(true);
 expect(()=>water.surface.onBeforeRender(renderer as unknown as WebGLRenderer,scene,camera,water.surface.geometry,water.surface.material,root)).toThrow('capture failed');
 expect(renderer.xr.enabled).toBe(true);expect(renderer.shadowMap).toEqual({enabled:true,autoUpdate:true,needsUpdate:true});expect(water.surface.visible).toBe(true);expect(overlay.visible).toBe(true);
 expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(oldTarget);expect(renderer.setViewport).toHaveBeenLastCalledWith(viewport);
 expect(renderer.setScissor).toHaveBeenLastCalledWith(scissor);expect(renderer.setScissorTest).toHaveBeenLastCalledWith(true);
 kit.finish(root);disposeObject(root);
});

it('isolates optical material state and mirrors ancestor visibility without altering the main room',()=>{
 const source=new Scene(),group=new Group(),kit=new Kit();source.add(group);
 const object=kit.box(group,[1,1,1],[2,1,0],'#a06040');object.castShadow=true;object.receiveShadow=true;
 const excluded=kit.box(group,[1,1,1],[0,0,0],'#ffffff');source.updateMatrixWorld(true);
 const capture=new WaterScene(),optical=capture.sync(source,excluded),copy=optical.children[0] as typeof object;
 expect(copy.material).not.toBe(object.material);expect(copy.geometry).toBe(object.geometry);expect(copy.receiveShadow).toBe(false);
 expect(object.castShadow).toBe(true);expect(object.receiveShadow).toBe(true);
 group.visible=false;capture.sync(source,excluded);expect(copy.visible).toBe(false);expect(object.visible).toBe(true);
 capture.dispose();disposeObject(source);
});
