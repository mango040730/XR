import * as THREE from 'three';
import { arrangeTerraceSeating } from './terrace-seating.js';
import { CENTRAL_RADIUS, TERRACE_OUTER } from './space-layout.js';
import { createDigitalWall } from './digital-wall.js';
import { applyClayStyle } from './clay-style.js';
import { createJoinedStairs, stairAlignedRing } from './joined-stairs.js';
import { FLOOR_Y, PATH_Y } from './space-levels.js';

export { FLOOR_Y, PATH_Y } from './space-levels.js';
export const PATH_INNER_RADIUS = TERRACE_OUTER;
export const PATH_OUTER_RADIUS = PATH_INNER_RADIUS + 10;
export const PATH_WIDTH = PATH_OUTER_RADIUS - PATH_INNER_RADIUS;
export { CENTRAL_RADIUS } from './space-layout.js';
export const WALK_RADIUS = PATH_OUTER_RADIUS - 0.8;
const SEGMENTS = 512;

export function isWalkable(mesh) {
  return mesh.userData.walkable === true;
}

// Exported source geometry stays intact. The same edited scene is used for rendering,
// walking collision, teleportation and the model regression checks.
export function prepareSpace(model) {
  model.updateMatrixWorld(true);
  const meshes = [];
  model.traverse(object => { if (object.isMesh) meshes.push(object); });
  const porcelain = meshes.find(object => /porcelain.floor/.test(object.name)).material;
  const stairMaterial = meshes.find(object => /^Terraces.*terrace.treads/.test(object.name)).material;
  const seating = arrangeTerraceSeating(meshes, model);

  for (const mesh of meshes) {
    if (/^(Terraces|Architecture|Signage)__/.test(mesh.name)) {
      mesh.removeFromParent();
    }
  }
  const stairs = [createJoinedStairs(model, {
    inner: CENTRAL_RADIUS, outer: PATH_INNER_RADIUS, floorY: FLOOR_Y, topY: PATH_Y, material: stairMaterial,
  })];

  // Fine, non-directional pile texture; no tile lines or geometric carpet pattern.
  const size = 256, pixels = new Uint8Array(size * size * 4);
  let seed = 73619;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 90 + (seed >>> 25);
    pixels.set([value, value, value, 255], i * 4);
  }
  const pile = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  pile.name = 'Fine velvet pile';
  pile.wrapS = pile.wrapT = THREE.RepeatWrapping;
  pile.repeat.set(100, 100);
  pile.magFilter = THREE.LinearFilter;
  pile.minFilter = THREE.LinearMipmapLinearFilter;
  pile.generateMipmaps = true;
  pile.needsUpdate = true;
  const velvet = new THREE.MeshPhysicalMaterial({
    name: 'Blue velvet carpet', color: '#1c3d86', roughness: 0.96,
    metalness: 0, sheen: 1, sheenColor: '#4266b2', sheenRoughness: 0.85,
    specularIntensity: 0.15, bumpMap: pile, bumpScale: 0.0015,
    side: THREE.DoubleSide,
  });
  function floorMesh(name, geometry, material, height, xyPlane = true) {
    if (xyPlane) geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.walkable = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    return mesh;
  }
  const carpet = floorMesh('Blue_velvet_carpet', stairAlignedRing(PATH_INNER_RADIUS, PATH_OUTER_RADIUS, stairs[0].userData.boundaryAngles), velvet, PATH_Y, false);
  const interior = floorMesh('Lower_circular_room', new THREE.CircleGeometry(PATH_INNER_RADIUS, SEGMENTS), porcelain, FLOOR_Y);
  // The joined upper tread meets the carpet directly at the same height.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(PATH_OUTER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, SEGMENTS, 1, true), velvet);
  skirt.name = 'Carpet_plinth_side';
  skirt.position.y = PATH_Y / 2;
  model.add(skirt);
  const foundation = new THREE.Mesh(
    new THREE.CylinderGeometry(PATH_OUTER_RADIUS + 0.3, PATH_OUTER_RADIUS + 0.3, 0.8, SEGMENTS),
    new THREE.MeshStandardMaterial({ color: '#112853', roughness: 0.8 }),
  );
  foundation.name = 'Circular_foundation';
  foundation.position.y = -0.4;
  model.add(foundation);
  const digitalWall = createDigitalWall(model, PATH_OUTER_RADIUS, PATH_Y);
  const clay = applyClayStyle(model);
  model.updateMatrixWorld(true);
  return { carpet, interior, stairs, seating, digitalWall, clay, floorY: FLOOR_Y, pathY: PATH_Y, pathWidth: PATH_WIDTH };
}
