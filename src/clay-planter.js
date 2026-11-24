import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// One watertight ceramic shell: rounded exterior, thin rolled lip, inner wall
// and recessed inner floor. There is deliberately no cap across the opening.
export function hollowPlanterGeometry(width, depth, height, thickness) {
  const a = width / 2, b = depth / 2, t = thickness, bottom = Math.min(0.05, height * 0.18);
  const round = Math.min(0.06, height * 0.3), profile = [[0, 0, 0], [a * 0.94, b * 0.94, 0]];
  for (let i = 1; i <= 12; i++) {
    const angle = i / 12 * Math.PI / 2;
    profile.push([a * (0.94 + 0.06 * Math.sin(angle)), b * (0.94 + 0.06 * Math.sin(angle)), round * (1 - Math.cos(angle))]);
  }
  profile.push([a, b, height - t / 2]);
  for (let i = 1; i <= 16; i++) {
    const angle = i / 16 * Math.PI;
    profile.push([a - t / 2 + Math.cos(angle) * t / 2, b - t / 2 + Math.cos(angle) * t / 2,
      height - t / 2 + Math.sin(angle) * t / 2]);
  }
  profile.push([a - t, b - t, bottom + t]);
  for (let i = 1; i <= 12; i++) {
    const angle = i / 12 * Math.PI / 2;
    profile.push([a - t * 2 + Math.cos(angle) * t, b - t * 2 + Math.cos(angle) * t,
      bottom + t - Math.sin(angle) * t]);
  }
  profile.push([0, 0, bottom]);
  const positions = [], indices = [], segments = 96;
  for (const [rx, rz, y] of profile) for (let j = 0; j <= segments; j++) {
    const angle = j / segments * Math.PI * 2;
    positions.push(rx * Math.sin(angle), y, rz * Math.cos(angle));
  }
  for (let i = 1; i < profile.length; i++) for (let j = 0; j < segments; j++) {
    const a0 = (i - 1) * (segments + 1) + j, b0 = a0 + 1, d0 = i * (segments + 1) + j, c0 = d0 + 1;
    indices.push(a0, b0, c0, a0, c0, d0);
  }
  const source = new BufferGeometry();
  source.setAttribute('position', new Float32BufferAttribute(positions, 3)); source.setIndex(indices);
  const geometry = mergeVertices(source, 0.000001); source.dispose();
  geometry.computeVertexNormals(); return geometry;
}
