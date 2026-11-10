import type { WebGLRenderer } from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Signal } from '../core/Signal';
import { detectXR } from './support';

export interface XRState { supported: boolean; active: boolean; pending: boolean; reason: string }

export class XRManager {
  readonly changes = new Signal<XRState>();
  state: XRState = { supported: false, active: false, pending: false, reason: 'WebXR 지원 확인 중…' };
  private button: HTMLElement | null = null;
  private events = new AbortController();
  private worldReady = false;
  private disposed = false;
  private statusObserver?: MutationObserver;
  private onStart = () => {
    if (!this.worldReady) { void this.renderer.xr.getSession()?.end(); return; }
    this.started();
    this.publish({ active: true, pending: false, reason: 'VR 모드 · 종료는 기기 메뉴 또는 EXIT VR' });
  };
  private onEnd = () => {
    this.ended();
    this.publish({ active: false, pending: false, reason: 'VR 세션이 종료되어 PC 모드로 돌아왔습니다.' });
  };

  constructor(private renderer: WebGLRenderer, private host: HTMLElement, private started: () => void, private ended: () => void) {
    renderer.xr.addEventListener('sessionstart', this.onStart);
    renderer.xr.addEventListener('sessionend', this.onEnd);
    // Official VRButton's requestSession promise has no rejection handler in r187.
    // Report a pending native request rejection without interrupting the desktop render loop.
    window.addEventListener('unhandledrejection', event => {
      if (!this.state.pending) return;
      this.publish({ pending: false, reason: `VR 시작 실패: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}` });
    }, { signal: this.events.signal });
    const fallback = document.createElement('button');
    fallback.textContent = 'VR 지원 확인 중'; fallback.disabled = true;
    this.host.append(fallback);
  }

  async initialize(): Promise<void> {
    const support = await detectXR(window.isSecureContext, navigator.xr);
    if (this.disposed) return;
    this.publish(support);
    if (support.supported && !this.button) {
      const fallback = this.host.querySelector('button');
      if (fallback) fallback.textContent = '월드 진입 후 VR 사용';
    }
    if (!support.supported) {
      const fallback = this.host.querySelector('button');
      if (fallback) fallback.textContent = 'VR 사용 불가';
    }
    this.updateButton();
  }

  private publish(patch: Partial<XRState>): void {
    this.state = { ...this.state, ...patch };
    this.updateButton(); this.changes.emit(this.state);
  }

  setWorldReady(ready: boolean): void { this.worldReady = ready; this.updateButton(); }

  async endSession(): Promise<boolean> {
    try { await this.renderer.xr.getSession()?.end(); return true; }
    catch { this.publish({ reason: 'VR 세션을 종료할 수 없습니다. 기기 메뉴에서 종료하세요.' }); return false; }
  }

  private updateButton(): void {
    if (this.disposed) return;
    if (this.state.supported && this.worldReady && !this.button) {
      this.button = VRButton.createButton(this.renderer, { requiredFeatures: ['local-floor'] });
      this.button.classList.add('vr-button');
      this.button.setAttribute('aria-label', 'VR 모드 시작 또는 종료');
      this.button.addEventListener('click', event => {
        if (!this.worldReady || this.state.pending) { event.stopImmediatePropagation(); event.preventDefault(); return; }
        if (!this.state.active) this.publish({ pending: true, reason: 'VR 시작 권한을 확인하세요…' });
      }, { capture: true, signal: this.events.signal });
      this.host.replaceChildren(this.button);
      this.statusObserver = new MutationObserver(() => {
        if (this.button?.textContent === 'VR NOT SUPPORTED' || this.button?.textContent === 'VR NOT ALLOWED') {
          this.publish({ supported: false, pending: false, reason: 'VR 기기 또는 권한을 사용할 수 없습니다. 연결 후 페이지를 새로고침하세요.' });
        }
      });
      this.statusObserver.observe(this.button, { childList: true });
    }
    if (this.button instanceof HTMLButtonElement) {
      this.button.disabled = !this.state.supported || !this.worldReady || this.state.pending;
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.events.abort();
    this.statusObserver?.disconnect();
    try { await this.renderer.xr.getSession()?.end(); }
    finally {
      this.renderer.xr.removeEventListener('sessionstart', this.onStart);
      this.renderer.xr.removeEventListener('sessionend', this.onEnd);
      this.host.replaceChildren(); this.changes.clear();
    }
  }
}
