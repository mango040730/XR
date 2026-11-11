import { TeleportSystem } from '../src/engine/player/TeleportSystem';
import {describe,expect,it} from 'vitest';
import {Box3,Group,Ray,Vector3} from 'three';
import {createWorld} from '../src/engine/world/createWorld';
import {CollisionSystem} from '../src/engine/collision/CollisionSystem';
import {myRoom} from '../src/worlds/my-room/config';
import {myRoomSeats} from '../src/worlds/my-room/seats';
import {screenWorld} from '../src/experience/screenWorld';
import {screens} from '../src/routing/ServiceRouter';
import {RoomService} from '../server/RoomService';
import type {RoomLayout} from '../shared/social';

const collision=()=>new CollisionSystem({floors:myRoom.floors.map(f=>({minX:f.center[0]-f.size[0]/2,maxX:f.center[0]+f.size[0]/2,minZ:f.center[1]-f.size[1]/2,maxZ:f.center[1]+f.size[1]/2,y:f.y,polygon:f.polygon})),maxStepHeight:myRoom.player.maxStepHeight,solids:myRoom.boxes.map(b=>new Box3().setFromCenterAndSize(new Vector3(...b.position),new Vector3(...b.size)))});

describe('provided GLB my room and screen ownership',()=>{
 it('uses my room on every non-content route with or without a finished session',()=>{
  for(const screen of screens){
   const expected=screen==='loading'?null:['simulation','pause','confirm-home'].includes(screen)?'indoor-fishing':'my-room';
   expect(screenWorld(screen,{mode:'social',ended:false})).toBe(expected);
   expect(screenWorld(screen,{mode:'social',ended:true})).toBe(screen==='loading'?null:'my-room');
  }
  expect(screenWorld('simulation',{mode:'solo',ended:false})).toBe('woodworking');
  expect(screenWorld('simulation',{mode:'team',ended:false})).toBe('glb-test-room');
 });
 it('has a supported spawn and valid stand locations for actual lounge furniture',()=>{
  const system=collision();expect(system.canStand(new Vector3(...myRoom.spawn.position),.22,1.75)).toBe(true);
  for(const seat of myRoomSeats)expect(system.canStand(new Vector3(...seat.stand),.22,1.75),seat.id).toBe(true);
  expect(system.canStand(new Vector3(1.65,.02,2.05),.22,1.75)).toBe(false);
  expect(system.move(new Vector3(...myRoom.spawn.position),new Vector3(10,0,0),.22,1.75).x).toBeLessThanOrEqual(3.98);
 });
 it('steps up and down authored convex floor regions without changing other worlds',()=>{
  const data={floors:[{minX:-3,maxX:3,minZ:-3,maxZ:3,y:.02},{minX:-1,maxX:1,minZ:-1,maxZ:1,y:.18,polygon:[[-1,-.7],[-.7,-1],[.7,-1],[1,-.7],[1,.7],[.7,1],[-.7,1],[-1,.7]] as Array<[number,number]>}],solids:[]};
  const flat=new CollisionSystem(data),step=new CollisionSystem({...data,maxStepHeight:.18});
  expect(flat.move(new Vector3(2,.02,0),new Vector3(-2,0,0),.1,1.75).x).toBeGreaterThan(.8);
  const raised=step.move(new Vector3(2,.02,0),new Vector3(-2,0,0),.1,1.75);expect(raised.y).toBe(.18);
  expect(step.move(raised,new Vector3(2,0,0),.1,1.75).y).toBe(.02);
  expect(step.floorAt(new Vector3(.98,.02,.98),.01)?.y).toBe(.02);
  expect(step.canStand(new Vector3(0,.02,0),.1,1.75)).toBe(false);
  const teleport=new TeleportSystem({...data,maxStepHeight:.18},step,.01,1.75,{areas:data.floors,maxDistance:8});
  const corner=teleport.aim(new Ray(new Vector3(.98,3,.98),new Vector3(0,-1,0)),new Vector3(2,.02,2));
  expect(corner.valid).toBe(true);expect(corner.point?.y).toBeCloseTo(.02);
 });
 it('uses the same floor step on the authoritative server and rejects unsupported vertical movement',()=>{
  const layout:RoomLayout={id:'step',name:'Step',spawn:{position:[.3,.02,0],yaw:0},player:{speed:3,radius:.05,height:1.75,eyeHeight:1.65,maxStepHeight:.18},floors:[{minX:-2,maxX:2,minZ:-2,maxZ:2,y:.02},{minX:-2,maxX:0,minZ:-2,maxZ:2,y:.18}],solids:[],seats:[]};
  let time=10000;const server=new RoomService([layout],()=>time);server.join('a',{world:'step',room:'test',nickname:'A'});time+=200;
  expect(server.update('a',{position:[-.2,.18,0],yaw:0})).toBe(true);expect(server.user('a')?.position[1]).toBe(.18);
  time+=200;expect(server.update('a',{position:[-.3,.4,0],yaw:0})).toBe(false);
 });
 it('owns preparation resources through successful or failed staging and disposes once',async()=>{
  const root=new Group();let releases=0;
  const world=await createWorld({...myRoom,model:undefined,build:undefined,prepare({onDispose}){onDispose(()=>releases++);throw new Error('staging failed');}},{root,signal:new AbortController().signal,progress:()=>{}});
  await expect(world.prepare!(null!,null!,new AbortController().signal)).rejects.toThrow('staging failed');
  world.dispose();world.dispose();expect(releases).toBe(1);expect(root.children).toHaveLength(0);
 });
});
