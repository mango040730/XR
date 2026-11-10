import { describe, expect, it, vi } from 'vitest';
import { Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three';
import { XRControllerSystem } from '../src/engine/xr/XRControllerSystem';
import { XRInput } from '../src/engine/input/XRInput';
import { PlayerController } from '../src/engine/player/PlayerController';
import { InteractionSystem } from '../src/engine/interaction/InteractionSystem';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { createWorld } from '../src/engine/world/createWorld';
import type { Renderer } from '../src/engine/rendering/Renderer';
import { testWorldA } from '../src/worlds/test-world-a/config';
import { DEFAULT_XR_SETTINGS } from '../src/engine/xr/settings';

// Synthetic native API boundaries: these tests are not headset/driver verification.
class TestSession extends EventTarget {
  inputSources: XRInputSource[] = [];
  visibilityState = 'visible';
  select(source: XRInputSource) { this.dispatchEvent(Object.assign(new Event('select'), { inputSource: source })); }
}
function source() {
  const axes = [0, 0, 0, 0];
  const value = { handedness: 'left', targetRayMode: 'tracked-pointer', targetRaySpace: {},
    gamepad: { mapping: 'xr-standard', connected: true, axes, buttons: [{ pressed: false }, { pressed: false }] } } as unknown as XRInputSource;
  return { value, axes };
}

describe('native session input adapter with synthetic events', () => {
  it('consumes primary actions once and drops hidden/disconnected/session-end inputs', () => {
    const input = new XRInput(); const session = new TestSession(); const controller = source();
    session.inputSources = [controller.value]; input.connect(session as unknown as XRSession);
    session.select(controller.value); expect(input.consumeSelect(controller.value)).toBe(true); expect(input.consumeSelect(controller.value)).toBe(false);
    session.visibilityState = 'hidden'; session.select(controller.value); expect(input.consumeSelect(controller.value)).toBe(false);
    session.visibilityState = 'visible'; session.select(controller.value); session.inputSources = [];
    session.dispatchEvent(new Event('inputsourceschange')); expect(input.consumeSelect(controller.value)).toBe(false);
    input.dispose(); session.select(controller.value); expect(input.consumeSelect(controller.value)).toBe(false);
  });
  it('clears movement and re-arms neutral input after focus loss', () => {
    const input = new XRInput(); const session = new TestSession(); const controller = source();
    session.inputSources = [controller.value]; input.connect(session as unknown as XRSession);
    const settings = { ...DEFAULT_XR_SETTINGS, movement: 'smooth' as const };
    input.sample(settings, 0.02); controller.axes[3] = -1; input.sample(settings, 0.02); expect(input.readMovement().forward).toBe(1);
    session.visibilityState = 'hidden'; session.dispatchEvent(new Event('visibilitychange')); expect(input.readMovement().forward).toBe(0);
    session.visibilityState = 'visible'; input.sample(settings, 0.02); expect(input.readMovement().forward).toBe(0); input.dispose();
  });
});

describe('XRFrame orchestration with synthetic poses and visual sink', () => {
  async function setup() {
    const config = { ...testWorldA, spawn: { position: [0, 0, 4] as [number, number, number], yaw: 0 } };
    const world = await createWorld(config, { root: new Group(), signal: new AbortController().signal, progress: () => {} });
    const camera = new PerspectiveCamera(); const player = new PlayerController(camera); player.spawn(config, new CollisionSystem(world.collision));
    const interactions = new InteractionSystem(); interactions.setWorld(world.root);
    const reference = new EventTarget(); const rendering = { camera, scene: new Scene(), webgl: { xr: { getReferenceSpace: () => reference } } } as unknown as Renderer;
    const visuals = { active: vi.fn(), hidePointers: vi.fn(), ray: vi.fn(), teleport: vi.fn(), status: vi.fn(), dispose: vi.fn() };
    const controls = new XRControllerSystem(rendering, player, interactions, visuals);
    controls.setWorld(world);
    const session = new TestSession(); const controller = source(); session.inputSources = [controller.value];
    let head: unknown = { transform: { position: { x: 0, y: 1.65, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } };
    let pointer = new Matrix4().makeTranslation(0, 1.65, 0);
    const frame = { getViewerPose: () => head, getPose: () => ({ transform: { matrix: pointer.elements } }) } as unknown as XRFrame;
    controls.start(session as unknown as XRSession);
    return { world, player, interactions, reference, controls, visuals, session, controller, frame,
      setHead: (value: unknown) => { head = value; }, setPointer: (matrix: Matrix4) => { pointer = matrix; },
      dispose: () => { controls.dispose(); interactions.dispose(); world.dispose(); } };
  }
  it('dispatches controller select through the common real interaction action', async () => {
    const s = await setup(); const action = vi.fn(); s.interactions.actions.subscribe(action);
    s.controls.update(s.frame, 0, 0.02); s.session.select(s.controller.value); s.controls.update(s.frame, 20, 0.02);
    expect(action).toHaveBeenCalledWith(expect.objectContaining({ type: 'toggle-color', objectId: 'a-switch', source: 'xr-0' }));
    const cube = s.world.root.getObjectByName('a-switch') as Mesh;
    expect((cube.material as MeshStandardMaterial).color.getHexString()).toBe('ffb86b');
    expect(s.controls.state.controllers).toContain('left: 표준 입력'); s.dispose();
  });
  it('uses a controller pose for validated teleport preview and commits on release', async () => {
    const s = await setup();
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), new Vector3(-1, -1, 0).normalize());
    s.setPointer(new Matrix4().compose(new Vector3(0, 1.4, 0), quaternion, new Vector3(1, 1, 1)));
    s.controls.update(s.frame, 0, 0.02);
    s.controller.axes[3] = -1; s.controls.update(s.frame, 20, 0.02);
    expect(s.visuals.teleport).toHaveBeenLastCalledWith(expect.objectContaining({ valid: true }));
    expect(s.player.feet.toArray()).toEqual([0, 0, 4]);
    s.controller.axes[3] = 0; s.controls.update(s.frame, 40, 0.02);
    expect(s.player.feet.x).toBeCloseTo(-1.4); expect(s.player.feet.z).toBe(4);
    s.controls.stop(); expect(s.player.rig.position.x).toBeCloseTo(-1.4); expect(s.player.camera.position.y).toBe(1.65); s.dispose();
  });
  it('pauses/fades on tracking loss, clears selection and rebases reference reset', async () => {
    const s = await setup(); s.controls.update(s.frame, 0, 0.02);
    s.session.select(s.controller.value); s.setHead(null); s.controls.update(s.frame, 20, 0.02);
    expect(s.controls.state.tracking).toBe(false); expect(s.controls.state.blocked).toBe(true); expect(s.interactions.highlights.children).toHaveLength(0);
    s.reference.dispatchEvent(new Event('reset')); expect(s.player.feet.toArray()).toEqual([0, 0, 4]);
    s.controls.stop(); expect(s.controls.state.blocked).toBe(false); s.dispose();
  });
});
