import * as THREE from 'three';

export const SMOKED_WOOD_COLOR = '#615D59';
export const WOOD_PHOTO_PATH = 'textures/wood-table-001-diffuse-2k.jpg';
const photo = typeof document === 'undefined' ? new THREE.Texture() : new THREE.TextureLoader().load(
  `${import.meta.env?.BASE_URL ?? './'}${WOOD_PHOTO_PATH}`);
photo.name = 'Poly Haven Wood Table 001 photographic diffuse';
photo.colorSpace = THREE.SRGBColorSpace;
photo.wrapS = photo.wrapT = THREE.RepeatWrapping;
photo.minFilter = THREE.LinearMipmapLinearFilter; photo.magFilter = THREE.LinearFilter;
photo.anisotropy = 8;
photo.userData.source = 'https://polyhaven.com/a/wood_table_001';
photo.userData.license = 'CC0-1.0';

// The pattern is sampled from photographed wood, never synthesized stripes.
// Random photo offsets are blended continuously to hide periodic tile repeats.
const photoShader = `
varying vec3 vDeskWood;
varying vec3 vDeskWoodNormal;
uniform sampler2D woodPhoto;
vec2 woodCrop(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
float woodPhotoTone(vec2 uv) {
  vec3 rgb = texture2D(woodPhoto, uv).rgb;
  float luminance = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  return clamp(log(max(luminance, 0.004) / 0.045) * 0.032, -0.055, 0.055);
}
float woodPlane(vec2 metres) {
  vec2 uv = metres / 1.5;
  vec2 grid = uv * 0.7, cell = floor(grid), f = fract(grid);
  f = f * f * (3.0 - 2.0 * f);
  float a = woodPhotoTone(uv + woodCrop(cell));
  float b = woodPhotoTone(uv + woodCrop(cell + vec2(1.0, 0.0)));
  float c = woodPhotoTone(uv + woodCrop(cell + vec2(0.0, 1.0)));
  float d = woodPhotoTone(uv + woodCrop(cell + vec2(1.0)));
  float footprint = max(length(dFdx(uv)), length(dFdy(uv)));
  float detail = 1.0 - smoothstep(0.0015, 0.012, footprint);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * detail;
}
float woodSurface(vec3 p, vec3 normal) {
  vec3 weights = pow(abs(normalize(normal)), vec3(6.0));
  weights /= max(dot(weights, vec3(1.0)), 0.0001);
  float tone = 0.0;
  if (weights.z > 0.002) tone += woodPlane(p.yx) * weights.z;
  if (weights.y > 0.002) tone += woodPlane(p.zx) * weights.y;
  if (weights.x > 0.002) tone += woodPlane(p.yz) * weights.x;
  return 1.0 + tone;
}
`;

export function createSmokedWoodMaterial({ role = 'desk' } = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    name: role === 'chair' ? 'Terrace photographic smoked wood frame' : 'Terrace photographic smoked gray brown wood',
    color: SMOKED_WOOD_COLOR, roughness: 0.86, metalness: 0, clearcoat: 0, specularIntensity: 0.24, envMapIntensity: 0.5 });
  material.userData.terraceDesk = role === 'desk';
  material.userData.smokedWood = true; material.userData.woodPhoto = photo;
  material.onBeforeCompile = shader => {
    shader.uniforms.woodPhoto = { value: photo };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 deskWoodCoord;\nattribute vec3 deskWoodNormal;\nvarying vec3 vDeskWood;\nvarying vec3 vDeskWoodNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDeskWood = deskWoodCoord;\nvDeskWoodNormal = deskWoodNormal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${photoShader}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= woodSurface(vDeskWood, vDeskWoodNormal);');
  };
  material.customProgramCacheKey = () => 'terrace-photographic-smoked-wood-v2';
  return material;
}

function offset(seed) {
  let state = (Math.round(seed * 10007) ^ 72519) >>> 0;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return { along: next() * 17, across: next() * 11, turn: (next() - 0.5) * 0.14 };
}
function attributes(geometry, coordinates, normals) {
  geometry.setAttribute('deskWoodCoord', new THREE.Float32BufferAttribute(coordinates, 3));
  geometry.setAttribute('deskWoodNormal', new THREE.Float32BufferAttribute(normals, 3));
}

// Planar board coordinates: a curved outline is cut out of straight-grained
// timber. Existing positions, normals, indices and transforms are untouched.
export function mapSmokedWood(geometry, { inner, start, end, floorY }, partIndex) {
  const radius = inner + 0.49, middle = (start + end) / 2, length = (end - start) * radius;
  const crop = offset(start * 13.7 + floorY * 2.9 + partIndex * 19.3);
  const angle = partIndex === 0 ? middle + crop.turn
    : middle + (partIndex === 1 ? -1 : 1) * (length / 2 - Math.max(0.32, length * 0.13)) / radius;
  const s = Math.sin(angle), c = Math.cos(angle), p = geometry.attributes.position, n = geometry.attributes.normal;
  const coordinates = [], normals = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) - Math.cos(middle) * radius, y = p.getY(i) - floorY, z = p.getZ(i) - Math.sin(middle) * radius;
    const along = x * s - z * c, across = x * c + z * s;
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (partIndex === 0) {
      coordinates.push(along + crop.along, across + crop.across, y - 0.79);
      normals.push(nx * s - nz * c, nx * c + nz * s, ny);
    } else {
      coordinates.push(y + crop.along, across + crop.across, along);
      normals.push(ny, nx * c + nz * s, nx * s - nz * c);
    }
  }
  attributes(geometry, coordinates, normals);
}

export function mapChairWood(geometry, partIndex) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, coordinates = [], normals = [];
  const crop = offset(partIndex * 5.97 + 31);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (partIndex < 4) {
      coordinates.push(y + crop.along, x + crop.across, z); normals.push(ny, nx, nz);
    } else if (partIndex === 4) {
      coordinates.push(x + crop.along, z + crop.across, y - 0.4); normals.push(nx, nz, ny);
    } else {
      const a = Math.atan2(x, z), r = Math.hypot(x, z), s = Math.sin(a), c = Math.cos(a);
      coordinates.push(a * 0.257 + crop.along, r - 0.257 + crop.across, y - 0.78);
      normals.push(nx * c - nz * s, nx * s + nz * c, ny);
    }
  }
  attributes(geometry, coordinates, normals);
}

export function varyChairWood(geometry, x, z) {
  const crop = offset(x * 7.19 + z * 17.3), p = geometry.attributes.deskWoodCoord;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + crop.along, p.getY(i) + crop.across, p.getZ(i));
}
