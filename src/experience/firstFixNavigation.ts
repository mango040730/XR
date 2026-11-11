import type { Screen } from '../routing/ServiceRouter';

export const firstFixScreens = ['modes', 'rating', 'appointment-date', 'appointment-place'] as const;
export function firstFixRoute(screen: Screen, session: { ended: boolean } | null): Screen {
    if (screen === 'my-room') return 'modes';
    if (screen === 'simulation') return session && !session.ended ? screen : 'modes';
    if (screen === 'rating') return session?.ended ? screen : 'modes';
    return ['loading', ...firstFixScreens].includes(screen) ? screen : 'modes';
}
