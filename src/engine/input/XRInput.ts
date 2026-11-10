import type { InputSource, MovementInput } from './types';
import type { XRLocomotionSettings } from '../xr/settings';
import { MAX_FRAME_DELTA } from '../../config/defaults';

export interface ControllerSample {
  key: object;
  handedness: XRHandedness;
  mapping: string;
  axes: readonly number[];
  squeeze: boolean;
}
export interface XRIntent {
  movement: MovementInput;
  turn: number;
  teleportSource: object | null;
  teleportRelease: boolean;
}
const axis = (value: number | undefined) => value !== undefined && Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;

/** Pure xr-standard mapping. Missing axes are zero; unknown layouts never guess. */
export class XRInputMapper {
  private turnArmed = false;
  private movementArmed = false;
  private teleportArmed = false;
  private teleportSource: object | null = null;
  private keys = new Set<object>();

  reset(): void { this.turnArmed = this.movementArmed = this.teleportArmed = false; this.teleportSource = null; this.keys.clear(); }

  sample(controllers: readonly ControllerSample[], settings: XRLocomotionSettings, delta: number): XRIntent {
    const keys = new Set(controllers.map(c => c.key));
    if (keys.size !== this.keys.size || [...keys].some(key => !this.keys.has(key))) this.reset();
    this.keys = keys;
    const standard = controllers.filter(c => c.mapping === 'xr-standard');
    const left = standard.find(c => c.handedness === 'left');
    const right = standard.find(c => c.handedness === 'right');
    const move = left ?? right;
    const x = axis(move?.axes[2]); const y = axis(move?.axes[3]);
    const length = Math.hypot(x, y);
    if (length <= settings.deadzone) this.movementArmed = true;
    const magnitude = Math.min(1, Math.max(0, (length - settings.deadzone) / (1 - settings.deadzone)));
    const movement = settings.movement === 'smooth' && this.movementArmed && length > settings.deadzone
      ? { right: left ? x / length * magnitude : 0, forward: -y / length * magnitude } : { right: 0, forward: 0 };
    const turnAxis = axis(right?.axes[2]);
    if (Math.abs(turnAxis) < 0.25) this.turnArmed = true;
    let turn = 0;
    if (settings.turn === 'snap' && Math.abs(turnAxis) > 0.7 && this.turnArmed) {
      turn = -Math.sign(turnAxis) * settings.snapAngle; this.turnArmed = false;
    } else if (settings.turn === 'smooth' && this.turnArmed && Math.abs(turnAxis) > settings.deadzone) {
      turn = -turnAxis * settings.smoothTurnSpeed * Math.max(0, Math.min(MAX_FRAME_DELTA, Number.isFinite(delta) ? delta : 0));
    }
    const wantsTeleport = (c: ControllerSample) => c.squeeze
      || (settings.movement === 'teleport' && c === move && axis(c.axes[3]) < -0.7);
    let released = false;
    let source = this.teleportSource;
    if (source) {
      const previous = standard.find(c => c.key === source);
      if (!previous) { source = null; this.teleportSource = null; this.teleportArmed = false; }
      else if (!wantsTeleport(previous)) { released = true; this.teleportSource = null; this.teleportArmed = false; }
    } else {
      const candidate = standard.find(wantsTeleport);
      if (!candidate) this.teleportArmed = true;
      else if (this.teleportArmed) { source = candidate.key; this.teleportSource = source; }
    }
    // No translation or turning while aiming / committing a teleport.
    return { movement: source ? { right: 0, forward: 0 } : movement, turn: source ? 0 : turn,
      teleportSource: source, teleportRelease: released };
  }
}

/** Native session adapter; primary actions use WebXR select events, not button guesses. */
export class XRInput implements InputSource {
  private session: XRSession | null = null;
  private mapper = new XRInputMapper();
  private selected = new Set<XRInputSource>();
  private movement: MovementInput = { right: 0, forward: 0 };
  private onSelect = (event: XRInputSourceEvent) => {
    if (this.session?.visibilityState === 'visible') this.selected.add(event.inputSource);
  };
  private onVisibility = () => { if (this.session?.visibilityState !== 'visible') this.clear(); };
  private onSources = () => this.clear();

  connect(session: XRSession): void {
    this.dispose(); this.session = session;
    session.addEventListener('select', this.onSelect);
    session.addEventListener('visibilitychange', this.onVisibility);
    session.addEventListener('inputsourceschange', this.onSources);
  }
  sample(settings: XRLocomotionSettings, delta: number): XRIntent {
    const samples: ControllerSample[] = Array.from(this.session?.inputSources ?? [])
      .filter(source => source.targetRayMode === 'tracked-pointer' && source.gamepad?.connected !== false)
      .map(source => ({ key: source, handedness: source.handedness, mapping: source.gamepad?.mapping ?? '',
        axes: source.gamepad?.axes ?? [], squeeze: source.gamepad?.buttons[1]?.pressed ?? false }));
    const result = this.mapper.sample(samples, settings, delta);
    this.movement = result.movement; return result;
  }
  consumeSelect(source: XRInputSource): boolean { const value = this.selected.has(source); this.selected.delete(source); return value; }
  readMovement(): MovementInput { return this.movement; }
  clear(): void { this.mapper.reset(); this.selected.clear(); this.movement = { right: 0, forward: 0 }; }
  dispose(): void {
    this.session?.removeEventListener('select', this.onSelect);
    this.session?.removeEventListener('visibilitychange', this.onVisibility);
    this.session?.removeEventListener('inputsourceschange', this.onSources);
    this.session = null; this.clear();
  }
}
