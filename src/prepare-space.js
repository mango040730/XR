import * as THREE from 'three';
import { arrangeTerraceSeating, TERRACE_DEPTH, TERRACE_OUTER } from './terrace-seating.js';

export const FLOOR_Y = 1.15;
export const PATH_INNER_RADIUS = TERRACE_OUTER;
export const PATH_OUTER_RADIUS = PATH_INNER_RADIUS + 10;
export const PATH_WIDTH = PATH_OUTER_RADIUS - PATH_INNER_RADIUS;
export const CENTRAL_RADIUS = 23.2;
// 0.2mm above the source top face avoids coplanar self-shadowing. Both the
// connection and carpet share this height, well below the carpet pile thickness.
export const PATH_Y = 1.9902;
export const WALK_RADIUS = PATH_OUTER_RADIUS - 0.8;
const SEGMENTS = 512;

export function expandStairRadius(radius) {
  if (radius <= CENTRAL_RADIUS) return radius;
  return Math.min(PATH_INNER_RADIUS, CENTRAL_RADIUS + (radius - CENTRAL_RADIUS) * (TERRACE_DEPTH / 1.05));
}

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
  const seating = arrangeTerraceSeating(meshes);
  const stairs = meshes.filter(object => /^Terraces.*terrace.treads/.test(object.name));
  for (const stair of stairs) {
    stair.userData.walkable = true;
    const p = stair.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), radius = Math.hypot(x, z);
      const factor = expandStairRadius(radius) / radius;
      p.setX(i, x * factor); p.setZ(i, z * factor);
    }
    p.needsUpdate = true;
    stair.geometry.computeVertexNormals();
    stair.geometry.computeBoundingBox();
    stair.geometry.computeBoundingSphere();
  }

  for (const mesh of meshes) {
    if ((/^Terraces__/.test(mesh.name) && !isWalkable(mesh)) || /circulation.deck|porcelain.floor|tile.grout/.test(mesh.name)
      || /^Architecture__Warm_luminous_strips__0_2$/.test(mesh.name)) {
      mesh.removeFromParent();
    } else if (/^(Architecture|Signage)__/.test(mesh.name)) {
      // Extend the enclosing wall outward with the deeper terraces and blue path.
      const p = mesh.geometry.attributes.position;
      const delta = PATH_OUTER_RADIUS - 31.7;
      mesh.geometry.computeBoundingBox();
      const center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      const continuous = /Deep_ultramarine.*0_0|Warm_ivory.*0_0|Warm_luminous.*0_0|Azure_sculpted|Cyan_sculpture/.test(mesh.name);
      const shift = center.clone().setY(0).normalize().multiplyScalar(delta);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), radius = Math.hypot(x, z);
        if (radius > 26.7) {
          p.setX(i, continuous ? x * (radius + delta) / radius : x + shift.x);
          p.setZ(i, continuous ? z * (radius + delta) / radius : z + shift.z);
          if (p.getY(i) > 1.28) p.setY(i, p.getY(i) + (PATH_Y - 1.3));
        }
      }
      p.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
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
  function floorMesh(name, geometry, material, height) {
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.walkable = true;
    mesh.receiveShadow = true;
    model.add(mesh);
    return mesh;
  }
  const carpet = floorMesh('Blue_velvet_carpet', new THREE.RingGeometry(PATH_INNER_RADIUS, PATH_OUTER_RADIUS, SEGMENTS), velvet, PATH_Y);
  const interior = floorMesh('Lower_circular_room', new THREE.CircleGeometry(PATH_INNER_RADIUS, SEGMENTS), porcelain, FLOOR_Y);
  // Cover the original narrow trench at the outside of the top tread. The cap
  // and carpet have exactly the same height. Depth bias prevents coplanar flicker
  // where this cap meets the existing beveled tread; it adds no geometric lip.
  const bridgeMaterial = porcelain.clone();
  bridgeMaterial.polygonOffset = true;
  bridgeMaterial.polygonOffsetFactor = -1;
  bridgeMaterial.polygonOffsetUnits = -1;
  const bridge = floorMesh('Flush_top_tread_connection', new THREE.RingGeometry(expandStairRadius(26.25), PATH_INNER_RADIUS, SEGMENTS), bridgeMaterial, PATH_Y);
  // The uppermost tread meets the blue path flush: no curb, lip or extra riser.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(PATH_OUTER_RADIUS, PATH_OUTER_RADIUS, PATH_Y, SEGMENTS, 1, true), velvet);
  skirt.name = 'Carpet_plinth_side';
  skirt.position.y = PATH_Y / 2;
  model.add(skirt);
  model.updateMatrixWorld(true);
  return { carpet, interior, stairs, bridge, seating, floorY: FLOOR_Y, pathY: PATH_Y, pathWidth: PATH_WIDTH };
}
