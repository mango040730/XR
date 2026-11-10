import { Euler, Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { MAX_FRAME_DELTA } from '../../config/defaults';
import type { MovementCollision } from '../collision/CollisionSystem';
import type { MovementInput } from '../input/types';
import type { WorldConfig } from '../world/types';

export class PlayerController {
  readonly rig = new Group();
  seated = false;
  unrestrictedTracking = false;
  private seatHeightOffset = 0;
  private pendingSeatHeight = false;
  private settings?: WorldConfig['player'];
  private collision?: MovementCollision;
  private pitch = 0;
  private direction = new Vector3();
  private xrFeet: Vector3 | null = null;
  private head: Vector3 | null = null;
  private headYaw = 0;
  private readonly up = new Vector3(0, 1, 0);
  thirdPerson = false;

  get feet(): Vector3 { return (this.xrFeet ?? this.rig.position).clone(); }
  get eyePosition(): Vector3 {
    if (this.xrFeet && this.head) return this.feet.add(new Vector3(0,this.head.y + this.seatHeightOffset,0));
    return this.camera.getWorldPosition(new Vector3());
  }
  get xrHeading(): number { return this.rig.rotation.y + this.headYaw; }
  get bodyRadius(): number { return this.settings?.radius ?? 0.28; }
  get bodyHeight(): number { return Math.max(this.settings?.height ?? 1.75, (this.head?.y ?? 0) + 0.1); }

  constructor(readonly camera: PerspectiveCamera) { this.rig.name = 'player-rig'; this.rig.add(camera); }

  spawn(config: WorldConfig, collision: MovementCollision): void {
    this.seated = false; this.seatHeightOffset = 0; this.pendingSeatHeight = false; this.unrestrictedTracking = false;
    this.settings = { ...config.player };
    this.collision = collision;
    this.rig.position.fromArray(config.spawn.position);
    this.rig.rotation.set(0, config.spawn.yaw, 0);
    this.pitch = 0;
    this.xrFeet = this.head = null;
    this.restoreDesktopCamera();
  }

  setSpeed(speed: number): void {
    if (this.settings && Number.isFinite(speed)) this.settings.speed = Math.max(0.5, Math.min(speed, 6));
  }

  look(x: number, y: number): void {
    this.rig.rotation.y -= x * 0.002;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch - y * 0.002));
    this.camera.rotation.set(this.pitch, 0, 0, 'YXZ');
  }

  setThirdPerson(enabled:boolean):void{if(this.thirdPerson===enabled)return;this.thirdPerson=enabled;if(!enabled&&!this.xrFeet)this.camera.position.set(0,this.seated?1.12:this.settings?.eyeHeight??1.65,0);this.updateCamera();}
  updateCamera():void{
    if(this.xrFeet)return;
    const height=this.seated?(this.thirdPerson?1.55:1.12):this.settings?.eyeHeight??1.65;
    if(!this.thirdPerson)return;
    this.rig.updateWorldMatrix(true,false);
    const pivot=new Vector3(0,height,0),desired=new Vector3(0,0,3.4).applyAxisAngle(new Vector3(1,0,0),this.pitch).add(pivot);
    const origin=this.rig.localToWorld(pivot),world=this.rig.localToWorld(desired);
    const clipped=this.collision?.clipCamera?.(origin,world)??world;
    this.camera.position.copy(this.rig.worldToLocal(clipped));this.camera.rotation.set(this.pitch,0,0,'YXZ');
  }

  update(input: MovementInput, delta: number, yaw = this.rig.rotation.y, speed = this.settings?.speed ?? 0): void {
    if (!this.settings || !this.collision || this.seated) return;
    this.direction.set(input.right, 0, -input.forward);
    if (this.direction.lengthSq() > 1) this.direction.normalize();
    if (![input.right, input.forward, delta, yaw, speed].every(Number.isFinite)) return;
    this.direction.applyAxisAngle(this.up, yaw)
      .multiplyScalar(Math.max(0, speed) * Math.max(0, Math.min(delta, MAX_FRAME_DELTA)));
    this.move(this.direction);
  }

  private move(displacement: Vector3): boolean {
    if (!this.settings || !this.collision) return false;
    const position = this.xrFeet ?? this.rig.position;
    const desired = position.clone().add(displacement);
    position.copy(this.collision.move(position, displacement, this.settings.radius, this.bodyHeight));
    this.alignXRRig();
    return desired.distanceToSquared(position) < 0.000001;
  }

  /** Keep tracked head motion independent when configured; virtual movement remains collision checked. */
  updateXRHead(local: Vector3, orientation: Quaternion): boolean {
    if (!this.xrFeet || ![...local.toArray(), ...orientation.toArray()].every(Number.isFinite) || orientation.lengthSq() < 0.001) return false;
    this.headYaw = new Euler().setFromQuaternion(orientation, 'YXZ').y;
    const delta = this.head ? local.clone().sub(this.head).setY(0).applyAxisAngle(this.up, this.rig.rotation.y) : new Vector3();
    this.head = local.clone();
    if (this.pendingSeatHeight) { this.seatHeightOffset = Math.min(0,1.12-local.y); this.pendingSeatHeight = false; }
    // Treat a reference-space discontinuity as rebasing, never a large virtual jump.
    let accepted: boolean;
    if (this.unrestrictedTracking || this.seated) {
      // Never counteract real head motion. Virtual locomotion still uses collision.
      if (delta.length() <= .75) this.xrFeet.add(delta);
      accepted = true;
    } else accepted = delta.length() <= 0.75 && this.move(delta);
    this.alignXRRig();
    return accepted && (this.unrestrictedTracking || this.seated || !!this.collision?.canStand(this.feet, this.bodyRadius, this.bodyHeight));
  }

  rebaseXRTracking(): void { this.head = null; }

  private alignXRRig(): void {
    if (!this.xrFeet || !this.head) return;
    const offset = this.head.clone().setY(0).applyAxisAngle(this.up, this.rig.rotation.y);
    this.rig.position.copy(this.xrFeet).sub(offset);
    this.rig.position.y += this.seatHeightOffset;
    this.rig.updateMatrixWorld(true);
  }

  rotateXR(angle: number): void {
    if (!this.xrFeet || !Number.isFinite(angle)) return;
    this.rig.rotation.y += angle;
    this.alignXRRig(); // rotate around the tracked head/feet, not the tracking origin
  }

  teleportXR(target: Vector3): boolean {
    if (this.seated || !this.xrFeet || !target.toArray().every(Number.isFinite) || !this.collision?.canStand(target, this.bodyRadius, this.bodyHeight)) return false;
    this.xrFeet.copy(target); this.alignXRRig(); return true;
  }

  place(position: Vector3, yaw: number, eyeHeight = this.settings?.eyeHeight ?? 1.65): void {
    this.seated = false; this.seatHeightOffset = 0; this.pendingSeatHeight = false;
    if (this.xrFeet) {
      this.xrFeet.copy(position); this.rig.rotation.y = yaw - this.headYaw; this.alignXRRig();
    } else {
      this.rig.position.copy(position); this.rig.rotation.set(0,yaw,0); this.pitch = 0;
      this.camera.position.set(0,eyeHeight,0); this.camera.rotation.set(0,0,0);
    }
  }
  sit(position: Vector3, yaw: number): void {
    this.place(position,yaw,1.12); this.seated = true;
    // Already physically seated users keep their native local-floor height.
    this.seatHeightOffset = this.xrFeet && this.head ? Math.min(0,1.12-this.head.y) : 0;
    this.alignXRRig();
  }
  prepareXR(): void {
    this.seatHeightOffset = 0; this.pendingSeatHeight = this.seated;
    this.xrFeet = this.rig.position.clone(); this.head = null; this.headYaw = 0;
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
  }

  restoreDesktopCamera(): void {
    if (this.xrFeet) {
      this.rig.position.copy(this.xrFeet);
      this.rig.rotation.y += this.headYaw;
    }
    this.headYaw = 0;
    this.xrFeet = this.head = null;
    this.camera.position.set(0, this.seated ? 1.12 : this.settings?.eyeHeight ?? 1.65, 0);
    this.camera.rotation.set(this.pitch, 0, 0, 'YXZ');
    this.camera.scale.setScalar(1);
    this.camera.updateMatrixWorld(true);
  }

  clear(): void { this.seated = false; this.seatHeightOffset = 0; this.pendingSeatHeight = false; this.unrestrictedTracking = false; this.settings = undefined; this.collision = undefined; this.xrFeet = this.head = null; }
}
