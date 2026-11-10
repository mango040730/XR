import { Box3, Color, Group, InstancedMesh, Matrix4, PlaneGeometry } from 'three';
import { FishSchool } from './fishSwimming';
import { FishModels } from './fishModels';
import { FISH_SPECIES } from './fishSpecies';
import type { FishSpeciesId } from './fishSpecies';
import { Kit } from './geometry';
import { underwaterMaterial } from './waterShaders';
import type { WaterUniforms } from './waterShaders';
import { ClearWater } from './ClearWater';
import { WATER } from './waterConfig';
import { poolFootprint, palette as c } from './layout';
export function pool(root:Group,kit:Kit){
  const uniforms:WaterUniforms={time:{value:0},detail:{value:1}};
  // Keep the wall body below the cap: their inner faces must never overlap.
  const wallBottom=-1.125,rimBottom=.37,wallHeight=rimBottom-wallBottom,wallY=(wallBottom+rimBottom)/2;
  const basin=kit.box(root,[8.6,.18,5.1],[0,-1.22,0],c.deepTeal);basin.material=kit.mat(c.grout,'stone');
  for(const x of [-4.14,4.14])kit.box(root,[.28,wallHeight,poolFootprint[1]*2],[x,wallY,0],c.wall).name='pool-wall';
  for(const z of [-2.39,2.39])kit.box(root,[8,wallHeight,.28],[0,wallY,z],c.wall).name='pool-wall';
  for(const x of [-4.18,4.18])kit.box(root,[.36,.2,5.22],[x,.47,0],c.rim,'stone').name='pool-rim';
  for(const z of [-2.43,2.43])kit.box(root,[8,.2,.36],[0,.47,z],c.rim,'stone').name='pool-rim';
  for(let x=-3.75;x<=3.75;x+=.5)for(const z of [-2.43,2.43])kit.box(root,[.007,.008,.35],[x,.575,z],c.grout,'stone');
  for(let z=-2.2;z<=2.2;z+=.5)for(const x of [-4.18,4.18])kit.box(root,[.35,.008,.007],[x,.575,z],c.grout,'stone');
  // Real warm-ivory tiles match the wall palette beneath a separate water surface.
  const tileWidth=WATER.width/WATER.tileColumns,tileDepth=WATER.depth/WATER.tileRows,tileHeight=WATER.tileThickness;
  const bedHeight=WATER.tileTopY-WATER.groutRecess-WATER.floorY;
  kit.box(root,[WATER.width,bedHeight,WATER.depth],[0,WATER.floorY+bedHeight/2,0],c.grout,'stone').name='submerged-grout-bed';
  const tiles=new InstancedMesh(new PlaneGeometry(tileWidth-WATER.groutWidth,tileDepth-WATER.groutWidth).rotateX(-Math.PI/2).translate(0,tileHeight/2,0),underwaterMaterial(uniforms,WATER.causticsStrength),WATER.tileColumns*WATER.tileRows);
  tiles.material.addEventListener('dispose',()=>tiles.dispose());
  tiles.name='submerged-pool-tiles';tiles.userData.dynamic=true;tiles.userData.noShadow=true;
  const matrix=new Matrix4();let index=0;
  for(let row=0;row<WATER.tileRows;row++)for(let column=0;column<WATER.tileColumns;column++){
    matrix.makeTranslation(-WATER.width/2+(column+.5)*tileWidth,WATER.tileTopY-tileHeight/2,-WATER.depth/2+(row+.5)*tileDepth);
    tiles.setMatrixAt(index,matrix);tiles.setColorAt(index,new Color(WATER.tileColors[(column*7+row*3)%WATER.tileColors.length]));index++;
  }
  tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;
  tiles.computeBoundingBox();tiles.computeBoundingSphere();root.add(tiles);
  const surface=new ClearWater(uniforms);root.add(surface);
  // Prepare optics before the main multisampled composer target is opened.
  // XR / Cardboard still capture separately in each eye's onBeforeRender.
  root.userData.prepareRender=(renderer:import('three').WebGLRenderer,scene:import('three').Scene,camera:import('three').Camera)=>surface.prepare(renderer,scene,camera);
  const models=new FishModels();
  const fish=Array.from({length:6},(_,i)=>{
    const model=models.create(FISH_SPECIES[i%FISH_SPECIES.length].id);
    model.root.name=`swimming-fish:${model.species}:${i}`;root.add(model.root);return model;
  });
  const caughtFish=new Group();caughtFish.name='caught-fish';caughtFish.visible=false;root.add(caughtFish);
  const catches=FISH_SPECIES.map(species=>{
    const model=models.create(species.id);model.root.visible=false;caughtFish.add(model.root);return model;
  });
  let catchStarted=-Infinity;
  const school=new FishSchool(fish.map(model=>{
    const box=new Box3().setFromObject(model.root);
    return {species:model.species,radius:Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z)),halfHeight:Math.max(Math.abs(box.min.y),Math.abs(box.max.y)),halfWidth:Math.max(Math.abs(box.min.z),Math.abs(box.max.z))};
  }),{width:WATER.width,depth:WATER.depth,bottom:WATER.tileTopY,surface:WATER.surfaceY});
  const update=(time:number,low:boolean)=>{
    const age=time-catchStarted;caughtFish.visible=age>=0&&age<1.6;
    if(caughtFish.visible){
      caughtFish.position.y=WATER.surfaceY+.015+Math.sin(age/1.6*Math.PI)*.6;
      caughtFish.rotation.set(-.12,Math.sin(age*3)*.3,Math.sin(age*8)*.15);
      catches.forEach(model=>{if(model.root.visible)model.update(time,2);});
    }
    uniforms.time.value=time;uniforms.detail.value=low?.55:1;surface.setLowQuality(low);
    school.update(time);
    fish.forEach((model,i)=>{
      const swimmer=school.swimmers[i];model.root.position.copy(swimmer.position);model.root.quaternion.copy(swimmer.orientation);
      model.update(swimmer.animationTime,i*1.2);
    });
  };
  update(0,false);
  return {surface,tiles,fish,school,caughtFish,showCatch(time:number,at:[number,number,number],species:FishSpeciesId){
    catchStarted=time;caughtFish.position.fromArray(at);catches.forEach(model=>model.root.visible=model.species===species);
  },update};
}
