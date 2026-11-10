import { beforeAll,describe,expect,it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { Box3,SkinnedMesh,Vector3 } from 'three';
import { AvatarActor } from '../src/social/AvatarPool';
let gltf:GLTF;
beforeAll(async()=>{const b=await readFile('public/assets/avatars/cub-scout-v6.glb');gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');});
describe('provided CubScout v6 GLB',()=>{
  it('contains the actual 19-joint skeleton, 16 skinned meshes and named clips',()=>{const bones=new Set(),meshes:SkinnedMesh[]=[];gltf.scene.traverse(n=>{if(n instanceof SkinnedMesh){meshes.push(n);n.skeleton.bones.forEach(b=>bones.add(b));}});expect(meshes).toHaveLength(16);expect(bones.size).toBe(19);expect(gltf.animations.map(a=>a.name)).toEqual(['01_Idle','02_Walk','03_Wave','04_Sit','05_Shoulder_Check']);expect(new Box3().setFromObject(gltf.scene,true).getSize(new Vector3()).y).toBeCloseTo(1.899,2);});
  it('gives clones independent skeletons/mixers while sharing owned GPU resources and returning from Wave to Walk',()=>{
    const a=new AvatarActor(gltf.scene,gltf.animations,1,0,.342),b=new AvatarActor(gltf.scene,gltf.animations,1,0,.342);
    const first=(actor:AvatarActor)=>{let found:SkinnedMesh|undefined;actor.model.traverse(n=>{if(n instanceof SkinnedMesh&&!found)found=n;});return found!;};
    expect(first(a).skeleton).not.toBe(first(b).skeleton);expect(first(a).geometry).toBe(first(b).geometry);expect(a.mixer).not.toBe(b.mixer);
    a.pose(true,false,1);expect(a.root.userData.animation).toBe('wave');for(let i=0;i<30;i++)a.update(.1);expect(a.root.userData.animation).toBe('walk');expect(b.root.userData.animation).toBe('idle');a.pose(false,true,1);expect(a.root.userData.animation).toBe('sit');a.dispose();b.dispose();
  });
  it('does not replay a historical wave when joining after it finished',()=>{const a=new AvatarActor(gltf.scene,gltf.animations,1,0,.342);a.pose(false,false,7,false);expect(a.root.userData.animation).toBe('idle');a.dispose();});
});
