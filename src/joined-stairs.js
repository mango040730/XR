import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { ACCESS_STEP_COUNT, ACCESS_STEPS_PER_TIER } from './space-levels.js';

export const ACCESS_HALF_ANGLE = Math.atan2(1.7, 25.5);
export const ACCESS_DIRECTIONS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
const FULL_CIRCLE = Math.PI * 2;
const SEGMENTS = 512;
const NOSE_DEPTH = 0.05;
const NOSE_DROP = 0.02;

export function isAccessAngle(angle) {
  return ACCESS_DIRECTIONS.some(a => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < ACCESS_HALF_ANGLE);
}

// Both kinds of stairs share this one solid surface. Exact angular boundaries
// and filled side faces replace the source model's separate, gapped objects.
export function createJoinedStairs(model, { inner, outer, floorY, topY, material }) {
  const angles = [0, FULL_CIRCLE];
  // Put cardinal walking lines inside cells, rather than on triangle edges.
  for (let i = 0; i < SEGMENTS; i++) angles.push((i + 0.5) * FULL_CIRCLE / SEGMENTS);
  for (const direction of ACCESS_DIRECTIONS) {
    angles.push((direction - ACCESS_HALF_ANGLE + FULL_CIRCLE) % FULL_CIRCLE);
    angles.push((direction + ACCESS_HALF_ANGLE) % FULL_CIRCLE);
  }
  angles.sort((a, b) => a - b);
  const keys = angles.filter((a, i) => i === 0 || a - angles[i - 1] > 1e-9);
  const count = keys.length - 1;
  const access = Array.from({ length: count }, (_, i) => isAccessAngle((keys[i] + keys[i + 1]) / 2));
  const bandDepth = (outer - inner) / ACCESS_STEP_COUNT;
  const positions = [], indices = [], cache = new Map();
  function vertex(radius, angle, height) {
    const x = Math.round(radius * Math.cos(angle) * 1e7) / 1e7;
    const z = Math.round(radius * Math.sin(angle) * 1e7) / 1e7;
    height = Math.round(height * 1e7) / 1e7;
    const key = `${Math.round(x * 1e7)},${Math.round(height * 1e7)},${Math.round(z * 1e7)}`;
    if (!cache.has(key)) { cache.set(key, positions.length / 3); positions.push(x, height, z); }
    return cache.get(key);
  }
  function quad(points, reverse = false) {
    const [a, b, c, d] = points.map(p => vertex(...p));
    function triangle(x, y, z) {
      if (x === y || y === z || z === x) return;
      if (reverse) indices.push(x, z, y); else indices.push(x, y, z);
    }
    triangle(a, b, c); triangle(a, c, d);
  }
  function height(band, narrow) {
    if (band < 0) return floorY;
    const level = narrow ? band + 1 : Math.ceil((band + 1) / ACCESS_STEPS_PER_TIER) * ACCESS_STEPS_PER_TIER;
    return floorY + (topY - floorY) * level / ACCESS_STEP_COUNT;
  }
  function profile(band, narrow) {
    const r0 = inner + band * bandDepth, h = height(band, narrow), previous = height(band - 1, narrow);
    const result = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const smooth = t * t * (3 - 2 * t);
      const y = h > previous + 1e-6 ? h - NOSE_DROP + NOSE_DROP * smooth : h;
      result.push([r0 + NOSE_DEPTH * t, y]);
    }
    result.push([r0 + bandDepth, h]);
    return result;
  }
  for (let band = 0; band < ACCESS_STEP_COUNT; band++) {
    const profiles = [profile(band, false), profile(band, true)];
    for (let i = 0; i < count; i++) {
      const a0 = keys[i], a1 = keys[i + 1], narrow = access[i], p = profiles[Number(narrow)];
      const boundaryCell = access[(i + count - 1) % count] !== narrow || access[(i + 1) % count] !== narrow;
      const topProfile = !boundaryCell && Math.abs(p[0][1] - p[p.length - 1][1]) < 1e-7 ? [p[0], p[p.length - 1]] : p;
      for (let j = 0; j < topProfile.length - 1; j++) {
        const [r0, y0] = topProfile[j], [r1, y1] = topProfile[j + 1];
        quad([[r0, a0, y0], [r0, a1, y0], [r1, a1, y1], [r1, a0, y1]]);
      }
      const previous = height(band - 1, narrow);
      if (p[0][1] > previous + 1e-6) {
        const radius = p[0][0];
        quad([[radius, a0, previous], [radius, a1, previous], [radius, a1, p[0][1]], [radius, a0, p[0][1]]]);
      }
      // Close every lateral change from access treads to the three broad tiers.
      const left = access[(i + count - 1) % count];
      if (left !== narrow) {
        const leftProfile = profiles[Number(left)];
        for (let j = 0; j < p.length - 1; j++) {
          const [r0, right0] = p[j], [r1, right1] = p[j + 1];
          const left0 = leftProfile[j][1], left1 = leftProfile[j + 1][1];
          if (Math.abs(left0 - right0) + Math.abs(left1 - right1) < 1e-7) continue;
          quad([
            [r0, a0, Math.min(left0, right0)], [r1, a0, Math.min(left1, right1)],
            [r1, a0, Math.max(left1, right1)], [r0, a0, Math.max(left0, right0)],
          ], !narrow);
        }
      }
    }
  }
  const base = floorY - 0.05;
  for (let i = 0; i < count; i++) {
    const a0 = keys[i], a1 = keys[i + 1];
    quad([[inner, a0, base], [inner, a1, base], [outer, a1, base], [outer, a0, base]], true);
    quad([[inner, a0, base], [inner, a1, base], [inner, a1, floorY], [inner, a0, floorY]]);
    quad([[outer, a0, base], [outer, a1, base], [outer, a1, topY], [outer, a0, topY]], true);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  // Keep vertical risers readable while smoothing the curved noses and arcs.
  const shaded = toCreasedNormals(geometry, Math.PI / 3);
  shaded.normalizeNormals();
  shaded.setIndex(Array.from({ length: shaded.attributes.position.count }, (_, i) => i));
  shaded.computeBoundingBox(); shaded.computeBoundingSphere();
  geometry.dispose();
  const stairs = new THREE.Mesh(shaded, material);
  stairs.name = 'Terraces__Joined_circular_and_access_stairs';
  stairs.userData.walkable = true;
  stairs.userData.joinedStairs = true;
  stairs.userData.boundaryAngles = keys;
  stairs.castShadow = stairs.receiveShadow = true;
  model.add(stairs);
  return stairs;
}

export function stairAlignedRing(inner, outer, angles) {
  const positions = [], normals = [], uv = [], indices = [];
  for (const radius of [inner, outer]) {
    for (const angle of angles) {
      const x = Math.round(radius * Math.cos(angle) * 1e7) / 1e7;
      const z = Math.round(radius * Math.sin(angle) * 1e7) / 1e7;
      positions.push(x, 0, z); normals.push(0, 1, 0);
      uv.push(x / (outer * 2) + 0.5, z / (outer * 2) + 0.5);
    }
  }
  const count = angles.length;
  for (let i = 0; i < count - 1; i++) indices.push(i, i + 1, count + i + 1, i, count + i + 1, count + i);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function colorJoinedStairs(stairs, { upperInner, topY, gray, railMaterial, railOuterRadius }) {
  const geometry = stairs.geometry, p = geometry.attributes.position;
  const triangles = [[], []];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), normal = new THREE.Vector3();
  // Keep the same triangles, batching the two colors into two material groups.
  for (let i = 0; i < geometry.index.count; i += 3) {
    const ids = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
    let lowest = Infinity, radius = 0;
    for (const index of ids) {
      lowest = Math.min(lowest, p.getY(index));
      radius += Math.hypot(p.getX(index), p.getZ(index));
    }
    a.fromBufferAttribute(p, ids[0]);
    b.fromBufferAttribute(p, ids[1]).sub(a);
    c.fromBufferAttribute(p, ids[2]).sub(a);
    normal.crossVectors(b, c);
    const upward = normal.y > normal.length() * 0.5;
    const upper = radius / 3 >= upperInner - 0.00001;
    // Carpet belongs only to the upper walking surface and its rounded nose.
    // All vertical risers, corridor side walls and the underside stay gray.
    const blueFace = upper && lowest >= topY - 0.021 && upward;
    triangles[Number(blueFace)].push(...ids);
  }
  geometry.setIndex([...triangles[0], ...triangles[1]]);
  geometry.clearGroups();
  geometry.addGroup(0, triangles[0].length, 0);
  geometry.addGroup(triangles[0].length, triangles[1].length, 1);
  // Share the rail finish and its world-aligned pile coordinates for a
  // continuous blue surface at the top, rather than a pale reflected tint.
  const uv = [];
  for (let i = 0; i < p.count; i++) uv.push(p.getX(i) / (railOuterRadius * 2) + 0.5, p.getZ(i) / (railOuterRadius * 2) + 0.5);
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const grayMaterial = stairs.material.clone();
  grayMaterial.color.set(gray);
  grayMaterial.sheenColor.set(gray);
  stairs.material = [grayMaterial, railMaterial];
}
