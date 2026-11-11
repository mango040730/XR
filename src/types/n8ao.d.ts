declare module 'n8ao' {
  import type {Camera,Scene,WebGLRenderTarget} from 'three';
  import {Pass} from 'three/addons/postprocessing/Pass.js';
  export class N8AOPass extends Pass {
    constructor(scene:Scene,camera:Camera,width?:number,height?:number);
    depthDownsampleTarget:WebGLRenderTarget|null;
    configuration:{aoRadius:number;intensity:number;distanceFalloff:number;denoiseRadius:number;halfRes:boolean;depthAwareUpsampling:boolean;gammaCorrection:boolean};
    setQualityMode(mode:'Performance'|'Low'|'Medium'|'High'|'Ultra'):void;
  }
}
