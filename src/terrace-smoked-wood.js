import * as THREE from 'three';

export const SMOKED_WOOD_COLOR = '#575452';

// Continuous, unlit grain in physical coordinates; no photographed shadows,
// plank divisions, displacement, normal map, or repeating image tiles.
const grainShader = `
varying vec3 vDeskWood;
float deskHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float deskNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(deskHash(i), deskHash(i + vec2(1.0, 0.0)), f.x),
    mix(deskHash(i + vec2(0.0, 1.0)), deskHash(i + vec2(1.0)), f.x), f.y);
}
float deskGrain(vec3 p) {
  float across = p.y + p.z * 0.83;
  float bend = 0.006 * sin(p.x * 1.1 + across * 7.0)
    + 0.018 * deskNoise(vec2(p.x * 0.8, across * 9.0))
    + 0.009 * deskNoise(vec2(p.x * 2.5, across * 20.0));
  float phase = (across + bend) * 950.0;
  float footprint = fwidth(phase);
  float fine = pow(0.5 + 0.5 * sin(phase), 14.0) * (1.0 - smoothstep(0.4, 2.5, footprint));
  float soft = pow(deskNoise(vec2(p.x * 0.8, (across + bend * 0.65) * 95.0)), 3.0);
  float pores = pow(deskNoise(vec2(p.x * 12.0, across * 900.0)), 4.0);
  float variation = deskNoise(vec2(p.x * 2.1, across * 42.0));
  return 1.035 - fine * 0.14 - soft * 0.10 - pores * 0.06 + (variation - 0.5) * 0.035;
}
`;

export function createSmokedWoodMaterial() {
  const material = new THREE.MeshPhysicalMaterial({ name: 'Terrace smoked gray brown matte wood', color: SMOKED_WOOD_COLOR,
    roughness: 0.87, metalness: 0, clearcoat: 0, specularIntensity: 0.25, envMapIntensity: 0.55 });
  material.userData.terraceDesk = true;
  material.userData.smokedWood = true;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 deskWoodCoord;\nvarying vec3 vDeskWood;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDeskWood = deskWoodCoord;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${grainShader}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= deskGrain(vDeskWood);');
  };
  material.customProgramCacheKey = () => 'terrace-smoked-wood-v1';
  return material;
}

// Adds material coordinates only. Existing positions, normals, indices and
// transforms remain byte-for-byte intact. Top grain follows the circular arc;
// support grain runs vertically and remains continuous around rounded edges.
export function mapSmokedWood(geometry, { inner, start, end, floorY }, partIndex) {
  const radius = inner + 0.49, middle = (start + end) / 2, length = (end - start) * radius;
  const phase = (Math.sin(start * 127.1 + floorY * 31.7) * 0.5 + 0.5) * 79 + partIndex * 19.3;
  const legAngle = middle + (partIndex === 1 ? -1 : 1) * (length / 2 - Math.max(0.32, length * 0.13)) / radius;
  const p = geometry.attributes.position, coordinates = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (partIndex === 0) {
      let angle = Math.atan2(z, x);
      angle += Math.round((middle - angle) / (Math.PI * 2)) * Math.PI * 2;
      coordinates.set([(angle - middle) * radius + phase, Math.hypot(x, z) - radius, y - floorY - 0.79], i * 3);
    } else {
      coordinates.set([y - floorY + phase, x * Math.cos(legAngle) + z * Math.sin(legAngle) - radius,
        x * Math.sin(legAngle) - z * Math.cos(legAngle)], i * 3);
    }
  }
  geometry.setAttribute('deskWoodCoord', new THREE.Float32BufferAttribute(coordinates, 3));
}
