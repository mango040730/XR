// Runs against a separate Chrome launched with --remote-debugging-port=9223.
// No browser dependencies or application-only testing hooks are required.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find(target => target.type === 'page');
assert.ok(target, 'Chrome 테스트 페이지가 필요합니다.');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
const pending = new Map(), errors = [];
let heldRequest = null;
let id = 0;
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Fetch.requestPaused') heldRequest = message.params.requestId;
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

async function until(expression, message, timeout = 120000) {
  const end = Date.now() + timeout;
  while (!(await evaluate(expression))) { assert.ok(Date.now() < end, `${message}: ${errors.join('\n')}`); await pause(150); }
}
const submit = () => evaluate(`(() => { document.querySelector('.entry-card').requestSubmit(); return true; })()`);
async function fill(values) {
  await evaluate(`(() => { const f = document.querySelector('.entry-card');
    for (const [name, value] of Object.entries(${JSON.stringify(values)})) { f.elements[name].value = value; f.elements[name].dispatchEvent(new Event('input', { bubbles: true })); }
    return true; })()`);
}
async function click(action) { await evaluate(`(() => { document.querySelector('[data-action="${action}"]').click(); return true; })()`); }
async function capture(name) {
  await until('!document.querySelector(".entry-avatar-slot")?.hasAttribute("data-switching")', '캐릭터 전환 완료');
  await evaluate('document.fonts.ready.then(() => true)');
  const images = await evaluate(`Promise.all([...document.querySelectorAll('#entry-root img')].map(async i => {
    await i.decode(); const b = i.getBoundingClientRect();
    return {src: i.currentSrc, natural: [i.naturalWidth, i.naturalHeight], box: [b.width, b.height]};
  }))`);
  for (const asset of images) {
    assert.ok(asset.natural.every(n => n > 0) && asset.box.every(n => n > 0));
    assert.ok(!asset.src.includes('figma.com'));
    if (/caret-/.test(asset.src)) assert.deepEqual(asset.box, [40, 40]);
    if (/map-marker/.test(asset.src)) assert.deepEqual(asset.box, [24, 24]);
  }
  await pause(100);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`/private/tmp/xr-entry-${name}.png`, Buffer.from(shot.data, 'base64'));
  return images;
}

try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable'); await send('Network.clearBrowserCache');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*ui/entry/avatar-default.png*', requestStage: 'Request' }] });
  heldRequest = null;
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await until("document.querySelector('.entry-card')?.dataset.step === 'login'", '로그인 화면');
  await capture('login');
  const loginStyles = () => evaluate(`['email','password'].map(name => {
    const input = document.querySelector('[name="'+name+'"]'), s = getComputedStyle(input);
    return {background:s.backgroundColor,border:s.borderTopColor};
  })`);
  const emptyStyles = await loginStyles();
  assert.equal(emptyStyles[0].background, 'rgba(0, 0, 0, 0.4)');
  assert.deepEqual(emptyStyles[0], emptyStyles[1]);
  await fill({ email: 'preview@example.com', password: 'ui-preview-only' });
  for (const s of await loginStyles()) {
    assert.equal(s.background, 'rgba(0, 0, 0, 0)'); assert.equal(s.border, 'rgba(255, 255, 255, 0.2)');
  }
  await capture('login-filled');
  await fill({ email: '', password: '' }); assert.deepEqual(await loginStyles(), emptyStyles);
  assert.ok(await evaluate(`document.fonts.check('500 18px "Wanted Sans"')`));
  const geometry = await evaluate(`(() => { const c = document.querySelector('.entry-card'), r = c.getBoundingClientRect(), h = document.querySelector('h1').getBoundingClientRect();
    return {card: [r.x,r.y,r.width,r.height], title: [h.y-r.y,h.height], font: getComputedStyle(c).fontFamily}; })()`);
  assert.deepEqual(geometry.card, [663, 239, 594, 601]);
  assert.deepEqual(geometry.title, [40, 44]);
  assert.equal(await evaluate('Boolean(window.spaceVR)'), false, '입력 중 공간 생성은 시작하지 않습니다.');
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 0);
  const original = [0, 3.875, 26.6];
  await key('KeyW', 'w', 400);
  assert.equal(await evaluate('Boolean(window.spaceVR)'), false, '접속 전 이동·공간 초기화 금지');
  await submit();
  assert.equal(await evaluate('document.querySelector(".entry-card").dataset.step'), 'login', '빈 로그인 양식 검증');
  await fill({ email: 'preview@example.com', password: 'ui-preview-only' }); await submit();
  await capture('identity');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".entry-fields input")].map(i => i.name)'), ['name','birth','phone','code']);
  assert.equal(await evaluate('document.querySelector("[name=phone]").type'), 'tel');
  await fill({ name: '미리보기', birth: '2000.02.31', phone: '01012345678', code: '123456' }); await submit();
  assert.equal(await evaluate('document.querySelector(".entry-card").dataset.step'), 'identity');
  await fill({ birth: '20000101' });
  assert.equal(await evaluate('document.querySelector("[name=birth]").value'), '2000.01.01');
  await evaluate(`(() => { const i = document.querySelector('[name=birth]'); i.focus(); i.setSelectionRange(0,i.value.length); return true; })()`);
  await send('Input.insertText', { text: '19991231' });
  assert.equal(await evaluate('document.querySelector("[name=birth]").value'), '1999.12.31');
  assert.equal(await evaluate('document.querySelector("[name=birth]").selectionStart'), 10);
  const avatarRequestEnd = Date.now() + 15000;
  while (!heldRequest) { assert.ok(Date.now() < avatarRequestEnd, '로그인 단계부터 캐릭터 미리 로딩'); await pause(50); }
  await evaluate(`(() => { window.__avatarFirstPaint = new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.entry-card')?.dataset.step !== 'avatar') return;
      const image = document.querySelector('.entry-avatar img'); observer.disconnect();
      resolve({complete:image.complete,width:image.naturalWidth});
    }); observer.observe(document.getElementById('entry-root'),{childList:true,subtree:true});
  }); return true; })()`);
  await fill({ birth: '20000101' }); await submit();
  assert.equal(await evaluate('document.querySelector(".entry-card").dataset.step'), 'identity', '이미지가 준비되기 전 빈 선택 화면을 띄우면 안 됩니다.');
  await send('Fetch.continueRequest', {requestId:heldRequest}); await send('Fetch.disable');
  const firstAvatar = await evaluate('window.__avatarFirstPaint');
  assert.ok(firstAvatar.complete && firstAvatar.width > 0, '선택 화면의 첫 표시부터 디코딩된 원본 캐릭터가 있어야 합니다.');
  await until('document.querySelector(".entry-card")?.dataset.step === "avatar"', '아바타 화면 준비');
  const avatarSlots = [];
  for (let i = 0; i < 4; i++) {
    avatarSlots.push(await capture(`avatar-${i + 1}`));
    assert.equal(await evaluate('document.querySelectorAll(".entry-avatar").length'), 1, '캐릭터는 한 명씩');
    const dots = await evaluate('[...document.querySelectorAll(".entry-dot")].map(d => ({active:d.getAttribute("aria-current"),width:d.firstElementChild.getBoundingClientRect().width}))');
    assert.equal(dots.length, 4);
    dots.forEach((dot, index) => { assert.equal(dot.active, String(index === i)); assert.equal(dot.width, index === i ? 24 : 8); });
    const spacing = await evaluate(`(() => {
      const dots = [...document.querySelectorAll('.entry-dot > span')].map(d => d.getBoundingClientRect());
      const bar = document.querySelector('.entry-pagination').getBoundingClientRect();
      const image = document.querySelector('.entry-carousel').getBoundingClientRect();
      const button = document.querySelector('.entry-card [type=submit]').getBoundingClientRect();
      return {gaps: dots.slice(1).map((d,j) => d.left - dots[j].right), above: bar.top-image.bottom, below: button.top-bar.bottom};
    })()`);
    assert.ok(spacing.gaps.every(g => Math.abs(g - 12) < 0.01));
    assert.ok(Math.abs(spacing.above - 40) < 0.01 && Math.abs(spacing.below - 40) < 0.01);
    await click('next-avatar');
  }
  await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '마지막 캐릭터 전환');
  await click('previous-avatar');
  await until('document.getAnimations().some(a => a.effect.target.matches(".entry-avatar") && a.playState === "running")', '캐릭터 애니메이션 시작');
  const motion = await evaluate(`document.getAnimations().filter(a => a.effect.target.matches('.entry-avatar')).map(a => ({duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes().map(k => ({opacity:k.opacity,transform:k.transform}))}))`);
  assert.equal(motion.length, 2); assert.ok(motion.every(a => a.duration === 280));
  assert.ok(motion.some(a => a.frames.some(f => f.transform.includes('translateX'))));
  await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '이전 캐릭터 전환 완료');
  assert.equal(await evaluate('document.querySelector(".entry-avatar").dataset.avatar'), 'violet');
  await evaluate(`(() => { for (let i=0;i<5;i++) document.querySelector('[data-action="next-avatar"]').click(); return true; })()`);
  await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '연속 전환 완료');
  assert.equal(await evaluate('document.querySelector(".entry-avatar").dataset.avatar'), 'cream');
  assert.equal(await evaluate('document.querySelectorAll(".entry-avatar").length'), 1);
  await evaluate(`(() => { document.querySelector('.entry-dot[data-index="2"]').click(); return true; })()`);
  await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '점 표시 직접 선택');
  assert.equal(await evaluate('document.querySelector(".entry-avatar").dataset.avatar'), 'yellow');
  assert.equal(await evaluate('document.querySelector(".entry-dot[aria-current=true]").dataset.index'), '2');
  await evaluate(`(() => { document.querySelector('.entry-dot[data-index="0"]').click(); return true; })()`);
  await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '첫 아바타 직접 선택');
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await click('next-avatar'); await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '동작 줄이기 전환');
  assert.equal(await evaluate('document.getAnimations().length'), 0);
  await click('previous-avatar'); await until('!document.querySelector(".entry-avatar-slot").hasAttribute("data-switching")', '원래 캐릭터');
  await send('Emulation.setEmulatedMedia', {features:[]});
  await submit();
  await capture('nickname');
  await fill({ nickname: '   ' }); await submit();
  assert.equal(await evaluate('document.querySelector(".entry-card").dataset.step'), 'nickname');
  await fill({ nickname: '우리 동네' }); await submit();
  await capture('location');
  await click('reset-location'); await key('ArrowRight', 'ArrowRight', 30); await key('ArrowUp', 'ArrowUp', 30);
  const marker = await evaluate('({x:document.querySelector(".entry-map-marker").style.left,y:document.querySelector(".entry-map-marker").style.top})');
  assert.notEqual(marker.x, '50%'); assert.notEqual(marker.y, '50%'); await submit();
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('mobile-location');
  assert.ok(await evaluate(`(() => { const b = document.querySelector('.entry-card').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight; })()`));
  await submit(); await until('window.spaceVR?.entered && !document.getElementById("entry-root")', 'UI 완료 후 입장');
  assert.equal(await evaluate('document.querySelector("canvas").inert'), false);
  assert.equal(await evaluate('window.spaceVR.profile.nickname'), '우리 동네');
  assert.equal(await evaluate('window.spaceVR.profile.avatar'), 'cream');
  assert.ok((await evaluate('window.spaceVR.position')).every((v, i) => Math.abs(v - original[i]) < 0.000001), '동일 입구·카메라에서 입장');
  assert.equal(errors.length, 0, errors.join('\n'));

  // Complete the UI while the real model request is held, then let it finish.
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*models/space.glb*', requestStage: 'Request' }] });
  heldRequest = null; await send('Page.navigate', { url });
  await until('document.querySelector(".entry-card")?.dataset.step === "login"', '느린 모델 확인 전 로그인');
  await click('signup'); await click('pass-preview');
  await until('document.querySelector(".entry-card")?.dataset.step === "avatar"', 'PASS 미리보기 후 캐릭터 준비');
  await submit(); await fill({ nickname: '느린 로딩 확인' }); await submit(); await submit();
  const interceptEnd = Date.now() + 30000;
  while (!heldRequest) { assert.ok(Date.now() < interceptEnd, '모델 요청 대기'); await pause(100); }
  assert.equal(await evaluate('window.spaceVR.entered'), false);
  assert.equal(await evaluate('document.querySelector("canvas").inert'), true);
  const waitingPosition = await evaluate('window.spaceVR.position');
  await key('KeyW', 'w', 200);
  assert.deepEqual(await evaluate('window.spaceVR.position'), waitingPosition, '준비 중 이동 차단');
  assert.equal(await evaluate('document.querySelector(".entry-card [type=submit]").disabled'), true);
  await capture('waiting-for-scene');
  await send('Fetch.continueRequest', { requestId: heldRequest }); await send('Fetch.disable');
  await until('window.spaceVR?.ready && window.spaceVR.entered && !document.getElementById("entry-root")', '느린 모델 준비 후 입장');
  assert.equal(await evaluate('window.spaceVR.profile.nickname'), '느린 로딩 확인');
  assert.equal(errors.length, 0, errors.join('\n'));

  // A failed model must leave the UI usable, with a real reload retry.
  await send('Fetch.enable', { patterns: [{ urlPattern: '*models/space.glb*', requestStage: 'Request' }] });
  heldRequest = null; await send('Page.navigate', { url });
  await until('document.querySelector(".entry-card")?.dataset.step === "login"', '실패 검사 전 로그인');
  await click('signup'); await click('pass-preview');
  await until('document.querySelector(".entry-card")?.dataset.step === "avatar"', '재시도 흐름 캐릭터 준비');
  await submit(); await fill({ nickname: '재시도 확인' }); await submit(); await submit();
  const failureEnd = Date.now() + 30000;
  while (!heldRequest) { assert.ok(Date.now() < failureEnd); await pause(100); }
  await send('Fetch.failRequest', { requestId: heldRequest, errorReason: 'Failed' }); await send('Fetch.disable');
  await until('document.documentElement.dataset.scene === "error"', '모델 실패 처리');
  assert.equal(await evaluate('document.querySelector(".entry-card [type=submit]").textContent'), '다시 시도');
  assert.equal(await evaluate('window.spaceVR.entered'), false);
  await capture('load-error');
  assert.ok(errors.length > 0 && errors.every(e => e.includes('공간 모델을 불러오지 못했습니다.')));
  const expectedLoadFailures = errors.length; errors.length = 0;
  await submit(); await until('document.querySelector(".entry-card")?.dataset.step === "login"', '재시도 후 로그인');
  assert.equal(await evaluate('Boolean(window.spaceVR)'), false);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ url, figmaCard: geometry, firstAvatar, avatarAssets: avatarSlots, dots: 'passed', delayedSceneGate: 'passed', retry: 'passed', expectedLoadFailures, errors }, null, 2));
} finally { await send('Fetch.disable').catch(() => {}); ws.close(); }
