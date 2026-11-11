// Material shaders from the supplied myroom-glb package. Each call owns its maps.
import * as THREE from 'three';

export const palette=Object.freeze({Leather:'#5E3721','Fall Leaves':'#8D5C2F',Mustard:'#C5953E','Trail Dust':'#C8B38B','Field Notes':'#F4EEE6','Pine Dew':'#BFBFA2','Moss Pillow':'#7E7639','PNW Breeze':'#443B1C'});
export const settings=Object.freeze({bevelSegments:2,ambientIntensity:.30,exposure:1.10,shadowSize:2048,aoIntensity:.48,aoRadius:.27,highDpr:1.25});

function texture(kind: string){
  const n=256,c=document.createElement('canvas');c.width=c.height=n;
  const ctx=c.getContext('2d')!,im=ctx.createImageData(n,n);let seed=1729;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n*Math.PI*2,v=y/n*Math.PI*2;
    let h=.92;
    if(kind==='wood')h=.95+.012*Math.sin(v*34+.12*Math.sin(u)+.06*Math.sin(u*2))+.004*Math.sin(v*79+.1*Math.sin(u))+.005*Math.sin(v*9+.08*Math.sin(u));
    if(kind==='linen')h=.92+.025*(Math.sin(u*64)+Math.sin(v*64))+.02*(rand()-.5);
    if(kind==='plaster')h=.95+.018*(rand()-.5)+.008*Math.sin(u*7)*Math.sin(v*9);
    if(kind==='rug')h=.91+.028*(Math.sin(u*85)+Math.sin(v*85))+.018*(rand()-.5);
    const i=(y*n+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=Math.min(255,h*255);im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  return {map};
}

export function createMaterials(){
  const maps=Object.fromEntries(['wood','linen','plaster','rug'].map(k=>[k,texture(k)]));
  const make=(name: string,color: string,kind: string,roughness: number,scale=1,vertical=false,microBump: number | null=null)=>{
    const {map}=maps[kind];
    const m=new THREE.MeshStandardMaterial({name,color,roughness,metalness:0});
    // Metric triplanar color projection keeps grain consistent on bevelled solids.
    m.onBeforeCompile=s=>{
      s.uniforms.surfaceMap={value:map};
      s.vertexShader='attribute vec3 surfacePosition; attribute vec3 surfaceNormal; varying vec3 vLocal; varying vec3 nLocal;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLocal=surfacePosition; nLocal=surfaceNormal;');
      s.fragmentShader='uniform sampler2D surfaceMap; varying vec3 vLocal; varying vec3 nLocal;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        vec3 w=pow(abs(normalize(nLocal)),vec3(8.));w/=max(w.x+w.y+w.z,.001);
        vec3 p=${vertical?'vLocal.yxz':'vLocal'}*${scale.toFixed(2)};
        vec3 tex=texture2D(surfaceMap,p.zy).rgb*w.x+texture2D(surfaceMap,p.xz).rgb*w.y+texture2D(surfaceMap,p.xy).rgb*w.z;
        float surfaceHeight=dot(tex,vec3(.333333));diffuseColor.rgb*=tex;`);
      s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(1.-surfaceHeight)*.15-.015,.5,1.);');
      s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
        vec3 r1=cross(sy,normal),r2=cross(normal,sx);float determinant=dot(sx,r1);
        vec3 gradient=sign(determinant)*(dFdx(surfaceHeight)*r1+dFdy(surfaceHeight)*r2);
        if(abs(determinant)>.00000001)normal=normalize(abs(determinant)*normal-${(microBump??(kind==='wood'||kind==='plaster'?.003:.008)).toFixed(4)}*gradient);`);
    };
    m.customProgramCacheKey=()=>`lounge-${kind}-${scale}-${vertical}-${microBump}`;m.userData.surface=kind;m.userData.surfaceTexture=map;return m;
  };
  const m={
    wall:make('Field Notes / mineral plaster',palette['Field Notes'],'plaster',.92,3),
    lime:make('Trail Dust / relief plaster',palette['Trail Dust'],'plaster',.93,3),
    oak:make('Trail Dust / pale oak',palette['Trail Dust'],'wood',.84,1.2),
    walnut:make('Fall Leaves / oiled timber',palette['Fall Leaves'],'wood',.84,1.4),
    oakV:make('Trail Dust / vertical oak',palette['Trail Dust'],'wood',.84,1.2,true),
    walnutV:make('Fall Leaves / vertical timber',palette['Fall Leaves'],'wood',.84,1.4,true),
    dark:make('Leather / timber joinery',palette.Leather,'wood',.8,1.3),
    cream:make('Field Notes / linen',palette['Field Notes'],'linen',.97,2.2,false,.0025),
    signature:make('Trail Dust / signature soft linen',palette['Trail Dust'],'linen',.98,1.8,false,.0015),
    sage:make('Pine Dew / linen',palette['Pine Dew'],'linen',.97,2.2,false,.0025),
    olive:make('Moss Pillow / woven cotton',palette['Moss Pillow'],'linen',.96,3),
    ochre:make('Mustard / small accent',palette.Mustard,'linen',.95,3),
    rug:make('Trail Dust / woven wool',palette['Trail Dust'],'rug',1,10),
    entryRug:make('Moss Pillow / accent entry wool',palette['Moss Pillow'],'rug',.99,4,false,.0005),
    ceramic:new THREE.MeshStandardMaterial({name:'Cream glazed stoneware',color:palette['Field Notes'],roughness:.36}),
    terracotta:new THREE.MeshStandardMaterial({name:'Matte terracotta',color:palette['Fall Leaves'],roughness:.94}),
    leaf:new THREE.MeshStandardMaterial({name:'Moss / foliage',color:palette['Moss Pillow'],roughness:.9,flatShading:true}),
    leafLight:new THREE.MeshStandardMaterial({name:'Sage / foliage',color:palette['Pine Dew'],roughness:.9,flatShading:true}),
    soil:new THREE.MeshStandardMaterial({color:palette['PNW Breeze'],roughness:1}),
    brass:new THREE.MeshStandardMaterial({color:palette.Mustard,roughness:.4,metalness:.65}),
    glow:new THREE.MeshStandardMaterial({color:palette['Field Notes'],emissive:'#fff0d7',emissiveIntensity:.7,roughness:.8}),
  };
  return m;
}
