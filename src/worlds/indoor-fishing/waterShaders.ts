import { MeshStandardMaterial } from 'three';
export interface WaterUniforms { time:{value:number}; detail:{value:number} }
const noise = /* glsl */`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise21(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
`;
export const clearWaterVertex = /* glsl */`
uniform float uTime,uSpeed,uAmplitude,uDetail;
uniform mat4 uRefractionMatrix,uReflectionMatrix;
varying vec3 vWorld;
varying vec4 vRefract,vReflect;
void main(){
  vec4 base=modelMatrix*vec4(position,1.0);
  float t=uTime*uSpeed;
  float wave=sin(dot(base.xz,vec2(.83,.56))*3.4+t)*.55+sin(dot(base.xz,vec2(-.45,.89))*6.1-t*.73)*.3+sin(dot(base.xz,vec2(.17,-.98))*11.7+t*.51)*.15;
  vec3 p=position;p.z+=wave*uAmplitude*uDetail;
  vWorld=(modelMatrix*vec4(p,1.0)).xyz;
  vRefract=uRefractionMatrix*vec4(position,1.0);
  vReflect=uReflectionMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}
`;
export const clearWaterFragment = /* glsl */`
uniform sampler2D uRefraction,uReflection;
uniform float uTime,uSpeed,uDetail,uNormal,uRefractionStrength,uReflectionStrength,uClarity,uSurfaceY,uFloorY,uHighlightGain,uBlur,uHasReflection;
uniform vec2 uReflectionTexel;
uniform vec3 uAbsorption;
varying vec3 vWorld;
varying vec4 vRefract,vReflect;
${noise}
vec3 softReflection(vec2 uv){
  vec2 s=uReflectionTexel*uBlur;
  vec3 color=texture2D(uReflection,uv).rgb*.28;
  color+=(texture2D(uReflection,uv+vec2(s.x,0)).rgb+texture2D(uReflection,uv-vec2(s.x,0)).rgb+texture2D(uReflection,uv+vec2(0,s.y)).rgb+texture2D(uReflection,uv-vec2(0,s.y)).rgb)*.12;
  color+=(texture2D(uReflection,uv+s).rgb+texture2D(uReflection,uv-s).rgb+texture2D(uReflection,uv+vec2(s.x,-s.y)).rgb+texture2D(uReflection,uv+vec2(-s.x,s.y)).rgb)*.06;
  return color;
}
void main(){
  vec2 p=vWorld.xz;float t=uTime*uSpeed;
  float warp=(noise21(p*.55+vec2(t*.09,-t*.07))-.5)*.35;
  vec2 slope=vec2(.83,.56)*cos(dot(p,vec2(.83,.56))*3.4+t+warp)*.55;
  slope+=vec2(-.45,.89)*cos(dot(p,vec2(-.45,.89))*6.1-t*.73)*.3;
  slope+=vec2(.17,-.98)*cos(dot(p,vec2(.17,-.98))*11.7+t*.51)*.15;
  slope*=uNormal*uDetail;
  vec3 normal=normalize(vec3(-slope.x,1.0,-slope.y));
  vec3 eye=normalize(cameraPosition-vWorld);
  float cosine=clamp(dot(eye,normal),0.0,1.0);
  float shore=min(4.0-abs(p.x),2.25-abs(p.y));
  float edgeFade=smoothstep(.015,.2,shore);
  vec2 distort=slope*edgeFade;
  vec2 refractUV=vRefract.xy/vRefract.w+distort*uRefractionStrength;
  refractUV=clamp(refractUV,vec2(.001),vec2(.999));
  vec3 bottom=texture2D(uRefraction,refractUV).rgb;
  float path=min(6.0,(uSurfaceY-uFloorY)/max(eye.y,.22))*(.92+.08*smoothstep(0.0,1.0,shore));
  vec3 transmission=exp(-uAbsorption*path)*uClarity;
  vec3 color=bottom*transmission+vec3(.05,.12,.105)*(1.0-transmission)*.35;
  if(uHasReflection>.5){
    vec2 reflectUV=vReflect.xy/vReflect.w+distort*.085;
    vec3 reflection=clamp(softReflection(clamp(reflectUV,vec2(.005),vec2(.995))),vec3(0.0),vec3(4.0));
    float fresnel=.02+.98*pow(1.0-cosine,5.0);
    float amount=min(.38,fresnel*uReflectionStrength);
    color=mix(color,reflection,amount);
    // Only actual high-radiance reflected objects contribute a soft light glint.
    // There are no screen-fixed circles or analytical lamp stamps.
    vec3 lamps=max(reflection-vec3(.8),vec3(0.0));
    color+=lamps*uHighlightGain*(.12+amount*.6);
  }
  gl_FragColor=vec4(clamp(color,vec3(0.0),vec3(1.8)),1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
/** Gentle, non-periodic illumination on real underwater tile geometry. */
export function underwaterMaterial(uniforms:WaterUniforms,causticsStrength:number):MeshStandardMaterial {
  const material=new MeshStandardMaterial({color:'#ffffff',roughness:.86,metalness:0});
  material.customProgramCacheKey=()=> 'quiet-underwater-tiles-v3';
  material.onBeforeCompile=shader=>{
    shader.uniforms.uWaterTime=uniforms.time;shader.uniforms.uWaterDetail=uniforms.detail;
    shader.uniforms.uCaustics={value:causticsStrength};
    shader.vertexShader='varying vec3 vUnderwater;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 underPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      underPosition=instanceMatrix*underPosition;
      #endif
      vUnderwater=(modelMatrix*underPosition).xyz;
    `);
    shader.fragmentShader=`uniform float uWaterTime,uWaterDetail,uCaustics;varying vec3 vUnderwater;\n${noise}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec2 p=vUnderwater.xz;float t=uWaterTime*.035;
      vec2 warp=vec2(noise21(p*.71+vec2(t,-t*.6)),noise21(p*.63-vec2(t*.8,t)))-.5;
      float light=noise21(p*2.1+warp*.8+vec2(t*.4,-t*.3));
      float glow=smoothstep(.54,.91,light);
      totalEmissiveRadiance+=vec3(.85,.8,.64)*glow*uCaustics*uWaterDetail;
    `);
  };
  return material;
}
