import {describe,it,expect} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import {doorPath,doorway,homeCollision} from '../src/worlds/my-room/doorway';
import {myRoom} from '../src/worlds/my-room/config';
import {myRoomSeats} from '../src/worlds/my-room/seats';
import {preparePortal,setPortalOpen} from '../src/worlds/my-room/portal';
import {batchMyRoom} from '../src/worlds/my-room/model';
import {disposeObject} from '../src/engine/assets/disposeObject';

describe('actual room doorway navigation',()=>{
 it('connects every authored seat exit to the door without crossing furniture or unsupported floors',()=>{
  const collision=homeCollision(myRoom);
  for(const seat of myRoomSeats){const route=doorPath(new Vector3(...seat.stand),myRoom);expect(route.at(-1)!.toArray()).toEqual(doorway.approach);
   for(let i=1;i<route.length;i++)expect(collision.move(route[i-1],route[i].clone().sub(route[i-1]),myRoom.player.radius,myRoom.player.height).distanceTo(route[i])).toBeLessThan(.015);
  }
  expect(homeCollision(myRoom).canStand(new Vector3(...doorway.arrival),.22,1.75)).toBe(true);
  expect(homeCollision(myRoom).canStand(new Vector3(...doorway.threshold),.22,1.75)).toBe(true);
  expect(homeCollision(myRoom).canStand(new Vector3(...doorway.approach),.22,1.75)).toBe(true);
  // The inward-opening 1.42m leaf must not sweep through the waiting camera/body.
  expect(Math.hypot(doorway.approach[0]-1.52,doorway.approach[2]+3.385)).toBeGreaterThan(1.42+myRoom.player.radius);
  const inward=new Vector3(0,0,-1).applyAxisAngle(new Vector3(0,1,0),doorway.inwardYaw);expect(inward.z).toBeGreaterThan(.99);
 });
 it('rejects a departure inside solid furniture instead of passing through it',()=>{expect(()=>doorPath(new Vector3(1.65,.02,2.05),myRoom)).toThrow();});
 it('retains the original moving leaf through static batching and releases its resources on exit',()=>{
  const root=new Group(),portal=new Group();portal.name='MainPortal';portal.position.set(2.23,0,-3.48);root.add(portal);
  const material=new MeshStandardMaterial(),geometry=new BoxGeometry(1.42,2.48,.075),leaf=new Mesh(geometry,material);leaf.name='Single symbolic timber door';leaf.position.set(0,1.28,.095);portal.add(leaf);
  const frame=new Mesh(new BoxGeometry(.2,2.8,.2),material);frame.name='Portal monumental oak post';portal.add(frame);root.updateMatrixWorld(true);
  const before=leaf.getWorldPosition(new Vector3());preparePortal(root);expect(leaf.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-8);batchMyRoom(root);expect(root.getObjectByName(leaf.name)).toBe(leaf);
  setPortalOpen(root,1);root.updateMatrixWorld(true);expect(leaf.getWorldPosition(new Vector3()).distanceTo(before)).toBeGreaterThan(.5);expect(root.getObjectByName('Home door opening')!.visible).toBe(true);
  setPortalOpen(root,0);root.updateMatrixWorld(true);expect(leaf.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-8);
  let freed=0;geometry.addEventListener('dispose',()=>freed++);disposeObject(root);expect(freed).toBe(1);
 });
});
