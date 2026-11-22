import * as THREE from 'three';
import { meshPieces } from './mesh-pieces.js';

export const CLAY_TRIANGLE_BUDGET = 900000;
const PROP = /^(Planting|Cafe_Furniture|Lounge_Pods|Luminaires)__/;
const palette = [
  [/Warm ivory/, '#ede6d8'], [/Terracotta coral/, '#d78f7b'], [/Coral cushion/, '#e3a18e'],
  [/Cobalt fabric/, '#66859b'], [/Sunflower/, '#dfbc7d'], [/Tangerine/, '#d7a06e'],
  [/Honey yellow/, '#cfa879'], [/Golden oak/, '#bd956b'], [/Sofa recessed/, '#b5a38d'],
  [/River pebble warm/, '#b6a58f'], [/River pebble grey/, '#9ca797'],
  [/Forest foliage/, '#59785e'], [/Sage foliage/, '#8c9f7e'], [/Fresh yellow green/, '#a5b27f'],
  [/Plant stems/, '#687452'], [/Planter dark soil/, '#62503e'],
  [/Porcelain and sign/, '#eee7db'], [/Cream porcelain/, '#e6e1d8'], [/Warm grey terrace/, '#d5d2c9'],
  [/Opal lamp/, '#f5eee1'],
];

function normals(vertices, faces) {
  const out = vertices.map(() => new THREE.Vector3());
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i], b = faces[i + 1], c = faces[i + 2];
    ab.subVectors(vertices[b], vertices[a]); ac.subVectors(vertices[c], vertices[a]);
    normal.crossVectors(ab, ac);
    out[a].add(normal); out[b].add(normal); out[c].add(normal);
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
  return { vertices, faces: piece.faces.map(i => remap.get(i)), bounds: piece.bounds, mesh: piece.mesh, refined: false };
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
    const id = vertices.length; vertices.push(v); edgeMap.set(key, id);
    return id;
  }
  for (let i = 0; i < piece.faces.length; i += 3) {
    const a = piece.faces[i], b = piece.faces[i + 1], c = piece.faces[i + 2];
    const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
    faces.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  piece.faces = faces;
  piece.refined = true;
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
  let refinedPieces = 0;
  for (const piece of pieces) {
    const count = piece.faces.length / 3;
    if (count > 256 || triangles + count * 3 > CLAY_TRIANGLE_BUDGET) continue;
    refine(piece, /foliage|Plant_stems/.test(piece.mesh.name) ? 0.035 : 0.018);
    triangles += count * 3; refinedPieces++;
  }
  for (const piece of pieces) {
    const count = piece.faces.length / 3;
    if (!/foliage|Plant_stems/.test(piece.mesh.name) || count > 512 || triangles + count * 3 > CLAY_TRIANGLE_BUDGET) continue;
    refine(piece, 0.018); triangles += count * 3;
  }
  for (const [mesh, geometryPieces] of geometryByMesh) buildGeometry(mesh, geometryPieces);

  const materials = new Map();
  model.traverse(mesh => {
    if (!mesh.isMesh || (!PROP.test(mesh.name) && !/^Terraces__|Lower_circular_room|Flush_top_tread/.test(mesh.name))) return;
    const source = mesh.material;
    if (!materials.has(source)) {
      const color = palette.find(([pattern]) => pattern.test(source.name))?.[1] ?? source.color;
      const material = new THREE.MeshPhysicalMaterial({
        name: source.name, color, roughness: 0.88, metalness: 0,
        specularIntensity: 0.22, clearcoat: 0, sheen: 0.12, sheenRoughness: 0.95,
        sheenColor: color, envMapIntensity: 0.22, side: THREE.DoubleSide,
        emissive: source.emissive ?? '#000000', emissiveIntensity: Math.min(source.emissiveIntensity ?? 0, 0.65),
        polygonOffset: source.polygonOffset, polygonOffsetFactor: source.polygonOffsetFactor, polygonOffsetUnits: source.polygonOffsetUnits,
      });
      materials.set(source, material);
    }
    mesh.material = materials.get(source);
    mesh.material.flatShading = false;
  });
  return { originalTriangles, triangles, refinedPieces, beforeBounds, afterBounds: new THREE.Box3().setFromObject(model) };
}
