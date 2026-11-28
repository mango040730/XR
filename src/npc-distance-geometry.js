import {BufferGeometry,Float32BufferAttribute} from 'three';

// Smooth-normal vertex clustering for a distant LOD only. At the 7m switch,
// each cell is less than two screen pixels; the near GLB is never modified.
export function npcDistanceGeometry(source,cell){
  const attributes=Object.entries(source.attributes),position=source.attributes.position,uv=source.attributes.uv;
  const remap=new Int32Array(position.count).fill(-1),clusters=new Map(),values=Object.fromEntries(attributes.map(([name])=>[name,[]])),counts=[],indices=[];
  for(let i=0;i<source.index.count;i++){
    const old=source.index.getX(i);if(remap[old]>=0)continue;
    const key=[Math.round(position.getX(old)/cell),Math.round(position.getY(old)/cell),Math.round(position.getZ(old)/cell),...(uv?[Math.round(uv.getX(old)*128),Math.round(uv.getY(old)*128)]:[])].join(',');
    let id=clusters.get(key);if(id===undefined){id=clusters.size;clusters.set(key,id);counts[id]=0;for(const [name,attribute]of attributes)for(let c=0;c<attribute.itemSize;c++)values[name].push(0);}
    remap[old]=id;counts[id]++;
    for(const [name,attribute]of attributes)for(let c=0;c<attribute.itemSize;c++)values[name][id*attribute.itemSize+c]+=attribute.array[old*attribute.itemSize+c];
  }
  for(let i=0;i<source.index.count;i+=3){const a=remap[source.index.getX(i)],b=remap[source.index.getX(i+1)],c=remap[source.index.getX(i+2)];if(a!==b&&b!==c&&c!==a)indices.push(a,b,c);}
  const geometry=new BufferGeometry();for(const [name,attribute]of attributes){const data=values[name];for(let i=0;i<counts.length;i++)for(let c=0;c<attribute.itemSize;c++)data[i*attribute.itemSize+c]/=counts[i];geometry.setAttribute(name,new Float32BufferAttribute(data,attribute.itemSize));}
  geometry.setIndex(indices);geometry.normalizeNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
