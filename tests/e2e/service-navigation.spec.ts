import { test, expect, snapshot, screenshot } from './fixtures';
import type { Page } from '@playwright/test';

async function click(page: Page, action: string) { await page.locator(`[data-action="${action}"]`).first().click(); }
async function onboard(page: Page) {
    await page.goto('/?ui=1&legacyServiceReview=1'); await click(page, 'login'); await click(page, 'avatar-next');
    await click(page, 'nav:neighborhood-choice'); await click(page, 'neighborhood:jayang');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'my-room');
    await expect.poll(async () => (await snapshot(page)).world.status).toBe('ready');
}
async function unlock(page: Page) {
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
}
async function walk(page: Page) {
    await page.locator('.service-viewport canvas').click({ position: { x: 1190, y: 10 } });
    await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS');
    const before = (await snapshot(page)).player.position;
    await page.keyboard.down('w');
    try {
        await expect.poll(async () => {
            const after = (await snapshot(page)).player.position;
            return Math.hypot(after[0] - before[0], after[2] - before[2]);
        }).toBeGreaterThan(.2);
    } finally { await page.keyboard.up('w'); }
    await unlock(page);
}

test('home and mode UI allow real pointer lock, walking, looking and wall collisions', async ({ page }, info) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await onboard(page);
    await expect(page.locator('.explorable-frame')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    // This point is inside the scaled UI frame, in empty space above its controls.
    await page.mouse.click(600, 260);
    await expect.poll(() => page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS');
    const start = (await snapshot(page)).player.position[2];
    await page.keyboard.down('w');
    try {
        await expect.poll(async () => (await snapshot(page)).player.position[2]).toBeLessThan(start - .3);
        await expect.poll(async () => (await snapshot(page)).player.position[2], { timeout: 9000 }).toBeLessThan(-8.45);
        await page.waitForTimeout(250);
        expect((await snapshot(page)).player.position[2]).toBeGreaterThanOrEqual(-8.571);
    } finally { await page.keyboard.up('w'); }
    const yaw = (await snapshot(page)).player.yaw;
    await page.mouse.move(780, 350);
    await expect.poll(async () => Math.abs((await snapshot(page)).player.yaw - yaw)).toBeGreaterThan(.05);
    await unlock(page);
    const stopped = (await snapshot(page)).player.position;
    await page.keyboard.press('w'); await page.waitForTimeout(150);
    expect((await snapshot(page)).player.position).toEqual(stopped);
    await click(page, 'nav:modes');
    await expect.poll(() => page.evaluate(() => document.pointerLockElement)).toBe(null);
    // UI buttons still receive clicks, and the player's pose survives opening a menu.
    expect((await snapshot(page)).player.position).toEqual(stopped);
    // Face back into the room using actual mouse input, then move while mode UI is open.
    await page.mouse.click(600, 260);
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    await page.mouse.move(600, 350);
    const modePose = (await snapshot(page)).player;
    await page.mouse.move(600 + (modePose.yaw - Math.PI) / .002, 350);
    await page.keyboard.down('w');
    try { await expect.poll(async () => (await snapshot(page)).player.position[2]).toBeGreaterThan(stopped[2] + .25); }
    finally { await page.keyboard.up('w'); }
    await unlock(page); await screenshot(page, info, 'service-space-walking-modes');
    await click(page, 'mode:team');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'servers');
    const serverPose = (await snapshot(page)).player;
    await page.mouse.click(1190, 10); await page.keyboard.press('w');
    expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
    expect((await snapshot(page)).player.position).toEqual(serverPose.position);
});

test('rating and booking retain real space movement while modal and text input routes suspend it', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await onboard(page); await click(page, 'nav:modes'); await click(page, 'mode:team'); await click(page, 'join:fish');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'simulation');
    await click(page, 'finish');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'rating');
    // At the GLB spawn, face its open aisle instead of the nearby wall.
    await page.mouse.click(1190, 10);
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    await page.mouse.move(600, 350);
    const pose = (await snapshot(page)).player;
    await page.mouse.move(600 + pose.yaw / .002, 350); await unlock(page);
    await walk(page);
    await click(page, 'home');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'my-room');
    await click(page, 'nav:appointments'); await click(page, 'appointment-start');
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'appointment-date');
    await walk(page);
    await page.locator('.calendar [data-action^="date:"]').nth(15).click(); await click(page, 'time:17:00');
    await click(page, 'appointment-next'); await walk(page);
    await click(page, 'home'); await click(page, 'nav:chat');
    const input = page.locator('input[name="chat"]');
    const before = (await snapshot(page)).player.position;
    await input.fill('wasd'); await page.keyboard.type('wasd');
    await expect(input).toHaveValue('wasdwasd');
    expect((await snapshot(page)).player.position).toEqual(before);
    expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('touch movement and view use real browser events and stop on cancellation, blur and route changes', async ({ browser }, info) => {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await onboard(page);
    const cdp = await context.newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x?: number, y?: number) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x === undefined || y === undefined ? [] : [{ x, y, id: 1 }] });
    const initialYaw = (await snapshot(page)).player.yaw;
    await touch('touchStart', 420, 130); await touch('touchMove', 470, 145); await touch('touchEnd');
    await expect.poll(async () => (await snapshot(page)).player.yaw).toBeCloseTo(initialYaw - .2);
    expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
    await page.locator('[data-action="space-controls"]').tap();
    await expect(page.getByRole('group', { name: '공간 이동 조작' })).toBeVisible();
    const control = (await page.locator('[data-direction="forward"]').boundingBox())!;
    const before = (await snapshot(page)).player.position;
    await touch('touchStart', control.x + control.width / 2, control.y + control.height / 2);
    await expect.poll(async () => {
        const after = (await snapshot(page)).player.position;
        return Math.hypot(after[0] - before[0], after[2] - before[2]);
    }).toBeGreaterThan(.2);
    await touch('touchCancel');
    const stopped = (await snapshot(page)).player.position;
    await page.waitForTimeout(150); expect((await snapshot(page)).player.position).toEqual(stopped);
    await screenshot(page, info, 'service-space-mobile-controls');
    await touch('touchStart', control.x + control.width / 2, control.y + control.height / 2);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const blurred = (await snapshot(page)).player.position;
    await touch('touchEnd'); await page.waitForTimeout(150);
    expect((await snapshot(page)).player.position).toEqual(blurred);
    await page.locator('[data-action="nav:modes"]').tap();
    await expect(page.getByRole('group', { name: '공간 이동 조작' })).toBeHidden();
    const changed = (await snapshot(page)).player.position;
    await page.waitForTimeout(150); expect((await snapshot(page)).player.position).toEqual(changed);
    await page.locator('[data-action="mode:team"]').tap(); await page.locator('[data-action="join:fish"]').tap();
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'simulation');
    const simulationYaw = (await snapshot(page)).player.yaw;
    await touch('touchStart', 420, 160); await touch('touchMove', 470, 175); await touch('touchEnd');
    await expect.poll(async () => (await snapshot(page)).player.yaw).toBeCloseTo(simulationYaw - .2);
    await page.locator('[data-action="finish"]').tap(); await page.locator('[data-action="home"]').tap();
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'my-room');
    await page.locator('[data-action="nav:modes"]').tap(); await page.locator('[data-action="mode:solo"]').tap();
    await page.locator('[data-action="join:fish"]').tap();
    await expect(page.locator('.service-shell')).toHaveAttribute('data-route', 'simulation');
    await expect.poll(async () => (await snapshot(page)).world.activeId).toBe('indoor-fishing');
    const fishingYaw = (await snapshot(page)).player.yaw;
    await touch('touchStart', 420, 180); await touch('touchMove', 470, 195); await touch('touchEnd');
    await expect.poll(async () => (await snapshot(page)).player.yaw).toBeCloseTo(fishingYaw - .2);
    await context.close();
});
