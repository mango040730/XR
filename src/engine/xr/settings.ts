export interface XRLocomotionSettings {
  movement: 'teleport' | 'smooth';
  turn: 'snap' | 'smooth';
  deadzone: number;
  moveSpeed: number;
  snapAngle: number;
  smoothTurnSpeed: number;
}

export const DEFAULT_XR_SETTINGS: XRLocomotionSettings = {
  movement: 'teleport', turn: 'snap', deadzone: 0.2, moveSpeed: 1.5,
  snapAngle: Math.PI / 6, smoothTurnSpeed: Math.PI / 2,
};

export function xrSettings(patch: Partial<XRLocomotionSettings> = {}): XRLocomotionSettings {
  const bounded = (value: number | undefined, fallback: number, min: number, max: number) =>
    value !== undefined && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  return {
    movement: patch.movement === 'smooth' ? 'smooth' : 'teleport',
    turn: patch.turn === 'smooth' ? 'smooth' : 'snap',
    deadzone: bounded(patch.deadzone, 0.2, 0.05, 0.45),
    moveSpeed: bounded(patch.moveSpeed, 1.5, 0.2, 3),
    snapAngle: bounded(patch.snapAngle, Math.PI / 6, Math.PI / 12, Math.PI / 2),
    smoothTurnSpeed: bounded(patch.smoothTurnSpeed, Math.PI / 2, 0.1, Math.PI),
  };
}
