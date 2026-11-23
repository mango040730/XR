import * as THREE from 'three';

// Reconstruct small rounded objects rather than preserving the corners of
// their coarse source cages. The caller restores each original world envelope.
export function rebuildSmoothPrimitive(piece) {
  const name = piece.mesh.material.name;
  const size = piece.bounds.getSize(new THREE.Vector3());
  let geometry, kind;
  if (/River pebble/.test(name)) {
    geometry = new THREE.SphereGeometry(1, 32, 16);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const softVariation = 1 + 0.035 * x * z + 0.025 * y * x;
      p.setXYZ(i, x * softVariation, y * softVariation, z * softVariation);
    }
    kind = 'pebble';
  } else {
    const wood = /^Cafe_Furniture__/.test(piece.mesh.name) && /Golden oak|Terrace chair .* frame/.test(name);
    const stem = /^Planting__/.test(piece.mesh.name) && /Plant stems/.test(name);
    if ((!wood && !stem) || size.y < 0.25 || size.y < Math.max(size.x, size.z) * 2) return false;
    const center = piece.bounds.getCenter(new THREE.Vector3());
    let yy = 0, xy = 0, zy = 0;
    for (const v of piece.vertices) {
      const y = v.y - center.y;
      yy += y * y; xy += (v.x - center.x) * y; zy += (v.z - center.z) * y;
    }
    const axis = new THREE.Vector3(xy / yy, 1, zy / yy).normalize();
    const length = size.y / axis.y;
    let radius = 0;
    for (const v of piece.vertices) {
      const d = v.clone().sub(center);
      radius = Math.max(radius, d.addScaledVector(axis, -d.dot(axis)).length());
    }
    radius *= 0.8;
    const bevel = Math.min(radius * 0.18, 0.008);
    const bottomRadius = radius * (wood ? 0.88 : 1);
    const topRadius = radius * (wood ? 1 : 0.82);
    const profile = [new THREE.Vector2(0, -length / 2), new THREE.Vector2(bottomRadius - bevel, -length / 2)];
    for (let i = 1; i <= 3; i++) {
      const t = i * Math.PI / 6;
      profile.push(new THREE.Vector2(bottomRadius - bevel + bevel * Math.sin(t), -length / 2 + bevel * (1 - Math.cos(t))));
    }
    profile.push(new THREE.Vector2(topRadius, length / 2 - bevel));
    for (let i = 1; i <= 3; i++) {
      const t = i * Math.PI / 6;
      profile.push(new THREE.Vector2(topRadius - bevel + bevel * Math.cos(t), length / 2 - bevel + bevel * Math.sin(t)));
    }
    profile.push(new THREE.Vector2(0, length / 2));
    geometry = new THREE.LatheGeometry(profile, 32);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis));
    kind = wood ? 'furniture-leg' : 'plant-stem';
  }
  const p = geometry.attributes.position, vertices = [], remap = [], weld = new Map();
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const key = `${Math.round(v.x * 1e5)},${Math.round(v.y * 1e5)},${Math.round(v.z * 1e5)}`;
    if (!weld.has(key)) { weld.set(key, vertices.length); vertices.push(v); }
    remap.push(weld.get(key));
  }
  const faces = [];
  for (let i = 0; i < geometry.index.count; i += 3) {
    const a = remap[geometry.index.getX(i)], b = remap[geometry.index.getX(i + 1)], c = remap[geometry.index.getX(i + 2)];
    if (a !== b && b !== c && c !== a) faces.push(a, b, c);
  }
  geometry.dispose();
  piece.vertices = vertices; piece.faces = faces; piece.primitive = kind;
  return true;
}
