import * as THREE from 'three';
import {LIGHTING_PRESET} from './preset';

/** Small roughness/height variations, no normal-map dependent change to silhouettes. */
function surfaceTexture(kind:string) {
  const size = 512,
    data = new Uint8Array(size * size * 4);
  let seed = 1984;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 4294967296 - 0.5;
      const weave = Math.sin((x * Math.PI) / 5) * Math.sin((y * Math.PI) / 5);
      const value =
        kind === 'fabric-height'
          ? 128 + weave * 35 + noise * 9
          : kind === 'fabric-roughness'
            ? 246 + weave * 5 + noise * 3
            : 236 + Math.sin(x * 0.18 + Math.sin(y * 0.009) * 0.3) * 10 + noise * 2;
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, Math.round(value)));
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'Subtle_' + kind;
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(kind.startsWith('fabric') ? 4 : 1, kind.startsWith('fabric') ? 4 : 1);
  texture.needsUpdate = true;
  return texture;
}

export function tuneBowlingMaterials(model:THREE.Group, renderer:THREE.WebGLRenderer|undefined, preset:typeof LIGHTING_PRESET) {
  const originalTextures=new Set<THREE.Texture>();model.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value instanceof THREE.Texture)originalTextures.add(value);});
  const replacements = new Map<THREE.Material,THREE.MeshStandardMaterial>(),
    textures = {
      wood: surfaceTexture('wood-roughness'),
      fabric: surfaceTexture('fabric-roughness'),
      height: surfaceTexture('fabric-height'),
    };
  const maxAnisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.receiveShadow = true;
    o.castShadow = !/Foundation|SocialFloor|SideWalk|Approach|Lane_\d+_Deck/.test(o.name);
    const original = Array.isArray(o.material) ? o.material : [o.material];
    const tuned = original.map((source:THREE.Material) => {
      if (replacements.has(source)) return replacements.get(source);
      // Keep the GLB's colors, UV channels, baked AO, emissive values and maps.
      const m = new THREE.MeshStandardMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(m, source);
      m.name = source.name;
      const name = m.name;
      m.envMapIntensity = 1;
      if (m.aoMap) m.aoMapIntensity = preset.materials.ao;
      if (/LaneWood/.test(name)) {
        m.roughness = preset.materials.laneRoughness;
        m.metalness = 0;
        m.roughnessMap = textures.wood;
        m.color.multiply(new THREE.Color('#f2e5ce'));
      } else if (/OliveFabric/.test(name)) {
        m.roughness = preset.materials.fabricRoughness;
        m.metalness = 0;
        m.envMapIntensity = 0.45;
        m.color.multiplyScalar(preset.materials.fabricGain);
        m.roughnessMap = textures.fabric;
        m.bumpMap = textures.height;
        m.bumpScale = preset.materials.fabricBumpScale;
      } else if (/^Ball \|/.test(name)) {
        m.roughness = preset.materials.ballRoughness;
        m.metalness = 0;
        m.envMapIntensity = 0.55;
        m.flatShading = false;
        m.vertexColors = false;
        // Balls have clean resin-like surfaces: no grain, weave, bump or normal texture.
        m.map = m.roughnessMap = m.metalnessMap = m.bumpMap = m.normalMap = m.aoMap = null;
      } else if (/Rafter|Leather/.test(name)) {
        m.roughness = /Rafter/.test(name) ? 0.68 : 0.62;
        m.metalness = 0;
      } else if (/bronze|Brass/i.test(name)) {
        m.roughness = 0.53;
        m.metalness = /Brass/.test(name) ? 0.5 : 0.62;
        m.envMapIntensity = 0.75;
      } else if (/PinePlastic/.test(name)) {
        m.roughness = 0.48;
        m.metalness = 0;
      } else if (/PinIvory/.test(name)) m.roughness = 0.36;
      else if (/roof deck/.test(name)) m.roughness = 0.87;
      if (/diffuser/i.test(name)) m.emissiveIntensity = 2.5;
      for (const key of ['map', 'aoMap', 'roughnessMap', 'bumpMap'] as const)
        if (m[key]) m[key].anisotropy = maxAnisotropy;
      m.needsUpdate = true;
      replacements.set(source, m);
      return m;
    });
    o.material = Array.isArray(o.material) ? tuned : tuned[0];
  });
  for (const source of replacements.keys()) source.dispose();
  const used=new Set<THREE.Texture>();for(const m of replacements.values())for(const value of Object.values(m))if(value instanceof THREE.Texture)used.add(value);
  const images=new Set([...used].map(t=>t.source.data));for(const t of originalTextures)if(!used.has(t)){t.dispose();const image=t.source.data;if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap&&!images.has(image))image.close();}
  for(const t of Object.values(textures))if(!used.has(t))t.dispose();
  model.userData.materialProfile = preset.name;
}
