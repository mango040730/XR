import { test, expect, enter, snapshot, screenshot, renderFrames, lookAt } from './fixtures';

test.beforeEach(async ({ page }) => {
  const response = await page.goto('/?lab=1&legacyServiceReview=1');
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => !!window.__XR_DEBUG__);
  await expect(page.locator('canvas')).toBeVisible();
});

test('loads a real WebGL2 canvas and keeps PC mode when immersive VR is unavailable', async ({ page }) => {
  const context = await page.locator('canvas').evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    return { available: !!gl, lost: gl?.isContextLost(), width: canvas.clientWidth, height: canvas.clientHeight };
  });
  expect(context.available).toBe(true); expect(context.lost).toBe(false);
  expect(context.width).toBeGreaterThan(0); expect(context.height).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).xr.reason).not.toContain('확인 중');
  expect((await snapshot(page)).xr.supported).toBe(false);
  await expect(page.locator('[data-vr-host] button')).toBeDisabled();
  await expect(page.locator('[data-xr]')).toContainText(/PC|WebXR|권한/);
  await enter(page, 'test-world-a');
  await expect(page.locator('[data-mode]')).toContainText('PC');
});

test('enters A and B switches leaves and reenters with each configured spawn', async ({ page }, info) => {
  await expect(page.locator('[data-leave]')).toBeDisabled();
  await enter(page, 'test-world-a');
  const a = await snapshot(page);
  expect(a.player.position).toEqual([0, 0, 6]);
  await screenshot(page, info, 'test-world-a');
  await enter(page, 'test-world-b');
  const b = await snapshot(page);
  expect(b.player.position).toEqual([-4, 0, 7]); expect(b.player.yaw).toBeCloseTo(-Math.PI / 4);
  expect(b.worldRoots).toEqual(['world:test-world-b']);
  expect(b.disposed.geometry).toBeGreaterThan(a.disposed.geometry);
  await screenshot(page, info, 'test-world-b');
  await page.locator('[data-leave]').click();
  expect((await snapshot(page)).worldRoots).toEqual([]);
  await expect(page.locator('[data-welcome]')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).memory.geometries).toBe(0);
  await enter(page, 'test-world-a');
  expect((await snapshot(page)).activeRootId).not.toBe(a.activeRootId);
  expect((await snapshot(page)).player.position).toEqual([0, 0, 6]);
});

test('WASD changes actual player position and mouse input changes yaw without pointer lock', async ({ page }) => {
  await enter(page, 'test-world-a');
  await page.locator('#speed').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-speed-output]')).toHaveText('4.0 m/s');
  await page.locator('canvas').click();
  await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe(undefined);
  for (const [key, axis, sign] of [['w', 2, -1], ['s', 2, 1], ['d', 0, 1], ['a', 0, -1]] as const) {
    const before = (await snapshot(page)).player.position[axis];
    await page.keyboard.down(key);
    try {
      await expect.poll(async () => ((await snapshot(page)).player.position[axis] - before) * sign).toBeGreaterThan(0.25);
    } finally { await page.keyboard.up(key); }
  }
  const yaw = (await snapshot(page)).player.yaw;
  await lookAt(page,yaw-.3);
  await expect.poll(async () => Math.abs((await snapshot(page)).player.yaw - yaw)).toBeGreaterThan(0.05);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
});

test('blocks the A cube and activates its real interaction from nearby', async ({ page }) => {
  await enter(page, 'test-world-a');
  await page.locator('canvas').click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await page.keyboard.down('w');
  try {
    await expect.poll(async () => (await snapshot(page)).player.position[2]).toBeLessThan(2.9);
    // Keep pushing long enough to exercise collision over multiple real frames.
    await page.waitForTimeout(350);
    expect((await snapshot(page)).player.position[2]).toBeGreaterThanOrEqual(2.78 - 0.001);
  } finally { await page.keyboard.up('w'); }
  await expect(page.locator('[data-hint]')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).highlights).toBeGreaterThan(0);
  await page.mouse.click(900, 500);
  await expect.poll(async () => (await snapshot(page)).interactables[0].color).toBe('ffb86b');
  await expect(page.locator('[data-action]')).toContainText('A 큐브 버튼 선택됨');
});

test('comfort defaults and interaction state reset across worlds', async ({ page }) => {
  await enter(page, 'test-world-a');
  await expect(page.locator('#xr-movement')).toHaveValue('teleport');
  await expect(page.locator('#xr-turn')).toHaveValue('snap');
  await page.locator('#xr-movement').selectOption('smooth'); await page.locator('#xr-turn').selectOption('smooth');
  expect((await snapshot(page)).xrSettings.movement).toBe('smooth');
  expect((await snapshot(page)).xrSettings.turn).toBe('smooth');
  await enter(page, 'test-world-b');
  await expect(page.locator('#xr-movement')).toHaveValue('teleport'); await expect(page.locator('#xr-turn')).toHaveValue('snap');
  await expect(page.locator('[data-action]')).toBeHidden();
  await page.locator('[data-leave]').click(); expect((await snapshot(page)).highlights).toBe(0);
});

test('interacts with a named node in the actual GLB and clears its UI on transition', async ({ page }, info) => {
  await enter(page, 'glb-test-room');
  await page.locator('canvas').click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await page.keyboard.down('d');
  try { await expect.poll(async () => (await snapshot(page)).player.position[2]).toBeLessThan(0.05); }
  finally { await page.keyboard.up('d'); }
  await page.keyboard.down('w');
  try { await expect.poll(async () => (await snapshot(page)).player.position[0]).toBeLessThan(4.3); }
  finally { await page.keyboard.up('w'); }
  const bounds = await page.locator('canvas').boundingBox(); expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2; const y = bounds!.y + bounds!.height / 2 + 150;
  await lookAt(page,(await snapshot(page)).player.yaw,-.3);
  await expect(page.locator('[data-hint]')).toContainText('GLB 받침대');
  await page.mouse.click(x, y);
  await expect(page.locator('[data-action]')).toContainText('GLB 받침대 선택됨');
  expect((await snapshot(page)).interactables.find(target => target.id === 'glb-pedestal')?.color).toBe('ffb86b');
  await screenshot(page, info, 'glb-interaction');
  await page.keyboard.press('Escape'); await enter(page, 'test-world-a');
  await expect(page.locator('[data-action]')).toBeHidden();
});

test('loads real GLB bytes applies transforms and disposes assets across repeated replacements', async ({ page }, info) => {
  const download = page.waitForResponse(response => response.url().endsWith('/test-room/scene.glb'));
  await enter(page, 'glb-test-room');
  const response = await download;
  expect(response.status()).toBe(200);
  const bytes = await response.body();
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(4)).toBe(2);
  const initial = await snapshot(page); const model = initial.models[0];
  expect(initial.models).toHaveLength(1); expect(model.meshes).toBe(8);
  expect(model.position).toEqual([2, 0, -1]); expect(model.rotation[1]).toBeCloseTo(Math.PI / 2);
  expect(model.scale).toEqual([1.2, 1, 1.2]); expect(initial.player.position).toEqual([7, 0, 2]);
  for (const [index, value] of [-5.38, -0.2, -7.18].entries()) expect(model.min[index]).toBeCloseTo(value);
  for (const [index, value] of [9.38, 3, 5.18].entries()) expect(model.max[index]).toBeCloseTo(value);
  await screenshot(page, info, 'glb-test-room');
  const ids = new Set([model.id]);
  for (let i = 0; i < 5; i++) {
    await enter(page, 'test-world-a');
    expect((await snapshot(page)).models).toHaveLength(0);
    await enter(page, 'glb-test-room');
    await expect.poll(async () => (await snapshot(page)).memory.geometries).toBe(initial.memory.geometries);
    const current = await snapshot(page);
    expect(current.models).toHaveLength(1); expect(current.worldRoots).toEqual(['world:glb-test-room']);
    expect(ids.has(current.models[0].id)).toBe(false); ids.add(current.models[0].id);
    expect(current.disposed.geometry).toBeGreaterThan(initial.disposed.geometry);
    expect(current.disposed.material).toBeGreaterThan(initial.disposed.material);
  }
  await page.locator('[data-leave]').click();
  await expect.poll(async () => (await snapshot(page)).memory.geometries).toBe(0);
});

test('recovers from an actual missing GLB URL without removing the old world', async ({ page, browserLog }, info) => {
  const missing = '/assets/models/test-room/missing.glb'; browserLog.expectedFailures.add(missing);
  await enter(page, 'test-world-a'); const old = await snapshot(page);
  const response = page.waitForResponse(item => new URL(item.url()).pathname === missing);
  await page.locator('#world-select').selectOption('e2e-missing-model');
  await page.locator('[data-enter]').click();
  expect((await response).status()).toBe(404);
  await expect(page.locator('[data-error]')).toContainText('모델 로딩 실패');
  const failed = await snapshot(page);
  expect(failed.world.status).toBe('error'); expect(failed.activeRootId).toBe(old.activeRootId);
  expect(failed.worldRoots).toEqual(['world:test-world-a']); expect(failed.player.position).toEqual(old.player.position);
  await screenshot(page, info, 'model-loading-error');
  await enter(page, 'test-world-b'); await expect(page.locator('[data-error]')).toBeHidden();
});

test('rejects invalid GLB response bytes and can retry with the real room', async ({ page }) => {
  await page.route('**/test-room/invalid.glb', route => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: Buffer.from('invalid glTF binary') }));
  await page.locator('#world-select').selectOption('e2e-invalid-model'); await page.locator('[data-enter]').click();
  await expect(page.locator('[data-error]')).toContainText('invalid.glb');
  expect((await snapshot(page)).worldRoots).toEqual([]);
  await enter(page, 'glb-test-room'); expect((await snapshot(page)).models).toHaveLength(1);
});

for (const action of ['switch', 'cancel'] as const) {
  test(`handles ${action} during GLB loading and ignores a late successful response`, async ({ page }) => {
    let release!: () => void; let requested!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const request = new Promise<void>(resolve => { requested = resolve; });
    await page.route('**/test-room/scene.glb', async route => { requested(); await gate; await route.continue(); });
    await page.locator('#world-select').selectOption('glb-test-room'); await page.locator('[data-enter]').click();
    await request;
    await expect(page.locator('[data-progress]')).toBeVisible();
    if (action === 'switch') {
      await enter(page, 'test-world-b');
    } else {
      await page.getByRole('button', { name: '취소', exact: true }).click();
      expect((await snapshot(page)).world.status).toBe('idle');
    }
    const download = page.waitForResponse(response => response.url().endsWith('/test-room/scene.glb'));
    release(); const response = await download; await response.finished();
    await renderFrames(page);
    const final = await snapshot(page);
    expect(final.world.activeId).toBe(action === 'switch' ? 'test-world-b' : null);
    expect(final.worldRoots).toEqual(action === 'switch' ? ['world:test-world-b'] : []);
    expect(final.models).toHaveLength(0);
    if (action === 'cancel') await expect.poll(async () => (await snapshot(page)).memory.geometries).toBe(0);
  });
}
