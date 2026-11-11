import { test, expect, snapshot, screenshot, renderFrames } from './fixtures';
import type { Page } from '@playwright/test';

async function click(page: Page, action: string) { await page.locator(`[data-action="${action}"]`).first().click(); }
async function route(page: Page, screen: string) { await expect(page.locator('.first-fix-shell')).toHaveAttribute('data-route', screen); }
async function onlyOriginalUI(page: Page) {
    await expect(page.locator('.service-chrome,.service-touch-controls,.vr-panel-tools,.fix-individual-ratings,.fix-place-choices,.ds-screen,#world-select')).toHaveCount(0);
    await expect(page.locator('.fishing-hud > *')).toHaveCount(0);
    expect(await page.locator('button:visible,input:visible,a:visible').evaluateAll(nodes => nodes.every(node => !!node.closest('.fix-frame')))).toBe(true);
}

test('fresh users see only the four first-fix screens through mode, rating and booking', async ({ page }, info) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await page.goto('/?offline=1&ui=1'); await route(page, 'modes'); await onlyOriginalUI(page);
    expect(await page.locator('[data-action="login"]').count()).toBe(0);
    await expect.poll(async () => (await snapshot(page)).world.activeId).toBe('my-room');
    await screenshot(page, info, 'first-fix-only-modes');
    const glb = page.waitForResponse(response => response.url().endsWith('/bowling/retro_bowling_alley.glb'));
    await click(page, 'mode:team'); expect((await glb).status()).toBe(200); await route(page, 'simulation');
    await expect(page.locator('button:visible,input:visible,a:visible')).toHaveCount(5);
    await page.mouse.click(600, 350); await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
    const before = (await snapshot(page)).player.position;
    await page.keyboard.down('w');
    try { await expect.poll(async () => before[2] - (await snapshot(page)).player.position[2]).toBeGreaterThan(.25); }
    finally { await page.keyboard.up('w'); }
    await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
    await route(page, 'simulation');
    await screenshot(page, info, 'first-fix-minimal-simulation');
    await click(page, 'finish'); await route(page, 'rating'); await onlyOriginalUI(page);
    await expect(page.locator('[data-action="rate"]')).toBeDisabled();
    await click(page, 'mode-rating:4'); await click(page, 'people-rating:5');
    await screenshot(page, info, 'first-fix-only-rating'); await click(page, 'rate'); await route(page, 'appointment-date');
    await onlyOriginalUI(page); await expect(page.locator('[data-action="appointment-next"]')).toBeDisabled();
    await page.locator('.calendar [data-action^="date:"]').nth(15).click(); await click(page, 'time:17:00');
    await screenshot(page, info, 'first-fix-only-date'); await click(page, 'appointment-next'); await route(page, 'appointment-place');
    await onlyOriginalUI(page); await click(page, 'place-search');
    await expect(page.locator('[data-node-id="49:1166"]')).toContainText('어린이대공원');
    await screenshot(page, info, 'first-fix-only-place'); await click(page, 'appointment-create'); await route(page, 'modes');
    await expect(page.locator('.fix-mode-notice')).toContainText('약속이 저장되었습니다');
    const data = await page.evaluate(() => JSON.parse(localStorage.getItem('xr-spatial-service-demo-v1')!));
    expect(data.ratings).toHaveLength(1); expect(Object.values(data.ratings[0].participantRatings)).toEqual([5, 5, 5]);
    expect(data.appointments).toHaveLength(1); expect(data.appointments[0].place).toBe('park');
    await onlyOriginalUI(page);
});

test('old routes and UI flags never restore the discarded UI; the mode-selection home remains walkable', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    for (const url of ['/?ui=1#profile', '/?lab=1', '/?designReview=700']) {
        await page.goto(url.replace('/?', '/?offline=1&')); await route(page, 'modes'); await onlyOriginalUI(page);
    }
    await page.keyboard.press('b'); await click(page, 'home'); await route(page, 'modes');
    await expect(page.locator('.fix-mode-card')).toHaveCount(3);
    await page.mouse.click(600, 350); await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
    const before = (await snapshot(page)).player.position; await page.keyboard.down('w');
    try { await expect.poll(async () => Math.hypot(...(await snapshot(page)).player.position.map((n,i)=>n-before[i]))).toBeGreaterThan(.25); }
    finally { await page.keyboard.up('w'); }
    await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
    await page.keyboard.press('m'); await route(page, 'modes');
    await page.keyboard.press('b'); await route(page, 'appointment-date'); await onlyOriginalUI(page);
});

test('failed model loading keeps the previous world and uses the original notification', async ({ page, browserLog }) => {
    browserLog.expectedFailures.add('/assets/models/bowling/retro_bowling_alley.glb');
    await page.goto('/?offline=1'); await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().world.status)).toBe('ready');
    await page.route('**/bowling/retro_bowling_alley.glb', route => route.fulfill({ status: 404, body: 'missing' }));
    await click(page, 'mode:team'); await route(page, 'modes');
    await expect(page.locator('.fix-mode-notice')).toContainText('공간을 열지 못했어요');
    expect((await snapshot(page)).world.activeId).toBe('my-room'); await onlyOriginalUI(page);
});

test('cancelled loading does not reopen a discarded screen after a late model response', async ({ page }) => {
    await page.goto('/?offline=1'); await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().world.status)).toBe('ready');
    let requested = false;
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/bowling/retro_bowling_alley.glb', async route => { requested = true; await hold; await route.continue(); });
    await click(page, 'mode:team'); await route(page, 'loading');
    await expect.poll(() => requested).toBe(true);
    await click(page, 'cancel-loading'); await route(page, 'modes');
    await renderFrames(page);
    const root = (await snapshot(page)).activeRootId;
    const memory = (await snapshot(page)).memory;
    const response = page.waitForResponse(item => item.url().endsWith('/bowling/retro_bowling_alley.glb'));
    release(); const completed = await response; expect(completed.status()).toBe(200); await completed.finished();
    // Diagnostics watch committed roots, so an aborted candidate has no disposal
    // counter. Check rendered allocations and scene ownership after real loading.
    await renderFrames(page);
    expect((await snapshot(page)).memory).toEqual(memory);
    expect((await snapshot(page)).models.map(m=>m.url)).toEqual([expect.stringContaining('myroom-v2-2.7.1.glb')]);
    expect((await snapshot(page)).worldRoots).toEqual(['world:my-room']);
    await route(page, 'modes'); expect((await snapshot(page)).activeRootId).toBe(root);
    await expect(page.locator('.fix-mode-card')).toHaveCount(3);
});

test('Cardboard keeps the original four-screen panel without extra toolbars or reticle', async ({ page }, info) => {
    await page.setViewportSize({ width: 1000, height: 600 });
    await page.goto('/?offline=1'); await route(page, 'modes');
    await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().world.status)).toBe('ready');
    await page.keyboard.press('v'); await expect(page.locator('.first-fix-shell')).toHaveClass(/immersive/);
    // Look at the panel heading while capturing; a sustained gaze on a mode card correctly enters it.
    const pitch=(await snapshot(page)).player.pitch;
    await page.mouse.move(500,300);await page.mouse.down();await page.mouse.move(500,300-(.25-pitch)/.004,{steps:4});await page.mouse.up();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.fix-frame img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
    await page.waitForTimeout(250);
    await onlyOriginalUI(page); await screenshot(page, info, 'first-fix-only-cardboard');
    await page.keyboard.press('v'); await expect(page.locator('.first-fix-shell')).not.toHaveClass(/immersive/);
    await expect(page.locator('.fix-frame')).toHaveAttribute('data-node-id', '115:330');
});

test('touch gestures move, cancel and reopen the original menu without any movement widgets', async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(); await page.goto('/?offline=1'); await route(page, 'modes'); await onlyOriginalUI(page);
    await expect.poll(() => page.evaluate(() => window.__XR_DEBUG__?.snapshot().world.status)).toBe('ready');
    const cdp = await context.newCDPSession(page);
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: Array<{ x: number; y: number; id: number }> = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const yaw = (await snapshot(page)).player.yaw;
    await send('touchStart', [{ x: 420, y: 150, id: 1 }]); await send('touchMove', [{ x: 470, y: 150, id: 1 }]); await send('touchEnd');
    await expect.poll(async () => (await snapshot(page)).player.yaw).toBeCloseTo(yaw - .2);
    const before = (await snapshot(page)).player.position;
    await send('touchStart', [{ x: 320, y: 170, id: 1 }, { x: 380, y: 170, id: 2 }]);
    await send('touchMove', [{ x: 320, y: 130, id: 1 }, { x: 380, y: 130, id: 2 }]);
    await expect.poll(async () => { const after = (await snapshot(page)).player.position; return Math.hypot(after[0] - before[0], after[2] - before[2]); }).toBeGreaterThan(.2);
    await send('touchCancel'); const stopped = (await snapshot(page)).player.position;
    await page.waitForTimeout(150); expect((await snapshot(page)).player.position).toEqual(stopped);
    await page.keyboard.press('b'); await click(page, 'home'); await route(page, 'modes');
    await page.touchscreen.tap(420, 150); await page.touchscreen.tap(420, 150); await route(page, 'modes');
    await onlyOriginalUI(page); await screenshot(page, info, 'first-fix-only-mobile'); await context.close();
});


test('termination notice dismisses once per rating visit and never restarts on star selection', async ({ page }, info) => {
    await page.goto('/?offline=1'); await click(page, 'mode:team'); await route(page, 'simulation'); await click(page, 'finish');
    const notice = page.getByRole('status').filter({ hasText: '시뮬레이션이 종료되었습니다' });
    await expect(notice).toHaveCSS('opacity', '1');
    await page.waitForTimeout(1000); await click(page, 'mode-rating:3');
    expect(await notice.evaluate(node => parseFloat(getComputedStyle(node).animationDelay))).toBeLessThan(-.7);
    await expect(notice).toBeHidden({ timeout: 4000 });
    await click(page, 'people-rating:4'); await expect(page.locator('.fix-rating-notice')).toBeHidden();
    await screenshot(page, info, 'first-fix-rating-notice-dismissed');
    await page.keyboard.press('m'); await route(page, 'modes'); await page.keyboard.press('m');
    await click(page, 'mode:team'); await route(page, 'simulation'); await click(page, 'finish');
    await expect(notice).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(notice).toBeHidden({ timeout: 6000 });
});

test('portrait users start at the mode-selection home and enter content without an extra navigation pill', async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();await page.goto('/?offline=1#my-room');await route(page,'modes');
    await expect(page.locator('.fix-mode-card')).toHaveCount(3);await expect(page.locator('.fix-space-next')).toHaveCount(0);await onlyOriginalUI(page);
    await page.locator('[data-action="mode:team"]').tap();await route(page,'simulation');
    const next=page.locator('[data-action="finish"]');await expect(next).toHaveText('마이룸');
    const bounds=(await next.boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);expect(bounds.height).toBeGreaterThan(10);
    await screenshot(page,info,'first-fix-home-mobile');await next.tap();await route(page,'rating');await context.close();
});
