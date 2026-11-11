import { materialTextures } from './materialTextures.ts';
import { BufferGeometry, Material, Mesh, Object3D, Skeleton, SkinnedMesh, Texture, Light } from 'three';

/** A world exclusively owns its assets. Do not share resources across world roots. */
export function disposeObject(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skeletons = new Set<Skeleton>();
  root.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
        for (const value of materialTextures(material)) textures.add(value);
      }
    }
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    if (object instanceof Light && 'shadow' in object) {
      (object.shadow as { dispose(): void } | undefined)?.dispose();
    }
  });
  const bitmaps = new Set<ImageBitmap>();
  for (const texture of textures) {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmaps.add(image);
    texture.dispose();
  }
  bitmaps.forEach(bitmap => bitmap.close());
  skeletons.forEach(skeleton => skeleton.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
  root.removeFromParent();
  root.clear();
}
