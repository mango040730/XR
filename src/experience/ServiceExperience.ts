import { ensureScreenWorld } from './screenWorld';
import { FishingHUD } from '../ui/FishingHUD';
import '../ui/service.css';
import '../ui/figma/generated.css';
import '../ui/neumorphic.css';
import '../ui/figma/fix-generated.css';
import '../ui/figma-fix.css';
import '../ui/service-navigation.css';
import { CapsuleGeometry, Euler, Group, Mesh, MeshStandardMaterial, SphereGeometry, Quaternion } from 'three';
import { Engine } from '../engine/core/Engine';
import { myRoom } from '../worlds/my-room/config';
import { worlds } from '../worlds/registry';
import { button, element } from '../components/designSystem';
import { ServiceStore } from '../state/ServiceStore';
import { LocalDemoRepository } from '../services/LocalDemoRepository';
import { ServiceRouter } from '../routing/ServiceRouter';
import type { Screen } from '../routing/ServiceRouter';
import { renderReview, renderScreen, sourceFrames } from '../ui/ServiceScreens';
import type { Draft } from '../ui/ServiceScreens';
import { fixFrames, renderFixReview } from '../ui/FixScreens';
import { avatars, modes, participants, places } from '../data/demo';
import type { ModeId } from '../data/demo';
import { CardboardPresenter } from './CardboardPresenter';
import { ServiceTouchControls } from '../ui/ServiceTouchControls';
import { allowsServiceMovement, isExplorableScreen } from './serviceNavigation';
export class ServiceExperience {
    readonly store = new ServiceStore(new LocalDemoRepository({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }));
    readonly router: ServiceRouter;
    readonly engine: Engine;
    private shell = element('div', 'service-shell');
    private viewport = element('div', 'service-viewport');
    private stage = element('main', 'service-stage');
    private chrome = element('div', 'service-chrome');
    private vrHost = element('div');
    private fishingHUD: FishingHUD;
    private cardboard: CardboardPresenter;
    private touchControls: ServiceTouchControls;
    private renderedScreen?: Screen;
    private cleanups: Array<() => void> = [];
    private events = new AbortController();
    private previous: Screen = 'my-room';
    private request = 0;
    private review = false;
    private disposed = false;
    private avatar = new Group();
    private detachDiagnostics?: () => void;
    private draft: Draft = { mode: 'solo', avatar: 'mint', date: '', time: '', place: 'umai', people: ['chang'], month: new Date().getMonth(), year: new Date().getFullYear(), modeRating: 0, peopleRating: 0, ratings: {}, message: '', error: '', progress: '', sensor: '', edit: '' };
    constructor(host: HTMLElement) {
        this.shell.append(this.viewport, this.stage, this.chrome);
        host.append(this.shell);
        this.engine = new Engine(this.viewport, this.vrHost, [myRoom, ...worlds]);
        this.fishingHUD = new FishingHUD(this.shell, this.engine);
        this.router = new ServiceRouter(screen => {
            const data = this.store.value;
            if (!data.signedIn && !['cardboard-guide', 'sensor-help'].includes(screen))
                return 'login';
            const onboarding = ['avatar', 'avatar-picker', 'neighborhood-prompt', 'neighborhood-map', 'neighborhood-choice', 'cardboard-guide', 'sensor-help', 'error'];
            if (!data.onboarded && !onboarding.includes(screen))
                return 'avatar';
            if (['simulation', 'pause', 'confirm-home'].includes(screen) && (!data.session || data.session.ended))
                return 'my-room';
            if (['rating', 'rating-done'].includes(screen) && !data.session?.ended)
                return 'my-room';
            return screen;
        });
        this.cardboard = new CardboardPresenter(this.engine, this.shell, node => this.activate(node), () => { this.syncInput(); this.refreshChrome(); });
        const canvas = this.engine.rendering.webgl.domElement;
        canvas.tabIndex = -1;
        this.touchControls = new ServiceTouchControls(this.shell, canvas, (x, y) => this.engine.player.look(x, y));
        this.shell.addEventListener('focusin', event => this.syncInput(this.isEditing(event.target)), { signal: this.events.signal });
        this.shell.addEventListener('focusout', event => this.syncInput(this.isEditing(event.relatedTarget)), { signal: this.events.signal });
        this.cleanups.push(this.engine.frames.subscribe(({ delta }) => {
            if (this.touchControls.enabled && this.engine.worlds.state.status === 'ready')
                this.engine.player.update(this.touchControls.readMovement(), delta);
        }));
        this.stage.addEventListener('click', event => { const node = (event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if (node)
            this.activate(node); }, { signal: this.events.signal });
        this.stage.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.target as HTMLInputElement).name === 'chat')
            this.perform('chat-send'); }, { signal: this.events.signal });
        this.chrome.addEventListener('click', event => { const node = (event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if (node)
            this.activate(node); }, { signal: this.events.signal });
        window.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'r' && this.cardboard.active)
            this.cardboard.recenter(); if (event.key === 'Escape' && this.cardboard.active) {
            this.cardboard.stop();
            this.syncInput();
        } }, { signal: this.events.signal });
        window.addEventListener('resize', () => this.resize(), { signal: this.events.signal });
        this.cleanups.push(this.router.changes.subscribe(() => {
            this.render();
            void ensureScreenWorld(this.engine,this.router.current,this.store.value.session).then(() => { if (!this.disposed) { this.cardboard.recenter();this.syncInput(); } });
        }), this.store.changes.subscribe(() => this.render()), this.engine.worlds.changes.subscribe(state => { this.draft.progress = state.message || state.status; if (this.router.current === 'loading')
            this.render(); }), this.engine.interactions.messages.subscribe(message => { this.draft.message = message; if (this.router.current === 'simulation')
            this.render(); }), this.engine.notices.subscribe(message => { this.draft.message = message; this.refreshChrome(); }), this.engine.xr.changes.subscribe(state => { if (state.active) {
            if (this.cardboard.active)
                this.cardboard.stop();
            this.shell.classList.add('immersive');
            this.cardboard.recenter();
        }
        else if (!this.cardboard.active)
            this.shell.classList.remove('immersive'); this.syncInput(); this.refreshChrome(); }));
        const body = new Mesh(new CapsuleGeometry(.25, .65, 6, 12), new MeshStandardMaterial({ color: '#79cbb1' }));
        body.position.y = .85;
        const head = new Mesh(new SphereGeometry(.26, 16, 12), new MeshStandardMaterial({ color: '#79cbb1' }));
        head.position.y = 1.6;
        this.avatar.add(body, head);
        this.avatar.position.set(-1.5, 0, 1);
        this.avatar.name = 'demo-avatar';
        this.engine.rendering.scene.add(this.avatar);
        const reviewId = new URLSearchParams(location.search).get('designReview');
        if (reviewId) {
            const fixEntry = Object.entries(fixFrames).find(([, factory]) => factory().dataset.nodeId === reviewId);
            if (fixEntry) {
                this.review = true;
                this.shell.classList.add('review');
                this.stage.replaceChildren(renderFixReview(fixEntry[0] as Screen));
                this.resize();
                return;
            }
            const entry = Object.entries(sourceFrames).find(([, factory]) => factory().dataset.nodeId === '1144:' + reviewId);
            if (entry) {
                this.review = true;
                this.shell.classList.add('review');
                const frame = renderReview(entry[0] as Screen);
                this.stage.replaceChildren(frame);
                this.resize();
                return;
            }
        }
        const data = this.store.value;
        this.router.navigate(!data.signedIn ? 'login' : data.onboarded ? 'my-room' : 'avatar', true);
        if (import.meta.env.DEV && import.meta.env.MODE === 'e2e')
            void import('../dev/engineDiagnostics').then(({ attachEngineDiagnostics }) => { this.detachDiagnostics = attachEngineDiagnostics(this.engine).dispose; });
    }
    private resize(): void { const height = this.review ? innerHeight : Math.max(1, innerHeight - 64); this.shell.style.setProperty('--panel-scale', String(Math.min(innerWidth / 1200, height / 600))); this.stage.style.top = (height / 2) + 'px'; }
    private render(): void {
        if (this.review)
            return;
        const data = this.store.value;
        if (this.renderedScreen !== this.router.current) {
            this.engine.setDesktopEnabled(false);
            this.touchControls.setEnabled(false);
            this.renderedScreen = this.router.current;
        }
        const fishingSpace = this.router.current === 'simulation' && this.fishingHUD.spaceOnly;
        const frame = fishingSpace ? element('div', 'design-frame simulation-hud') : renderScreen(this.router.current, data, this.draft);
        frame.dataset.screen = this.router.current;
        this.stage.replaceChildren(frame);
        this.shell.classList.toggle('fishing-space-only', fishingSpace);
        if (isExplorableScreen(this.router.current) && this.router.current !== 'simulation')
            this.stage.firstElementChild?.classList.add('explorable-frame');
        this.shell.classList.toggle('figma-fix', !!fixFrames[this.router.current]);
        const tools = element('div', 'vr-panel-tools');
        tools.append(button('VR 종료', 'cardboard-stop'), button('시선 정면 맞추기', 'recenter'));
        if (!fishingSpace) this.stage.firstElementChild?.append(tools);
        this.stage.setAttribute('aria-label', this.router.current);
        this.shell.dataset.route = this.router.current;
        this.cardboard.setPanel(fishingSpace ? null : frame);
        this.avatar.visible = this.engine.worlds.active?.config.id === 'my-room';
        const color = avatars.find(a => a.id === data.profile.avatar)?.color || '#79cbb1';
        this.avatar.traverse(n => { if (n instanceof Mesh)
            (n.material as MeshStandardMaterial).color.set(color); });
        this.resize();
        this.syncInput();
        this.refreshChrome();
    }
    private isEditing(target: EventTarget | null): boolean {
        return target instanceof HTMLElement && (!!target.closest('input,textarea,select') || target.isContentEditable);
    }
    private syncInput(editing = this.isEditing(document.activeElement)): void {
        const immersive = this.cardboard.active || this.engine.xr.state.active || this.engine.xr.state.pending;
        const enabled = allowsServiceMovement(this.router.current, immersive, editing);
        this.fishingHUD.setEnabled(this.router.current === 'simulation' && !this.cardboard.active);
        this.engine.setDesktopEnabled(enabled);
        this.touchControls.setEnabled(enabled && !this.fishingHUD.handlesTouch);
    }
    private refreshChrome(): void {
        this.draft.sensor = this.cardboard.sensor;
        if (this.router.current === 'simulation' && this.fishingHUD.spaceOnly) {
            this.chrome.replaceChildren();
            return;
        }
        const hint = isExplorableScreen(this.router.current) ? '빈 공간 클릭 · WASD 이동 · 마우스 시점 · Esc로 UI 선택' : '실시간 연결 없음';
        const label = element('span', '', `로컬 데모 · ${this.cardboard.active ? 'Cardboard VR' : this.engine.xr.state.active ? '헤드셋 VR' : 'PC / 터치'} · ${this.store.repository.error || this.draft.message || hint}`);
        const vr = button(this.cardboard.active ? 'VR 종료' : 'VR 박스 모드', this.cardboard.active ? 'cardboard-stop' : 'nav:cardboard-guide');
        const center = button('패널 정면 맞추기', 'recenter');
        const sensor = button('센서 안내', 'nav:sensor-help');
        this.chrome.replaceChildren(label, vr, center, sensor, this.vrHost);
        if (isExplorableScreen(this.router.current) && !this.fishingHUD.handlesTouch) {
            const movement = button(this.touchControls.open ? '이동 조작 닫기' : '이동 조작', 'space-controls');
            movement.classList.add('service-touch-toggle');
            movement.setAttribute('aria-controls', this.touchControls.root.id);
            movement.setAttribute('aria-expanded', String(this.touchControls.open));
            this.chrome.append(movement);
        }
        this.vrHost.className = 'native-vr-host';
        this.vrHost.title = this.engine.xr.state.reason;
        const status = element('span', 'sensor-status', this.cardboard.sensor);
        status.setAttribute('role', 'status');
        if (this.cardboard.active)
            this.chrome.append(status);
    }
    private activate(node: HTMLElement): void {
        const name = node.dataset.action;
        if (!name)
            return;
        if (name.startsWith('edit:')) {
            if (this.cardboard.active || this.engine.xr.state.active) {
                this.draft.edit = name.slice(5);
                this.perform('preset-input');
            }
            return;
        }
        this.perform(name);
    }
    private navigate(screen: Screen): void { if (this.router.current === 'simulation' && screen !== 'simulation') this.fishingHUD.cancel(); this.previous = this.router.current; this.router.navigate(screen); }
    private value(name: string): string { return this.stage.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value || ''; }
    private perform(action: string): void {
        const colon = action.indexOf(':');
        const name = colon < 0 ? action : action.slice(0, colon);
        const arg = colon < 0 ? '' : action.slice(colon + 1);
        try {
            switch (name) {
                case 'nav':
                    if (this.router.current === 'avatar' && arg === 'avatar-picker')
                        this.store.profile({ nickname: this.value('nickname'), birthday: this.value('birthday') });
                    if (arg === 'cardboard-guide' || arg === 'sensor-help')
                        this.draft.sensor = this.cardboard.sensor;
                    this.navigate(arg as Screen);
                    break;
                case 'back':
                    this.router.navigate(this.previous);
                    break;
                case 'login':
                    this.store.login();
                    this.navigate(this.store.value.onboarded ? 'my-room' : 'avatar');
                    break;
                case 'logout':
                    this.store.logout();
                    this.navigate('login');
                    break;
                case 'gender':
                    this.store.profile({ nickname: this.value('nickname') || this.store.value.profile.nickname, birthday: this.value('birthday') || this.store.value.profile.birthday, gender: arg });
                    break;
                case 'avatar':
                    this.store.profile({ avatar: arg });
                    break;
                case 'avatar-next':
                    this.store.profile({ nickname: this.value('nickname'), birthday: this.value('birthday') });
                    this.navigate('neighborhood-prompt');
                    break;
                case 'neighborhood':
                    this.store.neighborhood(arg);
                    void this.home();
                    break;
                case 'home':
                    void this.home();
                    break;
                case 'mode':
                    this.draft.mode = arg as ModeId;
                    this.navigate('servers');
                    break;
                case 'join':
                    this.store.join(this.draft.mode, arg);
                    void this.loadSimulation();
                    break;
                case 'create-room': {
                    const id = this.store.createRoom('우리 동네 모임');
                    this.store.join(this.draft.mode, id);
                    void this.loadSimulation();
                    break;
                }
                case 'finish':
                    this.store.finish();
                    this.draft.modeRating = this.draft.peopleRating = 0;
                    this.draft.ratings = {};
                    this.navigate('rating');
                    break;
                case 'mode-rating':
                    this.draft.modeRating = Number(arg);
                    this.render();
                    break;
                case 'people-rating':
                    this.draft.peopleRating = Number(arg);
                    this.render();
                    break;
                case 'person-rating':
                    this.draft.ratings[arg] = (this.draft.ratings[arg] || 0) % 5 + 1;
                    this.render();
                    break;
                case 'rate':
                    this.store.rate(this.draft.modeRating, this.draft.peopleRating, this.draft.ratings);
                    this.navigate('rating-done');
                    break;
                case 'person':
                    this.navigate('chat');
                    break;
                case 'chat-send':
                    this.store.chat(this.value('chat'));
                    this.render();
                    break;
                case 'chat-preset':
                    this.store.chat('오늘 함께해서 즐거웠어요! 다음에 또 만나요.');
                    break;
                case 'invite':
                    this.store.invite(participants.find(p => p.id === arg)?.name || arg, this.draft.mode);
                    this.navigate('invite-done');
                    break;
                case 'accept': {
                    const inv = this.store.value.invitations.find(i => i.id === arg);
                    this.store.respond(arg, 'accepted');
                    if (inv)
                        this.draft.mode = inv.mode;
                    this.navigate('servers');
                    break;
                }
                case 'decline':
                    this.store.respond(arg, 'declined');
                    break;
                case 'attendee':
                    this.draft.people = this.draft.people.includes(arg) ? this.draft.people.filter(id => id !== arg) : [...this.draft.people, arg];
                    this.render();
                    break;
                case 'appointment-start':
                    if (!this.draft.people.length)
                        throw new Error('함께할 사람을 한 명 이상 선택해 주세요.');
                    this.navigate('appointment-date');
                    break;
                case 'date':
                    this.draft.date = arg;
                    this.render();
                    break;
                case 'time':
                    this.draft.time = arg;
                    this.render();
                    break;
                case 'month': {
                    const date = new Date(this.draft.year, this.draft.month + Number(arg), 1);
                    this.draft.year = date.getFullYear();
                    this.draft.month = date.getMonth();
                    this.render();
                    break;
                }
                case 'appointment-next':
                    if (!this.draft.date || !this.draft.time)
                        throw new Error('날짜와 시간을 모두 선택해 주세요.');
                    this.navigate('appointment-place');
                    break;
                case 'appointment-simple':
                    this.draft.message = '외부 예약 없이 만날 약속만 저장해요.';
                    this.refreshChrome();
                    break;
                case 'appointment-search':
                    this.navigate('appointment-place');
                    break;
                case 'place-search':
                    this.draft.message = '외부 지도 검색 대신 아래 데모 장소 3곳 중 선택해 주세요.';
                    this.refreshChrome();
                    break;
                case 'place-next': {
                    const index = places.findIndex(p => p.id === this.draft.place);
                    this.draft.place = places[(index + 1) % places.length].id;
                    this.render();
                    break;
                }
                case 'place':
                    this.draft.place = arg;
                    this.render();
                    break;
                case 'appointment-create':
                    this.store.appointment({ date: this.draft.date, time: this.draft.time, place: this.draft.place, participants: this.draft.people });
                    this.navigate('appointment-done');
                    break;
                case 'voice':
                    this.draft.message = '음성 채팅은 연결하지 않았어요. 데모 채팅을 이용해 주세요.';
                    this.refreshChrome();
                    break;
                case 'cardboard-start':
                    void this.startVR(true);
                    break;
                case 'cardboard-fallback':
                    void this.startVR(false);
                    break;
                case 'cardboard-stop':
                    if (this.engine.xr.state.active)
                        void this.engine.xr.endSession();
                    else
                        this.cardboard.stop();
                    this.syncInput();
                    break;
                case 'recenter':
                    this.cardboard.recenter();
                    break;
                case 'space-controls':
                    this.touchControls.toggle();
                    this.refreshChrome();
                    break;
                case 'step': {
                    const yaw = new Euler().setFromQuaternion(this.engine.rendering.camera.getWorldQuaternion(new Quaternion()), 'YXZ').y;
                    for (let i = 0; i < 4; i++)
                        this.engine.player.update({ right: 0, forward: arg === 'forward' ? 1 : -1 }, .05, yaw);
                    this.cardboard.recenter();
                    break;
                }
                case 'turn':
                    this.engine.player.look((arg === 'left' ? -1 : 1) * Math.PI / 6 / .002, 0);
                    this.cardboard.recenter();
                    break;
                case 'preset-input': {
                    const name = this.draft.edit;
                    const presets: Record<string, string> = { nickname: '동네친구', email: 'demo@example.local', password: 'demo-only', birthday: '2000-01-01', chat: '오늘 함께해서 즐거웠어요!' };
                    const input = this.stage.querySelector<HTMLInputElement>(`input[name="${name}"]`);
                    if (input)
                        input.value = presets[name] || '데모';
                    this.draft.message = 'VR 데모 대체 문구를 입력했어요. 실제 키보드 입력은 PC에서 이용해요.';
                    this.refreshChrome();
                    break;
                }
            }
        }
        catch (error) {
            this.draft.error = error instanceof Error ? error.message : String(error);
            this.navigate('error');
        }
    }
    private async startVR(sensors: boolean): Promise<void> { const target = this.previous === 'cardboard-guide' || this.previous === 'sensor-help' ? 'my-room' : this.previous; const ok = await this.cardboard.start(sensors); this.draft.sensor = this.cardboard.sensor; if (ok) {
        this.router.navigate(target);
        this.cardboard.recenter();
    }
    else
        this.navigate('sensor-help'); }
    private async home(): Promise<void> {
        const request = ++this.request;
        this.store.finish();
        this.navigate('loading');
        await this.engine.enterWorld('my-room');
        if (request !== this.request)
            return;
        if (this.engine.worlds.state.status === 'error') {
            this.draft.error = this.engine.worlds.state.error || this.engine.worlds.state.message;
            this.navigate('error');
            return;
        }
        this.navigate('my-room');
        this.cardboard.recenter();
    }
    private async loadSimulation(): Promise<void> {
        const request = ++this.request;
        this.navigate('loading');
        const mode = modes.find(m => m.id === this.store.value.session?.mode)!;
        await this.engine.enterWorld(mode.world);
        if (request !== this.request)
            return;
        if (this.engine.worlds.state.status === 'error') {
            this.draft.error = this.engine.worlds.state.error || this.engine.worlds.state.message;
            this.navigate('error');
            return;
        }
        this.draft.message = '';
        this.navigate('simulation');
        this.cardboard.recenter();
    }
    async dispose(): Promise<void> {
        this.disposed=true; this.fishingHUD.dispose(); this.touchControls.dispose(); this.events.abort(); this.cleanups.forEach(fn => fn()); this.detachDiagnostics?.(); this.router.dispose(); this.cardboard.dispose(); this.avatar.removeFromParent(); this.avatar.traverse(n => { if (n instanceof Mesh) {
        n.geometry.dispose();
        (n.material as MeshStandardMaterial).dispose();
    } }); await this.engine.dispose(); this.shell.remove(); }
}
