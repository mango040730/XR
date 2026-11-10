import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Quaternion, Ray, Vector3 } from 'three';
import { XRInputMapper } from '../src/engine/input/XRInput';
import type { ControllerSample } from '../src/engine/input/XRInput';
import { DEFAULT_XR_SETTINGS, xrSettings } from '../src/engine/xr/settings';
import { PlayerController } from '../src/engine/player/PlayerController';
import { TeleportSystem } from '../src/engine/player/TeleportSystem';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { testWorldA } from '../src/worlds/test-world-a/config';

const floor = { minX: -10, maxX: 10, minZ: -10, maxZ: 10, y: 0 };
const data = { floors: [floor], solids: [new Box3(new Vector3(1, 0, -5), new Vector3(1.1, 3, 5))] };
function controller(handedness: 'left' | 'right'): ControllerSample {
  return { key: {}, handedness, mapping: 'xr-standard', axes: [0, 0, 0, 0], squeeze: false };
}
const defaults = DEFAULT_XR_SETTINGS;

describe('pure XR controller mapping (synthetic samples, not hardware)', () => {
  it('defaults to teleport and snap; bounds invalid settings', () => {
    expect(xrSettings().movement).toBe('teleport'); expect(xrSettings().turn).toBe('snap');
    expect(xrSettings({ moveSpeed: Infinity, deadzone: 4 }).moveSpeed).toBe(1.5);
    expect(xrSettings({ deadzone: 4 }).deadzone).toBe(0.45);
  });
  it('uses standard thumbstick indices and radial deadzone only in smooth mode', () => {
    const mapper = new XRInputMapper(); const left = controller('left');
    mapper.sample([left], defaults, 0.02);
    left.axes = [1, 1, 0.1, -0.1]; expect(mapper.sample([left], { ...defaults, movement: 'smooth' }, 0.02).movement).toEqual({ right: 0, forward: 0 });
    left.axes = [0, 0, 1, -1];
    const input = mapper.sample([left], { ...defaults, movement: 'smooth' }, 0.02).movement;
    expect(Math.hypot(input.right, input.forward)).toBeCloseTo(1);
    expect(mapper.sample([left], defaults, 0.02).movement).toEqual({ right: 0, forward: 0 });
  });
  it('ignores unknown layouts, missing axes and non-finite values', () => {
    const mapper = new XRInputMapper(); const left = controller('left');
    mapper.sample([left], defaults, 0.02);
    left.mapping = ''; left.axes = [0, 0, 1, -1];
    expect(mapper.sample([left], defaults, 0.02).teleportSource).toBeNull();
    left.mapping = 'xr-standard'; left.axes = [NaN];
    expect(mapper.sample([left], defaults, 0.02).movement).toEqual({ right: 0, forward: 0 });
  });
  it('snaps once per neutral-to-deflected edge; held input on entry is disarmed', () => {
    const mapper = new XRInputMapper(); const right = controller('right');
    right.axes = [0, 0, 1, 0]; expect(mapper.sample([right], defaults, 0.02).turn).toBe(0);
    right.axes = [0, 0, 0, 0]; mapper.sample([right], defaults, 0.02);
    right.axes = [0, 0, 1, 0]; expect(mapper.sample([right], defaults, 0.02).turn).toBeCloseTo(-Math.PI / 6);
    expect(mapper.sample([right], defaults, 1).turn).toBe(0);
    right.axes = [0, 0, 0, 0]; mapper.sample([right], defaults, 0.02);
    right.axes = [0, 0, -1, 0]; expect(mapper.sample([right], defaults, 0.02).turn).toBeCloseTo(Math.PI / 6);
  });
  it('smooth turn is opt-in and delta-limited', () => {
    const mapper = new XRInputMapper(); const right = controller('right'); const options = { ...defaults, turn: 'smooth' as const };
    mapper.sample([right], options, 0.02); right.axes = [0, 0, 1, 0];
    expect(mapper.sample([right], options, 9).turn).toBeCloseTo(-Math.PI / 2 * 0.05);
  });
  it('aims with a left stick, commits once on release and cancels disconnected input', () => {
    const mapper = new XRInputMapper(); const left = controller('left'); mapper.sample([left], defaults, 0.02);
    left.axes = [0, 0, 0, -1]; expect(mapper.sample([left], defaults, 0.02).teleportSource).toBe(left.key);
    left.axes = [0, 0, 0, 0]; expect(mapper.sample([left], defaults, 0.02).teleportRelease).toBe(true);
    expect(mapper.sample([left], defaults, 0.02).teleportRelease).toBe(false);
    left.squeeze = true; expect(mapper.sample([left], defaults, 0.02).teleportSource).toBe(left.key);
    expect(mapper.sample([], defaults, 0.02).teleportRelease).toBe(false);
    mapper.reset(); expect(mapper.sample([left], defaults, 0.02).teleportSource).toBeNull();
  });
});

describe('shared collision / XR tracking-space reconciliation', () => {
  function player() {
    const player = new PlayerController(new PerspectiveCamera());
    player.spawn({ ...testWorldA, spawn: { position: [0, 0, 0], yaw: 0 } }, new CollisionSystem(data));
    player.prepareXR(); return player;
  }
  it('aligns first tracked head to virtual feet without adding desktop eye height', () => {
    const p = player(); expect(p.updateXRHead(new Vector3(2, 1.7, 3), new Quaternion())).toBe(true);
    expect(p.feet.toArray()).toEqual([0, 0, 0]); expect(p.rig.position.toArray()).toEqual([-2, 0, -3]);
    expect(p.camera.position.y).toBe(0);
  });
  it('sweeps real head translation through the same wall collision', () => {
    const p = player(); p.updateXRHead(new Vector3(0, 1.7, 0), new Quaternion());
    p.updateXRHead(new Vector3(0.6, 1.7, 0), new Quaternion());
    expect(p.updateXRHead(new Vector3(1.2, 1.7, 0), new Quaternion())).toBe(false);
    expect(p.feet.x).toBeLessThanOrEqual(0.72);
    expect(p.rig.position.x + 1.2).toBeCloseTo(p.feet.x);
  });
  it('keeps tracked head horizontal position fixed during snap turn', () => {
    const p = player(); const local = new Vector3(2, 1.7, 3); p.updateXRHead(local, new Quaternion());
    const feet = p.feet; p.rotateXR(Math.PI / 2);
    const headWorld = local.clone().applyAxisAngle(new Vector3(0, 1, 0), p.rig.rotation.y).add(p.rig.position);
    expect(headWorld.x).toBeCloseTo(feet.x); expect(headWorld.z).toBeCloseTo(feet.z);
  });
  it('reuses player movement for XR sticks and blocks the wall', () => {
    const p = player(); p.updateXRHead(new Vector3(0, 1.7, 0), new Quaternion());
    for (let i = 0; i < 40; i++) p.update({ right: 1, forward: 0 }, 0.05, 0, 1.5);
    expect(p.feet.x).toBeLessThanOrEqual(0.72);
  });
  it('absorbs tracking reset/jumps and restores PC from the actual XR feet', () => {
    const p = player(); p.updateXRHead(new Vector3(1, 1.7, 1), new Quaternion());
    p.updateXRHead(new Vector3(5, 1.7, 5), new Quaternion()); expect(p.feet.toArray()).toEqual([0, 0, 0]);
    p.rebaseXRTracking(); p.updateXRHead(new Vector3(-5, 1.7, -5), new Quaternion()); expect(p.feet.toArray()).toEqual([0, 0, 0]);
    expect(p.teleportXR(new Vector3(-3, 0, 2))).toBe(true);
    p.restoreDesktopCamera(); expect(p.rig.position.toArray()).toEqual([-3, 0, 2]); expect(p.camera.position.y).toBe(1.65);
  });
  it('restores the combined head/rig heading once on PC return and resets on world spawn', () => {
    const p = player();
    p.updateXRHead(new Vector3(1, 1.65, 2), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.3));
    p.rotateXR(-0.5); p.restoreDesktopCamera(); expect(p.rig.rotation.y).toBeCloseTo(-0.2);
    p.restoreDesktopCamera(); expect(p.rig.rotation.y).toBeCloseTo(-0.2);
    p.spawn(testWorldA, new CollisionSystem(data)); expect(p.rig.position.toArray()).toEqual([0, 0, 6]); expect(p.rig.rotation.y).toBe(0);
  });
});

describe('teleport destination and path validation', () => {
  const system = new TeleportSystem(data, new CollisionSystem(data), 0.28, 1.75, { areas: [floor], maxDistance: 8 });
  it('accepts clear same-height destinations in allowed areas', () => {
    expect(system.validate(new Vector3(), new Vector3(-3, 0, 2)).valid).toBe(true);
  });
  it('rejects non-finite, distant, unsupported-height and edge positions', () => {
    for (const target of [new Vector3(NaN, 0, 0), new Vector3(-9, 0, 0), new Vector3(-1, 1, 0), new Vector3(-9.9, 0, 0)]) {
      expect(system.validate(new Vector3(), target).valid).toBe(false);
    }
  });
  it('rejects solid destinations and clear destinations across a wall', () => {
    expect(system.validate(new Vector3(), new Vector3(1, 0, 0)).valid).toBe(false);
    expect(system.validate(new Vector3(), new Vector3(3, 0, 0)).reason).toContain('너머');
  });
  it('checks full body clearance near an obstacle, not just ray visibility', () => {
    expect(system.validate(new Vector3(0, 0, 5.1), new Vector3(2, 0, 5.1)).valid).toBe(false);
  });
  it('rejects crossing gaps and explicitly excluded areas', () => {
    const gap = { floors: [{ ...floor, maxX: 0 }, { ...floor, minX: 1 }], solids: [] };
    const gaps = new TeleportSystem(gap, new CollisionSystem(gap), 0.28, 1.75, { areas: [floor], maxDistance: 8 });
    expect(gaps.validate(new Vector3(-1, 0, 0), new Vector3(2, 0, 0)).valid).toBe(false);
    const restricted = new TeleportSystem(data, new CollisionSystem(data), 0.28, 1.75, { areas: [], maxDistance: 8 });
    expect(restricted.validate(new Vector3(), new Vector3(-1, 0, 0)).valid).toBe(false);
  });
  it('intersects actual floor planes and rejects controller rays through walls', () => {
    expect(system.aim(new Ray(new Vector3(0, 1.7, 0), new Vector3(-1, -1, 0).normalize()), new Vector3()).valid).toBe(true);
    expect(system.aim(new Ray(new Vector3(0, 1.7, 0), new Vector3(2, -1, 0).normalize()), new Vector3()).valid).toBe(false);
    expect(system.aim(new Ray(new Vector3(0, 1.7, 0), new Vector3(0, 1, 0)), new Vector3()).point).toBeNull();
  });
  it('uses current tracked head height for the entire teleport path', () => {
    const overhead = { floors: [floor], solids: [new Box3(new Vector3(-0.1, 1.8, -1), new Vector3(0.1, 3, 1))] };
    const system = new TeleportSystem(overhead, new CollisionSystem(overhead), 0.28, 1.75, { areas: [floor], maxDistance: 8 });
    expect(system.validate(new Vector3(-2, 0, 0), new Vector3(2, 0, 0)).valid).toBe(true);
    expect(system.validate(new Vector3(-2, 0, 0), new Vector3(2, 0, 0), 2).valid).toBe(false);
  });
});
