import { BufferGeometry, CylinderGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import type { ColorRepresentation, Material, Vector3Tuple } from 'three';
import { vintageMaterial } from './materials';
import type { Finish } from './materials';
import { AmbientField } from './ambientOcclusion';
import { BEVEL, bevelBox } from './bevel';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export class Kit {
  private materials = new Map<string, MeshStandardMaterial>();
  private boxes = new Map<string,BufferGeometry>();
  private boxCount = 0;
  readonly cylinder = new CylinderGeometry(1, 1, 1, 6);
  private boxGeometry(size: Vector3Tuple): BufferGeometry {
    const key=size.map(n=>n.toPrecision(12)).join(':');
    if(!this.boxes.has(key))this.boxes.set(key,bevelBox(size));
    this.boxCount++;return this.boxes.get(key)!;
  }
  mat(color: ColorRepresentation, extra:Finish|'' = ''): MeshStandardMaterial {
    const key = color + extra;
    if (!this.materials.has(key)) this.materials.set(key, vintageMaterial(color,extra||undefined));
    return this.materials.get(key)!;
  }
  box(parent: Group, size: Vector3Tuple, at: Vector3Tuple, color: ColorRepresentation, finish?:Finish): Mesh {
    const m = new Mesh(this.boxGeometry(size), this.mat(color,finish)); m.position.fromArray(at); parent.add(m); return m;
  }
  beam(parent: Group, a: Vector3Tuple, b: Vector3Tuple, width: number, color: ColorRepresentation, round = false): Mesh {
    const start = new Vector3(...a), end = new Vector3(...b), d = end.clone().sub(start);
    const m = new Mesh(round ? this.cylinder : this.boxGeometry([width,d.length(),width]), this.mat(color));
    m.position.copy(start.add(end).multiplyScalar(.5));
    if(round)m.scale.set(width, d.length(), width); m.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize())); parent.add(m); return m;
  }
  // Bake static geometry into one draw per material. Interactive chairs and animated equipment stay independent.
  batch(root: Group): void {
    const buckets = new Map<Material, BufferGeometry[]>();
    root.updateMatrixWorld(true);
    const inverse = new Matrix4().copy(root.matrixWorld).invert();
    const meshes: Mesh[] = [];
    root.traverse(n => { if (n instanceof Mesh && !n.userData.interaction && !n.userData.dynamic && !Array.isArray(n.material)) meshes.push(n); });
    const ambient=new AmbientField(root);
    for (const m of meshes) {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(new Matrix4().multiplyMatrices(inverse,m.matrixWorld));
      ambient.bake(g,m);
      const list = buckets.get(m.material as Material) ?? []; list.push(g); buckets.set(m.material as Material, list); m.removeFromParent();
    }
    for (const [material, parts] of buckets) {
      const merged = mergeGeometries(parts, false);
      if (merged) { const m = new Mesh(merged, material); m.name = 'static-batch'; m.updateMatrix(); m.matrixAutoUpdate=false; root.add(m); }
      parts.forEach(g => g.dispose());
    }
    // These shared primitive buffers are no longer referenced after static batching except by live objects.
    const used = new Set<BufferGeometry>(); root.traverse(n => { if (n instanceof Mesh) used.add(n.geometry); });
    const cached = new Set(this.boxes.values());
    for (const m of meshes) if (!cached.has(m.geometry) && m.geometry !== this.cylinder && !used.has(m.geometry)) { m.geometry.dispose(); used.add(m.geometry); }
  }
  finish(root: Group): void {
    const liveMaterials=new Set<Material>();root.traverse(n=>{if(n instanceof Mesh)for(const material of Array.isArray(n.material)?n.material:[n.material])liveMaterials.add(material);});
    for(const material of this.materials.values())if(!liveMaterials.has(material))material.dispose();
    this.materials.clear();
    const used=new Set<BufferGeometry>();root.traverse(n=>{if(n instanceof Mesh)used.add(n.geometry);});
    root.userData.bevel={segments:BEVEL.segments,maxWidth:BEVEL.maxWidth,boxes:this.boxCount,variants:this.boxes.size};
    for(const geometry of this.boxes.values())if(!used.has(geometry))geometry.dispose();
    if(!used.has(this.cylinder))this.cylinder.dispose();
    this.boxes.clear();
  }
}
