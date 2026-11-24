import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TERRACE_OUTER } from './space-layout.js';
import { PATH_Y } from './space-levels.js';
import { SPACE_COLORS } from './space-colors.js';

export const ENTRY_WIDTH = 4.4;
export const ENTRY_HEIGHT = 3.5;
export const ENTRY_RADIUS = TERRACE_OUTER + 10;
export const ENTRY_OUTER_Z = ENTRY_RADIUS + 2.8;
export const ENTRY_POSITION = [0, PATH_Y + 0.025, ENTRY_RADIUS + 1.1];
export const ENTRY_PITCH = -0.12;
export function entranceConfig(radius, floorY) {
  return { position: [0, floorY + 0.025, radius + 1.1], outerZ: radius + 2.8, pitch: ENTRY_PITCH };
}
const DEFAULT_ENTRY = { position: ENTRY_POSITION, outerZ: ENTRY_OUTER_Z, pitch: ENTRY_PITCH };

export function resetToEntrance(rig, camera, immersive = false, entry = DEFAULT_ENTRY) {
  rig.position.set(...entry.position);
  rig.rotation.set(0, 0, 0);
  camera.rotation.set(immersive ? 0 : entry.pitch, 0, 0);
  if (!immersive) camera.position.set(0, 1.65, 0);
}

// Expand the walking limit only through this entrance, with a shoulder margin
// inside its jambs and a safe stopping distance before the landing's outer edge.
export function withinWalkBoundary(x, z, circleRadius, entry = DEFAULT_ENTRY) {
  return Math.hypot(x, z) <= circleRadius
    || (Math.abs(x) <= ENTRY_WIDTH / 2 - 0.35 && z >= circleRadius - 0.5 && z <= entry.outerZ - 0.35);
}

// Three curved patches share the original full-circle UV coordinates. The
// doorway is empty below the lintel; the screen continues over its top.
export function wallWithOpening(radius, bottom, top, segments = 512) {
  const halfAngle = Math.asin(ENTRY_WIDTH / 2 / radius);
  const positions = [], normals = [], uvs = [], indices = [];
  function patch(start, end, low, high) {
    const count = Math.max(2, Math.ceil((end - start) / (Math.PI * 2) * segments));
    const offset = positions.length / 3;
    for (let i = 0; i <= count; i++) {
      const angle = THREE.MathUtils.lerp(start, end, i / count), x = Math.sin(angle), z = Math.cos(angle);
      for (const y of [low, high]) {
        positions.push(radius * x, y, radius * z);
        normals.push(-x, 0, -z);
        uvs.push(angle / (Math.PI * 2), (y - bottom) / (top - bottom));
      }
      if (i < count) {
        const a = offset + i * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
  }
  patch(halfAngle, Math.PI * 2 - halfAngle, bottom, top);
  patch(0, halfAngle, Math.max(bottom, ENTRY_HEIGHT), top);
  patch(Math.PI * 2 - halfAngle, Math.PI * 2, Math.max(bottom, ENTRY_HEIGHT), top);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function createEntrance(root, radius, floorY, carpetMaterial, carpetGeometry) {
  const outerZ = entranceConfig(radius, floorY).outerZ;
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    name: 'Entrance ivory ceramic', color: SPACE_COLORS.sculpture, roughness: 0.42, clearcoat: 0.2,
  });
  const glowMaterial = new THREE.MeshStandardMaterial({
    name: 'Entrance warm edge light', color: '#ffebcf', emissive: '#ffd4a0', emissiveIntensity: 1.2,
  });
  const frame = new THREE.Group(); frame.name = 'Entrance_frame';
  function beam(name, w, h, d, x, y, z, material = frameMaterial, bevel = 0.06) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, bevel), material);
    mesh.name = name; mesh.position.set(x, floorY + y, z); frame.add(mesh);
    return mesh;
  }
  const z = Math.sqrt(radius * radius - (ENTRY_WIDTH / 2) ** 2) + 0.11;
  for (const sign of [-1, 1]) {
    beam('Entrance_jamb', 0.24, ENTRY_HEIGHT + 0.18, 0.6, sign * (ENTRY_WIDTH / 2 + 0.1), (ENTRY_HEIGHT + 0.18) / 2, z);
    beam('Entrance_vertical_light', 0.028, ENTRY_HEIGHT - 0.08, 0.025, sign * (ENTRY_WIDTH / 2 - 0.01), ENTRY_HEIGHT / 2, z - 0.315, glowMaterial, 0.01);
  }
  beam('Entrance_lintel', ENTRY_WIDTH + 0.44, 0.24, 0.6, 0, ENTRY_HEIGHT + 0.04, z);
  beam('Entrance_header_light', ENTRY_WIDTH, 0.028, 0.025, 0, ENTRY_HEIGHT - 0.07, z - 0.315, glowMaterial, 0.01);
  root.add(frame);

  // A real landing joins the circular carpet exactly at its curved perimeter.
  // There is no overlapping floor, raised threshold or invisible floor plane.
  const halfWidth = ENTRY_WIDTH / 2 + 0.2, points = [];
  const rim = [];
  const source = carpetGeometry.attributes.position;
  for (let i = source.count / 2; i < source.count; i++) {
    if (source.getZ(i) > radius * 0.95) rim.push({ x: source.getX(i), z: source.getZ(i) });
  }
  rim.sort((a, b) => a.x - b.x);
  function rimZ(x) {
    const i = rim.findIndex(point => point.x >= x), a = rim[i - 1], b = rim[i];
    return THREE.MathUtils.lerp(a.z, b.z, (x - a.x) / (b.x - a.x));
  }
  for (const x of [-halfWidth, ...rim.filter(p => p.x > -halfWidth && p.x < halfWidth).map(p => p.x), halfWidth]) {
    points.push(new THREE.Vector2(x, -rimZ(x)));
  }
  points.push(new THREE.Vector2(halfWidth, -outerZ), new THREE.Vector2(-halfWidth, -outerZ));
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points), { depth: 0.3, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.translate(0, floorY - 0.3, 0);
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (radius * 2) + 0.5, p.getZ(i) / (radius * 2) + 0.5);
  const landing = new THREE.Mesh(geometry, [carpetMaterial, frameMaterial]);
  landing.name = 'Entrance_blue_carpet_landing';
  landing.userData.walkable = true;
  root.add(landing);
  return { frame, landing, width: ENTRY_WIDTH, height: ENTRY_HEIGHT };
}
