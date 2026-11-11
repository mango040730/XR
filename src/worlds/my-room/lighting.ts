import { HemisphereLight, PMREMGenerator, PointLight, RectAreaLight, SpotLight } from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { WorldConfig } from '../../engine/world/types';

/** Original ZIP lights, attached to the world root with an environment owned by that world. */
export const prepareLighting: NonNullable<WorldConfig['prepare']> = ({ root, scene, renderer, signal, onDispose }) => {
  signal.throwIfAborted();RectAreaLightUniformsLib.init();
  root.add(new HemisphereLight('#f4ecdf', '#a28c70', .30));
  const pendant = new SpotLight('#ffe8cd', 28, 11, 1.18, .72, 2);
  pendant.name = 'Indoor pendant key';pendant.position.set(-1.45, 2.67, -.35);pendant.target.position.set(-.20, .20, .85);
  pendant.castShadow = true;pendant.shadow.mapSize.set(2048, 2048);pendant.shadow.camera.near = .1;pendant.shadow.camera.far = 11;
  pendant.shadow.bias = -.000035;pendant.shadow.normalBias = .003;pendant.shadow.radius = 3;root.add(pendant, pendant.target);
  const area = (name: string, color: string, intensity: number, width: number, height: number, position: [number,number,number], target: [number,number,number]) => {
    const light = new RectAreaLight(color, intensity, width, height);light.name=name;light.position.fromArray(position);light.lookAt(...target);root.add(light);
  };
  area('Soft interior ceiling bounce','#fff1dd',1.6,3.6,2.1,[2.45,3.16,-.15],[.8,.7,1.7]);
  area('Reading library crown wash','#ffe8cb',3.2,4.3,.22,[1.52,2.92,3.04],[1.52,1.2,3.38]);
  area('West shelf warm wash','#fff0da',2.4,2.25,.20,[-3.90,2.62,-.1],[-4.13,1.2,-.1]);
  area('Portal cove','#ffe7c8',4,1.6,.28,[2.23,2.67,-3.20],[2.23,.6,-2.3]);
  const task = new PointLight('#ffe4bc',1.2,2.1,2);task.position.set(-2.94,1.26,-3.05);root.add(task);
  const reading = new SpotLight('#ffe2bd',3.2,3.8,.95,.9,2);reading.position.set(2.42,1.675,2.37);reading.target.position.set(1.65,.7,1.75);root.add(reading,reading.target);
  const generator = new PMREMGenerator(renderer), environment = new RoomEnvironment();
  try {
    const target = generator.fromScene(environment,.04);onDispose(() => target.dispose());scene.environment = target.texture;
  } finally { environment.dispose();generator.dispose(); }
  signal.throwIfAborted();
};
