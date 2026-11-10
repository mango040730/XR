import { Box3,Float32BufferAttribute,Matrix4,Mesh,Vector3 } from 'three';
import type { BufferGeometry,Group } from 'three';

const RANGE=.36,CELL=.75;
const samples=[[.65,0,.76],[-.65,0,.76],[0,.65,.76],[0,-.65,.76],[.48,.48,.73],[-.48,.48,.73],[.48,-.48,.73],[-.48,-.48,.73]];
interface Occluder {mesh:Mesh;box:Box3}
/** Static, short-range ambient visibility. No screen-space pass, per-eye target or frame cost. */
export class AmbientField {
  private cells=new Map<string,Occluder[]>();
  constructor(root:Group){
    root.updateMatrixWorld(true);
    const inverse=root.matrixWorld.clone().invert();
    root.traverse(object=>{
      if(!(object instanceof Mesh)||object.userData.dynamic||object.userData.noShadow)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      if(materials.some(m=>m.transparent))return;
      object.geometry.computeBoundingBox();
      const box=object.geometry.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse,object.matrixWorld));
      const entry={mesh:object,box},expanded=box.clone().expandByScalar(RANGE+.02);
      for(let x=Math.floor(expanded.min.x/CELL);x<=Math.floor(expanded.max.x/CELL);x++)
      for(let y=Math.floor(expanded.min.y/CELL);y<=Math.floor(expanded.max.y/CELL);y++)
      for(let z=Math.floor(expanded.min.z/CELL);z<=Math.floor(expanded.max.z/CELL);z++){
        const key=`${x},${y},${z}`,list=this.cells.get(key)??[];list.push(entry);this.cells.set(key,list);
      }
    });
  }
  bake(geometry:BufferGeometry,source:Mesh):void{
    const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
    const values=new Float32Array(p.count*3),cache=new Map<string,number>();
    const normal=new Vector3(),u=new Vector3(),v=new Vector3();
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      normal.set(n.getX(i),n.getY(i),n.getZ(i)).normalize();
      const key=[x,y,z,normal.x,normal.y,normal.z].map(a=>a.toFixed(4)).join(',');
      let visibility=cache.get(key);
      if(visibility===undefined){
        const ox=x+normal.x*.012,oy=y+normal.y*.012,oz=z+normal.z*.012;
        const nearby=this.cells.get(`${Math.floor(ox/CELL)},${Math.floor(oy/CELL)},${Math.floor(oz/CELL)}`)??[];
        u.set(Math.abs(normal.y)<.9?0:1,Math.abs(normal.y)<.9?1:0,0).cross(normal).normalize();v.crossVectors(normal,u);
        let blocked=0;
        for(const [a,b,c] of samples){
          const dx=u.x*a+v.x*b+normal.x*c,dy=u.y*a+v.y*b+normal.y*c,dz=u.z*a+v.z*b+normal.z*c;
          let closest=RANGE;
          for(const entry of nearby){
            if(entry.mesh===source)continue;
            const box=entry.box;
            let near=0,far=closest;
            for(let axis=0;axis<3;axis++){
              const o=axis===0?ox:axis===1?oy:oz,d=axis===0?dx:axis===1?dy:dz;
              const low=axis===0?box.min.x:axis===1?box.min.y:box.min.z,high=axis===0?box.max.x:axis===1?box.max.y:box.max.z;
              if(Math.abs(d)<1e-8){if(o<low||o>high){far=-1;break;}}
              else{let t0=(low-o)/d,t1=(high-o)/d;if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);if(near>far)break;}
            }
            if(near<=far&&far>=0)closest=Math.min(closest,Math.max(0,near));
          }
          blocked+=(1-closest/RANGE)**2;
        }
        visibility=1-.48*blocked/samples.length;cache.set(key,visibility);
      }
      values.fill(visibility,i*3,i*3+3);
    }
    geometry.setAttribute('color',new Float32BufferAttribute(values,3));
  }
}
