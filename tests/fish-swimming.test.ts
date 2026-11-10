import { expect,it } from 'vitest';
import { Box3,Group,Vector3 } from 'three';
import { FishModels } from '../src/worlds/indoor-fishing/fishModels';
import { FishSchool,SWIMMING } from '../src/worlds/indoor-fishing/fishSwimming';
import { FISH_SPECIES } from '../src/worlds/indoor-fishing/fishSpecies';
import { WATER } from '../src/worlds/indoor-fishing/waterConfig';
import { disposeObject } from '../src/engine/assets/disposeObject';
function scene(seed=23){
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const root=new Group(),factory=new FishModels(),models=Array.from({length:6},(_,i)=>factory.create(FISH_SPECIES[i%3].id));models.forEach(m=>root.add(m.root));
 const sizes=models.map(m=>{const b=new Box3().setFromObject(m.root);return {species:m.species,radius:Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z)),halfHeight:Math.max(Math.abs(b.min.y),Math.abs(b.max.y)),halfWidth:Math.max(Math.abs(b.min.z),Math.abs(b.max.z))};});
 const school=new FishSchool(sizes,{width:WATER.width,depth:WATER.depth,bottom:WATER.tileTopY,surface:WATER.surfaceY},random);school.update(0);
 return {school,models,root};
}
it('wanders through different pool regions and depths instead of repeating a constant-radius orbit',()=>{
 const {school,root}=scene(),stats=school.swimmers.map(()=>({minRadius:Infinity,maxRadius:0,minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,minY:Infinity,maxY:-Infinity}));
 for(let frame=1;frame<=120*60;frame++){
  school.update(frame/60);
  if(frame%30===0)school.swimmers.forEach((s,i)=>{const p=s.position,r=Math.hypot(p.x,p.z),m=stats[i];m.minRadius=Math.min(m.minRadius,r);m.maxRadius=Math.max(m.maxRadius,r);m.minX=Math.min(m.minX,p.x);m.maxX=Math.max(m.maxX,p.x);m.minZ=Math.min(m.minZ,p.z);m.maxZ=Math.max(m.maxZ,p.z);m.minY=Math.min(m.minY,p.y);m.maxY=Math.max(m.maxY,p.y);});
 }
 stats.forEach((m,i)=>{
  expect(m.maxRadius-m.minRadius).toBeGreaterThan(1);expect(m.maxX-m.minX).toBeGreaterThan(2);expect(m.maxZ-m.minZ).toBeGreaterThan(.6);expect(m.maxY-m.minY).toBeGreaterThan(.06);
  expect(school.swimmers[i].goals).toBeGreaterThan(3);
 });disposeObject(root);
});
it('keeps complete rotated fish meshes inside the basin and points their noses along their velocity',()=>{
 const {school,models,root}=scene(92),nose=new Vector3();
 for(let frame=1;frame<=180*60;frame++){
  const old=school.swimmers.map(s=>s.heading);school.update(frame/60);
  school.swimmers.forEach((s,i)=>{
   expect(Math.abs(Math.atan2(Math.sin(s.heading-old[i]),Math.cos(s.heading-old[i])))).toBeLessThanOrEqual(SWIMMING.maxTurn/60+1e-8);
   nose.set(1,0,0).applyQuaternion(s.orientation);expect(nose.dot(s.velocity.clone().normalize())).toBeGreaterThan(.9999);
  });
  if(frame%60!==0)continue;
  models.forEach((m,i)=>{const s=school.swimmers[i];m.root.position.copy(s.position);m.root.quaternion.copy(s.orientation);});root.updateMatrixWorld(true);
  for(const m of models){const b=new Box3().setFromObject(m.root);expect(b.min.y).toBeGreaterThan(WATER.tileTopY+.02);expect(b.max.y).toBeLessThan(WATER.surfaceY-.02);expect(Math.max(Math.abs(b.min.x),Math.abs(b.max.x))).toBeLessThan(WATER.width/2);expect(Math.max(Math.abs(b.min.z),Math.abs(b.max.z))).toBeLessThan(WATER.depth/2);}
 }disposeObject(root);
});
it('follows the same path at 30 and 60fps with the same random decisions',()=>{
 const a=scene(17),b=scene(17);
 for(let i=1;i<=60*60;i++)a.school.update(i/60);
 for(let i=1;i<=60*30;i++)b.school.update(i/30);
 a.school.swimmers.forEach((s,i)=>{expect(s.position.distanceTo(b.school.swimmers[i].position)).toBeLessThan(1e-6);expect(s.goals).toBe(b.school.swimmers[i].goals);});disposeObject(a.root);disposeObject(b.root);
});
it('resumes without teleporting or simulating an entire background-tab gap',()=>{
 const {school,root}=scene(),before=school.swimmers.map(s=>s.position.clone());school.update(300);
 school.swimmers.forEach((s,i)=>{expect(s.position.distanceTo(before[i])).toBeLessThan(.08);expect(s.animationTime).toBeLessThan(4);});disposeObject(root);
});
