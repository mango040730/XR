import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;

function addBox(scene, size, position, color, roughness = 0.82) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 })
  );
  mesh.position.set(position[0], position[1], position[2]);
  scene.add(mesh);
  return mesh;
}

function buildMigrationRoom(scene) {
  const room = new THREE.Group();
  room.name = "phase-1-migration-room";
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    new THREE.MeshStandardMaterial({ color: 0x80674f, roughness: 0.92 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 23);
  room.add(floor);

  addBox(room, [42, 16, 0.45], [0, 8, 44], 0xd8cec0);
  addBox(room, [0.45, 16, 42], [-21, 8, 23], 0xc9bdad);
  addBox(room, [0.45, 16, 42], [21, 8, 23], 0xc9bdad);
  addBox(room, [42, 0.35, 42], [0, 16, 23], 0xeee7dc);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 17),
    new THREE.MeshStandardMaterial({ color: 0x6f8178, roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.025, 20);
  room.add(rug);

  const table = addBox(room, [8.5, 0.5, 5.4], [0, 2.6, 20], 0x8d6749);
  table.material.roughness = 0.72;
  [[-3.4, 17.8], [3.4, 17.8], [-3.4, 22.2], [3.4, 22.2]].forEach(([x, z]) =>
    addBox(room, [0.38, 2.6, 0.38], [x, 1.3, z], 0x4f3d31)
  );

  const display = addBox(room, [2.8, 2.8, 2.8], [0, 4.25, 20], 0x78b5a3, 0.35);
  display.name = "threejs-render-proof";

  addBox(room, [10.5, 7.5, 0.4], [9, 7.5, 43.45], 0x486b72, 0.34);
  addBox(room, [0.3, 7.7, 0.55], [9, 7.5, 43.1], 0xe8dfd2);
  addBox(room, [10.8, 0.3, 0.55], [9, 7.5, 43.1], 0xe8dfd2);

  const shelf = addBox(room, [8, 0.5, 2.4], [-11, 5.2, 42.2], 0x9a7658);
  shelf.name = "model-display-shelf";
  [-14, -11, -8].forEach((x, index) => {
    const geometry = index === 1
      ? new THREE.SphereGeometry(0.85, 24, 16)
      : new THREE.CylinderGeometry(0.65, 0.82, 1.7, 20);
    const material = new THREE.MeshStandardMaterial({
      color: [0xd78678, 0xe3bd68, 0x739b91][index],
      roughness: 0.68
    });
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, 6.3, 41.8);
    room.add(object);
  });

  return { room, display };
}

function disposeMaterial(material) {
  Object.values(material).forEach(value => {
    if (value?.isTexture) value.dispose();
  });
  material.dispose();
}

export function createThreeWorld(canvas, { getCameraState, modelUrl = null, environment = "room" } = {}) {
  const hasExternalModel = Boolean(modelUrl);
  const isEscape = environment === "escape";
  const backgroundColor = isEscape ? 0x171d1f : environment === "fishing" ? 0x82928a : 0xb8aa98;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(1);
  renderer.setSize(VIEW_WIDTH, VIEW_HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(backgroundColor, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, isEscape ? 18 : hasExternalModel ? 24 : 38, isEscape ? 45 : hasExternalModel ? 58 : 78);

  const camera = new THREE.PerspectiveCamera(70, VIEW_WIDTH / VIEW_HEIGHT, 0.1, 120);
  camera.rotation.order = "YXZ";

  const hemisphere = new THREE.HemisphereLight(0xfff2dc, isEscape ? 0x121719 : 0x40382f, isEscape ? 1.25 : 2.3);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffe0b8, isEscape ? 1.7 : 3.2);
  sun.position.set(-8, 14, 8);
  scene.add(sun);
  const fill = new THREE.PointLight(isEscape ? 0xffb56f : 0x9fd4cf, isEscape ? 12 : 25, 34, 2);
  fill.position.set(9, 8, 30);
  scene.add(fill);

  const migrationRoom = hasExternalModel ? null : buildMigrationRoom(scene);
  const modelRoot = new THREE.Group();
  modelRoot.name = "glb-model-root";
  scene.add(modelRoot);

  const loader = new GLTFLoader();
  const mixers = [];
  const clock = new THREE.Clock();
  let disposed = false;

  async function loadGLB(url, transform = {}) {
    canvas.dataset.modelStatus = "loading";
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    model.name ||= "loaded-glb-model";
    const position = transform.position || [0, 0, 0];
    const rotation = transform.rotation || [0, 0, 0];
    const scale = transform.scale ?? 1;
    model.position.set(position[0], position[1], position[2]);
    model.rotation.set(rotation[0], rotation[1], rotation[2]);
    Array.isArray(scale) ? model.scale.set(scale[0], scale[1], scale[2]) : model.scale.setScalar(scale);
    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    model.traverse(object => {
      if (!object.isMesh) return;
      object.frustumCulled = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (material?.map) material.map.anisotropy = maxAnisotropy;
      });
    });
    modelRoot.add(model);
    if (gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
      mixers.push(mixer);
    }
    canvas.dataset.modelStatus = "ready";
    return gltf;
  }

  if (modelUrl) loadGLB(modelUrl).catch(error => {
    canvas.dataset.modelStatus = "error";
    console.error("GLB load failed", error);
  });

  function animate(time) {
    if (disposed) return;
    const cameraState = getCameraState?.() || { x: 0, y: 3.4, z: 3, yaw: 0, pitch: 0 };
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.rotation.set(cameraState.pitch, Math.PI + cameraState.yaw, 0);
    if (migrationRoom) {
      migrationRoom.display.rotation.y = time * 0.00035;
      migrationRoom.display.position.y = 4.25 + Math.sin(time * 0.0012) * 0.08;
    }
    const delta = Math.min(clock.getDelta(), 0.05);
    mixers.forEach(mixer => mixer.update(delta));
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  return {
    scene,
    camera,
    renderer,
    loadGLB,
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      mixers.forEach(mixer => mixer.stopAllAction());
      scene.traverse(object => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
        else if (object.material) disposeMaterial(object.material);
      });
      renderer.dispose();
    }
  };
}
