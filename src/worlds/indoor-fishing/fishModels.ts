import { BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,SphereGeometry,TubeGeometry,Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FishSpeciesId } from './fishSpecies';

type Point=[number,number,number];
type Profile=ReadonlyArray<readonly [number,number,number]>;
interface Shape {length:number;halfHeight:number;halfWidth:number;tailLength:number;tailHeight:number;back:string;flank:string;belly:string;fin:string;profile:Profile}
const shapes:Record<FishSpeciesId,Shape>={
 pomfret:{length:.44,halfHeight:.17,halfWidth:.047,tailLength:.12,tailHeight:.105,back:'#748e9b',flank:'#bbcdd1',belly:'#e0e7e3',fin:'#889da5',profile:[[0,.13,.22],[.13,.51,.56],[.35,.96,.98],[.55,1,1],[.76,.82,.86],[.94,.36,.44],[1,.12,.18]]},
 mackerel:{length:.56,halfHeight:.077,halfWidth:.058,tailLength:.155,tailHeight:.1,back:'#315e68',flank:'#adc3c2',belly:'#e2e9e0',fin:'#698b91',profile:[[0,.15,.24],[.18,.61,.68],[.4,.96,1],[.62,1,1],[.82,.75,.76],[1,.22,.23]]},
 mullet:{length:.63,halfHeight:.097,halfWidth:.077,tailLength:.155,tailHeight:.105,back:'#65766f',flank:'#b4c1b6',belly:'#dfe6d9',fin:'#81958b',profile:[[0,.18,.28],[.16,.63,.65],[.38,.95,.96],[.65,1,1],[.84,.84,.95],[.96,.63,.7],[1,.49,.5]]},
};
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function radius(shape:Shape,t:number):[number,number]{
 const p=shape.profile;
 for(let i=1;i<p.length;i++)if(t<=p[i][0]){
  const a=p[i-1],b=p[i],f=smooth(a[0],b[0],t);return [(a[1]+(b[1]-a[1])*f)*shape.halfHeight,(a[2]+(b[2]-a[2])*f)*shape.halfWidth];
 }
 return [p[p.length-1][1]*shape.halfHeight,p[p.length-1][2]*shape.halfWidth];
}
function bodyGeometry(shape:Shape):BufferGeometry{
 const positions:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[],rings=36,sides=20;
 const back=new Color(shape.back),flank=new Color(shape.flank),belly=new Color(shape.belly);
 for(let i=0;i<=rings;i++){
  const t=i/rings,[ry,rz]=radius(shape,t);
  for(let j=0;j<=sides;j++){
   const angle=j/sides*Math.PI*2,c=Math.cos(angle);
   positions.push((t-.5)*shape.length,c*ry,Math.sin(angle)*rz);uv.push(t,j/sides);
   const color=belly.clone().lerp(flank,smooth(-.9,-.05,c)).lerp(back,smooth(.25,.95,c));colors.push(color.r,color.g,color.b);
   if(i<rings&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
  }
 }
 // Small, closed end caps retain a tapered peduncle and a species-specific snout.
 for(const end of [0,1]){
  const center=positions.length/3;positions.push((end-.5)*shape.length,0,0);uv.push(end,.5);colors.push(flank.r,flank.g,flank.b);
  const start=end?rings*(sides+1):0;
  for(let j=0;j<sides;j++)if(end)indices.push(center,start+j,start+j+1);else indices.push(center,start+j+1,start+j);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setAttribute('color',new Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
function coloured(g:BufferGeometry,hex:string):BufferGeometry{
 const source=g.index?g.toNonIndexed():g;if(source!==g)g.dispose();
 const p=source.getAttribute('position'),color=new Color(hex),values=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++)color.toArray(values,i*3);
 source.setAttribute('color',new Float32BufferAttribute(values,3));
 if(!source.getAttribute('uv'))source.setAttribute('uv',new Float32BufferAttribute(new Float32Array(p.count*2),2));
 if(!source.getAttribute('normal'))source.computeVertexNormals();return source;
}
function fin(points:Point[],color:string):BufferGeometry{
 const vertices:number[]=[];for(let i=1;i<points.length-1;i++)vertices.push(...points[0],...points[i],...points[i+1]);
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));return coloured(g,color);
}
function merge(parts:BufferGeometry[]):BufferGeometry{const g=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());g.computeBoundingBox();g.computeBoundingSphere();return g;}
function tube(points:Point[],width:number,color:string):BufferGeometry{return coloured(new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),10,width,4,false),color);}
function details(id:FishSpeciesId,shape:Shape):{fixed:BufferGeometry;pectoral:BufferGeometry;tail:BufferGeometry}{
 const {length:l,halfHeight:h,halfWidth:w,fin:c}=shape,parts:BufferGeometry[]=[];
 if(id==='pomfret'){
  for(const side of [-1,1])parts.push(fin([[l*.3,side*h*.6,0],[l*.13,side*h*1.52,0],[-l*.24,side*h*.97,0],[-l*.45,side*h*.22,0]],c));
 }else{
  parts.push(fin([[l*.17,h*.82,0],[l*.09,h*1.83,0],[-l*.07,h*.94,0]],c));
  parts.push(fin([[-l*.16,h*.8,0],[-l*.26,h*1.52,0],[-l*.4,h*.42,0]],c));
  parts.push(fin([[-l*.12,-h*.74,0],[-l*.23,-h*1.48,0],[-l*.39,-h*.38,0]],c));
  if(id==='mackerel')for(let i=0;i<4;i++)for(const side of [-1,1]){
   const x=-l*(.29+i*.05),y=side*h*(.64-i*.1);parts.push(fin([[x,y,0],[x-.014,y+side*.025,0],[x-.026,y*.85,0]],c));
  }
 }
 // Gill covers, small mouths and eyes lie on the body rather than floating beside it.
 for(const side of [-1,1]){
  parts.push(tube([[l*.27,-h*.5,side*w*.63],[l*.2,-h*.14,side*w*.95],[l*.22,h*.3,side*w*.89],[l*.29,h*.5,side*w*.66]],.0018,'#657d80'));
  const eyeT=.84,[ry,rz]=radius(shape,eyeT),eyeY=h*.22,eyeZ=rz*Math.sqrt(1-(eyeY/ry)**2)+.001;
  const eyeR=id==='mullet'?.012:.01,x=(eyeT-.5)*l;
  parts.push(coloured(new SphereGeometry(1,12,8).scale(eyeR,eyeR,.0045).translate(x,eyeY,side*eyeZ),'#e3e7dc'));
  parts.push(coloured(new SphereGeometry(1,12,8).scale(eyeR*.61,eyeR*.66,.003).translate(x+.001,eyeY,side*(eyeZ+.0035)),'#17282b'));
  parts.push(coloured(new SphereGeometry(.0023,6,4).translate(x+.003,eyeY+.003,side*(eyeZ+.0062)),'#eef1e8'));
 }
 const [mouthY,mouthZ]=radius(shape,1);
 parts.push(tube([[l*.501,-mouthY*.25,-mouthZ*.7],[l*.509,-mouthY*.38,0],[l*.501,-mouthY*.25,mouthZ*.7]],id==='mullet'?.003:.0018,'#738c88'));
 const pec:BufferGeometry[]=[];
 for(const side of [-1,1])pec.push(fin([[l*.16,-h*.1,side*w*.85],[l*.02,-h*.48,side*(w+.067)],[-l*.1,-h*.4,side*(w+.035)],[l*.04,-h*.3,side*w]],c));
 const tailParts:BufferGeometry[]=[];
 for(const side of [-1,1])tailParts.push(fin([[.012,0,0],[-shape.tailLength,side*shape.tailHeight,0],[-shape.tailLength*.83,side*shape.tailHeight*.29,0],[-shape.tailLength*.47,0,0]],c));
 return {fixed:merge(parts),pectoral:merge(pec),tail:merge(tailParts)};
}
function bodyMaterial(id:FishSpeciesId,time:{value:number},phase:{value:number}):MeshStandardMaterial{
 const material=new MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.27});material.name=`fish:${id}:silver`;
 material.customProgramCacheKey=()=>`silver-fish-${id}-v1`;
 material.onBeforeCompile=shader=>{
  shader.uniforms.uFishTime=time;shader.uniforms.uFishPhase=phase;
  shader.vertexShader='uniform float uFishTime,uFishPhase;varying vec2 vFishUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vFishUv=uv;transformed.z+=sin(uFishTime*6.0+uFishPhase+uv.x*5.0)*.008*pow(1.0-uv.x,2.0);
  `);
  shader.fragmentShader='varying vec2 vFishUv;\n'+shader.fragmentShader;
  const pattern=id==='mackerel'?`
   float dorsal=smoothstep(-.05,.65,cos(vFishUv.y*6.283185));
   float wave=sin(vFishUv.x*126.0+sin(vFishUv.y*22.0+vFishUv.x*11.0)*1.7);
   float aa=max(fwidth(wave),.03);float stripes=1.0-smoothstep(.18-aa,.34+aa,abs(wave));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.022,.065,.073),stripes*dorsal*.78);
  `:id==='mullet'?`
   float flank=1.0-abs(cos(vFishUv.y*6.283185));
   float rows=abs(sin(vFishUv.y*59.0));float aa=max(fwidth(rows),.035);
   float lines=1.0-smoothstep(.07-aa,.15+aa,rows);
   diffuseColor.rgb*=1.0-lines*flank*.17;
  `:'';
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${pattern}`);
 };
 return material;
}
export interface FishModel {root:Group;species:FishSpeciesId;update(time:number,phase?:number):void}
/** Geometry caches belong to one pool. Models share static detail buffers, never across worlds. */
export class FishModels {
 private templates=new Map<FishSpeciesId,{body:BufferGeometry;fixed:BufferGeometry;pectoral:BufferGeometry;tail:BufferGeometry}>();
 private detailsMaterial=new MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.12,side:DoubleSide});
 create(species:FishSpeciesId):FishModel{
  const shape=shapes[species];let template=this.templates.get(species);
  if(!template){template={body:bodyGeometry(shape),...details(species,shape)};this.templates.set(species,template);}
  const time={value:0},phase={value:0},root=new Group();root.name=`fish:${species}`;root.userData.species=species;
  const body=new Mesh(template.body,bodyMaterial(species,time,phase));body.name='fish-body';root.add(body,new Mesh(template.fixed,this.detailsMaterial));
  const tail=new Group();tail.name='fish-tail';tail.position.x=-shape.length/2;tail.add(new Mesh(template.tail,this.detailsMaterial));root.add(tail);
  const pectoral=new Mesh(template.pectoral,this.detailsMaterial);pectoral.name='fish-pectoral-fins';root.add(pectoral);
  root.traverse(n=>{n.userData.dynamic=true;n.userData.noShadow=true;});
  return {root,species,update(t,p=0){time.value=t;phase.value=p;tail.position.z=Math.sin(t*6+p)*.008;tail.rotation.y=Math.sin(t*6+p)*.26;pectoral.rotation.x=Math.sin(t*4.2+p)*.13;}};
 }
}
