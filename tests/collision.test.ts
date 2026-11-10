import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';

const floor = { minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 0 };
const wall = new Box3(new Vector3(1, 0, -5), new Vector3(1.1, 3, 5));
const collision = new CollisionSystem({ floors: [floor], solids: [wall] });
const p = (x = 0, z = 0) => new Vector3(x, 0, z);

describe('flat-floor collision', () => {
  it('allows free movement and preserves foot height', () => {
    expect(collision.move(p(), p(-1, 2), 0.28, 1.75).toArray()).toEqual([-1, 0, 2]);
  });
  it('blocks thin walls even with a large displacement', () => {
    const result = collision.move(p(), p(8), 0.28, 1.75);
    expect(result.x).toBeLessThanOrEqual(0.72);
    expect(result.x).toBeGreaterThan(0.5);
  });
  it('slides along the wall rather than blocking both axes', () => {
    const result = collision.move(p(0.7), p(1, 1), 0.28, 1.75);
    expect(result.x).toBeCloseTo(0.7);
    expect(result.z).toBeCloseTo(1);
  });
  it('keeps the complete player footprint on the floor', () => {
    const result = collision.move(p(-9), p(-5), 0.28, 1.75);
    expect(result.x).toBeGreaterThanOrEqual(-9.72);
    expect(collision.canStand(p(-9.8), 0.28, 1.75)).toBe(false);
  });
  it('does not cross a gap or walk onto another floor height', () => {
    const system = new CollisionSystem({ floors: [
      { ...floor, maxX: 0 }, { ...floor, minX: 1 },
    ], solids: [] });
    expect(system.move(p(-1), p(4), 0.28, 1.75).x).toBeLessThan(0);
    expect(system.canStand(new Vector3(-1, 2, 0), 0.28, 1.75)).toBe(false);
  });
  it('ignores overhead obstacles with adequate clearance', () => {
    const system = new CollisionSystem({ floors: [floor], solids: [new Box3(new Vector3(-2, 3, -2), new Vector3(2, 4, 2))] });
    expect(system.canStand(p(), 0.28, 1.75)).toBe(true);
  });
});
