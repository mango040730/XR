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
