// Runs against a separate Chrome launched with --remote-debugging-port=9223.
// No browser dependencies or application-only testing hooks are required.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { GATHERING_ENTRY, GATHERING_LAYOUT } from '../src/gathering-layout.js';
import { finishEntryPreview } from './helpers/entry-flow.mjs';
const ENTRY_POSITION = GATHERING_ENTRY.position, ENTRY_RADIUS = GATHERING_LAYOUT.outerRadius;

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find(target => target.type === 'page');
assert.ok(target, 'Chrome 테스트 페이지가 필요합니다.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const pending = new Map(), errors = [];
let id = 0;
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
  }
  if (!message.id) return;
  const handlers = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) handlers.reject(new Error(message.error.message)); else handlers.resolve(message.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const request = ++id;
    pending.set(request, { resolve, reject });
    ws.send(JSON.stringify({ id: request, method, params }));
  });
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function key(code, key, ms = 700) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key });
  await pause(ms);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key });
  await pause(120);
}
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url });
  const deadline = Date.now() + 120000;
  while (!(await evaluate('Boolean(window.spaceVR?.ready)'))) {
    assert.ok(Date.now() < deadline, `이동 준비 시간 초과: ${errors.join('\n')}`);
    await pause(500);
  }
  await finishEntryPreview(evaluate);
  while (!(await evaluate('Boolean(window.spaceVR?.entered) && !document.getElementById("entry-root")'))) {
    assert.ok(Date.now() < deadline, '접속 UI 완료 후 공간 진입 시간 초과'); await pause(100);
  }
  await send('Page.bringToFront');
  let woodTexture;
  const textureDeadline = Date.now() + 15000;
  while (!woodTexture) {
    woodTexture = await evaluate(`(() => {
      const entry = performance.getEntriesByType('resource').find(e => e.name.includes('wood-table-001-diffuse-2k.jpg') && e.responseEnd > 0);
      return entry ? {url: entry.name, bytes: entry.decodedBodySize, status: entry.responseStatus ?? 0} : null;
    })()`);
    assert.ok(Date.now() < textureDeadline, '실제 목재 사진 텍스처 로드 시간 초과');
    if (!woodTexture) await pause(200);
  }
  woodTexture.dimensions = await evaluate(`new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = () => reject(new Error('목재 사진 디코딩 실패')); image.src = ${JSON.stringify(woodTexture.url)};
  })`);
  assert.ok(woodTexture.dimensions.every(n => n >= 1024) && [0, 200, 304].includes(woodTexture.status), `실제 목재 사진을 디코딩해야 합니다: ${JSON.stringify(woodTexture)}`);
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 1, '공간 캔버스는 하나여야 합니다.');
  const start = await evaluate('window.spaceVR.position');
  assert.ok(start.every((value, i) => Math.abs(value - ENTRY_POSITION[i]) < 0.0001), '입구에서 시작해야 합니다.');
  const initialScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/private/tmp/gonggan-entry-default.png', Buffer.from(initialScreenshot.data, 'base64'));
  await key('KeyW', 'w');
  const forward = await evaluate('window.spaceVR.position');
  assert.ok(start[2] - forward[2] > 0.2, `W 전진 실패: ${start} -> ${forward}`);
  assert.ok(forward[2] < ENTRY_RADIUS - 0.1, '입구를 실제로 통과해 블루길 안으로 진입해야 합니다.');
  await key('KeyS', 's');
  const backward = await evaluate('window.spaceVR.position');
  assert.ok(backward[2] - forward[2] > 0.2, 'S 후진 실패');
  await key('KeyR', 'r', 30);
  await key('ArrowLeft', 'ArrowLeft');
  const left = await evaluate('window.spaceVR.position');
  assert.ok(left[0] < -0.2, `방향키 이동 실패: ${left}`);
  await key('KeyR', 'r', 30);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(400);
  const mobile = await evaluate('({width:innerWidth,height:innerHeight,canvasWidth:document.querySelector("canvas").clientWidth,canvasHeight:document.querySelector("canvas").clientHeight})');
  assert.equal(mobile.canvasWidth, mobile.width);
  assert.equal(mobile.canvasHeight, mobile.height);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 200, id: 1 }, { x: 240, y: 200, id: 2 }] });
  await pause(700);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(120);
  const touch = await evaluate('window.spaceVR.position');
  assert.ok(start[2] - touch[2] > 0.2, `두 손가락 전진 실패: ${touch}`);
  const frames = await evaluate(`new Promise(resolve => {
    const times = [], start = performance.now(); let previous = start;
    function sample(now) {
      times.push(now - previous); previous = now;
      if (now - start < 2000) requestAnimationFrame(sample);
      else {
        const ordered = times.slice().sort((a, b) => a - b);
        resolve({ fps: times.length * 1000 / (now - start), p95FrameMs: ordered[Math.floor(ordered.length * 0.95)] });
      }
    }
    requestAnimationFrame(sample);
  })`);
  assert.deepEqual(errors, [], '브라우저 실행 오류가 없어야 합니다.');
  console.log(JSON.stringify({ url, ready: true, woodTexture, start, forward, backward, left, touch, mobile, frames, errors }, null, 2));
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/private/tmp/gonggan-movement-browser.png', Buffer.from(screenshot.data, 'base64'));
} finally { ws.close(); }
