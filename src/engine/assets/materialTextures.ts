import { Texture } from 'three';
import type { Material } from 'three';

/** Includes textures owned by custom material shaders as well as standard map slots. */
export function materialTextures(material: Material): Texture[] {
  return [...new Set([...Object.values(material), ...Object.values(material.userData)].filter((value): value is Texture => value instanceof Texture))];
}
