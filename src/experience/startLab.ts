import '../ui/styles.css';
import { Engine } from '../engine/core/Engine';
import { AppUI } from '../ui/AppUI';
import { worlds } from '../worlds/registry';

const host = document.querySelector<HTMLElement>('#app');
if (!host) throw new Error('앱 컨테이너를 찾을 수 없습니다.');
const ui = new AppUI(host);
let engine: Engine | undefined;
let detachDiagnostics: (() => void) | undefined;
try {
  let registeredWorlds = worlds;
  if (import.meta.env.DEV && import.meta.env.MODE === 'e2e') {
    const { e2eWorlds } = await import('../dev/e2eWorlds');
    registeredWorlds = [...worlds, ...e2eWorlds];
  }
  engine = new Engine(ui.viewport, ui.vrHost, registeredWorlds);
  ui.bind(engine);
  if (import.meta.env.DEV && import.meta.env.MODE === 'e2e') {
    const { attachEngineDiagnostics } = await import('../dev/engineDiagnostics');
    detachDiagnostics = attachEngineDiagnostics(engine).dispose;
  }
} catch (error) {
  ui.showError(`3D 초기화 실패: ${error instanceof Error ? error.message : String(error)}. WebGL2 지원 브라우저와 그래픽 가속 설정을 확인하세요.`);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachDiagnostics?.(); ui.dispose(); void engine?.dispose();
  });
}
