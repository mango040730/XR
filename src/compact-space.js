import * as THREE from 'three';
import { meshPieces } from './mesh-pieces.js';
import { captureChair, buildMixedSeating } from './mixed-seating.js';
import { createJoinedStairs, stairAlignedRing, colorJoinedStairs } from './joined-stairs.js';
import { createDigitalWall } from './digital-wall.js';
import { createCentralPlatform } from './central-room.js';
import { applyClayStyle } from './clay-style.js';
import { createGatheringFurniture, planter, batchClayProps } from './clay-gatherings.js';
import { GATHERING_LAYOUT as L } from './gathering-layout.js';
import { SPACE_COLORS as C } from './space-colors.js';

function sourceChair(model) {
  const pieces = [];
  model.traverse(mesh => { if (mesh.isMesh && /^Cafe_Furniture__/.test(mesh.name)) pieces.push(...meshPieces(mesh)); });
  const cushion = pieces.find(p => Math.abs(p.center.y - 2.49) < 0.015 && Math.abs(p.size.y - 0.11) < 0.015 && p.center.length() > 23);
  if (!cushion) throw new Error('원본 의자 템플릿을 찾지 못했습니다.');
  const distance = p => Math.hypot(p.center.x - cushion.center.x, p.center.z - cushion.center.z);
  const back = pieces.filter(p => Math.abs(p.center.y - 2.9) < 0.015 && Math.abs(p.size.y - 0.38) < 0.015).sort((a, b) => distance(a) - distance(b))[0];
  const parts = pieces.filter(p => p.bounds.min.y >= 1.99 - 0.001 && distance(p) < 0.65
    && [0.11, 0.38, 0.466, 0.584].some(h => Math.abs(p.size.y - h) < 0.015));
  if (parts.length !== 8) throw new Error('원본 의자 부품을 온전히 추출하지 못했습니다.');
  const template = captureChair({ center: cushion.center, facing: cushion.center.clone().sub(back.center).setY(0).normalize(), parts });
  return template.map(part => ({ ...part, material: part.material.clone() }));
}

function circularFloor(radius, angles) {
  const positions = [0, L.floorY, 0], uv = [0.5, 0.5], normals = [0, 1, 0], indices = [];
  for (const angle of angles) {
    const x = Math.round(radius * Math.cos(angle) * 1e7) / 1e7, z = Math.round(radius * Math.sin(angle) * 1e7) / 1e7;
    positions.push(x, L.floorY, z); uv.push(x / (radius * 2) + 0.5, z / (radius * 2) + 0.5); normals.push(0, 1, 0);
  }
  for (let i = 0; i < angles.length - 1; i++) indices.push(0, i + 2, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); return geometry;
}

// Keep archived GLBs untouched. Build the compact, capacity-limited version from
// genuinely curved geometry, retaining the source's outer chair design.
export function prepareGatheringSpace(model) {
  const chairTemplate = sourceChair(model);
  const oldMeshes = [], oldMaterials = new Set();
  model.traverse(mesh => {
    if (!mesh.isMesh) return; oldMeshes.push(mesh);
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) oldMaterials.add(mat);
  });
  model.clear(); oldMeshes.forEach(mesh => mesh.geometry.dispose()); oldMaterials.forEach(mat => mat.dispose());
  const floorMaterial = new THREE.MeshPhysicalMaterial({ name: 'Compact peach floor', color: C.floor, roughness: 0.75, clearcoat: 0.05 });
  const gray = new THREE.MeshPhysicalMaterial({ name: 'Compact light gray steps', color: C.stairs, roughness: 0.74 });
  const stairs = createJoinedStairs(model, { inner: L.centralRadius, outer: L.terraceOuter, floorY: L.floorY, topY: L.pathY, material: gray, stepCount: L.stepCount });
  const angles = stairs.userData.boundaryAngles;
  const pixels = new Uint8Array(128 * 128 * 4);
  let seed = 71629;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 95 + (seed >>> 26); pixels.set([value, value, value, 255], i);
  }
  const pile = new THREE.DataTexture(pixels, 128, 128); pile.wrapS = pile.wrapT = THREE.RepeatWrapping;
  pile.repeat.set(80, 80); pile.magFilter = pile.minFilter = THREE.LinearFilter; pile.needsUpdate = true;
  const velvet = new THREE.MeshPhysicalMaterial({ name: 'Compact blue velvet', color: C.rail, roughness: 0.97,
    sheen: 1, sheenColor: '#4266b2', sheenRoughness: 0.85, specularIntensity: 0.15, bumpMap: pile, bumpScale: 0.0015, side: THREE.DoubleSide });
  const carpetGeometry = stairAlignedRing(L.terraceOuter, L.outerRadius, angles); carpetGeometry.translate(0, L.pathY, 0);
  const carpet = new THREE.Mesh(carpetGeometry, velvet); carpet.name = 'Blue_velvet_carpet'; carpet.userData.walkable = true; model.add(carpet);
  const interior = new THREE.Mesh(circularFloor(L.centralRadius, angles), floorMaterial); interior.name = 'Compact_lower_circular_room'; interior.userData.walkable = true; model.add(interior);
  const platform = createCentralPlatform(model, { radius: L.centralRadius, scale: L.floorScale });
  platform.material[0].dispose(); platform.material[0] = floorMaterial;
  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(L.outerRadius, L.outerRadius, L.pathY + 0.8, 512, 1, true), velvet);
  foundation.name = 'Compact_blue_plinth'; foundation.position.y = (L.pathY - 0.8) / 2; model.add(foundation);
  const tiers = Array.from({ length: 3 }, (_, i) => ({ inner: L.centralRadius + L.tierDepth * i, outer: L.centralRadius + L.tierDepth * (i + 1), height: L.floorY + (L.pathY - L.floorY) * (i + 1) / 3 }));
  const mixed = buildMixedSeating(model, chairTemplate, [], { tiers, chairOffset: 1.1 });
  const clay = applyClayStyle(model);
  colorJoinedStairs(stairs, { upperInner: L.terraceOuter - L.tierDepth, topY: L.pathY, gray: C.stairs, railMaterial: velvet, railOuterRadius: L.outerRadius });
  const digitalWall = createDigitalWall(model, L.outerRadius, L.pathY, carpet, L.screenHeight);
  const furniture = createGatheringFurniture(model);
  const outerPlants = [];
  for (const angle of [Math.PI / 4, Math.PI * 0.92, Math.PI * 1.56]) {
    const root = new THREE.Group(); root.name = 'Clay_blue_lane_planter';
    planter(root, 1.9, 0.78, 0, 0, 0, 1.35); batchClayProps(root);
    root.position.set(Math.cos(angle) * 22.5, L.pathY, Math.sin(angle) * 22.5); root.rotation.y = -angle - Math.PI / 2;
    model.add(root); outerPlants.push(root);
  }
  model.traverse(mesh => { if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = mesh.userData.surface !== 'digital-screen'; } });
  model.updateMatrixWorld(true);
  return { carpet, interior, platform, stairs, tiers, seating: mixed, clay, digitalWall, furniture, outerPlants, layout: L };
}
