import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { acceleratedRaycast } from 'three-mesh-bvh';
import { prepareSpace, isWalkable, WALK_RADIUS } from './prepare-space.js';
import { collisionGeometry } from './collision.js';

// The document intentionally contains only the rendering canvas: no HUD or VR button.
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cbd7dc');
scene.fog = new THREE.Fog('#cbd7dc', 85, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFramebufferScaleFactor(1);
renderer.domElement.setAttribute('aria-label', '3D 가상 공간');
renderer.domElement.tabIndex = 0;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.06, 240);
camera.rotation.order = 'YXZ';
const rig = new THREE.Group();
rig.position.set(0, 1.175, 22);
camera.position.y = 1.65;
scene.add(rig);
rig.add(camera);

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
scene.environmentIntensity = 0.8;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight('#fff1df', '#6b7895', 0.85));
const sun = new THREE.DirectionalLight('#ffe7cd', 3.0);
sun.position.set(-22, 38, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 130 });
sun.shadow.normalBias = 0.02;
sun.shadow.bias = -0.00008;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
const fill = new THREE.DirectionalLight('#dde7ff', 0.55);
fill.position.set(25, 14, -20);
scene.add(fill);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshStandardMaterial({ color: '#17346f', roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.825;
ground.receiveShadow = true;
scene.add(ground);

const ray = new THREE.Raycaster();
ray.firstHitOnly = true;
const down = new THREE.Vector3(0, -1, 0);
const up = new THREE.Vector3(0, 1, 0);
const direction = new THREE.Vector3();
const origin = new THREE.Vector3();
const head = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const step = new THREE.Vector3();
const rotation = new THREE.Quaternion();
let collider, floor, ready = false, xrSupported = false, xrStarting = false;
let lastTime = 0, snapReady = true;
const keys = new Set();
const touches = new Map();

function floorHeight(x, z, y, maxDrop = 0.6) {
  origin.set(x, y + 0.36, z);
  ray.set(origin, down);
  ray.near = 0;
  ray.far = maxDrop + 0.36;
  const hit = ray.intersectObject(floor, false)[0];
  return hit && Math.abs(hit.face.normal.y) > 0.7 ? hit.point.y + 0.025 : null;
}

function tryMove(dx, dz, delta) {
  if (!ready || Math.abs(dx) + Math.abs(dz) < 0.00001) return;
  camera.getWorldPosition(head);
  const x = head.x, z = head.z;
  // Keep the viewer within the original circular architecture.
  if (Math.hypot(x + dx, z + dz) > WALK_RADIUS) return;
  const height = floorHeight(x + dx, z + dz, rig.position.y);
  if (height === null || height - rig.position.y > 0.34) return;
  direction.set(dx, 0, dz);
  const distance = direction.length();
  direction.divideScalar(distance);
  // Body/shoulder/head samples prevent walking through furnishings and walls.
  right.crossVectors(direction, up).multiplyScalar(0.22);
  for (const h of [0.4, 0.95, 1.5]) {
    for (const side of [-1, 0, 1]) {
      origin.set(x + right.x * side, Math.max(rig.position.y, height) + h, z + right.z * side);
      ray.set(origin, direction);
      ray.near = 0;
      ray.far = distance + 0.27;
      if (ray.intersectObject(collider, false).length) return;
    }
  }
  rig.position.x += dx;
  rig.position.z += dz;
  // Smooth the small stair risers without adding camera bob or artificial roll.
  rig.position.y = THREE.MathUtils.damp(rig.position.y, height, 20, delta);
}

function moveRelative(x, z, delta, speed = 2.5) {
  if (!x && !z) return;
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, up).normalize();
  step.copy(forward).multiplyScalar(z).addScaledVector(right, x);
  if (step.lengthSq() > 1) step.normalize();
  step.multiplyScalar(speed * delta);
  // Axis separation allows natural sliding along obstacles.
  tryMove(step.x, 0, delta);
  tryMove(0, step.z, delta);
}

function resetPosition() {
  rig.position.set(0, 1.175, 22);
  rig.rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  if (!renderer.xr.isPresenting) camera.position.set(0, 1.65, 0);
}

new GLTFLoader().load(`${import.meta.env.BASE_URL}models/space.glb`, gltf => {
  const model = gltf.scene;
  prepareSpace(model);
  scene.add(model);
  model.updateMatrixWorld(true);
  const meshes = [], floors = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    meshes.push(object);
    object.castShadow = true;
    object.receiveShadow = true;
    if (isWalkable(object)) floors.push(object);
  });
  collider = collisionGeometry(meshes);
  floor = collisionGeometry(floors);
  const initialFloor = floorHeight(0, 22, 1.175, 2);
  if (initialFloor !== null) rig.position.y = initialFloor;
  ready = true;
  document.documentElement.dataset.scene = 'ready';
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  window.dispatchEvent(new Event('space-ready'));
}, undefined, error => {
  document.documentElement.dataset.scene = 'error';
  console.error('공간 모델을 불러오지 못했습니다.', error);
});

if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr')
  .then(supported => { xrSupported = supported; })
  .catch(error => console.info('WebXR:', error.message));

async function enterVR() {
  if (!ready || !xrSupported || xrStarting || renderer.xr.isPresenting) return;
  xrStarting = true;
  try {
    const session = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['bounded-floor'],
    });
    document.exitPointerLock?.();
    keys.clear();
    touches.clear();
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    session.addEventListener('end', () => {
      camera.position.set(0, 1.65, 0);
      camera.rotation.set(0, 0, 0);
      keys.clear();
      snapReady = true;
    }, { once: true });
    await renderer.xr.setSession(session);
  } catch (error) {
    camera.position.set(0, 1.65, 0);
    console.info('VR session:', error.message);
  } finally { xrStarting = false; }
}

const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
controllers.forEach(controller => {
  rig.add(controller);
  controller.addEventListener('selectend', () => {
    if (!ready || !renderer.xr.isPresenting) return;
    controller.getWorldPosition(origin);
    controller.getWorldQuaternion(rotation);
    direction.set(0, 0, -1).applyQuaternion(rotation);
    ray.set(origin, direction);
    ray.near = 0.1;
    ray.far = 15;
    const destination = ray.intersectObject(floor, false)[0];
    if (!destination || Math.abs(destination.face.normal.y) < 0.7) return;
    const obstruction = ray.intersectObject(collider, false)[0];
    if (obstruction && obstruction.distance < destination.distance - 0.07) return;
    if (Math.hypot(destination.point.x, destination.point.z) > WALK_RADIUS) return;
    // Ensure the landing spot has enough clear space for a standing viewer.
    for (const offset of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      origin.copy(destination.point).addScaledVector(up, 0.9);
      direction.set(Math.cos(offset), 0, Math.sin(offset));
      ray.set(origin, direction);
      ray.far = 0.4;
      if (ray.intersectObject(collider, false).length) return;
    }
    camera.getWorldPosition(head);
    rig.position.x += destination.point.x - head.x;
    rig.position.z += destination.point.z - head.z;
    rig.position.y = destination.point.y + 0.025;
  });
});

function look(dx, dy) {
  if (renderer.xr.isPresenting) return;
  camera.rotation.y -= dx * 0.0022;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.0022, -1.45, 1.45);
}
document.addEventListener('mousemove', event => {
  if (document.pointerLockElement === renderer.domElement) look(event.movementX, event.movementY);
});
renderer.domElement.addEventListener('click', () => {
  if (!ready) return;
  if (xrSupported) { void enterVR(); return; }
  if (matchMedia('(pointer: fine)').matches && !document.pointerLockElement) {
    const result = renderer.domElement.requestPointerLock?.();
    result?.catch?.(error => console.info('Pointer lock:', error.message));
  }
});
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse') return;
  touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', event => {
  const previous = touches.get(event.pointerId);
  if (!previous) return;
  if (touches.size === 1) look(event.clientX - previous.x, event.clientY - previous.y);
  touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  renderer.domElement.addEventListener(event, e => touches.delete(e.pointerId));
}
document.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === 'KeyV' && !event.repeat) void enterVR();
  if (event.code === 'KeyR' && !renderer.xr.isPresenting) resetPosition();
});
document.addEventListener('keyup', event => keys.delete(event.code));
function clearInput() { keys.clear(); touches.clear(); }
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
document.addEventListener('pointerlockchange', clearInput);
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function xrInput(delta) {
  const sources = renderer.xr.getSession()?.inputSources ?? [];
  let turn = 0;
  for (const source of sources) {
    const gamepad = source.gamepad;
    if (!gamepad) continue;
    const axes = gamepad.axes;
    const x = axes.length >= 4 ? axes[2] : (axes[0] ?? 0);
    const y = axes.length >= 4 ? axes[3] : (axes[1] ?? 0);
    const deadzone = value => Math.abs(value) < 0.18 ? 0 : value;
    if (source.handedness === 'left' || source.handedness === 'none') moveRelative(deadzone(x), -deadzone(y), delta, 2);
    if (source.handedness === 'right') turn = x;
  }
  if (Math.abs(turn) < 0.3) snapReady = true;
  if (Math.abs(turn) > 0.65 && snapReady) {
    camera.getWorldPosition(head);
    rig.rotation.y -= Math.sign(turn) * Math.PI / 6;
    camera.getWorldPosition(origin);
    rig.position.x += head.x - origin.x;
    rig.position.z += head.z - origin.z;
    snapReady = false;
  }
}

// A small read-only diagnostics surface; nothing is drawn over the scene.
window.spaceVR = Object.freeze({
  get ready() { return ready; },
  get vrSupported() { return xrSupported; },
  get presenting() { return renderer.xr.isPresenting; },
  get position() { return rig.position.toArray(); },
  get renderInfo() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
});

renderer.setAnimationLoop(time => {
  const delta = Math.min((time - (lastTime || time)) / 1000, 0.04);
  lastTime = time;
  if (ready) {
    if (renderer.xr.isPresenting) xrInput(delta);
    else {
      const x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const z = Number(keys.has('KeyW') || keys.has('ArrowUp') || touches.size >= 2) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      moveRelative(x, z, delta, keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 2.5);
    }
  }
  renderer.render(scene, camera);
});
