import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, DataTexture, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { modes } from '../src/data/demo';
import { worlds } from '../src/worlds/registry';
import { woodworking } from '../src/worlds/woodworking/config';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { disposeObject } from '../src/engine/assets/disposeObject';
import { buildScene, resources, sceneNode } from '../src/worlds/woodworking/design/runtime';

describe('woodworking mode and world ownership', () => {
  it('routes solo to woodworking and social to the existing fishing world', () => {
    expect(modes.find(m => m.id === 'solo')?.world).toBe('woodworking');
    expect(modes.find(m => m.id === 'social')?.world).toBe('indoor-fishing');
    expect(worlds.find(w => w.id === 'woodworking')).toBe(woodworking);
  });
  it('keeps the spawn and aisle walkable and stops movement at the authored tables and walls', () => {
    const collision = new CollisionSystem({ floors: [{ minX: -8, maxX: 8, minZ: -7, maxZ: 7, y: 0 }], solids: woodworking.boxes.map(b => new Box3().setFromCenterAndSize(new Vector3(...b.position), new Vector3(...b.size))) });
    expect(collision.canStand(new Vector3(...woodworking.spawn.position), .25, 1.75)).toBe(true);
    expect(collision.canStand(new Vector3(0, 0, .2), .25, 1.75)).toBe(true);
    expect(collision.canStand(new Vector3(-3.45, 0, .2), .25, 1.75)).toBe(false);
    expect(collision.move(new Vector3(0, 0, .2), new Vector3(-5, 0, 0), .25, 1.75).x).toBeGreaterThanOrEqual(-1.6);
    expect(collision.move(new Vector3(0, 0, 3), new Vector3(20, 0, 0), .25, 1.75).x).toBeLessThan(7.8);
  });
  it('batches static pieces and gives each world independent resources with idempotent disposal', () => {
    const make = () => {
      const root = new Group(); const texture = new DataTexture(); const material = new MeshStandardMaterial({ map: texture });
      const geometry = new BoxGeometry(); let retired = 0, texturesDisposed = 0;
      geometry.addEventListener('dispose', () => retired++); texture.addEventListener('dispose', () => texturesDisposed++);
      buildScene(root, () => sceneNode('group', {}, sceneNode('mesh', { geometry, material, position: [-1, 0, 0] }), sceneNode('mesh', { geometry, material, position: [1, 0, 0] })));
      return { root, texture, material, retired, disposed: () => texturesDisposed };
    };
    const a = make(), b = make(); const meshes: Mesh[] = [];
    a.root.traverse(o => { if (o instanceof Mesh) meshes.push(o); });
    expect(meshes).toHaveLength(1); expect(a.retired).toBe(1); expect(a.material).not.toBe(b.material);
    expect(new Box3().setFromObject(a.root).max.x).toBe(1.5);
    disposeObject(a.root); disposeObject(a.root); expect(a.disposed()).toBe(1); expect(b.disposed()).toBe(0);
    disposeObject(b.root); expect(b.disposed()).toBe(1); expect(() => resources()).toThrow();
  });
  it('releases unattached assets after a failed construction and clears its scope', () => {
    const root = new Group(), texture = new DataTexture(), material = new MeshStandardMaterial({ map: texture }), geometry = new BoxGeometry();
    let count = 0; texture.addEventListener('dispose', () => count++);
    expect(() => buildScene(root, () => { sceneNode('mesh', { geometry, material }); throw new Error('cancelled'); })).toThrow('cancelled');
    expect(count).toBe(1); expect(() => resources()).toThrow();
    buildScene(root, () => sceneNode('group', {})); expect(root.children).toHaveLength(1); disposeObject(root);
  });
});

describe('attached atelier GLB material ownership',()=>{
 it('clones all owned GPU resources and restores authored normal and shadow flags without changing the template',async()=>{
  const {cloneAtelierModel}=await import('../src/worlds/woodworking/model');
  const texture=new DataTexture(),material=new MeshStandardMaterial({map:texture,normalMap:texture,roughness:.71,metalness:.08,transparent:true,opacity:.6});
  material.normalScale.set(1,-1);material.userData.atelierRender={normalScale:[1,1],depthWrite:false,flatShading:true};
  const mesh=new Mesh(new BoxGeometry(),material);mesh.userData.atelierShadow={cast:false,receive:true};const source=new Group();source.add(mesh);
  const a=cloneAtelierModel(source).children[0] as Mesh<BoxGeometry,MeshStandardMaterial>,b=cloneAtelierModel(source).children[0] as Mesh;
  expect(a.geometry).not.toBe(mesh.geometry);expect(a.material).not.toBe(material);expect(a.material.map).not.toBe(texture);expect(a.material.normalMap).toBe(a.material.map);expect(a.geometry).not.toBe(b.geometry);
  expect(a.material.roughness).toBe(.71);expect(a.material.opacity).toBe(.6);expect(a.material.normalScale.toArray()).toEqual([1,1]);expect(material.normalScale.toArray()).toEqual([1,-1]);expect(a.castShadow).toBe(false);expect(a.receiveShadow).toBe(true);
  let released=0;texture.addEventListener('dispose',()=>released++);disposeObject(a);expect(released).toBe(0);disposeObject(b);disposeObject(source);expect(released).toBe(1);
 });
});
