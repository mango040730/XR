import * as THREE from 'three';
import { meshPieces } from './mesh-pieces.js';
import { SPACE_COLORS } from './space-colors.js';
import { isUpholstery, seatOutline, crownCushion, addSeatWelting } from './upholstery-detail.js';
import { rebuildSmoothPrimitive } from './smooth-primitives.js';

export const CLAY_TRIANGLE_BUDGET = 4600000;
const PROP = /^(Planting|Cafe_Furniture|Lounge_Pods|Luminaires)__/;
const palette = [
  [/Warm ivory/, SPACE_COLORS.sculpture], [/Terracotta coral/, SPACE_COLORS.coral], [/Coral cushion/, SPACE_COLORS.coral],
  [/Cobalt fabric/, '#163e8c'], [/Sunflower/, '#ffce32'], [/Tangerine/, '#ff891c'],
  [/Honey yellow/, '#ffc553'], [/Golden oak/, '#f2b44e'], [/Sofa recessed/, '#a78d74'],
  [/River pebble warm/, '#b6a58d'], [/River pebble grey/, '#92978c'],
  [/Forest foliage/, '#405843'], [/Sage foliage/, '#78866a'], [/Fresh yellow green/, '#a7ad6b'],
  [/Plant stems/, '#5e704b'], [/Planter dark soil/, '#40372e'],
  [/Porcelain and sign/, SPACE_COLORS.sculpture], [/Cream porcelain/, SPACE_COLORS.floor], [/Warm grey terrace/, SPACE_COLORS.sculpture],
  [/Opal lamp/, '#fff0d5'],
];

function normals(vertices, faces) {
  const out = vertices.map(() => new THREE.Vector3());
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i], b = faces[i + 1], c = faces[i + 2];
    ab.subVectors(vertices[b], vertices[a]); ac.subVectors(vertices[c], vertices[a]);
    normal.crossVectors(ab, ac);
    // Angle weighting prevents large cap triangles from flattening the small
    // bevel rings, preserving a clean highlight around rounded ceramic edges.
    normal.normalize();
    for (const [id, next, previous] of [[a, b, c], [b, c, a], [c, a, b]]) {
      ab.subVectors(vertices[next], vertices[id]); ac.subVectors(vertices[previous], vertices[id]);
      const angle = ab.lengthSq() && ac.lengthSq() ? ab.angleTo(ac) : 0;
      out[id].addScaledVector(normal, angle);
    }
  }
  return out.map(n => n.normalize());
}

function weldedPiece(piece) {
  const position = piece.mesh.geometry.attributes.position;
  const vertices = [], map = new Map(), remap = new Map();
  for (const i of piece.vertices) {
    const v = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i));
    const key = `${Math.round(v.x * 100000)},${Math.round(v.y * 100000)},${Math.round(v.z * 100000)}`;
    if (!map.has(key)) { map.set(key, vertices.length); vertices.push(v); }
    remap.set(i, map.get(key));
  }
  return { vertices, faces: piece.faces.map(i => remap.get(i)), bounds: piece.bounds, mesh: piece.mesh, sourceTriangles: piece.faces.length / 3, passes: 0 };
}

function softenUpholstery(piece) {
  if (!isUpholstery(piece)) return false;
  const original = piece.vertices.map(v => v.clone());
  const neighbours = piece.vertices.map(() => new Set());
  for (let i = 0; i < piece.faces.length; i += 3) {
    const triangle = piece.faces.slice(i, i + 3);
    for (const a of triangle) for (const b of triangle) if (a !== b) neighbours[a].add(b);
  }
  // Alternating relaxation rounds foam without shrinking the assembled seat.
  // Bound each displacement and restore its original envelope before rendering.
  for (const amount of [0.4, -0.42, 0.4, -0.42]) {
    piece.vertices = piece.vertices.map((v, i) => {
      if (!neighbours[i].size) return v.clone();
      const average = new THREE.Vector3();
      for (const n of neighbours[i]) average.add(piece.vertices[n]);
      average.divideScalar(neighbours[i].size);
      const next = v.clone().lerp(average, amount);
      return original[i].clone().add(next.sub(original[i]).clampLength(0, 0.035));
    });
  }
  fitBounds(piece);
  crownCushion(piece);
  fitBounds(piece);
  return true;
}

function surfaceFinish(name) {
  if (/Terrace chair .* frame/.test(name)) return { roughness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.2, envMapIntensity: 0.8 };
  if (/Terrace chair .* seat/.test(name)) return { roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.23 };
  if (/Planter dark soil/.test(name)) return { roughness: 0.95, specularIntensity: 0.15 };
  if (/Sofa recessed/.test(name)) return { color: '#bfc5cb', roughness: 0.24, metalness: 0.8, clearcoat: 0.25, envMapIntensity: 1 };
  if (/foliage|Plant stems/.test(name)) return { roughness: 0.56, clearcoat: 0.1, clearcoatRoughness: 0.4 };
  if (/River pebble/.test(name)) return { roughness: 0.82, specularIntensity: 0.28, clearcoat: 0.02 };
  if (/Golden oak/.test(name)) return { roughness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.2, envMapIntensity: 0.8 };
  if (/Honey yellow table/.test(name)) return { roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.23 };
  if (/upholstery|cushion|fabric|ottoman/.test(name)) return { roughness: 0.6, specularIntensity: 0.38, clearcoat: 0.025, sheen: 0.42, sheenRoughness: 0.8 };
  if (/Warm grey terrace/.test(name)) return { roughness: 0.65, specularIntensity: 0.35, clearcoat: 0.04 };
  if (/Cream porcelain/.test(name)) return { roughness: 0.52, specularIntensity: 0.45, clearcoat: 0.12 };
  if (/ivory|Porcelain|Opal lamp/.test(name)) return { roughness: 0.37, clearcoat: 0.28, clearcoatRoughness: 0.3, specularIntensity: 0.45 };
  return {};
}

function refine(piece, limit) {
  const vertices = piece.vertices, oldNormals = normals(vertices, piece.faces);
  const edgeMap = new Map(), faces = [];
  function middle(a, b) {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (edgeMap.has(key)) return edgeMap.get(key);
    const delta = vertices[b].clone().sub(vertices[a]);
    // Cubic normal-guided edge interpolation rounds actual silhouettes as well
    // as shading. A small local cap keeps the original furniture proportions.
    const curve = oldNormals[a].clone().multiplyScalar(-delta.dot(oldNormals[a]) / 8)
      .addScaledVector(oldNormals[b], delta.dot(oldNormals[b]) / 8).clampLength(0, limit);
    const v = vertices[a].clone().add(vertices[b]).multiplyScalar(0.5).add(curve);
    // A rounded silhouette must not turn a flat supporting cap into a hanging
    // point. Keep the top/bottom planes within their original height envelope.
    v.y = THREE.MathUtils.clamp(v.y, piece.bounds.min.y, piece.bounds.max.y);
    const id = vertices.length; vertices.push(v); edgeMap.set(key, id);
    return id;
  }
  for (let i = 0; i < piece.faces.length; i += 3) {
    const a = piece.faces[i], b = piece.faces[i + 1], c = piece.faces[i + 2];
    const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
    faces.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  piece.faces = faces;
  piece.passes++;
}

function fitBounds(piece) {
  const current = new THREE.Box3().setFromPoints(piece.vertices);
  const oldSize = piece.bounds.getSize(new THREE.Vector3()), size = current.getSize(new THREE.Vector3());
  for (const v of piece.vertices) {
    for (const axis of ['x', 'y', 'z']) {
      v[axis] = size[axis] > 1e-8 ? piece.bounds.min[axis] + (v[axis] - current.min[axis]) * oldSize[axis] / size[axis] : piece.bounds.min[axis];
    }
  }
}

function buildGeometry(mesh, pieces) {
  const positions = [], normalValues = [], indices = [];
  for (const piece of pieces) {
    fitBounds(piece);
    const ns = normals(piece.vertices, piece.faces), offset = positions.length / 3;
    for (let i = 0; i < piece.vertices.length; i++) {
      positions.push(...piece.vertices[i].toArray()); normalValues.push(...ns[i].toArray());
    }
    for (const index of piece.faces) indices.push(index + offset);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalValues, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const old = mesh.geometry; mesh.geometry = geometry; old.dispose();
}

export function applyClayStyle(model) {
  const meshes = [];
  model.traverse(mesh => { if (mesh.isMesh && PROP.test(mesh.name)) meshes.push(mesh); });
  const beforeBounds = new THREE.Box3().setFromObject(model);
  const geometryByMesh = new Map(meshes.map(mesh => [mesh, meshPieces(mesh).map(weldedPiece)]));
  let triangles = 0;
  model.traverse(mesh => { if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
  const originalTriangles = triangles;
  const pieces = [...geometryByMesh.values()].flat();
  for (const piece of pieces) piece.seatOutline = seatOutline(piece);
  // Every component receives actual curved-edge subdivision, including large
  // sofa shells and every chair. No face-count cutoff leaves coarse props behind.
  let refinedPieces = 0;
  for (const piece of pieces) {
    const count = piece.faces.length / 3;
    if (rebuildSmoothPrimitive(piece)) {
      triangles += piece.faces.length / 3 - count;
      continue;
    }
    refine(piece, /foliage|Plant_stems/.test(piece.mesh.name) ? 0.035 : 0.018);
    triangles += count * 3; refinedPieces++;
  }
  let softenedPieces = 0;
  for (const piece of pieces) if (softenUpholstery(piece)) softenedPieces++;
  for (const [mesh, geometryPieces] of geometryByMesh) buildGeometry(mesh, geometryPieces);
  const welting = addSeatWelting(model, pieces);
  triangles += welting.triangles;

  const materials = new Map();
  model.traverse(mesh => {
    if (!mesh.isMesh || (!PROP.test(mesh.name) && !/^Terraces__|Lower_circular_room|Flush_top_tread/.test(mesh.name))) return;
    const source = mesh.material;
    if (!materials.has(source)) {
      const color = palette.find(([pattern]) => pattern.test(source.name))?.[1] ?? source.color;
      const material = new THREE.MeshPhysicalMaterial({
        name: source.name, color, roughness: 0.48, metalness: 0,
        specularIntensity: 0.65, clearcoat: 0.15, clearcoatRoughness: 0.25, sheen: 0.08, sheenRoughness: 0.8,
        sheenColor: color, envMapIntensity: 0.65, side: THREE.DoubleSide,
        emissive: source.emissive ?? '#000000', emissiveIntensity: Math.min(source.emissiveIntensity ?? 0, 0.65),
        polygonOffset: source.polygonOffset, polygonOffsetFactor: source.polygonOffsetFactor, polygonOffsetUnits: source.polygonOffsetUnits,
        ...surfaceFinish(source.name),
      });
      materials.set(source, material);
    }
    mesh.material = materials.get(source);
    mesh.material.flatShading = false;
  });
  // The source batches seat pads and tall sofa backs together. Per-component
  // colors keep their geometry intact while giving backrests the pale tone.
  model.traverse(mesh => {
    if (!mesh.isMesh || !/^Lounge_Pods__Terracotta_coral_upholstery/.test(mesh.name)) return;
    const coral = new THREE.Color(SPACE_COLORS.coral), pale = new THREE.Color(SPACE_COLORS.sculpture);
    const colors = new Float32Array(mesh.geometry.attributes.position.count * 3);
    for (const part of meshPieces(mesh)) {
      const color = part.size.y > 0.35 ? pale : coral;
      for (const i of part.vertices) color.toArray(colors, i * 3);
    }
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mesh.material = mesh.material.clone();
    mesh.material.color.set('#ffffff');
    mesh.material.vertexColors = true;
  });
  const detail = pieces.map(piece => ({ name: piece.mesh.name, sourceTriangles: piece.sourceTriangles, triangles: piece.faces.length / 3, passes: piece.passes, primitive: piece.primitive ?? null }));
  return { originalTriangles, triangles, refinedPieces, softenedPieces, welting, detail, beforeBounds, afterBounds: new THREE.Box3().setFromObject(model) };
}
