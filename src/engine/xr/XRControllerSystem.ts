import { Matrix4, Quaternion, Ray, Vector3 } from 'three';
import type { Renderer } from '../rendering/Renderer';
import type { PlayerController } from '../player/PlayerController';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { WorldInstance } from '../world/types';
import { CollisionSystem } from '../collision/CollisionSystem';
import { TeleportSystem } from '../player/TeleportSystem';
import { XRInput } from '../input/XRInput';
import { Signal } from '../core/Signal';
import { XRVisuals } from './XRVisuals';
import { xrSettings } from './settings';
import type { XRLocomotionSettings } from './settings';

export interface XRControllerState { controllers: string; tracking: boolean; blocked: boolean; message: string }
type XRVisualPort = Pick<XRVisuals, 'active' | 'hidePointers' | 'ray' | 'teleport' | 'status' | 'dispose'>;

/** Native XRFrame adapter composing input, common movement/actions and XR visuals. */
export class XRControllerSystem {
  readonly changes = new Signal<XRControllerState>();
  state: XRControllerState = { controllers: '컨트롤러 연결 대기', tracking: false, blocked: false, message: '' };
  settings = xrSettings();
  private input = new XRInput();
  private visuals: XRVisualPort;
  private session: XRSession | null = null;
  private reference: XRReferenceSpace | null = null;
  private world: WorldInstance | null = null;
  private teleport: TeleportSystem | null = null;
  private actionMessage = '';
  private actionTime = 0;
  private time = 0;
  private stopActions: () => void;
  private onReset = () => { this.player.rebaseXRTracking(); this.input.clear(); this.interactions.clearHover(); this.visuals.hidePointers(); };

  constructor(private rendering: Renderer, private player: PlayerController, private interactions: InteractionSystem, visuals?: XRVisualPort) {
    this.visuals = visuals ?? new XRVisuals(rendering.scene, rendering.camera);
    this.stopActions = interactions.messages.subscribe(message => { this.actionMessage = message; this.actionTime = this.time; });
  }

  setWorld(world: WorldInstance | null): void {
    this.world = world; this.teleport = null; this.input.clear(); this.visuals.hidePointers(); this.actionMessage = '';
    this.settings = xrSettings(world?.config.xr);
    if (world) this.teleport = new TeleportSystem(world.collision, new CollisionSystem(world.collision),
      world.config.player.radius, world.config.player.height, world.config.teleport ?? { areas: world.collision.floors, maxDistance: 8 });
  }

  setSettings(patch: Partial<XRLocomotionSettings>): void {
    if (this.session) return; // choose comfort settings before entering VR
    this.settings = xrSettings({ ...this.settings, ...patch }); this.input.clear();
  }

  start(session: XRSession): void {
    this.session = session; this.input.connect(session); this.player.prepareXR();
    this.interactions.clearHover(); this.visuals.active(true); this.actionMessage = '';
    this.publish({ controllers: '컨트롤러 연결 대기', tracking: false, blocked: false, message: '추적 시작 대기' });
  }

  private publish(state: XRControllerState): void {
    if (JSON.stringify(state) === JSON.stringify(this.state)) return;
    this.state = state; this.changes.emit(state);
  }

  update(frame: XRFrame, time: number, delta: number, locomotion=true): void {
    if (!this.session || !this.world) return;
    this.time = time;
    const reference = this.rendering.webgl.xr.getReferenceSpace();
    if (reference !== this.reference) {
      this.reference?.removeEventListener('reset', this.onReset);
      this.reference = reference; reference?.addEventListener('reset', this.onReset); this.onReset();
    }
    const sources = Array.from(this.session.inputSources).filter(source => source.targetRayMode === 'tracked-pointer').slice(0, 2);
    const connections = sources.map(source => `${source.handedness}: ${source.gamepad?.mapping === 'xr-standard' ? '표준 입력' : 'Ray 전용'}`).join(' / ') || '컨트롤러 연결 대기';
    const pose = reference && this.session.visibilityState === 'visible' ? frame.getViewerPose(reference) : null;
    this.visuals.hidePointers();
    if (!pose || !reference) {
      this.input.clear(); this.player.rebaseXRTracking(); this.interactions.clearHover();
      this.visuals.status('추적 또는 세션 포커스를 기다리는 중\n안전한 위치에서 다시 시작하세요', true);
      this.publish({ controllers: connections, tracking: false, blocked: true, message: '추적 대기 · 이동 중지' }); return;
    }
    const position = pose.transform.position; const rotation = pose.transform.orientation;
    const accepted = this.player.updateXRHead(new Vector3(position.x, position.y, position.z), new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w));
    if (!accepted) this.input.clear();
    const intent = this.input.sample(this.settings, delta);
    if (accepted && locomotion) {
      this.player.rotateXR(intent.turn);
      this.player.update(this.input.readMovement(), delta, this.player.xrHeading, this.settings.moveSpeed);
    }
    this.player.rig.updateWorldMatrix(true, true);
    const observer = this.player.eyePosition;
    let message = accepted ? '왼쪽 스틱 앞으로: 텔레포트 / 오른쪽 좌우: 회전' : '경계에 도달했습니다. 안전한 쪽으로 이동하세요';
    for (let i = 0; i < 2; i++) {
      const source = sources[i]; const channel = `xr-${i}`;
      const controllerPose = source ? frame.getPose(source.targetRaySpace, reference) : null;
      const select = source ? this.input.consumeSelect(source) : false;
      if (!controllerPose || !source) { this.interactions.clearHover(channel); continue; }
      const matrix = new Matrix4().multiplyMatrices(this.player.rig.matrixWorld, new Matrix4().fromArray(controllerPose.transform.matrix));
      const ray = new Ray(new Vector3().setFromMatrixPosition(matrix), new Vector3(0, 0, -1).transformDirection(matrix));
      this.visuals.ray(i, ray);
      if (intent.teleportSource === source && accepted && locomotion) {
        this.interactions.clearHover(channel);
        const candidate = this.teleport!.aim(ray, this.player.feet, this.player.bodyHeight);
        this.visuals.teleport(candidate); message = candidate.reason;
        if (intent.teleportRelease && candidate.valid && candidate.point && this.player.teleportXR(candidate.point)) {
          this.visuals.hidePointers(); message = '텔레포트 완료'; break;
        }
      } else if (accepted && locomotion) {
        this.interactions.updateRay(channel, ray, observer);
        if (select) this.interactions.activate(channel);
      } else this.interactions.clearHover(channel);
    }
    if (this.actionMessage && time - this.actionTime < 3500) message = this.actionMessage;
    this.visuals.status(`${message}\n${connections}\n이동: ${this.settings.movement} / 회전: ${this.settings.turn}\n종료: 기기 메뉴 또는 EXIT VR`, !accepted);
    this.publish({ controllers: connections, tracking: true, blocked: !accepted, message });
  }

  stop(): void {
    this.reference?.removeEventListener('reset', this.onReset); this.reference = null;
    this.session = null; this.input.dispose(); this.interactions.clearHover();
    this.visuals.active(false); this.player.restoreDesktopCamera(); this.actionMessage = '';
    this.publish({ controllers: '컨트롤러 연결 대기', tracking: false, blocked: false, message: '' });
  }
  dispose(): void { this.stop(); this.stopActions(); this.visuals.dispose(); this.changes.clear(); }
}
