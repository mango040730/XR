import {BufferGeometry,Float32BufferAttribute,MathUtils} from 'three';

// Keep the uploaded geometry buffers intact. Derive a resting pose once on
// the CPU so the colour, depth and ambient-contact passes see the same arms.
export function npcRestPose(source,{minY,height,centerX},cache){
  const sourcePosition=source.attributes.position;let attributes=cache.get(sourcePosition);
  if(!attributes){
    const positions=sourcePosition.array.slice(),normals=source.attributes.normal.array.slice(),weights=new Float32Array(sourcePosition.count);
    for(let i=0;i<sourcePosition.count;i++){
      const offset=i*3,x=positions[offset],y=positions[offset+1],nx=Math.abs((x-centerX)/height),ny=(y-minY)/height;
      const weight=MathUtils.smoothstep(nx,.14,.24)*MathUtils.smoothstep(ny,.28,.35)*(1-MathUtils.smoothstep(ny,.52,.555));weights[i]=weight;
      const side=x<centerX?-1:1,angle=-side*1.16*weight,c=Math.cos(angle),s=Math.sin(angle),px=centerX+side*height*.18,py=minY+height*.5;
      positions[offset]=px+c*(x-px)-s*(y-py);positions[offset+1]=py+s*(x-px)+c*(y-py);
      const normalX=normals[offset],normalY=normals[offset+1];normals[offset]=c*normalX-s*normalY;normals[offset+1]=s*normalX+c*normalY;
    }
    attributes={position:new Float32BufferAttribute(positions,3),normal:new Float32BufferAttribute(normals,3),npcArmWeight:new Float32BufferAttribute(weights,1)};cache.set(sourcePosition,attributes);
  }
  const geometry=new BufferGeometry();for(const [name,attribute]of Object.entries(source.attributes))geometry.setAttribute(name,attributes[name]??attribute);
  geometry.setAttribute('npcArmWeight',attributes.npcArmWeight);geometry.setIndex(source.index);
  for(const group of source.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
