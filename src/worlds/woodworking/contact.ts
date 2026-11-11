import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

export function bakeContacts(renderer: THREE.WebGLRenderer,scene: THREE.Scene,root: THREE.Group,onDispose: (cleanup: () => void) => void){
  const size=1024,extent=19,target=new THREE.WebGLRenderTarget(size,size),scratch=new THREE.WebGLRenderTarget(size,size,{depthBuffer:false});
  const camera=new THREE.OrthographicCamera(-extent/2,extent/2,extent/2,-extent/2,.001,2.2);
  camera.position.set(0,.008,0);camera.up.set(0,0,-1);camera.lookAt(0,1,0);camera.updateMatrixWorld();
  onDispose(()=>target.dispose());
  const visibility=new Map<THREE.Object3D, boolean>();
  scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;visibility.set(o,o.visible);
    o.visible=o.visible&&o.castShadow;
  });
  const original={background:scene.background,override:scene.overrideMaterial,shadow:renderer.shadowMap.enabled,target:renderer.getRenderTarget(),alpha:renderer.getClearAlpha(),color:renderer.getClearColor(new THREE.Color())};
  const depth=new THREE.MeshDepthMaterial();
  depth.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','gl_FragColor = vec4( 0.0, 0.0, 0.0, pow(1.0 - fragCoordZ, 2.0) );');};
  const blur=new THREE.ShaderMaterial({uniforms:{image:{value:null as THREE.Texture | null},direction:{value:new THREE.Vector2()}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 direction;varying vec2 vUv;void main(){vec4 c=texture2D(image,vUv)*.227027;c+=(texture2D(image,vUv+direction*1.384615)+texture2D(image,vUv-direction*1.384615))*.316216;c+=(texture2D(image,vUv+direction*3.230769)+texture2D(image,vUv-direction*3.230769))*.070270;gl_FragColor=c;}`,depthTest:false,depthWrite:false});
  const quad=new FullScreenQuad(blur);
  try {
  scene.background=null;scene.overrideMaterial=depth;renderer.shadowMap.enabled=false;
  renderer.setClearColor(0,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
  visibility.forEach((v,o)=>o.visible=v);scene.background=original.background;scene.overrideMaterial=original.override;renderer.shadowMap.enabled=original.shadow;
  for(let i=0;i<2;i++){
    blur.uniforms.image.value=target.texture;blur.uniforms.direction.value.set(1.25/size,0);renderer.setRenderTarget(scratch);renderer.clear();quad.render(renderer);
    blur.uniforms.image.value=scratch.texture;blur.uniforms.direction.value.set(0,1.25/size);renderer.setRenderTarget(target);renderer.clear();quad.render(renderer);
  }
  } finally {
    visibility.forEach((visible,object)=>object.visible=visible);
    scene.background=original.background;scene.overrideMaterial=original.override;renderer.shadowMap.enabled=original.shadow;
    renderer.setRenderTarget(original.target);renderer.setClearColor(original.color,original.alpha);
    scratch.dispose();depth.dispose();quad.dispose();blur.dispose();
  }
  target.texture.repeat.x=-1;target.texture.offset.x=1;
  const mat=new THREE.MeshBasicMaterial({color:'#5e4a32',map:target.texture,transparent:true,depthWrite:false,toneMapped:false,opacity:.28});
  const receiver=new THREE.Mesh(new THREE.PlaneGeometry(extent,extent),mat);receiver.rotation.x=-Math.PI/2;receiver.position.y=.008;receiver.name='Original atelier / baked contact shadows';receiver.renderOrder=2;root.add(receiver);
  return {resolution:size,passesPerFrame:0};
}
