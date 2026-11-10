import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';
import { PlayerController } from '../src/engine/player/PlayerController';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { testWorldA } from '../src/worlds/test-world-a/config';

function player() {
  const player = new PlayerController(new PerspectiveCamera());
  player.spawn(testWorldA, new CollisionSystem({ floors: [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100, y: 0 }], solids: [] }));
  return player;
}

describe('shared movement', () => {
  it('preserves the existing first person inspection camera height between frames',()=>{const instance=player();instance.place(instance.feet,0,2.5);instance.updateCamera();expect(instance.camera.position.y).toBe(2.5);});
  it('normalizes diagonal movement', () => {
    const straight = player(); const diagonal = player();
    const origin = straight.rig.position.clone();
    straight.update({ right: 0, forward: 1 }, 0.05);
    diagonal.update({ right: 1, forward: 1 }, 0.05);
    expect(straight.rig.position.distanceTo(origin)).toBeCloseTo(diagonal.rig.position.distanceTo(origin));
  });
  it('limits tab-resume frame jumps', () => {
    const instance = player(); const origin = instance.rig.position.clone();
    instance.update({ right: 0, forward: 1 }, 4);
    expect(instance.rig.position.distanceTo(origin)).toBeCloseTo(0.15);
  });
  it('moves relative to yaw, with pitch independent of motion', () => {
    const instance = player(); const origin = instance.rig.position.clone();
    instance.rig.rotation.y = Math.PI / 2;
    instance.look(0, -100000);
    instance.update({ right: 0, forward: 1 }, 0.05);
    expect(instance.rig.position.x).toBeCloseTo(origin.x - 0.15);
    expect(instance.rig.position.y).toBe(0);
    expect(instance.camera.rotation.x).toBeLessThan(Math.PI / 2);
  });
  it('sets the configured spawn and restores eye height after XR', () => {
    const instance = player();
    instance.prepareXR(); expect(instance.camera.position.y).toBe(0);
    instance.camera.position.set(2, 2, 2);
    instance.restoreDesktopCamera();
    expect(instance.camera.position.toArray()).toEqual([0, 1.65, 0]);
    expect(instance.rig.position.toArray()).toEqual(testWorldA.spawn.position);
  });
  it('supports speed changes and disables movement on leave', () => {
    const instance = player(); instance.setSpeed(6);
    instance.update({ right: 1, forward: 0 }, 0.05);
    expect(instance.rig.position.x).toBeCloseTo(0.3);
    instance.clear(); instance.update({ right: 1, forward: 0 }, 0.05);
    expect(instance.rig.position.x).toBeCloseTo(0.3);
  });
});
