import type { Screen } from '../routing/ServiceRouter';

const explorableScreens = new Set<Screen>(['my-room', 'modes', 'rating', 'appointment-date', 'appointment-place', 'simulation']);

export function isExplorableScreen(screen: Screen): boolean {
    return explorableScreens.has(screen);
}

export function allowsServiceMovement(screen: Screen, immersive: boolean, editing: boolean): boolean {
    return isExplorableScreen(screen) && !immersive && !editing;
}
