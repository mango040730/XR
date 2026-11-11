import { Box3, Vector3 } from 'three';

export interface FloorArea { minX: number; maxX: number; minZ: number; maxZ: number; y: number; polygon?: Array<[number, number]> }
export function insideFloorPolygon(f: FloorArea, p: Vector3): boolean {
  return !f.polygon || f.polygon.every(([x,z],i) => {
      const [nx,nz]=f.polygon![(i+1)%f.polygon!.length];
      const centerX=(f.minX+f.maxX)/2,centerZ=(f.minZ+f.maxZ)/2;
      const side=(nx-x)*(p.z-z)-(nz-z)*(p.x-x),inside=(nx-x)*(centerZ-z)-(nz-z)*(centerX-x);
      return side*Math.sign(inside)>=-1e-8;
  });
}
export interface CollisionData { floors: FloorArea[]; solids: Box3[]; maxStepHeight?: number }
export interface MovementCollision {
  move(position: Vector3, displacement: Vector3, radius: number, height: number): Vector3;
  canStand(position: Vector3, radius: number, height: number): boolean;
  clipCamera?(origin: Vector3, desired: Vector3): Vector3;
}

/** Flat surfaces and static AABBs, with opt-in small steps between authored floor regions. */
export class CollisionSystem implements MovementCollision {
  constructor(private readonly data: CollisionData) {}

  clipCamera(origin: Vector3, desired: Vector3): Vector3 {
    const direction=desired.clone().sub(origin);let limit=1;
    for(const solid of this.data.solids){
      const box=solid.clone().expandByScalar(.14);let near=0,far=1;
      for(const axis of ['x','y','z'] as const){
        if(Math.abs(direction[axis])<1e-8){if(origin[axis]<box.min[axis]||origin[axis]>box.max[axis]){far=-1;break;}}
        else{const a=(box.min[axis]-origin[axis])/direction[axis],b=(box.max[axis]-origin[axis])/direction[axis];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
      }
      if(far>=near&&far>=0&&near<=1)limit=Math.min(limit,Math.max(0,near-.025));
    }
    const result=origin.clone().addScaledVector(direction,limit);
    const floor=this.data.floors.find(f=>result.x>=f.minX&&result.x<=f.maxX&&result.z>=f.minZ&&result.z<=f.maxZ);
    if(floor)result.y=Math.max(result.y,floor.y+.15);
    return result;
  }

  floorAt(p: Vector3, radius: number): FloorArea | undefined {
    return this.data.floors.filter(f => { const inset=f.polygon?0:radius;return p.x-inset>=f.minX && p.x+inset<=f.maxX && p.z-inset>=f.minZ && p.z+inset<=f.maxZ && insideFloorPolygon(f,p);}).sort((a,b)=>b.y-a.y)[0];
  }

  canStand(p: Vector3, radius: number, height: number): boolean {
    const floor=this.floorAt(p,radius);
    if (!floor || Math.abs(p.y-floor.y)>=.01) return false;
    return !this.data.solids.some(b => p.y < b.max.y - 0.001 && p.y + height > b.min.y + 0.001
      && p.x + radius > b.min.x && p.x - radius < b.max.x
      && p.z + radius > b.min.z && p.z - radius < b.max.z);
  }

  move(position: Vector3, displacement: Vector3, radius: number, height: number): Vector3 {
    const result = position.clone();
    // Small substeps prevent passing through thin walls at high speeds / slow frames.
    const steps = Math.max(1, Math.ceil(Math.hypot(displacement.x, displacement.z) / (radius * 0.5)));
    const candidate = result.clone();
    for (let step = 0; step < steps; step++) {
      for (const axis of ['x', 'z'] as const) {
        candidate.copy(result);
        candidate[axis] += displacement[axis] / steps;
        if (this.data.maxStepHeight) {
          const floor=this.floorAt(candidate,radius);
          if (floor && Math.abs(floor.y-result.y)<=this.data.maxStepHeight+1e-8) candidate.y=floor.y;
        }
        if (this.canStand(candidate, radius, height)) result.copy(candidate);
      }
    }
    return result;
  }
}
