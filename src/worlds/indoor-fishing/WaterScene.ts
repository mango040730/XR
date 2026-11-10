import { DirectionalLight,InstancedMesh,Light,Line,Material,Mesh,Scene,Vector3 } from 'three';
import type { Object3D } from 'three';
/** Share geometry, but isolate capture materials/lights from the main HDR/shadow render state. */
export class WaterScene {
 readonly scene=new Scene();
 private objects=new Map<Object3D,Object3D>();
 private materials=new Map<Material,Material>();
 private cloneMaterial(source:Material):Material {
  let material=this.materials.get(source);
  if(!material){material=source.clone();material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;this.materials.set(source,material);}
  return material;
 }
 sync(source:Scene,excluded:Object3D):Scene {
  this.scene.background=source.background;
  source.traverse(object=>{
   if(object===excluded||object.renderOrder>=1000||!(object instanceof Mesh||object instanceof Line||object instanceof Light))return;
   let copy=this.objects.get(object);
   if(!copy){
    copy=object.clone(false);copy.matrixAutoUpdate=false;copy.castShadow=false;copy.receiveShadow=false;
    if(copy instanceof Mesh||copy instanceof Line){
     const original=object as Mesh;
     copy.material=Array.isArray(original.material)?original.material.map(m=>this.cloneMaterial(m)):this.cloneMaterial(original.material);
     copy.onBeforeRender=()=>{};copy.onAfterRender=()=>{};
    }
    if(copy instanceof DirectionalLight)this.scene.add(copy.target);
    this.scene.add(copy);this.objects.set(object,copy);
   }
   copy.visible=true;
   for(let parent:Object3D|null=object;parent;parent=parent.parent)if(!parent.visible||parent.renderOrder>=1000){copy.visible=false;break;}
   copy.matrix.copy(object.matrixWorld);copy.matrixWorld.copy(object.matrixWorld);
   if(copy instanceof InstancedMesh&&object instanceof InstancedMesh){copy.instanceMatrix=object.instanceMatrix;copy.instanceColor=object.instanceColor;}
   if(copy instanceof DirectionalLight&&object instanceof DirectionalLight){copy.target.position.copy(object.target.getWorldPosition(new Vector3()));copy.target.updateMatrixWorld(true);}
  });
  this.scene.updateMatrixWorld(true);return this.scene;
 }
 dispose():void {
  this.materials.forEach(m=>m.dispose());this.materials.clear();this.objects.clear();this.scene.clear();
 }
}
