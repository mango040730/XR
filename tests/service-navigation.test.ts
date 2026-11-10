import { describe, expect, it } from 'vitest';
import { allowsServiceMovement } from '../src/experience/serviceNavigation';

describe('service navigation input ownership', () => {
    it('allows exploring while home, mode and booking UI remain open', () => {
        for (const screen of ['my-room', 'modes', 'rating', 'appointment-date', 'appointment-place', 'simulation'] as const)
            expect(allowsServiceMovement(screen, false, false)).toBe(true);
    });
    it('suspends movement during text editing and immersive input ownership', () => {
        for (const screen of ['my-room', 'modes', 'simulation'] as const) {
            expect(allowsServiceMovement(screen, false, true)).toBe(false);
            expect(allowsServiceMovement(screen, true, false)).toBe(false);
        }
    });
    it('does not reactivate movement in login, loading, pause or recovery dialogs', () => {
        for (const screen of ['login', 'avatar', 'chat', 'loading', 'pause', 'error', 'confirm-home', 'servers'] as const)
            expect(allowsServiceMovement(screen, false, false)).toBe(false);
    });
});
