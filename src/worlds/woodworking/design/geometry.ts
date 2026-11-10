import * as THREE from 'three';

export type Dimensions = [number,number,number];
type Vertex = { p:THREE.Vector3;n:THREE.Vector3;uv?:[number,number] };
export const BEVEL_SEGMENTS=2;
export const CREASE_ANGLE=THREE.MathUtils.degToRad(30);

// Keep a broad planar core even on small handles, thin boards and large beams.
export function proportionalBevel(size:Dimensions,requested:number) {
  if(size.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Geometry dimensions must be positive.');
  return Math.max(0,Math.min(requested,Math.min(...size)*.055,Math.max(...size)*.008));
}

class Surface {
  positions:number[]=[];normals:number[]=[];uvs:number[]=[];
  size:Dimensions;
  constructor(size:Dimensions){this.size=size;}
  vertex(p:THREE.Vector3,n:THREE.Vector3,projection:THREE.Vector3,uv?:[number,number]) {
    this.positions.push(p.x,p.y,p.z);this.normals.push(n.x,n.y,n.z);
    if(uv){this.uvs.push(...uv);return;}
    const abs=projection.toArray().map(Math.abs);
    const drop=abs.indexOf(Math.max(...abs));const axes=[0,1,2].filter(a=>a!==drop).sort((a,b)=>this.size[b]-this.size[a]);
    this.uvs.push(p.getComponent(axes[0])/this.size[axes[0]]+.5,p.getComponent(axes[1])/this.size[axes[1]]+.5);
  }
  tri(a:Vertex,b:Vertex,c:Vertex) {
    const face=new THREE.Vector3().subVectors(b.p,a.p).cross(new THREE.Vector3().subVectors(c.p,a.p));
    if(face.lengthSq()<1e-18)return;
    if(face.dot(a.n.clone().add(b.n).add(c.n))<0)[b,c]=[c,b];
    face.normalize();
    this.vertex(a.p,a.n,face,a.uv);this.vertex(b.p,b.n,face,b.uv);this.vertex(c.p,c.n,face,c.uv);
  }
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex){this.tri(a,b,c);this.tri(a,c,d);}
  geometry() {
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(this.normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uvs,2));
    g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
}

/** Six untouched planes, two real strips per 90° edge and four triangles per corner. */
export function createBeveledBox(size:Dimensions,requested:number) {
  const radius=proportionalBevel(size,requested);
  if(radius===0){const g=new THREE.BoxGeometry(...size).toNonIndexed();g.userData={bevelSegments:0,bevelWidth:0};return g;}
  const half=size.map(v=>v/2),core=half.map(v=>v-radius),out=new Surface(size);
  const v=(p:number[],n:number[]):Vertex=>({p:new THREE.Vector3(...p as Dimensions),n:new THREE.Vector3(...n as Dimensions)});
  // Broad faces have exactly constant, axis-aligned normals. Their triangulation cannot create gradients.
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,w=(axis+2)%3,n=[0,0,0];n[axis]=sign;
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{
      const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=core[u]*a;p[w]=core[w]*b;return v(p,n);
    });out.quad(corners[0],corners[1],corners[2],corners[3]);
  }
  // Each band is one plane. A constant mid-angle normal keeps both bevel facets legible.
  for(let axis=0;axis<3;axis++)for(const su of [-1,1])for(const sw of [-1,1]){
    const u=(axis+1)%3,w=(axis+2)%3;
    const edge=(angle:number,end:number,normalAngle:number)=>{
      const p=[0,0,0],n=[0,0,0];p[axis]=core[axis]*end;
      p[u]=su*(core[u]+Math.cos(angle)*radius);p[w]=sw*(core[w]+Math.sin(angle)*radius);
      n[u]=su*Math.cos(normalAngle);n[w]=sw*Math.sin(normalAngle);return v(p,n);
    };
    for(let band=0;band<BEVEL_SEGMENTS;band++){
      const a=band/BEVEL_SEGMENTS*Math.PI/2,b=(band+1)/BEVEL_SEGMENTS*Math.PI/2;
      const mid=(a+b)/2;out.quad(edge(a,-1,mid),edge(a,1,mid),edge(b,1,mid),edge(b,-1,mid));
    }
  }
  const m=Math.SQRT1_2;
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const signs=[sx,sy,sz];
    const corner=(a:number,b:number,c:number)=>{const n=[a,b,c].map((s,i)=>s*signs[i]);return v(n.map((s,i)=>core[i]*signs[i]+s*radius),n);};
    const x=corner(1,0,0),y=corner(0,1,0),z=corner(0,0,1),xy=corner(m,m,0),xz=corner(m,0,m),yz=corner(0,m,m);
    out.tri(x,xy,xz);out.tri(y,yz,xy);out.tri(z,xz,yz);out.tri(xy,yz,xz);
  }
  const geometry=out.geometry();geometry.computeVertexNormals();geometry.name='bevel-2-box';
  geometry.userData={bevelSegments:BEVEL_SEGMENTS,bevelWidth:radius,angleLimit:30,normalMode:'flat planes / two planar bevel facets / faceted corners'};
  return geometry;
}

/** Low-sided tapered cylinder, with flat caps, faceted sides and two bands on each cap rim. */
export function createBeveledCylinder(bottom:number,top:number,height:number,segments:number,requested?:number) {
  const n=Math.max(6,Math.floor(segments));
  const r=Math.max(0,Math.min(requested??.012,height*.055,Math.min(bottom,top)*.045));
  if(r===0)return new THREE.CylinderGeometry(top,bottom,height,n).toNonIndexed();
  const h=height/2,m=Math.SQRT1_2;
  const slope=(bottom-top)/(height-2*r);const side=new THREE.Vector2(1,slope).normalize();
  const profile=[
    {r:bottom-r,y:-h,nr:0,ny:-1},
    {r:bottom-r+r*m,y:-h+r-r*m,nr:m,ny:-m},
    {r:bottom,y:-h+r,nr:side.x,ny:side.y},
    {r:top,y:h-r,nr:side.x,ny:side.y},
    {r:top-r+r*m,y:h-r+r*m,nr:m,ny:m},
    {r:top-r,y:h,nr:0,ny:1},
  ];
  const out=new Surface([Math.max(bottom,top)*2,height,Math.max(bottom,top)*2]);
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,mid=(a+b)/2;
    const point=(ring:number,angle:number):Vertex=>{
      const p=profile[ring];return{p:new THREE.Vector3(Math.sin(angle)*p.r,p.y,Math.cos(angle)*p.r),n:new THREE.Vector3(Math.sin(mid)*p.nr,p.ny,Math.cos(mid)*p.nr).normalize(),uv:[angle/(Math.PI*2),(p.y+h)/height]};
    };
    for(let band=0;band<profile.length-1;band++)out.quad(point(band,a),point(band,b),point(band+1,b),point(band+1,a));
    for(const ring of [0,profile.length-1]){
      const normal=new THREE.Vector3(0,ring===0?-1:1,0);
      const cap=(angle:number):Vertex=>({p:point(ring,angle).p,n:normal,uv:[Math.sin(angle)*.5+.5,Math.cos(angle)*.5+.5]});
      out.tri({p:new THREE.Vector3(0,profile[ring].y,0),n:normal,uv:[.5,.5]},cap(a),cap(b));
    }
  }
  const geometry=out.geometry();geometry.computeVertexNormals();geometry.name='bevel-2-cylinder';
  geometry.userData={bevelSegments:BEVEL_SEGMENTS,bevelWidth:r,radialSegments:n,normalMode:'flat caps / faceted sides'};
  return geometry;
}

/** 30° auto-smoothing at micrometre precision, with axis-aligned broad planes hardened. */
export function cleanCreaseNormals(source:THREE.BufferGeometry,angle=CREASE_ANGLE) {
  const g=source.index?source.toNonIndexed():source;
  const position=g.getAttribute('position'),faces:{n:THREE.Vector3;area:number}[]=[],shared=new Map<string,Set<number>>();
  const key=(i:number)=>`${Math.round(position.getX(i)*1e6)},${Math.round(position.getY(i)*1e6)},${Math.round(position.getZ(i)*1e6)}`;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<position.count;i+=3){
    a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
    const cross=b.sub(a).cross(c.sub(a)),area=cross.length(),index=faces.length;faces.push({n:cross.clone().normalize(),area});
    for(let j=0;j<3;j++){const k=key(i+j);if(!shared.has(k))shared.set(k,new Set());shared.get(k)!.add(index);}
  }
  const normals=new Float32Array(position.count*3),limit=Math.cos(angle),normal=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
    const face=faces[Math.floor(i/3)];normal.copy(face.n);
    if(Math.max(Math.abs(normal.x),Math.abs(normal.y),Math.abs(normal.z))<.999999){
      normal.set(0,0,0);for(const index of shared.get(key(i))!){const adjacent=faces[index];if(face.n.dot(adjacent.n)>=limit)normal.addScaledVector(adjacent.n,adjacent.area);}normal.normalize();
    }
    normal.toArray(normals,i*3);
  }
  g.setAttribute('normal',new THREE.BufferAttribute(normals,3));return g;
}
