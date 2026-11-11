import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {LIGHTING_PRESET} from './preset';
import type {WorldConfig} from '../../engine/world/types';

export function prepareLighting({root,scene,renderer,signal,onDispose}:Parameters<NonNullable<WorldConfig['prepare']>>[0]){
  signal.throwIfAborted();const preset=LIGHTING_PRESET,desktopShadows=true,dynamicShadows=false;
  RectAreaLightUniformsLib.init();
  const group = new THREE.Group();
  group.name = 'Runtime_BowlingLighting';root.add(group);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  let environment:THREE.WebGLRenderTarget;
  try{environment=pmrem.fromScene(room,0.055);}finally{room.dispose();pmrem.dispose();}
  onDispose(()=>environment.dispose());
  scene.environment = environment.texture;
  scene.environmentIntensity = preset.environment;
  const ambient = new THREE.HemisphereLight(
    preset.ambient.sky,
    preset.ambient.ground,
    preset.ambient.intensity,
  );
  ambient.name = 'Fill_WarmNeutral_Hemisphere';
  group.add(ambient);

  function spot(name:string, position:THREE.Vector3Tuple, target:THREE.Vector3Tuple, color:number, intensity:number, distance:number, angle:number) {
    const light = new THREE.SpotLight(color, intensity, distance, angle, 0.92, 2);
    light.name = name;
    light.position.fromArray(position);
    light.target.position.fromArray(target);
    if (desktopShadows) {
      light.castShadow = true;
      light.shadow.mapSize.set(preset.shadow.size, preset.shadow.size);
      light.shadow.camera.near = preset.shadow.near;
      light.shadow.camera.far = distance;
      light.shadow.bias = preset.shadow.bias;
      light.shadow.normalBias = preset.shadow.normalBias;
      light.shadow.autoUpdate = dynamicShadows;
      light.shadow.needsUpdate = true;

    }
    group.add(light, light.target);
    return light;
  }
  // Long soft fills keep the lane readable without flooding the whole room.
  for (const x of desktopShadows ? [-3.84, -1.28, 1.28, 3.84] : [-2.56, 2.56]) {
    const light = new THREE.RectAreaLight(
      preset.lane.color,
      preset.lane.intensity,
      desktopShadows ? 1.25 : 3.0,
      20.5,
    );
    light.name = 'Lane_LongWarmFill';
    light.position.set(x, preset.lane.height, -20.4);
    light.lookAt(x, 0, -20.4);
    group.add(light);
  }
  for (const x of desktopShadows ? [-2.56, 2.56] : []) {
    const k = preset.laneKey;
    spot(
      'Lane_Pendant_Key',
      [x, 3.72, -24],
      [x, 0, -25.1],
      k.color,
      k.intensity,
      k.distance,
      k.angle,
    );
  }
  for (const x of [-4.5, 4.5]) {
    const light = new THREE.RectAreaLight(preset.social.color, preset.social.intensity, 5.5, 5);
    light.name = 'Social_SoftFill';
    light.position.set(x, 3.5, -3.5);
    light.lookAt(x, 0, -3.5);
    group.add(light);
    const uplight = new THREE.RectAreaLight(preset.roof.color, preset.roof.intensity, 1.5, 28);
    uplight.name = 'Roof_GentleEdgeFill';
    uplight.position.set(x, 4.55, -16);
    uplight.lookAt(0, 6.7, -16);
    group.add(uplight);
  }
  // The social keys provide readable contact shadows under all seating bays.
  for (const x of [-5.12, 5.12]) {
    const k = preset.socialKey;
    spot(
      'Social_Pendant_Key',
      [x, 3.57, -3.9],
      [x * 0.62, 0, -3.5],
      k.color,
      k.intensity,
      k.distance,
      k.angle,
    );
    if (desktopShadows) {
      const accent = new THREE.RectAreaLight(
        preset.wallAccent.color,
        preset.wallAccent.intensity,
        1.1,
        2.4,
      );
      accent.name = 'Social_WallAccent';
      accent.position.set(Math.sign(x) * 8.65, 2.5, -4);
      accent.lookAt(Math.sign(x) * 8.98, 1.5, -4);
      group.add(accent);
      const wall = preset.wallKey,
        side = Math.sign(x);
      const grazing = spot(
        'Wall_Trim_GrazingKey',
        [side * 7.6, 3.75, -17],
        [side * 8.97, 1.8, -21],
        wall.color,
        wall.intensity,
        wall.distance,
        wall.angle,
      );
      grazing.shadow.mapSize.set(1024, 1024);
    }
  }
  const roofKey = preset.roofKey;
  if (desktopShadows) {
    spot(
      'Roof_AngledStructureRim',
      [-6.4, 4.1, -14],
      [0, 6.65, -19],
      roofKey.color,
      roofKey.intensity,
      roofKey.distance,
      roofKey.angle,
    );
    const edge = new THREE.RectAreaLight(
      preset.fabricEdge.color,
      preset.fabricEdge.intensity,
      8,
      0.5,
    );
    edge.name = 'Social_Fabric_Edge';
    edge.position.set(0, 2.3, -6.6);
    edge.lookAt(0, 0.6, -2.5);
    group.add(edge);
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

}
