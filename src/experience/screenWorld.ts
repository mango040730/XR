import type { Screen } from '../routing/ServiceRouter';
import type { Engine } from '../engine/core/Engine';
import { modes } from '../data/demo';

/** Only content playback (and its pause/exit confirmation) uses a content world. */
export function screenWorld(screen: Screen, session: {mode: string; ended: boolean} | null): string | null {
  if (screen === 'loading') return null;
  if (['rating','rating-done'].includes(screen)&&session?.ended)return modes.find(mode=>mode.id===session.mode)?.world??'my-room';
  if (['simulation','pause','confirm-home'].includes(screen) && session && !session.ended)
    return modes.find(mode => mode.id === session.mode)?.world ?? 'my-room';
  return 'my-room';
}

export async function ensureScreenWorld(engine: Engine, screen: Screen, session: {mode:string;ended:boolean} | null): Promise<void> {
  const target = screenWorld(screen,session);if (!target) return;
  if (engine.worlds.active?.config.id === target && engine.worlds.state.status !== 'loading') return;
  if (engine.worlds.state.status === 'loading' && engine.worlds.state.requestedId === target) return;
  await engine.enterWorld(target);
}
