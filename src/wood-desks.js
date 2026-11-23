import * as THREE from 'three';
import { SPACE_COLORS } from './space-colors.js';

export function createDeskWoodMaterial() {
  const width = 512, height = 256;
  const color = new Uint8Array(width * height * 4);
  const relief = new Uint8Array(color.length);
  let seed = 27189;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const bend = 0.35 * Math.sin(u * Math.PI * 2) + 0.11 * Math.sin(u * Math.PI * 6 + v * 2);
    const grain = Math.sin((v * 22 + bend) * Math.PI * 2);
    const fine = Math.sin((v * 97 + bend * 2) * Math.PI * 2);
    const broad = Math.sin((v * 3 + 0.1 * Math.sin(u * Math.PI * 2)) * Math.PI * 2);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const tone = broad * 12 + grain * 5 + fine * 2 + ((seed >>> 24) / 255 - 0.5) * 3;
    const i = (y * width + x) * 4;
    const value = Math.min(255, 245 + tone * 0.5);
    color.set([value, value, value, 255], i);
    const h = 128 + grain * 16 + fine * 7;
    relief.set([h, h, h, 255], i);
  }
  function texture(data, name) {
    const map = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    map.name = name;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 8;
    map.needsUpdate = true;
    return map;
  }
  const map = texture(color, 'Neutral lengthwise timber grain');
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshPhysicalMaterial({
    name: 'Terrace golden timber', color: SPACE_COLORS.terraceFurniture, map,
    bumpMap: texture(relief, 'Fine timber pores'), bumpScale: 0.0008,
    roughness: 0.42, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.3,
    specularIntensity: 0.45, envMapIntensity: 0.55,
  });
  material.userData.terraceWood = true;
  return material;
}

export function mapCurvedWood(geometry, start, end, radius, inner) {
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  const uv = [];
  const middle = (start + end) / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    let angle = Math.atan2(z, x);
    angle += Math.round((middle - angle) / (Math.PI * 2)) * Math.PI * 2;
    const radialNormal = Math.abs((n.getX(i) * x + n.getZ(i) * z) / r);
    const along = (angle - start) * radius / 2;
    if (Math.abs(n.getY(i)) > 0.5) uv.push(along, (r - inner) / 0.7);
    else if (radialNormal > 0.5) uv.push(along, p.getY(i) / 0.7);
    else uv.push((r - inner) / 0.7, p.getY(i) / 0.7);
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
}
