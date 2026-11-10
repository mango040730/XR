import { Box3, Vector3 } from 'three';

export interface FloorArea { minX: number; maxX: number; minZ: number; maxZ: number; y: number }
export interface CollisionData { floors: FloorArea[]; solids: Box3[] }
export interface MovementCollision {
  move(position: Vector3, displacement: Vector3, radius: number, height: number): Vector3;
  canStand(position: Vector3, radius: number, height: number): boolean;
  clipCamera?(origin: Vector3, desired: Vector3): Vector3;
}

/** Phase 1: flat, same-height floors + static AABBs. No slopes, gravity or stairs. */
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

  canStand(p: Vector3, radius: number, height: number): boolean {
    const supported = this.data.floors.some(f => Math.abs(p.y - f.y) < 0.01
      && p.x - radius >= f.minX && p.x + radius <= f.maxX
      && p.z - radius >= f.minZ && p.z + radius <= f.maxZ);
    if (!supported) return false;
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
        if (this.canStand(candidate, radius, height)) result.copy(candidate);
      }
    }
    return result;
  }
}
