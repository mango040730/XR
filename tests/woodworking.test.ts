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
