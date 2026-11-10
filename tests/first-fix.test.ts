import { describe, expect, it } from 'vitest';
import { firstFixRoute } from '../src/experience/firstFixNavigation';
import { spaceGestureMovement } from '../src/engine/input/SpaceGestureInput';

describe('only first-fix UI routes', () => {
    it('redirects old login, server, profile and completion screens to mode selection', () => {
        for (const screen of ['login', 'avatar', 'servers', 'profile', 'chat', 'appointments', 'rating-done', 'appointment-done', 'error'] as const)
            expect(firstFixRoute(screen, null)).toBe('modes');
    });
    it('keeps world-only states and the two booking screens available without onboarding', () => {
        for (const screen of ['my-room', 'loading', 'modes', 'appointment-date', 'appointment-place'] as const)
            expect(firstFixRoute(screen, null)).toBe(screen);
    });
    it('requires a live session for simulation and an ended session for rating', () => {
        expect(firstFixRoute('simulation', null)).toBe('modes');
        expect(firstFixRoute('simulation', { ended: true })).toBe('modes');
        expect(firstFixRoute('simulation', { ended: false })).toBe('simulation');
        expect(firstFixRoute('rating', { ended: false })).toBe('modes');
        expect(firstFixRoute('rating', { ended: true })).toBe('rating');
    });
});
describe('movement without visible controls', () => {
    it('ignores stationary fingers and invalid movement data', () => {
        expect(spaceGestureMovement(3, -4)).toEqual({ right: 0, forward: 0 });
        expect(spaceGestureMovement(NaN, Infinity)).toEqual({ right: 0, forward: 0 });
    });
    it('maps screen drag into bounded movement intentions for the common player', () => {
        expect(spaceGestureMovement(80, -80)).toEqual({ right: 1, forward: 1 });
        expect(spaceGestureMovement(-20, 20)).toEqual({ right: -.5, forward: -.5 });
    });
});
