import { Signal } from '../engine/core/Signal';
export const screens = ['login', 'avatar', 'avatar-picker', 'neighborhood-prompt', 'neighborhood-map', 'neighborhood-choice', 'my-room', 'modes', 'servers', 'loading', 'simulation', 'rating', 'rating-done', 'chat', 'invite', 'invite-done', 'invitations', 'profile', 'appointments', 'appointment-date', 'appointment-place', 'appointment-done', 'pause', 'cardboard-guide', 'sensor-help', 'confirm-home', 'error'] as const;
export type Screen = typeof screens[number];
export class ServiceRouter {
    readonly changes = new Signal<Screen>();
    current: Screen = 'login';
    private onHash = () => { const value = location.hash.slice(1); if (screens.includes(value as Screen))
        this.navigate(value as Screen, true); };
    constructor(private guard: (screen: Screen) => Screen) { window.addEventListener('hashchange', this.onHash); }
    navigate(screen: Screen, replace = false): void {
        this.current = this.guard(screen);
        history[replace ? 'replaceState' : 'pushState'](null, '', '#' + this.current);
        this.changes.emit(this.current);
    }
    dispose(): void { window.removeEventListener('hashchange', this.onHash); this.changes.clear(); }
}
