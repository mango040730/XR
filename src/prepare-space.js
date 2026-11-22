import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';

export const FLOOR_Y = 1.15;
export const PATH_OUTER_RADIUS = 31.7;
export const PATH_INNER_RADIUS = 21.7;
export const PATH_WIDTH = PATH_OUTER_RADIUS - PATH_INNER_RADIUS;
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
  const oldFloors = meshes.filter(object => /circulation.deck|porcelain.floor|^Terraces.*terrace.treads/.test(object.name));
  for (const mesh of oldFloors) {
    computeBoundsTree.call(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  }
  const porcelain = meshes.find(object => /porcelain.floor/.test(object.name)).material;
  const supportRay = new THREE.Raycaster();
  supportRay.firstHitOnly = true;
  const down = new THREE.Vector3(0, -1, 0);
  const at = new THREE.Vector3();
  function originalSupport(x, z) {
    at.set(x, 10, z);
    supportRay.set(at, down);
    return supportRay.intersectObjects(oldFloors, false)[0]?.point.y ?? FLOOR_Y;
  }
  // A mesh can contain several pieces of furniture on different former levels.
  // Weld coincident seam vertices and move each connected piece as a rigid object.
  for (const mesh of meshes) {
    if (!/^(Cafe_Furniture|Planting|Luminaires)__/.test(mesh.name)) continue;
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const parents = Uint32Array.from({ length: position.count }, (_, i) => i);
    function root(i) {
      while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
      return i;
    }
    function join(a, b) { parents[root(a)] = root(b); }
    const seams = new Map();
    for (let i = 0; i < position.count; i++) {
      const key = `${Math.round(position.getX(i) * 10000)},${Math.round(position.getY(i) * 10000)},${Math.round(position.getZ(i) * 10000)}`;
      if (seams.has(key)) join(i, seams.get(key));
      else seams.set(key, i);
    }
    const index = geometry.index;
    for (let i = 0, count = index?.count ?? position.count; i < count; i += 3) {
      const a = index ? index.getX(i) : i;
      join(a, index ? index.getX(i + 1) : i + 1);
      join(a, index ? index.getX(i + 2) : i + 2);
    }
    const pieces = new Map();
    for (let i = 0; i < position.count; i++) {
      const id = root(i), x = position.getX(i), z = position.getZ(i);
      if (!pieces.has(id)) pieces.set(id, { minX: x, maxX: x, minZ: z, maxZ: z });
      const p = pieces.get(id);
      p.minX = Math.min(p.minX, x); p.maxX = Math.max(p.maxX, x);
      p.minZ = Math.min(p.minZ, z); p.maxZ = Math.max(p.maxZ, z);
    }
    for (const piece of pieces.values()) {
      const x = (piece.minX + piece.maxX) / 2, z = (piece.minZ + piece.maxZ) / 2;
      piece.drop = Math.max(0, Math.round((originalSupport(x, z) - FLOOR_Y) / 0.14) * 0.14);
    }
    for (let i = 0; i < position.count; i++) position.setY(i, position.getY(i) - pieces.get(root(i)).drop);
    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  for (const mesh of meshes) {
    if (/^Terraces__|circulation.deck|porcelain.floor|tile.grout/.test(mesh.name)
      || /^Architecture__Warm_luminous_strips__0_2$/.test(mesh.name)) {
      mesh.removeFromParent();
    }
  }

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
    name: 'Blue velvet carpet', color: '#245ab4', roughness: 0.96,
    metalness: 0, sheen: 1, sheenColor: '#6b8dd1', sheenRoughness: 0.85,
    specularIntensity: 0.15, bumpMap: pile, bumpScale: 0.0015,
    side: THREE.DoubleSide,
  });
  function floorMesh(name, geometry, material) {
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, FLOOR_Y, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.walkable = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    return mesh;
  }
  const carpet = floorMesh('Blue_velvet_carpet', new THREE.RingGeometry(PATH_INNER_RADIUS, PATH_OUTER_RADIUS, SEGMENTS), velvet);
  const interior = floorMesh('Level_porcelain_floor', new THREE.CircleGeometry(PATH_INNER_RADIUS, SEGMENTS), porcelain);
  // A vertical skirt closes the existing plinth without adding a raised edge.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(PATH_OUTER_RADIUS, PATH_OUTER_RADIUS, FLOOR_Y, SEGMENTS, 1, true), velvet);
  skirt.name = 'Carpet_plinth_side';
  skirt.position.y = FLOOR_Y / 2;
  model.add(skirt);
  model.updateMatrixWorld(true);
  return { carpet, interior, floorY: FLOOR_Y, pathWidth: PATH_WIDTH };
}
