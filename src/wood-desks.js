import * as THREE from 'three';
import { SPACE_COLORS } from './space-colors.js';

export function createDeskWoodMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    name: 'Terrace golden timber', color: SPACE_COLORS.terraceFurniture,
    bumpScale: 0,
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
