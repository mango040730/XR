import type { Screen } from '../routing/ServiceRouter';

export const firstFixScreens = ['modes', 'rating', 'appointment-date', 'appointment-place', 'appointment-done'] as const;
export function firstFixRoute(screen: Screen, session: { ended: boolean } | null, hasCompletedAppointment=false): Screen {
    if (screen === 'my-room') return 'modes';
    if (screen === 'simulation') return session && !session.ended ? screen : 'modes';
    if (screen === 'rating') return session?.ended ? screen : 'modes';
    if (screen === 'appointment-done') return hasCompletedAppointment ? screen : 'modes';
    return ['loading', ...firstFixScreens].includes(screen) ? screen : 'modes';
}
