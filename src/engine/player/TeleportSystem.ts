import { Box3, Ray, Vector3 } from 'three';
import type { CollisionData, FloorArea, MovementCollision } from '../collision/CollisionSystem';

export interface TeleportConfig { areas: FloorArea[]; maxDistance: number }
export interface TeleportCandidate { point: Vector3 | null; valid: boolean; reason: string }

/** Flat-floor teleport validation independent of renderer and input devices. */
export class TeleportSystem {
  constructor(private data: CollisionData, private collision: MovementCollision, private radius: number,
    private height: number, private config: TeleportConfig) {}

  validate(from: Vector3, target: Vector3, bodyHeight = this.height): TeleportCandidate {
    const height = Math.max(this.height, Number.isFinite(bodyHeight) ? bodyHeight : this.height);
    const reject = (reason: string) => ({ point: target.clone(), valid: false, reason });
    if (![...from.toArray(), ...target.toArray()].every(Number.isFinite)) return reject('유효하지 않은 좌표');
    if (!Number.isFinite(this.config.maxDistance) || this.config.maxDistance <= 0 || from.distanceTo(target) > this.config.maxDistance) return reject('이동 가능 거리 밖입니다');
    if (Math.abs(from.y - target.y) > 0.01) return reject('현재 단계에서는 같은 높이의 바닥만 지원합니다');
    if (!this.config.areas.some(f => Math.abs(target.y - f.y) < 0.01 && target.x - this.radius >= f.minX
      && target.x + this.radius <= f.maxX && target.z - this.radius >= f.minZ && target.z + this.radius <= f.maxZ)) return reject('텔레포트 허용 영역 밖입니다');
    if (!this.collision.canStand(target, this.radius, height)) return reject('목적지에 벽이나 장애물이 있습니다');
    const direction = target.clone().sub(from); const distance = direction.length();
    if (distance > 0.001) {
      const ray = new Ray(from, direction.clone().normalize());
      // Sweep the full body footprint, not just the controller ray or center point.
      for (const box of this.data.solids) {
        const expanded = new Box3(box.min.clone().sub(new Vector3(this.radius, height, this.radius)),
          box.max.clone().add(new Vector3(this.radius, 0, this.radius)));
        const hit = ray.intersectBox(expanded, new Vector3());
        if (hit && hit.distanceTo(from) < distance) return reject('벽이나 장애물 너머로 이동할 수 없습니다');
      }
      const reached = this.collision.move(from, direction, this.radius, height);
      if (reached.distanceTo(target) > 0.001) return reject('경로에 바닥이 없거나 통과할 수 없습니다');
    }
    return { point: target.clone(), valid: true, reason: '놓으면 이 위치로 이동합니다' };
  }

  aim(ray: Ray, from: Vector3, bodyHeight = this.height): TeleportCandidate {
    if (![...ray.origin.toArray(), ...ray.direction.toArray()].every(Number.isFinite) || ray.direction.y >= -0.05) {
      return { point: null, valid: false, reason: '바닥을 가리키세요' };
    }
    let nearest: Vector3 | null = null;
    for (const floor of this.data.floors) {
      const t = (floor.y - ray.origin.y) / ray.direction.y;
      if (t <= 0 || t > 30) continue;
      const point = ray.at(t, new Vector3());
      if (point.x < floor.minX || point.x > floor.maxX || point.z < floor.minZ || point.z > floor.maxZ) continue;
      if (!nearest || point.distanceToSquared(ray.origin) < nearest.distanceToSquared(ray.origin)) nearest = point;
    }
    if (!nearest) return { point: null, valid: false, reason: '이동할 바닥을 찾을 수 없습니다' };
    for (const box of this.data.solids) {
      const hit = ray.intersectBox(box, new Vector3());
      if (hit && hit.distanceToSquared(ray.origin) < nearest.distanceToSquared(ray.origin) - 0.001) {
        return { point: hit, valid: false, reason: '컨트롤러와 목적지 사이에 장애물이 있습니다' };
      }
    }
    return this.validate(from, nearest, bodyHeight);
  }
}
