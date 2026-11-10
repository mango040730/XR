import { button, element } from '../components/designSystem';
import type { InputSource, MovementInput } from '../engine/input/types';

/** Touch supplies movement intentions; ServiceExperience passes them to PlayerController. */
export class ServiceTouchControls implements InputSource {
    readonly root = element('div', 'service-touch-controls');
    enabled = false;
    private events = new AbortController();
    private held = new Map<number, MovementInput>();
    private drag: { id: number; x: number; y: number } | null = null;

    constructor(host: HTMLElement, canvas: HTMLCanvasElement, look: (x: number, y: number) => void) {
        this.root.id = 'service-touch-controls';
        this.root.hidden = true;
        this.root.setAttribute('role', 'group');
        this.root.setAttribute('aria-label', '공간 이동 조작');
        const options = { signal: this.events.signal };
        for (const [direction, symbol, label, right, forward] of [
            ['forward', '↑', '앞으로 이동', 0, 1], ['left', '←', '왼쪽 이동', -1, 0],
            ['back', '↓', '뒤로 이동', 0, -1], ['right', '→', '오른쪽 이동', 1, 0],
        ] as const) {
            const control = button(symbol, '');
            control.removeAttribute('data-action');
            control.className = 'service-touch-direction';
            control.dataset.direction = direction;
            control.setAttribute('aria-label', label);
            control.addEventListener('pointerdown', event => {
                if (!this.enabled) return;
                event.preventDefault();
                control.setPointerCapture(event.pointerId);
                this.held.set(event.pointerId, { right, forward });
            }, options);
            for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
                control.addEventListener(name, event => this.held.delete(event.pointerId), options);
            this.root.append(control);
        }
        host.append(this.root);
        canvas.addEventListener('pointerdown', event => {
            if (!this.enabled || event.pointerType !== 'touch' || this.drag) return;
            canvas.setPointerCapture(event.pointerId);
            this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }, options);
        canvas.addEventListener('pointermove', event => {
            if (!this.enabled || this.drag?.id !== event.pointerId) return;
            look((event.clientX - this.drag.x) * 2, (event.clientY - this.drag.y) * 2);
            this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }, options);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
            canvas.addEventListener(name, event => { if (this.drag?.id === event.pointerId) this.drag = null; }, options);
        window.addEventListener('blur', () => this.clear(), options);
        document.addEventListener('visibilitychange', () => this.clear(), options);
    }

    get open(): boolean { return !this.root.hidden; }
    toggle(): void {
        if (!this.enabled) return;
        this.root.hidden = !this.root.hidden;
        this.clear();
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) { this.clear(); this.root.hidden = true; }
    }
    readMovement(): MovementInput {
        const movement = { right: 0, forward: 0 };
        if (this.enabled) for (const intent of this.held.values()) {
            movement.right += intent.right; movement.forward += intent.forward;
        }
        return { right: Math.max(-1, Math.min(1, movement.right)), forward: Math.max(-1, Math.min(1, movement.forward)) };
    }
    clear(): void { this.held.clear(); this.drag = null; }
    dispose(): void { this.clear(); this.events.abort(); this.root.remove(); }
}
