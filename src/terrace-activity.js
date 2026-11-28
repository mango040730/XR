import * as THREE from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import {createTerraceActivityState,nearestTerraceSeat,SEATED_EYE_HEIGHT,SEAT_APPROACH_DISTANCE,CRAFT_IDS} from './terrace-activity-state.js';
import {terraceSeatData} from './terrace-seat-data.js';
import {createTerraceCrafts} from './terrace-crafts.js';
import {createTerraceActivityView} from './terrace-activity-view.js';

const MOVEMENT_KEYS=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

export function createTerraceActivity({scene,camera,rig,renderer,canInteract,onPoseChange}){
  const state=createTerraceActivityState(),crafts=createTerraceCrafts(),canvas=renderer.domElement;
  const view=createTerraceActivityView({scene,camera,canvas});scene.add(crafts.root);
  const ray=new THREE.Raycaster(),eye=new THREE.Vector3(),foot=new THREE.Vector3(),direction=new THREE.Vector3();
  ray.firstHitOnly=true;
  let seats=[],chairMeshes=[],collider=null,savedPose=null,transition=null,gesture=null,pointer=null,lastSignature='',disposed=false;
  const pointers=new Set();
  const originalCursor=canvas.style.cursor;
  function dirty(){renderer.shadowMap.needsUpdate=true;}
  function pose(){return {rig:rig.position.clone(),rotation:rig.quaternion.clone(),camera:camera.position.clone(),angles:camera.rotation.clone()};}
  function stand(){
    if(!state.stand())return false;
    if(savedPose){rig.position.copy(savedPose.rig);rig.quaternion.copy(savedPose.rotation);if(!renderer.xr.isPresenting){camera.position.copy(savedPose.camera);camera.rotation.copy(savedPose.angles);}}
    savedPose=transition=null;crafts.hide();view.update(null);lastSignature='';dirty();onPoseChange();return true;
  }
  function sit(seat){
    if(!state.sit(seat))return false;
    savedPose=pose();onPoseChange();crafts.place(seat);
    const yaw=Math.atan2(-seat.facing[0],-seat.facing[2]);
    if(renderer.xr.isPresenting){
      camera.getWorldDirection(direction);rig.rotation.y+=yaw-Math.atan2(-direction.x,-direction.z);
      camera.getWorldPosition(eye);
      rig.position.add(new THREE.Vector3(seat.position[0],seat.position[1]+SEATED_EYE_HEIGHT,seat.position[2]).sub(eye));
      state.settle();
    }else{
      const targetYaw=yaw-rig.rotation.y;
      transition={from:pose(),target:new THREE.Vector3(seat.position[0],seat.position[1]+.025,seat.position[2]),elapsed:0,
        yaw:camera.rotation.y+Math.atan2(Math.sin(targetYaw-camera.rotation.y),Math.cos(targetYaw-camera.rotation.y))};
    }
    return true;
  }
  function unobstructed(hit){
    if(!collider)return false;
    const obstruction=ray.intersectObject(collider,false)[0];return !obstruction||obstruction.distance>=hit.distance-.025;
  }
  function target(){
    if(!canInteract()||!collider||state.phase==='seating'||state.phase==='guide')return null;
    camera.getWorldPosition(eye);
    if(state.seated){
      const roots=crafts.root.visible?crafts.groups.filter(g=>g.visible):[];
      const hit=ray.intersectObjects(roots,true)[0];
      if(!hit||!unobstructed(hit))return null;
      let item=hit.object;while(item&&!item.userData.craftId)item=item.parent;
      return item?{kind:'craft',id:item.userData.craftId}:null;
    }
    const hit=ray.intersectObjects(chairMeshes,false)[0];
    if(!hit||!unobstructed(hit))return null;
    const seat=seats.reduce((best,s)=>Math.hypot(s.position[0]-hit.point.x,s.position[2]-hit.point.z)<Math.hypot(best.position[0]-hit.point.x,best.position[2]-hit.point.z)?s:best,seats[0]);
    if(!seat||Math.hypot(seat.position[0]-hit.point.x,seat.position[2]-hit.point.z)>.34)return null;
    if(Math.abs(rig.position.y-seat.position[1]-.025)>.2||Math.hypot(eye.x-seat.position[0],eye.z-seat.position[2])>SEAT_APPROACH_DISTANCE)return null;
    return {kind:'seat',seat};
  }
  function setRay(clientX,clientY){
    camera.updateWorldMatrix(true,false);const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);ray.near=.02;ray.far=3;
  }
  function activate(hit){
    if(!hit)return false;
    if(hit.kind==='seat')return sit(hit.seat);
    if(state.choose(hit.id)){crafts.show(hit.id);dirty();return true;}
    return state.phase==='selected';
  }
  function down(event){
    if(!canInteract()||(event.pointerType==='mouse'&&event.button!==0))return;
    pointers.add(event.pointerId);
    if(pointers.size>1){gesture=null;return;}
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  }
  function move(event){
    pointer={x:event.clientX,y:event.clientY};
    if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6)gesture.moved=true;
    if(canInteract()&&!renderer.xr.isPresenting){setRay(event.clientX,event.clientY);canvas.style.cursor=target()?'pointer':originalCursor;}
  }
  function release(event){
    pointers.delete(event.pointerId);
    const tap=gesture;gesture=null;
    if(pointers.size||!tap||tap.id!==event.pointerId||tap.moved||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>6||!canInteract()||renderer.xr.isPresenting)return;
    setRay(event.clientX,event.clientY);activate(target());
  }
  function cancel(event){gesture=null;if(event?.pointerId!==undefined)pointers.delete(event.pointerId);else pointers.clear();}
  function hidden(){if(document.hidden){state.tick(performance.now(),false);cancel();}}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',cancel);
  return {
    configure({seating,collider:body}){
      seats=terraceSeatData(seating);collider=body;chairMeshes=['Terrace_tube_frames','Terrace_tube_cushions'].map(name=>seating.root.getObjectByName(name));
      for(const mesh of chairMeshes)mesh.geometry.boundsTree??=new MeshBVH(mesh.geometry,{indirect:true});
    },
    get seated(){return state.seated;},
    get suppressNotices(){return state.seated||state.hintVisible;},
    stand,
    handleKey(event){
      if(!state.seated)return false;
      if(MOVEMENT_KEYS.has(event.code)||event.code==='KeyR'){stand();return false;}
      if(event.code==='Escape'||event.code==='Space'){stand();return true;}
      const index=['Digit1','Digit2','Digit3'].indexOf(event.code);
      if(index>=0&&state.choose(CRAFT_IDS[index])){crafts.show(state.choice);dirty();return true;}
      return false;
    },
    activateRay(source){
      ray.ray.copy(source.ray);ray.near=.02;ray.far=3;return activate(target());
    },
    update(now,delta){
      if(disposed||!canInteract()){state.tick(now,false);view.update(null);return;}
      if(transition){
        transition.elapsed+=delta;const t=THREE.MathUtils.smoothstep(Math.min(transition.elapsed/.45,1),0,1);
        rig.position.copy(transition.from.rig).lerp(transition.target,t);
        camera.position.copy(transition.from.camera).lerp(new THREE.Vector3(0,SEATED_EYE_HEIGHT,0),t);
        camera.rotation.set(THREE.MathUtils.lerp(transition.from.angles.x,-.5,t),THREE.MathUtils.lerp(transition.from.angles.y,transition.yaw,t),0,'YXZ');
        if(t===1){transition=null;state.settle();}
      }
      camera.getWorldPosition(eye);foot.set(eye.x,rig.position.y,eye.z);
      if(!state.seated)state.approach(nearestTerraceSeat(seats,foot));
      const kind=state.phase==='guide'?'content':state.hintVisible?'sit':null;
      const visible=view.update(kind,state.seat,renderer.xr.isPresenting);
      state.tick(now,!document.hidden&&(!kind||visible));
      const signature=`${state.phase}:${state.choice}`;
      if(signature!==lastSignature){
        if(state.phase==='choices'||state.phase==='selected')crafts.show(state.choice);else crafts.hide();
        if(state.phase!=='guide'&&kind==='content')view.update(null);
        lastSignature=signature;dirty();
      }
      if(pointer&&!gesture&&!renderer.xr.isPresenting){setRay(pointer.x,pointer.y);canvas.style.cursor=target()?'pointer':originalCursor;}
    },
    get snapshot(){
      camera.updateWorldMatrix(true,false);
      const project=point=>{const p=point.clone().project(camera),r=canvas.getBoundingClientRect();return [r.left+(p.x+1)*r.width/2,r.top+(1-p.y)*r.height/2];};
      return {phase:state.phase,seatId:state.seat?.id??null,nearSeatId:state.nearSeat?.id??null,choice:state.choice,eye:camera.getWorldPosition(new THREE.Vector3()).toArray(),direction:camera.getWorldDirection(new THREE.Vector3()).toArray(),
        seats:seats.map(s=>({id:s.id,setId:s.setId,tier:s.tier,type:s.type,position:[...s.position],facing:[...s.facing],screen:project(new THREE.Vector3(...s.position).add(new THREE.Vector3(0,.46,0)))})),
        crafts:crafts.groups.map(g=>{const point=g.localToWorld(new THREE.Vector3(...g.userData.pickPoint));return {id:g.userData.craftId,visible:crafts.root.visible&&g.visible,position:point.toArray(),screen:project(point)};})};
    },
    dispose(){if(disposed)return;disposed=true;state.dispose();view.dispose();crafts.dispose();canvas.style.cursor=originalCursor;
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',release);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);
      document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',cancel);
    },
  };
}
