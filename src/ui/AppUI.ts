import type { Engine } from '../engine/core/Engine';

/** DOM-only UI adapter. Engine never imports the UI or a frontend framework. */
export class AppUI {
  readonly viewport: HTMLElement;
  readonly vrHost: HTMLElement;
  private cleanups: Array<() => void> = [];
  private events = new AbortController();
  private panel: HTMLElement;

  constructor(host: HTMLElement) {
    host.innerHTML = `
      <div class="shell">
        <aside class="panel">
          <header><span class="eyebrow">SPATIAL LAB / 03</span><h1>XR Spatial<br>Platform<span class="brand-dot">.</span></h1><p class="intro">하나의 엔진, 서로 다른 공간.<br>PC에서 탐색하고 VR로 경험하세요.</p></header>
          <div class="mode"><span class="status-dot"></span><span data-mode>PC · 3D 웹 모드</span><span class="phase">PHASE 03</span></div>
          <section class="world-controls"><label for="world-select">테스트 공간</label><select id="world-select"></select><p class="description" data-description></p><div class="buttons"><button data-enter class="primary">월드 진입 <span aria-hidden="true">↗</span></button><button data-leave disabled>나가기</button></div></section>
          <section class="status-section"><h2>공간 상태</h2><p class="current" data-current>진입 전</p><p class="status-message" data-status role="status" aria-live="polite"></p><progress data-progress hidden aria-label="월드 준비 중"></progress><p class="error" data-error role="alert" hidden></p></section>
          <section class="controls"><h2>PC 조작 안내</h2><div class="key-row"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>이동</span></div><div class="key-row"><span>마우스</span><span>시점 조절</span></div><div class="key-row"><kbd>ESC</kbd><span>마우스 잠금 해제</span></div><p>3D 화면을 클릭하면 탐색을 시작합니다. A의 민트색 큐브를 가까이서 조준하고 클릭해 보세요.</p><label class="speed-label" for="speed">이동 속도 <output data-speed-output>3.0 m/s</output></label><input id="speed" type="range" min="0.5" max="6" value="3" step="0.5"></section>
          <section class="vr-section"><h2>몰입형 VR</h2><div data-vr-host></div><p data-xr role="status">WebXR 지원 확인 중…</p><label for="xr-movement">VR 이동 방식</label><select id="xr-movement"><option value="teleport">텔레포트 (기본)</option><option value="smooth">스틱 연속 이동</option></select><label for="xr-turn">VR 회전 방식</label><select id="xr-turn"><option value="snap">스냅 턴 (기본)</option><option value="smooth">연속 회전</option></select><p data-controllers>컨트롤러 연결 대기</p><small>왼쪽 스틱 앞으로 유지 후 놓기: 텔레포트<br>오른쪽 스틱 좌우: 회전 · 트리거: 선택<br>스퀴즈 유지 후 놓기로도 텔레포트 가능<br>VR 실기기 검증 전 · 설정은 진입 전에 선택</small></section>
          <footer>ENGINE PROTOTYPE <span>v0.3.0</span></footer>
        </aside>
        <main class="viewport" aria-label="3D 월드 미리보기"><div class="scene-label"><span class="live-marker"></span><span data-scene-label>공간을 선택하세요</span><span class="scene-tag">REALTIME 3D</span></div><div class="welcome" data-welcome><span class="eyebrow">YOUR NEXT SPACE</span><h2>공간에 들어가 보세요.</h2><p>왼쪽에서 테스트 월드를 선택하고<br>월드 진입 버튼을 누르세요.</p><span class="welcome-mark" aria-hidden="true">↗</span></div><span class="crosshair" data-crosshair hidden aria-hidden="true">+</span><div class="interaction-hint" data-hint role="status" hidden></div><div class="action-message" data-action role="status" hidden></div><div class="viewport-bottom"><span data-viewport-note>PC + WEBXR</span><span>1 UNIT = 1 METER</span></div></main>
      </div>`;
    this.panel = host;
    this.viewport = this.element('.viewport');
    this.vrHost = this.element('[data-vr-host]');
  }

  private element<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.panel.querySelector<T>(selector);
    if (!element) throw new Error(`UI 요소 누락: ${selector}`);
    return element;
  }

  bind(engine: Engine): void {
    const select = this.element<HTMLSelectElement>('#world-select');
    const enter = this.element<HTMLButtonElement>('[data-enter]');
    const leave = this.element<HTMLButtonElement>('[data-leave]');
    const speed = this.element<HTMLInputElement>('#speed');
    const movement = this.element<HTMLSelectElement>('#xr-movement');
    const turn = this.element<HTMLSelectElement>('#xr-turn');
    for (const config of engine.worlds.worlds) select.add(new Option(config.name, config.id));
    const describe = () => {
      this.element('[data-description]').textContent = engine.worlds.worlds.find(world => world.id === select.value)?.description ?? '';
    };
    describe();
    let lastWorld = engine.worlds.active;
    const update = () => {
      const state = engine.worlds.state;
      const active = engine.worlds.active;
      const xr = engine.xr.state;
      const busy = xr.active || xr.pending;
      const loading = state.status === 'loading';
      select.disabled = busy;
      enter.disabled = busy;
      enter.firstChild!.textContent = loading ? '이 월드로 전환 ' : '월드 진입 ';
      leave.disabled = busy || (!active && !loading);
      leave.textContent = loading ? '취소' : '나가기';
      speed.disabled = !active || busy || loading;
      movement.disabled = turn.disabled = busy || loading;
      movement.value = engine.xrControls.settings.movement; turn.value = engine.xrControls.settings.turn;
      this.element('[data-mode]').textContent = xr.active ? 'VR · 몰입형 모드' : 'PC · 3D 웹 모드';
      this.element('[data-current]').textContent = active?.config.name ?? '진입 전';
      this.element('[data-status]').textContent = state.message;
      this.element('[data-progress]').hidden = !loading;
      this.element('[data-error]').textContent = state.error ?? '';
      this.element('[data-error]').hidden = !state.error;
      this.element('[data-xr]').textContent = xr.reason;
      this.element('[data-welcome]').hidden = !!active;
      this.element('[data-crosshair]').hidden = !active || xr.active || loading;
      this.element('[data-scene-label]').textContent = active?.config.name ?? '공간을 선택하세요';
      this.element('[data-viewport-note]').textContent = active ? '화면 클릭 → 탐색 시작 / ESC → 해제' : 'PC + WEBXR';
      if (active && active !== lastWorld) {
        speed.value = String(active.config.player.speed);
        this.element('[data-speed-output]').textContent = `${Number(speed.value).toFixed(1)} m/s`;
      }
      lastWorld = active;
    };
    const options = { signal: this.events.signal };
    movement.addEventListener('change', () => engine.xrControls.setSettings({ movement: movement.value === 'smooth' ? 'smooth' : 'teleport' }), options);
    turn.addEventListener('change', () => engine.xrControls.setSettings({ turn: turn.value === 'smooth' ? 'smooth' : 'snap' }), options);
    select.addEventListener('change', describe, options);
    enter.addEventListener('click', () => { void engine.enterWorld(select.value); }, options);
    leave.addEventListener('click', () => engine.leaveWorld(), options);
    speed.addEventListener('input', () => {
      engine.player.setSpeed(Number(speed.value));
      this.element('[data-speed-output]').textContent = `${Number(speed.value).toFixed(1)} m/s`;
    }, options);
    this.cleanups.push(engine.worlds.changes.subscribe(update), engine.xr.changes.subscribe(update));
    this.cleanups.push(engine.interactions.hints.subscribe(hint => {
      this.element('[data-hint]').textContent = hint;
      this.element('[data-hint]').hidden = !hint;
    }));
    this.cleanups.push(engine.notices.subscribe(message => {
      this.element('[data-error]').textContent = message;
      this.element('[data-error]').hidden = false;
    }));
    this.cleanups.push(engine.interactions.messages.subscribe(message => {
      this.element('[data-action]').textContent = message;
      this.element('[data-action]').hidden = !message;
    }), engine.xrControls.changes.subscribe(state => {
      this.element('[data-controllers]').textContent = `${state.controllers}${state.message ? ' · ' + state.message : ''}`;
    }));
    update();
  }

  showError(message: string): void {
    const error = this.element('[data-error]');
    error.textContent = message; error.hidden = false;
  }

  dispose(): void { this.events.abort(); this.cleanups.forEach(cleanup => cleanup()); }
}
