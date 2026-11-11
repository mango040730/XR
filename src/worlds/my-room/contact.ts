import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {hub} from './hub';

export function bakeContacts(renderer: THREE.WebGLRenderer,scene: THREE.Scene,root: THREE.Group,onDispose: (cleanup: () => void) => void){
  const size=1024,extent=8.6,target=new THREE.WebGLRenderTarget(size,size),scratch=new THREE.WebGLRenderTarget(size,size,{depthBuffer:false});
  const camera=new THREE.OrthographicCamera(-extent/2,extent/2,extent/2,-extent/2,.001,.85);
  camera.position.set(0,-.01,0);camera.up.set(0,0,-1);camera.lookAt(0,1,0);camera.updateMatrixWorld();
  onDispose(()=>target.dispose());
  const visibility=new Map<THREE.Object3D, boolean>();
  scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;visibility.set(o,o.visible);
    let furniture=false;for(let p: THREE.Object3D | null=o;p;p=p.parent)if(p.userData.collider)furniture=true;
    o.visible=o.visible&&furniture;
  });
  const original={background:scene.background,override:scene.overrideMaterial,shadow:renderer.shadowMap.enabled,target:renderer.getRenderTarget(),alpha:renderer.getClearAlpha(),color:renderer.getClearColor(new THREE.Color())};
  const depth=new THREE.MeshDepthMaterial();
  depth.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','gl_FragColor = vec4( 0.0, 0.0, 0.0, 0.65 * pow(1.0 - fragCoordZ, 2.0) );');};
  const blur=new THREE.ShaderMaterial({uniforms:{image:{value:null as THREE.Texture | null},direction:{value:new THREE.Vector2()}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 direction;varying vec2 vUv;void main(){vec4 c=texture2D(image,vUv)*.227027;c+=(texture2D(image,vUv+direction*1.384615)+texture2D(image,vUv-direction*1.384615))*.316216;c+=(texture2D(image,vUv+direction*3.230769)+texture2D(image,vUv-direction*3.230769))*.070270;gl_FragColor=c;}`,depthTest:false,depthWrite:false});
  const quad=new FullScreenQuad(blur);
  try {
  scene.background=null;scene.overrideMaterial=depth;renderer.shadowMap.enabled=false;
  renderer.setClearColor(0,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
  visibility.forEach((v,o)=>o.visible=v);scene.background=original.background;scene.overrideMaterial=original.override;renderer.shadowMap.enabled=original.shadow;
  for(let i=0;i<2;i++){
    blur.uniforms.image.value=target.texture;blur.uniforms.direction.value.set(1.5/size,0);renderer.setRenderTarget(scratch);renderer.clear();quad.render(renderer);
    blur.uniforms.image.value=scratch.texture;blur.uniforms.direction.value.set(0,1.5/size);renderer.setRenderTarget(target);renderer.clear();quad.render(renderer);
  }
  } finally {
    visibility.forEach((visible,object)=>object.visible=visible);
    scene.background=original.background;scene.overrideMaterial=original.override;renderer.shadowMap.enabled=original.shadow;
    renderer.setRenderTarget(original.target);renderer.setClearColor(original.color,original.alpha);
    scratch.dispose();depth.dispose();quad.dispose();blur.dispose();
  }
  target.texture.repeat.x=-1;target.texture.offset.x=1;
  for(const rug of [false,true]){
    const mat=new THREE.MeshBasicMaterial({map:target.texture,transparent:true,depthWrite:false,toneMapped:false,opacity:.85});
    mat.onBeforeCompile=s=>{
      s.vertexShader='varying vec2 floorPoint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloorPoint=position.xy;');
      const s0=hub.stage;
      s.fragmentShader='varying vec2 floorPoint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('void main() {',`void main() {vec2 q=abs(vec2(floorPoint.x,-floorPoint.y)-vec2(${s0.center.join(',')}));bool onStage=q.x<${s0.half[0]} && q.y<${s0.half[1]} && q.x+q.y<${s0.half[0]+s0.half[1]-s0.cut};if(${rug?'!onStage':'onStage'})discard;`);
    };mat.customProgramCacheKey=()=>`personal-hub-contact-${rug}`;
    const receiver=new THREE.Mesh(new THREE.PlaneGeometry(extent,extent),mat);receiver.rotation.x=-Math.PI/2;receiver.position.y=rug?hub.stage.top+.002:.021;receiver.name=rug?'Baked contact / owner platform':'Baked contact / oak';receiver.renderOrder=2;root.add(receiver);
  }
  return {resolution:size,realFurnitureUndersides:true,passesPerFrame:0};
}
