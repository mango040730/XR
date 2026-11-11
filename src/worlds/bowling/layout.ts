import navigation from './navigation.json';
import type {WorldConfig} from '../../engine/world/types';

// Join adjacent authored rectangles so the capsule can cross their shared edges.
// Each bridge lies entirely inside their union; lane and gutter areas remain excluded.
const regions=navigation.walkable_rectangles.map(r=>({minX:r.min[0],maxX:r.max[0],minZ:r.min[2],maxZ:r.max[2],y:r.min[1]}));
const bridges:typeof regions=[];const span=navigation.avatar_radius_m*2+.001;
for(let i=0;i<regions.length;i++)for(const b of regions.slice(i+1)){
 const a=regions[i],y=Math.max(a.y,b.y);
 for(const [before,after] of [[a,b],[b,a]]){
  if(Math.abs(before.maxZ-after.minZ)<1e-6){const minX=Math.max(a.minX,b.minX),maxX=Math.min(a.maxX,b.maxX);if(maxX-minX>span)bridges.push({minX,maxX,minZ:before.maxZ-span,maxZ:before.maxZ+span,y});}
  if(Math.abs(before.maxX-after.minX)<1e-6){const minZ=Math.max(a.minZ,b.minZ),maxZ=Math.min(a.maxZ,b.maxZ);if(maxZ-minZ>span)bridges.push({minZ,maxZ,minX:before.maxX-span,maxX:before.maxX+span,y});}
 }
}
export const floors:WorldConfig['floors']=[...regions,...bridges].map(r=>({center:[(r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2],size:[r.maxX-r.minX,r.maxZ-r.minZ],y:r.y,color:'#c8b38b',visible:false}));
export const boxes:WorldConfig['boxes']=navigation.colliders.filter(b=>b.max[1]>.08).map(b=>({name:b.name,position:b.min.map((v,i)=>(v+b.max[i])/2) as [number,number,number],size:b.min.map((v,i)=>b.max[i]-v) as [number,number,number],color:'#c8b38b',visible:false}));
