import {BufferGeometry,Float32BufferAttribute,Points,ShaderMaterial,Color} from 'three';
/** Original ZIP's 35 dust sparkles, hosted by the common world lifecycle. */
export function createSparkles(){
 const geometry=new BufferGeometry();const positions=[];for(let i=0;i<35;i++)positions.push((Math.random()-.5)*14,(Math.random()-.5)*3.7,(Math.random()-.5)*12);
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 const material=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},pixelRatio:{value:1},color:{value:new Color('#fff6d6')}},vertexShader:`uniform float time;uniform float pixelRatio;void main(){vec4 p=modelMatrix*vec4(position,1.);float phase=time*.15+p.x*100.;p.xyz+=vec3(cos(phase),sin(phase),cos(phase))*.2;vec4 v=viewMatrix*p;gl_Position=projectionMatrix*v;gl_PointSize=1.3*25.*pixelRatio/max(.01,-v.z);}`,fragmentShader:`uniform vec3 color;void main(){float strength=.05/max(.001,distance(gl_PointCoord,vec2(.5)))-.1;gl_FragColor=vec4(color,strength*.22);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const points=new Points(geometry,material);points.name='Original atelier / sparkles';points.position.y=2;
 points.onBeforeRender=renderer=>{material.uniforms.pixelRatio.value=renderer.getPixelRatio();};
 return {points,update:(time:number)=>{material.uniforms.time.value=time;}};
}
