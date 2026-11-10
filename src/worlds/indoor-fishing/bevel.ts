import { BufferGeometry,Float32BufferAttribute } from 'three';
import type { Vector3Tuple } from 'three';
export const BEVEL={segments:2,maxWidth:.015,widthRatio:.12} as const;
type Point=[number,number,number];
/** Two faces across each full 90-degree edge profile, matching Blender Bevel Segments=2. */
export function bevelBox(size:Vector3Tuple):BufferGeometry {
  if(!size.every(n=>Number.isFinite(n)&&n>0))throw new Error('베벨 박스 크기는 양수여야 합니다.');
  const width=Math.min(BEVEL.maxWidth,Math.min(...size)*BEVEL.widthRatio);
  const half=size.map(n=>n/2),core=half.map(n=>n-width),positions:number[]=[];
  const triangle=(a:Point,b:Point,c:Point,out:Point)=>{
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(cross.reduce((sum,v,i)=>sum+v*out[i],0)<0)[b,c]=[c,b];
    positions.push(...a,...b,...c);
  };
  const quad=(a:Point,b:Point,c:Point,d:Point,out:Point)=>{triangle(a,b,c,out);triangle(a,c,d,out);};
  // Six single planar faces, rather than tessellating every large flat surface.
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3,points:Point[]=[];
    for(const [su,sv] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      const p:Point=[0,0,0];p[axis]=half[axis]*sign;p[u]=core[u]*su;p[v]=core[v]*sv;points.push(p);
    }
    const out:Point=[0,0,0];out[axis]=sign;quad(points[0],points[1],points[2],points[3],out);
  }
  // Twelve edges, each with exactly two bevel bands (0 -> 45 -> 90 degrees).
  for(let axis=0;axis<3;axis++)for(const su of [-1,1])for(const sv of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    const point=(angle:number,end:number):Point=>{
      const p:Point=[0,0,0];p[axis]=core[axis]*end;p[u]=su*(core[u]+width*Math.cos(angle));p[v]=sv*(core[v]+width*Math.sin(angle));return p;
    };
    for(let band=0;band<BEVEL.segments;band++){
      const a=band/BEVEL.segments*Math.PI/2,b=(band+1)/BEVEL.segments*Math.PI/2,m=(a+b)/2;
      const out:Point=[0,0,0];out[u]=su*Math.cos(m);out[v]=sv*Math.sin(m);
      quad(point(a,-1),point(a,1),point(b,1),point(b,-1),out);
    }
  }
  // Eight spherical corner patches with two intervals on each boundary.
  const h=Math.SQRT1_2;
  const directions:Point[]=[[1,0,0],[0,1,0],[0,0,1],[h,h,0],[h,0,h],[0,h,h]];
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const signs:Point=[sx,sy,sz];
    const points=directions.map(n=>n.map((v,i)=>signs[i]*(core[i]+width*v)) as Point);
    for(const [a,b,c] of [[0,3,4],[3,1,5],[4,5,2],[3,5,4]])triangle(points[a],points[b],points[c],signs);
  }
  const geometry=new BufferGeometry();geometry.name='Bevel Segments 2';
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(positions.length/3*2),2));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.bevel={segments:BEVEL.segments,width};return geometry;
}
