import {describe,it,expect} from 'vitest';
import {Box3,Vector3} from 'three';
import {bowling} from '../src/worlds/bowling/config';
import {worlds} from '../src/worlds/registry';
import {modes} from '../src/data/demo';
import {screenWorld} from '../src/experience/screenWorld';
import {CollisionSystem} from '../src/engine/collision/CollisionSystem';

const collision=()=>new CollisionSystem({floors:bowling.floors.map(f=>({minX:f.center[0]-f.size[0]/2,maxX:f.center[0]+f.size[0]/2,minZ:f.center[1]-f.size[1]/2,maxZ:f.center[1]+f.size[1]/2,y:f.y})),solids:bowling.boxes.map(b=>new Box3().setFromCenterAndSize(new Vector3(...b.position),new Vector3(...b.size))),maxStepHeight:bowling.player.maxStepHeight});
describe('attached bowling space',()=>{
 it('routes team into the registered bowling world and keeps it for the completed rating',()=>{
  expect(modes.find(m=>m.id==='team')?.world).toBe('bowling');expect(worlds).toContain(bowling);
  expect(screenWorld('simulation',{mode:'team',ended:false})).toBe('bowling');expect(screenWorld('rating',{mode:'team',ended:true})).toBe('bowling');
  expect(modes.find(m=>m.id==='solo')?.world).toBe('woodworking');expect(modes.find(m=>m.id==='social')?.world).toBe('indoor-fishing');
 });
 it('supports the authored spawn, furniture collisions, connected floor areas and lane exclusion',()=>{
  const c=collision(),r=bowling.player.radius,h=bowling.player.height;
  expect(c.canStand(new Vector3(...bowling.spawn.position),r,h)).toBe(true);
  expect(c.canStand(new Vector3(1,0,-2.2),r,h)).toBe(false);
  const aisle=c.move(new Vector3(7.5,0,-1),new Vector3(0,0,-20),r,h);expect(aisle.z).toBeCloseTo(-21);
  const approach=c.move(new Vector3(0,0,-6.7),new Vector3(0,0,-4),r,h);expect(approach.z).toBeCloseTo(-10.7);expect(approach.y).toBe(0);
  const boundary=c.move(approach,new Vector3(0,0,-4),r,h);expect(boundary.z).toBeGreaterThan(-11.75);expect(c.canStand(new Vector3(0,0,-20),r,h)).toBe(false);
  expect(c.move(new Vector3(7.5,0,-15),new Vector3(4,0,0),r,h).x).toBeLessThanOrEqual(8.62);
 });
});
