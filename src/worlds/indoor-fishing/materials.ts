import { Color,MeshStandardMaterial } from 'three';
import type { ColorRepresentation } from 'three';
import { palette as c } from './style';

export type Finish='wood'|'paint'|'metal'|'stone'|'plain';
const wood=new Set<string>([c.wood,c.edge,c.plank,c.honey,c.roofSeam]);
const paint=new Set<string>([c.wall,c.deepTeal,c.olive]);
function finish(color:string):Finish{
  if(wood.has(color))return 'wood';if(paint.has(color))return 'paint';
  if(color===c.charcoal)return 'metal';
  if([c.floor,c.floorTile,c.floorAlternate,c.ivory].some(value=>value===color))return 'stone';
  return 'plain';
}
/** Fine world-space variation survives batching without UV seams or image downloads. */
export function vintageMaterial(color:ColorRepresentation,role?:Finish):MeshStandardMaterial{
  const value='#'+new Color(color).getHexString().toUpperCase();
  const kind=role??finish(value);
  const material=new MeshStandardMaterial({color,roughness:kind==='wood'?.73:kind==='paint'?.8:kind==='metal'?.62:.9,metalness:kind==='metal'?.38:0,flatShading:true,vertexColors:true});
  material.name=`vintage:${kind}:${value}`;
  material.customProgramCacheKey=()=>`vintage-${kind}-v1`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vFinishPosition,vFinishNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 finishPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      finishPosition=instanceMatrix*finishPosition;
      #endif
      vFinishPosition=(modelMatrix*finishPosition).xyz;
      vFinishNormal=normalize(mat3(modelMatrix)*normal);
    `);
    shader.fragmentShader=`varying vec3 vFinishPosition,vFinishNormal;
      float finishNoise(vec3 p){return fract(sin(dot(floor(p),vec3(12.9898,78.233,37.719)))*43758.5453);}
      \n`+shader.fragmentShader;
    // The colour attribute stores baked ambient visibility, not a base-colour tint.
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','');
    const variation=kind==='wood'?`
      vec3 p=vFinishPosition;
      vec3 n=abs(normalize(vFinishNormal));
      // Vertical faces favour long fibres; broad horizontal boards run along X.
      float along=n.y>.65?p.x:p.y;
      float across=n.y>.65?p.z:(n.x>n.z?p.z:p.x);
      float bend=sin(along*1.7+across*2.3)*.18+sin(along*4.1)*.045;
      float grain=sin(across*70.0+bend*7.0)*.5+.5;
      float pores=pow(grain,10.0);
      float detailFade=1.0-smoothstep(.3,1.2,fwidth(across*70.0));
      diffuseColor.rgb*=.97+.025*sin(across*18.0+bend)-.035*pores*detailFade;
      roughnessFactor=clamp(roughnessFactor+pores*.055,.6,.9);
    `:kind==='paint'?`
      float grain=finishNoise(vFinishPosition*145.0);
      diffuseColor.rgb*=.98+.035*grain;
      roughnessFactor=clamp(roughnessFactor+(grain-.5)*.07,.7,.9);
    `:kind==='stone'?`
      diffuseColor.rgb*=.98+.025*finishNoise(vFinishPosition*95.0);
    `:'';
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\n${variation}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
      #ifdef USE_COLOR
        reflectedLight.indirectDiffuse*=vColor.r;
        reflectedLight.indirectSpecular*=vColor.r;
      #endif
    `);
  };
  return material;
}
