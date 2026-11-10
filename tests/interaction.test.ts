import { expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Ray, Vector3 } from 'three';
import { InteractionSystem } from '../src/engine/interaction/InteractionSystem';
import { bindInteractions } from '../src/engine/interaction/bindInteractions';
import { disposeObject } from '../src/engine/assets/disposeObject';

it('selects only nearby visible objects and emits a world-content action', () => {
  const system = new InteractionSystem(); const root = new Group(); const camera = new PerspectiveCamera();
  const cube = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#53d6ba' }));
  cube.position.z = -2; cube.userData.interaction = 'toggle-color'; root.add(cube);
  const action = vi.fn(); system.actions.subscribe(action); system.setWorld(root); system.update(camera); system.activate();
  expect(action).toHaveBeenCalledOnce(); expect(cube.material.color.getHexString()).toBe('ffb86b');
  const wall = new Mesh(new BoxGeometry(2, 2, 0.1), new MeshStandardMaterial()); wall.position.z = -1; root.add(wall);
  system.update(camera); system.activate(); expect(action).toHaveBeenCalledOnce();
  root.remove(wall); cube.position.z = -5; system.update(camera); system.activate(); expect(action).toHaveBeenCalledOnce();
  system.dispose();
});

it('uses the same action from desktop and XR rays, highlights, restores color and clears on world exit', () => {
  const system = new InteractionSystem(); const root = new Group();
  const cube = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: '#53d6ba' }));
  cube.position.z = -2; cube.name = 'button'; root.add(cube);
  bindInteractions(root, [{ nodeName: 'button', id: 'door-button', label: '문 버튼' }]);
  system.setWorld(root); const actions = vi.fn(); const messages = vi.fn(); system.actions.subscribe(actions); system.messages.subscribe(messages);
  system.update(new PerspectiveCamera()); expect(system.highlights.children).toHaveLength(1); system.activate();
  system.updateRay('xr-left', new Ray(new Vector3(), new Vector3(0, 0, -1)), new Vector3()); system.activate('xr-left');
  expect(actions.mock.calls.map(call => call[0].objectId)).toEqual(['door-button', 'door-button']);
  expect(actions.mock.calls.map(call => call[0].source)).toEqual(['desktop', 'xr-left']);
  expect(cube.material.color.getHexString()).toBe('53d6ba'); expect(messages).toHaveBeenCalledWith(expect.stringContaining('문 버튼'));
  system.setWorld(null); expect(system.highlights.children).toHaveLength(0); system.activate('xr-left'); expect(actions).toHaveBeenCalledTimes(2);
  system.dispose(); disposeObject(root);
});

it('isolates shared GLB materials and rejects missing or ambiguous node names', () => {
  const root = new Group(); const shared = new MeshStandardMaterial({ color: '#53d6ba' });
  const a = new Mesh(new BoxGeometry(), shared); a.name = 'button'; a.position.z = -2;
  const b = new Mesh(new BoxGeometry(), shared); b.name = 'other'; b.position.set(3, 0, -2); root.add(a, b);
  bindInteractions(root, [{ nodeName: 'button', id: 'button', label: 'Button' }]);
  expect(a.material).not.toBe(b.material);
  const system = new InteractionSystem(); system.setWorld(root); system.update(new PerspectiveCamera()); system.activate();
  expect(b.material.color.getHexString()).toBe('53d6ba');
  expect(() => bindInteractions(root, [{ nodeName: 'missing', id: 'bad', label: 'bad' }])).toThrow();
  b.name = 'button'; expect(() => bindInteractions(root, [{ nodeName: 'button', id: 'bad', label: 'bad' }])).toThrow();
  system.dispose(); disposeObject(root);
});

it('prevents a physically extended controller from selecting through a wall behind the head', () => {
  const root = new Group(); const system = new InteractionSystem();
  const cube = new Mesh(new BoxGeometry(), new MeshStandardMaterial()); cube.position.z = -2; cube.userData.interaction = 'toggle-color';
  const wall = new Mesh(new BoxGeometry(3, 3, 0.1), new MeshStandardMaterial()); wall.position.z = -1; root.add(cube, wall); system.setWorld(root);
  expect(system.updateRay('xr', new Ray(new Vector3(0, 0, -1.2), new Vector3(0, 0, -1)), new Vector3())).toBeNull();
  system.dispose(); disposeObject(root);
});

it('avoids raycasting architectural geometry when no actionable object is in the short ray',()=>{
  const root=new Group(),system=new InteractionSystem();
  const wall=new Mesh(new BoxGeometry(15,4,.2),new MeshStandardMaterial());wall.position.z=-5;root.add(wall);
  const button=new Mesh(new BoxGeometry(),new MeshStandardMaterial());button.position.set(4,0,-2);button.userData.interaction='action';root.add(button);
  const wallRay=vi.spyOn(wall,'raycast');system.setWorld(root);system.update(new PerspectiveCamera());
  expect(wallRay).not.toHaveBeenCalled();
  button.position.set(0,0,-2);system.update(new PerspectiveCamera());expect(wallRay).toHaveBeenCalled();
  system.dispose();disposeObject(root);
});
