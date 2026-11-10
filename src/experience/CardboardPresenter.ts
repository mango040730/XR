import { CircleGeometry, DoubleSide, Euler, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Raycaster, StereoCamera, Vector2, Vector3 } from 'three';
import type { Engine } from '../engine/core/Engine';
import { DomPanelTexture } from './DomPanelTexture';
import { cardboardSettings as settings, deviceQuaternion, DwellSelection } from './cardboardLogic';
interface PermissionOrientation extends EventTarget {
    requestPermission?: () => Promise<string>;
}
export class CardboardPresenter {
    active = false;
    sensor = '센서를 아직 요청하지 않았어요.';
    private painter = new DomPanelTexture();
    private plane = new Mesh(new PlaneGeometry(settings.panelWidth, settings.panelWidth / 2), new MeshBasicMaterial({ map: this.painter.texture, transparent: true, side: DoubleSide, depthTest: false, depthWrite: false }));
    private reticle = new Mesh(new CircleGeometry(.007, 24), new MeshBasicMaterial({ color: 'white', depthTest: false }));
    private stereo = new StereoCamera();
    private ray = new Raycaster();
    private dwell = new DwellSelection(settings.dwellMs);
    private root: HTMLElement | null = null;
    private lastPaint = 0;
    private events = new AbortController();
    private detach: () => void;
    private raw: Quaternion | null = null;
    private calibration: Quaternion | null = null;
    private saved = new Quaternion();
    private drag: {
        x: number;
        y: number;
    } | null = null;
    private worldDwell = new DwellSelection(settings.dwellMs);
    private sensorSeen = false;
    private gazeTarget: HTMLElement | null = null;
    constructor(private engine: Engine, private shell: HTMLElement, private activate: (node: HTMLElement) => void, private stateChanged: () => void, private showReticle = true) {
        this.stereo.eyeSep = settings.eyeSeparation;
        this.stereo.aspect = .5;
        this.plane.renderOrder = 1000;
        this.plane.visible = false;
        this.reticle.renderOrder = 1001;
        this.reticle.position.set(0, 0, -.7);
        this.reticle.visible = false;
        engine.rendering.scene.add(this.plane);
        engine.rendering.camera.add(this.reticle);
        this.detach = engine.frames.subscribe(({ time }) => this.update(time));
        window.addEventListener('deviceorientation', event => {
            if (!this.active || event.alpha === null || event.beta === null || event.gamma === null)
                return;
            this.sensorSeen = true;
            this.sensor = '기기 방향 데이터 수신 중';
            this.raw = deviceQuaternion(event.alpha, event.beta, event.gamma, screen.orientation?.angle ?? window.orientation ?? 0);
            if (!this.calibration) {
                this.calibration = this.raw.clone().invert();
                this.stateChanged();
            }
        }, { signal: this.events.signal });
        const canvas = engine.rendering.webgl.domElement;
        canvas.addEventListener('pointerdown', e => { if (this.active)
            this.drag = { x: e.clientX, y: e.clientY }; }, { signal: this.events.signal });
        window.addEventListener('pointermove', e => { if (!this.active || !this.drag || this.sensorSeen)
            return; engine.player.look((e.clientX - this.drag.x) * 2, (e.clientY - this.drag.y) * 2); this.drag = { x: e.clientX, y: e.clientY }; }, { signal: this.events.signal });
        window.addEventListener('pointerup', () => { this.drag = null; }, { signal: this.events.signal });
        for (let i = 0; i < 2; i++)
            engine.rendering.webgl.xr.getController(i).addEventListener('select', () => {
                if (!engine.xr.state.active || !this.root)
                    return;
                const controller = engine.rendering.webgl.xr.getController(i);
                controller.updateWorldMatrix(true, false);
                this.ray.set(controller.getWorldPosition(new Vector3()), new Vector3(0, 0, -1).transformDirection(controller.matrixWorld));
                const hit = this.hit();
                if (hit)
                    this.activate(hit);
            });
    }
    setPanel(root: HTMLElement | null): void { this.gazeTarget?.classList.remove('gaze-focus'); this.root = root; this.dwell.reset(); this.gazeTarget = null; this.recenter(); this.lastPaint = 0; }
    recenter(): void {
        const camera = this.engine.xr.state.active ? this.engine.rendering.webgl.xr.getCamera() : this.engine.rendering.camera;
        camera.updateWorldMatrix(true, false);
        const direction = camera.getWorldDirection(new Vector3()).setY(0).normalize();
        const yaw = new Euler().setFromQuaternion(camera.getWorldQuaternion(new Quaternion()), 'YXZ').y;
        this.plane.position.copy(camera.getWorldPosition(new Vector3())).addScaledVector(direction, settings.panelDistance);
        this.plane.quaternion.setFromEuler(new Euler(0, yaw, 0));
        this.plane.updateMatrixWorld(true);
        this.dwell.reset();
        this.worldDwell.reset();
    }
    async start(requestSensors = true): Promise<boolean> {
        if (this.engine.xr.state.active) {
            this.sensor = '먼저 헤드셋 VR 세션을 종료해 주세요.';
            return false;
        }
        if (requestSensors) {
            try {
                if (!window.isSecureContext)
                    throw new Error('HTTPS 주소에서 센서 권한을 요청해 주세요.');
                const ctor = (window as unknown as {
                    DeviceOrientationEvent?: PermissionOrientation;
                }).DeviceOrientationEvent;
                if (ctor?.requestPermission && await ctor.requestPermission() !== 'granted')
                    throw new Error('센서 권한이 거절되었어요. 브라우저 설정을 확인하거나 드래그 체험을 선택하세요.');
            }
            catch (error) {
                this.sensor = error instanceof Error ? error.message : String(error);
                return false;
            }
        }
        this.active = true;
        this.saved.copy(this.engine.rendering.camera.quaternion);
        this.raw = null;
        this.calibration = null;
        this.sensorSeen = false;
        this.sensor = requestSensors ? '센서 데이터를 기다리고 있어요. 수신되지 않으면 화면을 드래그해요.' : '드래그 체험 · 실제 센서 추적이 아니에요.';
        this.shell.classList.add('immersive');
        this.engine.setDesktopEnabled(false);
        this.engine.presenter = () => this.render();
        this.recenter();
        // Optional affordances; failures do not masquerade as sensor permission.
        void document.documentElement.requestFullscreen?.().catch(() => { });
        const orientation = screen.orientation as ScreenOrientation & {
            lock?: (mode: string) => Promise<void>;
        };
        void orientation?.lock?.('landscape').catch(() => { });
        this.stateChanged();
        return true;
    }
    stop(): void { if (!this.active)
        return; this.active = false; this.engine.presenter = undefined; this.shell.classList.remove('immersive'); this.plane.visible = false; this.reticle.visible = false; this.engine.rendering.camera.quaternion.copy(this.saved); this.engine.rendering.restoreSize(); this.raw = null; this.calibration = null; this.dwell.reset(); if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => { }); this.stateChanged(); }
    private hit(): HTMLElement | null {
        if (!this.root)
            return null;
        this.plane.updateMatrixWorld(true);
        const hit = this.ray.intersectObject(this.plane)[0];
        if (!hit?.uv)
            return null;
        const x = hit.uv.x * 1200, y = (1 - hit.uv.y) * 600, base = this.root.getBoundingClientRect(), scale = base.width / 1200;
        return Array.from(this.root.querySelectorAll<HTMLElement>('[data-action]')).reverse().find(node => { if (node instanceof HTMLButtonElement && node.disabled)
            return false; const r = node.getBoundingClientRect(); return x >= (r.left - base.left) / scale && x <= (r.right - base.left) / scale && y >= (r.top - base.top) / scale && y <= (r.bottom - base.top) / scale; }) ?? null;
    }
    private update(time: number): void {
        const immersive = this.active || this.engine.xr.state.active;
        this.plane.visible = immersive && !!this.root;
        this.reticle.visible = immersive && !!this.root && this.showReticle;
        if (!immersive)
            return;
        if (this.active && this.raw && this.calibration)
            this.engine.rendering.camera.quaternion.copy(this.saved).multiply(this.calibration).multiply(this.raw);
        if (this.root && time - this.lastPaint > 100) {
            this.painter.paint(this.root);
            this.lastPaint = time;
        }
        const camera = this.engine.xr.state.active ? this.engine.rendering.webgl.xr.getCamera() : this.engine.rendering.camera;
        camera.updateWorldMatrix(true, false);
        this.ray.set(camera.getWorldPosition(new Vector3()), camera.getWorldDirection(new Vector3()));
        const target = this.hit();
        if (target !== this.gazeTarget) {
            this.gazeTarget?.classList.remove('gaze-focus');
            target?.classList.add('gaze-focus');
            this.gazeTarget = target;
        }
        const dwell = this.dwell.update(target?.dataset.action || '', time);
        this.reticle.scale.setScalar(1 + dwell.progress * .8);
        this.reticle.material.color.set(target ? '#b6ffe7' : 'white');
        if (dwell.activate && target)
            this.activate(target);
        const worldTarget = !target ? this.engine.interactions.updateRay('gaze', this.ray.ray, camera.getWorldPosition(new Vector3())) : null;
        if (this.worldDwell.update(worldTarget?.uuid || '', time).activate)
            this.engine.interactions.activate('gaze');
    }
    private render(): void {
        const { webgl, camera, scene } = this.engine.rendering;
        const size = webgl.getSize(new Vector2());
        camera.updateMatrixWorld();
        scene.updateMatrixWorld();
        this.stereo.update(camera);
        webgl.setScissorTest(true);
        webgl.setScissor(0, 0, size.x / 2, size.y);
        webgl.setViewport(0, 0, size.x / 2, size.y);
        webgl.render(scene, this.stereo.cameraL);
        webgl.setScissor(size.x / 2, 0, size.x / 2, size.y);
        webgl.setViewport(size.x / 2, 0, size.x / 2, size.y);
        webgl.render(scene, this.stereo.cameraR);
        webgl.setScissorTest(false);
        webgl.setViewport(0, 0, size.x, size.y);
    }
    dispose(): void { if (this.active)
        this.stop(); this.detach(); this.events.abort(); this.plane.removeFromParent(); this.reticle.removeFromParent(); this.plane.geometry.dispose(); this.plane.material.dispose(); this.reticle.geometry.dispose(); this.reticle.material.dispose(); this.painter.dispose(); }
}
