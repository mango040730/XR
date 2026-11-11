import { ensureScreenWorld } from './screenWorld';
import '../ui/service.css';
import '../ui/figma/fix-generated.css';
import '../ui/figma-fix.css';
import '../ui/first-fix.css';
import { Engine } from '../engine/core/Engine';
import { SpaceGestureInput } from '../engine/input/SpaceGestureInput';
import { myRoom } from '../worlds/my-room/config';
import { worlds } from '../worlds/registry';
import { ServiceStore } from '../state/ServiceStore';
import { LocalDemoRepository } from '../services/LocalDemoRepository';
import { ServiceRouter } from '../routing/ServiceRouter';
import type { Screen } from '../routing/ServiceRouter';
import type { Draft } from '../ui/ServiceScreens';
import { element } from '../components/designSystem';
import { fixFrames, renderFixReview, renderFixScreen, renderSpaceNavigation } from '../ui/FixScreens';
import { calendar } from '../ui/calendar';
import { FishingHUD } from '../ui/FishingHUD';
import { CardboardPresenter } from './CardboardPresenter';
import { firstFixRoute } from './firstFixNavigation';
import { modes, participants, places } from '../data/demo';

/** The live service mounts only the four first-fix screens. */
export class FirstFixExperience {
    readonly store = new ServiceStore(new LocalDemoRepository(localStorage));
    readonly engine: Engine;
    readonly router: ServiceRouter;
    private shell = element('div', 'service-shell figma-fix first-fix-shell');
    private viewport = element('div', 'service-viewport');
    private stage = element('main', 'service-stage');
    private vrHost = element('div');
    private fishing: FishingHUD;
    private gestures: SpaceGestureInput;
    private cardboard: CardboardPresenter;
    private events = new AbortController();
    private cleanups: Array<() => void> = [];
    private detachDiagnostics?: () => void;
    private rendered?: Screen;
    private screenEnteredAt = 0;
    private request = 0;
    private resumableWorld: string | null = null;
    private disposed = false;
    private review = false;
    private draft: Draft = { mode: 'solo', avatar: 'mint', date: '', time: '', place: 'umai', people: participants.map(p => p.id), month: new Date().getMonth(), year: new Date().getFullYear(), modeRating: 0, peopleRating: 0, ratings: {}, message: '', error: '', progress: '', sensor: '', edit: '' };

    constructor(host: HTMLElement) {
        this.shell.append(this.viewport, this.stage); host.append(this.shell);
        this.engine = new Engine(this.viewport, this.vrHost, [myRoom, ...worlds]);
        this.fishing = new FishingHUD(this.shell, this.engine, undefined, { touchLook: false });
        this.router = new ServiceRouter(screen => firstFixRoute(screen, this.store.value.session));
        const canvas = this.engine.rendering.webgl.domElement; canvas.tabIndex = -1;
        this.gestures = new SpaceGestureInput(canvas, (x, y) => this.engine.player.look(x, y), () => this.toggleModes());
        this.cardboard = new CardboardPresenter(this.engine, this.shell, node => this.perform(node.dataset.action || ''), () => this.syncInput(), false);
        const options = { signal: this.events.signal };
        this.stage.addEventListener('click', event => {
            const control = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
            if (control) this.perform(control.dataset.action || '');
        }, options);
        window.addEventListener('resize', () => this.resize(), options);
        window.addEventListener('keydown', event => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || this.editing()) return;
            if (event.code === 'Escape') {
                if (document.pointerLockElement) return;
                if (this.cardboard.active) { this.cardboard.stop(); this.syncInput(); return; }
                if (this.router.current === 'loading') void this.home();
                else if (this.router.current === 'simulation') this.perform('finish');
                else this.closeUI();
            } else if (event.code === 'KeyM') this.toggleModes();
            else if (event.code === 'KeyB' && this.router.current !== 'loading') this.navigate('appointment-date');
            else if (event.code === 'KeyV') void this.toggleVR();
        }, { ...options, capture: true });
        this.shell.addEventListener('focusin', () => this.syncInput(), options);
        this.shell.addEventListener('focusout', event => this.syncInput(event.relatedTarget), options);
        this.cleanups.push(this.router.changes.subscribe(() => {
            this.render();
            void ensureScreenWorld(this.engine,this.router.current,this.store.value.session).then(() => {
                if (!this.disposed) { this.cardboard.recenter();this.syncInput(); }
            });
        }), this.engine.frames.subscribe(({ delta }) => {
            if (this.engine.worlds.state.status !== 'ready' || this.cardboard.active || this.engine.xr.state.active) return;
            const intent = this.gestures.readMovement();
            if (intent.right || intent.forward) this.engine.player.update(intent, delta);
        }), this.engine.xr.changes.subscribe(state => {
            this.shell.classList.toggle('immersive', state.active || this.cardboard.active); this.syncInput();
        }));
        const reviewId = new URLSearchParams(location.search).get('designReview');
        const review = Object.entries(fixFrames).find(([, factory]) => factory().dataset.nodeId === reviewId);
        if (review) {
            this.review = true; this.shell.classList.add('review');
            this.stage.replaceChildren(renderFixReview(review[0] as Screen)); this.resize(); return;
        }
        const initial = location.hash.slice(1);
        this.router.navigate((!initial || initial === 'loading' || initial === 'simulation' ? 'modes' : initial) as Screen, true);
        if (import.meta.env.DEV && import.meta.env.MODE === 'e2e')
            void import('../dev/engineDiagnostics').then(({ attachEngineDiagnostics }) => {
                if (!this.disposed) this.detachDiagnostics = attachEngineDiagnostics(this.engine).dispose;
            });
    }

    private editing(target: EventTarget | null = document.activeElement): boolean {
        return target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input,select,textarea'));
    }
    private syncInput(focus: EventTarget | null = document.activeElement): void {
        if (this.disposed || this.review) return;
        const enabled = this.router.current !== 'loading' && !this.editing(focus) && !this.cardboard.active && !this.engine.xr.state.active && !this.engine.xr.state.pending;
        this.engine.setDesktopEnabled(enabled); this.gestures.setEnabled(enabled);
        this.fishing.setEnabled(this.router.current === 'simulation' && !this.cardboard.active);
    }
    private resize(): void {
        const scale = Math.min(innerWidth / 1200, innerHeight / 600);
        this.shell.style.setProperty('--panel-scale', String(scale));
        this.shell.style.setProperty('--space-control-scale', String(Math.max(1, 1 / scale)));
    }
    private render(): void {
        if (this.review || this.disposed) return;
        const screen = this.router.current;
        if (screen !== this.rendered) {
            this.engine.setDesktopEnabled(false); this.gestures.setEnabled(false);
            this.rendered = screen; this.screenEnteredAt = performance.now();
        }
        const frame = fixFrames[screen] ? renderFixScreen(screen, this.draft, calendar(this.draft), true)
            : screen === 'simulation' ? renderSpaceNavigation('종료하고 평가하기', 'finish')
            : screen === 'loading' ? renderSpaceNavigation('취소', 'cancel-loading')
            : renderSpaceNavigation('모드 선택', 'nav:modes');
        // Star selection rerenders the panel but must not restart the notification.
        const notice = frame.querySelector<HTMLElement>('.fix-rating-notice');
        if (notice) notice.style.animationDelay = `${-(performance.now() - this.screenEnteredAt)}ms`;
        frame.dataset.screen = screen;
        if (fixFrames[screen]) frame.classList.add('explorable-frame');
        this.stage.replaceChildren(frame); this.shell.dataset.route = screen;
        this.cardboard.setPanel(frame);
        this.stage.classList.toggle('space-navigation-stage', !fixFrames[screen]);
        this.resize(); this.syncInput();
    }
    private navigate(screen: Screen): void {
        if (this.router.current === 'simulation' && screen !== 'simulation') this.fishing.cancel();
        this.router.navigate(screen);
    }
    private closeUI(): void {
        const session = this.store.value.session;
        this.navigate(session && !session.ended && modes.find(mode=>mode.id===session.mode)?.world===this.resumableWorld ? 'simulation' : 'my-room');
    }
    private toggleModes(): void {
        if (this.router.current === 'loading') return;
        if (this.router.current === 'modes') this.closeUI();
        else { this.draft.message = ''; this.navigate('modes'); }
    }
    private notice(message: string): void { this.draft.message = message; this.navigate('modes'); }

    private perform(action: string): void {
        const [name, ...rest] = action.split(':'); const value = rest.join(':');
        try {
            if (name === 'nav') { this.navigate(value as Screen); return; }
            if (name === 'home') { void this.home(); return; }
            if (name === 'cancel-loading') { void this.home(); return; }
            if (name === 'mode') {
                const mode = modes.find(mode => mode.id === value); if (!mode) return;
                const room = this.store.value.rooms.find(room => room.current < room.capacity);
                if (!room) { this.notice('지금 입장할 수 있는 모임이 없어요. 다시 선택해 주세요.'); return; }
                this.draft.mode = mode.id; this.draft.message = '';
                this.store.join(mode.id, room.id); void this.enter(mode.world, 'simulation'); return;
            }
            if (name === 'finish') {
                this.fishing.cancel(); this.store.finish();
                this.draft.modeRating = this.draft.peopleRating = 0; this.navigate('rating'); return;
            }
            if (name === 'mode-rating' || name === 'people-rating') {
                if (name === 'mode-rating') this.draft.modeRating = Number(value); else this.draft.peopleRating = Number(value);
                this.render(); return;
            }
            if (name === 'rate') {
                const people = this.store.value.session?.participants || this.draft.people;
                this.store.rate(this.draft.modeRating, this.draft.peopleRating, Object.fromEntries(people.map(id => [id, this.draft.peopleRating])));
                this.draft.people = [...people]; this.navigate('appointment-date'); return;
            }
            if (name === 'date') this.draft.date = value;
            else if (name === 'time') this.draft.time = value;
            else if (name === 'month') {
                const date = new Date(this.draft.year, this.draft.month + Number(value), 1);
                this.draft.year = date.getFullYear(); this.draft.month = date.getMonth();
            } else if (name === 'appointment-next' || name === 'appointment-search') { this.navigate('appointment-place'); return; }
            else if (name === 'appointment-simple') return;
            else if (name === 'place-next' || name === 'place-search') this.draft.place = places[(places.findIndex(place => place.id === this.draft.place) + 1) % places.length].id;
            else if (name === 'appointment-create') {
                this.store.appointment({ date: this.draft.date, time: this.draft.time, place: this.draft.place, participants: this.draft.people });
                this.notice('약속이 저장되었습니다.'); return;
            }
            this.render();
        } catch { this.notice('선택 내용을 확인하고 다시 진행해 주세요.'); }
    }
    private async enter(world: string, screen: Screen): Promise<void> {
        const request = ++this.request; this.navigate('loading');
        await this.engine.enterWorld(world);
        if (request !== this.request || this.disposed) return;
        if (this.engine.worlds.state.status === 'error') { this.notice('공간을 열지 못했어요. 모드를 다시 선택해 주세요.'); return; }
        if (screen==='simulation') this.resumableWorld=world;
        this.navigate(screen); this.cardboard.recenter();
    }
    private async home(): Promise<void> { this.fishing.cancel(); this.store.finish(); await this.enter('my-room', 'my-room'); }
    private async toggleVR(): Promise<void> {
        if (this.router.current === 'loading') return;
        if (this.engine.xr.state.active) { await this.engine.xr.endSession(); return; }
        if (this.cardboard.active) this.cardboard.stop();
        else if (this.engine.xr.state.supported) this.vrHost.querySelector<HTMLButtonElement>('button')?.click();
        else if (!await this.cardboard.start(true)) this.notice('센서 권한을 확인한 뒤 V 키로 다시 시도해 주세요.');
        this.syncInput();
    }
    async dispose(): Promise<void> {
        this.disposed = true; ++this.request; this.events.abort(); this.cleanups.forEach(cleanup => cleanup());
        this.detachDiagnostics?.(); this.router.dispose(); this.gestures.dispose(); this.fishing.dispose(); this.cardboard.dispose();
        await this.engine.dispose(); this.shell.remove();
    }
}
