import { describe,expect,it } from 'vitest';
import { Box3, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { FishingState } from '../src/worlds/indoor-fishing/state';
import { indoorFishing } from '../src/worlds/indoor-fishing/config';
import { entry, seats } from '../src/worlds/indoor-fishing/layout';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem';
import { PlayerController } from '../src/engine/player/PlayerController';
import { TeleportSystem } from '../src/engine/player/TeleportSystem';
const data={floors:indoorFishing.floors.map(f=>({minX:f.center[0]-f.size[0]/2,maxX:f.center[0]+f.size[0]/2,minZ:f.center[1]-f.size[1]/2,maxZ:f.center[1]+f.size[1]/2,y:f.y})),solids:indoorFishing.boxes.map(b=>{const p=new Vector3(...b.position),h=new Vector3(...b.size).multiplyScalar(.5);return new Box3(p.clone().sub(h),p.clone().add(h));})};
const collision=new CollisionSystem(data);
describe('indoor fishing layout and shared state',()=>{
 it('has unique seats, five explicit NPC owners and safe spawn/stand anchors',()=>{
  expect(new Set(seats.map(s=>s.id)).size).toBe(12);expect(seats.filter(s=>s.npc)).toHaveLength(5);
  for(const p of [entry.position,...seats.map(s=>s.stand)])expect(collision.canStand(new Vector3(...p),.25,1.75),`safe anchor ${p}`).toBe(true);
 });
 it('blocks the pool, chairs, shelves and walls and rejects teleport destinations there',()=>{
  const teleport=new TeleportSystem(data,collision,.25,1.75,{areas:data.floors,maxDistance:20});
  for(const p of [[0,0,0],[4.2,0,0],[3,0,3.22],[5.5,0,-4.98],[7.5,0,0]]){
   expect(collision.canStand(new Vector3(...p),.25,1.75)).toBe(false);
   expect(teleport.validate(new Vector3(...entry.position),new Vector3(...p)).valid).toBe(false);
  }
  const stopped=collision.move(new Vector3(6.1,0,0),new Vector3(-8,0,0),.25,1.75);expect(stopped.x).toBeGreaterThanOrEqual(4.625);
 });
 it('reserves only free seats, clears cast and releases ownership on stand/switch/dispose',()=>{
  const state=new FishingState();expect(state.occupancy.size).toBe(5);
  expect(state.sit('N1')).toBe(false);expect(state.toggleCast()).toBe(false);expect(state.sit('S1')).toBe(true);
  state.toggleCast();expect(state.user.fishing).toBe('cast');state.toggleCast();expect(state.user.fishing).toBe('idle');
  state.toggleCast();state.sit('S3');expect(state.occupancy.has('S1')).toBe(false);expect(state.user.fishing).toBe('idle');
  state.stand();expect(state.user.seatId).toBeNull();expect(state.occupancy.size).toBe(5);state.toggleSamples();expect(state.occupancy.size).toBe(0);
  state.sit('N1');state.dispose();expect(state.occupancy.size).toBe(0);
 });
 it('locks virtual walking while seated, keeps XR tracking and avoids a double seated height offset',()=>{
  const p=new PlayerController(new PerspectiveCamera());p.spawn(indoorFishing,collision);p.prepareXR();
  p.unrestrictedTracking=true;p.updateXRHead(new Vector3(.2,1.08,.1),new Quaternion());p.sit(new Vector3(...seats[0].position),0);
  const origin=p.feet;p.update({right:1,forward:1},.05);expect(p.feet.toArray()).toEqual(origin.toArray());
  expect(p.rig.position.y).toBe(0);p.updateXRHead(new Vector3(.25,1.1,.1),new Quaternion());expect(p.feet.x).toBeCloseTo(origin.x+.05);
  expect(p.teleportXR(new Vector3(...entry.position))).toBe(false);
  p.place(new Vector3(...seats[0].stand),0);expect(p.seated).toBe(false);p.restoreDesktopCamera();expect(p.camera.position.y).toBe(1.65);
 });
 it('applies a single baseline offset to a standing XR user and preserves subsequent head movement',()=>{
  const p=new PlayerController(new PerspectiveCamera());p.spawn(indoorFishing,collision);p.prepareXR();p.unrestrictedTracking=true;
  p.updateXRHead(new Vector3(0,1.7,0),new Quaternion());p.sit(new Vector3(...seats[0].position),0);expect(p.rig.position.y+1.7).toBeCloseTo(1.12);expect(p.eyePosition.y).toBeCloseTo(1.12);
  p.updateXRHead(new Vector3(0,1.6,0),new Quaternion());expect(p.rig.position.y+1.6).toBeCloseTo(1.02);
 });
});

// Exercise the same actual geometry/ray action path without substituting a success adapter.
import { vi } from 'vitest';
import { Group, Ray } from 'three';
import { createWorld } from '../src/engine/world/createWorld';
import { FishingSession } from '../src/worlds/indoor-fishing/runtime';
import { InteractionSystem } from '../src/engine/interaction/InteractionSystem';
describe('fishing scene lifecycle and controller rays',()=>{
 it('builds solid geometry, selects a chair and rod without UI, animates and releases all resources',async()=>{
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},fillStyle:'',font:'',textAlign:'',textBaseline:''})})});
  try{
   const root=new Group();const world=await createWorld(indoorFishing,{root,signal:new AbortController().signal,progress:()=>{}});
   const player=new PlayerController(new PerspectiveCamera());player.spawn(indoorFishing,new CollisionSystem(world.collision));
   const interactions=new InteractionSystem();interactions.setWorld(root);
   const session=new FishingSession({root,player,interactions,isXR:()=>false});
   const controls:string[]=[];root.traverse(n=>{if(n.userData.interactionId)controls.push(n.userData.interactionId);});
   expect(controls.some(id=>/^(cast:|stand:|home$|samples$|quality$)/.test(id))).toBe(false);
   player.place(new Vector3(1,0,4.25),0);
   const select=(from:Vector3,to:Vector3)=>{expect(interactions.updateRay('controller',new Ray(from,to.clone().sub(from).normalize()),from)).not.toBeNull();interactions.activate('controller');};
   select(new Vector3(1,1.65,4.25),new Vector3(1,.85,3.47));expect(session.state.user.seatId).toBe('S3');
   select(new Vector3(1,1.12,3.22),new Vector3(1.2,1.05,2.47));expect(session.state.user.fishing).toBe('cast');
   session.update(3);const float=root.children.find(n=>n.position.x===1.15&&Math.abs(n.position.z-1.25)<.001);expect(float).toBeDefined();
   select(new Vector3(1,1.12,3.22),new Vector3(1.2,1.05,2.47));expect(session.state.user.fishing).toBe('idle');
   session.perform('stand');expect(session.state.user.seatId).toBeNull();expect(player.feet.toArray()).toEqual([1,0,4.25]);
   const resources=new Set<{addEventListener(type:'dispose',listener:()=>void):void}>();
   root.traverse(n=>{const mesh=n as import('three').Mesh;if(mesh.geometry)resources.add(mesh.geometry);if(mesh.material)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])resources.add(m);});
   let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);
   session.dispose();interactions.dispose();world.dispose();expect(disposed).toBe(resources.size);expect(root.children).toHaveLength(0);
  }finally{vi.unstubAllGlobals();}
 });
});

describe('random catch deadline',()=>{
 it('never catches before 30 seconds, catches once at its deadline and can cast again',()=>{
  let now=0;const state=new FishingState(()=>0,()=>now);state.sit('S3');state.toggleCast();
  now=29_999;expect(state.tick()).toBeNull();expect(state.user.catchCount).toBe(0);
  now=30_000;expect(state.tick()).toEqual({species:'pomfret',name:'병어',lengthCm:20});expect(state.user.fishing).toBe('caught');expect(state.user.catchCount).toBe(1);
  now=1_000_000;expect(state.tick()).toBeNull();expect(state.user.catchCount).toBe(1);
  state.toggleCast();expect(state.user.fishing).toBe('cast');now+=29_999;expect(state.tick()).toBeNull();now++;expect(state.tick()).not.toBeNull();expect(state.user.catchCount).toBe(2);
 });
 it('supports the two minute upper boundary and draws a new delay for each cast',()=>{
  let now=0,random=1;const state=new FishingState(()=>random,()=>now);state.sit('S3');state.toggleCast();
  now=119_999;expect(state.tick()).toBeNull();now=120_000;expect(state.tick()).not.toBeNull();
  random=.5;state.toggleCast();now+=74_999;expect(state.tick()).toBeNull();now++;expect(state.tick()).not.toBeNull();
 });
 it('cancels pending catches on manual reel, seat change, stand and disposal',()=>{
  for(const cancel of [(s:FishingState)=>s.toggleCast(),(s:FishingState)=>s.sit('S1'),(s:FishingState)=>s.stand(),(s:FishingState)=>s.dispose()]){
   let now=0;const state=new FishingState(()=>0,()=>now);state.sit('S3');state.toggleCast();cancel(state);now=400_000;
   expect(state.tick()).toBeNull();expect(state.user.catchCount).toBe(0);
  }
 });
});

it('catches only the three displayed species and keeps each generated length inside its gameplay range',()=>{
 for(const [random,id,name,min,max] of [[0,'pomfret','병어',20,32],[.5,'mackerel','고등어',25,45],[1,'mullet','숭어',35,65]] as const){
  let now=0;const state=new FishingState(()=>random,()=>now);state.sit('S3');state.toggleCast();now=120_000;
  const caught=state.tick()!;expect(caught.species).toBe(id);expect(caught.name).toBe(name);expect(caught.lengthCm).toBeGreaterThanOrEqual(min);expect(caught.lengthCm).toBeLessThanOrEqual(max);
  expect(state.tick()).toBeNull();state.dispose();
 }
});
