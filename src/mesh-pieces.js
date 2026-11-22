import * as THREE from 'three';

// The supplied GLB batches chairs, table legs and tabletops by material rather
// than by object. Recover connected pieces without changing their dimensions.
export function meshPieces(mesh) {
  const geometry = mesh.geometry, p = geometry.attributes.position;
  const parents = Uint32Array.from({ length: p.count }, (_, i) => i);
  function root(i) {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  }
  function join(a, b) { parents[root(a)] = root(b); }
  const seams = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 10000)},${Math.round(p.getY(i) * 10000)},${Math.round(p.getZ(i) * 10000)}`;
    if (seams.has(key)) join(i, seams.get(key)); else seams.set(key, i);
  }
  const index = geometry.index;
  for (let i = 0, count = index?.count ?? p.count; i < count; i += 3) {
    const a = index ? index.getX(i) : i;
    join(a, index ? index.getX(i + 1) : i + 1);
    join(a, index ? index.getX(i + 2) : i + 2);
  }
  const groups = new Map();
  for (let i = 0; i < p.count; i++) {
    const id = root(i);
    if (!groups.has(id)) groups.set(id, { mesh, vertices: [], faces: [], bounds: new THREE.Box3() });
    const piece = groups.get(id);
    piece.vertices.push(i);
    piece.bounds.expandByPoint(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
  }
  for (let i = 0, count = index?.count ?? p.count; i < count; i += 3) {
    const a = index ? index.getX(i) : i;
    groups.get(root(a)).faces.push(a, index ? index.getX(i + 1) : i + 1, index ? index.getX(i + 2) : i + 2);
  }
  return [...groups.values()].map(piece => ({
    ...piece, center: piece.bounds.getCenter(new THREE.Vector3()), size: piece.bounds.getSize(new THREE.Vector3()),
  }));
}

export function applyPieces(mesh, pieces) {
  const original = mesh.geometry;
  const geometry = new THREE.BufferGeometry();
  const indices = [], used = new Map(), sourceIndices = [];
  for (const piece of pieces) {
    if (piece.remove) continue;
    for (const old of piece.faces) {
      if (!used.has(old)) { used.set(old, used.size); sourceIndices.push(old); }
      indices.push(used.get(old));
    }
  }
  if (!indices.length) { mesh.removeFromParent(); return; }
  for (const [name, attr] of Object.entries(original.attributes)) {
    const data = new Float32Array(sourceIndices.length * attr.itemSize);
    sourceIndices.forEach((old, i) => {
      for (let j = 0; j < attr.itemSize; j++) data[i * attr.itemSize + j] = attr.array[old * attr.itemSize + j];
    });
    geometry.setAttribute(name, new THREE.BufferAttribute(data, attr.itemSize, attr.normalized));
  }
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  mesh.geometry = geometry;
  original.dispose();
}
