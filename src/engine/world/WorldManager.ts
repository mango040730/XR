import { Group, Scene } from 'three';
import { Signal } from '../core/Signal';
import { disposeObject } from '../assets/disposeObject';
import type { WorldConfig, WorldFactory, WorldInstance, WorldState } from './types';

export class WorldManager {
  readonly changes = new Signal<WorldState>();
  readonly worlds: readonly WorldConfig[];
  active: WorldInstance | null = null;
  state: WorldState = { status: 'idle', activeId: null, requestedId: null, message: '월드를 선택하고 진입하세요.', error: null };
  private request = 0;
  private pending?: AbortController;
  private registry: Map<string, WorldConfig>;

  constructor(worlds: readonly WorldConfig[], private scene: Scene, private factory: WorldFactory, private prepare?: (world: WorldInstance, signal: AbortSignal) => Promise<void>) {
    this.registry = new Map(worlds.map(world => [world.id, world]));
    if (this.registry.size !== worlds.length) throw new Error('중복된 월드 ID입니다.');
    this.worlds = [...worlds];
  }

  private publish(state: WorldState): void {
    this.state = state;
    this.changes.emit(state);
  }

  async enter(id: string): Promise<void> {
    const request = ++this.request;
    this.pending?.abort();
    const controller = new AbortController();
    this.pending = controller;
    const root = new Group();
    root.name = `world:${id}`;
    let candidate: WorldInstance | undefined;
    try {
      const config = this.registry.get(id);
      if (!config) throw new Error(`등록되지 않은 월드: ${id}`);
      this.publish({ status: 'loading', activeId: this.active?.config.id ?? null, requestedId: id, message: `${config.name} 준비 중…`, error: null });
      candidate = await this.factory(config, {
        root, signal: controller.signal,
        progress: message => {
          if (request === this.request) this.publish({ ...this.state, message });
        },
      });
      if (request !== this.request) { candidate.dispose(); return; }
      if (this.prepare) {
        this.publish({ ...this.state, message: `${config.name} 조명과 그래픽 준비 중…` });
        await this.prepare(candidate, controller.signal);
        if (request !== this.request) { candidate.dispose(); return; }
        controller.signal.throwIfAborted();
      }
      // Commit only after the new world has built successfully; preserve old world on failure.
      const previous = this.active;
      this.scene.add(candidate.root);
      this.active = candidate;
      previous?.dispose();
      this.publish({ status: 'ready', activeId: id, requestedId: null, message: `${config.name} 준비 완료`, error: null });
    } catch (error) {
      if (candidate) candidate.dispose();
      else disposeObject(root);
      if (request !== this.request) return;
      this.publish({ status: 'error', activeId: this.active?.config.id ?? null, requestedId: id,
        message: this.active ? '이전 월드를 유지했습니다. 다시 진입할 수 있습니다.' : '다른 월드를 선택하거나 다시 진입하세요.',
        error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (request === this.request) this.pending = undefined;
    }
  }

  leave(): void {
    ++this.request;
    this.pending?.abort();
    this.pending = undefined;
    this.active?.dispose();
    this.active = null;
    this.publish({ status: 'idle', activeId: null, requestedId: null, message: '월드에서 나왔습니다. 다시 선택하세요.', error: null });
  }

  dispose(): void { this.leave(); this.changes.clear(); }
}
