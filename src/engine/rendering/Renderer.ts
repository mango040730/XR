import { ACESFilmicToneMapping, Color, HalfFloatType, Mesh, NoToneMapping, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, Texture, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { renderPixelRatio } from './profile';
import type { RenderProfile } from './profile';
import type { WorldInstance } from '../world/types';

export class Renderer {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.05, 150);
  readonly webgl: WebGLRenderer;
  private observer: ResizeObserver;
  private host: HTMLElement;
  private profile:RenderProfile={};
  private root:WorldInstance['root']|null=null;
  private low=false;
  private softwareGPU=false;
  private composer?:EffectComposer;
  private bloom?:UnrealBloomPass;
  private output?:OutputPass;
  private scenePass?:RenderPass;

  constructor(host: HTMLElement) {
    this.host = host;
    this.webgl = new WebGLRenderer({ antialias: true, powerPreference:'high-performance' });
    const gl=this.webgl.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    const backend=String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));
    this.softwareGPU=/SwiftShader|llvmpipe|softpipe|Software Rasterizer/i.test(backend);
    this.webgl.setPixelRatio(renderPixelRatio(window.devicePixelRatio,false));
    this.webgl.outputColorSpace = SRGBColorSpace;
    this.webgl.shadowMap.enabled=true;this.webgl.shadowMap.type=PCFShadowMap;
    // Architecture and seats are static. Refresh one shadow map on scene/visibility changes.
    this.webgl.shadowMap.autoUpdate=false;
    this.webgl.info.autoReset=false;
    this.webgl.xr.enabled = true;
    this.webgl.xr.setReferenceSpaceType('local-floor');
    this.webgl.domElement.setAttribute('aria-label', '3D 공간. 클릭 후 WASD로 이동, 마우스로 시점 조절. Esc로 해제.');
    this.host.append(this.webgl.domElement);
    this.scene.background = new Color('#172b3a');
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  configure(world:WorldInstance|null):void {
    this.root=world?.root??null;this.profile=world?.config.rendering??{};this.low=false;
    this.camera.near=this.profile.near??.05;this.camera.far=this.profile.far??150;
    this.webgl.toneMapping=this.profile.filmic?ACESFilmicToneMapping:NoToneMapping;
    this.webgl.toneMappingExposure=this.profile.exposure??1;
    this.webgl.shadowMap.needsUpdate=true;
    if(this.profile.bloom&&!this.composer&&!this.softwareGPU){
      const target=new WebGLRenderTarget(1,1,{type:HalfFloatType,samples:Math.min(2,this.webgl.capabilities.maxSamples)});
      this.composer=new EffectComposer(this.webgl,target);
      this.scenePass=new RenderPass(this.scene,this.camera);this.composer.addPass(this.scenePass);
      this.bloom=new UnrealBloomPass(new Vector2(1,1),this.profile.bloom,.32,1.15);this.composer.addPass(this.bloom);
      this.output=new OutputPass();this.composer.addPass(this.output);
    }else if(!this.profile.bloom||this.softwareGPU)this.disposeEffects();
    if(this.bloom)this.bloom.strength=this.profile.bloom??0;
    this.resize();
  }
  setQuality(low:boolean):void {
    if(this.low===low)return;this.low=low;
    if(this.root)this.root.userData.shadowDirty=true;
    this.resize();
  }
  /** Compile all materials (including hidden seat controls) and upload textures before entry. */
  async prepareWorld(world:WorldInstance,signal:AbortSignal):Promise<void>{
    signal.throwIfAborted();
    const staging=new Scene();staging.add(world.root);
    const camera=this.camera.clone();camera.near=world.config.rendering?.near??.05;camera.far=world.config.rendering?.far??150;camera.updateProjectionMatrix();camera.position.fromArray(world.config.spawn.position);camera.position.y+=world.config.player.eyeHeight;camera.rotation.set(0,world.config.spawn.yaw,0);camera.updateMatrixWorld(true);
    const previous=this.webgl.toneMapping;
    try {
      let compiled:Promise<import('three').Object3D>;
      try {
        this.webgl.toneMapping=world.config.rendering?.filmic?ACESFilmicToneMapping:NoToneMapping;
        // Restore synchronously: a stale async preparation must never overwrite a newer world's profile.
        compiled=this.webgl.compileAsync(staging,camera);
      }finally{this.webgl.toneMapping=previous;}
      await compiled;signal.throwIfAborted();
      const textures=new Set<Texture>();
      world.root.traverse(object=>{if(object instanceof Mesh)for(const m of Array.isArray(object.material)?object.material:[object.material])for(const value of Object.values(m))if(value instanceof Texture)textures.add(value);});
      for(const texture of textures){signal.throwIfAborted();this.webgl.initTexture(texture);}
    }finally{world.root.removeFromParent();}
  }
  prepareFrame():void {
    this.webgl.info.reset();
    if(this.root?.userData.shadowDirty){this.webgl.shadowMap.needsUpdate=true;this.root.userData.shadowDirty=false;}
  }
  render(delta:number):void {
    // Optical prepasses must run before opening the main MSAA render target.
    if(!this.webgl.xr.isPresenting){this.scene.updateMatrixWorld(true);this.camera.updateWorldMatrix(true,false);this.root?.userData.prepareRender?.(this.webgl,this.scene,this.camera);}
    // Immersive XR and narrow/mobile displays use the direct, single-scene pass.
    if(this.composer&&!this.low&&!this.webgl.xr.isPresenting&&this.host.clientWidth>=768)this.composer.render(delta);
    else this.webgl.render(this.scene,this.camera);
  }
  private resize(): void {
    if (this.webgl.xr.isPresenting) return;
    const width = Math.max(1, this.host.clientWidth),height = Math.max(1, this.host.clientHeight);
    this.webgl.setPixelRatio(renderPixelRatio(window.devicePixelRatio,this.low));
    this.webgl.setSize(width, height);
    this.composer?.setPixelRatio(this.webgl.getPixelRatio());this.composer?.setSize(width,height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  private disposeEffects():void{
    this.bloom?.dispose();this.output?.dispose();this.scenePass?.dispose();this.composer?.dispose();
    this.bloom=undefined;this.output=undefined;this.scenePass=undefined;this.composer=undefined;
  }
  restoreSize(): void { this.resize(); }
  dispose(): void {
    this.webgl.setAnimationLoop(null);this.disposeEffects();
    this.observer.disconnect();this.webgl.dispose();this.webgl.domElement.remove();
  }
}
