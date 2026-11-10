import type { InputSource, MovementInput } from './types';

export class DesktopInput implements InputSource {
  private keys = new Set<string>();
  private events = new AbortController();
  enabled = false;

  constructor(private canvas: HTMLCanvasElement, look: (x: number, y: number) => void, report: (message: string) => void) {
    const options = { signal: this.events.signal };
    document.addEventListener('keydown', event => {
      if (event.code === 'Escape' && document.pointerLockElement === canvas) {
        this.unlock();
        return;
      }
      if (this.enabled && document.pointerLockElement === canvas && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault(); this.keys.add(event.code);
      }
    }, options);
    document.addEventListener('keyup', event => this.keys.delete(event.code), options);
    document.addEventListener('mousemove', event => {
      if (this.enabled && document.pointerLockElement === canvas) look(event.movementX, event.movementY);
    }, options);
    // Acquiring lock can deliver this event after the first keydown. Clear only
    // on loss, otherwise an immediately held W gets erased until pressed again.
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas) this.clear();
    }, options);
    document.addEventListener('pointerlockerror', () => report('마우스 잠금이 거부되었습니다. 화면을 다시 클릭하세요.'), options);
    window.addEventListener('blur', () => this.clear(), options);
    document.addEventListener('visibilitychange', () => this.clear(), options);
    canvas.addEventListener('click', event => {
      if (event instanceof PointerEvent && event.pointerType === 'touch') return;
      if (!this.enabled || document.pointerLockElement === canvas) return;
      if (!canvas.requestPointerLock) { report('이 브라우저는 마우스 잠금을 지원하지 않습니다. PC Chrome/Edge에서 실행하세요.'); return; }
      try {
        const result = canvas.requestPointerLock();
        if (result) void result.catch(() => report('마우스 잠금이 취소되었습니다. 화면을 다시 클릭하세요.'));
      } catch { report('마우스 잠금을 시작할 수 없습니다. 화면을 다시 클릭하세요.'); }
    }, options);
  }

  readMovement(): MovementInput {
    if (!this.enabled || document.pointerLockElement !== this.canvas) return { right: 0, forward: 0 };
    return { right: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      forward: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')) };
  }
  clear(): void { this.keys.clear(); }
  unlock(): void { this.clear(); if (document.pointerLockElement === this.canvas) document.exitPointerLock(); }
  dispose(): void { this.unlock(); this.events.abort(); }
}
