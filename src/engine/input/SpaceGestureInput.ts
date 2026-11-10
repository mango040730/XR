import type { InputSource, MovementInput } from './types';

export function spaceGestureMovement(dx: number, dy: number): MovementInput {
    const axis = (value: number) => !Number.isFinite(value) || Math.abs(value) < 6 ? 0 : Math.max(-1, Math.min(1, value / 40));
    return { right: axis(dx), forward: axis(-dy) };
}

/** One finger looks; two fingers supply movement intent. No on-screen controls. */
export class SpaceGestureInput implements InputSource {
    private events = new AbortController();
    private points = new Map<number, { x: number; y: number }>();
    private anchor: { x: number; y: number } | null = null;
    private tap: { x: number; y: number; time: number } | null = null;
    private previousTap = 0;
    private movement: MovementInput = { right: 0, forward: 0 };
    private enabled = false;

    constructor(canvas: HTMLCanvasElement, look: (x: number, y: number) => void, menu: () => void) {
        const options = { signal: this.events.signal };
        canvas.addEventListener('pointerdown', event => {
            if (!this.enabled || event.pointerType !== 'touch') return;
            canvas.setPointerCapture(event.pointerId);
            this.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (this.points.size === 1) this.tap = { x: event.clientX, y: event.clientY, time: performance.now() };
            else { this.tap = null; this.previousTap = 0; this.anchor = this.center(); }
        }, options);
        canvas.addEventListener('pointermove', event => {
            const previous = this.points.get(event.pointerId);
            if (!this.enabled || !previous) return;
            this.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (this.points.size === 1) {
                look((event.clientX - previous.x) * 2, (event.clientY - previous.y) * 2);
                if (this.tap && Math.hypot(event.clientX - this.tap.x, event.clientY - this.tap.y) > 8) this.tap = null;
            } else if (this.anchor) {
                const center = this.center();
                this.movement = spaceGestureMovement(center.x - this.anchor.x, center.y - this.anchor.y);
            }
        }, options);
        canvas.addEventListener('pointerup', event => {
            if (!this.points.has(event.pointerId)) return;
            const tap = this.tap;
            this.clear();
            if (tap && performance.now() - tap.time < 300) {
                const now = performance.now();
                if (this.previousTap && now - this.previousTap < 350) { this.previousTap = 0; menu(); }
                else this.previousTap = now;
            } else this.previousTap = 0;
        }, options);
        for (const name of ['pointercancel', 'lostpointercapture'] as const)
            canvas.addEventListener(name, event => { if (this.points.has(event.pointerId)) { this.clear(); this.previousTap = 0; } }, options);
        window.addEventListener('blur', () => this.reset(), options);
        document.addEventListener('visibilitychange', () => this.reset(), options);
    }
    private center(): { x: number; y: number } {
        const values = [...this.points.values()];
        return { x: values.reduce((sum, point) => sum + point.x, 0) / values.length, y: values.reduce((sum, point) => sum + point.y, 0) / values.length };
    }
    setEnabled(enabled: boolean): void { this.enabled = enabled; if (!enabled) this.reset(); }
    readMovement(): MovementInput { return this.enabled ? { ...this.movement } : { right: 0, forward: 0 }; }
    clear(): void { this.points.clear(); this.anchor = this.tap = null; this.movement = { right: 0, forward: 0 }; }
    private reset(): void { this.clear(); this.previousTap = 0; }
    dispose(): void { this.reset(); this.events.abort(); }
}
