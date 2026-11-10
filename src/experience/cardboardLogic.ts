import { Euler, Quaternion, Vector3 } from 'three';
/** W3C intrinsic Z-X'-Y'' angles converted into camera YXZ orientation. */
export function deviceQuaternion(alpha: number, beta: number, gamma: number, screenAngle: number): Quaternion {
    const r = Math.PI / 180;
    return new Quaternion().setFromEuler(new Euler(beta * r, alpha * r, -gamma * r, 'YXZ'))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -screenAngle * r));
}
export class DwellSelection {
    private target = '';
    private since = 0;
    private fired = false;
    constructor(readonly duration = 1200) { }
    update(target: string, time: number): {
        progress: number;
        activate: boolean;
    } {
        if (target !== this.target) {
            this.target = target;
            this.since = time;
            this.fired = false;
        }
        const progress = target ? Math.min(1, Math.max(0, (time - this.since) / this.duration)) : 0;
        const activate = !!target && progress === 1 && !this.fired;
        if (activate)
            this.fired = true;
        return { progress, activate };
    }
    reset(): void { this.target = ''; this.since = 0; this.fired = false; }
}
export const cardboardSettings = { panelWidth: 3, panelDistance: 2.8, dwellMs: 1200, eyeSeparation: .064, canvasWidth: 1200, canvasHeight: 600 } as const;
