import { BufferGeometry,Color,ConeGeometry,CylinderGeometry,Float32BufferAttribute,Group,IcosahedronGeometry,InstancedMesh,Matrix4,Mesh,MeshBasicMaterial,MeshStandardMaterial,PlaneGeometry,Quaternion,Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { forestPalette as c } from './forestPalette';

const hash=(i:number)=>{const value=Math.sin(i*127.1+311.7)*43758.5453;return value-Math.floor(value);};
const blend=(a:string,b:string,t:number)=>new Color(a).lerp(new Color(b),t);
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const forestGroundY=(x:number,z:number)=>-.24+smooth(1,8,Math.max(Math.abs(x)-8,Math.abs(z)-6))*(Math.sin(x*.16)*Math.cos(z*.13)*.2+Math.sin((x+z)*.11)*.12);
export interface ForestTree {x:number;z:number;height:number;radius:number;pine:boolean}
/** Deterministic clearings around all four sides; no scenery intersects the building. */
export const forestTrees:ForestTree[]=[];
for(const side of [-1,1]){
  for(const x of [-17,-11,-5.5,.5,6,12,18])forestTrees.push({x,z:side*(10.3+hash(x+side)*1.4),height:4.6+hash(x*4+side)*1.5,radius:1.45+hash(x*2)*.35,pine:false});
  for(const z of [-6,-.5,5.5,11])forestTrees.push({x:side*(12+hash(z)*1.2),z,height:4.8+hash(z*3+side)*1.6,radius:1.5+hash(z+3)*.4,pine:false});
  for(let i=0;i<12;i++){
    const along=-32+i*5.7;
    forestTrees.push({x:along,z:side*(19+hash(i+side)*4),height:5+hash(i*7+side)*3,radius:1.8+hash(i+6)*.65,pine:i%5===0});
  }
  for(let i=0;i<10;i++)forestTrees.push({x:side*(23+hash(i+9)*8),z:-29+i*6.3,height:5+hash(i+side)*2.8,radius:1.7+hash(i*3)*.7,pine:i%4===0});
}
interface Placement {x:number;y:number;z:number;sx:number;sy:number;sz:number;yaw?:number;color:Color}
function instances(root:Group,name:string,geometry:BufferGeometry,items:Placement[]):InstancedMesh{
  const material=new MeshStandardMaterial({roughness:1,flatShading:true});
  const mesh=new InstancedMesh(geometry,material,items.length),matrix=new Matrix4(),rotation=new Quaternion(),up=new Vector3(0,1,0);
  mesh.name=name;
  items.forEach((p,i)=>{
    rotation.setFromAxisAngle(up,p.yaw??0);matrix.compose(new Vector3(p.x,p.y,p.z),rotation,new Vector3(p.sx,p.sy,p.sz));
    mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,p.color);
  });
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();
  // Retain the instance buffers through Kit's static batching. No per-frame animation.
  // Exterior shadows are supplied locally below, preserving the existing indoor sunlight.
  mesh.userData.dynamic=true;mesh.userData.noShadow=true;
  geometry.addEventListener('dispose',()=>mesh.dispose());root.add(mesh);return mesh;
}
function meadow(root:Group):void{
  const parts:BufferGeometry[]=[];
  // Four joined patches leave an actual 16 x 12m hole under the room and its pool.
  for(const [w,d,x,z] of [[160,74,0,-43],[160,74,0,43],[72,12,-44,0],[72,12,44,0]]){
    const g=new PlaneGeometry(w,d,Math.ceil(w/2),Math.ceil(d/2)).rotateX(-Math.PI/2).translate(x,0,z);
    const p=g.getAttribute('position'),colours=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){
      const px=p.getX(i),pz=p.getZ(i);p.setY(i,forestGroundY(px,pz));
      const variation=(Math.sin(px*.09)+Math.cos(pz*.12)+2)/4;
      const color=blend(c.pineDew,c.mossPillow,.16+variation*.15);color.lerp(new Color(c.trailDust),.12);
      color.toArray(colours,i*3);
    }
    g.setAttribute('color',new Float32BufferAttribute(colours,3));g.computeVertexNormals();parts.push(g);
  }
  const geometry=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());
  const ground=new Mesh(geometry,new MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
  ground.name='forest-meadow';ground.userData.dynamic=true;ground.userData.noShadow=true;root.add(ground);
}
function groundShadows(root:Group):void{
  const positions:number[]=[],colors:number[]=[],color=new Color(c.pnwBreeze),angle=Math.atan2(10,8),sin=Math.sin(angle),cos=Math.cos(angle);
  const point=(tree:ForestTree,r:number,a:number,alpha:number)=>{
    const dx=Math.cos(a)*tree.radius*1.15*r,dz=Math.sin(a)*(tree.height*.6+tree.radius)*r;
    let x=tree.x+tree.height*.48+dx*cos+dz*sin,z=tree.z+tree.height*.38-dx*sin+dz*cos;
    // Clip each footprint to its exterior half-plane, never across the indoor pool.
    if(Math.abs(tree.x)/8>Math.abs(tree.z)/6)x=tree.x<0?Math.min(x,-8.02):Math.max(x,8.02);
    else z=tree.z<0?Math.min(z,-6.02):Math.max(z,6.02);
    positions.push(x,forestGroundY(x,z)+.025,z);colors.push(color.r,color.g,color.b,alpha);
  };
  // A feathered static canopy shadow conforms to the meadow without extra shadow maps.
  for(const tree of forestTrees)for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;
    point(tree,0,0,.19);point(tree,.55,b,.1);point(tree,.55,a,.1);
    point(tree,.55,a,.1);point(tree,.55,b,.1);point(tree,1,b,0);
    point(tree,.55,a,.1);point(tree,1,b,0);point(tree,1,a,0);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,4));
  const shadow=new Mesh(geometry,new MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false}));
  shadow.name='forest-ground-shadows';shadow.userData.dynamic=true;shadow.userData.noShadow=true;root.add(shadow);
}
/** Faceted broadleaf crowns, occasional conifers, low shrubs and boulders, all actual 3D. */
export function forestBackground(parent:Group):Group{
  const root=new Group();root.name='forest-background';parent.add(root);meadow(root);
  const crowns:Placement[]=[],trunks:Placement[]=[],pines:Placement[]=[],rocks:Placement[]=[];
  forestTrees.forEach((tree,i)=>{
    const {x,z,height:h,radius:r}=tree,y=forestGroundY(x,z),yaw=hash(i+2)*Math.PI*2;
    const trunkHeight=tree.pine?h*.8:h*.59;
    trunks.push({x,y:y+trunkHeight/2,z,sx:1+hash(i)*.55,sy:trunkHeight,sz:1+hash(i)*.4,yaw,color:blend(c.leather,c.fallLeaves,hash(i*2)*.35)});
    if(tree.pine)pines.push({x,y,z,sx:r*.85,sy:h/4.5,sz:r*.85,yaw,color:blend(c.mossPillow,c.pnwBreeze,.12+hash(i)*.18)});
    else{
      crowns.push({x,y:y+h*.65,z,sx:r,sy:r*1.07,sz:r*.9,yaw,color:blend(c.mossPillow,c.pineDew,hash(i*5)*.55)});
      crowns.push({x:x+Math.cos(yaw)*r*.7,y:y+h*.6,z:z+Math.sin(yaw)*r*.7,sx:r*.7,sy:r*.72,sz:r*.74,yaw:-yaw,color:blend(c.mossPillow,c.pineDew,.12+hash(i*3)*.5)});
    }
  });
  // Keep low vegetation and rocks outside the clearing, rather than placing objects in the room.
  for(let i=0;i<32;i++){
    const side=i%4,along=-27+hash(i+14)*54;
    const x=side<2?along:(side===2?-1:1)*(11.2+hash(i)*16),z=side<2?(side===0?-1:1)*(9.4+hash(i)*16):along;
    const y=forestGroundY(x,z),r=.65+hash(i*3)*1.4;
    rocks.push({x,y:y+.2,z,sx:r,sy:.32+hash(i)*.35,sz:r*.7,yaw:hash(i)*6,color:blend(c.pineDew,c.pnwBreeze,.17+hash(i+5)*.28)});
    if(i%2===0)crowns.push({x:x+1.1,y:y+.25,z:z+.6,sx:r*.8,sy:.5,sz:r*.65,yaw:hash(i)*5,color:blend(c.mossPillow,i%10===0?c.mustard:c.pineDew,.22)});
  }
  const canopy=new IcosahedronGeometry(1,1),positions=canopy.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),scale=1+Math.sin(x*7+y*5-z*8)*.055;
    positions.setXYZ(i,x*scale,y*scale,z*scale);
  }
  canopy.computeVertexNormals();
  instances(root,'forest-broadleaf-crowns',canopy,crowns);
  instances(root,'forest-trunks',new CylinderGeometry(.15,.23,1,5),trunks);
  const tiers:BufferGeometry[]=[];
  for(let i=0;i<3;i++)tiers.push(new ConeGeometry(1-i*.24,1.7,5).translate(0,1.65+i*.97,0));
  const pineGeometry=mergeGeometries(tiers,false)!;tiers.forEach(g=>g.dispose());
  instances(root,'forest-conifers',pineGeometry,pines);
  instances(root,'forest-boulders',new IcosahedronGeometry(1,0),rocks);
  groundShadows(root);
  return root;
}
