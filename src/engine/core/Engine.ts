import { Color } from 'three';
import { Renderer } from '../rendering/Renderer';
import { WorldManager } from '../world/WorldManager';
import { createWorld } from '../world/createWorld';
import { PlayerController } from '../player/PlayerController';
import { DesktopInput } from '../input/DesktopInput';
import { CollisionSystem } from '../collision/CollisionSystem';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { XRManager } from '../xr/XRManager';
import { XRControllerSystem } from '../xr/XRControllerSystem';
import { Signal } from './Signal';
import type { WorldBehavior, WorldConfig } from '../world/types';

export class Engine {
  readonly rendering: Renderer;
  readonly worlds: WorldManager;
  readonly player: PlayerController;
  readonly xr: XRManager;
  readonly xrControls: XRControllerSystem;
  readonly interactions = new InteractionSystem();
  readonly notices = new Signal<string>();
  readonly frames = new Signal<{ time: number; delta: number }>();
  presenter?: () => void;
  private behavior?: WorldBehavior;
  private behaviorRoot?: string;
  private desktopAllowed = true;
  private input: DesktopInput;
  private events = new AbortController();
  private cleanups: Array<() => void> = [];
  private previousTime: number | null = null;
  private disposed = false;
  worldFrozen = false;
  presentationActive=false;

  constructor(viewport: HTMLElement, vrHost: HTMLElement, configs: readonly WorldConfig[]) {
    this.rendering = new Renderer(viewport);
    this.worlds = new WorldManager(configs, this.rendering.scene, createWorld, (world, signal) => this.rendering.prepareWorld(world, signal));
    this.player = new PlayerController(this.rendering.camera);
    this.rendering.scene.add(this.player.rig);
    this.rendering.scene.add(this.interactions.highlights);
    this.xrControls = new XRControllerSystem(this.rendering, this.player, this.interactions);
    const canvas = this.rendering.webgl.domElement;
    this.input = new DesktopInput(canvas, (x, y) => this.player.look(x, y));
    this.xr = new XRManager(this.rendering.webgl, vrHost, () => {
      this.input.clear();
      const session = this.rendering.webgl.xr.getSession();
      if (session) this.xrControls.start(session);
      this.previousTime = null;
    }, () => {
      this.xrControls.stop(); this.rendering.restoreSize(); this.previousTime = null;
    });
    this.cleanups.push(this.worlds.changes.subscribe(state => {
      this.input.clear();
      const active = this.worlds.active;
      if (state.status === 'ready' && active) {
        this.behavior?.dispose(); this.behavior = undefined; this.behaviorRoot = active.root.uuid;
        this.rendering.configure(active);
        this.player.spawn(active.config, new CollisionSystem(active.collision));
        this.rendering.scene.background = new Color(active.config.lighting.background);
        this.interactions.setWorld(active.root);
        this.xrControls.setWorld(active);
        this.behavior = active.config.activate?.({ root: active.root, player: this.player, interactions: this.interactions, isXR: () => this.xr.state.active, setQuality: low => this.rendering.setQuality(low) });
      }
      if (!active) { this.rendering.configure(null); this.behavior?.dispose(); this.behavior = undefined; this.behaviorRoot = undefined; this.player.clear(); this.interactions.setWorld(null); this.xrControls.setWorld(null); }
      if (state.status === 'loading') this.interactions.clearHover();
      this.syncInput();
      this.xr.setWorldReady(!!active && state.status !== 'loading');
    }));
    this.cleanups.push(this.xr.changes.subscribe(() => this.syncInput()));
    canvas.addEventListener('click', event => {
      if (event.button === 0 && this.input.enabled && !(event instanceof PointerEvent && event.pointerType==='touch')) this.interactions.activate();
    }, { signal: this.events.signal });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.input.enabled = false; this.input.clear();
      this.notices.emit('그래픽 컨텍스트가 중단되었습니다. 페이지를 새로고침하세요.');
    }, { signal: this.events.signal });
    this.rendering.webgl.setAnimationLoop((time, frame) => {
      const delta = this.previousTime === null ? 0 : (time - this.previousTime) / 1000;
      this.previousTime = time;
      if (this.xr.state.active && frame) this.xrControls.update(frame, time, delta, !this.worldFrozen&&!this.presentationActive);
      if (this.input.enabled) {
        this.player.update(this.input.readMovement(), delta);
        this.player.updateCamera();
        this.interactions.update(this.rendering.camera);
      }
      if (!this.worldFrozen && this.behaviorRoot === this.worlds.active?.root.uuid) this.behavior?.update(time / 1000, delta);
      this.frames.emit({ time, delta });
      if(this.worldFrozen&&!this.presenter&&!this.xr.state.active)return;
      this.player.updateCamera();
      this.rendering.prepareFrame();
      if (this.presenter && !this.xr.state.active) this.presenter();
      else this.rendering.render(delta);
    });
    void this.xr.initialize();
  }

  private syncInput(): void {
    this.input.enabled = this.desktopAllowed && !this.worldFrozen && !this.presentationActive && !!this.worlds.active && this.worlds.state.status !== 'loading' && !this.xr.state.active && !this.xr.state.pending;
    if (!this.input.enabled) this.input.clear();
  }

  setDesktopEnabled(enabled: boolean): void {
    this.desktopAllowed = enabled; this.syncInput();
    if (!enabled) this.input.clear();
  }

  setPresentationActive(active:boolean):void{this.presentationActive=active;this.syncInput();}
  setWorldFrozen(frozen:boolean):void{this.worldFrozen=frozen;this.syncInput();}
  captureFrame():string{this.rendering.prepareFrame();this.rendering.render(0);return this.rendering.webgl.domElement.toDataURL('image/png');}

  async enterWorld(id: string): Promise<void> {
    if (this.disposed || this.xr.state.pending) return;
    if (this.xr.state.active && !await this.xr.endSession()) return;
    await this.worlds.enter(id);
  }
  leaveWorld(): void {
    if (this.disposed || this.xr.state.active || this.xr.state.pending) return;
    this.worlds.leave();
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.rendering.webgl.setAnimationLoop(null);
    this.events.abort(); this.input.dispose();
    this.cleanups.forEach(cleanup => cleanup());
    await this.xr.dispose();
    this.xrControls.dispose();
    this.behavior?.dispose(); this.behavior = undefined;
    this.interactions.dispose(); this.worlds.dispose();
    this.rendering.scene.remove(this.player.rig);
    this.rendering.dispose(); this.notices.clear(); this.frames.clear(); this.presenter = undefined;
  }
}
