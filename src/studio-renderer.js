import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TERRACE_OUTER } from './space-layout.js';
import { PATH_Y } from './space-levels.js';

export function createStudioRenderer(renderer, scene, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const contact = new GTAOPass(scene, camera, 1, 1, undefined, {
    radius: 0.65, thickness: 0.8, distanceExponent: 2, distanceFallOff: 1.25,
    scale: 1, samples: 12, screenSpaceRadius: false,
  }, { radius: 5, samples: 12, depthPhi: 3, normalPhi: 6 });
  contact.blendIntensity = 0.72;
  contact.normalMaterial.side = THREE.DoubleSide;
  // The emissive display is not an ambient-lit furniture surface. Excluding
  // its distant curved face also avoids depth-precision streaks in GTAO.
  contact.gtaoMaterial.defines.DISPLAY_RADIUS = (TERRACE_OUTER + 9.85).toFixed(3);
  contact.gtaoMaterial.defines.DISPLAY_FLOOR = PATH_Y.toFixed(5);
  contact.gtaoMaterial.fragmentShader = contact.gtaoMaterial.fragmentShader.replace(
    'vec3 viewPos = getViewPosition(vUv, depth);',
    `vec3 viewPos = getViewPosition(vUv, depth);
     vec3 screenWorldPos = (cameraWorldMatrix * vec4(viewPos, 1.0)).xyz;
     if (length(screenWorldPos.xz) > DISPLAY_RADIUS && screenWorldPos.y > DISPLAY_FLOOR + 0.2) {
       gl_FragColor = vec4(1.0); return;
     }`,
  );
  composer.addPass(contact);
  composer.addPass(new OutputPass());
  function resize(width, height) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    // Contact shading is evaluated at a capped resolution; the main colour
    // image remains multisampled and sharp on desktop and mobile screens.
    const ratio = Math.min(renderer.getPixelRatio(), 1);
    contact.setSize(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
  }
  const size = renderer.getSize(new THREE.Vector2());
  resize(size.x, size.y);
  return {
    composer, contact, resize,
    render() {
      // XR must render through WebXR's stereo cameras, not a mono composer.
      if (renderer.xr.isPresenting) renderer.render(scene, camera);
      else composer.render();
    },
  };
}
