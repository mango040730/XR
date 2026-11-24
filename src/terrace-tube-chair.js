import * as THREE from 'three';
import { createGlossDeskMaterial } from './terrace-pill-desk.js';
import { createRoundChairDisc } from './terrace-rounded-chair.js';

export const TUBE_CUSHION_COLOR = '#A5BCD5';

function cloth() {
  const data = new Uint8Array(128 * 128 * 4);
  let state = 42179;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = 110 + Math.sin(x * Math.PI / 2) * 26 + Math.cos(y * Math.PI / 2) * 18 + (state >>> 28);
    data.set([value, value, value, 255], (y * 128 + x) * 4);
  }
  const weave = new THREE.DataTexture(data, 128, 128);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(5, 5);
  weave.magFilter = THREE.LinearFilter; weave.minFilter = THREE.LinearMipmapLinearFilter;
  weave.generateMipmaps = true; weave.needsUpdate = true;
  const material = new THREE.MeshPhysicalMaterial({ name: 'Terrace pastel blue woven cushion', color: TUBE_CUSHION_COLOR,
    roughness: 0.92, metalness: 0, clearcoat: 0, sheen: 0.4, sheenColor: TUBE_CUSHION_COLOR,
    sheenRoughness: 0.85, specularIntensity: 0.25, bumpMap: weave, bumpScale: 0.0015 });
  material.userData.terraceChair = true; material.userData.terraceChairBatch = 'Terrace_tube_cushions';
  return material;
}

export function createTubeChairTemplate() {
  const frame = createGlossDeskMaterial(); frame.name = 'Terrace golden tubular frame';
  delete frame.userData.terraceDesk; frame.userData.terraceChair = true;
  frame.userData.terraceChairBatch = 'Terrace_tube_frames';
  const cushion = cloth(), parts = [];
  const add = (geometry, material = frame) => parts.push({ geometry, material });
  // Four slim posts; the two rear legs rise continuously to the curved rail.
  for (const x of [-0.212, 0.212]) for (const rear of [false, true]) {
    const height = rear ? 0.78 : 0.41;
    const geometry = new THREE.CapsuleGeometry(0.014, height - 0.028, 6, 20);
    geometry.translate(x, height / 2, rear ? 0.145 : -0.17); add(geometry);
  }
  add(createRoundChairDisc(0.258, 0.375, 0.053, 0.008));
  add(createRoundChairDisc(0.252, 0.423, 0.027, 0.012), cushion);
  const railRadius = Math.hypot(0.212, 0.145), half = Math.PI * 0.52;
  const points = Array.from({ length: 65 }, (_, i) => {
    const a = -half + i / 64 * half * 2;
    return new THREE.Vector3(Math.sin(a) * railRadius, 0.78, Math.cos(a) * railRadius);
  });
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.020, 20, false));
  for (const point of [points[0], points.at(-1)]) {
    const cap = new THREE.SphereGeometry(0.020, 20, 12); cap.translate(...point.toArray()); add(cap);
  }
  return parts;
}
