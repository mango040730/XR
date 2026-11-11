import {Group,Mesh,MeshBasicMaterial,PlaneGeometry} from 'three';

/** Keep the original authored leaf, handle, inlays and plaque together on a real hinge. */
export function preparePortal(model:Group):void{
 const portal=model.getObjectByName('MainPortal');if(!portal)throw new Error('마이룸 방문을 찾지 못했습니다.');
 const hinge=new Group();hinge.name='Home door hinge';hinge.position.set(-.71,0,.095);portal.add(hinge);portal.updateWorldMatrix(true,true);
 for(const child of [...portal.children]){
  if(child===hinge)continue;
  if(!/^(Portal recessed|Portal deep shadow|Portal monumental|Portal side light|Portal thick|Portal dark threshold|Portal warm crown)/.test(child.name)){
   child.userData.animatedDoor=true;hinge.attach(child);
   if(child instanceof Mesh){child.geometry.setAttribute('surfacePosition',child.geometry.attributes.position.clone());child.geometry.setAttribute('surfaceNormal',child.geometry.attributes.normal.clone());}
  }
 }
 const opening=new Mesh(new PlaneGeometry(1.40,2.46),new MeshBasicMaterial({color:'#e8ddc6',toneMapped:false}));
 opening.name='Home door opening';opening.position.set(0,1.28,.084);opening.visible=false;opening.userData.animatedDoor=true;portal.add(opening);
}
export function setPortalOpen(root:Group,amount:number):void{
 const hinge=root.getObjectByName('Home door hinge'),opening=root.getObjectByName('Home door opening');
 if(hinge)hinge.rotation.y=amount<=0?0:-Math.PI*.46*Math.min(1,amount);if(opening)opening.visible=amount>.001;
 root.userData.shadowDirty=true;
}
