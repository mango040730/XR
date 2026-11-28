import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AVATARS} from './entry-state.js';
import {createNpcNavigation,createNpcWalker,NPC_RADIUS} from './npc-navigation.js';
import {prepareNpcAppearance} from './npc-appearance.js';
import './npc-users.css';

export function createNpcUsers({scene,camera,renderer}){
  const root=new THREE.Group();root.name='Terrace_NPC_users';scene.add(root);
  const overlay=document.createElement('div');overlay.className='npc-nameplates';overlay.hidden=true;overlay.setAttribute('aria-label','공간의 NPC 닉네임');document.body.append(overlay);
  const actors=[],loader=new GLTFLoader(),eye=new THREE.Vector3(),point=new THREE.Vector3(),projected=new THREE.Vector3(),ray=new THREE.Raycaster();ray.firstHitOnly=true;
  let navigation=null,collider=null,disposed=false;
  function xrLabel(name){
    const canvas=document.createElement('canvas');canvas.width=146;canvas.height=72;const ctx=canvas.getContext('2d');
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    function paint(){ctx.clearRect(0,0,146,72);ctx.fillStyle='rgba(23,24,26,.6)';ctx.beginPath();ctx.roundRect(0,0,146,72,24);ctx.fill();ctx.font='500 28px "Wanted Sans"';ctx.fillStyle='#EFEEEC';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,73,36);texture.needsUpdate=true;}
    paint();document.fonts.ready.then(()=>{if(!disposed)paint();});
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,depthWrite:false,toneMapped:false}));sprite.scale.set(.42,.42*36/73,1);sprite.visible=false;
    return sprite;
  }
  return {
    async load({floor,collider:body}){
      collider=body;navigation=createNpcNavigation({floor,collider});
      const loaded=await Promise.all(AVATARS.map(avatar=>loader.loadAsync(`${import.meta.env.BASE_URL}models/npcs/${encodeURIComponent(avatar.nickname)}.glb`)));
      if(disposed){loaded.forEach(g=>disposeModel(g.scene));return;}
      loaded.forEach((gltf,index)=>{
        const avatar=AVATARS[index],appearance=prepareNpcAppearance(gltf.scene),walker=createNpcWalker(navigation,index),name=document.createElement('div');
        name.className='npc-nameplate';name.textContent=avatar.nickname;name.dataset.avatar=avatar.id;name.dataset.nodeId='398:732';name.hidden=true;overlay.append(name);
        const label=xrLabel(avatar.nickname);appearance.root.add(label);label.position.y=appearance.height+.16;
        appearance.root.name=`NPC_${avatar.nickname}`;appearance.root.position.copy(walker.position);appearance.root.rotation.y=walker.yaw;root.add(appearance.root);
        // An unobtrusive contact shadow follows the feet without re-rendering
        // the entire room's 4096px static sun shadow map every walking frame.
        const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,3,32,32,32);gradient.addColorStop(0,'rgba(35,27,22,.22)');gradient.addColorStop(1,'rgba(35,27,22,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
        const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(.78,.52),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;root.add(shadow);
        actors.push({avatar,appearance,walker,name,label,shadow});
      });
      root.visible=false;
    },
    update(delta,{active,player}){
      if(disposed||!actors.length)return;root.visible=active;overlay.hidden=!active||renderer.xr.isPresenting;if(!active)return;
      camera.updateWorldMatrix(true,false);camera.getWorldPosition(eye);const rect=renderer.domElement.getBoundingClientRect();
      for(const actor of actors){
        const {walker,appearance,name,label,shadow}=actor;walker.update(delta,{player,others:actors.filter(a=>a!==actor).map(a=>a.walker.position),active:!document.hidden});
        appearance.root.position.copy(walker.position);appearance.root.rotation.y=walker.yaw;appearance.update(walker.distance,walker.moving,delta);
        shadow.position.copy(walker.position);shadow.position.y+=.008;
        appearance.root.updateWorldMatrix(true,true);label.getWorldPosition(point);const distance=eye.distanceTo(point);projected.copy(point).project(camera);
        let shown=distance<18&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.06&&Math.abs(projected.y)<1.06;
        if(shown){ray.set(eye,point.clone().sub(eye).normalize());ray.near=.1;ray.far=distance-.1;shown=!ray.intersectObject(collider,false).length;}
        label.visible=renderer.xr.isPresenting&&shown;name.hidden=!shown;
        if(shown){name.style.left=`${rect.left+(projected.x+1)*rect.width/2}px`;name.style.top=`${rect.top+(1-projected.y)*rect.height/2}px`;}
      }
    },
    blocksMove(x,z,y,nextX,nextZ){return actors.some(({walker})=>Math.abs(y-walker.position.y)<.65&&Math.hypot(nextX-walker.position.x,nextZ-walker.position.z)<NPC_RADIUS+.24&&Math.hypot(nextX-walker.position.x,nextZ-walker.position.z)<Math.hypot(x-walker.position.x,z-walker.position.z));},
    get snapshot(){return {loaded:actors.length,characters:actors.map(({avatar,walker,appearance,name})=>({id:avatar.id,name:avatar.nickname,position:walker.position.toArray(),moving:walker.moving,distance:walker.distance,height:appearance.height,width:appearance.width,triangles:appearance.triangles,routeLength:walker.route.length,labelVisible:!overlay.hidden&&!name.hidden})),bounds:{inner:navigation?Math.min(...navigation.rings.map(r=>Math.hypot(r[0].x,r[0].z))):0}};},
    dispose(){if(disposed)return;disposed=true;overlay.remove();root.removeFromParent();disposeModel(root);actors.length=0;},
  };
}
function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(m=>{if(m.geometry)geometries.add(m.geometry);for(const mat of m.material?(Array.isArray(m.material)?m.material:[m.material]):[]){materials.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
