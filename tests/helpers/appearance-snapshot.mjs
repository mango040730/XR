import { createHash } from 'node:crypto';

export function appearanceSnapshot(root) {
  root.updateMatrixWorld(true);
  const geometry = createHash('sha256'), surroundings = createHash('sha256');
  let meshes = 0;
  root.traverse(object => {
    geometry.update(JSON.stringify([object.type, object.name, object.matrix.elements, object.matrixWorld.elements]));
    if (!object.isMesh) return;
    meshes++;
    for (const attribute of [object.geometry.attributes.position, object.geometry.attributes.normal, object.geometry.index]) {
      if (attribute) geometry.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    if (object.name === 'Terrace_gloss_desks') return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const values = {};
      for (const key of ['name', 'color', 'emissive', 'emissiveIntensity', 'roughness', 'metalness', 'clearcoat', 'clearcoatRoughness',
        'specularIntensity', 'envMapIntensity', 'sheen', 'sheenColor', 'sheenRoughness', 'bumpScale', 'side', 'transparent', 'opacity', 'vertexColors']) {
        const value = material[key]; values[key] = value?.isColor ? value.getHexString() : value;
      }
      surroundings.update(JSON.stringify(values));
      for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap']) {
        const texture = material[key]; surroundings.update(JSON.stringify([key, texture?.repeat.toArray(), texture?.wrapS, texture?.wrapT, texture?.colorSpace]));
        const data = texture?.image?.data;
        if (data) surroundings.update(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
      }
    }
  });
  return { meshes, geometry: geometry.digest('hex'), surroundings: surroundings.digest('hex') };
}
