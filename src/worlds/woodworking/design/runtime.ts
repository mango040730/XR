import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Attachment = THREE.BufferGeometry | THREE.Material;
type Owned = Attachment | THREE.Texture;
export type SceneChild = THREE.Object3D | Attachment | SceneChild[] | null | undefined | boolean;
interface Resources {
  geometries: Map<string, THREE.BufferGeometry>;
  materials: Map<string, THREE.MeshStandardMaterial>;
  grain?: THREE.CanvasTexture;
  surface?: { normalMap: THREE.DataTexture; roughnessMap: THREE.DataTexture };
  owned: Set<Owned>;
}
// A synchronous construction scope, cleared in finally. Assets never outlive their world root.
let scope: Resources | undefined;
export function resources(): Resources {
  if (!scope) throw new Error('목공방 자원은 월드 생성 중에만 접근할 수 있습니다.');
  return scope;
}
export function buildValue<T>(factory: () => T, dependencies: unknown[]): T { void dependencies; const value = factory(); if (value instanceof THREE.BufferGeometry || value instanceof THREE.Material || value instanceof THREE.Texture) resources().owned.add(value); return value; }
export function buildQuality(): string { return 'balanced'; }

function flatten(children: SceneChild[]): Array<THREE.Object3D | Attachment> {
  const result: Array<THREE.Object3D | Attachment> = [];
  for (const child of children) { if (Array.isArray(child)) result.push(...flatten(child)); else if (child instanceof THREE.Object3D || child instanceof THREE.BufferGeometry || child instanceof THREE.Material) result.push(child); }
  return result;
}
function assign(target: object, key: string, value: unknown): void {
  if (value === undefined || key === 'key' || key === 'children' || key === 'args' || key === 'object') return;
  const parts = key.split('-');
  const object = target as Record<string, unknown>;
  if (parts.length > 1) {
    const child = object[parts.shift()!];
    if (!child || typeof child !== 'object') throw new Error(`잘못된 목공방 속성: ${key}`);
    assign(child, parts.join('-'), value); return;
  }
  const current = object[key];
  if (current instanceof THREE.Color) current.set(value as THREE.ColorRepresentation);
  else if (current instanceof THREE.Vector2 && Array.isArray(value)) current.fromArray(value);
  else if (current instanceof THREE.Vector3 && Array.isArray(value)) current.fromArray(value);
  else if (current instanceof THREE.Vector3 && typeof value === 'number') current.setScalar(value);
  else if (current instanceof THREE.Euler && Array.isArray(value)) current.set(value[0], value[1], value[2]);
  else if (current instanceof THREE.Quaternion && Array.isArray(value)) current.fromArray(value);
  else object[key] = value;
}
function geometry(tag: string, args: number[]): THREE.BufferGeometry | undefined {
  switch (tag) {
    case 'planeGeometry': return new THREE.PlaneGeometry(...args);
    case 'cylinderGeometry': return new THREE.CylinderGeometry(...args);
    case 'coneGeometry': return new THREE.ConeGeometry(...args);
    case 'circleGeometry': return new THREE.CircleGeometry(...args);
    case 'torusGeometry': return new THREE.TorusGeometry(...args);
    case 'ringGeometry': return new THREE.RingGeometry(...args);
    case 'sphereGeometry': return new THREE.SphereGeometry(...args);
  }
}
export function sceneNode(type: unknown, props: Record<string, unknown> | null, ...children: SceneChild[]): SceneChild {
  const p = props ?? {};
  if (typeof type === 'function') return (type as (props: Record<string, unknown>) => SceneChild)({ ...p, children });
  if (typeof type !== 'string') throw new Error('알 수 없는 목공방 노드');
  const args = (p.args ?? []) as number[];
  const geo = geometry(type, args);
  if (geo) { resources().owned.add(geo); return geo; }
  if (type === 'meshStandardMaterial' || type === 'meshPhysicalMaterial') {
    const material = type === 'meshPhysicalMaterial' ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
    for (const [key, value] of Object.entries(p)) assign(material, key, value);
    resources().owned.add(material); return material;
  }
  const flat = flatten(children);
  let object: THREE.Object3D;
  switch (type) {
    case 'group': object = new THREE.Group(); break;
    case 'primitive': object = p.object as THREE.Object3D; break;
    case 'mesh': {
      const g = (p.geometry ?? flat.find(c => c instanceof THREE.BufferGeometry)) as THREE.BufferGeometry | undefined;
      const m = (p.material ?? flat.find(c => c instanceof THREE.Material)) as THREE.Material | undefined;
      if (!g || !m) throw new Error('목공방 메시의 지오메트리 또는 재질이 없습니다.');
      object = new THREE.Mesh(g, m); break;
    }
    case 'ambientLight': object = new THREE.AmbientLight(); break;
    case 'hemisphereLight': object = new THREE.HemisphereLight(...args); break;
    case 'directionalLight': object = new THREE.DirectionalLight(); break;
    case 'pointLight': object = new THREE.PointLight(); break;
    case 'spotLight': object = new THREE.SpotLight(); break;
    case 'rectAreaLight': object = new THREE.RectAreaLight(); break;
    default: throw new Error(`지원하지 않는 목공방 노드: ${type}`);
  }
  for (const [key, value] of Object.entries(p)) assign(object, key, value);
  for (const child of flat) {
    if (child instanceof THREE.Object3D) object.add(child);
    else resources().owned.add(child);
  }
  if (object instanceof THREE.Mesh) {
    resources().owned.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources().owned.add(material);
  }
  return object;
}

/** Merge opaque static pieces by material and shadow flags; preserve named architectural meshes. */
function batch(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent || object.name) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    const list = groups.get(key) ?? []; list.push(object); groups.set(key, list);
  });
  const inverse = root.matrixWorld.clone().invert();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    // Keep differing attribute layouts separate (wood, vertex-colour foliage, extrusions).
    const layouts = new Map<string, THREE.Mesh[]>();
    for (const mesh of list) {
      const key = Object.keys(mesh.geometry.attributes).sort().join(',');
      const group = layouts.get(key) ?? []; group.push(mesh); layouts.set(key, group);
    }
    for (const meshes of layouts.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(mesh => {
        const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        g.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)); return g;
      });
      const merged = mergeGeometries(parts); parts.forEach(g => g.dispose());
      if (!merged) throw new Error('목공방 정적 메시 병합 실패');
      const first = meshes[0], combined = new THREE.Mesh(merged, first.material);
      combined.name = 'woodworking-static-batch'; combined.castShadow = first.castShadow; combined.receiveShadow = first.receiveShadow;
      root.add(combined); resources().owned.add(merged);
      meshes.forEach(mesh => mesh.removeFromParent());
    }
  }
}
export function buildScene(root: THREE.Group, construct: () => SceneChild): void {
  if (scope) throw new Error('중첩된 목공방 생성은 지원하지 않습니다.');
  const current: Resources = { geometries: new Map(), materials: new Map(), owned: new Set() };
  scope = current;
  try {
    const result = construct();
    for (const child of flatten([result])) if (child instanceof THREE.Object3D) root.add(child);
    batch(root);
  } finally {
    // Root disposal owns attached assets; release construction-only geometries/materials now.
    const retained = new Set<Owned>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      retained.add(object.geometry);
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) { retained.add(m); for (const value of Object.values(m)) if (value instanceof THREE.Texture) retained.add(value); }
    });
    for (const g of current.geometries.values()) current.owned.add(g);
    for (const m of current.materials.values()) current.owned.add(m);
    if (current.grain) current.owned.add(current.grain);
    if (current.surface) for (const texture of Object.values(current.surface)) current.owned.add(texture);
    for (const asset of current.owned) if (asset instanceof THREE.Material) for (const value of Object.values(asset)) if (value instanceof THREE.Texture) current.owned.add(value);
    for (const asset of current.owned) if (!retained.has(asset)) asset.dispose();
    scope = undefined;
  }
}
