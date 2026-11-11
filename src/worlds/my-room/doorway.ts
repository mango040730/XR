import {Box3,Vector3} from 'three';
import {CollisionSystem} from '../../engine/collision/CollisionSystem';
import type {WorldConfig} from '../../engine/world/types';

export const doorway={arrival:[2.23,.02,-2.85] as [number,number,number],threshold:[2.23,.02,-3.32] as [number,number,number],inwardYaw:Math.PI,outwardYaw:0};
export function homeCollision(config:WorldConfig):CollisionSystem{
 return new CollisionSystem({floors:config.floors.map(f=>({minX:f.center[0]-f.size[0]/2,maxX:f.center[0]+f.size[0]/2,minZ:f.center[1]-f.size[1]/2,maxZ:f.center[1]+f.size[1]/2,y:f.y,polygon:f.polygon})),solids:config.boxes.filter(b=>b.solid!==false).map(b=>new Box3().setFromCenterAndSize(new Vector3(...b.position),new Vector3(...b.size))),maxStepHeight:config.player.maxStepHeight});
}
/** A short collision-checked route through the actual room, including the raised platform. */
export function doorPath(start:Vector3,config:WorldConfig):Vector3[]{
 const collision=homeCollision(config),radius=config.player.radius,height=config.player.height,target=new Vector3(...doorway.arrival);
 const reaches=(a:Vector3,b:Vector3)=>collision.move(a,b.clone().sub(a),radius,height).distanceTo(b)<.015;
 if(!collision.canStand(start,radius,height)||!collision.canStand(target,radius,height))throw new Error('방문으로 이동할 수 있는 위치가 아닙니다.');
 if(reaches(start,target))return [start.clone(),target];
 const step=.16,nodes:Vector3[]=[],grid=new Map<string,number>(),keys:Array<[number,number]>=[];
 for(let x=0;x<=49;x++)for(let z=0;z<=42;z++){
  const p=new Vector3(-3.92+x*step,.02,-3.36+z*step),floor=collision.floorAt(p,radius);if(!floor)continue;p.y=floor.y;
  if(collision.canStand(p,radius,height)){grid.set(`${x},${z}`,nodes.length);keys.push([x,z]);nodes.push(p);}
 }
 const nearest=(point:Vector3)=>nodes.map((p,i)=>({i,d:p.distanceToSquared(point)})).sort((a,b)=>a.d-b.d).find(({i})=>reaches(point,nodes[i]))?.i;
 const from=nearest(start),to=nearest(target);if(from===undefined||to===undefined)throw new Error('방문까지의 안전한 통로를 찾지 못했습니다.');
 const open=new Set([from]),g=new Map([[from,0]]),previous=new Map<number,number>();
 while(open.size){
  const current:number=[...open].reduce((a:number,b:number):number=>(g.get(a)!+nodes[a].distanceTo(nodes[to]))<(g.get(b)!+nodes[b].distanceTo(nodes[to]))?a:b);
  if(current===to){
   const route=[target.clone(),nodes[to]];let cursor=to;while(previous.has(cursor)){cursor=previous.get(cursor)!;route.push(nodes[cursor]);}route.push(start.clone());route.reverse();
   const smooth=[route[0]];for(let i=0;i<route.length-1;){let next=route.length-1;while(next>i+1&&!reaches(route[i],route[next]))next--;smooth.push(route[next]);i=next;}return smooth;
  }
  open.delete(current);const [x,z]=keys[current];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=grid.get(`${x+dx},${z+dz}`);if(next===undefined||!reaches(nodes[current],nodes[next]))continue;
   const score=g.get(current)!+nodes[current].distanceTo(nodes[next]);if(score>=(g.get(next)??Infinity))continue;previous.set(next,current);g.set(next,score);open.add(next);
  }
 }
 throw new Error('가구를 피해 방문으로 이동할 수 없습니다.');
}
