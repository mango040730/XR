import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const TERRACE_CHAIR_COLOR = '#3448C5';

function fabric() {
  const size = 128, data = new Uint8Array(size * size * 4);
  let state = 8319;
  for (let i = 0; i < data.length; i += 4) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = 85 + (state >>> 25);
    data.set([value, value, value, 255], i);
  }
  const pile = new THREE.DataTexture(data, size, size);
  pile.wrapS = pile.wrapT = THREE.RepeatWrapping; pile.repeat.set(5, 5);
  pile.magFilter = THREE.LinearFilter; pile.minFilter = THREE.LinearMipmapLinearFilter;
  pile.generateMipmaps = true; pile.needsUpdate = true;
  const material = new THREE.MeshPhysicalMaterial({ name: 'Terrace cobalt boucle upholstery', color: TERRACE_CHAIR_COLOR,
    roughness: 0.96, metalness: 0, clearcoat: 0, specularIntensity: 0.22,
    sheen: 0.65, sheenColor: '#7d8ae3', sheenRoughness: 0.9, bumpMap: pile, bumpScale: 0.0012 });
  material.userData.terraceChair = true;
  return material;
}

// Broad, softly crowned foam discs, with a flat supporting underside.
function cushion(radius, bottom, height, bevel, depthScale = 1) {
  const points = [new THREE.Vector2(0, bottom), new THREE.Vector2(radius - bevel, bottom)];
  for (let i = 1; i <= 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 20;
    points.push(new THREE.Vector2(radius - bevel + bevel * Math.cos(a), bottom + bevel + bevel * Math.sin(a)));
  }
  points.push(new THREE.Vector2(radius, bottom + height - bevel));
  for (let i = 1; i <= 10; i++) {
    const a = i * Math.PI / 20;
    points.push(new THREE.Vector2(radius - bevel + bevel * Math.cos(a), bottom + height - bevel + bevel * Math.sin(a)));
  }
  points.push(new THREE.Vector2(radius * 0.45, bottom + height + 0.008), new THREE.Vector2(0, bottom + height + 0.01));
  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.scale(1, 1, depthScale); return geometry;
}

// A continuous half-round back with rounded rectangular section and soft end
// caps. Local -Z is the open front; +Z wraps around the rear of the seat.
function wrapBack() {
  const positions = [], uv = [], indices = [], rings = [], sections = 32, half = Math.PI * 0.48;
  for (let i = 1; i <= 8; i++) rings.push({ a: -half, offset: -0.065 * Math.cos(i * Math.PI / 16), scale: Math.sin(i * Math.PI / 16) });
  for (let i = 1; i <= 56; i++) rings.push({ a: -half + i / 56 * half * 2, offset: 0, scale: 1 });
  for (let i = 1; i < 8; i++) rings.push({ a: half, offset: 0.065 * Math.sin(i * Math.PI / 16), scale: Math.cos(i * Math.PI / 16) });
  for (let i = 0; i < rings.length; i++) {
    const { a, offset, scale } = rings[i], s = Math.sin(a), c = Math.cos(a);
    for (let j = 0; j <= sections; j++) {
      const t = j / sections * Math.PI * 2;
      const radial = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.48 * 0.075 * scale;
      const y = Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** 0.48 * 0.275 * scale;
      positions.push(s * (0.255 + radial) + c * offset, 0.735 + y, c * (0.255 + radial) - s * offset + 0.025);
      uv.push(i / (rings.length - 1), j / sections);
      if (i && j) {
        const b = i * (sections + 1) + j, a0 = b - sections - 1;
        indices.push(a0 - 1, b - 1, b, a0 - 1, b, a0);
      }
    }
  }
  for (const [ring, a, offset, reverse] of [[0, -half, -0.065, true], [rings.length - 1, half, 0.065, false]]) {
    const id = positions.length / 3;
    positions.push(Math.sin(a) * 0.255 + Math.cos(a) * offset, 0.735, Math.cos(a) * 0.255 - Math.sin(a) * offset + 0.025); uv.push(reverse ? 0 : 1, 0.5);
    for (let j = 0; j < sections; j++) {
      const b = ring * (sections + 1) + j;
      indices.push(...(reverse ? [id, b, b + 1] : [id, b + 1, b]));
    }
  }
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  source.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); source.setIndex(indices);
  const geometry = mergeVertices(source, 0.000001); source.dispose(); geometry.computeVertexNormals(); return geometry;
}

export function createTerraceChairTemplate() {
  const material = fabric();
  return [cushion(0.315, 0, 0.15, 0.055, 0.96), cushion(0.33, 0.15, 0.30, 0.12, 0.96), wrapBack()]
    .map(geometry => ({ geometry, material }));
}
