import type { RenderProfile } from '../rendering/profile';
import type { Group, Vector3Tuple, Scene, Texture, WebGLRenderer } from 'three';
import type { PlayerController } from '../player/PlayerController';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { CollisionData } from '../collision/CollisionSystem';
import type { TeleportConfig } from '../player/TeleportSystem';
import type { XRLocomotionSettings } from '../xr/settings';

export interface ModelConfig {
  url: string;
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: Vector3Tuple;
}
export interface BoxConfig {
  name?: string;
  position: Vector3Tuple;
  size: Vector3Tuple;
  color: string;
  solid?: boolean;
  interactive?: boolean;
  /** false: collision proxy only; the GLB supplies its visible geometry. */
  visible?: boolean;
}
export interface WorldBehavior { update(time: number, delta: number): void; dispose(): void }
export interface WorldBehaviorContext { root: Group; player: PlayerController; interactions: InteractionSystem; isXR(): boolean; setQuality?(low: boolean): void }
export interface WorldConfig {
  id: string;
  name: string;
  description: string;
  spawn: { position: Vector3Tuple; yaw: number; pitch?: number };
  player: { speed: number; eyeHeight: number; radius: number; height: number; maxStepHeight?: number };
  rendering?: RenderProfile;
  lighting: { key?: { position: Vector3Tuple; target: Vector3Tuple; color: string }; sky: string; ground: string; intensity: number; sun: number; background: string };
  floors: Array<{ center: [number, number]; size: [number, number]; y: number; color: string; visible?: boolean; polygon?: Array<[number, number]> }>;
  boxes: BoxConfig[];
  model?: ModelConfig;
  interactions?: Array<{ nodeName: string; id: string; label: string; maxDistance?: number }>;
  teleport?: TeleportConfig;
  xr?: Partial<XRLocomotionSettings>;
  /** Reserved metadata; audio playback is intentionally not part of phase 1. */
  audio?: { url: string; loop: boolean; volume: number };
  activate?: (context: WorldBehaviorContext) => WorldBehavior;
  prepare?: (context: { root: Group; scene: Scene; renderer: WebGLRenderer; signal: AbortSignal; onDispose(cleanup: () => void): void }) => void | Promise<void>;
  build?: (context: WorldBuildContext) => void | Promise<void>;
}
export interface WorldBuildContext {
  root: Group;
  signal: AbortSignal;
  progress: (message: string) => void;
}
export interface WorldInstance {
  config: WorldConfig;
  root: Group;
  collision: CollisionData;
  readonly environment?: Texture | null;
  prepare?(scene: Scene, renderer: WebGLRenderer, signal: AbortSignal): void | Promise<void>;
  dispose(): void;
}
export type WorldFactory = (config: WorldConfig, context: WorldBuildContext) => Promise<WorldInstance>;
export interface WorldState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  activeId: string | null;
  requestedId: string | null;
  message: string;
  error: string | null;
}
