import { Matrix4,Mesh,PlaneGeometry,ShaderMaterial,UnsignedByteType,Vector2,Vector3,Vector4 } from 'three';
import type { Camera,Group,Object3D,Scene,WebGLRenderer } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Refractor } from 'three/addons/objects/Refractor.js';
import { WaterScene } from './WaterScene';
import { WATER } from './waterConfig';
import { clearWaterFragment,clearWaterVertex } from './waterShaders';
import type { WaterUniforms } from './waterShaders';

/** One clipped underwater pass and one bounded planar-reflection pass per visible eye. */
export class ClearWater extends Mesh<PlaneGeometry,ShaderMaterial> {
  readonly reflection:Reflector;
  readonly refraction:Refractor;
  private low=false;
  private captureScene=new WaterScene();
  private capturing=false;
  private released=false;
  private preparedCamera:Camera|null=null;
  private preparedTime=-Infinity;
  constructor(shared:WaterUniforms){
    const geometry=new PlaneGeometry(WATER.width,WATER.depth,32,18);
    const reflection=new Reflector(geometry,{textureWidth:WATER.reflectionResolution,textureHeight:WATER.reflectionResolution,clipBias:.003,multisample:0});
    const refraction=new Refractor(geometry,{textureWidth:WATER.refractionResolution,textureHeight:WATER.refractionResolution,clipBias:.003,multisample:0});
    const reflectionShader=reflection.material as ShaderMaterial;
    const material=new ShaderMaterial({
      name:'Clear indoor water',transparent:true,depthWrite:false,depthTest:true,
      uniforms:{
        uTime:shared.time,uDetail:shared.detail,uSpeed:{value:WATER.waveSpeed},uAmplitude:{value:WATER.waveAmplitude},
        uNormal:{value:WATER.normalStrength},uClarity:{value:WATER.clarity},uAbsorption:{value:new Vector3(...WATER.absorption)},
        uRefractionStrength:{value:WATER.refractionStrength},uReflectionStrength:{value:WATER.reflectionStrength},
        uBlur:{value:WATER.reflectionBlur},uHighlightGain:{value:WATER.highlightGain},uSurfaceY:{value:WATER.surfaceY},uFloorY:{value:WATER.tileTopY},
        uReflection:{value:reflection.getRenderTarget().texture},uRefraction:{value:refraction.getRenderTarget().texture},
        uReflectionMatrix:{value:reflectionShader.uniforms.textureMatrix.value as Matrix4},
        uRefractionMatrix:{value:refraction.material.uniforms.textureMatrix.value as Matrix4},
        uReflectionTexel:{value:new Vector2(1/WATER.reflectionResolution,1/WATER.reflectionResolution)},uHasReflection:{value:0},
      },vertexShader:clearWaterVertex,fragmentShader:clearWaterFragment,
    });
    super(geometry,material);this.reflection=reflection;this.refraction=refraction;
    this.name='clear-water-surface';this.rotation.x=-Math.PI/2;this.position.y=WATER.surfaceY;
    this.renderOrder=1;this.userData.dynamic=true;this.userData.noShadow=true;
    material.addEventListener('dispose',()=>this.release());
    this.onBeforeRender=(renderer,scene,camera)=>{
      if(camera===this.preparedCamera&&this.preparedTime===this.material.uniforms.uTime.value)return;
      this.capture(renderer,scene,camera);
    };
  }
  prepare(renderer:WebGLRenderer,scene:Scene,camera:Camera):void{
    this.updateWorldMatrix(true,false);this.capture(renderer,scene,camera);
    this.preparedCamera=camera;this.preparedTime=this.material.uniforms.uTime.value;
  }
  setLowQuality(low:boolean):void{this.low=low;}
  private capture(renderer:WebGLRenderer,scene:Scene,camera:Camera):void{
    if(this.capturing||this.released)return;
    this.capturing=true;
    const saved={target:renderer.getRenderTarget(),xr:renderer.xr.enabled,shadowEnabled:renderer.shadowMap.enabled,shadowAuto:renderer.shadowMap.autoUpdate,
      shadowDirty:renderer.shadowMap.needsUpdate,viewport:renderer.getViewport(new Vector4()),scissor:renderer.getScissor(new Vector4()),scissorTest:renderer.getScissorTest()};
    const overlays:Object3D[]=[];
    scene.traverse(object=>{if(object.visible&&object.renderOrder>=1000){overlays.push(object);object.visible=false;}});
    const refractionSize=this.low?WATER.lowResolution:renderer.xr.isPresenting?WATER.xrResolution:WATER.refractionResolution;
    const reflectionSize=renderer.xr.isPresenting?256:WATER.reflectionResolution;
    try{
      const opticalScene=this.captureScene.sync(scene,this);
      this.visible=false;
      renderer.setScissorTest(false);renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      this.reflection.matrixWorld.copy(this.matrixWorld);this.refraction.matrixWorld.copy(this.matrixWorld);
      const refractTarget=this.refraction.getRenderTarget(),reflectTarget=this.reflection.getRenderTarget();
      if(!renderer.extensions.has('EXT_color_buffer_float')&&!renderer.extensions.has('EXT_color_buffer_half_float')){
        refractTarget.texture.type=UnsignedByteType;reflectTarget.texture.type=UnsignedByteType;
      }
      refractTarget.setSize(refractionSize,refractionSize);reflectTarget.setSize(reflectionSize,reflectionSize);
      // Use the actual render camera, including each XR eye / Cardboard camera.
      this.refraction.onBeforeRender(renderer,opticalScene,camera,this.geometry,this.refraction.material,this.parent as Group);
      if(!this.low){
        this.reflection.onBeforeRender(renderer,opticalScene,camera,this.geometry,this.reflection.material as ShaderMaterial,this.parent as Group);
        (this.material.uniforms.uReflectionTexel.value as Vector2).set(1/reflectionSize,1/reflectionSize);
      }
      this.material.uniforms.uHasReflection.value=this.low?0:1;
    }finally{
      renderer.xr.enabled=saved.xr;renderer.shadowMap.enabled=saved.shadowEnabled;renderer.shadowMap.autoUpdate=saved.shadowAuto;renderer.shadowMap.needsUpdate=saved.shadowDirty;
      renderer.setRenderTarget(saved.target);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);
      const eyeViewport=(camera as Camera&{viewport?:Vector4}).viewport;
      if(eyeViewport)renderer.state.viewport(eyeViewport);
      overlays.forEach(object=>object.visible=true);this.visible=true;this.capturing=false;
    }
  }
  private release():void{
    if(this.released)return;this.released=true;this.onBeforeRender=()=>{};
    this.reflection.dispose();this.refraction.dispose();this.captureScene.dispose();
  }
}
