import { expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { disposeObject } from '../src/engine/assets/disposeObject';

it('disposes world-owned shared geometry/material/texture only once', () => {
  const geometry = new BoxGeometry(); const map = new Texture(); const material = new MeshStandardMaterial({ map });
  const geometryDispose = vi.spyOn(geometry, 'dispose'); const materialDispose = vi.spyOn(material, 'dispose'); const textureDispose = vi.spyOn(map, 'dispose');
  const parent = new Group(); const root = new Group(); parent.add(root);
  root.add(new Mesh(geometry, material), new Mesh(geometry, material));
  disposeObject(root);
  expect(geometryDispose).toHaveBeenCalledOnce(); expect(materialDispose).toHaveBeenCalledOnce(); expect(textureDispose).toHaveBeenCalledOnce();
  expect(root.children).toHaveLength(0); expect(parent.children).toHaveLength(0);
});

it('releases a custom shader texture referenced by several world materials exactly once',()=>{
 const root=new Group(),texture=new Texture(),a=new MeshStandardMaterial(),b=new MeshStandardMaterial();
 a.userData.surfaceTexture=texture;b.userData.surfaceTexture=texture;const dispose=vi.spyOn(texture,'dispose');
 root.add(new Mesh(new BoxGeometry(),a),new Mesh(new BoxGeometry(),b));disposeObject(root);expect(dispose).toHaveBeenCalledOnce();
});
